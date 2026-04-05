/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/supabaseDb.ts
 * PURPOSE: Supabase database service (replaces localStorage)
 */

import { supabase, TABLES } from './supabase';
import { InterviewSession, TranscriptEntry, Question, User, InterviewStatus } from '../../types';

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
    // Support both new (round1/round2) and legacy (state) structures
    const sessionData: any = {
      session_id: session.sessionId,
      user_id: session.userId,
      domain: session.domain,
      difficulty: session.difficulty,
      question_count: session.questionCount,
      status: session.status,
      started_at: session.startedAt,
      last_updated_at: session.lastUpdatedAt,
    };

    // New structure: round1 and round2
    if (session.round1 && session.round2) {
      sessionData.round1 = session.round1;
      sessionData.round2 = session.round2;
      // Also store currentQuestionId for backward compatibility
      sessionData.current_question_id = session.round1.currentQuestionId || '';
    } else {
      // Legacy structure: state and currentQuestionId
      sessionData.current_question_id = (session as any).currentQuestionId || '';
      sessionData.state = session.state || {};
    }

    const { error } = await supabase
      .from(TABLES.INTERVIEW_SESSIONS)
      .upsert(sessionData, {
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
    
    return data.map(row => {
      // Support both new and legacy structures
      if (row.round1 && row.round2) {
        // New structure
        const session: InterviewSession = {
          sessionId: row.session_id,
          userId: row.user_id,
          domain: row.domain,
          difficulty: row.difficulty,
          questionCount: row.question_count,
          status: row.status as InterviewStatus,
          startedAt: row.started_at,
          lastUpdatedAt: row.last_updated_at,
          round1: row.round1,
          round2: row.round2,
          questionsAnswered: row.question_count || 0,
          round1Status: 'completed', // best guess 
          round2Status: 'completed', // best guess
          terminationSource: 'none'
        };
        // Add legacy fields if they exist
        if (row.current_question_id) {
          (session as any).currentQuestionId = row.current_question_id;
        }
        if (row.state) {
          (session as any).state = row.state;
        }
        return session;
      } else {
        // Legacy structure - convert to new format
        const legacyState = row.state || {};
        const legacyStatus = row.status as string;
        
        // Map legacy status to new status
        let newStatus: InterviewStatus = 'setup';
        if (legacyStatus === 'finished') {
          newStatus = 'finished';
        } else if (legacyStatus === 'round1' || legacyStatus === 'active') {
          newStatus = 'round1';
        } else if (legacyStatus === 'round1_complete') {
          newStatus = 'round1_complete';
        } else if (legacyStatus === 'round2') {
          newStatus = 'round2';
        } else if (legacyStatus === 'round2_complete') {
          newStatus = 'round2_complete';
        }
        
        return {
          sessionId: row.session_id,
          userId: row.user_id,
          domain: row.domain,
          difficulty: row.difficulty,
          questionCount: row.question_count,
          status: newStatus,
          startedAt: row.started_at,
          lastUpdatedAt: row.last_updated_at,
          questionsAnswered: row.question_count || 0,
          round1Status: 'completed',
          round2Status: 'completed',
          terminationSource: 'none',
          currentQuestionId: row.current_question_id || '',
          state: legacyState,
          // Create new structure from legacy
          round1: {
            currentQuestionId: row.current_question_id || '',
            topicProgress: legacyState.topicProgress || [],
            scores: legacyState.scores || [],
            qualitativeFeedback: legacyState.qualitativeFeedback || [],
            avgResponseLatency: legacyState.avgResponseLatency || 0,
            status: newStatus === 'finished' || newStatus === 'round1_complete' ? 'completed' : 
                    (newStatus === 'round1' ? 'in_progress' : 'not_started')
          },
          round2: {
            status: newStatus === 'finished' && legacyState.communicationStyles?.length > 0 ? 'completed' : 'not_started'
          }
        } as InterviewSession;
      }
    });
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
    
    // Use the same conversion logic as getSessions
    if (data.round1 && data.round2) {
      const session: InterviewSession = {
        sessionId: data.session_id,
        userId: data.user_id,
        domain: data.domain,
        difficulty: data.difficulty,
        questionCount: data.question_count,
        status: data.status as InterviewStatus,
        startedAt: data.started_at,
        lastUpdatedAt: data.last_updated_at,
        questionsAnswered: data.question_count || 0,
        round1Status: 'completed',
        round2Status: 'completed',
        terminationSource: 'none',
        round1: data.round1,
        round2: data.round2
      };
      if (data.current_question_id) {
        (session as any).currentQuestionId = data.current_question_id;
      }
      if (data.state) {
        (session as any).state = data.state;
      }
      return session;
    } else {
      // Legacy structure - convert
      const legacyState = data.state || {};
      const legacyStatus = data.status as string;
      
      let newStatus: InterviewStatus = 'setup';
      if (legacyStatus === 'finished') {
        newStatus = 'finished';
      } else if (legacyStatus === 'round1' || legacyStatus === 'active') {
        newStatus = 'round1';
      } else if (legacyStatus === 'round1_complete') {
        newStatus = 'round1_complete';
      } else if (legacyStatus === 'round2') {
        newStatus = 'round2';
      } else if (legacyStatus === 'round2_complete') {
        newStatus = 'round2_complete';
      }
      
      return {
        sessionId: data.session_id,
        userId: data.user_id,
        domain: data.domain,
        difficulty: data.difficulty,
        questionCount: data.question_count,
        status: newStatus,
        startedAt: data.started_at,
        lastUpdatedAt: data.last_updated_at,
        questionsAnswered: data.question_count || 0,
        round1Status: 'completed',
        round2Status: 'completed',
        terminationSource: 'none',
        currentQuestionId: data.current_question_id || '',
        state: legacyState,
        round1: {
          currentQuestionId: data.current_question_id || '',
          topicProgress: legacyState.topicProgress || [],
          scores: legacyState.scores || [],
          qualitativeFeedback: legacyState.qualitativeFeedback || [],
          avgResponseLatency: legacyState.avgResponseLatency || 0,
          status: newStatus === 'finished' || newStatus === 'round1_complete' ? 'completed' : 
                  (newStatus === 'round1' ? 'in_progress' : 'not_started')
        },
        round2: {
          status: newStatus === 'finished' && legacyState.communicationStyles?.length > 0 ? 'completed' : 'not_started'
        }
      } as InterviewSession;
    }
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
  },

  // ============================================
  // FEEDBACK OPERATIONS
  // ============================================

  async saveFeedbackEntry(entry: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { error } = await supabase
      .from(TABLES.FEEDBACK_ENTRIES)
      .insert({
        session_id: entry.sessionId || entry.questionId, // Hack since feedback entry is tied to session implicitly
        question_id: entry.questionId,
        question_text: entry.questionText,
        strengths: entry.strengths,
        weaknesses: entry.weaknesses,
        missing_keywords: entry.missingKeywords,
        suggestions: entry.suggestions,
        timestamp: entry.timestamp,
        user_id: user.id
      });
    
    if (error) {
      console.error('Error saving feedback entry:', error);
      throw error;
    }
  },

  async getFeedbackEntries(sessionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from(TABLES.FEEDBACK_ENTRIES)
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error('Error getting feedback entries:', error);
      throw error;
    }
    
    if (!data) return [];
    
    return data.map(row => ({
      sessionId: row.session_id,
      questionId: row.question_id,
      questionText: row.question_text,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      missingKeywords: row.missing_keywords,
      suggestions: row.suggestions,
      timestamp: row.timestamp
    }));
  },

  async getAllUserFeedback(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from(TABLES.FEEDBACK_ENTRIES)
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error getting all user feedback:', error);
      throw error;
    }
    
    if (!data) return [];
    
    return data.map(row => ({
      sessionId: row.session_id,
      questionId: row.question_id,
      questionText: row.question_text,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      missingKeywords: row.missing_keywords,
      suggestions: row.suggestions,
      timestamp: row.timestamp
    }));
  }
};

