import {expect, test} from '@playwright/test';
import {collectErrors, presetTweaks} from './helpers';

test('the user menu works with the keyboard and pointer', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/user-menu');
  const trigger = page.locator('.user-menu-example__variants section').first().getByRole('button', {name: 'Account menu for Alex Johnson'});
  const profile = page.getByRole('menuitem', {name: 'Profile', exact: true});
  await expect(trigger.locator('[tabindex="0"]'), 'the avatar adds no tab stop').toHaveCount(0);

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(profile).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({hasText: 'Settings selected.'})).toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(profile).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profile).toBeHidden();

  await trigger.click();
  await expect(profile).toBeVisible();
  await page.getByRole('heading', {name: 'User menu', exact: true}).click();
  await expect(profile, 'clicking outside closes the menu').toBeHidden();
  expect(errors).toEqual([]);
});

test('compact and initials variants have accessible names', async ({page}) => {
  await page.goto('/render/user-menu');
  await expect(page.getByRole('button', {name: 'Account menu for Sam Rivera'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Account menu for Alex Johnson'})).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the trigger is named by what it shows, so axe\'s label-content-name-mismatch passes', async ({page}) => {
  await page.goto('/render/user-menu');
  const sections = page.locator('.user-menu-example__variants section');
  await expect(sections.nth(0).getByRole('button')).toHaveAccessibleName('Account menu for Alex Johnson alex@example.com');
  await expect(sections.nth(1).getByRole('button')).toHaveAccessibleName('Account menu for Sam Rivera Workspace admin');
  await expect(sections.nth(2).getByRole('button')).toHaveAccessibleName('Account menu for Alex Johnson');
  // What WCAG 2.5.3 asks: the visible text is part of the name.
  for (const index of [0, 1]) {
    const trigger = sections.nth(index).getByRole('button');
    // The avatar's initials are hidden from screen readers, so they are not part of the visible label.
    // As axe reads it: the text nodes as written (layout adds no spaces), without what is hidden from screen readers.
    const visible = await trigger.evaluate(element => {
      const copy = element.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[aria-hidden="true"]').forEach(hidden => hidden.remove());
      return copy.textContent!.replace(/\s+/g, ' ').trim();
    });
    expect(await trigger.getAttribute('aria-label')).toContain(visible);
  }
});

test('an own label names the trigger, before what it shows', async ({page}) => {
  await presetTweaks(page, 'user-menu', {ownLabel: true});
  await page.goto('/render/user-menu');
  await expect(page.getByRole('button', {name: 'Your account: Alex Johnson alex@example.com', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Your account: Alex Johnson', exact: true})).toBeVisible();
});

test('the heading repeats the person by default, and can be left out', async ({page}) => {
  await page.goto('/render/user-menu');
  const first = page.locator('.user-menu-example__variants section').first().getByRole('button');
  await first.click();
  await expect(page.getByRole('menu')).toContainText('Alex Johnson · alex@example.com');
  await page.keyboard.press('Escape');

  await presetTweaks(page, 'user-menu', {noHeading: true});
  await page.reload();
  await first.click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', {name: 'Profile', exact: true})).toBeVisible();
  await expect(menu).not.toContainText('alex@example.com');
  await expect(menu.getByRole('menuitem')).toHaveCount(3);
});

test('260px by default; a full-width row opens a menu as wide as itself, and focus returns', async ({page}) => {
  await page.goto('/render/user-menu');
  const first = page.locator('.user-menu-example__variants section').first().getByRole('button');
  await first.click();
  // The menu grows in as it opens; measure it once it has settled.
  await expect.poll(async () => Math.round((await page.getByRole('menu').boundingBox())!.width)).toBe(260);
  await page.keyboard.press('Escape');

  await presetTweaks(page, 'user-menu', {row: true});
  await page.reload();
  const section = (await page.locator('.user-menu-example__variants section').first().boundingBox())!;
  const row = (await first.boundingBox())!;
  expect(row.width, 'the row fills its section').toBeGreaterThan(section.width - 60);
  await first.click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', {name: 'Profile', exact: true})).toBeVisible();
  await expect.poll(async () => Math.abs((await menu.boundingBox())!.width - row.width)).toBeLessThan(2);
  const popup = (await menu.boundingBox())!;
  expect(Math.abs(popup.x - row.x)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(first).toBeFocused();
});

test('compact is a 44px avatar-only trigger, as in the phone top bar', async ({page}) => {
  await page.goto('/render/user-menu');
  const compact = page.locator('.user-menu-example__variants section').nth(2).getByRole('button');
  const box = (await compact.boundingBox())!;
  expect([box.width, box.height]).toEqual([44, 44]);
  await expect(compact).toHaveText('');
});

test('the avatar is drawn over the trigger, outside it, and a click on it opens the menu', async ({page}) => {
  await page.goto('/render/user-menu');
  for (const index of [1, 2]) {
    const section = page.locator('.user-menu-example__variants section').nth(index);
    const trigger = section.getByRole('button');
    // Its initials would otherwise be visible text that the name leaves out.
    await expect(trigger.locator('.astryx-avatar')).toHaveCount(0);
    const [avatar, button] = [(await section.locator('.user-menu__avatar').boundingBox())!, (await trigger.boundingBox())!];
    expect(avatar.x).toBeGreaterThanOrEqual(button.x);
    expect(avatar.y).toBeGreaterThanOrEqual(button.y);
    expect(avatar.y + avatar.height).toBeLessThanOrEqual(button.y + button.height);
    // Where the avatar is drawn: the click goes through it to the button.
    await page.mouse.click(avatar.x + avatar.width / 2, avatar.y + avatar.height / 2);
    await expect(page.getByRole('menuitem', {name: 'Profile', exact: true})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});
