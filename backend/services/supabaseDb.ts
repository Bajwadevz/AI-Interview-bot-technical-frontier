/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/supabaseDb.ts
 * PURPOSE: Supabase database service (replaces localStorage)
 */

import { supabase, TABLES } from './supabase';
import { InterviewSession, TranscriptEntry, Question, User } from '../../types';

export const SupabaseDB = {
  // ============================================
  // USER OPERATIONS
  // ============================================
  
  async saveUser(user: User): Promise<void> {
    const { error } = await supabase
      .from(TABLES.PROFILES)
      .upsert({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.isVerified,
        avatar: user.avatar || null,
        history: user.history || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error getting user:', error);
      throw error;
    }
    
    if (!data) return null;
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      isVerified: data.is_verified,
      avatar: data.avatar,
      history: data.history || []
    };
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.getUser(user.id);
  },

  // ============================================
  // SESSION OPERATIONS
  // ============================================
  
  async saveSession(session: InterviewSession): Promise<void> {
    const { error } = await supabase
      .from(TABLES.INTERVIEW_SESSIONS)
      .upsert({
        session_id: session.sessionId,
        user_id: session.userId,
        domain: session.domain,
        difficulty: session.difficulty,
        question_count: session.questionCount,
        current_question_id: session.currentQuestionId,
        status: session.status,
        started_at: session.startedAt,
        last_updated_at: session.lastUpdatedAt,
        state: session.state
      }, {
        onConflict: 'session_id'
      });
    
    if (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  },

  async getSessions(userId?: string): Promise<InterviewSession[]> {
    let query = supabase
      .from(TABLES.INTERVIEW_SESSIONS)
      .select('*')
      .order('started_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting sessions:', error);
      throw error;
    }
    
    if (!data) return [];
    
    return data.map(row => ({
      sessionId: row.session_id,
      userId: row.user_id,
      domain: row.domain,
      difficulty: row.difficulty,
      questionCount: row.question_count,
      currentQuestionId: row.current_question_id,
      status: row.status,
      startedAt: row.started_at,
      lastUpdatedAt: row.last_updated_at,
      state: row.state
    }));
  },

  async getSession(sessionId: string): Promise<InterviewSession | null> {
    const { data, error } = await supabase
      .from(TABLES.INTERVIEW_SESSIONS)
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error getting session:', error);
      throw error;
    }
    
    if (!data) return null;
    
    return {
      sessionId: data.session_id,
      userId: data.user_id,
      domain: data.domain,
      difficulty: data.difficulty,
      questionCount: data.question_count,
      currentQuestionId: data.current_question_id,
      status: data.status,
      startedAt: data.started_at,
      lastUpdatedAt: data.last_updated_at,
      state: data.state
    };
  },

  // ============================================
  // TRANSCRIPT OPERATIONS
  // ============================================
  
  async saveTranscript(entry: TranscriptEntry): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { error } = await supabase
      .from(TABLES.TRANSCRIPT_ENTRIES)
      .insert({
        session_id: entry.sessionId,
        user_id: user.id,
        ts: entry.ts,
        speaker: entry.speaker,
        text: entry.text,
        intent: entry.intent || null,
        confidence: entry.confidence
      });
    
    if (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }
  },

  async getTranscripts(sessionId: string): Promise<TranscriptEntry[]> {
    const { data, error } = await supabase
      .from(TABLES.TRANSCRIPT_ENTRIES)
      .select('*')
      .eq('session_id', sessionId)
      .order('ts', { ascending: true });
    
    if (error) {
      console.error('Error getting transcripts:', error);
      throw error;
    }
    
    if (!data) return [];
    
    return data.map(row => ({
      sessionId: row.session_id,
      ts: row.ts,
      speaker: row.speaker,
      text: row.text,
      intent: row.intent || undefined,
      confidence: row.confidence
    }));
  },

  // ============================================
  // CUSTOM QUESTIONS OPERATIONS
  // ============================================
  
  async saveCustomQuestions(questions: Question[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const questionsToInsert = questions.map(q => ({
      id: q.id,
      user_id: user.id,
      domain: q.domain,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      expected_keywords: q.expectedKeywords,
      follow_up_rules: q.followUpRules || null,
      time_limit_sec: q.timeLimitSec || null,
      score_weight: q.scoreWeight || null
    }));
    
    const { error } = await supabase
      .from(TABLES.CUSTOM_QUESTIONS)
      .upsert(questionsToInsert, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('Error saving custom questions:', error);
      throw error;
    }
  },

  async getCustomQuestions(userId?: string): Promise<Question[]> {
    let query = supabase
      .from(TABLES.CUSTOM_QUESTIONS)
      .select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      // Get current user's questions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        // Return empty if no user
        return [];
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting custom questions:', error);
      throw error;
    }
    
    if (!data) return [];
    
    return data.map(row => ({
      id: row.id,
      domain: row.domain,
      text: row.text,
      type: row.type,
      difficulty: row.difficulty,
      expectedKeywords: row.expected_keywords,
      followUpRules: row.follow_up_rules || undefined,
      timeLimitSec: row.time_limit_sec || undefined,
      scoreWeight: row.score_weight || undefined
    }));
  },

  async clearAll(userId: string): Promise<void> {
    // Delete all user data (sessions, transcripts, custom questions)
    const { error: sessionsError } = await supabase
      .from(TABLES.INTERVIEW_SESSIONS)
      .delete()
      .eq('user_id', userId);
    
    const { error: questionsError } = await supabase
      .from(TABLES.CUSTOM_QUESTIONS)
      .delete()
      .eq('user_id', userId);
    
    if (sessionsError || questionsError) {
      console.error('Error clearing data:', sessionsError || questionsError);
      throw sessionsError || questionsError;
    }
  }
};

