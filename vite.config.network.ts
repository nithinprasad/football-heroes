import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Alternative Vite config for network/WSL/Docker issues
// To use: mv vite.config.ts vite.config.ts.backup && mv vite.config.network.ts vite.config.ts

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    strictPort: false,
    watch: {
      usePolling: true, // For WSL/Docker
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
  },
})
