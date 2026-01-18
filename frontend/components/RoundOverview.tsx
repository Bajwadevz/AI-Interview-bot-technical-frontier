/**
 * Round Overview Screen
 * Explains both rounds before starting
 */

import React from 'react';
import { Domain, Difficulty } from '../../types';

interface RoundOverviewProps {
  domain: Domain;
  difficulty: Difficulty;
  questionCount: number;
  onStartRound1: () => void;
  onBack: () => void;
}

const RoundOverview: React.FC<RoundOverviewProps> = ({ 
  domain, 
  difficulty, 
  questionCount, 
  onStartRound1, 
  onBack 
}) => {
  const difficultyLabel = difficulty === 1 ? 'Standard' : difficulty === 3 ? 'Elite' : 'Expert';

  return (
    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-12 py-10 text-white">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Setup
          </button>
          <h1 className="text-4xl font-black tracking-tight uppercase mb-2">Interview Overview</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
            {domain} • {difficultyLabel} Level • {questionCount} Questions
          </p>
        </div>

        {/* Content */}
        <div className="p-12 space-y-10">
          <div className="text-center mb-12">
            <p className="text-lg text-slate-600 font-semibold leading-relaxed max-w-2xl mx-auto">
              Your interview consists of two rounds designed to assess both technical knowledge and communication skills.
            </p>
          </div>

          {/* Round 1 Card */}
          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-[2rem] p-8">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0">
                1
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">
                  Round 1: Technical Interview
                </h2>
                <p className="text-slate-700 font-medium leading-relaxed mb-4">
                  This round focuses on your technical knowledge and problem-solving abilities. You'll answer questions through a chat interface.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Chat-based interface - no camera required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{questionCount} technical questions tailored to your domain</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Real-time AI evaluation of your responses</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Round 2 Card */}
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] p-8">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0">
                2
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">
                  Round 2: Communication Round
                </h2>
                <p className="text-slate-700 font-medium leading-relaxed mb-4">
                  This round assesses your communication skills, clarity, and confidence. You'll record a video response.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Video recording with webcam</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Domain-specific prompt to guide your response</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Review and save your recording before submission</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-8 border-t border-slate-200">
            <button
              onClick={onStartRound1}
              className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span>Start Round 1: Technical Interview</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundOverview;
