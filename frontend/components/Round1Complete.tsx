/**
 * Round 1 Completion Screen
 * Shows summary and allows proceeding to Round 2
 */

import React from 'react';
import { InterviewSession } from '../../types';

interface Round1CompleteProps {
  session: InterviewSession;
  onProceedToRound2: () => void;
}

const Round1Complete: React.FC<Round1CompleteProps> = ({ session, onProceedToRound2 }) => {
  const avgScore = session.round1.scores.length > 0
    ? session.round1.scores.reduce((sum, s) => sum + s.aggregateScore, 0) / session.round1.scores.length
    : 0;

  return (
    <div className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-700">
      {/* Header */}
      <div className="bg-indigo-600 px-12 py-10 text-white">
        <h1 className="text-4xl font-black tracking-tight uppercase mb-2">Round 1 Complete!</h1>
        <p className="text-indigo-200 font-bold uppercase tracking-[0.3em] text-[10px]">
          Technical Interview Finished
        </p>
      </div>

      {/* Content */}
      <div className="p-12 space-y-10">
        <div className="text-center">
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Excellent Work!</h2>
          <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
            You've completed the technical interview. Your responses have been evaluated and scored.
          </p>
        </div>

        {/* Score Summary */}
        <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Round 1 Summary</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Questions Answered</p>
              <p className="text-3xl font-black text-slate-900">{session.round1.topicProgress.length} / {session.questionCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Average Score</p>
              <p className="text-3xl font-black text-indigo-600">{Math.round(avgScore * 100)}%</p>
            </div>
          </div>
        </div>

        {/* Next Round Info */}
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0">
              2
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">
                Ready for Round 2?
              </h3>
              <p className="text-slate-700 font-medium leading-relaxed mb-4">
                The next round focuses on communication skills. You'll record a video response to a domain-specific prompt.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Webcam required for video recording</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Review your recording before submission</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>No time limit - take your time</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-8 border-t border-slate-200">
          <button
            onClick={onProceedToRound2}
            className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span>Proceed to Round 2: Communication Round</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Round1Complete;
