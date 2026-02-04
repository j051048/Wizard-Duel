import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('wizard_duel_save');
    const { onReset } = this.props;
    if (onReset) onReset();
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return fallback || (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="w-16 h-16 mb-4 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">魔法波动异常</h2>
          <p className="text-gray-400 mb-6 max-w-md">
            检测到不稳定的魔力流导致连接中断。请尝试重置游戏状态。
          </p>
          <div className="flex gap-4">
             <button 
               onClick={() => window.location.reload()}
               className="px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
             >
               刷新页面
             </button>
             <button 
               onClick={this.handleReset}
               className="px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-900/20"
             >
               重置状态
             </button>
          </div>
          {error && (
             <pre className="mt-8 p-4 bg-black/50 rounded text-xs text-left text-red-400 overflow-auto max-w-full max-h-32 opacity-50">
                {error.toString()}
             </pre>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
