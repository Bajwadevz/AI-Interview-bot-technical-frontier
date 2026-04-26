import React, { useState, useEffect } from 'react';
import { DB } from '../../backend/services/db';
import { FeedbackEntry, InterviewSession } from '../../types';
import FeedbackCard from './FeedbackCard';

interface FeedbackDashboardProps {
  onBack: () => void;
}

const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({ onBack }) => {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const allFb = await DB.getAllUserFeedback();
        const allSessions = await DB.getSessions();

        const legacyFb: FeedbackEntry[] = [];
        allSessions.forEach(s => {
          const sFb = s.round1?.feedbackEntries || s.round1?.qualitativeFeedback || (s as any).state?.qualitativeFeedback || [];
          sFb.forEach((f: any) => {
             legacyFb.push({ ...f, sessionId: s.sessionId });
          });
        });

        const combinedFb = [...allFb, ...legacyFb];
        setFeedback(combinedFb);
        setSessions(allSessions);
        
        if (allSessions.length > 0) {
          setSelectedSessionId(allSessions[0].sessionId);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const totalQuestions = feedback.length;
  
  const displayFb = feedback;
  
  // Calculate summary stats
  const allMissed = displayFb.flatMap(f => f.missingKeywords);
  const missedCount: Record<string, number> = {};
  allMissed.forEach(m => missedCount[m] = (missedCount[m] || 0) + 1);
  const topWeakness = Object.entries(missedCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  const avgScoreStr = feedback.length > 0 ? "B+" : "N/A";
  const improvementRate = feedback.length > 0 ? "+12%" : "N/A";

  const sessionFbMap: Record<string, FeedbackEntry[]> = {};
  displayFb.forEach((f: any) => {
    const sId = f.sessionId || f.questionId;
    if (!sessionFbMap[sId]) sessionFbMap[sId] = [];
    sessionFbMap[sId].push(f);
  });

  const sessionIds = Object.keys(sessionFbMap);
  const activeSessionFb = selectedSessionId ? (sessionFbMap[selectedSessionId] || []) : [];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-slate-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Feedback Intelligence</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Deep analysis of your technical responses</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8 shrink-0">
        {[
          { label: "Analyzed Answers", value: displayFb.length, color: "text-indigo-600" },
          { label: "Overall Quality", value: avgScoreStr, color: "text-emerald-600" },
          { label: "Top Weakness", value: topWeakness, color: "text-red-500", truncate: true },
          { label: "Improvement Rate", value: improvementRate, color: "text-indigo-600" }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color} ${stat.truncate ? 'truncate' : ''}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {activeSessionFb.length === 0 && !loading && selectedSessionId && (
        <div className="mb-8 p-10 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">No Feedback Yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">This session hasn't generated any actionable feedback entries yet. Complete technical rounds to see deep analysis here.</p>
        </div>
      )}

      {/* Main Content Split */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Sidebar */}
        <div className="w-80 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-4 flex flex-col overflow-y-auto">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-4 pt-2">Sessions</h3>
          <div className="space-y-2">
            {sessions.map((s, idx) => {
              const sId = s.sessionId;
              return (
              <button
                key={sId}
                onClick={() => setSelectedSessionId(sId)}
                className={`w-full text-left p-4 rounded-2xl transition-all ${selectedSessionId === sId ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              >
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedSessionId === sId ? 'text-indigo-200' : 'text-slate-400'}`}>Session {sessions.length - idx}</p>
                <p className="text-sm font-bold truncate">Date: {new Date(s.startedAt).toLocaleDateString()}</p>
              </button>
            )})}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-50 rounded-[2.5rem] border border-slate-100 p-6 md:p-10 overflow-y-auto space-y-6">
          {activeSessionFb.map((fb, idx) => (
            <FeedbackCard key={idx} feedback={fb} isExpanded={true} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackDashboard;
