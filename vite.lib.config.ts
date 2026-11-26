import {isAbsolute} from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Builds the published package. React and Astryx are peer dependencies and
// Sonner is a dependency, so every bare import stays external and consumers
// share one copy of each. Each module is a file of its own, so an app takes
// only what it imports (the sign-in page doesn't load the media viewer).
export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
    lib: {entry: 'src/index.ts', formats: ['es'], fileName: 'index', cssFileName: 'style'},
    rolldownOptions: {
      external: id => !id.startsWith('.') && !isAbsolute(id),
      output: {
        // One file per source module (dist/components/…/X.js), the entry
        // re-exporting them: an app's bundler takes only the components it
        // imports (`sideEffects` in package.json says only the CSS has any).
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        // React Server Components treat every module as client code; the
        // styles load with the entry, once.
        banner: chunk => (chunk.isEntry ? `'use client';\nimport './style.css';` : `'use client';`),
      },
    },
  },
});
