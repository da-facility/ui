# Changelog

## Unreleased

New:

- `CycleButton`: an Astryx button that steps through two to four states, such as light, dark and system theme, with a turning icon and dots showing its place in the cycle.

## 0.2.0

Breaking changes:

- Astryx is now a peer dependency instead of being bundled. Install `@astryxdesign/core`, `@astryxdesign/theme-neutral` and `@stylexjs/stylex` in the app, and set up Astryx's stylesheets and `Theme` as the README describes. The app and this package now share one copy of Astryx and one theme.
- Removed `UIProvider`. Use Astryx's `Theme` directly.
- `MobileSidebar` is no longer exported; it is an internal part of `SidebarLayout`.
- `SidebarLayout`: removed `sectionsLabel`, and `navigationTitle` is now `navigationHeader`, which also accepts elements such as a `ProjectSelector`. `navigationLabel` now names the navigation landmark as well as the mobile drawer.
- Published to GitHub Packages instead of being built from Git on install.

New:

- `StatusBar`: the accreditation apps' environment banner as a component, with automatic text contrast.
- `Assistant`: a chat bar at the bottom of the screen. In `SidebarLayout` on desktop the full-screen page rises and shrinks into a card when the chat opens; phones get a bottom sheet. The bar's button toggles the chat. The message box grows as you type, with the context as a tag and a solid send button.
- `SidebarLayout`: `statusBar`, `assistant` and page `footer` slots; `title` is optional and the header goes away without it; `navigationHeader={null}` leaves the sidebar header out; `navigationFade` and `navigationBounce`.
- `ScrollArea` takes `bounce`, and `fade={0}` turns fading off.
- Translations: built-in strings go through Astryx's `InternationalizationProvider`, with `@da-facility/ui/locales/en.json` and `hr.json` shipped.
- `PageScroll`: makes the document the page's scroller, with native bounce only while the page overflows. Pure CSS; it replaces the layout's scroll-measuring effect.
- `ScrollArea` and `scrollAreaClassName`: scroll boxes inside fixed chrome with native bounce while they overflow and a `fade` under their edges.
- `ProjectSelector`: the current project, with a searchable menu. The search starts compact and widens once there is a query.
- `SidebarLayout` takes a `navigationFooter` that stays at the bottom of the sidebar and the mobile drawer while the navigation scrolls between the header and footer.
- The sidebar's navigation list is a `ScrollArea`: native momentum and bounce while it overflows, and items fading under its header and footer, in Safari as well as Chromium.
- `UserMenu` takes `isFullWidth`, for sidebar footers.

Other changes:

- Added the `UserMenuItem` and `LoginCredentials` types, and the `@da-facility/ui/style.css` export.
- `LoginSplit` uses Astryx theme tokens and an Astryx `Button`, so it follows the app's theme.
- The mobile menu and close buttons use Astryx's own icons, and `@heroicons/react` is no longer a dependency.
- `SidebarLayout` renders both its desktop rail and phone drawer and picks one with CSS, so server-rendered pages start with the right layout.
- Dark mode works across every component: colours come from the Astryx theme, and `PageScroll` defaults to the theme's surface colour instead of white.
- The package is 36 KB of JavaScript instead of 437 KB.

## 0.1.0

- First version: `SidebarLayout`, `MobileSidebar`, `LoginSplit`, `UserMenu` and `UIProvider`.
