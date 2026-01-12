
import React, { useState, useEffect, useRef } from 'react';
import { InterviewSession, Question, TranscriptEntry } from '../../types';
import { getActiveBank } from '../../backend/constants';
import { processTurn, generateTTS } from '../../backend/services/geminiService';
import { DB } from '../../backend/services/db';
import { calculateDynamicScore } from '../../module6/services/scoringEngine';

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

  useEffect(() => {
    const bank = getActiveBank();
    const q = bank.find(q => q.id === session.currentQuestionId);
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
  }, []);

  useEffect(() => {
    const syncCamera = async () => {
      if (isCameraOn && !isPaused) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) { setIsCameraOn(false); }
      } else if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
    syncCamera();
  }, [isCameraOn, isPaused]);

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
    if (isPaused) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

    const base64Data = await generateTTS(text);
    if (base64Data) {
      try {
        const rawBytes = decodeBase64(base64Data);
        const buffer = await decodeAudioData(rawBytes, audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      } catch (err) { console.error("Audio Output Error", err); }
    }
  };

  const submitAnswer = async () => {
    if (!userInput.trim() || !currentQuestion || isProcessing || isPaused) return;
    
    const turnDuration = (Date.now() - turnStartTimeRef.current) / 1000;
    setIsProcessing(true);
    const capturedInput = userInput;
    setUserInput("");
    addTranscriptEntry("user", capturedInput);

    try {
      const response = await processTurn(session, currentQuestion, capturedInput, transcript);
      
      // Module 06 - PRD Dynamic Scoring
      const metrics = calculateDynamicScore(capturedInput, currentQuestion, response.confidenceScore, turnDuration);

      setCommInsight(response.commStyle);

      const updated = { ...session };
      updated.state = { ...session.state };
      updated.state.scores = [...session.state.scores, metrics]; 
      updated.state.qualitativeFeedback = [...session.state.qualitativeFeedback, response.insight];
      updated.state.communicationStyles = [...(session.state.communicationStyles || []), response.commStyle];
      updated.state.candidateConfidence = metrics.aggregateScore;
      updated.state.avgResponseLatency = session.state.avgResponseLatency === 0 
        ? (turnDuration * 1000) : (session.state.avgResponseLatency + (turnDuration * 1000)) / 2;

      // PRD Session End Logic
      if (updated.state.topicProgress.length >= session.questionCount && !response.nextQuestion) {
        const farewell = "Assessment complete. Generating your verified performance dossier...";
        addTranscriptEntry("bot", farewell);
        handleTTS(farewell);
        setSession(updated);
        DB.saveSession(updated);
        setTimeout(onFinish, 3000);
        return;
      }

      if (response.nextQuestion) {
        setCurrentQuestion(response.nextQuestion);
        if (!updated.state.topicProgress.includes(response.nextQuestion.id)) {
            updated.state.topicProgress.push(response.nextQuestion.id);
        }
        updated.currentQuestionId = response.nextQuestion.id;
        addTranscriptEntry("bot", response.botReply);
        handleTTS(response.botReply);
      } else {
        addTranscriptEntry("bot", response.botReply);
        handleTTS(response.botReply);
      }

      setSession(updated);
      DB.saveSession(updated);
      turnStartTimeRef.current = Date.now();
    } catch (error) {
      console.error("Analysis Failure", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8 items-stretch animate-in fade-in zoom-in-95 duration-700">
      
      {/* Primary Terminal (Module 02) */}
      <div className="flex-1 min-w-0 bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 relative">
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

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20 custom-scrollbar min-h-0 relative">
          {transcript.map((entry, idx) => (
            <div key={idx} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] lg:max-w-[75%] rounded-[1.8rem] px-7 py-4 shadow-sm text-sm font-semibold leading-relaxed ${
                entry.speaker === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-lg shadow-slate-200/10'
              }`}>
                {entry.text}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
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
          <div className="flex justify-between items-center">
            <button 
              onClick={() => { recognitionRef.current?.[isRecording ? 'stop' : 'start'](); setIsRecording(!isRecording); }} 
              className={`p-4 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-xl shadow-red-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <MicIcon className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-6">
              {isProcessing && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Analyzing Depth...</span>}
              <button 
                onClick={submitAnswer} 
                disabled={!userInput.trim() || isProcessing} 
                className="px-10 py-4 bg-slate-900 text-white rounded-full font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-20"
              >
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Sidebar (Module 05) */}
      <div className="w-full lg:w-[350px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2 pb-6">
        
        {/* Behavior Lens Card */}
        <div className="bg-white p-7 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center group transition-all hover:shadow-2xl">
          <div className="w-full flex justify-between items-center mb-5">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Behavior Lens</h3>
            <button 
              onClick={() => setIsCameraOn(!isCameraOn)} 
              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isCameraOn ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-slate-100 text-slate-400'}`}
            >
              {isCameraOn ? "Camera On" : "Muted"}
            </button>
          </div>
          <div className="w-full aspect-video bg-slate-950 rounded-[1.5rem] flex items-center justify-center relative overflow-hidden ring-1 ring-white/5 shadow-inner">
             {isCameraOn && !isPaused ? (
               <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] opacity-80" />
             ) : (
               <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest italic">Feed Offline</div>
             )}
             <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2 py-1 bg-black/60 rounded backdrop-blur-md border border-white/10">
                <div className={`w-1 h-1 rounded-full ${isCameraOn && !isPaused ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-[6px] text-white font-black uppercase tracking-widest">Feed_Node_01</span>
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
