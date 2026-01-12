
/**
 * PROJECT: Hire Brain
 * MODULE: 06 - Dynamic Scoring Engine
 * FILE: module6/components/ScoreBreakdown.tsx
 */

import React from 'react';
import { DetailedScore } from '../types';

interface Props {
  score: DetailedScore;
  label?: string;
}

const ScoreBreakdown: React.FC<Props> = ({ score, label }) => {
  const pct = (val: number) => Math.round(val * 100);

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white border border-white/5 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">
      {/* Decorative Gradient Flare */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Engine Phase 06</h4>
            </div>
            <h3 className="text-3xl font-black tracking-tighter">{label || "Scoring Output"}</h3>
          </div>
          {score.isZeroed ? (
            <span className="px-4 py-1.5 bg-red-500/20 text-red-400 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/10">
              Filtered (All-Zero)
            </span>
          ) : (
            <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10">
              Valid Inference
            </span>
          )}
        </div>

        <div className="space-y-8">
          {/* Technical Accuracy (S_tech) */}
          <div className="group">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-3">
              <span className="text-slate-400 group-hover:text-indigo-300 transition-colors italic">S_tech • Technical Depth</span>
              <span className="text-indigo-400">{pct(score.technicalScore)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 p-0.5">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                style={{ width: `${pct(score.technicalScore)}%` }} 
              />
            </div>
            <div className="flex justify-between mt-2">
               <p className="text-[9px] text-slate-500 font-mono italic">TF-Semantic Analysis Active</p>
               <p className="text-[9px] text-slate-500 font-mono">w1: 0.7</p>
            </div>
          </div>

          {/* Communication Skills (S_comm) */}
          <div className="group">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-3">
              <span className="text-slate-400 group-hover:text-emerald-300 transition-colors italic">S_comm • Delivery Factor</span>
              <span className="text-emerald-400">{pct(score.communicationScore)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 p-0.5">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                style={{ width: `${pct(score.communicationScore)}%` }} 
              />
            </div>
            <div className="flex justify-between mt-2">
               <p className="text-[9px] text-slate-500 font-mono italic">Pace: {Math.round(score.metrics.pace * 100)}% | Eye: {Math.round(score.metrics.eyeContact * 100)}%</p>
               <p className="text-[9px] text-slate-500 font-mono">w2: 0.3</p>
            </div>
          </div>

          {/* Final Aggregated Score Card */}
          <div className="mt-12 p-8 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Module 06 Aggregate</span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">{pct(score.aggregateScore)}</span>
                <span className="text-xl font-black text-indigo-400">%</span>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2 px-4 bg-indigo-500/10 rounded-full w-fit">
               <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
               <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Weighted Formula Applied</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreBreakdown;
