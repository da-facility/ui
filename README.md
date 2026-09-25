# Da Facility UI

React 19 components and layouts built with Meta Astryx. Private package; not published to npm.

## Use

```sh
bun add --trust git+ssh://git@github.com/da-facility/ui.git
```

Git installs build the package with Bun. Authenticate with GitHub to access the private repository. Pin a commit in consuming projects for reproducible installs.

```tsx
import {UIProvider, SidebarLayout, UserMenu} from '@da-facility/ui';

<UIProvider>
  <SidebarLayout
    title="My app"
    navigation={<nav><a href="/projects">Projects</a></nav>}
    headerActions={<UserMenu user={{name: 'Alex'}} items={accountActions} />}
  >
    <Projects />
  </SidebarLayout>
</UIProvider>
```

Styles load with the import. Consumers need React 19 and a bundler that supports CSS imports; no Astryx/StyleX build plugin is required. Mount one `SidebarLayout` per document. It owns document scrolling and restores its document styles on unmount.

- `SidebarLayout`: `background`, optional `overscrollBackground`, `overscroll="when-scrollable" | "none"`, and `navigationKey` to close the drawer on navigation.
- Mobile navigation defaults right. `mobileNavigationSide` and `onMobileNavigationSideChange` expose a left-handed toggle. Your app owns persistence. `mobileNavigationArtwork` fills spare space above navigation.
- `UserMenu`: user identity and caller-supplied actions; supports compact display.
- `LoginSplit`: brand, artwork, and async `onSubmit({email, password})`. Your app owns authentication and success navigation; rejected submissions display an error.
- `MobileSidebar`: lower-level mobile shell for custom layouts.

## Develop

```sh
bun install
bun run dev
bun run check
bun run build             # package + declarations
bun run build:catalogue   # preview app
UI_TEST_URL=http://localhost:5180 bun run test:ui
bun run test:package      # build, pack, install, and test a separate app
```

`src/` is the library. `examples/` contains demo data and screens. `catalogue/` contains browsing, routing, and tweaks. `scripts/` contains checks and the optional `bun run render --template sidebar --format png` exporter. Generated files are ignored.

The catalogue runs on Vite's default port, or the existing local preview at port 5180. Desktop/mobile browser checks include native macOS bounce; narrow Chromium viewports are not a substitute for real-device Safari testing.

Astryx-derived code retains its notice in `LICENSE.third-party`. Bundled dependency notices ship in `dist/THIRD_PARTY_LICENSES.txt`.
