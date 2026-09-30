import {expect, test, type Page} from '@playwright/test';
import {collectErrors} from './helpers';

const trigger = (page: Page) => page.getByRole('button', {name: /^Projects:/}).first();
const search = (page: Page) => page.getByRole('combobox', {name: 'Search projects'});
const options = (page: Page) => page.getByRole('listbox', {name: 'Projects'}).getByRole('option');
const searchWidth = (page: Page) => page.locator('.project-selector__search').filter({visible: true}).evaluate(element => element.getBoundingClientRect().width);
const barWidth = (page: Page) => page.locator('.project-selector__bar').filter({visible: true}).evaluate(element => element.getBoundingClientRect().width);

test('the search starts compact and widens once there is a query', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/project-selector');
  await trigger(page).click();
  await expect(search(page), 'typing works as soon as the menu opens').toBeFocused();
  expect(await searchWidth(page)).toBeLessThan(130);
  await expect(page.locator('.project-selector__heading').filter({visible: true})).toHaveCSS('opacity', '1');

  await page.keyboard.type('ha');
  await expect.poll(async () => await barWidth(page) - await searchWidth(page), 'the search fills the row').toBeLessThan(1);
  await expect(page.locator('.project-selector__heading').filter({visible: true})).toHaveCSS('opacity', '0');
  await expect(options(page)).toHaveText([/Harbour Dashboard/]);

  await page.getByRole('button', {name: 'Clear search'}).click();
  await expect.poll(() => searchWidth(page)).toBeLessThan(130);
  await expect(options(page)).toHaveCount(10);
  expect(errors).toEqual([]);
});

test('the keyboard filters, moves and selects', async ({page}) => {
  await page.goto('/render/project-selector');
  await expect(trigger(page)).toHaveAccessibleName('Projects: Da Facility');
  await trigger(page).click();
  await expect(search(page)).toBeFocused();
  await page.keyboard.type('o');
  await page.keyboard.press('ArrowDown');
  const active = await search(page).getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('data-active', '');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).not.toHaveAccessibleName('Projects: Da Facility');
});

test('Escape clears the search before it closes the menu', async ({page}) => {
  await page.goto('/render/project-selector');
  await trigger(page).click();
  await expect(search(page)).toBeFocused();
  await page.keyboard.type('zzz');
  await expect(page.getByText('No projects match “zzz”.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search(page)).toHaveValue('');
  await expect(options(page)).toHaveCount(10);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(trigger(page)).toBeFocused();
});

test('a long list scrolls inside the menu, and the create action closes it', async ({page}) => {
  await page.goto('/render/project-selector');
  await trigger(page).click();
  const list = page.getByRole('listbox', {name: 'Projects'});
  expect(await list.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await expect(list).toHaveCSS('overscroll-behavior-y', 'contain');
  await page.getByRole('button', {name: 'New project'}).click();
  await expect(list).toBeHidden();
  await expect(page.getByRole('status').filter({hasText: 'Create project selected'})).toBeVisible();
});

test('choosing a project in the sidebar updates the page title', async ({page}) => {
  await page.goto('/render/sidebar/profile');
  const drawerTrigger = page.getByRole('button', {name: 'Open settings navigation'});
  if (await drawerTrigger.isVisible()) await drawerTrigger.click();
  await trigger(page).click();
  await expect(search(page)).toBeFocused();
  await page.keyboard.type('field');
  await page.keyboard.press('Enter');
  await expect(page.locator('.sidebar-layout__title')).toHaveText('Field Ops');
});
