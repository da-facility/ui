# Da Facility UI

Layouts, templates and components for Da Facility apps, built on [Meta Astryx](https://astryx.atmeta.com). Astryx is a peer dependency: apps use Astryx directly and this package adds the pieces we reuse across repositories.

| Export | Kind | What it is |
| --- | --- | --- |
| `SidebarLayout` | Layout | App shell with a fixed navigation rail on desktop and a thumb-reachable drawer on mobile. Built on `PageScroll` and `ScrollArea`. |
| `LoginSplit` | Template | Sign-in page with an email and password form beside a cover image. |
| `StatusBar` | Component | Loud full-width bar that says which kind of site this is, such as staging. |
| `Assistant` | Component | Chat bar at the bottom of the screen that opens into a chat; the layout contracts around it. |
| `ProjectSelector` | Component | The current project, with a searchable menu for switching projects. |
| `UserMenu` | Component | Account avatar and name that opens a menu of account actions. |
| `PageScroll` | Component | Makes the document the page's scroller, with native bounce only while the page overflows. |
| `ScrollArea` | Component | Scroll box inside fixed chrome, with native bounce while it overflows and content fading under its edges. |

## Install

The package is published to GitHub Packages. Point the `@da-facility` scope at it in the app's `.npmrc` (Bun, npm and pnpm all read this file):

```ini
@da-facility:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` needs `read:packages`. Locally, a personal access token works; in GitHub Actions, use the workflow's `GITHUB_TOKEN` and give the app's repository access in the package settings.

Then install the package with its peers:

```sh
bun add @da-facility/ui @astryxdesign/core @astryxdesign/theme-neutral @stylexjs/stylex
```

## Set up

Set up Astryx once, as its docs describe, and the components pick up the app's theme. Package styles load with the import, and no build plugin is needed.

```tsx
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';

createRoot(root).render(
  <Theme theme={neutralTheme} mode="light">
    <App />
  </Theme>,
);
```

Import the three stylesheets in that order: each one sits in a cascade layer (`reset`, `astryx-base`, `astryx-theme`), and the first import sets the layer order. If the app needs to control where package styles land, import `@da-facility/ui/style.css` explicitly.

## Use

### SidebarLayout

```tsx
import {SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {ProjectSelector, SidebarLayout, UserMenu} from '@da-facility/ui';

<SidebarLayout
  title={project.name}
  navigation={
    <SideNavSection title="Workspace">
      <SideNavItem label="Deployments" href="/deployments" isSelected />
      <SideNavItem label="Settings" href="/settings" />
    </SideNavSection>
  }
  navigationHeader={<ProjectSelector projects={projects} value={project.id} onChange={openProject} />}
  navigationFooter={<UserMenu user={user} items={accountActions} isFullWidth placement="above" alignment="start" />}
  navigationKey={location.pathname}
  statusBar={isStaging && <StatusBar label="Staging" color="#ff5f00" />}
  assistant={<Assistant suggestions={starters} onSubmit={ask}>{conversation}</Assistant>}
  footer={<SaveBar />}>
  <ProjectsPage />
</SidebarLayout>
```

Every part except `navigation` and `children` is optional:

| Prop | Where it goes |
| --- | --- |
| `statusBar` | A full-width bar above everything, such as a `StatusBar`. |
| `title`, `headerActions` | The page header. Without either, there is no header. |
| `footer` | Pinned to the bottom of the page area; content scrolls clear of it. |
| `navigationHeader`, `navigationFooter` | Pinned above and below the navigation, in the rail and the mobile drawer. |
| `assistant` | A chat bar below everything, such as an `Assistant`. |

- **Mount one per document.** It scrolls the page with `PageScroll`, whose document styles apply only while it is mounted.
- **CSS picks desktop or phone.** Both the rail and the phone drawer are rendered, and a media query shows one, so server-rendered pages start with the right layout.
- **Pinned header and footer.** `navigationHeader` and `navigationFooter` stay put at the top and bottom of the sidebar (and of the mobile drawer), and the navigation scrolls between them. Plain text in `navigationHeader` is styled as a title.
- **The navigation list is a `ScrollArea`.** While it overflows, it keeps native momentum and bounce without moving the page, and items fade out where they pass under the header or footer. `navigationFade` sets the fade in pixels (0 turns it off) and `navigationBounce={false}` turns the bounce off.
- **Routing stays in the app.** Pass the current route as `navigationKey` so the mobile drawer closes after navigation.
- **Page background.** `background` sets it; the default is the theme's surface colour, so dark mode works without it. The same color fills the overscroll area unless `overscrollBackground` is set. Use `overscroll="none"` to turn off native bounce.
- **Mobile navigation.** The menu button and drawer default to the right. `mobileNavigationSide` moves them, and passing `onMobileNavigationSideChange` adds a left-handed switch to the drawer. Persisting the choice is up to the app.
- **Mobile placement.** `mobileNavigationOffset` lifts the menu button, and `mobileNavigationArtwork` fills the spare space above the navigation.

### LoginSplit

```tsx
<LoginSplit
  brand={<Logo />}
  artwork={<img src={cover} alt="" />}
  onSubmit={async ({email, password}) => {
    await signIn(email, password); // throw to show the error's message
    navigate('/');
  }}
/>
```

`title`, `description`, `forgotPasswordHref`, `providers`, `signup` and `legal` fill the optional slots. The form uses native inputs, so browser and password-manager autofill keep working.

### ProjectSelector

```tsx
<ProjectSelector
  projects={[
    {id: 'web', name: 'Web app', description: 'app.example.com'},
    {id: 'api', name: 'API', imageUrl: apiLogo},
  ]}
  value={projectId}
  onChange={setProjectId}
  onCreate={openNewProjectDialog}
/>
```

The menu opens with its search focused, so typing filters straight away. The search starts as a compact pill beside the heading and widens to the full row once it has a query. Arrow keys move through the matches and Enter selects one. The first Escape clears the search, and the second closes the menu. The trigger fills its container's width, which suits a sidebar header.

### StatusBar

```tsx
<StatusBar label="Staging" color="#ff5f00" notice={devCode && <DevCode code={devCode} />} />
```

A 32px bar with the label repeated in uppercase monospace, scrolling slowly sideways. The text turns white or near-black to contrast with `color` unless `foreground` is set. `notice` fades in over the middle, for something like a development sign-in code. On its own it sticks to the top of the page; in `SidebarLayout` the layout makes room for it.

### Assistant

```tsx
<Assistant
  suggestions={['Why won’t my emails send?', 'Why am I getting a 429 error?']}
  onSubmit={message => send(message)}
  context={<>{pageName}</>}>
  {messages.length > 0 && <Conversation messages={messages} />}
</Assistant>
```

A chat shell: the app owns the conversation and what happens to a message.
- **Closed:** a quiet "Ask anything" bar at the bottom of the screen.
- **Open on desktop:** inside `SidebarLayout`, the whole layout contracts into a card and the chat takes the space below it.
- **Open on phones:** a bottom sheet you can drag.

Suggestions show until there is a conversation, and send when chosen. Escape closes the chat on desktop. `label`, `placeholder`, `actions` (extra bar buttons) and controlled `isOpen`/`onOpenChange` are optional.

### PageScroll and ScrollArea

Scrolling stays native: the browser does the momentum and rubber-banding, and no script listens to scroll events. These two components only decide which element scrolls and when it may bounce, in CSS.

```tsx
import {PageScroll, ScrollArea} from '@da-facility/ui';

// The page: the document scrolls. Keep headers and sidebars `position: fixed` inside it.
<PageScroll background="#fff" overscroll="when-scrollable">
  <header className="my-fixed-header">…</header>
  <main>…</main>
</PageScroll>

// A list between a pinned header and footer. Give it a height, or a flex parent.
<ScrollArea fade={10} bounce style={{flex: 1, minHeight: 0}}>
  <ul>…</ul>
</ScrollArea>
```

- **`PageScroll`** bounces only while the page overflows, so a page that fits stays still. `background` is the page colour and also fills the bounce, unless `overscrollBackground` is set. `overscroll="none"` turns the bounce off. Mount one per document.
- **`ScrollArea`** bounces only while it overflows, never moves the page, and fades content over `fade` pixels (10 by default; 0 turns it off) under the edges that have more behind them. `bounce={false}` turns the bounce off. Both settings also apply to scroll areas inside it.
- **Scroll boxes you can't wrap.** For a scroll box you render yourself or can't wrap, add `scrollAreaClassName` to it instead.

How the "only while it overflows" part works: an element's CSS scroll timeline is active only while it has something to scroll. An animation on that timeline switches a registered custom property to `contain`, and `overscroll-behavior` reads the property. The indirection is needed because Safari does not animate `overscroll-behavior` itself. Browsers without scroll timelines, such as Safari before 26, always allow the bounce and skip the fades.

### UserMenu

```tsx
<UserMenu
  user={{name: 'Alex Johnson', description: 'alex@example.com', imageUrl: avatarUrl}}
  items={[
    {id: 'settings', label: 'Settings', onClick: openSettings},
    {type: 'divider'},
    {id: 'sign-out', label: 'Sign out', onClick: signOut},
  ]}
/>
```

Items take the same shape as items in Astryx's `DropdownMenu`. Pass `compact` to show only the avatar, for narrow headers, or `isFullWidth` to fill a sidebar footer.

## Develop

```sh
bun install
bun run dev            # catalogue at http://localhost:5173
bun run typecheck
bun run test           # browser tests, desktop and mobile
bun run test:package   # pack, install into a fresh app, and test it there
bun run screenshots    # desktop and mobile captures in artifacts/screenshots
bun run build          # the package, into dist/
```

```
src/                   the published package
  layouts/  templates/  components/
catalogue/             local app that renders every example
  examples/            one folder per example, written like consuming app code
  examples.ts          the catalogue's list of examples and their tweaks
tests/                 Playwright tests; package.spec.ts tests the packed package
```

Examples import `@da-facility/ui`, which the catalogue maps to `src/`, so each example also shows how an app would use the package. The catalogue menu keeps the current example's tweaks in view beside its draggable bar, including a dark mode switch for every example; the list of examples opens from the bar (⌘K / Ctrl+K). `/render/<example>` shows an example on its own.

To add something to the package:

1. Build it in `src/` and export it from `src/index.ts`.
2. Add an example in `catalogue/examples/` and register it in `catalogue/examples.ts`.
3. Add tests in `tests/`.

To open the catalogue on another device, list the extra host names in `.env.local`:

```ini
CATALOGUE_ALLOWED_HOSTS=my-machine.tailnet.ts.net
```

The native-overscroll tests run only on macOS, in visible Chromium windows, after the rest of the suite, because rubber-banding exists only there and measuring it is timing-sensitive. WebKit tests check the CSS bounce switches resolve the same way in Safari's engine. Neither replaces trying it on a real iPhone. Without a running `bun run dev`, the tests build the catalogue and serve that.

## Release

1. Bump `version` in `package.json` and add an entry to `CHANGELOG.md`.
2. Commit, then tag and push:

   ```sh
   git tag v0.2.0 && git push origin main v0.2.0
   ```

   The release workflow checks that the tag matches the version, builds the package, and publishes it to GitHub Packages.

Code adapted from Astryx keeps its license notice in `LICENSE.third-party`, which ships with the package.
