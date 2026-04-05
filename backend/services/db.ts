
/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/db.ts
 * PURPOSE: Database service - now uses Supabase (maintains backward compatibility)
 */

import { InterviewSession, TranscriptEntry, Question, User, FeedbackEntry } from "../../types";
import { SupabaseDB } from "./supabaseDb";
import { SupabaseAuth } from "./supabaseAuth";

// Legacy localStorage keys (for migration/fallback)
const KEYS = {
  SESSIONS: "aib_v4_sessions",
  TRANSCRIPTS: "aib_v4_transcripts",
  CUSTOM_QUESTIONS: "aib_v4_custom",
  USERS: "aib_v4_users",
  ACTIVE_USER: "aib_v4_auth",
  FEEDBACK: "aib_v4_feedback"
};

export const DB = {
  /**
   * Save user to Supabase
   */
  async saveUser(user: User): Promise<void> {
    try {
      await SupabaseDB.saveUser(user);
    } catch (error) {
      console.error('Error saving user to Supabase, falling back to localStorage:', error);
      // Fallback to localStorage for offline/error cases
      const users = DB.getUsers();
      const idx = users.findIndex(u => u.id === user.id || u.email === user.email);
      if (idx > -1) users[idx] = user;
      else users.push(user);
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  },
  
  /**
   * Get users (legacy - returns empty array, use getCurrentUser instead)
   */
  getUsers(): User[] {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || "[]");
  },
  
  /**
   * Set auth session (now uses Supabase Auth)
   */
  setAuthSession: async (user: User | null): Promise<void> => {
    if (user) {
      // Store in localStorage for quick access
      localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(user));
    } else {
      await SupabaseAuth.logout();
      localStorage.removeItem(KEYS.ACTIVE_USER);
    }
  },
  
  /**
   * Get auth session (now uses Supabase Auth)
   * Only returns user if there's an explicit, valid Supabase session
   * Does NOT auto-login from localStorage alone
   */
  getAuthSession: async (): Promise<User | null> => {
    try {
      // Only check Supabase - require explicit authentication
      const user = await SupabaseAuth.getCurrentUser();
      if (user) {
        // Cache in localStorage for quick access, but Supabase is source of truth
        localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(user));
        return user;
      }
    } catch (error) {
      console.error('Error getting auth session from Supabase:', error);
    }
    
    // Clear localStorage if Supabase session doesn't exist
    // Do NOT fallback to localStorage alone - prevents auto-login
    localStorage.removeItem(KEYS.ACTIVE_USER);
    return null;
  },

  /**
   * Save session to Supabase
   */
  async saveSession(session: InterviewSession): Promise<void> {
    try {
      await SupabaseDB.saveSession(session);
    } catch (error) {
      console.error('Error saving session to Supabase, falling back to localStorage:', error);
      // Fallback to localStorage
      const sessions = JSON.parse(localStorage.getItem(KEYS.SESSIONS) || "[]");
      const index = sessions.findIndex((s: InterviewSession) => s.sessionId === session.sessionId);
      if (index > -1) sessions[index] = session;
      else sessions.push(session);
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    }
  },
  
  /**
   * Get sessions from Supabase
   */
  async getSessions(): Promise<InterviewSession[]> {
    try {
      const { data: { user } } = await import('./supabase').then(m => m.supabase.auth.getUser());
      if (user) {
        return await SupabaseDB.getSessions(user.id);
      }
    } catch (error) {
      console.error('Error getting sessions from Supabase, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem(KEYS.SESSIONS) || "[]");
  },

  /**
   * Save transcript to Supabase
   */
  async saveTranscript(entry: TranscriptEntry): Promise<void> {
    try {
      await SupabaseDB.saveTranscript(entry);
    } catch (error) {
      console.error('Error saving transcript to Supabase, falling back to localStorage:', error);
      // Fallback to localStorage
      const all = JSON.parse(localStorage.getItem(KEYS.TRANSCRIPTS) || "[]");
      all.push(entry);
      localStorage.setItem(KEYS.TRANSCRIPTS, JSON.stringify(all));
    }
  },
  
  /**
   * Get transcripts from Supabase
   */
  async getTranscripts(sessionId: string): Promise<TranscriptEntry[]> {
    try {
      return await SupabaseDB.getTranscripts(sessionId);
    } catch (error) {
      console.error('Error getting transcripts from Supabase, falling back to localStorage:', error);
      // Fallback to localStorage
      const all = JSON.parse(localStorage.getItem(KEYS.TRANSCRIPTS) || "[]");
      return all.filter((t: TranscriptEntry) => t.sessionId === sessionId);
    }
  },

  /**
   * Save custom questions to Supabase
   */
  async saveCustomQuestions(questions: Question[]): Promise<void> {
    try {
      await SupabaseDB.saveCustomQuestions(questions);
    } catch (error) {
      console.error('Error saving custom questions to Supabase, falling back to localStorage:', error);
      // Fallback to localStorage
      const existing = JSON.parse(localStorage.getItem(KEYS.CUSTOM_QUESTIONS) || "[]");
      localStorage.setItem(KEYS.CUSTOM_QUESTIONS, JSON.stringify([...existing, ...questions]));
    }
  },
  
  /**
   * Get custom questions from Supabase
   */
  async getCustomQuestions(): Promise<Question[]> {
    try {
      return await SupabaseDB.getCustomQuestions();
    } catch (error) {
      console.error('Error getting custom questions from Supabase, falling back to localStorage:', error);
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem(KEYS.CUSTOM_QUESTIONS) || "[]");
    }
  },

  /**
   * Clear all user data (Supabase)
   */
  async clearAll(): Promise<void> {
    try {
      const { data: { user } } = await import('./supabase').then(m => m.supabase.auth.getUser());
      if (user) {
        await SupabaseDB.clearAll(user.id);
      }
    } catch (error) {
      console.error('Error clearing data from Supabase:', error);
    }
    // Also clear localStorage
    localStorage.clear();
  },

  /**
   * Save feedback entry
   */
  async saveFeedbackEntry(entry: FeedbackEntry & { sessionId: string }): Promise<void> {
    try {
      await SupabaseDB.saveFeedbackEntry(entry);
    } catch (error) {
      console.error('Error saving feedback entry to Supabase, falling back to localStorage:', error);
      const all = JSON.parse(localStorage.getItem(KEYS.FEEDBACK) || "[]");
      all.push(entry);
      localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));
    }
  },

  /**
   * Get feedback entries for a session
   */
  async getFeedbackEntries(sessionId: string): Promise<FeedbackEntry[]> {
    try {
      return await SupabaseDB.getFeedbackEntries(sessionId);
    } catch (error) {
      console.error('Error getting feedback entries from Supabase, falling back to localStorage:', error);
      const all = JSON.parse(localStorage.getItem(KEYS.FEEDBACK) || "[]");
      return all.filter((f: any) => f.sessionId === sessionId);
    }
  },

  /**
   * Get all feedback for the user
   */
  async getAllUserFeedback(): Promise<FeedbackEntry[]> {
    try {
      return await SupabaseDB.getAllUserFeedback();
    } catch (error) {
      console.error('Error getting all feedback from Supabase, falling back to localStorage:', error);
      return JSON.parse(localStorage.getItem(KEYS.FEEDBACK) || "[]");
    }
  }
};
