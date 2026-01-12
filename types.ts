
/**
 * PROJECT: AI Interview Bot
 * FILE: types.ts
 */

import { DetailedScore } from './module6/types';

export enum UserRole {
  CANDIDATE = "candidate",
  ADMIN = "admin"
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  isVerified: boolean;
  avatar?: string;
  history: string[]; 
}

export enum Domain {
  SOFTWARE_ENGINEERING = "Software Engineering",
  FRONTEND = "Frontend Developer",
  BACKEND = "Backend Developer",
  DATA_SCIENCE = "Data Science",
  CS_FUNDAMENTALS = "Computer Science Fundamentals",
  BEHAVIORAL = "Behavioral & Soft Skills"
}

export enum Difficulty {
  BEGINNER = 1,
  INTERMEDIATE = 3,
  ADVANCED = 5
}

export enum QuestionType {
  OPEN = "open",
  MCQ = "mcq",
  CODING = "coding",
  FOLLOWUP = "followup",
  CLARIFY = "clarify"
}

export interface Question {
  id: string;
  domain: Domain;
  text: string;
  type: QuestionType;
  difficulty: number;
  expectedKeywords: string[];
  followUpRules?: string;
  timeLimitSec?: number;
  scoreWeight?: number;
}

export interface TranscriptEntry {
  sessionId: string;
  ts: number;
  speaker: "user" | "bot";
  text: string;
  intent?: string;
  confidence: number;
}

export interface InterviewSession {
  sessionId: string;
  userId: string;
  domain: Domain;
  difficulty: Difficulty;
  questionCount: number;
  currentQuestionId: string;
  status: "active" | "paused" | "finished";
  startedAt: number;
  lastUpdatedAt: number;
  state: {
    topicProgress: string[];
    candidateConfidence: number;
    scores: DetailedScore[];
    qualitativeFeedback: string[];
    communicationStyles: string[]; // NEW: Tracks behavioral telemetry per turn
    clarityAttempts: number;
    avgResponseLatency: number;
    fallbackCount: number;
  };
}
