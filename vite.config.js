import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'offline.html'],
      manifest: {
        name: 'UVERworld Setlist Archive',
        short_name: 'UVER Setlist',
        description: 'UVERworldのライブセットリストを記録・閲覧できるアプリ',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        id: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'UVERworld Setlist Archive'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'UVERworld Setlist Archive'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          // 認証系API - キャッシュしない
          {
            urlPattern: /^\/api\/(auth|users\/me)/,
            handler: 'NetworkOnly'
          },
          // 曲の統計・マイページ系 - キャッシュ優先で裏で更新
          {
            urlPattern: /^\/api\/songs\/.*\/stats/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'stats-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 12 // 12 hours
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ライブ一覧・曲一覧 - ネットワーク優先（最新データ重要）
          {
            urlPattern: /^\/api\/(lives|songs)(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'list-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ライブ詳細 - ネットワーク優先
          {
            urlPattern: /^\/api\/lives\/\d+$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'detail-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // その他のAPI - ネットワーク優先
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-other-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 6 // 6 hours
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // 画像 - キャッシュ優先
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  define: {
    // 環境変数をクライアント側に公開
    'import.meta.env.VITE_APP_ENV': JSON.stringify(process.env.NODE_ENV || process.env.VITE_APP_ENV || 'development'),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000')
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
