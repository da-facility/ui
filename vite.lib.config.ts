import {isAbsolute} from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Builds the published package. React and Astryx are peer dependencies and
// Sonner is a dependency, so every bare import stays external and consumers
// share one copy of each.
export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
    lib: {entry: 'src/index.ts', formats: ['es'], fileName: 'index', cssFileName: 'style'},
    rolldownOptions: {
      external: id => !id.startsWith('.') && !isAbsolute(id),
      // Styles load with the import, and React Server Components treat the
      // package as client code.
      output: {banner: `'use client';\nimport './style.css';`},
    },
  },
});
