
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends (React.Component as any)<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.toString().includes('Failed to fetch dynamically imported module') || 
                           this.state.error?.toString().includes('Importing a module script failed');

      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-mono">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
            {isChunkError && (
               <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-blue-900/40 z-0 pointer-events-none" />
            )}
            
            <div className="relative z-10">
                <h1 className={`text-3xl font-bold mb-4 ${isChunkError ? 'text-purple-400 font-wizard' : 'text-red-500'}`}>
                  {isChunkError ? '🧙‍♂️ 魔法波动检测 (New Version)' : 'Something went wrong'}
                </h1>
                
                <div className="bg-black/50 p-4 rounded-lg overflow-auto max-h-96 mb-6 border border-white/10">
                  {isChunkError ? (
                    <div className="space-y-2">
                       <p className="text-xl text-white font-bold">检测到新的魔法能量！</p>
                       <p className="text-gray-300">
                         巫师塔发布了新的法术更新。您的客户端版本已过期，需要刷新以重新连接到魔网。
                       </p>
                       <p className="text-xs text-gray-500 mt-4">
                         Error: Version Mismatch (Chunk Load Failed)
                       </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-red-400 font-bold mb-2">{this.state.error?.toString()}</p>
                      <pre className="text-xs text-gray-500 whitespace-pre-wrap">
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    className={`
                      font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:scale-105 active:scale-95
                      ${isChunkError ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                    `}
                    onClick={() => {
                        // 清除缓存并刷新
                        if (caches) {
                            caches.keys().then((names) => {
                                for (let name of names) caches.delete(name);
                            });
                        }
                        window.location.reload();
                    }}
                  >
                    {isChunkError ? '✨ 更新魔法 (Reload)' : 'Reload Page'}
                  </button>
                  
                  {!isChunkError && (
                    <button 
                       className="px-6 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors text-gray-400 text-sm"
                       onClick={() => window.location.reload()}
                    >
                       Reload
                    </button>
                  )}
                </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
