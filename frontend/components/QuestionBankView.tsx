
/**
 * PROJECT: Hire Brain
 * FILE: frontend/components/QuestionBankView.tsx
 * DESCRIPTION: Dashboard for teachers to browse and expand the 5000-question repository.
 */

import React, { useState, useEffect } from 'react';
import { Domain, Question } from '../../types';
import { COMPREHENSIVE_BANK } from '../../backend/questionBank';
import { DB } from '../../backend/services/db';
import { generateBulkQuestions } from '../../backend/services/geminiService';

interface QuestionBankViewProps {
  onBack?: () => void;
}

const QuestionBankView: React.FC<QuestionBankViewProps> = ({ onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    // Load merged bank
    const loadQuestions = async () => {
      try {
        const custom = await DB.getCustomQuestions();
        setQuestions([...COMPREHENSIVE_BANK, ...custom]);
      } catch (error) {
        console.error('Error loading custom questions:', error);
        setQuestions([...COMPREHENSIVE_BANK]);
      }
    };
    loadQuestions();
  }, []);

  const filtered = questions.filter(q => {
    const matchesDomain = filter === "All" || q.domain === filter;
    const matchesSearch = q.text.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  const expandBank = async () => {
    const targetDomain = filter === "All" ? Domain.SOFTWARE_ENGINEERING : filter as Domain;
    setIsExpanding(true);
    try {
      // PDF Requirement: Scaling to thousands via GenAI expansion
      const newBatch = await generateBulkQuestions(targetDomain, 30);
      await DB.saveCustomQuestions(newBatch);
      
      const updatedCustom = await DB.getCustomQuestions();
      setQuestions([...COMPREHENSIVE_BANK, ...updatedCustom]);
    } catch (e) {
      alert("AI expansion failed. Please verify your API key and connection.");
    } finally {
      setIsExpanding(false);
    }
  };

  const progressPercent = Math.min(100, (questions.length / 5000) * 100);

  return (
    <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}
      
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-white tracking-tight">System Curriculum Manager</h2>
            <div className="mt-4 flex flex-col md:flex-row gap-6 items-center">
              <div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mb-2">Goal: 5,000 Entries</p>
                <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-indigo-400 font-black text-xl">{questions.length} / 5000</p>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search concepts (e.g., 'Solid', 'React')..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 md:w-64 px-6 py-4 bg-white/10 border border-white/10 rounded-2xl text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
            />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-6 py-4 bg-white/10 border border-white/10 rounded-2xl text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="All" className="text-slate-900">All Domains</option>
              {Object.values(Domain).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
            </select>
          </div>
        </div>

        <div className="p-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Question Ledger</h3>
              <p className="text-xs text-slate-400">Viewing {filtered.length} questions matching current criteria.</p>
            </div>
            
            <div className="flex gap-3">
               <button 
                onClick={() => { if(confirm("Clear custom bank?")) { DB.clearAll(); window.location.reload(); }}}
                className="px-6 py-4 border border-slate-100 text-slate-400 rounded-2xl font-bold text-[10px] uppercase hover:bg-slate-50 transition-all"
              >
                Reset Database
              </button>
              <button 
                onClick={expandBank}
                disabled={isExpanding}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-3"
              >
                {isExpanding ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Expanding Repository...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    GenAI Expansion (Batch of 30)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-6 custom-scrollbar">
            {filtered.map((q, i) => (
              <div key={q.id + i} className="group p-8 bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-indigo-100 rounded-[2rem] transition-all hover:shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest">{q.domain}</span>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${q.difficulty > 3 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      Level {q.difficulty}
                    </span>
                  </div>
                  <p className="text-base font-bold text-slate-800 leading-relaxed">{q.text}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:max-w-xs">
                  {q.expectedKeywords.slice(0, 4).map((k, j) => (
                    <span key={j} className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-bold text-slate-400 uppercase">{k}</span>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-24 text-center text-slate-400">
                <p className="italic">No questions found matching your search. Try a different filter or expand the bank.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankView;
