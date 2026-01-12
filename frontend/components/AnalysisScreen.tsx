
import React, { useState, useEffect } from 'react';
import { InterviewSession, TranscriptEntry } from '../../types';
import FormulaDisplay from '../../module6/components/FormulaDisplay';
import { DB } from '../../backend/services/db';

interface AnalysisScreenProps {
  session: InterviewSession;
  transcripts?: TranscriptEntry[];
  onRestart: () => void;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ session, transcripts: propTranscripts, onRestart }) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>(propTranscripts || []);
  
  useEffect(() => {
    const loadTranscripts = async () => {
      if (!propTranscripts) {
        const loaded = await DB.getTranscripts(session.sessionId);
        setTranscripts(loaded);
      }
    };
    loadTranscripts();
  }, [session.sessionId, propTranscripts]);
  
  // Ultra-defensive extraction of session state
  const scores = session?.state?.scores || [];
  const validTranscripts = transcripts?.filter(t => t.speaker === 'user') || [];
  const qualitativeFeedback = session?.state?.qualitativeFeedback || [];
  const commStyles = session?.state?.communicationStyles || [];
  
  const avgAggregate = scores.length > 0 
    ? (scores.reduce((a, b) => a + (b.aggregateScore || 0), 0) / scores.length) 
    : 0;
  
  return (
    <div className="w-full max-w-6xl bg-white rounded-[3.5rem] shadow-3xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-slate-900 p-12 lg:p-16 text-white flex flex-col lg:flex-row justify-between items-end gap-10 border-b border-white/5">
        <div className="space-y-4">
           <div className="inline-block px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[9px] font-black uppercase tracking-[0.4em]">
             Module 06 Verified Dossier
           </div>
          <h2 className="text-5xl font-black tracking-tight uppercase">Evaluation Phase</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">
            Session: {session?.sessionId || 'N/A'} • Domain: {session?.domain || 'N/A'}
          </p>
        </div>
        <div className="text-center bg-white/5 px-10 py-8 rounded-[2.5rem] border border-white/5 backdrop-blur-md shrink-0">
          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-3 italic">Final Mastery Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black">{Math.round(avgAggregate * 100)}</span>
            <span className="text-2xl font-black text-indigo-400">%</span>
          </div>
        </div>
      </div>

      <div className="p-10 lg:p-16 grid grid-cols-1 xl:grid-cols-3 gap-16">
        <div className="xl:col-span-2 space-y-12">
          <section>
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Interaction Timeline</h3>
               <span className="text-[9px] font-bold text-slate-300 uppercase">Assessment Cycles: {scores.length}</span>
             </div>
             <div className="space-y-6 max-h-[600px] overflow-y-auto pr-6 custom-scrollbar">
               {validTranscripts.length > 0 ? (
                 validTranscripts.map((t, i) => (
                   <div key={i} className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:border-indigo-100 transition-all hover:bg-white hover:shadow-xl group">
                      <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[9px] font-black italic">{i+1}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{commStyles[i] || 'Analyzed'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Score: {Math.round((scores[i]?.aggregateScore || 0) * 100)}%</span>
                           <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${(scores[i]?.aggregateScore || 0) * 100}%` }} />
                           </div>
                        </div>
                      </div>
                      <p className="text-base text-slate-800 font-semibold leading-relaxed italic mb-5">"{t.text}"</p>
                      <div className="pt-5 border-t border-slate-100">
                        <p className="text-xs text-slate-500 font-bold leading-relaxed">
                          <span className="text-indigo-600 font-black uppercase text-[9px] mr-2">AI Observation:</span> 
                          {qualitativeFeedback[i+1] || qualitativeFeedback[i] || "Technical alignment confirmed."}
                        </p>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="p-20 text-center bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-100">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No telemetry captured in this cycle.</p>
                 </div>
               )}
             </div>
          </section>
        </div>

        <aside className="space-y-10">
          <div className="space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Algorithm Config</h3>
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full" />
               <div className="relative z-10 space-y-6">
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-2.5 text-slate-400 tracking-widest">
                       <span>Technical Weight</span>
                       <span>70%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: '70%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-2.5 text-slate-400 tracking-widest">
                       <span>Communication Weight</span>
                       <span>30%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: '30%' }} />
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <FormulaDisplay />
          
          <div className="p-10 bg-indigo-600 rounded-[2.5rem] text-white shadow-3xl shadow-indigo-200">
            <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em] mb-5">Mastery Verdict</h3>
            <p className="text-2xl font-black leading-tight mb-8">
              {avgAggregate > 0.8 ? 'Superior technical alignment detected.' : 
               avgAggregate > 0.6 ? 'Adequate domain proficiency confirmed.' : 
               'Foundational mastery; further study recommended.'}
            </p>
            <button 
              onClick={onRestart}
              className="w-full py-5 bg-white text-indigo-600 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              Start New Evaluation
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AnalysisScreen;
