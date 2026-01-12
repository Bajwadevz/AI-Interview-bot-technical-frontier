
import React, { useState, useEffect, useRef } from 'react';
import { InterviewSession, Question, TranscriptEntry } from '../types';
import { QUESTION_BANK } from '../constants';
import { analyzeAnswerAndGetNext, generateTTS } from '../services/geminiService';
import { DB } from '../services/db';
import { calculateDynamicScore } from '../module6/services/scoringEngine';

interface InterviewBoardProps {
  session: InterviewSession;
  onFinish: () => void;
  setSession: React.Dispatch<React.SetStateAction<InterviewSession | null>>;
}

const InterviewBoard: React.FC<InterviewBoardProps> = ({ session, onFinish, setSession }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  
  const turnStartTimeRef = useRef(Date.now());
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = QUESTION_BANK.find(q => q.id === session.currentQuestionId);
    if (q) {
      setCurrentQuestion(q);
      addTranscriptEntry("bot", q.text);
      handleTTS(q.text);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
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
    };
  }, []);

  useEffect(() => {
    const syncCamera = async () => {
      if (isCameraOn) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) { setIsCameraOn(false); }
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      }
    };
    syncCamera();
  }, [isCameraOn]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const addTranscriptEntry = (speaker: "user" | "bot", text: string) => {
    const entry: TranscriptEntry = {
      sessionId: session.sessionId,
      ts: Date.now(),
      speaker,
      text,
      confidence: 1
    };
    setTranscript(prev => [...prev, entry]);
    DB.saveTranscript(entry);
  };

  const handleTTS = async (text: string) => {
    const url = await generateTTS(text);
    if (url) {
      setAudioUrl(url);
      setTimeout(() => audioRef.current?.play(), 100);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const submitAnswer = async () => {
    if (!userInput.trim() || !currentQuestion || isProcessing) return;
    
    const turnDuration = (Date.now() - turnStartTimeRef.current) / 1000;
    setIsProcessing(true);
    addTranscriptEntry("user", userInput);

    try {
      const result = await analyzeAnswerAndGetNext(session, currentQuestion, userInput, transcript);
      
      // Module 06 - Real-time Mathematical Scoring
      const m6Score = calculateDynamicScore(userInput, currentQuestion, result.confidenceScore, turnDuration);
      
      // Update session with new qualitative feedback and quantitative scores
      const updated = JSON.parse(JSON.stringify(session)) as InterviewSession;
      // FIX: Push full DetailedScore object instead of just aggregateScore
      updated.state.scores.push(m6Score);
      updated.state.qualitativeFeedback.push(result.qualitativeInsight);
      updated.state.candidateConfidence = m6Score.aggregateScore;
      updated.state.avgResponseLatency = session.state.avgResponseLatency === 0 
        ? (turnDuration * 1000) 
        : (session.state.avgResponseLatency + (turnDuration * 1000)) / 2;

      // Strict 5-Topic Limit
      if (updated.state.topicProgress.length >= 5) {
        addTranscriptEntry("bot", "That concludes our technical assessment cycle. Generating your performance dossier now...");
        setSession(updated);
        DB.saveSession(updated);
        setTimeout(onFinish, 2500);
        return;
      }

      let botResponse = "";
      if (result.nextStep === "follow_up" || result.nextStep === "clarify") {
        botResponse = result.followUpText || "Interesting approach. Could you elaborate more on the trade-offs?";
      } else {
        const remaining = QUESTION_BANK.filter(q => q.domain === session.domain && !updated.state.topicProgress.includes(q.id));
        if (remaining.length > 0) {
          const nextQ = remaining[0];
          updated.currentQuestionId = nextQ.id;
          updated.state.topicProgress.push(nextQ.id);
          setCurrentQuestion(nextQ);
          botResponse = `${result.evaluation} Next topic: ${nextQ.text}`;
        } else {
          botResponse = "Excellent. You've completed all topics in this domain.";
          setTimeout(onFinish, 3000);
        }
      }

      setSession(updated);
      DB.saveSession(updated);
      addTranscriptEntry("bot", botResponse);
      handleTTS(botResponse);
      setUserInput("");
      turnStartTimeRef.current = Date.now();
    } catch (error) {
      console.error("AI Orchestration Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 h-[88vh] lg:h-[82vh] items-stretch animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      
      {/* Interaction Feed */}
      <div className="flex-1 min-w-0 bg-white rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 ring-1 ring-slate-200/50">
        <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white shrink-0 relative z-20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">
              {session.domain.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase leading-none">{session.domain}</h2>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5">Assessment Protocol Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Live Analysis</span>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/20 custom-scrollbar relative">
          {transcript.map((entry, idx) => (
            <div key={idx} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] lg:max-w-[70%] rounded-[2rem] px-8 py-5 shadow-sm text-sm font-semibold leading-relaxed ${
                entry.speaker === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-lg shadow-slate-200/10'
              }`}>
                {entry.text}
                <div className={`mt-3 opacity-30 font-mono text-[9px] ${entry.speaker === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        <div className="p-8 bg-white border-t border-slate-100 space-y-4 shrink-0">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isProcessing}
            placeholder={isRecording ? "System is capturing audio input..." : "Type your technical response here..."}
            className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] resize-none focus:ring-4 focus:ring-indigo-500/5 outline-none text-sm min-h-[100px] transition-all font-semibold shadow-inner placeholder:text-slate-300"
          />
          <div className="flex justify-between items-center">
            <button
              onClick={toggleRecording}
              disabled={isProcessing}
              className={`p-4 rounded-full transition-all flex items-center justify-center ${
                isRecording ? 'bg-red-500 text-white shadow-xl animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
            <button
              onClick={submitAnswer}
              disabled={isProcessing || !userInput.trim()}
              className="px-12 py-4 bg-slate-900 text-white rounded-full font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-10"
            >
              {isProcessing ? "Analyzing..." : "Submit Answer"}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Sidebar */}
      <div className="w-full lg:w-[360px] lg:min-w-[360px] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar shrink-0">
        
        {/* Behavior Lens Card */}
        <div className="bg-white p-7 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center group">
          <div className="w-full flex justify-between items-center mb-5 px-1">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Behavior Lens</h3>
            <div className="flex items-center gap-3">
              <span className={`text-[8px] font-black uppercase tracking-widest ${isCameraOn ? 'text-indigo-600' : 'text-slate-300'}`}>CAM</span>
              <button 
                onClick={() => setIsCameraOn(!isCameraOn)}
                className={`relative w-9 h-5 rounded-full transition-all duration-300 ${isCameraOn ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isCameraOn ? 'left-[1.25rem]' : 'left-1'}`} />
              </button>
            </div>
          </div>
          
          <div className="w-full aspect-video bg-slate-900 rounded-[1.5rem] flex items-center justify-center relative overflow-hidden border border-slate-800 shadow-inner group-hover:shadow-2xl transition-all duration-500">
             {isCameraOn ? (
               <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] opacity-70" />
             ) : (
               <div className="bg-slate-800/40 w-full h-full flex items-center justify-center p-6 text-center">
                 <p className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.2em] leading-relaxed">
                   Biometric Feed Muted
                 </p>
               </div>
             )}
             <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-lg backdrop-blur-md border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full ${isCameraOn ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[7px] text-white font-black uppercase tracking-widest">Feed_Source_01</span>
             </div>
          </div>
          
          <div className="w-full mt-8 space-y-6">
            <div className="px-1">
              <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-2.5 tracking-widest">
                <span>Domain Confidence</span>
                <span className="text-indigo-600 font-black">{Math.round(session.state.candidateConfidence * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-indigo-500 transition-all duration-1000 ease-out" style={{ width: `${session.state.candidateConfidence * 100}%` }} />
              </div>
            </div>

            <div className="px-1">
              <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                <span>Assessment Cycle</span>
                <span className="text-slate-900">{session.state.topicProgress.length} / 5</span>
              </div>
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < session.state.topicProgress.length ? 'bg-indigo-600 shadow-md shadow-indigo-100' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Feedback Feed */}
        <div className="bg-gradient-to-br from-indigo-700 to-violet-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden border border-white/10 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full -mr-12 -mt-12" />
          <div className="flex items-center gap-2.5 mb-5 relative z-10">
            <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
               <span className="text-[7px] font-black">AI</span>
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-200">Qualitative Assessment Feed</h3>
          </div>
          {/* Removed max-h and ensured container can grow, added min-h for consistent look */}
          <div className="relative z-10 min-h-[80px]">
            <p className="text-[13px] font-semibold italic leading-relaxed text-indigo-50 animate-in fade-in slide-in-from-right-2 duration-700">
              {session.state.qualitativeFeedback[session.state.qualitativeFeedback.length - 1] || "Awaiting initial assessment cycle to derive insights."}
            </p>
          </div>
        </div>

        {/* System Logs */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white border border-white/5 space-y-4">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500">System Logs</h3>
           </div>
           <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-slate-500 tracking-wide uppercase">Avg Latency</span>
                <span className="text-indigo-400 font-mono">{Math.round(session.state.avgResponseLatency)}ms</span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-slate-500 tracking-wide uppercase">Engine v3.5</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">Operational</span>
              </div>
           </div>
        </div>

        {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" onEnded={() => setAudioUrl(null)} />}
      </div>
    </div>
  );
};

export default InterviewBoard;
