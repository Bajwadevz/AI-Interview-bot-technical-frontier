import React, { useState, useEffect } from 'react';
import { InterviewSession, OrchestrationEvent } from '../../types';
import { OrchestrationEngine } from '../../backend/services/orchestrationEngine';

interface OrchestrationDashboardProps {
  session: InterviewSession | null;
  onBack: () => void;
  onStartNew: () => void;
}

const OrchestrationDashboard: React.FC<OrchestrationDashboardProps> = ({ session, onBack, onStartNew }) => {
  const [events, setEvents] = useState<OrchestrationEvent[]>([]);
  
  useEffect(() => {
    // Generate mock event log assuming no true orchestrator DB log exists currently
    const newEvents: OrchestrationEvent[] = [
      { type: 'state_change', message: 'System initialized and ready', timestamp: Date.now() - 500000 },
      { type: 'state_change', message: 'User requested session start', timestamp: Date.now() - 490000 }
    ];
    
    if (session) {
      newEvents.push({ type: 'state_change', message: `Transitioned to state: ${session.status}`, timestamp: Date.now() - 400000 });
      if (session.questionsAnswered > 0) {
        newEvents.push({ type: 'question_complete', message: `Completed ${session.questionsAnswered} questions`, timestamp: Date.now() - 200000 });
      }
    }
    
    setEvents(newEvents.sort((a, b) => b.timestamp - a.timestamp));
  }, [session]);

  const currentState = session ? session.status : 'idle';
  const getIndexAndFormat = (stateId: string) => {
    const idx = OrchestrationEngine.STATES.indexOf(stateId as any);
    return { idx, label: OrchestrationEngine.getStateLabel(stateId), active: stateId === currentState };
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-slate-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Session Orchestrator</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Live State Machine Diagnostics</p>
          </div>
        </div>
      </div>

      {!session ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[3.5rem] border border-slate-100 shadow-xl p-10 text-center">
          <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-sm">
            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">No Active Session</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm font-medium">
            The Orchestrator requires an active interview session to track state transitions and events.
          </p>
          <button 
            onClick={onStartNew}
            className="px-8 py-4 bg-indigo-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Start New Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Section 1: State Machine (Spans 2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest">Live</span>
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">State Flow</h3>
            
            <div className="flex-1 flex items-center overflow-x-auto pb-4 custom-scrollbar">
              <div className="flex items-center min-w-max px-4">
                {OrchestrationEngine.STATES.map((st, i) => {
                  const isActive = st === currentState;
                  const isCompleted = OrchestrationEngine.STATES.indexOf(st) < OrchestrationEngine.STATES.indexOf(currentState as any);
                  return (
                    <React.Fragment key={st}>
                      <div className={`relative flex flex-col items-center z-10 transition-transform duration-500 ${isActive ? 'scale-110' : ''}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-sm transition-colors duration-700 border
                          ${isActive ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-200' : isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                        >
                          {isActive ? <span className="animate-pulse w-3 h-3 rounded-full bg-white block" /> : i + 1}
                        </div>
                        <p className={`absolute -bottom-8 whitespace-nowrap text-[9px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {OrchestrationEngine.getStateLabel(st)}
                        </p>
                      </div>
                      
                      {i < OrchestrationEngine.STATES.length - 1 && (
                        <div className="w-16 md:w-20 lg:w-24 h-1 mx-2 relative flex items-center">
                          <div className="w-full h-1 bg-slate-100 rounded-full" />
                          <div 
                            className={`absolute inset-0 h-1 bg-gradient-to-r from-emerald-400 to-indigo-500 rounded-full transition-all duration-1000 ${isCompleted ? 'w-full origin-left' : 'w-0'}`} 
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Timer Stats */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Session Metrics</h3>
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Elapsed</p>
                  <p className="text-3xl font-black text-slate-800 tabular-nums">{Math.floor((Date.now() - session.startedAt) / 60000)}m</p>
                </div>
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Answered</p>
                  <p className="text-xl font-black text-emerald-700">{session.questionsAnswered}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Remaining</p>
                  <p className="text-xl font-black text-slate-700">{session.questionCount - session.questionsAnswered}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Question Queue (Left Col) */}
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 flex flex-col overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Question Queue</h3>
            <div className="flex-1 overflow-y-auto space-y-3 px-2 custom-scrollbar">
              {Array.from({ length: session.questionCount }).map((_, i) => {
                const isCompleted = i < session.questionsAnswered;
                const isActive = i === session.questionsAnswered;
                const isPending = i > session.questionsAnswered;
                return (
                  <div key={i} className={`p-4 rounded-2xl flex items-center gap-4 transition-all ${isActive ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50'}`}>
                    <div className="shrink-0 flex items-center justify-center">
                      {isCompleted && <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
                      {isActive && <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-r-transparent animate-spin" />}
                      {isPending && <div className="w-8 h-8 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold">{i + 1}</div>}
                    </div>
                    <div className="flex-1 truncate">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isActive ? 'Active Question' : isCompleted ? 'Completed' : 'Pending'}
                      </p>
                      <p className={`text-sm font-bold truncate ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>Question Item #{i + 1}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Event Log (Right Col) */}
          <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] shadow-xl p-8 flex flex-col overflow-hidden text-white relative">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
              <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M4 17h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Internal Event Log
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 px-2 font-mono text-[11px] custom-scrollbar">
              {events.map((evt, idx) => {
                const colors = {
                  state_change: 'text-indigo-400',
                  question_complete: 'text-emerald-400',
                  question_skip: 'text-amber-400',
                  error: 'text-red-400',
                  timer_expired: 'text-orange-400',
                  network_issue: 'text-red-400',
                  api_failure: 'text-red-500'
                };
                return (
                  <div key={idx} className="flex items-start gap-4 p-3 bg-slate-800/50 rounded-xl border border-white/5 hover:bg-slate-800 transition-colors">
                    <div className="shrink-0 text-slate-500 mt-0.5">[{new Date(evt.timestamp).toISOString().split('T')[1].slice(0, -1)}]</div>
                    <div className="flex-1 break-words">
                      <span className={`${colors[evt.type]} font-bold mr-2 uppercase tracking-wide`}>[{evt.type}]</span>
                      <span className="text-slate-300">{evt.message}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrchestrationDashboard;
