import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static SPA. `base` can be overridden for GitHub Pages project sites
// (e.g. BASE_PATH=/cve-mapping/ npm run build).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
