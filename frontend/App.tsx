
import React, { useState, useEffect } from 'react';
import { Domain, InterviewSession, Difficulty, User } from '../types';
import { getActiveBank } from '../backend/constants';
import { DB } from '../backend/services/db';
import InterviewBoard from './components/InterviewBoard';
import SetupScreen from './components/SetupScreen';
import AnalysisScreen from './components/AnalysisScreen';
import QuestionBankView from './components/QuestionBankView';
import Module6Dashboard from '../module6/Dashboard';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/Auth/AuthScreen';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'setup' | 'interview' | 'analysis' | 'curriculum' | 'module6'>('landing');

  // Load active session and auth on mount
  useEffect(() => {
    const activeUser = DB.getAuthSession();
    if (activeUser) {
      setUser(activeUser);
      const activeSession = DB.getSessions().find(s => s.status === 'active');
      if (activeSession) {
        setSession(activeSession);
        setView('interview');
      } else {
        setView('setup');
      }
    } else {
      setView('landing');
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setView('setup');
  };

  const startInterview = (domain: Domain, difficulty: Difficulty = Difficulty.INTERMEDIATE, qCount: number = 5) => {
    const bank = getActiveBank();
    const domainQuestions = bank.filter(q => q.domain === domain);
    const firstQ = domainQuestions[0] || bank[0];
    
    const newSession: InterviewSession = {
      sessionId: `aib_${Date.now()}`,
      userId: user?.id || "demo_user",
      domain: domain,
      difficulty: difficulty,
      questionCount: qCount,
      currentQuestionId: firstQ.id,
      status: "active",
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      state: {
        topicProgress: [firstQ.id],
        candidateConfidence: 0.5,
        scores: [],
        qualitativeFeedback: ["Orchestrator online. Awaiting performance telemetry."],
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

  const handleTerminate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmed = window.confirm("Do you want to cancel your session? Your progress will be saved in the evaluation dashboard.");
    
    if (confirmed) {
      if (session) {
        const finishedSession: InterviewSession = { 
          ...session, 
          status: 'finished', 
          lastUpdatedAt: Date.now() 
        };
        DB.saveSession(finishedSession);
        setSession(finishedSession);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setView('analysis');
      } else {
        setView('setup');
      }
    }
  };

  const finishInterview = () => {
    if (session) {
      const updated: InterviewSession = { ...session, status: "finished", lastUpdatedAt: Date.now() };
      DB.saveSession(updated);
      setSession(updated);
      setView('analysis');
    }
  };

  const logout = () => {
    DB.setAuthSession(null);
    setUser(null);
    setSession(null);
    setView('landing');
  };

  // View Router Logic
  if (view === 'landing') {
    return <LandingPage onGetStarted={() => setView('auth')} onSignIn={() => setView('auth')} />;
  }

  if (view === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 overflow-hidden">
      {/* Internal Navigation Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm shrink-0">
        <div 
          className="flex items-center gap-4 cursor-pointer group" 
          onClick={() => {
            if (view !== 'interview') setView('setup');
          }}
        >
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all group-hover:bg-indigo-600 group-hover:rotate-3 shadow-lg">
            A
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none uppercase text-slate-900">AI Interview Bot</h1>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5">{user?.name || "Guest Candidate"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {view !== 'interview' && (
            <div className="flex gap-6 items-center">
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
              <button 
                onClick={logout}
                className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          )}
          
          {session && view === 'interview' && (
            <button 
              type="button"
              onClick={handleTerminate}
              className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100 shadow-sm cursor-pointer active:scale-95 z-[150]"
            >
              End Session
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative p-6 md:p-10">
        <div className="max-w-7xl mx-auto w-full h-full">
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
            <div className="h-full flex items-center justify-center">
              <SetupScreen onStart={startInterview} />
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 bg-white border-t border-slate-100 flex flex-col items-center gap-2 shrink-0">
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Engineered for Excellence • AI Interview Bot Platform</p>
      </footer>
    </div>
  );
};

export default App;
