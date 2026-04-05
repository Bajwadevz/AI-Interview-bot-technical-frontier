import React, { useState, useEffect } from 'react';
import { FeedbackEntry } from '../../types';

interface FeedbackCardProps {
  feedback: FeedbackEntry;
  isExpanded?: boolean;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback, isExpanded = false }) => {
  const [expanded, setExpanded] = useState(isExpanded);

  useEffect(() => {
    setExpanded(isExpanded);
  }, [isExpanded]);

  if (!expanded) {
    return (
      <div 
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest">View AI Feedback</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
      <div 
        className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(false)}
      >
        <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">AI Evaluation</h3>
        <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Question context */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Question Context</p>
          <p className="text-sm font-medium text-slate-700">{feedback.questionText}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              Strengths
            </p>
            <div className="flex flex-wrap gap-2">
              {feedback.strengths.length > 0 ? feedback.strengths.map((str, idx) => (
                <span key={idx} className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full text-[10px] font-bold">
                  {str}
                </span>
              )) : <span className="text-xs text-slate-400 italic">None noted.</span>}
            </div>
          </div>

          {/* Weaknesses */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Areas for Improvement
            </p>
            <div className="flex flex-wrap gap-2">
              {feedback.weaknesses.length > 0 ? feedback.weaknesses.map((wk, idx) => (
                <span key={idx} className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-[10px] font-bold">
                  {wk}
                </span>
              )) : <span className="text-xs text-slate-400 italic">None noted.</span>}
            </div>
          </div>
        </div>

        {/* Missing Keywords */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-3 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Missing Keywords
          </p>
          <div className="flex flex-wrap gap-2">
            {feedback.missingKeywords.length > 0 ? feedback.missingKeywords.map((kw, idx) => (
              <span key={idx} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-md text-[10px] font-mono font-bold border border-red-200">
                {kw}
              </span>
            )) : <span className="text-xs text-slate-400 italic">All expected keywords were covered.</span>}
          </div>
        </div>

        {/* Suggestions */}
        <div className="bg-indigo-50/50 rounded-[1.5rem] p-5 border border-indigo-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-3 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Actionable Suggestions
          </p>
          <ul className="space-y-2">
            {feedback.suggestions.length > 0 ? feedback.suggestions.map((sug, idx) => (
              <li key={idx} className="text-sm font-medium text-indigo-900 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                {sug}
              </li>
            )) : <span className="text-xs text-slate-400 italic">Continue practicing standard patterns.</span>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FeedbackCard;
