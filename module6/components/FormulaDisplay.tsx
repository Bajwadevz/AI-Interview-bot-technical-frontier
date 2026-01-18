
/**
 * PROJECT: Hire Brain
 * MODULE: 06 - Dynamic Scoring Engine
 * FILE: module6/components/FormulaDisplay.tsx
 */

import React from 'react';

const FormulaDisplay: React.FC = () => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scoring Algorithm Reference</h4>
      
      <div className="space-y-4 font-mono text-[11px] text-slate-600">
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
          <p className="text-indigo-600 font-bold mb-1">Technical Score (S_tech)</p>
          <code className="block bg-slate-50 p-2 rounded text-slate-800">
            S_tech = (∑ (TF_kw_i * w_i)) / N_kw
          </code>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
          <p className="text-emerald-600 font-bold mb-1">Communication Score (S_comm)</p>
          <code className="block bg-slate-50 p-2 rounded text-slate-800">
            S_comm = (f(pace) + f(clarity) + f(eye)) / 3
          </code>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
          <p className="text-white font-bold mb-1">Final Weighted Score</p>
          <code className="block bg-slate-800 p-2 rounded text-indigo-300">
            Score = (w1 * S_tech) + (w2 * S_comm)
          </code>
          <p className="mt-2 text-[9px] text-slate-400">Where w1 = 0.7 and w2 = 0.3</p>
        </div>
      </div>
    </div>
  );
};

export default FormulaDisplay;
