import {cp, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

// Build Git dependencies outside the consuming app so build tools and a second
// copy of React cannot leak into its dependency tree.
const root = resolve(import.meta.dir, '..');
const directory = await mkdtemp(join(tmpdir(), 'da-facility-build-'));
try {
  for (const file of ['package.json', 'bun.lock', 'tsconfig.json', 'tsconfig.build.json', 'vite.library.config.ts', 'LICENSE.third-party', 'src']) {
    await cp(join(root, file), join(directory, file), {recursive: true});
  }
  for (const command of [['bun', 'install', '--ignore-scripts'], ['bun', 'run', 'build']]) {
    const child = Bun.spawn(command, {cwd: directory, stdio: ['ignore', 'inherit', 'inherit']});
    if (await child.exited !== 0) throw new Error(`Package preparation failed: ${command.join(' ')}`);
  }
  await rm(join(root, 'dist'), {recursive: true, force: true});
  await cp(join(directory, 'dist'), join(root, 'dist'), {recursive: true});
} finally {
  await rm(directory, {recursive: true, force: true});
}
