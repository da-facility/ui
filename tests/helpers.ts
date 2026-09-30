import {expect, type Page, type TestInfo} from '@playwright/test';

export const isMobile = (testInfo: TestInfo) => testInfo.project.name.endsWith('mobile');

/** Astryx's drawer panel inside the mobile navigation dialog. */
export const drawerPanel = (page: Page) => page.locator('.mobile-navigation__drawer > div');
export const drawer = (page: Page) => page.getByRole('dialog', {name: 'Settings navigation', exact: true});
export const drawerTrigger = (page: Page) => page.getByRole('button', {name: 'Open settings navigation', exact: true});
export const navigation = (page: Page) => page.getByRole('navigation', {name: 'Settings navigation', exact: true});

export async function waitForDrawerEdge(page: Page, side: 'left' | 'right') {
  await page.waitForFunction(side => {
    const box = document.querySelector('.mobile-navigation__drawer > div')?.getBoundingClientRect();
    return box && Math.abs(side === 'right' ? box.right - innerWidth : box.left) < 1;
  }, side);
}

/** Selects a settings page from the navigation, opening the drawer first on mobile. */
export async function choosePage(page: Page, label: string) {
  const trigger = drawerTrigger(page);
  const inDrawer = await trigger.isVisible();
  if (inDrawer) await trigger.click();
  await navigation(page).getByRole('button', {name: label, exact: true}).click();
  if (inDrawer) await expect(drawer(page)).toBeHidden();
  await expect(page.getByRole('main').getByRole('heading', {name: label, exact: true})).toBeVisible();
}

/** Sets a switch in the catalogue menu's Tweaks section, which stays in view. */
export async function setTweak(page: Page, label: string, value: boolean) {
  const tweaks = page.getByRole('region', {name: 'Tweaks'});
  const toggle = tweaks.getByRole('button', {name: /Tweaks/});
  // Phones start with the list collapsed; put it back afterwards so it does not cover the page.
  const wasCollapsed = await toggle.getAttribute('aria-expanded') === 'false';
  if (wasCollapsed) await toggle.click();
  const tweak = tweaks.getByRole('switch', {name: label, exact: true});
  if (await tweak.isChecked() !== value) await tweak.click();
  await expect(tweak).toBeChecked({checked: value});
  if (wasCollapsed) await toggle.click();
}

/** Starts a page with the given example tweaks already set, as if chosen earlier. */
export async function presetTweaks(page: Page, example: string, tweaks: Record<string, boolean>, global: Record<string, boolean> = {}) {
  await page.addInitScript(([example, tweaks, global]) => {
    localStorage.setItem('da-ui-catalogue:tweaks', JSON.stringify({[example as string]: tweaks, global}));
  }, [example, tweaks, global] as const);
}

export const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

/** Collects uncaught page errors; assert the list is empty at the end of a test. */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}
