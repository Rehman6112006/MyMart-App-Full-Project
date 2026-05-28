import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: 5174,
    fs: {
      allow: ['..']
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          '@btn-height-default': '40px',
        },
      },
    },
  },
})
