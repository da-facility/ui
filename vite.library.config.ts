import {readFileSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {defineConfig, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {astryxStylex} from '@astryxdesign/build/vite';

function packageAssets(): Plugin {
  return {
    name: 'package-assets',
    generateBundle(_, bundle) {
      // Keep CSS automatic for consumers while using an ordinary extractable file.
      const entry = bundle['index.js'];
      if (entry?.type === 'chunk') entry.code = `"use client";\nimport './style.css';\n${entry.code}`;
      const notices = new Map<string, string>();
      for (const id of this.getModuleIds()) {
        if (!id.includes('/node_modules/')) continue;
        let directory = dirname(id.split('?')[0]);
        while (directory.includes('/node_modules/')) {
          if (existsSync(join(directory, 'package.json'))) {
            const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
            if (pkg.name && !notices.has(pkg.name)) {
              const license = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md'].find(file => existsSync(join(directory, file)));
              if (license) notices.set(pkg.name, `${pkg.name} ${pkg.version}\n${readFileSync(join(directory, license), 'utf8')}`);
            }
            if (pkg.name) break;
          }
          directory = dirname(directory);
        }
      }
      this.emitFile({type: 'asset', fileName: 'THIRD_PARTY_LICENSES.txt', source: readFileSync('LICENSE.third-party', 'utf8') + '\n\n' + [...notices.values()].join('\n\n---\n\n')});
    },
  };
}

export default defineConfig({
  plugins: [...astryxStylex({dev: false}), react(), packageAssets()],
  build: {
    lib: {entry: 'src/index.ts', formats: ['es'], fileName: 'index', cssFileName: 'style'},
    rolldownOptions: {external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/]},
  },
});
