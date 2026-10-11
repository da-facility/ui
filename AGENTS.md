# Repository Instructions

## Purpose

- This repository is `@da-facility/ui`: layouts, templates and components built on Meta Astryx, shared across Da Facility apps and published to npm.
- The main goal is high-quality components, layouts and templates. Exports must be simple to import and easy to read.

## Structure

- `src/` is the published package. Everything public is exported from `src/index.ts`, with JSDoc on every prop.
- `catalogue/` is the local preview app. Each example in `catalogue/examples/` is registered in `catalogue/examples.ts` and imports `@da-facility/ui` like a consuming app would. Examples receive their sub-page and tweaks as props and never import catalogue internals.
- `tests/` holds the Playwright tests. `bun run test` covers desktop, mobile, WebKit and native macOS bounce; `bun run test:headless` is the same without native bounce; `bun run test:package` packs the package and tests it in a fresh app.

## Rules

- Astryx and React are peer dependencies. The library build must never bundle them; `tests/package.spec.ts` checks this.
- Package styles are plain, unlayered CSS with BEM class names, kept next to their component and themed through Astryx tokens (`var(--color-…)`, `var(--radius-…)`).
- `SidebarLayout` scrolling is deliberate: the document is the only content scroller, fixed navigation sits outside it, and wheel input is never intercepted. This is what gives native momentum and rubber-banding. Do not add nested scroll containers or scroll handlers, and keep `tests/sidebar-layout.spec.ts` and `tests/native-overscroll.spec.ts` passing.
- Scrolling goes through `PageScroll` (the document) and `ScrollArea` / `scrollAreaClassName` (boxes inside fixed chrome) in `src/components/scroll/`. Their bounce and fades are CSS scroll timelines driving registered custom properties; do not add scroll listeners, and do not animate `overscroll-behavior` directly, because Safari ignores that. `tests/overscroll-switch.spec.ts` checks them in WebKit.
- Choose between desktop and phone layouts with CSS media queries, not by branching on `useMediaQuery` in render, so server-rendered pages start right.
- Built-in text goes through `useMessages()` (`src/i18n.ts`) with a key in `src/locales/en.json` and `hr.json`, never as a literal in a component.
- Colours come from Astryx tokens so dark mode works; check new work with the catalogue's Dark mode tweak.
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
6. Watch the Release workflow (`.github/workflows/release.yml`, on Blacksmith). It checks the tag matches `package.json`, runs the checks, publishes to npm with provenance through npm trusted publishing, and creates the GitHub release from that version's changelog section.
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
