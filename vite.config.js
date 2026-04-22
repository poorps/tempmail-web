import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/guerrilla': {
        target: 'https://api.guerrillamail.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/guerrilla/, ''),
      }
    }
  }
})
