
/**
 * PROJECT: Hire Brain
 * MODULE: 06 - Dynamic Scoring Engine
 * FILE: module6/types.ts
 */

export interface DetailedScore {
  technicalScore: number; // S_tech
  communicationScore: number; // S_comm
  aggregateScore: number; // Final_Score
  metrics: {
    pace: number;
    clarity: number;
    eyeContact: number;
    keywordMatchCount: number;
  };
  isZeroed: boolean; // All-Zero Handling flag
}

export interface ScoringWeights {
  technical: number; // w1
  communication: number; // w2
}
