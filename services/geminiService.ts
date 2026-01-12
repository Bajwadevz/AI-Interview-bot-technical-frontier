
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, TranscriptEntry, InterviewSession, Domain } from "../types";
import { SYSTEM_PROMPT } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  qualitativeInsight: string; // New field for qualitative feedback
}> => {
  const prompt = `
    Context:
    - Domain: ${session.domain}
    - Question: ${currentQuestion.text}
    - Expected Keywords: ${currentQuestion.expectedKeywords.join(", ")}
    - Candidate Answer: "${userAnswer}"
    - History: ${JSON.stringify(history.slice(-3))}

    Tasks:
    1. Evaluate the answer's technical accuracy.
    2. Determine if we should ask a follow-up to dig deeper or move to a new topic.
    3. If the answer is vague, ask for clarification.
    4. Provide a confidence score (0-1) for the candidate's understanding.
    5. Provide a short, qualitative insight about the candidate's performance in this specific interaction (e.g., "Demonstrates strong conceptual knowledge but lacks implementation detail").

    Return your response in JSON format.
  `;

  // Technical assessment requires advanced reasoning, using gemini-3-pro-preview.
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          evaluation: { type: Type.STRING },
          nextStep: { 
            type: Type.STRING, 
            description: "One of: follow_up, next_question, clarify" 
          },
          followUpText: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER },
          qualitativeInsight: { type: Type.STRING }
        },
        required: ["evaluation", "nextStep", "confidenceScore", "qualitativeInsight"]
      },
      thinkingConfig: { thinkingBudget: 2000 }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateTTS = async (text: string): Promise<string> => {
  try {
    // Generate spoken audio using specialized TTS model.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data generated");
    // Return base64 encoded PCM data with data URI prefix.
    return `data:audio/pcm;base64,${base64Audio}`;
  } catch (error) {
    console.error("TTS failed:", error);
    return "";
  }
};
