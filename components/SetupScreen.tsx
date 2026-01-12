
import React from 'react';
import { Domain } from '../types';

interface SetupScreenProps {
  onStart: (domain: Domain) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  return (
    <div className="max-w-2xl w-full text-center space-y-8">
      <div className="space-y-4">
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Ace Your Next <span className="text-indigo-600">Technical Interview</span>
        </h2>
        <p className="text-xl text-slate-600">
          A domain-specific AI bot that simulates real human interviewers with adaptive follow-ups and scoring.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.values(Domain).map((domain) => (
          <button
            key={domain}
            onClick={() => onStart(domain)}
            className="group relative flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all text-left"
          >
            <div className="w-full mb-2 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-800 group-hover:text-indigo-600">{domain}</span>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Assessing proficiency in core {domain.toLowerCase()} concepts and practices.
            </p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-slate-500">Multimodal Input Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-slate-500">Adaptive Logic Engine v2</span>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
