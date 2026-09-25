import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {astryxStylex} from '@astryxdesign/build/vite';

export default defineConfig({
  plugins: [...astryxStylex(), react()],
  build: {outDir: 'dist-catalogue'},
  server: {
    allowedHosts: ['host.docker.internal', 'mitsuha.tail7c7833.ts.net'],
  },
});
