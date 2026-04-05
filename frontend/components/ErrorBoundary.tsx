import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRestart = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-red-100 p-10 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">System Encountered an Error</h2>
            <p className="text-sm font-medium text-slate-500 mb-6 px-4">
              We experienced an unexpected interruption. Your session progress up to the last successful action is saved.
            </p>
            
            {this.state.errorMsg && (
              <div className="bg-red-50 text-red-800 text-[10px] font-mono p-4 rounded-xl mb-8 text-left overflow-hidden break-words">
                <p className="font-bold flex items-center gap-2 mb-1">
                  <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  Crash Log
                </p>
                {this.state.errorMsg}
              </div>
            )}
            
            <button
              onClick={this.handleRestart}
              className="px-8 py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 hover:-translate-y-0.5 transition-all shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] active:translate-y-0 active:shadow-none"
            >
              Restart Module
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
