
/**
 * PROJECT: AI Interview Bot
 * MODULE: 06 - Dynamic Scoring Engine
 * FILE: module6/Dashboard.tsx
 */

import React, { useState, useEffect } from 'react';
import { DB } from '../backend/services/db';
import { InterviewSession, Question } from '../types';
import { getActiveBank } from '../backend/constants';
import ScoreBreakdown from './components/ScoreBreakdown';
import FormulaDisplay from './components/FormulaDisplay';

const Module6Dashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);

  useEffect(() => {
    // Get all sessions and sort by newest first
    const loadSessions = async () => {
      try {
        const all = await DB.getSessions();
        const sorted = all.sort((a, b) => b.startedAt - a.startedAt);
        setSessions(sorted);
        if (sorted.length > 0) {
          setSelectedSession(sorted[0]);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      }
    };
    loadSessions();
  }, []);

  return (
    <div className="w-full max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-16 flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Performance Analytics</h2>
          <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">High-Precision Dynamic Scoring Hub</p>
        </div>
        <button onClick={onBack} className="px-10 py-3.5 bg-white border rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">Exit Hub</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-1 space-y-3 max-h-[65vh] overflow-y-auto pr-4 custom-scrollbar">
          {sessions.length > 0 ? sessions.map(s => {
            const avg = s.state.scores.length > 0 
              ? Math.round((s.state.scores.reduce((a, b) => a + b.aggregateScore, 0) / s.state.scores.length) * 100) 
              : 0;
            
            return (
              <button 
                key={s.sessionId}
                onClick={() => setSelectedSession(s)}
                className={`w-full p-8 rounded-[2.5rem] text-left transition-all border ${selectedSession?.sessionId === s.sessionId ? 'bg-indigo-600 border-indigo-600 shadow-xl' : 'bg-white border-slate-100'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`text-lg font-black ${selectedSession?.sessionId === s.sessionId ? 'text-white' : 'text-slate-800'}`}>{s.domain}</h4>
                  <span className={`text-[7px] font-black uppercase ${selectedSession?.sessionId === s.sessionId ? 'text-indigo-200' : 'text-slate-300'}`}>
                    {new Date(s.startedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={`mt-5 pt-5 border-t ${selectedSession?.sessionId === s.sessionId ? 'border-white/10' : 'border-slate-50'} flex justify-between items-center`}>
                  <span className={`text-[9px] font-black uppercase ${selectedSession?.sessionId === s.sessionId ? 'text-white' : 'text-slate-400'}`}>Cumulative</span>
                  <span className={`text-xl font-black ${selectedSession?.sessionId === s.sessionId ? 'text-white' : 'text-indigo-600'}`}>
                    {avg}%
                  </span>
                </div>
              </button>
            );
          }) : (
            <div className="p-8 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No historical data found</div>
          )}
        </div>

        <div className="lg:col-span-3">
          {selectedSession ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-500">
               <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-6 custom-scrollbar">
                 {selectedSession.state.scores.length > 0 ? selectedSession.state.scores.map((score, i) => (
                   <ScoreBreakdown key={i} score={score} label={`Topic ${i+1}`} />
                 )) : (
                   <div className="p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex items-center justify-center">
                     <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.2em]">Telemetry incomplete for this entry</p>
                   </div>
                 )}
               </div>
               <div className="space-y-8 sticky top-32 h-fit">
                 <FormulaDisplay />
                 <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Orchestrator Observation</h4>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      "Session metrics indicate a consistent technical alignment with communicative clarity optimized for professional settings."
                    </p>
                 </div>
               </div>
            </div>
          ) : (
            <div className="h-[65vh] bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex items-center justify-center text-slate-300">
              Select a session record for evaluation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Module6Dashboard;
