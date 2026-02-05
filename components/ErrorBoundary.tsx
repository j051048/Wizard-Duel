import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallbackUI(props: { error: Error | null; onReset: () => void }) {
  const handleReload = () => window.location.reload();
  
  const handleReset = () => {
    localStorage.removeItem('wizard_duel_save');
    window.location.reload();
  };

  const handleCopyError = () => {
    if (props.error) {
      navigator.clipboard.writeText(props.error.toString() + '\\n' + props.error.stack);
      alert('错误日志已复制到剪贴板');
    }
  };

  return (
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
          onClick={handleReload}
          className="px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
        >
          刷新页面
        </button>
        <button 
          onClick={handleReset}
          className="px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-900/20"
        >
          重置状态
        </button>
      </div>
      {props.error && (
        <div className="mt-8 max-w-full w-full max-w-lg">
           <div className="flex justify-end mb-1">
              <button onClick={handleCopyError} className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                 📋 复制日志
              </button>
           </div>
           <pre className="p-4 bg-black/50 rounded text-xs text-left text-red-400 overflow-auto max-h-48 opacity-80 border border-red-900/30 whitespace-pre-wrap break-words">
             {props.error.toString()}
           </pre>
        </div>
      )}
    </div>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public readonly props: Readonly<Props>; // Fix TS error

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallbackUI 
          error={this.state.error} 
          onReset={this.props.onReset || (() => {})} 
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;