import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        tailwindcss(),
        react(),
        // [Phase F-2] Brotli + Gzip 压缩
        viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
        viteCompression({ algorithm: 'gzip' }),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.png'],
          manifest: {
            name: 'Wizard Duel: Arcane Bet',
            short_name: 'WizardDuel',
            description: '元素魔法卡牌对战游戏 — 收集火冰雷藤岩五大元素，实时 PvP 对战，赢取链上奖励',
            theme_color: '#7c3aed',
            background_color: '#0f172a',
            display: 'standalone',
            orientation: 'portrait',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            skipWaiting: true,
            clientsClaim: true,
            cleanupOutdatedCaches: true,
            maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MiB
            globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'], // 移除了 mp3，不在构建时预缓存
            navigateFallback: 'index.html',
            runtimeCaching: [
              {
                // 同源 JS/CSS chunks: 网络优先，避免部署后旧 chunk hash 404
                urlPattern: ({ url }) => url.origin === self.location.origin &&
                  (/\/assets\/[^/]+\.(js|css)$/.test(url.pathname)),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'asset-chunks-cache',
                  expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
                },
              },
              {
                // 运行时缓存音频文件
                urlPattern: ({ request, url }) => request.destination === 'audio' || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.webm'),
                handler: 'CacheFirst',
                options: {
                  cacheName: 'audio-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                  },
                  rangeRequests: true, // 支持音频拖动
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/api\.hodlai\.fun\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24
                  }
                }
              }
            ]
          }
        })
      ],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (id.includes('node_modules')) {
                // React + React DOM — single chunk, never duplicated
                if (id.includes('/react-dom/') || id.includes('/react/') && !id.includes('/react-dom/')) {
                  return 'vendor-react';
                }
                if (id.includes('@tanstack/react-virtual')) {
                  return 'vendor-react-virtual';
                }
                if (id.includes('wagmi') || id.includes('/viem/') || id.includes('@tanstack/react-query')) {
                  return 'vendor-web3';
                }
                if (id.includes('framer-motion')) {
                  return 'vendor-animation';
                }
                if (id.includes('@supabase')) {
                  return 'vendor-supabase';
                }
                if (id.includes('@sentry')) {
                  return 'vendor-sentry';
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-lucide';
                }
              }
              // Game logic services
              if (id.includes('/services/gameLogic') ||
                  id.includes('/services/ai') ||
                  id.includes('/services/combat/') ||
                  id.includes('/services/mechanics') ||
                  id.includes('/services/sequence')) {
                return 'vendor-game-logic';
              }
            },
          },
        },
        chunkSizeWarningLimit: 400,
      },
      esbuild: {
        legalComments: 'none',
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      }
    };
});
