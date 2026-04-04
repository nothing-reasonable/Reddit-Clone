import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Mirror Docker nginx routing during local Vite development.
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/subreddits': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/posts': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      '/api/messages': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/api/modmail': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/api/moderation': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
      '/api/v1/r': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
      '^/api/r/[^/]+/(modqueue|mod-actions|automod)': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
      '/api/r': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
