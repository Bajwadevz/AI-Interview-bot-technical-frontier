
/**
 * PROJECT: AI Interview Bot
 * FILE: backend/services/geminiService.ts
 * CORE: Intelligent Orchestration & Neural Processing Engine
 */

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, TranscriptEntry, InterviewSession, Domain, QuestionType } from "../../types";
import { SYSTEM_PROMPT, getActiveBank } from "../constants";

// Lazy initialization - only create client when needed and API key is available
let aiInstance: GoogleGenAI | null = null;

export const getAI = (): GoogleGenAI | null => {
  if (aiInstance) return aiInstance;
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set. AI features will be disabled.');
    return null;
  }
  
  try {
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
  } catch (error) {
    console.error('Failed to initialize GoogleGenAI:', error);
    return null;
  }
};

export const analyzeAnswerAndGetNext = async (
  session: InterviewSession,
  currentQuestion: Question,
  userAnswer: string,
  history: TranscriptEntry[]
): Promise<{
  evaluation: string;
  nextStep: "follow_up" | "next_question" | "clarify";
  followUpText?: string;
  confidenceScore: number;
  qualitativeInsight: string;
  communicationStyle: string;
}> => {
  const ai = getAI();
  if (!ai) {
    return {
      evaluation: "AI service unavailable. Please set GEMINI_API_KEY in .env.local",
      nextStep: "next_question",
      confidenceScore: 0.5,
      qualitativeInsight: "AI features disabled - API key not configured.",
      communicationStyle: "Neutral"
    };
  }

  const prompt = `
    ORCHESTRATOR_MODE: DEEP_ANALYSIS
    DOMAIN: ${session.domain}
    TOPIC: "${currentQuestion.text}"
    CANDIDATE_INPUT: "${userAnswer}"
    CURRENT_DIFFICULTY: ${currentQuestion.difficulty}
    
    CRITICAL_TASKS:
    1. TECHNICAL_AUDIT: Compare against: ${currentQuestion.expectedKeywords.join(", ")}.
    2. BEHAVIOR_AUDIT: Analyze linguistic patterns (Confident, Hesitant, Structured).
    3. ROUTING: 
       - If mastery is evident, return 'next_question'.
       - If detail is missing, return 'follow_up' with a specific 'why' question.
       - If vague, return 'clarify'.
    
    OUTPUT: Must be strictly JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluation: { type: Type.STRING },
            nextStep: { type: Type.STRING },
            followUpText: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            qualitativeInsight: { type: Type.STRING },
            communicationStyle: { type: Type.STRING }
          },
          required: ["evaluation", "nextStep", "confidenceScore", "qualitativeInsight", "communicationStyle"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("ORCHESTRATION_FAILURE:", error);
    return {
      evaluation: "Response processed.",
      nextStep: "next_question",
      confidenceScore: 0.5,
      qualitativeInsight: "Stable assessment cycle.",
      communicationStyle: "Neutral"
    };
  }
};

export const generateTTS = async (text: string): Promise<string> => {
  if (!text) return "";
  const ai = getAI();
  if (!ai) return "";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  } catch (error) { 
    return ""; 
  }
};

// Fixed: Implemented generateBulkQuestions to allow QuestionBankView to expand the question bank using gemini-3-pro-preview.
export const generateBulkQuestions = async (domain: Domain, count: number): Promise<Question[]> => {
  const prompt = `Generate ${count} technical interview questions for the ${domain} domain. 
  Ensure a mix of difficulty levels (1-5). 
  Return exactly ${count} questions in the requested JSON format.
  The 'type' field should always be 'open'.
  The 'domain' field must be exactly '${domain}'.
  Include unique IDs for each question.`;

  const ai = getAI();
  if (!ai) {
    console.warn('AI service unavailable for bulk question generation');
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              domain: { type: Type.STRING },
              text: { type: Type.STRING },
              type: { type: Type.STRING },
              difficulty: { type: Type.NUMBER },
              expectedKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["id", "domain", "text", "type", "difficulty", "expectedKeywords"]
          }
        },
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("BULK_GENERATION_FAILURE:", error);
    return [];
  }
};

export const processTurn = async (
  session: InterviewSession,
  currentQuestion: Question,
  userAnswer: string,
  history: TranscriptEntry[]
): Promise<{
  botReply: string;
  confidenceScore: number;
  insight: string;
  commStyle: string;
  nextQuestion?: Question;
}> => {
  const result = await analyzeAnswerAndGetNext(session, currentQuestion, userAnswer, history);
  let nextQuestion: Question | undefined;
  let botReply = result.followUpText || result.evaluation;

  if (result.nextStep === "next_question") {
    const bank = await getActiveBank();
    
    // PRD Adaptive Selection Logic
    // Adjust difficulty target based on technical score
    let targetDifficulty = currentQuestion.difficulty;
    if (result.confidenceScore > 0.7) targetDifficulty = Math.min(5, targetDifficulty + 1);
    else if (result.confidenceScore < 0.4) targetDifficulty = Math.max(1, targetDifficulty - 1);

    const remaining = bank.filter(q => 
      q.domain === session.domain && 
      !session.state.topicProgress.includes(q.id) &&
      Math.abs(q.difficulty - targetDifficulty) <= 1
    );

    const fallbackRemaining = bank.filter(q => 
      q.domain === session.domain && 
      !session.state.topicProgress.includes(q.id)
    );

    const candidates = remaining.length > 0 ? remaining : fallbackRemaining;
    
    if (candidates.length > 0) {
      nextQuestion = candidates[0];
      // Don't include question text in botReply - it will be added separately
      botReply = result.evaluation || "Good. Let's continue.";
    }
  }
  
  return { 
    botReply, 
    confidenceScore: result.confidenceScore, 
    insight: result.qualitativeInsight, 
    commStyle: result.communicationStyle,
    nextQuestion 
  };
};
