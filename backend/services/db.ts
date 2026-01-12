
import { InterviewSession, TranscriptEntry, Question, User } from "../../types";

const KEYS = {
  SESSIONS: "aib_v4_sessions",
  TRANSCRIPTS: "aib_v4_transcripts",
  CUSTOM_QUESTIONS: "aib_v4_custom",
  USERS: "aib_v4_users",
  ACTIVE_USER: "aib_v4_auth"
};

export const DB = {
  saveUser: (user: User) => {
    const users = DB.getUsers();
    const idx = users.findIndex(u => u.id === user.id || u.email === user.email);
    if (idx > -1) users[idx] = user;
    else users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },
  
  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || "[]"),
  
  setAuthSession: (user: User | null) => {
    if (user) localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(user));
    else localStorage.removeItem(KEYS.ACTIVE_USER);
  },
  
  getAuthSession: (): User | null => {
    const data = localStorage.getItem(KEYS.ACTIVE_USER);
    return data ? JSON.parse(data) : null;
  },

  saveSession: (session: InterviewSession) => {
    const sessions = DB.getSessions();
    const index = sessions.findIndex(s => s.sessionId === session.sessionId);
    if (index > -1) sessions[index] = session;
    else sessions.push(session);
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  },
  
  getSessions: (): InterviewSession[] => JSON.parse(localStorage.getItem(KEYS.SESSIONS) || "[]"),

  saveTranscript: (entry: TranscriptEntry) => {
    const all = JSON.parse(localStorage.getItem(KEYS.TRANSCRIPTS) || "[]");
    all.push(entry);
    localStorage.setItem(KEYS.TRANSCRIPTS, JSON.stringify(all));
  },
  
  getTranscripts: (sessionId: string): TranscriptEntry[] => {
    const all = JSON.parse(localStorage.getItem(KEYS.TRANSCRIPTS) || "[]");
    return all.filter((t: TranscriptEntry) => t.sessionId === sessionId);
  },

  saveCustomQuestions: (questions: Question[]) => {
    const existing = DB.getCustomQuestions();
    localStorage.setItem(KEYS.CUSTOM_QUESTIONS, JSON.stringify([...existing, ...questions]));
  },
  
  getCustomQuestions: (): Question[] => JSON.parse(localStorage.getItem(KEYS.CUSTOM_QUESTIONS) || "[]"),

  clearAll: () => {
    localStorage.clear();
  }
};
