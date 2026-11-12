# Repository Instructions

Shared by all coding agents (Codex reads this file; `CLAUDE.md` imports it). What the package offers and how to use it is in [README.md](README.md); what each release changed is in [CHANGELOG.md](CHANGELOG.md).

## Keep this file current

- Every commit that changes how the library works (structure, exports, rules, commands, scripts, tests, CI, release steps, conventions) updates this file in the same commit.
- Remove or correct whatever the change makes untrue. No history here: that belongs in git and in CHANGELOG.md.
- Keep it short and factual: what an agent needs to work here, with links to README.md and CHANGELOG.md instead of copies of them.
- Before committing, re-read this file against the change.

## Purpose

- This repository is `@da-facility/ui`: layouts, templates and components built on Meta Astryx, shared across Da Facility apps and published to npm.
- The main goal is high-quality components, layouts and templates. Exports must be simple to import and easy to read.

## Structure

- `src/` is the published package: `layouts/`, `templates/` and `components/`, one folder per component with its CSS beside it, plus `astryx.ts` (the Astryx re-exports) and `locales/`. Everything public is exported from `src/index.ts`, with JSDoc on every prop.
- `catalogue/` is the local preview app. Each example in `catalogue/examples/` is registered in `catalogue/examples.ts` and imports `@da-facility/ui` like a consuming app would. Examples receive their sub-page and tweaks as props and never import catalogue internals. `catalogue/examples/shared/` holds what several examples use, such as the drawn stand-in photographs.
- `tests/` holds the Playwright tests. `bun run test` covers desktop, mobile, WebKit and native macOS bounce; `bun run test:headless` is the same without native bounce; `bun run test:package` packs the package and tests it in a fresh app.

## Rules

- Astryx and React are peer dependencies. The library build must never bundle them; `tests/package.spec.ts` checks this.
- Apps import their whole UI from this package. `src/astryx.ts` re-exports the Astryx components app screens use, each from its own Astryx entry point so unused ones are tree-shaken (`tests/package.spec.ts` checks this too). Keep them plain re-exports; one becomes a wrapper, keeping its Astryx name and props, only when the library needs to change its behaviour. Every re-exported name must exist in each Astryx version of the peer range.
- Package styles are plain, unlayered CSS with BEM class names, kept next to their component and themed through Astryx tokens (`var(--color-…)`, `var(--radius-…)`). Values Astryx has no token for are the library's own `--da-*` custom properties with a fallback (such as `--da-media-gap` or `--da-media-radius`), listed in README.md, so apps set them from their theme.
- `SidebarLayout` scrolling is deliberate: the document is the only content scroller, fixed navigation sits outside it, and wheel input is never intercepted. This is what gives native momentum and rubber-banding. Do not add nested scroll containers or scroll handlers, and keep `tests/sidebar-layout.spec.ts` and `tests/native-overscroll.spec.ts` passing.
- Scrolling goes through `PageScroll` (the document) and `ScrollArea` / `scrollAreaClassName` (boxes inside fixed chrome) in `src/components/scroll/`. Their bounce and fades are CSS scroll timelines driving registered custom properties; do not add scroll listeners, and do not animate `overscroll-behavior` directly, because Safari ignores that. `tests/overscroll-switch.spec.ts` checks them in WebKit.
- Media components handle large collections without scroll listeners: `MediaGrid` keeps every tile in the document and lets `content-visibility: auto` on blocks of whole rows (with an exact `contain-intrinsic-size`) skip off-screen layout and paint, reads its column count from CSS with a `ResizeObserver`, and pages with an `IntersectionObserver`. Keep it that way; `tests/media-grid-performance.spec.ts` measures it with 20,000 items (`/media-grid/large`). The media components' tests also run in WebKit, because `content-visibility`, container units and `<dialog>` differ between engines.
- Choose between desktop and phone layouts with CSS media queries, not by branching on `useMediaQuery` in render, so server-rendered pages start right.
- Built-in text goes through `useMessages()` (`src/i18n.ts`) with a key in `src/locales/en.json` and `hr.json`, never as a literal in a component. Pass counts as numbers, so they get the locale's grouping. Translations may use ICU plurals (`{count, plural, one {…} few {…} other {…}}`), which Astryx's translator formats; `en.json` keeps to plain `{name}` placeholders, because untranslated English is formatted without Astryx.
- Colours come from Astryx tokens so dark mode works; check new work with the catalogue's Dark mode tweak.
- Surfaces that stay dark in both modes (the media viewer, the sign-in brand panel) use the `media-canvas` class (`src/components/media-canvas/`): it reads the `--da-media-*` custom properties, with neutral dark fallbacks, and points Astryx's colour tokens at them inside. The selection bar swaps the page's tokens the same way. Don't invert surfaces by switching `color-scheme`: bundlers that lower `light-dark()` (Vite's CSS minifier does) resolve the theme's tokens once at the root, so the switch does nothing in production builds. Test colour work against a production build (stop `bun run dev`, and the tests build one).
- Run `bun run typecheck` and `bun run test:headless` before handing off work that touches `src/` or `catalogue/`.
- On the local machine, run the full `bun run test` only when the change touches scrolling: `PageScroll`, `ScrollArea`, `SidebarLayout`'s scroll structure, overscroll or bounce CSS. Its native-overscroll tests open visible Chromium windows and drive real input, which makes the computer hard to use while they run. CI runs the full suite either way.

## Releasing

Versions are `MAJOR.MINOR.PATCH`. Decide the bump from what changed since the last release:

| Bump | Example | When |
| --- | --- | --- |
| Patch | 1.0.0 → 1.0.1 | Bug fixes, and changes apps won't notice: styling fixes, docs, tests, CI, internal refactors. |
| Minor | 1.0.1 → 1.1.0 | New components, layouts, templates, exports or props, and new optional behaviour. Resets the patch number. |
| Major | 1.1.0 → 2.0.0 | Anything that makes an app change its code or its look on upgrade: a removed or renamed export or prop, a changed default or required prop, a new or raised peer dependency, dropped browser support, or a deliberate redesign. Resets minor and patch. |

When unsure between two bumps, pick the larger one; for minor or major, ask.

### Patch and minor releases are automatic

Release on your own, without asking, when a task ends with fixes or new components on `main`. One release per task, covering everything the task changed:

1. Keep `CHANGELOG.md` up to date as you work: each user-facing change goes under `## Unreleased`, in "New", "Breaking changes" or "Other changes", written for the people using the package. Fixes go in "Other changes".
2. Check `main` is clean and level with `origin/main`, and that `bun run typecheck`, `bun run test:headless` and `bun run test:package` pass.
3. Work out the bump from the Unreleased entries: minor if any is new, otherwise patch. If any is breaking, stop and follow the major release steps instead.
4. Rename `## Unreleased` to `## <version>`, set `version` in `package.json` to match, and commit as "Release <version>".
5. Tag and push: `git tag v<version> && git push origin main v<version>`.
6. Watch the Release workflow (`.github/workflows/release.yml`). On Blacksmith it checks the tag matches `package.json` and runs the checks; then a GitHub-hosted runner publishes to npm with provenance through npm trusted publishing, because npm accepts provenance only from GitHub-hosted runners; then it creates the GitHub release from that version's changelog section.
7. Tell the user the version, why it is a patch or minor, what it contains, and the workflow's result with links to the npm package and the GitHub release.

Don't release when the task changed nothing that ships: catalogue, tests, CI or docs only. Those wait in Unreleased, or are left out of the changelog, until the next real release.

### Major releases need the user's approval

Never tag a major release, and never push a breaking change to `main`, without the user's explicit go-ahead. Once a breaking change is on `main`, every release after it is a major one, so landing it blocks the automatic releases above.

When a change would be breaking, stop before pushing it and ask the user, in detail:

- **What breaks:** every removed or changed export, prop, default, style or peer dependency, and who is affected: which apps or usages stop compiling, behave differently or look different.
- **Why:** what the change makes possible, and why it can't be done without breaking.
- **Alternatives:** whether it can ship as a minor instead, for example by adding the new prop or component alongside the old one, deprecating the old one with a JSDoc `@deprecated` note, and removing it in a later major.
- **Migration:** the exact steps an app takes to upgrade, with before and after code.
- **The release:** the proposed version, its full changelog entry, and anything else waiting in Unreleased that would ship with it.

If the user approves, write the migration steps into the changelog entry under "Breaking changes", then release as above. If they don't, take the alternative or drop the change.

### Rules for every release

- Release only from `main`, and only through the tag and the Release workflow. Never publish from a local machine, and never store an npm token in the repository or its secrets; trusted publishing needs neither.
- Never move or delete a pushed tag, and never unpublish from npm. If a release is broken, fix forward with a new patch release.
- If the Release workflow fails, nothing is published. If the cause is passing, such as a flaky test or a runner problem, re-run the failed run. If the code needs a fix, fix it on `main` and release the next patch version with a new tag rather than reusing the failed one.

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

## Behaviour recordings

- `tests/behaviour.spec.ts` records how every catalogue state looks and reads: every example and sidebar page in light and dark, each tweak switched, Croatian, and interactive states (open menus, the phone drawer, the chat, form errors, toasts, the code steps, a selected media grid and a zoomed viewer), at desktop and mobile sizes. Each state saves a screenshot and an ARIA snapshot.
- Use it to check that a change didn't alter anything it shouldn't: before a dependency upgrade (Astryx, React, Sonner), a CSS refactor or any change to shared styles, run `bun run behaviour:record` on the unchanged code, make the change, then run `bun run behaviour:compare`. Every state that looks or reads differently fails, and `playwright-report/` shows the expected, actual and difference images. A state that differs once and matches on its retry is reported as flaky and is timing noise, not a change.
- Report every difference to the user with what changed and whether it comes from this package or upstream. Fix the ones this package should prevent; list the rest.
- Baselines are machine-specific and stay in `artifacts/behaviour/`, which is not committed. The scripts serve a fresh production build on port 5180, never the dev server. Recording takes about eight minutes and comparing about four, with no visible windows.
- When a catalogue example gains a state worth protecting, add it to the spec.
