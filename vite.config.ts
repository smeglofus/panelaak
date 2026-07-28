/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths: the same build works at the domain root (nginx in
  // Docker) and under a subpath (GitHub Pages at /panelaak/).
  base: './',
  plugins: [react()],
  // In dev, forward /api to the local leaderboard backend (npm run dev in
  // server/). In production nginx does the same proxy — the client always
  // calls relative /api paths.
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
