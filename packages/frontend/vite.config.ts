import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: env.VITE_APP_NAME || 'SpecGen AI',
          short_name: 'SpecGen AI',
          description: 'AI-powered specification and integration plan generator',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
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
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          // Fix service worker caching issues - disable API caching completely
          navigateFallback: null,
          runtimeCaching: [
            // Only cache static assets, never cache API responses
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            }
            // Removed API caching patterns that were causing Cache.put() errors
          ],
          // Exclude API routes from caching to prevent issues
          navigateFallbackDenylist: [/^\/api/, /^\/jobs/, /^\/auth/, /^\/users/, /^\/prompts/],
          // Skip waiting for better user experience
          skipWaiting: true,
          clientsClaim: true
        }
      })
    ],
    define: {
      global: 'globalThis',
      'process.env': {},
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/auth': {
          target: env.VITE_API_ENDPOINT || 'https://s1mmzhde8j.execute-api.ap-south-1.amazonaws.com/Prod',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/jobs': {
          target: env.VITE_API_ENDPOINT || 'https://s1mmzhde8j.execute-api.ap-south-1.amazonaws.com/Prod',
          changeOrigin: true,
          secure: false,
        },
        '/prompts': {
          target: env.VITE_API_ENDPOINT || 'https://s1mmzhde8j.execute-api.ap-south-1.amazonaws.com/Prod',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['lucide-react'],
            utils: ['axios', '@tanstack/react-query', 'zustand']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom']
    }
  }
})