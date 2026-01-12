-- ============================================
-- AI INTERVIEW BOT - SUPABASE DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate' CHECK (role IN ('candidate', 'admin')),
  is_verified BOOLEAN DEFAULT true,
  avatar TEXT,
  history TEXT[], -- Array of session IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. INTERVIEW SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS interview_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  current_question_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'finished')),
  started_at BIGINT NOT NULL,
  last_updated_at BIGINT NOT NULL,
  
  -- State JSONB for flexible nested data
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_started_at ON interview_sessions(started_at DESC);

-- ============================================
-- 3. TRANSCRIPT ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transcript_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ts BIGINT NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'bot')),
  text TEXT NOT NULL,
  intent TEXT,
  confidence NUMERIC(3, 2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transcript queries
CREATE INDEX IF NOT EXISTS idx_transcript_entries_session_id ON transcript_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_transcript_entries_user_id ON transcript_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_transcript_entries_ts ON transcript_entries(ts);

-- ============================================
-- 4. CUSTOM QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS custom_questions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('open', 'mcq', 'coding', 'followup', 'clarify')),
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  expected_keywords TEXT[] NOT NULL,
  follow_up_rules TEXT,
  time_limit_sec INTEGER,
  score_weight NUMERIC(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user_id and domain queries
CREATE INDEX IF NOT EXISTS idx_custom_questions_user_id ON custom_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_questions_domain ON custom_questions(domain);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_questions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users are automatically created via trigger (see below)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- INTERVIEW SESSIONS POLICIES
-- ============================================
-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create own sessions"
  ON interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON interview_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON interview_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRANSCRIPT ENTRIES POLICIES
-- ============================================
-- Users can only see transcripts from their own sessions
CREATE POLICY "Users can view own transcripts"
  ON transcript_entries FOR SELECT
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.session_id = transcript_entries.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- Users can create transcripts for their own sessions
CREATE POLICY "Users can create own transcripts"
  ON transcript_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.session_id = transcript_entries.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- CUSTOM QUESTIONS POLICIES
-- ============================================
-- Users can view their own custom questions
CREATE POLICY "Users can view own custom questions"
  ON custom_questions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL); -- NULL = system questions

-- Users can create their own custom questions
CREATE POLICY "Users can create own custom questions"
  ON custom_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom questions
CREATE POLICY "Users can update own custom questions"
  ON custom_questions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own custom questions
CREATE POLICY "Users can delete own custom questions"
  ON custom_questions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'candidate'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

