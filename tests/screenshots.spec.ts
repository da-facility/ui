import {test} from '@playwright/test';

// `bun run screenshots` saves a desktop and a mobile capture of every catalogue
// example to artifacts/screenshots, at the viewports from AGENTS.md.
const viewports = {
  desktop: {width: 1920, height: 1080},
  mobile: {width: 390, height: 844},
};

test('capture every example', async ({browser, baseURL}) => {
  test.setTimeout(120_000);
  const index = await browser.newPage();
  await index.goto(baseURL!);
  await index.getByRole('button', {name: 'Open catalogue', exact: true}).click();
  const paths = await index.getByRole('navigation', {name: 'Examples'}).getByRole('link').evaluateAll(links => links.map(link => new URL((link as HTMLAnchorElement).href).pathname));
  await index.close();

  for (const path of paths) {
    for (const [name, viewport] of Object.entries(viewports)) {
      const page = await browser.newPage({viewport, deviceScaleFactor: 1, hasTouch: name === 'mobile'});
      await page.goto(`${baseURL}/render${path}`, {waitUntil: 'networkidle'});
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, image => image.decode().catch(() => {})));
      });
      await page.screenshot({path: `artifacts/screenshots${path}-${name}.png`, fullPage: true});
      await page.close();
    }
  }
});
