
/**
 * PROJECT: AI Interview Bot
 * FILE: types.ts
 */

import { DetailedScore } from './module6/types';
export type { DetailedScore };

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

export type RoundStatus = "not_started" | "in_progress" | "completed" | "terminated" | "skipped";
export type InterviewStatus = "setup" | "round1" | "round1_complete" | "round2" | "round2_complete" | "finished";
export type TerminationSource = "user" | "system" | "timeout" | "error" | "none";

export interface Round1State {
  currentQuestionId: string;
  topicProgress: string[];
  scores: DetailedScore[];
  qualitativeFeedback: string[];
  feedbackEntries?: FeedbackEntry[];
  avgResponseLatency: number;
  status: RoundStatus;
}

export interface Round2State {
  videoRecordingUrl?: string;
  recordingDuration?: number;
  communicationScore?: number;
  communicationFeedback?: string;
  status: RoundStatus;
  prompt?: string; // Domain-specific prompt for Round 2
}

export interface InterviewSession {
  sessionId: string;
  userId: string;
  domain: Domain;
  difficulty: Difficulty;
  questionCount: number;
  questionsAnswered: number; // Single source of truth for progress
  status: InterviewStatus;
  round1Status: RoundStatus; // Explicit top-level status
  round2Status: RoundStatus; // Explicit top-level status
  terminationSource: TerminationSource;
  startedAt: number;
  endedAt?: number;
  lastUpdatedAt: number;

  round1: Round1State;
  round2: Round2State;

  // Legacy fields for backward compatibility
  currentQuestionId?: string;
  state?: {
    topicProgress: string[];
    candidateConfidence: number;
    scores: DetailedScore[];
    qualitativeFeedback: string[];
    communicationStyles: string[];
    clarityAttempts: number;
    avgResponseLatency: number;
    fallbackCount: number;
  };
}

export interface FeedbackEntry {
  questionId: string;
  questionText: string;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  suggestions: string[];
  timestamp: number;
}

export interface QuestionQueueItem {
  question: Question;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  timeSpentSec?: number;
}

export interface TimerState {
  questionTimeLimit: number;
  sessionTimeLimit: number;
  questionTimeRemaining: number;
  sessionTimeRemaining: number;
  isRunning: boolean;
}

export interface OrchestrationEvent {
  type: 'state_change' | 'question_complete' | 'question_skip' | 'timer_expired' | 'error' | 'network_issue' | 'api_failure';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
