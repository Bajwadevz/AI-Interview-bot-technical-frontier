
import React, { useState } from 'react';
import { Domain, Difficulty } from '../../types';

interface SetupScreenProps {
  onStart: (domain: Domain, difficulty: Difficulty, qCount: number) => void;
  onBack?: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, onBack }) => {
  const [domain, setDomain] = useState<Domain | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.INTERMEDIATE);
  const [qCount, setQCount] = useState(5);

  return (
    <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}
      
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter mb-4">Start Your Session</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Customize your practice environment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Domain Grid */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Select Focus Area</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(Domain).map(d => (
              <button 
                key={d}
                onClick={() => setDomain(d)}
                className={`p-6 text-left rounded-3xl border-2 transition-all ${
                  domain === d 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' 
                  : 'bg-white border-slate-100 text-slate-800 hover:border-indigo-200 hover:shadow-lg'
                }`}
              >
                <span className="block text-sm font-black mb-2 uppercase tracking-tight">{d}</span>
                <span className={`text-[8px] font-bold uppercase tracking-widest ${domain === d ? 'text-indigo-400' : 'text-slate-400'}`}>Professional Track</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Intensity Config */}
        <div className="lg:col-span-5 space-y-10">
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Difficulty Intensity</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Standard', val: Difficulty.BEGINNER },
                { label: 'Elite', val: Difficulty.INTERMEDIATE },
                { label: 'Expert', val: Difficulty.ADVANCED }
              ].map(lvl => (
                <button 
                  key={lvl.label}
                  onClick={() => setDifficulty(lvl.val)}
                  className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                    difficulty === lvl.val 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                    : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Questions per Session: <span className="text-indigo-600">{qCount}</span></h3>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <input 
                type="range" min="3" max="10" step="1"
                value={qCount}
                onChange={(e) => setQCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-full appearance-none accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between mt-4 text-[8px] font-black text-slate-300 uppercase tracking-widest">
                <span>Core (3)</span>
                <span>Deep Dive (10)</span>
              </div>
            </div>
          </div>

          <button 
            disabled={!domain}
            onClick={() => domain && onStart(domain, difficulty, qCount)}
            className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-indigo-600 transition-all disabled:opacity-20 flex items-center justify-center gap-4 group"
          >
            Start Practice
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
