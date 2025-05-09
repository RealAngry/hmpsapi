// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: ['*'], // ✅ Allow all hosts
  },
})
