import {existsSync} from 'node:fs';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {expect, test} from '@playwright/test';
import {spawn, type ChildProcess} from 'node:child_process';

// Packs the library, installs it into a fresh Vite app the way another repository
// would (with Astryx as the app's own dependency), then type-checks, builds and
// exercises that app in a browser.

const root = resolve(import.meta.dirname, '..');
const PORT = 5199;
let app: string;
let server: ChildProcess | undefined;

function run(command: string[], cwd = root) {
  return new Promise<void>((resolveRun, reject) => {
    const child = spawn(command[0], command.slice(1), {cwd, stdio: ['ignore', 'pipe', 'pipe']});
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolveRun() : reject(new Error(`${command.join(' ')} failed:\n${output}`)));
  });
}

const CONSUMER = `
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import {Button} from '@astryxdesign/core/Button';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import hr from '@da-facility/ui/locales/hr.json';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {LoginSplit, ProjectSelector, SidebarLayout, Toaster, toast, UserMenu, type MobileNavigationSide} from '@da-facility/ui';

function App() {
  const [side, setSide] = useState<MobileNavigationSide>('right');
  const [project, setProject] = useState('a');
  const [signedIn, setSignedIn] = useState(false);
  if (location.pathname === '/hr') {
    return <InternationalizationProvider locale="hr" messages={{hr}}>
      <LoginSplit brand="Consumer app" artwork={<div>Artwork</div>} onSubmit={() => {}} />
    </InternationalizationProvider>;
  }
  if (location.pathname === '/login') {
    return <>
      <LoginSplit
        brand="Consumer app"
        artwork={<div>Artwork</div>}
        onSubmit={async ({password}) => {
          if (password !== 'correct') throw new Error('Try another password');
          setSignedIn(true);
        }}
      />
      {signedIn && <p role="status">Authenticated</p>}
    </>;
  }
  return <SidebarLayout
    title="Consumer app"
    navigation={<a href="/login">Sign in</a>}
    navigationHeader={<ProjectSelector projects={[{id: 'a', name: 'Project A'}, {id: 'b', name: 'Project B'}]} value={project} onChange={setProject} />}
    navigationFooter={<UserMenu user={{name: 'Taylor'}} items={[{label: 'Profile', onClick: () => {}}]} isFullWidth placement="above" />}
    mobileNavigationSide={side}
    onMobileNavigationSideChange={setSide}
    headerActions={<span>{project === 'a' ? 'Project A' : 'Project B'}</span>}>
    <h1>Projects</h1>
    <Button label="App's own Astryx button" variant="primary" />
    <Button label="Show a toast" onClick={event => toast.success('Saved from the app', {from: event.currentTarget})} />
    <Toaster />
    <div style={{height: 3000}}>Long content</div>
  </SidebarLayout>;
}

createRoot(document.getElementById('root')!).render(<Theme theme={neutralTheme} mode="light"><App /></Theme>);
`;

test.describe.configure({mode: 'serial', timeout: 60_000});

test.beforeAll(async () => {
  test.setTimeout(300_000);
  app = await mkdtemp(join(tmpdir(), 'da-ui-consumer-'));
  const tarball = join(app, 'ui.tgz');
  await run(['bun', 'run', 'build']);
  await run(['bun', 'pm', 'pack', '--filename', tarball]);

  const {devDependencies} = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const version = (name: string) => devDependencies[name];
  await writeFile(join(app, 'package.json'), JSON.stringify({
    type: 'module',
    dependencies: {
      '@da-facility/ui': `file:${tarball}`,
      '@astryxdesign/core': version('@astryxdesign/core'),
      '@astryxdesign/theme-neutral': version('@astryxdesign/theme-neutral'),
      '@stylexjs/stylex': version('@stylexjs/stylex'),
      react: version('react'),
      'react-dom': version('react-dom'),
    },
    devDependencies: {
      vite: version('vite'),
      typescript: version('typescript'),
      '@types/react': version('@types/react'),
      '@types/react-dom': version('@types/react-dom'),
    },
  }));
  await writeFile(join(app, 'index.html'), '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
  await writeFile(join(app, 'tsconfig.json'), JSON.stringify({compilerOptions: {target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, resolveJsonModule: true, lib: ['ES2022', 'DOM']}, include: ['main.tsx']}));
  await writeFile(join(app, 'main.tsx'), CONSUMER);

  await run(['bun', 'install'], app);
  await run(['bunx', 'tsc'], app);
  await run(['bunx', 'vite', 'build'], app);
  server = spawn('bunx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {cwd: app, stdio: 'ignore'});
  await expect.poll(() => fetch(`http://127.0.0.1:${PORT}`).then(response => response.ok, () => false), {timeout: 30_000}).toBe(true);
});

test.afterAll(async () => {
  server?.kill();
  if (app) await rm(app, {recursive: true, force: true});
});

test('the package ships only its own code and shares the app’s Astryx', async () => {
  const installed = join(app, 'node_modules/@da-facility/ui');
  const code = await readFile(join(installed, 'dist/index.js'), 'utf8');
  // The package's own code is about 56 KB unminified; a bundled Astryx would add
  // far more, and the imports below check it stays external.
  expect(code.length, 'Astryx must not be bundled').toBeLessThan(100_000);
  expect(code).toMatch(/from "@astryxdesign\/core\/SideNav"/);
  expect(code, 'Sonner is a dependency, not bundled').toMatch(/from "sonner"/);
  expect(code).not.toMatch(/data-sonner-toaster/);
  expect(existsSync(join(installed, 'node_modules')), 'no nested dependency copies').toBe(false);
  expect(existsSync(join(installed, 'dist/index.d.ts'))).toBe(true);
});

for (const [name, viewport] of Object.entries({desktop: {width: 1920, height: 1080}, mobile: {width: 390, height: 844}})) {
  test(`${name}: layout, styles, navigation and sign-in work in the consuming app`, async ({browser}) => {
    const page = await browser.newPage({viewport, deviceScaleFactor: 1, hasTouch: name === 'mobile'});
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`http://127.0.0.1:${PORT}`);
    await expect(page.getByRole('heading', {name: 'Projects'})).toBeVisible();
    await expect(page.locator('.sidebar-layout__surface'), 'package CSS loads with the import').toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'contain');
    await expect(page.getByRole('button', {name: "App's own Astryx button"})).toHaveCSS('cursor', 'pointer');

    // Sonner comes with the package and is styled by its CSS.
    await page.getByRole('button', {name: 'Show a toast'}).click();
    const toastCard = page.locator('[data-sonner-toast]').filter({hasText: 'Saved from the app'});
    await expect(toastCard).toBeVisible();
    await expect(toastCard).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(toastCard).toHaveCSS('border-radius', '12px');
    await expect(toastCard).not.toHaveClass(/da-toast--arriving/);
    await expect(page.locator('.da-toast-stand-in')).toHaveCount(0);

    if (name === 'mobile') await page.getByRole('button', {name: 'Open navigation', exact: true}).click();
    await page.getByRole('button', {name: 'Account menu for Taylor'}).click();
    await page.getByRole('menuitem', {name: 'Profile'}).click();
    await expect(page.getByRole('menuitem', {name: 'Profile'})).toBeHidden();
    await page.getByRole('button', {name: 'Projects: Project A'}).click();
    await expect(page.getByRole('combobox', {name: 'Search projects'})).toBeFocused();
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', {name: 'Projects: Project B'})).toBeVisible();
    if (name === 'mobile') {
      await page.getByRole('switch', {name: 'Left-handed navigation'}).click();
      await page.getByRole('button', {name: 'Close menu'}).click();
      await expect(page.getByRole('dialog', {name: 'Navigation', exact: true})).toBeHidden();
      expect((await page.getByRole('button', {name: 'Open navigation', exact: true}).boundingBox())!.x).toBeLessThan(30);
    }

    await page.goto(`http://127.0.0.1:${PORT}/login`);
    await page.getByLabel('Email', {exact: true}).fill('taylor@example.com');
    await page.getByLabel('Password', {exact: true}).fill('wrong');
    await page.getByRole('button', {name: 'Login', exact: true}).click();
    await expect(page.getByRole('alert').filter({hasText: 'Try another password'})).toBeVisible();
    await page.getByLabel('Password', {exact: true}).fill('correct');
    await page.getByRole('button', {name: 'Login', exact: true}).click();
    await expect(page.getByRole('status').filter({hasText: 'Authenticated'})).toBeVisible();

    // Translations ship with the package and plug into Astryx's provider.
    await page.goto(`http://127.0.0.1:${PORT}/hr`);
    await expect(page.getByRole('heading', {name: 'Dobro došli natrag'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Prijava', exact: true})).toBeVisible();
    expect(errors).toEqual([]);
    await page.close();
  });
}
