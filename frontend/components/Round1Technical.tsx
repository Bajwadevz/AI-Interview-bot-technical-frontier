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

interface Round1TechnicalProps {
  session: InterviewSession;
  onRound1Complete: () => void;
  setSession: React.Dispatch<React.SetStateAction<InterviewSession | null>>;
}

const Round1Technical: React.FC<Round1TechnicalProps> = ({ session, onRound1Complete, setSession }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const turnStartTimeRef = useRef(Date.now());
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // CRITICAL FIX: Load questions with proper error handling and guaranteed exit from loading state
  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout | null = null;
    
    const initializeRound1 = async () => {
      // Prevent duplicate initialization
      if (isInitializedRef.current) {
        if (isMounted) setIsLoading(false);
        return;
      }
      isInitializedRef.current = true;
      
      setIsLoading(true);
      setError(null);
      
      // Safety timeout: If loading takes more than 10 seconds, show error
      loadingTimeout = setTimeout(() => {
        if (isMounted) {
          console.error('Question loading timeout');
          setError('Loading questions is taking too long. Please check your connection and try again.');
          setIsLoading(false);
        }
      }, 10000);
      
      try {
        // Validate session has required data
        if (!session || !session.domain || !session.difficulty) {
          throw new Error('Invalid session: missing domain or difficulty');
        }
        
        // Load existing transcripts if any
        let existingTranscripts: TranscriptEntry[] = [];
        try {
          existingTranscripts = await DB.getTranscripts(session.sessionId);
        } catch (transcriptError) {
          console.warn('Error loading transcripts, continuing with empty:', transcriptError);
          // Continue - transcripts are optional
        }
        
        if (!isMounted) {
          clearTimeout(loadingTimeout!);
          return;
        }
        
        if (existingTranscripts.length > 0) {
          setTranscript(existingTranscripts);
        }
        
        // Load question bank with timeout
        let bank: Question[];
        try {
          bank = await Promise.race([
            getActiveBank(),
            new Promise<Question[]>((_, reject) => 
              setTimeout(() => reject(new Error('Question bank load timeout')), 8000)
            )
          ]);
        } catch (bankError: any) {
          throw new Error(`Failed to load question bank: ${bankError.message || 'Unknown error'}`);
        }
        
        if (!isMounted) {
          clearTimeout(loadingTimeout!);
          return;
        }
        
        if (!bank || bank.length === 0) {
          throw new Error('Question bank is empty');
        }
        
        // Filter by domain and difficulty
        const domainQuestions = bank.filter(q => 
          q.domain === session.domain &&
          Math.abs(q.difficulty - session.difficulty) <= 1
        );
        
        if (domainQuestions.length === 0) {
          throw new Error(`No questions found for ${session.domain} at difficulty ${session.difficulty}. Please try a different domain or difficulty.`);
        }
        
        // Get current question or first question
        let q: Question | null = null;
        
        // If we have a current question ID and transcripts exist, use it
        if (session.round1?.currentQuestionId && existingTranscripts.length > 0) {
          q = bank.find(q => q.id === session.round1.currentQuestionId) || null;
        }
        
        // If no question found, get the first available question
        if (!q) {
          // Find first question not in progress
          const topicProgress = session.round1?.topicProgress || [];
          const availableQuestions = domainQuestions.filter(q => 
            !topicProgress.includes(q.id)
          );
          q = availableQuestions[0] || domainQuestions[0];
          
          // Update session with first question
          if (q && (!session.round1?.currentQuestionId)) {
            try {
              const updated = { ...session };
              updated.round1 = { 
                ...session.round1, 
                currentQuestionId: q.id,
                status: session.round1?.status || 'in_progress'
              };
              await DB.saveSession(updated);
            } catch (saveError) {
              console.warn('Error saving session with question ID:', saveError);
              // Continue - question ID is optional
            }
          }
        }
        
        if (!isMounted) {
          clearTimeout(loadingTimeout!);
          return;
        }
        
        if (!q) {
          throw new Error('Failed to find a question. Please try starting a new interview.');
        }
        
        // CRITICAL: Set question and exit loading state
        setCurrentQuestion(q);
        
        // Add first question to transcript if this is a new session
        if (existingTranscripts.length === 0) {
          const entry: TranscriptEntry = {
            sessionId: session.sessionId,
            ts: Date.now(),
            speaker: "bot",
            text: q.text,
            confidence: 1
          };
          setTranscript([entry]);
          
          try {
            await DB.saveTranscript(entry);
          } catch (error) {
            console.warn('Error saving initial transcript:', error);
            // Continue - transcript save is not critical
          }
        }
        
        // SUCCESS: Clear loading state
        if (isMounted) {
          setIsLoading(false);
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
          }
        }
      } catch (err: any) {
        console.error('Error initializing Round 1:', err);
        const errorMessage = err.message || 'Failed to load questions. Please try again.';
        
        // CRITICAL: Always exit loading state on error
        if (isMounted) {
          setError(errorMessage);
          setIsLoading(false);
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
          }
        }
      }
    };
    
    // Only initialize if session exists and has required data
    if (session && session.sessionId && session.domain) {
      initializeRound1();
    } else {
      // No valid session - exit loading immediately
      setIsLoading(false);
      setError('Invalid session. Please start a new interview.');
    }
    
    return () => {
      isMounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      if (questionTimeoutRef.current) {
        clearTimeout(questionTimeoutRef.current);
      }
    };
  }, [session?.sessionId, session?.domain, session?.difficulty]); // Simplified deps - only re-run if session changes

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

  const submitAnswer = async () => {
    if (!userInput.trim() || !currentQuestion || isProcessing) return;
    
    const trimmedInput = userInput.trim();
    if (trimmedInput.length < UI_CONFIG.MIN_MESSAGE_LENGTH) {
      await addTranscriptEntry("bot", "Please provide a more detailed response.");
      setUserInput("");
      return;
    }
    
    if (trimmedInput.length > UI_CONFIG.MAX_MESSAGE_LENGTH) {
      await addTranscriptEntry("bot", "Your response is too long. Please provide a more concise answer.");
      setUserInput("");
      return;
    }
    
    const turnDuration = Math.max(0.1, (Date.now() - turnStartTimeRef.current) / 1000);
    setIsProcessing(true);
    const capturedInput = trimmedInput;
    // Keep input in state until successfully processed (for retry on failure)
    setUserInput("");
    
    // Save user input to transcript immediately (optimistic update)
    await addTranscriptEntry("user", capturedInput);

    try {
      const response = await processTurn(session, currentQuestion, capturedInput, transcript);
      
      if (!response) {
        throw new Error('No response from AI service');
      }
      
      // Calculate score for Round 1
      const metrics = calculateDynamicScore(capturedInput, currentQuestion, response.confidenceScore || 0.5, turnDuration);

      const updated = { ...session };
      updated.round1 = { ...session.round1 };
      updated.round1.scores = [...session.round1.scores, metrics];
      updated.round1.qualitativeFeedback = [...session.round1.qualitativeFeedback, response.insight || "Response analyzed."];
      updated.round1.avgResponseLatency = session.round1.avgResponseLatency === 0 
        ? (turnDuration * 1000) 
        : (session.round1.avgResponseLatency + (turnDuration * 1000)) / 2;
      updated.lastUpdatedAt = Date.now();

      // Check if Round 1 is complete
      // Count questions answered: current question + questions in topicProgress
      // We need to count actual answers, not just questions seen
      const currentAnswerCount = updated.round1.scores.length;
      const isComplete = currentAnswerCount >= session.questionCount && !response.nextQuestion;

      if (isComplete) {
        updated.round1.status = "completed";
        updated.status = "round1_complete";
        updated.round1.currentQuestionId = currentQuestion.id;
        
        const farewell = "Round 1 complete! You've demonstrated strong technical knowledge. Ready to proceed to the communication round?";
        await addTranscriptEntry("bot", farewell);
        
        setSession(updated);
        await DB.saveSession(updated);
        
        // Show completion message briefly, then proceed
        setTimeout(() => {
          onRound1Complete();
        }, 2000);
        return;
      }

      // Handle next question
      if (response.nextQuestion) {
        // Verify domain match
        if (response.nextQuestion.domain !== session.domain) {
          const bank = await getActiveBank();
          const domainQuestions = bank.filter(q => 
            q.domain === session.domain && 
            !updated.round1.topicProgress.includes(q.id) &&
            Math.abs(q.difficulty - session.difficulty) <= 1
          );
          if (domainQuestions.length > 0) {
            response.nextQuestion = domainQuestions[0];
          } else {
            // No more questions - complete round
            updated.round1.status = "completed";
            updated.status = "round1_complete";
            setSession(updated);
            await DB.saveSession(updated);
            setTimeout(() => onRound1Complete(), 2000);
            return;
          }
        }
        
        // Add bot reply
        if (response.botReply && response.botReply.trim()) {
          await addTranscriptEntry("bot", response.botReply);
        }
        
        // Update question
        setCurrentQuestion(response.nextQuestion);
        if (!updated.round1.topicProgress.includes(response.nextQuestion.id)) {
          updated.round1.topicProgress.push(response.nextQuestion.id);
        }
        updated.round1.currentQuestionId = response.nextQuestion.id;
        
        // Add next question after delay
        if (questionTimeoutRef.current) {
          clearTimeout(questionTimeoutRef.current);
        }
        questionTimeoutRef.current = setTimeout(async () => {
          await addTranscriptEntry("bot", response.nextQuestion!.text);
          questionTimeoutRef.current = null;
        }, SESSION_CONFIG.QUESTION_DELAY_MS);
      } else {
        // No next question - just add bot reply
        if (response.botReply && response.botReply.trim()) {
          await addTranscriptEntry("bot", response.botReply);
        }
      }

      setSession(updated);
      await DB.saveSession(updated);
      turnStartTimeRef.current = Date.now();
    } catch (error: any) {
      console.error("Analysis Failure", error);
      
      // Restore user input for retry
      setUserInput(capturedInput);
      
      // Determine error type and provide appropriate message
      const isNetworkError = error?.message?.includes('network') || 
                            error?.message?.includes('fetch') ||
                            error?.message?.includes('timeout') ||
                            error?.code === 'NETWORK_ERROR';
      const isAPIError = error?.message?.includes('API') || 
                        error?.message?.includes('service');
      
      const errorMessage = isNetworkError
        ? "Network connection lost. Your response has been saved locally. Please check your connection and try again."
        : isAPIError
        ? "AI service temporarily unavailable. Your response has been saved. Please try again."
        : "An error occurred while processing your response. Your answer has been saved. Please try again.";
      
      await addTranscriptEntry("bot", errorMessage);
      
      // Try to save session state even on error
      try {
        const errorSession = { ...session };
        errorSession.lastUpdatedAt = Date.now();
        await DB.saveSession(errorSession);
      } catch (saveError) {
        console.error('Error saving session after failure:', saveError);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-16 flex flex-col items-center justify-center min-h-[600px]">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-slate-600 font-semibold text-lg">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl border border-red-100 p-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Error Loading Questions</h2>
          <p className="text-slate-600 mb-8">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                // Retry loading
                isInitializedRef.current = false;
                setError(null);
                setIsLoading(true);
                // Trigger re-initialization by updating a dependency
                const updated = { ...session };
                setSession(updated);
              }}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = session.round1.topicProgress.length;
  const progressPercent = (progress / session.questionCount) * 100;

  return (
    <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="bg-slate-900 px-8 py-6 text-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-1">Round 1: Technical Interview</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              {session.domain} • {progress} / {session.questionCount} Questions
            </p>
          </div>
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/20 min-h-0" style={{ scrollBehavior: 'smooth' }}>
        {transcript.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 font-semibold">Starting technical interview...</p>
            </div>
          </div>
        )}
        
        {transcript.map((entry, idx) => {
          const isUser = entry.speaker === 'user';
          const isConsecutive = idx > 0 && transcript[idx - 1].speaker === entry.speaker;
          return (
            <div 
              key={`${entry.ts}-${idx}`} 
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} transition-all duration-300 ${
                isConsecutive ? 'mt-2' : 'mt-0'
              }`}
            >
              <div className={`max-w-[85%] lg:max-w-[75%] rounded-[1.8rem] px-6 py-4 shadow-sm text-sm font-medium leading-relaxed break-words ${
                isUser 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200/50' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-md'
              }`}>
                <div className="whitespace-pre-wrap">{entry.text}</div>
                {!isConsecutive && (
                  <div className={`mt-2 text-[10px] opacity-60 ${isUser ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {isProcessing && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-[1.8rem] rounded-tl-none border border-slate-100 shadow-md px-6 py-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-semibold">Analyzing response...</span>
              </div>
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
          onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }}
          disabled={isProcessing}
          placeholder="Type your answer here... (Press Enter to submit)"
          className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-4 focus:ring-indigo-500/5 outline-none text-sm min-h-[100px] transition-all font-semibold shadow-inner placeholder:text-slate-300"
        />
        <div className="flex justify-end">
          <button 
            onClick={submitAnswer} 
            disabled={!userInput.trim() || isProcessing} 
            className="px-8 py-4 bg-slate-900 text-white rounded-full font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Submit Answer</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Round1Technical;
