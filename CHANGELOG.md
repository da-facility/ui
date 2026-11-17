# Changelog

## 1.8.0

New:

- `MediaViewer` on phones: the panel's sheet always shows its top line whole under the image, with a handle; a tap on it brings the sheet up and puts it back (dragging still works). `sheetAction` puts a control at the end of that line, within the thumb's reach, such as Download; `sheetTitle` is what the line says (the panel's label by default). The Details button gives way to the sheet on phones.
- `MediaGrid` rows: `--da-media-row-min-tile` and `--da-media-row-min-tile-phone`, the narrowest a tile should be; a photo that would be narrower goes to the next row.
- `MediaViewer`: `reserveZoom` (on by default) keeps zoom's place in the header while the item has no `fullUrl`, so the header doesn't move when the larger image's address arrives.

Other changes:

- `MediaGrid` rows stay closer to their target height: each row is the first of the best breaking of the next 48 items instead of the first that fits, and a row depends on nothing after those, so rows on screen never change when pages arrive. On a photographer's mix, nine rows in ten are within a tenth of the target on a computer, and on a phone half are within 5 %.
- `MediaGrid` rows: a tile is between 1:2 and 3:1 (it was 1:4 and 5:1), and a photo beyond that is shown whole inside it (`data-fit="contain"`) instead of cropped: a panorama keeps the row's height instead of taking the row.
- The tile's selection mark is a 22px white ring with a tick on a soft scrim in the corner (it was an 18px dot), so it reads on bright photos; the tick shows faintly before the tile is chosen.
- `MediaViewer`'s header: zoom, Details and Close look alike (an icon and its name; the icon alone on phones, each still named), and none is drawn as a pill while open. The title comes first and the position after it on phones too, on its own line with its room kept.
- `PageTrail` on phones: the levels above the parent are behind a "…" button with an outline before the back link, where they stand, so the line reads from the top down; its menu lists the levels above the parent (the parent is the back link).
- `MediaViewer`: "Try again" over an image that didn't load is a button with an outline, and while the thumbnail shows the line says the larger image didn't load and a smaller one is shown (`@da-facility.mediaViewer.notLoadedLarger`).

## 1.7.0

New:

- `MediaGrid`: `layout="rows"` shows every image whole, at its own shape (`width`, `height`), in rows of equal height that fill the width, lower on phones (`--da-media-row-height`, `--da-media-row-height-phone`); an item without a size stays 3:2, so rows never jump. Only the rows near the window are in the document: 10,000 photos cost about what 200 do (under 5,000 document nodes). Find in page no longer reaches the rows that aren't drawn; keys, selection, Ctrl/Cmd+A and returning from the viewer still do. `total` (with `isTotalExact`) reserves the room of what isn't loaded yet as grey tiles, so the scroll bar keeps its size, and screen readers hear each tile's place ("5,001 of 10,000"). `sectionOf` puts items into sections under a heading with a count (`stickySections`, `sectionHeadingLevel`); an item's `caption` shows two lines on hover and keyboard focus, or always (`captions="always"`); `loadAhead` asks for the next page while the end is that many screens away (3). The default, `layout="grid"`, is unchanged.

- An image that doesn't load says so: a `MediaGrid` or `MediaTile` tile shows the broken-image mark and screen readers hear "couldn't be loaded" (`@da-facility.mediaTile.notLoaded`), until its `src` changes; `MediaViewer` says "The image couldn't be loaded." over the canvas with "Try again", which loads it anew (`@da-facility.mediaViewer.notLoaded`, `retry`).

Other changes:

- `MediaGrid` rows: a jump into what isn't loaded yet (with the scroll bar, or a restored position) stays where it was put while pages arrive above it; the grey stand-ins take no part in the browser's scroll anchoring.
- Numbers in translated strings get the locale's grouping, as untranslated English already did: `MediaViewer`'s position reads "5.001 / 10.000" in Croatian, not "5001 / 10000". Numbers a plural or select needs stay numbers.
- `MediaViewer` on phones: the position ("5,001 / 10,000") is on its own line above the title, so a long file name no longer cuts it off.

- `useMessages()` gives the same function for as long as the locale and messages stay the same, and parses each locale once. Components that pass it on (`MediaGrid`'s keyboard handler among them) no longer make memoized children redraw on every render: with 10,000 photos, every page that arrived redrew every block of the grid.

## 1.6.0

New:

- `TimeField`: a time of day on its own (`HH:mm`), for a time beside a `DateField` that may stay empty, built on Astryx's `TimeInput`. Empty is a value of its own (`undefined`), reached with the clear button or by deleting the text, and `placeholder` says what it means ("end of day"). Times follow the locale's clock (24 hours in Croatian); "17", "1700", "17:00" and "17.00" are all 17:00. `min`, `max` and `minuteStep` limit and step it, `isDisabled` with `disabledMessage` explains why it is off, and a finger gets the phone's own time picker. Its text is in `@da-facility.timeField.*`.

Other changes:

- `SidebarLayout` (and `Assistant`) keep the desktop rail in a window 600px tall: the phone layout (top bar or floating button, and the drawer) starts below 600px instead of at it, so a laptop window of 1280 × 600 is no longer laid out as a phone.

## 1.5.0

New:

- `DateField`: a date, or with `hasTime` a date and time, typed in the locale's order ("3. 12. 2026." in Croatian) or picked from a month calendar, built on Astryx's `DateInput` and `DateTimeInput`. The week starts on the locale's first day (Monday in Croatian), times follow the locale's clock, `min`, `max` and `isDateDisabled` limit the choice, a clear button empties it, and a finger gets the calendar in a bottom sheet (`touchPicker="native"` for the phone's own picker). In the calendar, Page Up and Page Down move by month and, with Shift, by year. Its text is in `@da-facility.dateField.*`, and `locales/hr.json` now also translates the Astryx date, time and calendar strings it shows.

## 1.4.0

New:

- `PageTrail`: breadcrumbs that keep to one line, beside `PageHeader`'s. Every level above the page is a link, or plain text without `href`. On desktop, when the line doesn't fit, the first level and the page stay whole, the levels nearest the page follow as far as there is room, and the rest go into a "…" menu; the trail measures itself again when its room or fonts change. On phones it is a back link to the parent and a "…" menu of every level above, both 44px tall. Its text is in `@da-facility.pageTrail.*`.
- `MediaCard`: `isFullHeight` fills the grid cell (also through a list item), with the meta lines and activity at the bottom edge, so the cards in a row are one height and their meta lines line up.
- `UserMenu`: `hasHeading={false}` leaves out the heading that repeats the person; `menuWidth` sets the menu's width, or `'trigger'` for at least the trigger's width; `label` names the trigger ("User menu: Alex Johnson alex@example.com"). The defaults are unchanged: the heading, 260px.

Other changes:

- `UserMenu`: the trigger's accessible name contains what it shows ("Account menu for Alex Johnson alex@example.com"), instead of the name alone, which left out the visible description (WCAG 2.5.3, axe's `label-content-name-mismatch`). Compact triggers keep "Account menu for Alex Johnson". The avatar is drawn over the trigger from outside the button, with clicks passing through, so its initials are no longer visible text the name leaves out; the trigger looks and behaves as before. In `@da-facility.userMenu.label`, `{name}` is now what the trigger shows.

## 1.3.1

Other changes:

- `SelectionBar`: the clear button has Astryx's default button size instead of `sm`, so it is as tall as a `Button` passed in `actions` at its default size and sits on the same line; the actions are centred on the row whatever their size.

## 1.3.0

New:

- `SidebarLayout`: `mobileNavigationTrigger="top-bar"` puts the phone menu button in a bar across the top, at the `mobileNavigationSide` edge, with `mobileTitle` (or `title`) beside it, instead of the floating button. The floating button stays the default. With the top bar, `mobileTopBarEnd` adds content at the bar's other end (such as a compact `UserMenu`), `mobileNavigationFooter` sets what the drawer shows below the navigation (`null` for nothing), and the drawer lists the navigation from the top with its X as the one close control.
- `SidebarLayout`: `--da-sidebar-width` sets the desktop rail's width (260px by default).
- `MediaGrid` and `MediaTile`: `state` (`'pending'` or `'failed'`) for an item whose image isn't there yet. The tile stays a link and selectable, shows a quiet well (with a broken-image mark when failed) and says why to screen readers. `src` is optional on `MediaGridItem` for this.
- `SelectionBar`: `isPinned` keeps the bar at the bottom of the window inside `SidebarLayout`'s content area even on short pages, without covering the last row at the end of long ones (`--da-selection-bar-inset` sets its distance from the sides).
- `MediaCard`: `emptyLabel` is said in the cover when there are no images, such as "No photos yet".

Other changes:

- `LoginEmailCode`: the email field's `autocomplete` is `email` instead of `username email`, which holds two field names where HTML allows one (axe's `autocomplete-valid`). Browsers still offer saved addresses.
- `ProjectSelector`: the button is named by what it shows, after the label ("Projects: Da Facility da-facility.app"), instead of an `aria-label` that left out the visible description and initials (WCAG 2.5.3, axe's `label-content-name-mismatch`). The project's initials are hidden from screen readers in the button and the list. The `@da-facility.projectSelector.trigger` message is now only the part read before the project, `{label}:`.

## 1.2.0

New:

- Astryx components for app screens are re-exported from the package (`Button`, `TextInput`, `Field`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Breadcrumbs`, `Table`, `TabList`, `SegmentedControl`, `RadioList`, `CheckboxInput`, `Skeleton`, `EmptyState`, `Tooltip`, `Badge`, `Token`, `Avatar`, `Spinner`, the `SideNav` parts, `Theme`, `InternationalizationProvider` and more; the README lists them), so an app can import its whole UI from `@da-facility/ui`. They are the app's own Astryx components, and unused ones are left out of its bundle.
- `MediaViewer`: a full-window viewer on a native `<dialog>`, dark in light and dark mode, with the image fitted and never cropped, the thumbnail shown until the preview loads, preloaded neighbours, previous and next by button, arrow key and swipe, zoom into a larger image with panning, a top row with the title, position and close, and a side panel slot (beside the image on desktop, a sheet under it on phones, toggled with I). Its callbacks let the app make it a route. Its colours come from the `--da-media-*` custom properties, and Astryx components in its panel take them too.
- `SelectionBar`: the bar shown while items are selected, with the count (in the locale's plural form), a summary, actions and a clear button. It sticks to the bottom of the content area without covering the last row, is announced as a status, inverts the theme, and Escape clears.
- `MediaGrid` and `MediaTile`: an even grid of 3:2 image tiles that are links, with selection (the corner circle, Space, Shift ranges, a long press on touch screens, Ctrl/Cmd+A for everything loaded), one tab stop with arrow keys, loading wells, and paging through `onLoadMore` that tolerates short pages. It stays smooth with tens of thousands of items: row blocks with `content-visibility: auto` keep off-screen tiles out of layout and paint, without scroll listeners. Coming back after opening a tile returns to it at the same place on screen.
- `MediaCard`: a link card for a project or gallery, with a 16:9 cover of up to three images, the title, meta lines, and a dot for recent activity that screen readers hear as "New".
- `PageHeader`: the top of a page, with Astryx breadcrumbs, the page title, a meta line joined with " · ", actions that wrap under the title on phones, and a row for a search field and filter chips.
- `LoginEmailCode`: a template beside `LoginSplit` and `LoginPocketId` for signing in with a one-time code: an email address, then the code. The app passes async handlers and returns why a code was turned down; the page shows wrong and expired codes, a resend cool-down, and a lock with a countdown after too many attempts. A brand panel sits beside the form on the dark media canvas.
- `CodeInput`: a one-time sign-in code as a row of boxes over one real input, so paste, the browser's one-time-code autofill and screen readers work. It completes on the last digit, is read-only while checking, and shows an error above the boxes.

## 1.1.1

1.1.0 was tagged but never published to npm, because npm only accepts provenance from GitHub-hosted runners and the release ran on Blacksmith. This release publishes its changes.

New:

- Supports Astryx 0.6 as well as 0.5: the `@astryxdesign/core` peer range is now `^0.5.4 || ^0.6.0`, and the package is developed and tested against 0.6.8.

Other changes:

- `SidebarLayout` keeps the padding of an Astryx `LayoutContent` inside it with Astryx 0.6, whose `LayoutContent` otherwise loses its side padding outside an Astryx `Layout`.

## 1.1.0

Tagged but not published to npm; its changes shipped in 1.1.1.

## 1.0.0

The first public release, published to npm.

New:

- `PocketIdButton`: Pocket ID's sign-in button, like the Apple and Google sign-in buttons, with Pocket ID's logo pinned left and a copy of Pocket ID's primary button: its black pill, which turns light in dark mode, and its focus ring. It is a link with `href` and a button without one, and `autoFocus` focuses it on load.
- `LoginPocketId`: a blank sign-in page with only a Pocket ID button, and an optional title and description for expired or failed sign-ins. Without `href` or `onSignIn` it has no button. Like Pocket ID's sign-in page, it focuses the button on load. It renders on the server, for sign-in pages that load no JavaScript.
- `CycleButton`: an Astryx button that steps through two to four states, such as light, dark and system theme, with a turning icon and dots showing its place in the cycle.
- `CycleButton` takes `appearance="group"`, which shows every state side by side as an Astryx `SegmentedControl`, with only the current one raised. Dragging across it with a mouse or finger selects the segment under the pointer.
- `Toaster` and `toast`: Sonner's toasts (the ones shadcn/ui uses) in the Astryx theme, with every variant and option, translated built-in text, and light and dark mode from the theme's tokens. `toast(message, {from: event.currentTarget})` makes the toast arrive from the element that showed it: a star with a fading trail flies to the toast's place, and the card grows out of its impact, bursting out from the star's dot and settling as its colour turns into the card's, while absorbing the trail, and its text fades in once it is open. The star starts behind the element that launched it. `arrival` on `Toaster` sets the trail's colour, length and fade out, `tintByType` turns error trails red and warning trails yellow, and `momentum` lets the card carry the star's motion as it settles. A toast shown `from` inside another toast, such as from its action button, replaces that toast in place: a wave wipes the card, which resizes to the new content and fades it in. It is skipped for people who prefer reduced motion. Sonner is a dependency of the package.

Breaking changes:

- Published to npm instead of GitHub Packages. Remove the `@da-facility` lines from the app's `.npmrc`; `bun add @da-facility/ui` now installs it without a token.

Other changes:

- MIT licensed, and the repository is public.

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
