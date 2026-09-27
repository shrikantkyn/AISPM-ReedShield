import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function devTokenPlugin() {
  return {
    name: 'dev-token',
    configureServer(server) {
      server.middlewares.use('/api/dev-token', (_req, res) => {
        const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
        const header  = enc({ alg: 'none', typ: 'JWT' })
        const payload = enc({ sub: 'dev_user', roles: ['admin', 'spm:admin', 'spm:auditor'], groups: [], exp: Math.floor(Date.now() / 1000) + 86400 })
        const token   = `${header}.${payload}.fakesig`
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ token, expires_in: 86400 }))
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  // The dev-token endpoint exists only for the Vite dev server; it never ships.
  plugins: command === 'serve' ? [react(), devTokenPlugin()] : [react()],
  build: {
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20000,
          groups: [
            { name: 'vendor-icons', test: /node_modules[\/]lucide-react[\/]/ },
            { name: 'vendor-react', test: /node_modules[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/ },
            { name: 'vendor-markdown', test: /node_modules[\/](react-markdown|remark|micromark|mdast|unist|hast|vfile|unified|bail|trough|zwitch|property-information|space-separated-tokens|comma-separated-tokens|devlop|decode-named-character-reference|character-entities|ccount|longest-streak|markdown-table|trim-lines|escape-string-regexp|html-url-attributes|is-plain-obj|estree-util|style-to)/ },
          ],
        },
      },
    },
  },
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  './src/setupTests.js',
  },
  server: {
    host: true,
    port: 3005,
    allowedHosts: true,
    proxy: {
      // SSE streaming route — must come before the generic /api catch-all
      '/api/chat/stream': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['x-accel-buffering'] = 'no'
            proxyRes.headers['cache-control'] = 'no-cache'
          })
        },
      },
      // Orchestrator service — must come before the generic /api catch-all.
      // No rewrite: orchestrator mounts all routes under /api/v1/...
      '/api/v1': {
        target: 'http://localhost:8094',
        changeOrigin: true,
      },
      // SPM API (AI Security Posture Management) — model registry, compliance,
      // audit export. Mounted at /api/spm and stripped before forwarding.
      '/api/spm': {
        target: 'http://localhost:8092',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/spm/, ''),
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: { port: 3001 },
}))
