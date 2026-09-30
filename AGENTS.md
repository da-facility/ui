# Repository Instructions

## Purpose

- This repository is `@da-facility/ui`: layouts, templates and components built on Meta Astryx, shared across Da Facility apps through GitHub Packages.
- The main goal is high-quality components, layouts and templates. Exports must be simple to import and easy to read.

## Structure

- `src/` is the published package. Everything public is exported from `src/index.ts`, with JSDoc on every prop.
- `catalogue/` is the local preview app. Each example in `catalogue/examples/` is registered in `catalogue/examples.ts` and imports `@da-facility/ui` like a consuming app would. Examples receive their sub-page and tweaks as props and never import catalogue internals.
- `tests/` holds the Playwright tests. `bun run test` covers desktop, mobile, WebKit and native macOS bounce; `bun run test:package` packs the package and tests it in a fresh app.

## Rules

- Astryx and React are peer dependencies. The library build must never bundle them; `tests/package.spec.ts` checks this.
- Package styles are plain, unlayered CSS with BEM class names, kept next to their component and themed through Astryx tokens (`var(--color-…)`, `var(--radius-…)`).
- `SidebarLayout` scrolling is deliberate: the document is the only content scroller, fixed navigation sits outside it, and wheel input is never intercepted. This is what gives native momentum and rubber-banding. Do not add nested scroll containers or scroll handlers, and keep `tests/sidebar-layout.spec.ts` and `tests/native-overscroll.spec.ts` passing.
- Scrolling goes through `PageScroll` (the document) and `ScrollArea` / `scrollAreaClassName` (boxes inside fixed chrome) in `src/components/scroll/`. Their bounce and fades are CSS scroll timelines driving registered custom properties; do not add scroll listeners, and do not animate `overscroll-behavior` directly, because Safari ignores that. `tests/overscroll-switch.spec.ts` checks them in WebKit.
- Run `bun run typecheck` and `bun run test` before handing off work that touches `src/` or `catalogue/`.

## Screenshot Coverage

- Whenever a screenshot is requested, captured, or used for visual verification, capture and review both a desktop and a mobile variant before considering the work complete.
- Use these standard CSS viewport sizes unless the task specifies a device or resolution:
  - Desktop: `1920 × 1080` at device scale factor `1`.
  - Mobile: `390 × 844` at device scale factor `1`.
- Treat these as browser viewport dimensions. Full-page screenshots may be taller than the viewport when content scrolls.
- Name paired files with `-desktop` and `-mobile` suffixes, for example `login-split-desktop.png` and `login-split-mobile.png`.
- Use `390 × 844` instead of a literal `1080 × 1920` mobile viewport because responsive CSS is evaluated in CSS pixels; a 1080-pixel-wide viewport commonly activates tablet or desktop breakpoints.
- When a high-resolution mobile asset is required, keep the mobile CSS viewport narrow and increase the device scale factor. Do not widen the CSS viewport merely to reach a desired output pixel count.
- A single-viewport screenshot is allowed only when the user explicitly requests one variant or the target cannot render responsively. State the exception when handing off the work.
- `bun run screenshots` captures every catalogue example at both sizes into `artifacts/screenshots/`.
