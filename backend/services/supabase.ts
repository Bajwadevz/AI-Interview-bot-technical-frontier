/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/supabase.ts
 * PURPOSE: Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to the provided keys (ensure these are valid)
// @ts-ignore - Vite types are not fully loaded in this context
const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://vfdkbdhntohtmheuzsaa.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_YKIDaodU8Hd9WG6RLwCb4g_3Up5fIre';

if (!env.VITE_SUPABASE_URL) {
  console.warn('VITE_SUPABASE_URL not found in environment, using default.');
}

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
  CUSTOM_QUESTIONS: 'custom_questions',
  FEEDBACK_ENTRIES: 'feedback_entries',
  SCORES: 'scores'
} as const;

