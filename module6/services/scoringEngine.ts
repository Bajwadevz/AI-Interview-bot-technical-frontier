
/**
 * PROJECT: Hire Brain
 * MODULE: 06 - Dynamic Scoring Engine
 * FILE: module6/services/scoringEngine.ts
 */

import { DetailedScore, ScoringWeights } from '../types';
import { Question } from '../../types';

export const WEIGHTS: ScoringWeights = {
  technical: 0.7, // w1 (as per PRD)
  communication: 0.3  // w2 (as per PRD)
};

/**
 * [ALGORITHM 2]: DYNAMIC_SCORING_ENGINE
 * Implementation of PRD weighted scoring:
 * S_tech = 0.4 * KeywordScore + 0.6 * SemanticScore
 * Score = 0.7 * S_tech + 0.3 * S_comm
 */
export const calculateDynamicScore = (
  userAnswer: string,
  question: Question,
  aiConfidence: number, 
  timeSpentSec: number
): DetailedScore => {
  
  // PRD LOGIC: ALL-ZERO HANDLING
  // Filters out noise or empty responses to protect dataset integrity.
  const wordCount = userAnswer.trim().split(/\s+/).length;
  const lowKeywords = ["don't know", "skip", "no idea", "unsure", "not sure", "pass", "i don't know"];
  const isTooShort = wordCount < 4;
  const isIrrelevant = lowKeywords.some(kw => userAnswer.toLowerCase().includes(kw));
  
  if (isTooShort || isIrrelevant) {
    return {
      technicalScore: 0,
      communicationScore: 0,
      aggregateScore: 0,
      metrics: { pace: 0, clarity: 0, eyeContact: 0, keywordMatchCount: 0 },
      isZeroed: true
    };
  }

  // PRD LOGIC: S_tech CALCULATION
  // Formula: 0.4 * KeywordMatch + 0.6 * SemanticSimilarity (aiConfidence)
  let keywordMatches = 0;
  const keywords = question.expectedKeywords || [];
  keywords.forEach(kw => {
    if (userAnswer.toLowerCase().includes(kw.toLowerCase())) {
      keywordMatches++;
    }
  });
  
  const keywordScore = keywords.length > 0 ? (keywordMatches / keywords.length) : 1;
  const sTech = (keywordScore * 0.4) + (aiConfidence * 0.6); 

  // PRD LOGIC: S_comm CALCULATION
  // Pace (WPM), Clarity (Semantic Signal), and Eye Contact Telemetry.
  const wpm = (wordCount / Math.max(timeSpentSec, 0.1)) * 60; // Prevent division by zero
  // Ideal pace between 110-160 WPM
  let fPace = 1.0;
  if (wpm < 110) {
    fPace = Math.max(0, wpm / 110); // Normalize slower speech
  } else if (wpm > 160) {
    fPace = Math.max(0, 1 - (wpm - 160) / 100); // Penalize very fast speech
  }
  const fClarity = Math.min(1, Math.max(0, aiConfidence)); // Clamp between 0-1
  const fEyeContact = 0.85 + (Math.random() * 0.1); // Simulated telemetry (0.85-0.95)

  const sComm = (fPace + fClarity + fEyeContact) / 3;

  // FINAL AGGREGATE (Module 06)
  const finalScore = (WEIGHTS.technical * sTech) + (WEIGHTS.communication * sComm);

  return {
    technicalScore: Math.min(1, sTech),
    communicationScore: Math.min(1, sComm),
    aggregateScore: Math.min(1, finalScore),
    metrics: { pace: fPace, clarity: fClarity, eyeContact: fEyeContact, keywordMatchCount: keywordMatches },
    isZeroed: false
  };
};
