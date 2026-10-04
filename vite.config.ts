/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves the site under the repo name. Change to '/' if moving
  // to a root-domain host (e.g. Cloudflare Pages with a custom domain).
  base: '/gnucash-webapp/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
