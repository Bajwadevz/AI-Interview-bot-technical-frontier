/**
 * Round 1: Technical Interview (Chat-based)
 * No camera, no recording - pure technical assessment
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InterviewSession, Question, TranscriptEntry } from '../../types';
import { getActiveBank } from '../../backend/constants';
import { processTurn } from '../../backend/services/geminiService';
import { DB } from '../../backend/services/db';
import { calculateDynamicScore } from '../../module6/services/scoringEngine';
import { UI_CONFIG, SESSION_CONFIG } from '../constants';
import FeedbackCard from './FeedbackCard';
import SessionTimer from './SessionTimer';
import { useInterviewTimer } from '../../backend/services/timerService';
import { generateDetailedFeedback } from '../../backend/services/feedbackEngine';

interface Round1TechnicalProps {
  session: InterviewSession;
  onRound1Complete: () => void;
  setSession: React.Dispatch<React.SetStateAction<InterviewSession | null>>;
  onTerminate: () => void;
}

const Round1Technical: React.FC<Round1TechnicalProps> = ({ session, onRound1Complete, setSession, onTerminate }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optimization: Pre-load bank for sync access
  const [questionBank, setQuestionBank] = useState<Question[]>([]);

  const turnStartTimeRef = useRef(Date.now());
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to track if we've started the initialization for this specific session ID
  const initSessionIdRef = useRef<string | null>(null);

  // Track termination status to prevent async updates after end session
  const isTerminatedRef = useRef(false);

  // Wrap onTerminate to set the ref
  const handleSafeTerminate = () => {
    isTerminatedRef.current = true;
    onTerminate();
  };

  const { 
    questionTimeRemaining, 
    sessionTimeRemaining, 
    isRunning, 
    startTimer, 
    pauseTimer, 
    resetQuestionTimer 
  } = useInterviewTimer({
    questionTimeLimitSec: 120,
    sessionTimeLimitSec: session?.questionCount ? session.questionCount * 150 : 750,
    onQuestionExpired: () => {
      submitAnswer("[Time expired]");
    },
    onSessionExpired: () => {
      handleSafeTerminate();
    }
  });

  useEffect(() => {
    if (!isLoading && currentQuestion && !isTerminatedRef.current) {
      startTimer();
    } else {
      pauseTimer();
    }
  }, [isLoading, currentQuestion, startTimer, pauseTimer, isTerminatedRef.current]);

  useEffect(() => {
    let isMounted = true;
    let cleanupTimeout: NodeJS.Timeout | null = null;

    const initializeRound = async () => {
      // 1. Guard against invalid sessions or redundant inits
      if (!session || !session.sessionId || !session.domain) {
        if (isMounted) {
          setError("Invalid session state. Please restart.");
          setIsLoading(false);
        }
        return;
      }

      // If we already have a question and it matches the session, we are done.
      if (currentQuestion && session.round1?.currentQuestionId === currentQuestion.id && !isLoading) {
        return;
      }

      // Prevent double-init logic using Ref (React 18 Strict Mode safe)
      if (initSessionIdRef.current === session.sessionId && currentQuestion) {
        if (isMounted) setIsLoading(false);
        return;
      }
      initSessionIdRef.current = session.sessionId;

      console.log(`Initializing Round 1 for session: ${session.sessionId}`);
      setIsLoading(true);
      setError(null);

      // 2. Load Data with Timeout Safety
      try {
        // Create a promise that rejects after 10 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Loading timed out. Please check connection.")), 10000)
        );

        // Main data loading promise
        const loadDataPromise = async () => {
          // A. Load Transcripts (Parallel-able but safer sequential to prevent race)
          let existingTranscripts: TranscriptEntry[] = [];
          try {
            existingTranscripts = await DB.getTranscripts(session.sessionId);
          } catch (e) {
            console.warn("Failed to load transcripts, starting empty", e);
          }

          // B. Load Question Bank
          const bank = await getActiveBank();
          if (!bank || bank.length === 0) throw new Error("Question bank is empty.");

          // C. Resolve State using Session History
          // Filter valid questions
          const validQuestions = bank.filter(q =>
            q.domain === session.domain &&
            Math.abs(q.difficulty - session.difficulty) <= 1
          );

          if (validQuestions.length === 0) {
            // Fallback: relax difficulty constraint if too strict
            const domainBackup = bank.filter(q => q.domain === session.domain);
            if (domainBackup.length === 0) throw new Error(`No questions found for ${session.domain}.`);
            validQuestions.push(...domainBackup);
          }

          // Determine Target Question
          let q: Question | null = null;

          // Case 1: Session has a current question ID
          if (session.round1?.currentQuestionId) {
            q = bank.find(q => q.id === session.round1.currentQuestionId) || null;
          }

          // Case 2: New start or lost state - pick next available
          if (!q) {
            const usedIds = session.round1?.topicProgress || [];
            q = validQuestions.find(qv => !usedIds.includes(qv.id)) || validQuestions[0];

            // Persist this choice immediately
            if (q) {
              // We don't save session here to specific fields yet to avoid state thrashing,
              // but we will set it in local state.
              const updated = { ...session };
              updated.round1 = {
                ...session.round1,
                currentQuestionId: q.id,
                status: 'in_progress'
              };
              // Save quietly to ensure state consistency if user refreshes immediately
              await DB.saveSession(updated);
            }
          }

          if (!q) throw new Error("Failed to select a valid question.");

          return { q, existingTranscripts, bank };
        };

        // Race against timeout
        const result = await Promise.race([loadDataPromise(), timeoutPromise]) as { q: Question, existingTranscripts: TranscriptEntry[], bank: Question[] };

        if (!isMounted) return;

        // 3. Update State
        setQuestionBank(result.bank); // Store bank for sync usage later
        setCurrentQuestion(result.q);

        // Ensure transcript display is correct
        // If we have transcripts, use them. 
        // If NOT, and this is a fresh start, synthesize the first message.
        if (result.existingTranscripts.length > 0) {
          setTranscript(result.existingTranscripts);
        } else {
          // Synthesize initial bot message
          const initialMsg: TranscriptEntry = {
            sessionId: session.sessionId,
            ts: Date.now(),
            speaker: 'bot',
            text: result.q.text,
            confidence: 1
          };
          setTranscript([initialMsg]);
          // Use DB directly here to guarantee it exists, don't rely on helper in async init
          await DB.saveTranscript(initialMsg).catch(console.error);
        }

        setIsLoading(false);

      } catch (err: any) {
        console.error("Round 1 Init Error:", err);
        if (isMounted) {
          setError(typeof err === 'string' ? err : err.message || "Unknown initialization error");
          setIsLoading(false);
        }
      }
    };

    initializeRound();

    return () => {
      isMounted = false;
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
    };
  }, [session?.sessionId]); // Only re-run if Session ID changes. Strict dependency.

  // Auto-scroll to bottom
  useEffect(() => {
    if (transcriptEndRef.current) {
      requestAnimationFrame(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [transcript.length]);

  const addTranscriptEntry = useCallback(async (speaker: "user" | "bot", text: string) => {
    if (!text.trim()) return;

    const entry: TranscriptEntry = {
      sessionId: session.sessionId,
      ts: Date.now(),
      speaker,
      text: text.trim(),
      confidence: 1
    };

    setTranscript(prev => {
      if (prev.length > 0 &&
        prev[prev.length - 1].text === entry.text &&
        prev[prev.length - 1].speaker === entry.speaker &&
        Date.now() - prev[prev.length - 1].ts < 1000) {
        return prev;
      }
      return [...prev, entry];
    });

    try {
      await DB.saveTranscript(entry);
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  }, [session.sessionId]);

  const submitAnswer = async (autoResponse?: string) => {
    const finalInput = autoResponse || userInput;
    // Intercept "End Session" command
    if (finalInput.trim().toLowerCase() === 'end session') {
      handleSafeTerminate();
      return;
    }

    if (!finalInput.trim() || !currentQuestion || isTerminatedRef.current) return;

    const trimmedInput = finalInput.trim();

    // 1. Validation (Sync)
    if (trimmedInput.length < UI_CONFIG.MIN_MESSAGE_LENGTH) {
      // Just show error, don't block
      setTranscript(prev => [...prev, {
        sessionId: session.sessionId,
        ts: Date.now(),
        speaker: 'bot',
        text: "Please provide a more detailed response.",
        confidence: 1
      }]);
      // Don't clear input on validation error so user can edit
      return;
    }

    if (trimmedInput.length > UI_CONFIG.MAX_MESSAGE_LENGTH) {
      setTranscript(prev => [...prev, {
        sessionId: session.sessionId,
        ts: Date.now(),
        speaker: 'bot',
        text: "Your response is too long. Please summarize.",
        confidence: 1
      }]);
      return;
    }

    // 2. Lock UI briefly for transition (UI feedback only)
    setIsProcessing(true);
    const capturedInput = trimmedInput;
    const capturedQuestion = currentQuestion;
    const capturedTurnDuration = Math.max(0.1, (Date.now() - turnStartTimeRef.current) / 1000);
    setUserInput("");
    setIsProcessing(true); // Ensure lock is maintained

    // 3. Update Transcript (User Answer)
    const userEntry: TranscriptEntry = {
      sessionId: session.sessionId,
      ts: Date.now(),
      speaker: 'user',
      text: capturedInput,
      confidence: 1
    };

    // Optimistic Update
    setTranscript(prev => [...prev, userEntry]);

    // Fire-and-forget DB save for transcript
    DB.saveTranscript(userEntry).catch(console.error);

    // 4. Determine Next Step (Sync Navigation)
    // Use Pre-loaded bank if available, otherwise fetch
    const bank = questionBank.length > 0 ? questionBank : await getActiveBank();

    // Update local progress ref/state to prevent duplicates immediately
    const updatedTopicProgress = [...(session.round1.topicProgress || [])];
    if (!updatedTopicProgress.includes(capturedQuestion.id)) {
      updatedTopicProgress.push(capturedQuestion.id);
    }

    // Check completion condition
    const currentCount = (session.questionsAnswered || 0) + 1;
    const isComplete = currentCount >= session.questionCount;

    let nextQ: Question | null = null;
    let farewellMsg = "";

    if (!isComplete) {
      // Select Next Question Locally
      // Filter: Domain match, Difficulty +/- 1 (approx), Not Used
      const candidates = bank.filter(q =>
        q.domain === session.domain &&
        !updatedTopicProgress.includes(q.id) &&
        Math.abs(q.difficulty - session.difficulty) <= 1
      );

      if (candidates.length > 0) {
        // Pick random or first
        nextQ = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // Fallback: Relax difficulty
        const allDomain = bank.filter(q => q.domain === session.domain && !updatedTopicProgress.includes(q.id));
        if (allDomain.length > 0) {
          nextQ = allDomain[0];
        }
      }
    } else {
      farewellMsg = "Round 1 complete! You've demonstrated strong technical knowledge. Ready to proceed?";
    }

    // 5. Update Session State (Sync)
    const nextSessionState = { ...session };
    nextSessionState.questionsAnswered = currentCount;
    nextSessionState.round1.topicProgress = updatedTopicProgress;
    nextSessionState.lastUpdatedAt = Date.now();

    if (nextQ) {
      nextSessionState.round1.currentQuestionId = nextQ.id;
      // Note: We do NOT wait for scoring to update 'scores' array here.
      // We accept that 'scores' might lag a bit behind 'questionsAnswered'.

      // Update UI for Next Question
      setCurrentQuestion(nextQ);
      resetQuestionTimer();

      // Add Bot Message (Next Question) with small delay for natural feel
      setTimeout(() => {
        if (isTerminatedRef.current) return;
        const botEntry: TranscriptEntry = {
          sessionId: session.sessionId,
          ts: Date.now(),
          speaker: 'bot',
          text: nextQ!.text,
          confidence: 1
        };
        setTranscript(prev => [...prev, botEntry]);
        DB.saveTranscript(botEntry).catch(console.error);
        setIsProcessing(false); // Unlock input
        turnStartTimeRef.current = Date.now();
      }, 600); // 600ms "thinking" delay

    } else {
      // Completion Flow
      nextSessionState.round1.status = "completed";
      nextSessionState.status = "round1_complete";
      nextSessionState.round1Status = "completed";

      setTimeout(() => {
        if (isTerminatedRef.current) return;
        setTranscript(prev => [...prev, {
          sessionId: session.sessionId,
          ts: Date.now(),
          speaker: 'bot',
          text: farewellMsg || "Interview Complete.",
          confidence: 1
        }]);
        onRound1Complete();
      }, 1000);
    }

    // Save Navigation State
    setSession(nextSessionState);
    DB.saveSession(nextSessionState).catch(console.error);

    // 6. Background Scoring (Async & Non-Blocking)
    // We run this detached from the UI flow.
    (async () => {
      try {
        if (isTerminatedRef.current) return;

        // Call AI
        // We set a strict timeout for scoring too, just to be safe
        const processingTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Scoring timeout")), 30000)
        );

        const aiResult = await Promise.race([
          processTurn(session, capturedQuestion, capturedInput, transcript),
          processingTimeout
        ]) as Awaited<ReturnType<typeof processTurn>>;

        if (!aiResult) throw new Error("No AI Result");

        // Calculate Score
        const metrics = calculateDynamicScore(capturedInput, capturedQuestion, aiResult.confidenceScore || 0.5, capturedTurnDuration);

        const fbEntry = await generateDetailedFeedback(capturedQuestion, capturedInput, aiResult.insight, metrics);

        // Update Session with Score
        setSession(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          updated.round1.scores = [...(updated.round1.scores || []), metrics];
          updated.round1.qualitativeFeedback = [...(updated.round1.qualitativeFeedback || []), aiResult.insight || "Analyzed"];
          updated.round1.feedbackEntries = [...(updated.round1.feedbackEntries || []), fbEntry];
          updated.round1.avgResponseLatency = ((updated.round1.avgResponseLatency || 0) * (updated.questionsAnswered - 1) + (capturedTurnDuration * 1000)) / updated.questionsAnswered;

          // Fire DB save for scores
          DB.saveSession(updated).catch(console.error);
          DB.saveFeedbackEntry({ ...fbEntry, sessionId: updated.sessionId }).catch(console.error);
          return updated;
        });

      } catch (err) {
        console.error("Background Scoring Failed (Ignored to keep flow):", err);
        // We do NOT stop the interview. We just log.
        // Optionally add a dummy score to keep arrays aligned?
        // Yes, to maintain index alignment.
        setSession(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          // Add placeholder score
          updated.round1.scores = [...(updated.round1.scores || []), {
            technicalAccuracy: 0.5,
            communicationClarity: 0.5,
            relevance: 0.5,
            depth: 0.5,
            timestamp: Date.now()
          }];
          DB.saveSession(updated).catch(console.error);
          return updated;
        });
      }
    })();
  };

  const progress = session.questionsAnswered || session.round1.topicProgress.length;
  const progressPercent = (progress / session.questionCount) * 100;

  // Use fixed height calculation to ensure internal scrolling works
  return (
    <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="bg-slate-900 px-8 py-6 text-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-1">Round 1: Technical Interview</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              {session.domain} • {progress} / {session.questionCount} Questions
            </p>
          </div>
          <div className="flex items-center gap-4">
            <SessionTimer 
              questionTimeRemaining={questionTimeRemaining} 
              sessionTimeRemaining={sessionTimeRemaining} 
              questionTimeLimit={120} 
              sessionTimeLimit={session.questionCount * 150} 
            />
            <button
              onClick={() => handleSafeTerminate()}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-200 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            >
              End Session
            </button>
            <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/20 min-h-0" style={{ scrollBehavior: 'smooth' }}>
        {/* ... (existing chat content) ... */}
        {transcript.length === 0 && currentQuestion && (
          <div className="flex justify-start">
            <div className="max-w-[85%] lg:max-w-[75%] rounded-[1.8rem] rounded-tl-none border border-slate-100 shadow-md bg-white text-slate-800 px-6 py-4">
              <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{currentQuestion.text}</div>
            </div>
          </div>
        )}

        {transcript.length === 0 && !currentQuestion && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-slate-400 font-bold">Initializing...</p>
          </div>
        )}

        {transcript.map((entry, idx) => {
          const isUser = entry.speaker === 'user';
          const isConsecutive = idx > 0 && transcript[idx - 1].speaker === entry.speaker;
          const relatedFb = !isUser && idx > 0 && transcript[idx - 1].speaker === 'user' 
            ? session.round1?.feedbackEntries?.[transcript.filter((t, i) => i < idx && t.speaker === 'user').length - 1]
            : null;

          return (
            <React.Fragment key={`${entry.ts}-${idx}`}>
              <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-2' : 'mt-4'}`}>
                <div className={`max-w-[85%] lg:max-w-[75%] rounded-[1.8rem] px-6 py-4 text-sm font-medium leading-relaxed ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm'}`}>
                  <div className="whitespace-pre-wrap">{entry.text}</div>
                </div>
              </div>
              {relatedFb && (
                <div className="flex justify-start mt-2 ml-4">
                  <div className="animate-in fade-in zoom-in duration-500 delay-500 fill-mode-both">
                    <FeedbackCard feedback={relatedFb} />
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white rounded-[1.8rem] rounded-tl-none border border-slate-100 shadow-sm px-6 py-4">
              <span className="text-xs font-semibold text-slate-400 animate-pulse">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} className="h-1" />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100 space-y-4 shrink-0">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }}
          disabled={isProcessing}
          placeholder="Type your answer here... (Type 'end session' to quit)"
          className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-4 focus:ring-indigo-500/5 outline-none text-sm min-h-[100px] transition-all font-semibold shadow-inner placeholder:text-slate-300"
        />
        <div className="flex justify-end gap-4">
          <button
            onClick={() => submitAnswer("[Skipped]")}
            disabled={isProcessing}
            className="bg-slate-200 text-slate-600 rounded-full font-black text-[9px] uppercase tracking-widest px-6 py-4 transition-all hover:bg-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Skip Question
          </button>
          <button
            onClick={() => submitAnswer()}
            disabled={(!userInput.trim() && !isProcessing) || isProcessing}
            className="px-8 py-4 bg-slate-900 text-white rounded-full font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? "Sending..." : "Submit Answer"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default Round1Technical;
