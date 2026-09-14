# Da Facility UI Catalogue

A React catalogue for reusable interface templates and components. Each layout fills the browser viewport. A floating UI library menu handles navigation, and a Bun script exports templates to static HTML, PNG, or JPEG.

## Run it

```sh
bun install
bun run dev
```

Open the catalogue at `http://localhost:5173`. The menu starts collapsed in the bottom-right corner.

- Click the floating bar or press `Cmd/Ctrl+K` to open the library. `Escape` closes it.
- Search and switch between **Login Split** and **Sidebar**. Selection updates the URL, supports browser back/forward, and survives reloads.
- Drag the grip with a mouse or touch. For keyboard movement, focus the grip and use arrow keys, with `Shift` for larger steps. The Position selector moves it to a corner.
- Menu position and open state are saved locally. The menu stays inside the viewport when the window resizes.
- **Open clean view** opens the layout without the menu, for example `http://localhost:5173/render/login-split`.

Direct catalogue links are `/login-split` and `/sidebar`; clean renders use `/render/<template>`. Settings pages also have paths, such as `/sidebar/long-table`. Old querystring links redirect to their equivalent paths. Sidebar uses Meta Astryx's settings-dialog template: fixed settings navigation and search on desktop, with a right-hand Astryx drawer on phones and short windows. A lower-right button opens it, and a large close button sits at the bottom. The drawer uses the same grouped navigation as the desktop sidebar. The document owns main-content scrolling so it can use the browser's native rubber-band effect. Desktop navigation is fixed to the viewport; mobile uses a fixed header and right-hand drawer. Navigation has its own overflow area for excess items and suppresses overscroll and chaining. There are no custom wheel, touch, or spring handlers. The floating UI library menu has a Tweaks toggle for 100 randomly named sidebar items; it persists across refreshes and can be switched off to restore the normal menu. Its ten settings panels, 500-row Long table page, and Long paragraphs railway notebook use real Astryx controls and local demo state; account, billing, and API actions are not connected to a backend. Login Split's sign-in remains simulated.

## LAN preview

The preview is available on the Mac's LAN address at `http://192.168.1.161:5180/sidebar`. Connect a phone to the same Wi-Fi and scan `artifacts/sidebar-lan-qr.png`. The address may change if the network assigns a new IP.

The current preview runs as the macOS launchd job `hr.hrs.da-facility.ui-preview`, independently of the task terminal. Stop it with `launchctl remove hr.hrs.da-facility.ui-preview`. Logs are in `artifacts/lan-preview.log` and `artifacts/lan-preview-error.log`.

## Check changes

```sh
bun run check
bun run build
# With the development server running:
bun run test:ui
```

The browser checks exercise path navigation and browser history, mouse/touch dragging, keyboard movement, persistence, settings controls, the right-hand mobile drawer, all 500 table rows, independent native scrolling, overflow boundaries, the 100-item tweak, and clean renders. They save paired desktop/mobile screenshots to `artifacts/`. Set `UI_TEST_URL` to use a server other than `http://localhost:5173`.

## Render an artifact

```sh
# Chromium is a one-time setup for HTML and image output.
bun run browser:install

bun run render:html
bun run render:png   # creates desktop and mobile variants
bun run render:jpeg  # creates desktop and mobile variants
```

Outputs are written to `artifacts/`. The renderer also accepts explicit values:

```sh
bun run render --template login-split --format png
bun run render --template login-split --format png --viewport mobile --output previews/login.png
```

Image rendering follows the repository screenshot rule in `AGENTS.md`: every capture produces a `1920 × 1080` desktop viewport and a `390 × 844` mobile viewport by default. Use `--viewport desktop` or `--viewport mobile` only when a task explicitly calls for one variant.

Exports use an isolated Vite production build so Astryx and local StyleX styles compile exactly as they do in the app. HTML embeds the compiled CSS and contains no JavaScript. It captures the selected viewport, desktop by default; use `--viewport mobile` for the mobile shell. The Vite build remains the interactive browser build.

## Add to the catalogue

1. Put the React source in `src/templates/<id>/` (or `src/components/<id>/`).
2. Add its metadata to `src/templates/metadata.ts` and its component to `src/templates/registry.ts`.
3. Import its stylesheet in `src/main.tsx`. Astryx components and local StyleX styles compile through the Astryx Vite plugin.

The template and its metadata are the product. Everything else is a small preview/export shell.

## Provenance

`login-split` is a plain React/CSS port of Meta Astryx's [Login Split template](https://facebook.github.io/astryx/sandbox/templates/login-split/). The source component retains the original Meta copyright note and uses the original Astryx demo assets.

`sidebar` copies the [Meta Astryx settings-dialog source](https://github.com/facebook/astryx/blob/b92b07613fbf941392a2138bd22b42c71e2707f0/packages/cli/assets/templates/pages/settings-dialog/page.tsx), using `@astryxdesign/core` 0.5.4, its neutral theme, and Heroicons. The adaptation removes the modal frame and inert close controls and fills the viewport. The upstream MIT license is retained at `src/templates/sidebar/LICENSE.astryx`.

The floating library menu is a local React/CSS implementation. The menu follows the floating-control pattern of [TanStack Devtools](https://tanstack.com/devtools/latest/docs/configuration); this project still uses Vite and does not depend on TanStack Start.

### Long paragraphs

Open `/sidebar/long-paragraphs` for twelve text chapters with headings and footers. Main content uses native momentum and native boundary effects where supported by the browser. In `src/templates/sidebar/sidebar.css`, the scoped `html:has(.astryx-settings-page)` variables `--settings-scroll-background` and `--settings-page-background` control the exposed document canvas and content surface respectively. The paragraph page sets warm defaults for both. Bounce distance and timing belong to the browser, not application JavaScript.

On macOS, `scripts/check-overscroll.ts` runs headed Chromium and sends phased scroll gestures. It captures the native compositor bounce at both boundaries of both long pages, checks that the exposed canvas appears and settles, and verifies fixed navigation. The mobile viewport check exercises narrow-layout trackpad behavior, not an actual iPhone touch gesture. Other operating systems run the layout/input checks without claiming macOS rubber-band verification.
