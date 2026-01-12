
import { InterviewSession, TranscriptEntry } from "../types";

const KEYS = {
  SESSIONS: "ai_interview_sessions",
  TRANSCRIPTS: "ai_interview_transcripts"
};

export const DB = {
  saveSession: (session: InterviewSession) => {
    const sessions = DB.getSessions();
    const index = sessions.findIndex(s => s.sessionId === session.sessionId);
    if (index > -1) sessions[index] = session;
    else sessions.push(session);
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  },

  getSessions: (): InterviewSession[] => {
    return JSON.parse(localStorage.getItem(KEYS.SESSIONS) || "[]");
  },

  saveTranscript: (entry: TranscriptEntry) => {
    const transcripts = DB.getTranscripts(entry.sessionId);
    transcripts.push(entry);
    const allTranscripts = JSON.parse(localStorage.getItem(KEYS.TRANSCRIPTS) || "[]");
    allTranscripts.push(entry);
    localStorage.setItem(KEYS.TRANSCRIPTS, JSON.stringify(allTranscripts));
  },

  getTranscripts: (sessionId: string): TranscriptEntry[] => {
    const all = JSON.parse(localStorage.getItem(KEYS.TRANSCRIPTS) || "[]");
    return all.filter((t: TranscriptEntry) => t.sessionId === sessionId);
  },

  clearAll: () => {
    localStorage.removeItem(KEYS.SESSIONS);
    localStorage.removeItem(KEYS.TRANSCRIPTS);
  }
};
