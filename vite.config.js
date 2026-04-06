import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    }
  },
  server: {
    proxy: {
      // Proxy Anthropic API calls to avoid CORS in local dev
      '/anthropic-api': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anthropic-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward all headers from the original request
            const apiKey = req.headers['x-api-key']
            if (apiKey) proxyReq.setHeader('x-api-key', apiKey)
          })
        },
      },
    },
  },
})