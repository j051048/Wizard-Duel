import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const enablePrecompression = env.VITE_PRECOMPRESS === 'true';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        tailwindcss(),
        react(),
        // Optional static precompression; most hosts handle this at the edge.
        enablePrecompression && viteCompression({
          algorithm: 'gzip',
          threshold: 10 * 1024,
          filter: /\.(js|mjs|json|css|html|svg)$/i,
        }),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.png', 'mask-icon.svg'],
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
            maximumFileSizeToCacheInBytes: 1024 * 1024,
            globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest}'],
            globIgnores: ['**/*.map', '**/*.br', '**/*.gz'],
            navigateFallback: 'index.html',
            runtimeCaching: [
              {
                // Card art uses stable public URLs; prefer fresh network copies so updated art
                // is not locked behind an old runtime cache.
                urlPattern: ({ url }) => url.origin === self.location.origin &&
                  url.pathname.startsWith('/cards/'),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'card-art-cache',
                  networkTimeoutSeconds: 3,
                  expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 60 * 60 * 24 * 14
                  },
                  cacheableResponse: {
                    statuses: [200]
                  }
                }
              },
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
                urlPattern: ({ request, url }) => request.destination === 'image' ||
                  /\.(png|svg|webp|jpg|jpeg|gif)$/i.test(url.pathname),
                handler: 'CacheFirst',
                options: {
                  cacheName: 'image-cache',
                  expiration: {
                    maxEntries: 250,
                    maxAgeSeconds: 60 * 60 * 24 * 30
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
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
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
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
                if (id.includes('/react-dom/') || (id.includes('/react/') && !id.includes('/react-dom/'))) {
                  return 'vendor-react';
                }
                // @tanstack/react-virtual 仅 CardPool 使用，合并到主 chunk 减少请求
                // if (id.includes('@tanstack/react-virtual')) { return 'vendor-react-virtual'; }
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
