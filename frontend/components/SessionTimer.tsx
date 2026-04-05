import React from 'react';

interface SessionTimerProps {
  questionTimeRemaining: number;
  sessionTimeRemaining: number;
  questionTimeLimit: number;
  sessionTimeLimit: number;
}

const SessionTimer: React.FC<SessionTimerProps> = ({
  questionTimeRemaining,
  sessionTimeRemaining,
  questionTimeLimit,
  sessionTimeLimit
}) => {
  const qRatio = questionTimeRemaining / questionTimeLimit;
  const sRatio = sessionTimeRemaining / sessionTimeLimit;

  // Determine colors based on thresholds
  const getColor = (ratio: number) => {
    if (ratio > 0.25) return 'text-indigo-500 stroke-indigo-500 bg-indigo-500';
    if (ratio > 0.1) return 'text-amber-500 stroke-amber-500 bg-amber-500';
    return 'text-red-500 stroke-red-500 bg-red-500';
  };

  const qColorClass = getColor(qRatio);
  const sColorClass = getColor(sRatio);

  // SVG parameters
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - qRatio * circumference;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2 bg-slate-800/50 p-2 px-3 rounded-[1.5rem] border border-slate-700/50 shadow-inner">
      {/* Circular Question Timer */}
      <div className="relative w-[56px] h-[56px] flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            className="stroke-slate-700"
            strokeWidth="3"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            className={`transition-all duration-1000 ease-linear ${qColorClass.split(' ')[1]}`}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white text-[12px] font-black tabular-nums tracking-tighter leading-none block">
            {formatTime(questionTimeRemaining)}
          </span>
        </div>
      </div>

      {/* Linear Session Timer */}
      <div className="w-full flex items-center gap-2 px-1">
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${sColorClass.split(' ')[2]}`}
            style={{ width: `${sRatio * 100}%` }}
          />
        </div>
        <span className="text-[8px] font-black text-slate-400 tabular-nums">
          {formatTime(sessionTimeRemaining)}
        </span>
      </div>
    </div>
  );
};

export default SessionTimer;
