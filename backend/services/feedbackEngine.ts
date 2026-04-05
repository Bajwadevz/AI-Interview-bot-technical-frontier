import { Type } from "@google/genai";
import { Question, FeedbackEntry, DetailedScore } from "../../types";
import { getAI } from "./geminiService";
import { SYSTEM_PROMPT } from "../constants";

export const generateDetailedFeedback = async (
  question: Question,
  userAnswer: string,
  aiEvaluation: string,
  score: DetailedScore | number
): Promise<FeedbackEntry> => {
  const timestamp = Date.now();
  const fallbackEntry: FeedbackEntry = {
    questionId: question.id,
    questionText: question.text,
    strengths: ["Attempted to answer the question"],
    weaknesses: ["Needs more detail", "Could improve technical depth"],
    missingKeywords: [],
    suggestions: ["Review standard concepts related to this topic"],
    timestamp
  };

  try {
    // Generate simple fallback by comparing keywords directly
    const answerLower = userAnswer.toLowerCase();
    const missing = question.expectedKeywords.filter(kw => !answerLower.includes(kw.toLowerCase()));
    
    fallbackEntry.missingKeywords = missing;
    if (missing.length === 0) {
      fallbackEntry.strengths.push("Hit all expected keywords");
      fallbackEntry.weaknesses = [];
    }

    const ai = getAI();
    if (!ai) return fallbackEntry;

    const prompt = `
      Analyze the user's answer to the interview question and provide structured feedback.
      QUESTION: "${question.text}"
      EXPECTED KEYWORDS: ${question.expectedKeywords.join(", ")}
      USER ANSWER: "${userAnswer}"
      AI EVALUATION SO FAR: "${aiEvaluation}"
      SCORE: ${typeof score === "number" ? score : score.aggregateScore}
      
      Provide your analysis in strictly valid JSON matching the requested schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["strengths", "weaknesses", "missingKeywords", "suggestions"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return {
      questionId: question.id,
      questionText: question.text,
      strengths: parsed.strengths || fallbackEntry.strengths,
      weaknesses: parsed.weaknesses || fallbackEntry.weaknesses,
      missingKeywords: parsed.missingKeywords || fallbackEntry.missingKeywords,
      suggestions: parsed.suggestions || fallbackEntry.suggestions,
      timestamp
    };
  } catch (error) {
    console.error("Feedback generation failed", error);
    return fallbackEntry;
  }
};
