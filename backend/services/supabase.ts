/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/supabase.ts
 * PURPOSE: Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vfdkbdhntohtmheuzsaa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YKIDaodU8Hd9WG6RLwCb4g_3Up5fIre';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Database table names
export const TABLES = {
  PROFILES: 'profiles',
  INTERVIEW_SESSIONS: 'interview_sessions',
  TRANSCRIPT_ENTRIES: 'transcript_entries',
  CUSTOM_QUESTIONS: 'custom_questions'
} as const;

