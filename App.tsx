
import React, { useState } from 'react';
import { Domain, InterviewSession, Difficulty } from './types';
import { QUESTION_BANK } from './constants';
import { DB } from './services/db';
import InterviewBoard from './components/InterviewBoard';
import SetupScreen from './components/SetupScreen';
import AnalysisScreen from './components/AnalysisScreen';
import QuestionBankView from './components/QuestionBankView';
import Module6Dashboard from './module6/Dashboard';

const App: React.FC = () => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [view, setView] = useState<'setup' | 'interview' | 'analysis' | 'curriculum' | 'module6'>('setup');

  const startInterview = (domain: Domain) => {
    const domainQuestions = QUESTION_BANK.filter(q => q.domain === domain);
    const firstQ = domainQuestions[0] || QUESTION_BANK[0];
    
    // Fix: Adding missing properties 'difficulty', 'questionCount' and 'communicationStyles' as required by InterviewSession type definition in types.ts
    const newSession: InterviewSession = {
      sessionId: `aib_${Date.now()}`,
      userId: "demo_user",
      domain: domain,
      difficulty: Difficulty.INTERMEDIATE,
      questionCount: 5,
      currentQuestionId: firstQ.id,
      status: "active",
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      state: {
        topicProgress: [firstQ.id],
        candidateConfidence: 0.5,
        scores: [],
        qualitativeFeedback: ["Assessment environment initialized. Orchestrator ready."],
        communicationStyles: [],
        clarityAttempts: 0,
        avgResponseLatency: 0,
        fallbackCount: 0
      }
    };
    DB.saveSession(newSession);
    setSession(newSession);
    setView('interview');
  };

  const handleTerminate = () => {
    if (confirm("Terminate live session? Progress will be logged for current cycle.")) {
      setSession(null);
      setView('setup');
    }
  };

  const finishInterview = () => {
    if (session) {
      const updated = { ...session, status: "finished" as const };
      DB.saveSession(updated);
      setSession(updated);
      setView('analysis');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      {/* Dynamic Navigation Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <div 
          className="flex items-center gap-4 cursor-pointer group" 
          onClick={() => { setSession(null); setView('setup'); }}
        >
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all group-hover:bg-indigo-600 group-hover:rotate-3 shadow-lg">
            AIB
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none uppercase text-slate-900">AI Interview Bot</h1>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5">AI Orchestrator v3.5</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setView('curriculum')}
            className={`text-[9px] font-black uppercase tracking-widest transition-colors ${view === 'curriculum' ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            Curriculum
          </button>
          <button 
            onClick={() => setView('module6')}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'module6' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Insights Hub
          </button>
          {session && view === 'interview' && (
            <button 
              onClick={handleTerminate}
              className="px-5 py-2 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100 shadow-sm"
            >
              Terminate
            </button>
          )}
        </div>
      </header>

      {/* View Controller */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        {view === 'curriculum' ? (
          <QuestionBankView />
        ) : view === 'module6' ? (
          <Module6Dashboard onBack={() => setView('setup')} />
        ) : view === 'analysis' && session ? (
          <AnalysisScreen 
            session={session} 
            transcripts={DB.getTranscripts(session.sessionId)} 
            onRestart={() => { setSession(null); setView('setup'); }} 
          />
        ) : session && view === 'interview' ? (
          <InterviewBoard session={session} onFinish={finishInterview} setSession={setSession} />
        ) : (
          <SetupScreen onStart={startInterview} />
        )}
      </main>

      <footer className="py-6 bg-white border-t border-slate-100 flex flex-col items-center gap-2">
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Engineered for Excellence • AI Interview Bot Platform</p>
      </footer>
    </div>
  );
};

export default App;
