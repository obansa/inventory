import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base + hash routing lets the build be hosted from any sub-path
// (e.g. GitHub Pages) without extra configuration.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
});
