import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';

// [Phase F-1] Sentry 错误监控（仅当 VITE_SENTRY_DSN 存在时启用）
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
  });
}

// X Layer Mainnet Chain Definition
const xLayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer' },
  },
});

import ErrorBoundary from './components/ErrorBoundary';

import './index.css';

// [Phase 4] Chunk 加载失败自动恢复：部署后旧 hash chunk 404 → 刷新获取新 SW
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[App] Chunk load failed, reloading:', event.payload);
  event.preventDefault();
  window.location.reload();
});

// [Task 22] 全局未捕获错误监听 → Sentry 上报
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  }
});

// Wagmi Configuration
export const config = createConfig({
  chains: [mainnet, sepolia, xLayer],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [xLayer.id]: http(),
  },
});

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div style={{padding: 40, textAlign: 'center', color: '#fff', background: '#0f172a'}}><h1>出现了一个错误</h1><p>请刷新页面重试</p></div>}>
      <ErrorBoundary>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
              <App />
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
