
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
  // CORE LOGIC: Authentication & Session Management
  // Requirement: Users are never automatically logged in on first load.
  useEffect(() => {
    let isMounted = true;

    // 1. Initial State: Always start at 'landing' with no user processing.
    if (isMounted) {
      setView('landing');
      setUser(null);
      setSession(null);
    }

    // 2. Auth Listener: Only react to explicit SIGNED_IN events (user clicked login)
    // We ignore INITIAL_SESSION to prevent auto-login from cookies
    const setupAuthListener = () => {
      import('../backend/services/supabase').then(({ supabase }) => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;

          if (event === 'SIGNED_IN') {
            // Explicit login action occurred
            const user = await DB.getAuthSession();
            if (user && isMounted) {
              console.log('User explicitly signed in:', user.email);
              setUser(user);

              // RESUME LOGIC: Check for active sessions to restore progress
              try {
                const sessions = await DB.getSessions();
                // Find recently updated active session
                const activeSession = sessions
                  .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)
                  .find(s => ['round1', 'round1_complete', 'round2'].includes(s.status));

                if (activeSession) {
                  console.log('Resuming active session:', activeSession.sessionId);
                  setSession(activeSession);

                  // Route to correct view based on status
                  if (activeSession.status === 'round1') setView('round1');
                  else if (activeSession.status === 'round1_complete') setView('round1-complete');
                  else if (activeSession.status === 'round2') setView('round2');
                  else setView('setup');
                } else {
                  setView('setup');
                }
              } catch (err) {
                console.error('Error recovering session:', err);
                setView('setup');
              }
            }
          } else if (event === 'SIGNED_OUT') {
            // Explicit logout action
            if (isMounted) {
              console.log('User signed out');
              setUser(null);
              setSession(null);
              setView('landing');
            }
          }
        });

        return () => subscription.unsubscribe();
      }).catch(err => console.error("Failed to load supabase", err));
    };

    setupAuthListener();

    // 3. Cleanup
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array = run once on mount

  // Prevent browser back/forward buttons from breaking flow state
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Always force back to landing if user tries to use browser navigation
      // This enforces our internal state machine
      if (view !== 'landing') {
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

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
      questionsAnswered: 0,
      status: "setup" as InterviewStatus,
      round1Status: "not_started",
      round2Status: "not_started",
      terminationSource: "none",
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
      const updated: InterviewSession = {
        ...session,
        status: "round1" as InterviewStatus,
        round1Status: "in_progress",
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
      const updated: InterviewSession = {
        ...session,
        status: "round1_complete" as InterviewStatus,
        round1Status: "completed",
        round1: {
          ...session.round1,
          status: "completed"
        }
      };
      setSession(updated);
      DB.saveSession(updated);
      setView('round1-complete');
    }
  };

  const handleStartRound2 = () => {
    if (session) {
      const updated: InterviewSession = {
        ...session,
        status: "round2" as InterviewStatus,
        round2Status: "in_progress",
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
      const updated: InterviewSession = {
        ...session,
        status: "finished" as InterviewStatus,
        round2Status: "completed",
        endedAt: Date.now(),
        round2: {
          ...session.round2,
          status: "completed"
        }
      };
      setSession(updated);
      DB.saveSession(updated);
      setView('analysis');
    }
  };

  const handleTerminate = async (updates?: Partial<InterviewSession>) => {
    // Note: event argument removed or handled dynamically if needed, 
    // but typically called programmatically now via props.

    // If called via event, we might need checking, but for now assuming direct calls or wrapped.
    const confirmed = window.confirm("Do you want to end this session early? Your progress will be saved.");

    if (confirmed && session) {
      // Logic for Early Termination
      const isRound1 = session.status === 'round1';
      const isRound2 = session.status === 'round2';

      // Merge provided updates (e.g. from Round 2 saving video) with current session
      // We prioritize 'updates' over 'session' state
      const baseSession = { ...session, ...updates };

      const finishedSession: InterviewSession = {
        ...baseSession,
        status: 'finished',
        terminationSource: 'user',
        endedAt: Date.now(),
        lastUpdatedAt: Date.now(),
        round1Status: isRound1 ? 'terminated' : baseSession.round1Status,
        round2Status: isRound2 ? 'terminated' : (baseSession.round2Status === 'not_started' ? 'skipped' : baseSession.round2Status),
        round1: {
          ...baseSession.round1,
          status: isRound1 ? 'terminated' : baseSession.round1.status
        },
        round2: {
          ...baseSession.round2,
          status: isRound2 ? 'terminated' : baseSession.round2.status
        }
      };

      // If terminated in Round 1, ensure Round 2 is marked skipped/not attempted
      if (isRound1) {
        finishedSession.round2Status = 'skipped';
      }

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

  const logout = async () => {
    try {
      // 1. Clear Supabase session
      await DB.setAuthSession(null);
      // 2. Clear local state immediately for UI responsiveness
      setUser(null);
      setSession(null);
      setView('landing');
      // 3. Clear any other potential storage
      localStorage.clear();
    } catch (error) {
      console.error('Error during logout:', error);
      // Force clear local state even if Supabase logout fails
      setUser(null);
      setSession(null);
      setView('landing');
      localStorage.clear();
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
          {['round1', 'round2'].includes(view) && (
            <button
              onClick={() => handleTerminate()}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              End Session
            </button>
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
              // @ts-ignore
              onTerminate={() => handleTerminate()}
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
                // @ts-ignore
                onTerminate={() => handleTerminate()}
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
