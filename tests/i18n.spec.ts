import {expect, test} from '@playwright/test';
import {drawer, drawerTrigger, isMobile, presetTweaks} from './helpers';

// Package strings go through Astryx's InternationalizationProvider; the
// catalogue's Croatian tweak loads locales/hr.json.

test('English needs no setup and logs no missing-translation warnings', async ({page}) => {
  const warnings: string[] = [];
  page.on('console', message => { if (/i18n|missing key/i.test(message.text())) warnings.push(message.text()); });
  await presetTweaks(page, 'sidebar', {assistant: true});
  await page.goto('/render/sidebar/profile');
  await expect(page.getByRole('button', {name: 'Ask anything'})).toBeVisible();
  await page.goto('/render/login-split');
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(warnings).toEqual([]);
});

test('built-in strings follow the provider’s locale', async ({page}, testInfo) => {
  await presetTweaks(page, 'sidebar', {assistant: true}, {croatian: true});
  await page.goto('/render/sidebar/profile');
  await expect(page.getByRole('button', {name: 'Pitajte bilo što'})).toBeVisible();
  if (isMobile(testInfo)) {
    await page.getByRole('button', {name: 'Otvori izbornik (settings navigation)'}).click();
    await expect(drawer(page).getByRole('button', {name: 'Zatvori izbornik'})).toBeVisible();
    await expect(drawer(page).getByRole('switch', {name: 'Navigacija za ljevake'})).toBeAttached();
    await drawer(page).getByRole('button', {name: 'Zatvori izbornik'}).click();
  } else {
    await expect(page.getByRole('button', {name: 'Projekti: Da Facility'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Izbornik računa: Alex Johnson'})).toBeVisible();
  }
  await page.goto('/render/login-split');
  await expect(page.getByRole('heading', {name: 'Dobro došli natrag'})).toBeVisible();
  await expect(page.getByLabel('Lozinka', {exact: true})).toHaveAttribute('placeholder', 'Unesite lozinku');
  await expect(page.getByRole('button', {name: 'Prijava', exact: true})).toBeVisible();
  await expect(drawerTrigger(page)).toHaveCount(0);
});
