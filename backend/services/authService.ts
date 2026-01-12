
/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/authService.ts
 * SERVICE: Supabase Authentication Service (replaces localStorage auth)
 */

import { SupabaseAuth } from "./supabaseAuth";
import { DB } from "./db";

// Re-export Supabase Auth with same interface for backward compatibility
export const AuthService = {
  register: async (email: string, name: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> => {
    const result = await SupabaseAuth.register(email, password, name);
    if (result.success && result.user) {
      // Save to local session for quick access
      await DB.setAuthSession(result.user);
    }
    return result;
  },

  login: async (email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> => {
    const result = await SupabaseAuth.login(email, password);
    if (result.success && result.user) {
      // Save to local session for quick access
      await DB.setAuthSession(result.user);
    }
    return result;
  },

  logout: async (): Promise<void> => {
    await SupabaseAuth.logout();
    await DB.setAuthSession(null);
  }
};
