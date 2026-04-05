import React, { useState, useEffect, useMemo } from 'react';
import { DataRepository } from '../../backend/services/dataRepository';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DataDashboardProps {
  onBack: () => void;
}

const DataDashboard: React.FC<DataDashboardProps> = ({ onBack }) => {
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [domainScores, setDomainScores] = useState<any[]>([]);
  const [weaknesses, setWeaknesses] = useState<any[]>([]);
  const [improvement, setImprovement] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uid = "mock-user-id";
        const st = await DataRepository.getUserStats(uid);
        const hist = await DataRepository.getSessionHistory(uid);
        const ds = await DataRepository.getScoresByDomain(uid);
        const impr = await DataRepository.getImprovementTrends(uid);
        const wk = await DataRepository.getWeaknessAnalysis(uid);
        
        setStats(st);
        setHistory(hist.sort((a,b) => b.date - a.date));
        setDomainScores(ds);
        setImprovement(impr);
        setWeaknesses(wk);
      } catch (err) {
        console.error("Error loading data repository:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const hasData = history && history.length > 0;

  // Render mock data if real data is missing, to demo standard charting
  const mockImprovement = useMemo(() => [
    { date: 1, avgScore: 65 }, { date: 2, avgScore: 72 }, 
    { date: 3, avgScore: 70 }, { date: 4, avgScore: 81 }, 
    { date: 5, avgScore: 89 }
  ], []);

  const mockDomainScores = useMemo(() => [
    { domain: "Frontend", avgTechnical: 85, avgCommunication: 90 },
    { domain: "Backend", avgTechnical: 72, avgCommunication: 80 },
    { domain: "Algorithms", avgTechnical: 65, avgCommunication: 75 }
  ], []);

  const mockWeaknesses = useMemo(() => [
    { keyword: "reconciliation", missCount: 5 },
    { keyword: "useMemo", missCount: 4 },
    { keyword: "closure", missCount: 3 },
    { keyword: "debouncing", missCount: 2 }
  ], []);

  const displayImprovement = hasData && improvement.length > 0 ? improvement : mockImprovement;
  const displayDomainScores = hasData && domainScores.length > 0 ? domainScores : mockDomainScores;
  const displayWeaknesses = hasData && weaknesses.length > 0 ? weaknesses : mockWeaknesses;

  const filteredHistory = history.filter(h => h.domain.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full overflow-y-auto pb-10 animate-in fade-in slide-in-from-bottom-4">
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
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Data Repository</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Aggregated Insights and Analytics</p>
          </div>
        </div>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Interviews</p>
            <p className="text-2xl font-black text-slate-900">{stats?.totalInterviews || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center shrink-0 relative">
            <svg className="w-full h-full -rotate-90">
              <circle cx="24" cy="24" r="20" className="stroke-slate-100" strokeWidth="4" fill="none" />
              <circle cx="24" cy="24" r="20" className="stroke-indigo-500" strokeWidth="4" fill="none" strokeDasharray="125.6" strokeDashoffset={125.6 - ((stats?.avgScore || 0) / 100) * 125.6} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900">{Math.round(stats?.avgScore || 0)}</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Avg Score</p>
            <p className="text-2xl font-black text-slate-900">{Math.round(stats?.avgScore || 0)}%</p>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Questions Ans</p>
            <p className="text-2xl font-black text-slate-900">{stats?.totalQuestions || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active Domains</p>
            <p className="text-2xl font-black text-slate-900">{stats?.domainsCount || 0}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col h-96">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Score Pipeline Over Time</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayImprovement}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={hasData ? (v => new Date(v).toLocaleDateString()) : (v => `Session ${v}`)}
                  axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} 
                />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dx={-10} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="avgScore" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col h-96">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Aggregate Scores by Domain</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayDomainScores}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="domain" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dx={-10} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="avgTechnical" name="Technical" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgCommunication" name="Communication" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: History & Weakness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session History</h3>
            <input 
              type="text" 
              placeholder="Search domains..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48"
            />
          </div>
          <div className="flex-1 space-y-3 h-[300px] overflow-y-auto pr-4 custom-scrollbar">
            {filteredHistory.length === 0 ? (
               <div className="w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-100 rounded-[1.5rem]">
                 <p className="text-xs font-bold text-slate-400 italic">No history found</p>
               </div>
            ) : filteredHistory.map((h, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase tracking-wider">{h.domain}</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider">{new Date(h.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{h.questionCount} Questions Answered</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${h.status.includes('complete') || h.status === 'finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{h.status.replace('_', ' ')}</span>
                  <p className="text-xs font-black text-slate-400 tabular-nums">Score: {Math.round(h.score)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Top Weaknesses (Keywords)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={displayWeaknesses} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis dataKey="keyword" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} width={80} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="missCount" name="Misses" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDashboard;
