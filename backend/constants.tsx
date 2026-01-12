
/**
 * PROJECT: AI Interview Bot
 * FILE: backend/constants.tsx
 * PURPOSE: Global Configs, Static Seed Questions, and Orchestrator Guidelines.
 */

import { COMPREHENSIVE_BANK } from './questionBank';
import { DB } from './services/db';
import { Question } from '../types';

/**
 * [ALGORITHM 1]: DYNAMIC_CURRICULUM_MERGE
 * PURPOSE: Harmonizes hardcoded seed questions with the GenAI-expanded 
 *          repository stored in the DB.
 */
export const getActiveBank = (): Question[] => {
  const custom = DB.getCustomQuestions();
  // Filter to ensure no duplicates in the final ledger
  const seenIds = new Set(COMPREHENSIVE_BANK.map(q => q.id));
  const uniqueCustom = custom.filter(q => !seenIds.has(q.id));
  return [...COMPREHENSIVE_BANK, ...uniqueCustom];
};

/**
 * [GUIDELINE]: SYSTEM_ORCHESTRATION_PROMPT
 * PURPOSE: Defines the persona and constraints for the AI model.
 */
export const SYSTEM_PROMPT = `
ROLE: WORLD-CLASS TECHNICAL RECRUITER (AI)
OBJECTIVE: Conduct high-stakes technical assessments with precision.

CONSTRAINTS:
1. ADAPTIVITY: If candidate excels, probe for 'why' (Difficulty + 1). 
2. EMPATHY: If candidate struggles, offer a hint (Difficulty - 1).
3. LINGUISTICS: Analyze tone and structural confidence.
4. BREVITY: Keep replies concise (TTS-optimized).
`;
