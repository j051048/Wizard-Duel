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
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'Wizard Duel: Arcane Bet',
            short_name: 'WizardDuel',
            description: '元素魔法对战游戏',
            theme_color: '#0f172a',
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
            maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MiB
            globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'], // 移除了 mp3，不在构建时预缓存
            runtimeCaching: [
              {
                // 运行时缓存音频文件
                urlPattern: ({ request, url }) => request.destination === 'audio' || url.pathname.endsWith('.mp3'),
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
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-web3': ['wagmi', 'viem', '@tanstack/react-query'],
              'vendor-animation': ['framer-motion'],
              'vendor-supabase': ['@supabase/supabase-js'],
            },
          },
        },
        chunkSizeWarningLimit: 800,
      },
      esbuild: {
        legalComments: 'none',
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      }
    };
});
