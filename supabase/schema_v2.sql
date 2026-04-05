-- schema_v2.sql

CREATE TABLE public.feedback_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.interview_sessions(session_id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    strengths TEXT[] NOT NULL DEFAULT '{}',
    weaknesses TEXT[] NOT NULL DEFAULT '{}',
    missing_keywords TEXT[] NOT NULL DEFAULT '{}',
    suggestions TEXT[] NOT NULL DEFAULT '{}',
    timestamp BIGINT NOT NULL
);

CREATE INDEX idx_feedback_entries_session_id ON public.feedback_entries(session_id);

CREATE TABLE public.scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.interview_sessions(session_id) ON DELETE CASCADE,
    technical_score NUMERIC NOT NULL,
    communication_score NUMERIC NOT NULL,
    aggregate_score NUMERIC NOT NULL,
    is_zeroed BOOLEAN DEFAULT FALSE,
    metrics JSONB NOT NULL DEFAULT '{}',
    timestamp BIGINT NOT NULL
);

CREATE INDEX idx_scores_session_id ON public.scores(session_id);

-- Wait, the `types.ts` defines FeedbackEntry directly without user_id, 
-- but usually RLS requires user_id. Let's add user_id to these if needed 
-- (optional, but standard for row level security in Supabase)
-- I will add user_id since we fetch all feedback for a user.

ALTER TABLE public.feedback_entries ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.scores ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback" ON public.feedback_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own feedback" ON public.feedback_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own scores" ON public.scores FOR SELECT USING (auth.uid() = user_id);
