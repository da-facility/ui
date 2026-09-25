import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {chromium} from 'playwright';

const root = resolve(import.meta.dir, '..');
const directory = await mkdtemp(join(tmpdir(), 'da-facility-consumer-'));
let server: ReturnType<typeof Bun.spawn> | undefined;
const browser = await chromium.launch();
async function run(args: string[], cwd = root) {
  const process = Bun.spawn(args, {cwd, stdout: 'pipe', stderr: 'pipe'});
  const [code, out, error] = await Promise.all([process.exited, new Response(process.stdout).text(), new Response(process.stderr).text()]);
  if (code) throw new Error(`${args.join(' ')}\n${out}\n${error}`);
}
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
try {
  let source = process.env.UI_TEST_PACKAGE;
  if (!source) {
    await run(['bun', 'run', 'build']);
    const tarball = join(directory, 'ui.tgz');
    await run(['bun', 'pm', 'pack', '--ignore-scripts', '--filename', tarball]);
    source = `file:${tarball}`;
  }
  await Bun.write(join(directory, 'package.json'), JSON.stringify({type: 'module', trustedDependencies: ['@da-facility/ui'], dependencies: {'@da-facility/ui': source, react: '^19.1.1', 'react-dom': '^19.1.1'}, devDependencies: {vite: '^8.1.3', typescript: '^5.9.2', '@types/react': '^19.1.9', '@types/react-dom': '^19.1.7'}}));
  await Bun.write(join(directory, 'index.html'), '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
  await Bun.write(join(directory, 'tsconfig.json'), JSON.stringify({compilerOptions: {target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true, lib: ['ES2022', 'DOM']}, include: ['main.tsx']}));
  await Bun.write(join(directory, 'main.tsx'), `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {UIProvider, SidebarLayout, LoginSplit, UserMenu, type MobileNavigationSide} from '@da-facility/ui';
function App() {
  const [side, setSide] = useState<MobileNavigationSide>('right');
  const [signedIn, setSignedIn] = useState(false);
  return <UIProvider>{location.pathname === '/login' ? <LoginSplit brand="Consumer app" artwork={<div>Artwork</div>}
    onSubmit={async ({password}) => { if (password !== 'correct') throw new Error('Try another password'); setSignedIn(true); }} /> :
    <SidebarLayout title="Consumer app" navigation={<a href="/login">Sign in</a>} mobileNavigationSide={side} onMobileNavigationSideChange={setSide}
      headerActions={<UserMenu user={{name:'Taylor'}} items={[{label:'Profile', onClick:()=>{}}]} />}>
      <h1>Projects</h1><div style={{height:3000}}>Long content</div>
    </SidebarLayout>}{signedIn && <p role="status">Authenticated</p>}</UIProvider>;
}
createRoot(document.getElementById('root')!).render(<App />);
`);
  await run(process.env.UI_TEST_PACKAGE ? ['bun', 'install'] : ['bun', 'install', '--ignore-scripts'], directory);
  await run(['bunx', 'tsc', '--noEmit'], directory);
  await run(['bunx', 'vite', 'build'], directory);
  server = Bun.spawn(['bunx', 'vite', 'preview', '--host', '127.0.0.1', '--port', '5199', '--strictPort'], {cwd: directory, stdout: 'ignore', stderr: 'pipe'});
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await fetch('http://127.0.0.1:5199').then(r => r.ok).catch(() => false)) break;
    await Bun.sleep(100);
  }
  for (const [name, viewport] of Object.entries({desktop: {width:1920,height:1080}, mobile: {width:390,height:844}})) {
    const page = await browser.newPage({viewport, deviceScaleFactor:1});
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5199');
    await page.getByRole('heading', {name:'Projects'}).waitFor();
    assert(await page.locator('.sidebar-layout__surface').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)'), 'Package CSS must load automatically');
    await page.getByRole('button', {name:'Account menu for Taylor'}).click();
    await page.getByRole('menuitem', {name:'Profile'}).waitFor();
    await page.keyboard.press('Escape');
    if (name === 'mobile') {
      await page.getByRole('button', {name:'Open navigation',exact:true}).click();
      await page.getByRole('switch', {name:'Left-handed navigation'}).click();
      await page.getByRole('button', {name:'Close menu'}).click();
      await page.getByRole('dialog', {name:'Navigation',exact:true}).waitFor({state:'hidden'});
    }
    await page.screenshot({path:join(root, `artifacts/package-layout-${name}.png`)});
    await page.goto('http://127.0.0.1:5199/login');
    await page.getByLabel('Email', {exact:true}).fill('taylor@example.com');
    await page.getByLabel('Password', {exact:true}).fill('wrong');
    await page.getByRole('button',{name:'Login',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Try another password'}).waitFor();
    await page.getByLabel('Password',{exact:true}).fill('correct');
    await page.getByRole('button',{name:'Login',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Authenticated'}).waitFor();
    await page.screenshot({path:join(root, `artifacts/package-login-${name}.png`)});
    assert(errors.length === 0, errors.join('\n'));
    await page.close();
  }
  console.log('Package: standalone Vite build, declarations, automatic CSS, mobile navigation and real login callbacks passed.');
} finally {
  await browser.close();
  server?.kill();
  if (server) await server.exited;
  await rm(directory, {recursive:true,force:true});
}
