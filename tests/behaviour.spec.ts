import {readFileSync} from 'node:fs';
import {expect, test, type Locator, type Page} from '@playwright/test';
import {presetTweaks} from './helpers';

/**
 * Records how every catalogue page looks and reads, so a change can be checked
 * for anything that turned out different. Run `bun run behaviour:record`
 * before the change to save a baseline, and `bun run behaviour:compare` after
 * it: every state whose screenshot or accessibility tree changed fails, and
 * the report shows the expected, actual and difference images.
 *
 * Each state records a full-page screenshot and an ARIA snapshot (the roles,
 * names and text a screen reader gets). States cover every example and
 * sidebar page in light and dark, each example tweak switched from its
 * default, Croatian, and the interactive states: open menus, the phone
 * drawer, the chat, form errors, toasts and replaced toasts.
 *
 * Baselines are machine-specific (fonts render differently on each system),
 * so they live in artifacts/behaviour, which is not committed. Motion is
 * reduced, the clock fixed and the pointer parked so the same page records the
 * same way twice. The scripts serve a fresh production build on port 5180
 * rather than reusing the dev server, which reloads pages while it prepares
 * dependencies.
 */

type Tweak = {id: string; isOnByDefault: boolean};
type Example = {id: string; tweaks: Tweak[]};

/** Example ids and tweaks, read from the catalogue's registry. */
function catalogueExamples(): Example[] {
  const source = readFileSync(new URL('../catalogue/examples.ts', import.meta.url), 'utf8');
  const registry = source.slice(source.indexOf('export const examples'), source.indexOf('export const globalTweaks'));
  const examples: Example[] = [];
  for (const line of registry.split('\n')) {
    const example = /^ {4}id: '([^']+)'/.exec(line);
    if (example) examples.push({id: example[1], tweaks: []});
    const tweak = /^ {6}\{id: '([^']+)'.*?(default: true)?\},?$/.exec(line);
    if (tweak && examples.length) examples[examples.length - 1].tweaks.push({id: tweak[1], isOnByDefault: Boolean(tweak[2])});
  }
  return examples;
}

/** The sidebar example's page ids, read from its page registry. */
function sidebarPages() {
  const source = readFileSync(new URL('../catalogue/examples/sidebar/pages/index.ts', import.meta.url), 'utf8');
  return [...source.matchAll(/\{id: '([^']+)', label:/g)].map(match => match[1]);
}

const examples = catalogueExamples();
const themes = [['light', false], ['dark', true]] as const;

async function open(page: Page, path: string, example: string, tweaks: Record<string, boolean> = {}, global: Record<string, boolean> = {}) {
  await page.clock.setFixedTime(new Date('2026-10-01T09:30:00Z'));
  await presetTweaks(page, example, tweaks, global);
  await page.goto(`/render/${path}`, {waitUntil: 'networkidle'});
  await settle(page);
}

/**
 * Waits for fonts and images, then for every animation and transition to
 * finish (sheets sliding in, toasts fading in), so nothing is caught midway.
 * Endless animations, such as a spinner, are left running; the screenshot
 * stops those at their start.
 */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, image => image.decode().catch(() => {})));
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const isMoving = () => document.getAnimations().some(animation =>
      animation.playState === 'running' && animation.effect?.getComputedTiming().iterations !== Infinity);
    // Sheets, toasts and menus also move and fade from script, which doesn't
    // show up as an animation, so their boxes and opacities must hold still too.
    const overlays = () => [...document.querySelectorAll('[data-sonner-toast], [data-sonner-toast] > *, [role="dialog"], [role="menu"], [role="listbox"]')]
      .map(element => {
        const box = element.getBoundingClientRect();
        return `${box.x},${box.y},${box.width},${box.height},${getComputedStyle(element).opacity}`;
      })
      .join(';');
    const deadline = performance.now() + 4000;
    let stillFrames = 0;
    let last = '';
    while (stillFrames < 5 && performance.now() < deadline) {
      await frame();
      const now = overlays();
      stillFrames = isMoving() || now !== last ? 0 : stillFrames + 1;
      last = now;
    }
  });
}

/**
 * Records a state. Pages are captured whole; states with something pinned to
 * the viewport, such as toasts, sheets and menus, capture just the viewport,
 * because a full-page capture briefly resizes the window and those move.
 * `around` captures just the area around those elements instead, with room for
 * their shadows: for overlays whose resting place on screen can differ by a
 * pixel between runs while their content doesn't, or that sit outside their
 * container's box, as Sonner's toasts do.
 */
async function record(page: Page, name: string, {fullPage = true, around}: {fullPage?: boolean; around?: Locator} = {}) {
  // The pointer stays where the last click left it; park it, so whatever ends
  // up under it doesn't show a hover state in some runs and not others.
  await page.mouse.move(0, 0);
  await settle(page);
  if (around) {
    const boxes = await around.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON() as DOMRect));
    const margin = 24;
    const left = Math.floor(Math.min(...boxes.map(box => box.left)) - margin);
    const top = Math.floor(Math.min(...boxes.map(box => box.top)) - margin);
    const right = Math.ceil(Math.max(...boxes.map(box => box.right)) + margin);
    const bottom = Math.ceil(Math.max(...boxes.map(box => box.bottom)) + margin);
    const viewport = page.viewportSize()!;
    const clip = {x: Math.max(0, left), y: Math.max(0, top), width: Math.min(viewport.width, right) - Math.max(0, left), height: Math.min(viewport.height, bottom) - Math.max(0, top)};
    // Overlays such as Astryx's bottom sheet come to rest at a position that
    // varies by a fraction of a pixel between runs, which shifts their text's
    // antialiasing; allow for that, while the ARIA snapshot still checks text.
    await expect.soft(page, `${name}: looks the same`).toHaveScreenshot(`${name}.png`, {clip, maxDiffPixelRatio: 0.005});
  } else {
    await expect.soft(page, `${name}: looks the same`).toHaveScreenshot(`${name}.png`, {fullPage});
  }
  await expect.soft(page.locator('body'), `${name}: reads the same`).toMatchAriaSnapshot({name: `${name}.aria.yml`});
}

test.describe('every page', () => {
  for (const example of examples) {
    for (const [theme, darkMode] of themes) {
      test(`${example.id} ${theme}`, async ({page}) => {
        await open(page, example.id, example.id, {}, {darkMode});
        await record(page, `${example.id}--${theme}`);
      });
    }
  }
  for (const id of sidebarPages()) {
    for (const [theme, darkMode] of themes) {
      test(`sidebar/${id} ${theme}`, async ({page}) => {
        await open(page, `sidebar/${id}`, 'sidebar', {}, {darkMode});
        await record(page, `sidebar-${id}--${theme}`);
      });
    }
  }
});

test.describe('every tweak', () => {
  for (const example of examples) {
    for (const tweak of example.tweaks) {
      test(`${example.id} with ${tweak.id} ${tweak.isOnByDefault ? 'off' : 'on'}`, async ({page}) => {
        await open(page, example.id, example.id, {[tweak.id]: !tweak.isOnByDefault});
        await record(page, `${example.id}--${tweak.id}-${tweak.isOnByDefault ? 'off' : 'on'}`);
      });
    }
    test(`${example.id} in Croatian`, async ({page}) => {
      await open(page, example.id, example.id, {}, {croatian: true});
      await record(page, `${example.id}--croatian`);
    });
  }
});

test.describe('interactions', () => {
  for (const [theme, darkMode] of themes) {
    test(`user menu open ${theme}`, async ({page}) => {
      await open(page, 'user-menu', 'user-menu', {}, {darkMode});
      await page.getByRole('button', {name: 'Account menu for Alex Johnson'}).first().click();
      await expect(page.getByRole('menuitem', {name: 'Profile', exact: true})).toBeVisible();
      await record(page, `user-menu-open--${theme}`, {fullPage: false});
    });

    test(`project selector open and searched ${theme}`, async ({page}) => {
      await open(page, 'project-selector', 'project-selector', {}, {darkMode});
      await page.getByRole('button', {name: /^Projects:/}).first().click();
      await expect(page.getByRole('listbox', {name: 'Projects'})).toBeVisible();
      await record(page, `project-selector-open--${theme}`, {fullPage: false});
      await page.getByRole('combobox', {name: 'Search projects'}).fill('web');
      await record(page, `project-selector-searched--${theme}`, {fullPage: false});
    });

    test(`sidebar navigation drawer and chat ${theme}`, async ({page}, testInfo) => {
      await open(page, 'sidebar/profile', 'sidebar', {assistant: true}, {darkMode});
      if (testInfo.project.name.endsWith('mobile')) {
        await page.getByRole('button', {name: 'Open settings navigation', exact: true}).click();
        await expect(page.getByRole('dialog', {name: 'Settings navigation', exact: true})).toBeVisible();
        await record(page, `sidebar-drawer-open--${theme}`, {fullPage: false});
        await page.getByRole('button', {name: 'Close menu'}).click();
      }
      await page.getByRole('button', {name: 'Ask anything'}).click();
      await expect(page.getByRole('textbox', {name: 'Ask anything'})).toBeVisible();
      // On phones the chat is a bottom sheet whose resting height can round
      // either way, so the sheet itself is recorded rather than the screen.
      const sheet = testInfo.project.name.endsWith('mobile') ? page.locator('.assistant__sheet') : undefined;
      await record(page, `sidebar-chat-open--${theme}`, {fullPage: false, around: sheet});
    });

    test(`login error ${theme}`, async ({page}) => {
      await open(page, 'login-split', 'login-split', {}, {darkMode});
      await page.getByLabel('Email', {exact: true}).fill('taylor@example.com');
      await page.getByLabel('Password', {exact: true}).fill('wrong');
      await page.getByRole('button', {name: 'Login', exact: true}).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await record(page, `login-split-error--${theme}`, {fullPage: false});
    });

    test(`cycle buttons stepped ${theme}`, async ({page}) => {
      await open(page, 'cycle-button', 'cycle-button', {}, {darkMode});
      await page.getByRole('button', {name: 'Theme: System'}).first().click();
      await page.getByRole('radiogroup', {name: 'View'}).first().getByRole('radio', {name: 'Board'}).click();
      await record(page, `cycle-button-stepped--${theme}`, {fullPage: false});
    });

    test(`toasts ${theme}`, async ({page}) => {
      await open(page, 'toasts', 'toasts', {expand: true}, {darkMode});
      const group = page.locator('.toasts-example__group');
      // Toasts that stay long enough to record: one without a timer, one with ten seconds.
      for (const name of ['Persistent', 'Action and cancel']) {
        await group.getByRole('button', {name, exact: true}).click();
      }
      const question = page.locator('[data-sonner-toast]').filter({hasText: 'Delete 3 files?'});
      await expect(question).toBeVisible();
      await expect(page.locator('[data-sonner-toast]')).toHaveCount(2);
      const stack = page.locator('[data-sonner-toast]');
      await expectToastTextShown(page);
      await record(page, `toasts-shown--${theme}`, {around: stack});
      await question.getByRole('button', {name: 'Delete', exact: true}).click();
      await expect(page.locator('[data-sonner-toast]').filter({hasText: '3 files deleted'})).toBeVisible();
      await expectToastTextShown(page);
      await record(page, `toasts-replaced--${theme}`, {around: stack});
    });
  }
});

/** Every toast's content is fully shown, not still hidden or fading in. */
async function expectToastTextShown(page: Page) {
  await expect.poll(() => page.locator('[data-sonner-toast] > *').evaluateAll(children =>
    children.every(child => getComputedStyle(child).opacity === '1')), {message: 'every toast shows its text'}).toBe(true);
}
