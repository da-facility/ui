# Da Facility UI

Layouts, templates and components for Da Facility apps, built on [Meta Astryx](https://astryx.atmeta.com). Astryx is a peer dependency: apps use Astryx directly and this package adds the pieces we reuse across repositories.

| Export | Kind | What it is |
| --- | --- | --- |
| `SidebarLayout` | Layout | App shell with a fixed navigation rail on desktop and a thumb-reachable drawer on mobile. The document owns scrolling, so momentum and overscroll stay native. |
| `LoginSplit` | Template | Sign-in page with an email and password form beside a cover image. |
| `ProjectSelector` | Component | The current project, with a searchable menu for switching projects. |
| `UserMenu` | Component | Account avatar and name that opens a menu of account actions. |

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
  navigationKey={location.pathname}>
  <ProjectsPage />
</SidebarLayout>
```

- **Mount one per document.** While it is mounted, the layout owns the document's scroll styles and restores them on unmount.
- **Pinned header and footer.** `navigationHeader` and `navigationFooter` stay put at the top and bottom of the sidebar (and of the mobile drawer), and the navigation scrolls between them. Plain text in `navigationHeader` is styled as a title.
- **The navigation list scrolls like the page.** While it overflows, it keeps native momentum and bounce without moving the page, and items fade out over 10px where they pass under the header or footer. A list that fits neither fades nor bounces. This is all CSS, driven by the list's own scroll timeline.
- **Routing stays in the app.** Pass the current route as `navigationKey` so the mobile drawer closes after navigation.
- **Page background.** `background` sets it. The same color fills the overscroll area unless `overscrollBackground` is set. Use `overscroll="none"` to turn off native bounce.
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

Examples import `@da-facility/ui`, which the catalogue maps to `src/`, so each example also shows how an app would use the package. The catalogue menu (⌘K / Ctrl+K) switches examples and toggles each example's tweaks. `/render/<example>` shows an example on its own.

To add something to the package:

1. Build it in `src/` and export it from `src/index.ts`.
2. Add an example in `catalogue/examples/` and register it in `catalogue/examples.ts`.
3. Add tests in `tests/`.

To open the catalogue on another device, list the extra host names in `.env.local`:

```ini
CATALOGUE_ALLOWED_HOSTS=my-machine.tailnet.ts.net
```

The native-overscroll tests run only on macOS, in a visible Chromium window, because rubber-banding exists only there. Chromium is still no substitute for testing on a real iPhone in Safari.

## Release

1. Bump `version` in `package.json` and add an entry to `CHANGELOG.md`.
2. Commit, then tag and push:

   ```sh
   git tag v0.2.0 && git push origin main v0.2.0
   ```

   The release workflow checks that the tag matches the version, builds the package, and publishes it to GitHub Packages.

Code adapted from Astryx keeps its license notice in `LICENSE.third-party`, which ships with the package.
