/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/supabaseAuth.ts
 * PURPOSE: Supabase authentication service
 */

import { supabase } from './supabase';
import { User, UserRole } from '../../types';

export const SupabaseAuth = {
  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Validate inputs
      if (!email || !password || !name) {
        return { success: false, error: "All fields are required." };
      }
      
      if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters long." };
      }
      
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            role: 'candidate'
          }
        }
      });
      
      if (authError) {
        return { success: false, error: authError.message || "Registration failed." };
      }
      
      if (!authData.user) {
        return { success: false, error: "Failed to create user account." };
      }
      
      // Profile is created automatically by trigger, but we can fetch it
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }
      
      // Return user object
      const user: User = {
        id: authData.user.id,
        email: authData.user.email!,
        name: profileData?.name || name.trim(),
        role: (profileData?.role as UserRole) || UserRole.CANDIDATE,
        isVerified: authData.user.email_confirmed_at !== null,
        history: profileData?.history || []
      };
      
      return { success: true, user };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || "Registration failed. Please try again." };
    }
  },

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Validate inputs
      if (!email || !password) {
        return { success: false, error: "Email and password are required." };
      }
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });
      
      if (authError) {
        return { success: false, error: authError.message || "Invalid email or password." };
      }
      
      if (!authData.user) {
        return { success: false, error: "Login failed." };
      }
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // Return basic user if profile fetch fails
        return {
          success: true,
          user: {
            id: authData.user.id,
            email: authData.user.email!,
            name: authData.user.user_metadata?.name || 'User',
            role: UserRole.CANDIDATE,
            isVerified: authData.user.email_confirmed_at !== null,
            history: []
          }
        };
      }
      
      const user: User = {
        id: authData.user.id,
        email: authData.user.email!,
        name: profileData.name,
        role: profileData.role as UserRole,
        isVerified: profileData.is_verified,
        avatar: profileData.avatar || undefined,
        history: profileData.history || []
      };
      
      return { success: true, user };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || "Login failed. Please try again." };
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  /**
   * Get current authenticated user
   * Only returns user if there's an explicit, valid, non-expired session
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // First check if there's an active session (not just user data)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If no session or session error, user is not authenticated
      if (sessionError || !session) {
        return null;
      }
      
      // Verify session is not expired
      if (session.expires_at && session.expires_at < Date.now() / 1000) {
        // Session expired - sign out
        await supabase.auth.signOut();
        return null;
      }
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profileData) {
        return null;
      }
      
      return {
        id: user.id,
        email: user.email!,
        name: profileData.name,
        role: profileData.role as UserRole,
        isVerified: profileData.is_verified,
        avatar: profileData.avatar || undefined,
        history: profileData.history || []
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  }
};

