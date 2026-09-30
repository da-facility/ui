import {fileURLToPath} from 'node:url';
import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {astryxStylex} from '@astryxdesign/build/vite';

// The catalogue: a local app that renders every example against the library
// source. Examples import `@da-facility/ui` exactly as a consuming app would.
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: 'catalogue',
    envDir: '..',
    plugins: [...astryxStylex(), react()],
    resolve: {
      alias: {'@da-facility/ui': fileURLToPath(new URL('./src/index.ts', import.meta.url))},
    },
    build: {outDir: '../dist-catalogue', emptyOutDir: true},
    server: {
      // Comma-separated hosts for previewing on other devices, set in .env.local.
      allowedHosts: env.CATALOGUE_ALLOWED_HOSTS?.split(',').map(host => host.trim()),
    },
  };
});
