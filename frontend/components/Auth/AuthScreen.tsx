
import React, { useState } from 'react';
import { AuthService } from '../../../backend/services/authService';
import { User } from '../../../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = isLogin 
        ? await AuthService.login(email, password)
        : await AuthService.register(email, name, password);

      if (result.success && result.user) {
        onAuthSuccess(result.user);
      } else {
        setError(result.error || "Access Denied.");
      }
    } catch (err) {
      setError("Connection failure. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-1000 relative z-10">
        <div className="bg-white rounded-[3.5rem] p-12 lg:p-14 shadow-2xl border border-white/10">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-xl rotate-2">AIB</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase">
              {isLogin ? "Practice Access" : "Create Profile"}
            </h2>
            <p className="text-slate-400 text-[10px] mt-4 font-bold uppercase tracking-[0.3em] italic">
              {isLogin ? "Sign in to resume training" : "Start your skill journey"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Your Name</label>
                <input 
                  type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all font-bold text-slate-700"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Email Endpoint</label>
              <input 
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all font-bold text-slate-700"
                placeholder="candidate@node.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Authorization Key</label>
              <input 
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all font-bold text-slate-700"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping shrink-0" />
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {loading ? "Authorizing..." : isLogin ? "Authorize Entry" : "Create Profile"}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              {isLogin ? "Need a profile? Register" : "Already established? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
