
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { InterviewSession, Question, TranscriptEntry } from '../../types';
import { getActiveBank } from '../../backend/constants';
import { processTurn, generateTTS } from '../../backend/services/geminiService';
import { DB } from '../../backend/services/db';
import { calculateDynamicScore } from '../../module6/services/scoringEngine';
import { SESSION_CONFIG, UI_CONFIG, MEDIA_CONFIG, SCORING_CONFIG } from '../constants';

interface InterviewBoardProps {
  session: InterviewSession;
  onFinish: () => void;
  setSession: React.Dispatch<React.SetStateAction<InterviewSession | null>>;
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const InterviewBoard: React.FC<InterviewBoardProps> = ({ session, onFinish, setSession }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [commInsight, setCommInsight] = useState("Initializing behavioral analysis...");
  
  const [isPaused, setIsPaused] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  
  const turnStartTimeRef = useRef(Date.now());
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Single source of truth for loading session state - prevents duplicate questions
  // Handles page refresh and state recovery
  useEffect(() => {
    let isMounted = true;
    
    const initializeSession = async () => {
      // Prevent duplicate initialization
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;
      
      try {
        // Load existing transcripts first (handles page refresh scenario)
        const existingTranscripts = await DB.getTranscripts(session.sessionId);
        
        if (!isMounted) return;
        
        // Set transcripts if they exist
        if (existingTranscripts.length > 0) {
          setTranscript(existingTranscripts);
        }
        
        // Load current question
        const bank = await getActiveBank();
        const q = bank.find(q => q.id === session.currentQuestionId);
        
        if (!isMounted || !q) {
          console.error('Question not found for session');
          return;
        }
        
        // Set current question
        setCurrentQuestion(q);
        
        // Only add first question if this is a NEW session (no transcripts)
        if (existingTranscripts.length === 0) {
          // Create transcript entry directly to avoid dependency issues
          const entry: TranscriptEntry = {
            sessionId: session.sessionId,
            ts: Date.now(),
            speaker: "bot",
            text: q.text,
            confidence: 1
          };
          setTranscript([entry]);
          
          // Save to DB
          try {
            await DB.saveTranscript(entry);
          } catch (error) {
            console.error('Error saving initial transcript:', error);
          }
          
          // Play TTS
          handleTTS(q.text);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        // Show user-friendly error
        setCommInsight("Session initialization encountered an issue. Please refresh the page.");
      }
    };
    
    initializeSession();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (questionTimeoutRef.current) {
        clearTimeout(questionTimeoutRef.current);
        questionTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId]); // Only initialize once per session

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        if (isPaused) return;
        let finalStr = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalStr += event.results[i][0].transcript;
        }
        if (finalStr) setUserInput(prev => prev + (prev && !prev.endsWith(" ") ? " " : "") + finalStr);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isPaused]);

  // Camera management with proper error handling
  useEffect(() => {
    const syncCamera = async () => {
      if (isCameraOn && !isPaused) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONFIG.CAMERA_CONSTRAINTS);
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (e: any) {
          // Handle permission denial gracefully
          console.warn('Camera access denied or unavailable:', e.message);
          setIsCameraOn(false);
          // Don't break the flow - just disable camera
        }
      } else {
        // Stop camera when disabled or paused
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => {
            t.stop();
            streamRef.current?.removeTrack(t);
          });
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
    
    syncCamera();
    
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraOn, isPaused]);

  // Auto-scroll to bottom when new messages arrive - stable scroll behavior
  useEffect(() => {
    if (transcriptEndRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [transcript.length]); // Only trigger on length change, not full transcript array

  // Memoized transcript entry function to prevent unnecessary re-renders
  const addTranscriptEntry = useCallback(async (speaker: "user" | "bot", text: string) => {
    if (!text.trim()) return;
    
    const entry: TranscriptEntry = {
      sessionId: session.sessionId,
      ts: Date.now(),
      speaker,
      text: text.trim(),
      confidence: 1
    };
    
    // Optimistic update
    setTranscript(prev => {
      // Prevent duplicates by checking last entry
      if (prev.length > 0 && 
          prev[prev.length - 1].text === entry.text && 
          prev[prev.length - 1].speaker === entry.speaker &&
          Date.now() - prev[prev.length - 1].ts < SCORING_CONFIG.DUPLICATE_WINDOW_MS) {
        return prev;
      }
      return [...prev, entry];
    });
    
    // Save to DB (non-blocking)
    try {
      await DB.saveTranscript(entry);
    } catch (error) {
      console.error('Error saving transcript:', error);
      // Don't remove from UI - keep optimistic update
    }
  }, [session.sessionId]);

  const handleTTS = async (text: string) => {
    if (isPaused || !text.trim()) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ 
          sampleRate: MEDIA_CONFIG.AUDIO_SAMPLE_RATE 
        });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const base64Data = await generateTTS(text);
      if (base64Data) {
        try {
          const rawBytes = decodeBase64(base64Data);
          const buffer = await decodeAudioData(rawBytes, audioContextRef.current, MEDIA_CONFIG.AUDIO_SAMPLE_RATE, MEDIA_CONFIG.AUDIO_CHANNELS);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current.destination);
          source.start();
        } catch (err) {
          console.error("Audio Output Error", err);
          // Don't break flow - TTS is optional
        }
      }
    } catch (error) {
      console.warn("TTS unavailable or failed:", error);
      // Gracefully degrade - don't block conversation flow
    }
  };

  const submitAnswer = async () => {
    // Validation checks
    if (!userInput.trim() || !currentQuestion || isProcessing || isPaused) return;
    
    // Handle empty or irrelevant responses gracefully
    const trimmedInput = userInput.trim();
    if (trimmedInput.length < UI_CONFIG.MIN_MESSAGE_LENGTH) {
      await addTranscriptEntry("bot", "Please provide a more detailed response to continue the assessment.");
      setUserInput("");
      return;
    }
    
    // Prevent excessively long inputs
    if (trimmedInput.length > UI_CONFIG.MAX_MESSAGE_LENGTH) {
      await addTranscriptEntry("bot", "Your response is too long. Please provide a more concise answer.");
      setUserInput("");
      return;
    }
    
    const turnDuration = Math.max(0.1, (Date.now() - turnStartTimeRef.current) / 1000);
    setIsProcessing(true);
    const capturedInput = trimmedInput;
    setUserInput("");
    
    // Save user answer to transcript
    try {
      await addTranscriptEntry("user", capturedInput);
    } catch (error) {
      console.error('Error saving user transcript:', error);
      // Continue even if transcript save fails
    }

    try {
      // Process turn with AI analysis
      const response = await processTurn(session, currentQuestion, capturedInput, transcript);
      
      if (!response) {
        throw new Error('No response from AI service');
      }
      
      // Dynamic Scoring Engine - Technical and Communication Analysis
      const metrics = calculateDynamicScore(capturedInput, currentQuestion, response.confidenceScore || 0.5, turnDuration);

      // Update communication insight safely
      if (response.commStyle) {
        setCommInsight(response.commStyle);
      }

      const updated = { ...session };
      updated.state = { ...session.state };
      updated.state.scores = [...(session.state.scores || []), metrics]; 
      updated.state.qualitativeFeedback = [...(session.state.qualitativeFeedback || []), response.insight || "Response analyzed."];
      updated.state.communicationStyles = [...(session.state.communicationStyles || []), response.commStyle || "Neutral"];
      updated.state.candidateConfidence = metrics.aggregateScore;
      updated.state.avgResponseLatency = session.state.avgResponseLatency === 0 
        ? (turnDuration * 1000) 
        : (session.state.avgResponseLatency + (turnDuration * 1000)) / 2;
      updated.lastUpdatedAt = Date.now();

      // Session End Logic - Complete assessment when question count reached
      if (updated.state.topicProgress.length >= session.questionCount && !response.nextQuestion) {
        const farewell = "Assessment complete. Generating your performance evaluation...";
        await addTranscriptEntry("bot", farewell);
        handleTTS(farewell);
        updated.status = 'finished';
        setSession(updated);
        try {
          await DB.saveSession(updated);
        } catch (error) {
          console.error('Error saving finished session:', error);
        }
        setTimeout(onFinish, SESSION_CONFIG.FINISH_DELAY_MS);
        return;
      }

      if (response.nextQuestion) {
        // Verify next question is from the correct domain
        if (response.nextQuestion.domain !== session.domain) {
          console.warn("Question domain mismatch detected, filtering by domain");
          try {
            const bank = await getActiveBank();
            const domainQuestions = bank.filter(q => 
              q.domain === session.domain && 
              !updated.state.topicProgress.includes(q.id)
            );
            if (domainQuestions.length > 0) {
              response.nextQuestion = domainQuestions[0];
            } else {
              // No more questions in domain - end session
              const farewell = "Assessment complete. Generating your performance evaluation...";
              await addTranscriptEntry("bot", farewell);
              handleTTS(farewell);
              updated.status = 'finished';
              setSession(updated);
              await DB.saveSession(updated);
              setTimeout(onFinish, 3000);
              return;
            }
          } catch (error) {
            console.error('Error loading question bank:', error);
            // Fallback: use the question provided by AI
          }
        }
        
        // Add bot reply first (evaluation/feedback)
        if (response.botReply && response.botReply.trim()) {
          await addTranscriptEntry("bot", response.botReply);
          handleTTS(response.botReply);
        }
        
        // Then add the next question separately after a brief pause
        setCurrentQuestion(response.nextQuestion);
        if (!updated.state.topicProgress.includes(response.nextQuestion.id)) {
            updated.state.topicProgress.push(response.nextQuestion.id);
        }
        updated.currentQuestionId = response.nextQuestion.id;
        
        // Add question to transcript with a small delay for natural flow
        if (questionTimeoutRef.current) {
          clearTimeout(questionTimeoutRef.current);
        }
        questionTimeoutRef.current = setTimeout(async () => {
          try {
            await addTranscriptEntry("bot", response.nextQuestion!.text);
            handleTTS(response.nextQuestion!.text);
          } catch (error) {
            console.error('Error adding next question:', error);
          }
          questionTimeoutRef.current = null;
        }, SESSION_CONFIG.QUESTION_DELAY_MS);
      } else {
        // No next question - just add bot reply
        if (response.botReply && response.botReply.trim()) {
          await addTranscriptEntry("bot", response.botReply);
          handleTTS(response.botReply);
        }
      }

      setSession(updated);
      try {
        await DB.saveSession(updated);
      } catch (error) {
        console.error('Error saving session:', error);
        // Show user-friendly error but don't break flow
        await addTranscriptEntry("bot", "Your response has been recorded. Continuing...");
      }
      turnStartTimeRef.current = Date.now();
    } catch (error: any) {
      console.error("Analysis Failure", error);
      // User-friendly error message
      const errorMessage = error?.message?.includes('API') 
        ? "AI service temporarily unavailable. Your response has been saved. Please try again."
        : "An error occurred while processing your response. Please try again.";
      
      await addTranscriptEntry("bot", errorMessage);
      // Don't break the flow - allow user to continue
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8 items-stretch animate-in fade-in zoom-in-95 duration-700 overflow-hidden">
      
      {/* Primary Terminal (Module 02) - Fixed height container */}
      <div className="flex-1 min-w-0 bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 relative h-full">
        <div className="bg-slate-900 px-8 py-4 flex justify-between items-center text-white shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">{session.domain.charAt(0)}</div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">{session.domain}</h2>
              <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">Neural Interaction Active</p>
            </div>
          </div>
          <button onClick={() => setIsPaused(!isPaused)} className="px-4 py-1.5 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>

        {/* Conversation Feed - Scrollable Container with Enhanced Typography */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/20 custom-scrollbar min-h-0 relative" style={{ scrollBehavior: 'smooth' }}>
          {transcript.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400 font-semibold">Waiting for the first question...</p>
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
                style={{ 
                  animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`,
                  animationFillMode: 'both' as const
                }}
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

        {/* Input Controls */}
        <div className="p-6 bg-white border-t border-slate-100 space-y-4 shrink-0 shadow-[0_-15px_40px_rgba(0,0,0,0.02)]">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }}
            disabled={isProcessing || isPaused}
            placeholder={isPaused ? "Session Paused..." : "Articulate your response..."}
            className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-4 focus:ring-indigo-500/5 outline-none text-sm min-h-[100px] transition-all font-semibold shadow-inner placeholder:text-slate-300"
          />
          <div className="flex justify-between items-center gap-4">
            <button 
              onClick={() => {
                if (!isPaused) {
                  try {
                    recognitionRef.current?.[isRecording ? 'stop' : 'start']();
                    setIsRecording(!isRecording);
                  } catch (error) {
                    console.warn('Speech recognition error:', error);
                    setIsRecording(false);
                  }
                }
              }}
              disabled={isPaused}
              className={`p-4 rounded-full transition-all relative ${
                isRecording 
                  ? 'bg-red-500 text-white shadow-xl shadow-red-500/30' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:scale-105 active:scale-95'
              } ${isPaused ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              <MicIcon className="w-6 h-6" />
              {isRecording && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping" />
              )}
            </button>
            <div className="flex items-center gap-4 flex-1 justify-end">
              {isProcessing && (
                <div className="flex items-center gap-2 text-indigo-400">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">Processing...</span>
                </div>
              )}
              <button 
                onClick={submitAnswer} 
                disabled={!userInput.trim() || isProcessing || isPaused} 
                className="px-8 py-4 bg-slate-900 text-white rounded-full font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2"
                aria-label="Submit answer"
              >
                <span>Submit</span>
                {!isProcessing && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Sidebar (Module 05) */}
      <div className="w-full lg:w-[350px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2 pb-6">
        
        {/* Behavior Lens Card - Camera Feed with Error Handling */}
        <div className="bg-white p-7 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center group transition-all hover:shadow-2xl">
          <div className="w-full flex justify-between items-center mb-5">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Behavior Analysis</h3>
            <button 
              onClick={() => {
                if (isCameraOn) {
                  // Stop camera before toggling
                  if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                  }
                }
                setIsCameraOn(!isCameraOn);
              }} 
              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isCameraOn ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-slate-100 text-slate-400'}`}
            >
              {isCameraOn ? "Camera On" : "Camera Off"}
            </button>
          </div>
          <div className="w-full aspect-video bg-slate-950 rounded-[1.5rem] flex items-center justify-center relative overflow-hidden ring-1 ring-white/5 shadow-inner">
             {isCameraOn && !isPaused && streamRef.current ? (
               <video 
                 ref={videoRef} 
                 autoPlay 
                 muted 
                 playsInline 
                 className="w-full h-full object-cover scale-x-[-1] opacity-80"
                 onError={(e) => {
                   console.warn('Video feed error:', e);
                   setIsCameraOn(false);
                 }}
               />
             ) : (
               <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest italic text-center px-4">
                 {isPaused ? "Analysis Paused" : "Camera Feed Unavailable"}
               </div>
             )}
             <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2 py-1 bg-black/60 rounded backdrop-blur-md border border-white/10">
                <div className={`w-1 h-1 rounded-full ${isCameraOn && !isPaused && streamRef.current ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-[6px] text-white font-black uppercase tracking-widest">Analysis Feed</span>
             </div>
          </div>
          <div className="w-full mt-8 space-y-6">
            <div>
              <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                <span>Domain Confidence</span>
                <span className="text-indigo-600">{Math.round(session.state.candidateConfidence * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_12px_rgba(99,102,241,0.6)] rounded-full" style={{ width: `${session.state.candidateConfidence * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* PRD Qualitative Insight Card */}
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl text-white border border-white/10 min-h-[140px] flex flex-col justify-center relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full -mr-16 -mt-16 transition-all group-hover:bg-white/10" />
           <h3 className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-4 italic relative z-10">Linguistic Insight</h3>
           <p className="text-sm font-semibold italic leading-relaxed relative z-10 animate-in fade-in slide-in-from-right-4 duration-1000">
            "{commInsight}"
           </p>
        </div>

        {/* PRD Telemetry Stats */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white border border-white/5 space-y-6">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Telemetry Log</h3>
           </div>
           <div className="space-y-4">
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-slate-500 uppercase tracking-widest">Avg Latency</span>
                <span className="text-indigo-400 font-mono tracking-tighter text-xs">{Math.round(session.state.avgResponseLatency)}ms</span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-slate-500 uppercase tracking-widest">Progress</span>
                <span className="text-emerald-400">{session.state.topicProgress.length} / {session.questionCount} Topics</span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-slate-500 uppercase tracking-widest">Engine Mode</span>
                <span className="text-indigo-300">Adaptive v4.2</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const MicIcon = ({ className }: { className?: string }) => <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>;

export default InterviewBoard;
