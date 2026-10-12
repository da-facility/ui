# Da Facility UI

Layouts, templates and components for Da Facility apps, built on [Meta Astryx](https://astryx.atmeta.com). Astryx is a peer dependency: apps use Astryx directly and this package adds the pieces we reuse across repositories.

| Export | Kind | What it is |
| --- | --- | --- |
| `SidebarLayout` | Layout | App shell with a fixed navigation rail on desktop and a thumb-reachable drawer on mobile. Built on `PageScroll` and `ScrollArea`. |
| `LoginSplit` | Template | Sign-in page with an email and password form beside a cover image. |
| `LoginPocketId` | Template | Blank sign-in page with only a Pocket ID button, and an optional title for expired or failed sign-ins. |
| `StatusBar` | Component | Loud full-width bar that says which kind of site this is, such as staging. |
| `Assistant` | Component | Chat bar at the bottom of the screen that opens into a chat; the layout contracts around it. |
| `ProjectSelector` | Component | The current project, with a searchable menu for switching projects. |
| `UserMenu` | Component | Account avatar and name that opens a menu of account actions. |
| `PocketIdButton` | Component | Pocket ID's sign-in button: its logo and black pill, like the Apple and Google sign-in buttons. |
| `CycleButton` | Component | Button that steps through two to four states, such as light, dark and system theme. |
| `Toaster`, `toast` | Component | Sonner toasts in the Astryx theme. A toast can fly in from the element that showed it. |
| `PageScroll` | Component | Makes the document the page's scroller, with native bounce only while the page overflows. |
| `ScrollArea` | Component | Scroll box inside fixed chrome, with native bounce while it overflows and content fading under its edges. |

## Install

Install the package from npm with its peers:

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

### LoginPocketId

```tsx
<LoginPocketId href="/authentication/login" />
```

A blank page with only a Pocket ID button in the middle. `href` is the app's route that starts the Pocket ID sign-in; use `onSignIn` instead to start it from code. `title` and `description` explain why someone is here, such as an expired or failed sign-in, and `buttonLabel` changes the button's text, such as to "Try again". Leave out both `href` and `onSignIn` for a page without a button, such as "No access", where signing in again would not help. `brand` sits above the title and `footer` below the button. Like Pocket ID's own sign-in page, the button is focused when the page loads, so Enter signs in and its focus ring shows; `autoFocus={false}` turns that off.

The page is plain HTML and CSS with no effects, so it also renders on the server with `renderToStaticMarkup` for sign-in pages that load no JavaScript.

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
  context={pageName}>
  {messages.length > 0 && <Conversation messages={messages} />}
</Assistant>
```

A chat shell: the app owns the conversation and what happens to a message.
- **Closed:** a slim "Ask anything" bar below the full-screen page. The button toggles the chat; while it is open, hovering it shows that a click will close it.
- **Open on desktop:** inside `SidebarLayout`, the page's bottom edge rises and it shrinks into a card with a small margin, with the chat below it.
- **Open on phones:** a bottom sheet you can drag.
- **Message box:** grows as you type. Enter sends and Shift+Enter starts a new line. `context` shows as a tag inside it, for what the assistant can see.
- **Suggestions:** chips above the message box until there is a conversation; choosing one sends it.

Escape closes the chat on desktop. `label`, `placeholder`, `actions` (extra bar buttons) and controlled `isOpen`/`onOpenChange` are optional.

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

### PocketIdButton

```tsx
<PocketIdButton href="/authentication/login" />
```

Pocket ID's sign-in button, styled like the "Sign in with Apple" and Google buttons: Pocket ID's logo pinned left and a centred label, "Sign in with Pocket ID" unless `label` says otherwise. With `href` it is a link; without one, a `<button>` that calls `onClick`. `isFullWidth` stretches it to its container instead of its usual 280px.

Like other brand buttons, it copies Pocket ID's own primary button instead of using the app's accent: a black pill in light mode and a light one in dark mode, fading to 80% on hover, with Pocket ID's focus ring of a grey border inside a soft 3px halo. `autoFocus` focuses it when the page loads, as Pocket ID's sign-in page does, and the ring fades in after 100ms as it does there, without JavaScript. Set `--pocket-id-button-background`, `--pocket-id-button-hover`, `--pocket-id-button-foreground` and `--pocket-id-button-ring` on it to change them. The logo is inline SVG, so pages with a strict content security policy need no image source.

### CycleButton

```tsx
<CycleButton
  label="Theme"
  states={[
    {value: 'light', label: 'Light', icon: <SunIcon />},
    {value: 'dark', label: 'Dark', icon: <MoonIcon />},
    {value: 'system', label: 'System', icon: <ComputerDesktopIcon />},
  ]}
  value={theme}
  onChange={setTheme}
/>
```

An Astryx `Button` that moves to the next of its two to four states on each click, wrapping from the last back to the first. The type only accepts two, three or four `states`. The icon turns over and the label slides between states, and dots after the label show where in the cycle the button is. The button keeps the width of its longest label, so it never jumps. Its accessible name is the `label` and the current state, such as "Theme: Dark".

`isIconOnly` shows only the current icon, with the name as a tooltip. `variant`, `size` and `isDisabled` pass through to Astryx's `Button`. Leave out `value` to let the button keep its own state, starting at `defaultValue` or the first state.

`appearance="group"` shows every state side by side in a shared track, with only the current one raised, using Astryx's `SegmentedControl`. A click, the arrow keys, or dragging across the track with a mouse or finger choose a state directly, while vertical swipes still scroll the page. `isIconOnly` hides every segment's label. `size` and `isDisabled` still apply; `variant` does not. Four labelled segments are about 340px wide at the medium size, so use `size="sm"` or `isIconOnly` where that is too wide, such as in a phone card.

### Toaster and toast

```tsx
import {Toaster, toast} from '@da-facility/ui';

// Once, anywhere in the app.
<Toaster position="bottom-right" />

// From any code, such as a click handler.
<Button label="Archive" onClick={event => toast('Message archived', {
  description: 'It is in the archive folder.',
  action: {label: 'Undo', onClick: restore},
  from: event.currentTarget,
})} />
```

[Sonner](https://sonner.emilkowal.ski) (the toast shadcn/ui uses) in the Astryx theme: the card, text, buttons and icons take their colours, radius and shadow from the theme's tokens, so they follow the app's light and dark mode. `toast(message, options)` and `toast.success`, `.info`, `.warning`, `.error`, `.loading`, `.message`, `.custom` and `.promise` are Sonner's own, with its options (`description`, `action`, `cancel`, `duration`, `id`, `closeButton`, `onDismiss`, …), and `toast.dismiss(id)` hides one. The same `id` updates a toast in place.

- **`from`.** Pass the element that showed the toast (`event.currentTarget`), its `DOMRect`, or a viewport point, and the toast arrives from there like a shooting star: a star with a fading trail flies from its centre on a slight curve to where the toast sits, speeding up for about 240ms so it lands at its fastest. The trail is one smooth shape, widest and brightest at the star and fading to nothing behind it. On impact the card grows out of the landing point in about 200ms: a stand-in with the card's own surface, border, corners and shadow bursts out from the star's dot and settles, getting taller and wider together as its colour turns from the trail's to the card's, and the real card takes over on its last frame. Meanwhile the rest of the trail slides in after the star and fades, so the toast absorbs it, and once the card is open its text fades in. The star starts behind the element it came from, emerging from under it. It is quick enough that the eye is led rather than made to follow. Without `from`, or when the person prefers reduced motion, the toast slides in as Sonner's do. The trail is drawn on a short-lived canvas beneath the toasts and the opening is a Web Animation; nothing listens to scroll or resize.
- **Replacing a toast.** When `from` is an element inside another toast, such as its action button, the new toast takes that one's place instead of arriving: a wave in the trail's colour spreads from the pressed element and wipes the card clean, the card resizes to the new content where it stands in the stack, and the new content fades in. Nothing of the old toast carries over, and it is not dismissed, so an action like `onClick: event => toast.success('Message restored', {from: event.currentTarget})` turns the toast into its result.
- **`arrival`.** Sets how the shooting star looks: `color` (any CSS colour or token, the theme's `--color-accent` by default), `tailLength` (how much of the flight the trail covers, as a percentage, 45 by default) and `fadeOut` (how long the trail takes to vanish into the toast after impact, 180 ms). They are also the custom properties `--da-toast-arrival-color`, `--da-toast-trail-length` and `--da-toast-trail-fade-out` on the toaster, for setting in CSS. `momentum` starts the card a little back along the star's path so it settles onto its place, carrying the star's motion. `tintByType` colours the trail of error toasts red and of warning toasts yellow instead (`--da-toast-arrival-error-color` and `--da-toast-arrival-warning-color`, from the theme's data colours by default). The neutral theme's accent is near-black in light mode and near-white in dark mode, so pass a colour such as `var(--color-data-categorical-blue)` for a coloured trail.
- **`Toaster` props.** Besides `arrival`, `position`, `visibleToasts`, `expand`, `duration`, `gap`, `closeButton`, `richColors`, `offset`, `mobileOffset`, `hotkey`, `swipeDirections`, `icons`, `toastOptions`, `id`, `dir` and `label` pass through to Sonner. The theme follows Astryx's `Theme`, and the region's name and the close button's label are translated.
- **Custom cards.** `toast.custom` renders exactly what you return, unstyled; give it a card of its own.

Sonner is a dependency of the package, so apps do not install it themselves.

## Translations

Built-in text, such as "Close menu", "Login" or "Ask anything", goes through Astryx's `InternationalizationProvider`, so one provider translates Astryx and this package. Without one, everything is English and nothing needs setting up.

The package ships its catalogues as `@da-facility/ui/locales/en.json` (every key, with a note for translators) and `@da-facility/ui/locales/hr.json` (Croatian):

```tsx
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import hr from '@da-facility/ui/locales/hr.json';

<InternationalizationProvider locale="hr" messages={{hr: {...hr, ...astryxCroatian}}}>
  <App />
</InternationalizationProvider>
```

Keys start with `@da-facility.`. Change single strings with the provider's `overrides`, for example `overrides={{en: {'@da-facility.loginSplit.submit': 'Sign in'}}}`. Anything without a translation falls back to English. Props such as `title`, `label` and `placeholder` still win when they are set.

## Develop

```sh
bun install
bun run dev            # catalogue at http://localhost:5174
bun run typecheck
bun run test           # browser tests, desktop and mobile
bun run test:headless  # the same without native bounce, which opens visible windows
bun run test:package   # pack, install into a fresh app, and test it there
bun run screenshots    # desktop and mobile captures in artifacts/screenshots
bun run behaviour:record   # record how every catalogue state looks and reads, as a baseline
bun run behaviour:compare  # compare with the baseline after a change; the report shows every difference
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

Releases are published to npm from a version tag; the steps are in "Releasing" in [AGENTS.md](AGENTS.md). Each release's notes are its section of `CHANGELOG.md`.

The package is MIT licensed (`LICENSE`). Code adapted from Astryx keeps its license notice in `LICENSE.third-party`, which ships with the package.
