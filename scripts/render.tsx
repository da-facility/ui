import {mkdir, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawn, type ChildProcess} from 'node:child_process';
import {resolve} from 'node:path';
import {chromium, type Browser} from 'playwright';
import {catalogueMetadata} from '../catalogue/metadata';

type Format = 'html' | 'png' | 'jpeg';
type ViewportName = 'desktop' | 'mobile';

function readOption(name: string, fallback: string) {
  const flagIndex = process.argv.indexOf(`--${name}`);
  return flagIndex >= 0 ? (process.argv[flagIndex + 1] ?? fallback) : fallback;
}

const templateId = readOption('template', 'login-split');
const format = readOption('format', 'png') as Format;
const viewportOption = readOption('viewport', 'all') as ViewportName | 'all';
const outputOption = readOption('output', '');
const item = catalogueMetadata.find((entry) => entry.id === templateId);

if (!item) {
  throw new Error(`Unknown template "${templateId}".`);
}

if (!['html', 'png', 'jpeg'].includes(format)) {
  throw new Error(`Unsupported format "${format}". Use html, png, or jpeg.`);
}

if (!['all', 'desktop', 'mobile'].includes(viewportOption)) {
  throw new Error(`Unsupported viewport "${viewportOption}". Use all, desktop, or mobile.`);
}

const projectRoot = resolve(import.meta.dir, '..');
const artifactsDirectory = resolve(projectRoot, 'artifacts');
await mkdir(artifactsDirectory, {recursive: true});
const htmlPath = resolve(artifactsDirectory, `${templateId}.html`);
const viewportNames: ViewportName[] = viewportOption === 'all' ? ['desktop', 'mobile'] : [viewportOption];

function imageOutputPath(viewportName: ViewportName) {
  if (!outputOption) return resolve(artifactsDirectory, `${templateId}-${viewportName}.${format}`);
  const requestedPath = resolve(projectRoot, outputOption);
  if (viewportNames.length === 1) return requestedPath;
  const extension = `.${format}`;
  const base = requestedPath.endsWith(extension) ? requestedPath.slice(0, -extension.length) : requestedPath;
  return `${base}-${viewportName}${extension}`;
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({headless: true});
  } catch (error) {
    try {
      return await chromium.launch({channel: 'chrome', headless: true});
    } catch {
      throw new Error(
        `Could not start Chromium. Run "bun run browser:install" once.\n${String(error)}`,
      );
    }
  }
}

// Vite's CLI runs its compiler in Node, matching `bun run build`. The outer
// export script stays in Bun; importing raw StyleX TSX here skips compilation.
const buildDirectory = await mkdtemp(resolve(tmpdir(), 'df-ui-render-'));
let previewProcess: ChildProcess | undefined;
let browser: Browser | undefined;
try {
  await new Promise<void>((resolveBuild, reject) => {
    const child = spawn('bun', ['run', 'build:catalogue', '--outDir', buildDirectory], {cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe']});
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolveBuild() : reject(new Error(output)));
  });
  const previewUrl = await new Promise<string>((resolvePreview, reject) => {
    previewProcess = spawn('bun', ['run', 'preview', '--host', '127.0.0.1', '--port', '0', '--outDir', buildDirectory], {cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe']});
    const timeout = setTimeout(() => reject(new Error('Export preview did not start.')), 30000);
    let output = '';
    previewProcess.stdout?.on('data', (chunk) => {
      output += chunk;
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
      if (url) { clearTimeout(timeout); resolvePreview(url); }
    });
    previewProcess.stderr?.on('data', (chunk) => { output += chunk; });
    previewProcess.on('error', (error) => { clearTimeout(timeout); reject(error); });
    previewProcess.on('exit', () => { clearTimeout(timeout); reject(new Error(output)); });
  });
  browser = await launchBrowser();
  for (const viewportName of format === 'html' ? [viewportNames[0]] : viewportNames) {
    const viewport = item.viewports[viewportName];
    const page = await browser.newPage({
      viewport: {width: viewport.width, height: viewport.height},
      deviceScaleFactor: viewport.deviceScaleFactor,
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${previewUrl}render/${encodeURIComponent(templateId)}`, {waitUntil: 'networkidle'});
    await page.locator('#root > *').first().waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})));
    });
    if (errors.length) throw new Error(errors.join('\n'));
    const html = await page.evaluate(async (title) => {
      const styles = await Promise.all(Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), async (link) => {
        const response = await fetch(link.href);
        if (!response.ok) throw new Error(`Could not export stylesheet: ${link.href}`);
        return response.text();
      }));
      const snapshot = document.documentElement.cloneNode(true) as HTMLElement;
      snapshot.querySelectorAll('script, link[rel="modulepreload"], link[rel="stylesheet"]').forEach((element) => element.remove());
      const style = document.createElement('style');
      style.textContent = styles.join('\n');
      snapshot.querySelector('head')?.append(style);
      const titleElement = snapshot.querySelector('title');
      if (titleElement) titleElement.textContent = title;
      return '<!doctype html>\n' + snapshot.outerHTML;
    }, item.name);
    if (viewportName === viewportNames[0]) await Bun.write(htmlPath, html);
    if (format === 'html') {
      const outputPath = outputOption ? resolve(projectRoot, outputOption) : htmlPath;
      await Bun.write(outputPath, html);
      console.log(outputPath);
    } else {
      const outputPath = imageOutputPath(viewportName);
      await page.screenshot({path: outputPath, type: format, fullPage: true, ...(format === 'jpeg' ? {quality: 92} : {})});
      console.log(outputPath);
    }
    await page.close();
  }
} finally {
  await browser?.close();
  if (previewProcess && previewProcess.exitCode === null) {
    await new Promise<void>((resolveExit) => {
      previewProcess!.once('exit', () => resolveExit());
      previewProcess!.kill('SIGTERM');
    });
  }
  await rm(buildDirectory, {recursive: true, force: true});
}
