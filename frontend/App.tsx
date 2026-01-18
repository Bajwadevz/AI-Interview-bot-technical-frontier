
import React, { useState, useEffect } from 'react';
import { Domain, InterviewSession, Difficulty, User, InterviewStatus } from '../types';
import { getActiveBank } from '../backend/constants';
import { DB } from '../backend/services/db';
import SetupScreen from './components/SetupScreen';
import AnalysisScreen from './components/AnalysisScreen';
import QuestionBankView from './components/QuestionBankView';
import Module6Dashboard from '../module6/Dashboard';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/Auth/AuthScreen';
import RoundOverview from './components/RoundOverview';
import Round1Technical from './components/Round1Technical';
import Round1Complete from './components/Round1Complete';
import Round2Communication from './components/Round2Communication';
import SyncStatus from './components/SyncStatus';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'setup' | 'round-overview' | 'round1' | 'round1-complete' | 'round2' | 'analysis' | 'curriculum' | 'module6'>('landing');

  // CRITICAL FIX: Do NOT auto-login on mount
  // Only restore session if user explicitly authenticated in this session
  // OR if there's a valid session AND user explicitly navigates to authenticated area
  useEffect(() => {
    let isMounted = true;
    
    // DO NOT check for auth session on mount - this causes auto-login
    // User must explicitly log in or sign up
    // Only check session when:
    // 1. User explicitly clicks login/signup (handled by handleAuthSuccess)
    // 2. User navigates to protected route (will redirect to landing)
    
    // Start at landing page - no auto-login
    if (isMounted) {
      setView('landing');
      setUser(null);
      setSession(null);
    }
    
    // Listen for auth state changes ONLY (not initial load)
    const setupAuthListener = async () => {
      try {
        const supabaseModule = await import('../backend/services/supabase');
        
        // Listen for auth state changes (explicit login/logout events)
        supabaseModule.supabase.auth.onAuthStateChange((event, session) => {
          if (!isMounted) return;
          
          // Only handle explicit auth events, not initial session check
          if (event === 'SIGNED_IN') {
            // User explicitly signed in - load user data
            DB.getAuthSession().then(user => {
              if (user && isMounted) {
                setUser(user);
                setView('setup');
              }
            });
          } else if (event === 'SIGNED_OUT') {
            // User explicitly signed out - clear state
            if (isMounted) {
              setUser(null);
              setSession(null);
              setView('landing');
            }
          }
          // Ignore 'INITIAL_SESSION' and 'TOKEN_REFRESHED' - these are automatic, not explicit
        });
      } catch (error) {
        console.error('Error setting up auth listener:', error);
      }
    };
    
    setupAuthListener();
    
    // Handle page visibility changes - but do NOT auto-restore session
    const handleVisibilityChange = () => {
      // Do nothing - user must explicitly authenticate
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle beforeunload to save state
    const handleBeforeUnload = () => {
      if (session && ['round1', 'round2'].includes(session.status)) {
        DB.saveSession(session).catch(() => {
          // Silently fail
        });
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty deps - only run once on mount, never auto-check auth

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setView('setup');
  };

  const startInterview = async (domain: Domain, difficulty: Difficulty = Difficulty.INTERMEDIATE, qCount: number = 5) => {
    // Create new session with two-round structure
    const newSession: InterviewSession = {
      sessionId: `aib_${Date.now()}`,
      userId: user?.id || "demo_user",
      domain: domain,
      difficulty: difficulty,
      questionCount: qCount,
      status: "setup" as InterviewStatus,
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      round1: {
        currentQuestionId: "",
        topicProgress: [],
        scores: [],
        qualitativeFeedback: [],
        avgResponseLatency: 0,
        status: "not_started"
      },
      round2: {
        status: "not_started"
      }
    };
    await DB.saveSession(newSession);
    setSession(newSession);
    setView('round-overview');
  };

  const handleStartRound1 = () => {
    if (session) {
      // Guard: Don't allow restarting if already completed
      if (session.round1.status === 'completed' || session.status === 'round1_complete') {
        // Round 1 already completed, go to completion screen
        setView('round1-complete');
        return;
      }
      const updated = { 
        ...session, 
        status: "round1" as InterviewStatus,
        round1: {
          ...session.round1,
          status: "in_progress"
        }
      };
      setSession(updated);
      DB.saveSession(updated);
      setView('round1');
    }
  };

  const handleRound1Complete = () => {
    if (session) {
      const updated = { ...session, status: "round1_complete" as InterviewStatus };
      setSession(updated);
      DB.saveSession(updated);
      setView('round1-complete');
    }
  };

  const handleStartRound2 = () => {
    if (session) {
      const updated = { 
        ...session, 
        status: "round2" as InterviewStatus,
        round2: {
          ...session.round2,
          status: "in_progress"
        }
      };
      setSession(updated);
      DB.saveSession(updated);
      setView('round2');
    }
  };

  const handleRound2Complete = () => {
    if (session) {
      const updated = { 
        ...session, 
        status: "finished" as InterviewStatus 
      };
      setSession(updated);
      DB.saveSession(updated);
      setView('analysis');
    }
  };

  const handleTerminate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmed = window.confirm("Do you want to end this session? Your progress will be saved and you'll see your evaluation dashboard.");
    
    if (confirmed && session) {
      // Immediately update session status
      const finishedSession: InterviewSession = { 
        ...session, 
        status: 'finished', 
        lastUpdatedAt: Date.now() 
      };
      
      // Save to DB first
      await DB.saveSession(finishedSession);
      
      // Update state
      setSession(finishedSession);
      
      // Cancel any ongoing audio/speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Navigate to analysis screen
      setView('analysis');
    }
  };

  const finishInterview = async () => {
    if (session) {
      const updated: InterviewSession = { ...session, status: "finished", lastUpdatedAt: Date.now() };
      await DB.saveSession(updated);
      setSession(updated);
      setView('analysis');
    }
  };

  const logout = async () => {
    try {
      // Clear Supabase session
      await DB.setAuthSession(null);
      // Clear local state
      setUser(null);
      setSession(null);
      setView('landing');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force clear local state even if Supabase logout fails
      setUser(null);
      setSession(null);
      setView('landing');
    }
  };

  // View Router Logic
  if (view === 'landing') {
    return (
      <LandingPage 
        onGetStarted={() => setView('auth')} 
        onSignIn={() => setView('auth')}
        onExploreCurriculum={() => {
          // If user is authenticated, go to curriculum, otherwise go to auth first
          if (user) {
            setView('curriculum');
          } else {
            setView('auth');
          }
        }}
      />
    );
  }

  if (view === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} onBack={() => setView('landing')} />;
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
          {!['round1', 'round2'].includes(view) && (
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
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative p-6 md:p-10">
        <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-center">
          {view === 'curriculum' ? (
            <QuestionBankView onBack={() => setView('setup')} />
          ) : view === 'module6' ? (
            <Module6Dashboard onBack={() => setView('setup')} />
          ) : view === 'round-overview' && session ? (
            // Guard: Ensure session is in valid state for overview
            session.status === 'setup' || session.status === 'round-overview' ? (
              <RoundOverview
                domain={session.domain}
                difficulty={session.difficulty}
                questionCount={session.questionCount}
                onStartRound1={handleStartRound1}
                onBack={() => setView('setup')}
              />
            ) : (
              // Invalid state - redirect to appropriate view
              <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-16 text-center">
                <h2 className="text-2xl font-black text-slate-900 mb-4">Session Already In Progress</h2>
                <p className="text-slate-600 mb-8">Redirecting to your active interview...</p>
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )
          ) : view === 'round1' && session ? (
            <Round1Technical
              session={session}
              onRound1Complete={handleRound1Complete}
              setSession={setSession}
            />
          ) : view === 'round1-complete' && session ? (
            <Round1Complete
              session={session}
              onProceedToRound2={handleStartRound2}
            />
          ) : view === 'round2' && session ? (
            // Guard: Only allow Round 2 if Round 1 is completed
            session.round1.status === 'completed' || session.status === 'round1_complete' ? (
              <Round2Communication
                session={session}
                onRound2Complete={handleRound2Complete}
                setSession={setSession}
              />
            ) : (
              <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-red-100 p-16 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">Round 1 Must Be Completed First</h2>
                <p className="text-slate-600 mb-8">Please complete the technical interview before proceeding to the communication round.</p>
                <button
                  onClick={() => {
                    if (session.status === 'round1') {
                      setView('round1');
                    } else {
                      setView('setup');
                    }
                  }}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all"
                >
                  {session.status === 'round1' ? 'Continue Round 1' : 'Start New Interview'}
                </button>
              </div>
            )
          ) : view === 'analysis' && session ? (
            <AnalysisScreen 
              session={session} 
              onRestart={() => { setSession(null); setView('setup'); }} 
            />
          ) : (
            <SetupScreen 
              onStart={startInterview} 
              onBack={user ? undefined : () => setView('landing')}
            />
          )}
        </div>
      </main>

      <footer className="py-4 bg-white border-t border-slate-100 flex flex-col items-center gap-2 shrink-0">
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Engineered for Excellence • AI Interview Bot Platform</p>
      </footer>
      
      {/* Sync Status Indicator */}
      <SyncStatus isOnline={navigator.onLine} />
    </div>
  );
};

export default App;
