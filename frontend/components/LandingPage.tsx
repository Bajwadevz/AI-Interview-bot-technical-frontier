
import React from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onExploreCurriculum?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onExploreCurriculum }) => {
  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            A
          </div>
          <span className="text-sm font-black uppercase tracking-[0.3em] hidden sm:inline">AI Interview Bot</span>
        </div>
        <div className="flex items-center gap-8">
          <button 
            onClick={onSignIn}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={onGetStarted}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="max-w-4xl">
          <div className="inline-flex flex-col gap-1 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 w-fit">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400">v4.2 Neural Orchestrator Live</span>
            </div>
            <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[12px] mt-4 ml-1">Your Interview Partner</p>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            MASTER THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-emerald-400">TECHNICAL</span> <br />
            FRONTIER.
          </h1>

          <p className="text-xl text-slate-400 font-medium max-w-2xl leading-relaxed mb-12 animate-in fade-in slide-in-from-left-12 duration-1000 delay-200">
            High-fidelity technical interview simulations powered by adaptive AI. 
            Receive real-time behavioral telemetry and a mathematically rigorous mastery dossier.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <button 
              onClick={onGetStarted}
              className="px-10 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 hover:text-white transition-all shadow-2xl hover:shadow-indigo-500/40 active:scale-95 flex items-center justify-center gap-3"
            >
              Initiate Assessment
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
            <button 
              onClick={onExploreCurriculum || onGetStarted}
              className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 transition-all active:scale-95"
            >
              Explore Curriculum
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-40 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700">
          {[
            {
              title: "Neural Interaction",
              desc: "Flash-Lite powered low-latency conversation with real-time biometric feed simulation.",
              icon: "N"
            },
            {
              title: "Adaptive Flow",
              desc: "Dynamic question routing that scales difficulty based on your semantic master percentage.",
              icon: "A"
            },
            {
              title: "Verified Dossier",
              desc: "A proprietary scoring engine (Module 06) that provides a 100-point performance breakdown.",
              icon: "D"
            }
          ].map((feature, i) => (
            <div key={i} className="group p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem] hover:bg-white/[0.04] hover:border-white/20 transition-all hover:-translate-y-2">
              <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black mb-8 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-4">{feature.title}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
            &copy; 2024 AI INTERVIEW BOT • ENGINEERED FOR EXCELLENCE
          </p>
          <div className="flex gap-8">
            <button 
              onClick={() => window.open('https://github.com', '_blank')}
              className="text-[9px] font-bold text-slate-600 uppercase tracking-widest hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Docs
            </button>
            <button 
              onClick={() => window.open('https://github.com', '_blank')}
              className="text-[9px] font-bold text-slate-600 uppercase tracking-widest hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button 
              onClick={() => window.open('https://github.com', '_blank')}
              className="text-[9px] font-bold text-slate-600 uppercase tracking-widest hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Terminal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
