
/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/authService.ts
 * SERVICE: Strict Authorization Gatekeeper
 */

import { User, UserRole } from "../../types";
import { DB } from "./db";

interface SecureUser extends User {
  passwordHash: string;
}

export const AuthService = {
  register: async (email: string, name: string, pass: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const users = DB.getUsers() as SecureUser[];
    if (users.find(u => u.email === email)) return { success: false, error: "Identity already registered in the node." };
    
    const newUser: SecureUser = {
      id: `usr_${Date.now()}`,
      email,
      name,
      role: UserRole.CANDIDATE,
      isVerified: true,
      history: [],
      passwordHash: btoa(pass) // Mock hashing for the project scope
    };
    
    DB.saveUser(newUser);
    return { success: true, user: newUser };
  },

  login: async (email: string, pass: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const users = DB.getUsers() as SecureUser[];
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return { success: false, error: "Identity not recognized." };
    }

    // CRITICAL QA FIX: Strict Password Validation
    if (user.passwordHash !== btoa(pass)) {
      return { success: false, error: "Authorization Key Mismatch. Access Denied." };
    }
    
    const { passwordHash, ...safeUser } = user;
    DB.setAuthSession(safeUser as User);
    return { success: true, user: safeUser as User };
  },

  logout: () => {
    DB.setAuthSession(null);
  }
};
