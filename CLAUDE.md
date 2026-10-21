# Working in this repo

Capacitor-wrapped React web app targeting Android. See README.md for the full
picture; this file is the short version of what to keep in mind when editing.

## Non-negotiables

- **The app makes no model calls, and nothing generates content.** There is no
  assistant, no AI recommendations and no try-on. Every guide, style and step
  ships inside the bundle and was written by a person; screens filter and rank
  that content on the device. Do not reintroduce a model call — the rescue flow
  has to work with no signal, and the app's claim that nothing it shows was
  invented is load-bearing.
- **Never put a secret in client code.** Anything prefixed `VITE_` is inlined
  into the bundle and ships inside the APK and every pushed update. The app
  holds no key of any kind; the service key exists only inside the Edge
  Function's environment, where Supabase injects it, and `vite.config.ts`
  refuses to build if a `VITE_` Supabase key appears.
- **No CDN assets.** The app must render fully offline from local assets. Fonts,
  icons, and images are npm imports or files under `src/assets/`, never
  `<link>` or `<script src="https://...">`.
- **The update check sends nothing, and must keep sending nothing.**
  `src/lib/updates.ts` GETs `latest.json` from the public `releases` bucket
  in Supabase Storage on open and on return (six-hourly at most), via
  `CapacitorHttp` so it does not depend on CORS. `UpdatePrompt` offers a
  new APK when its `versionCode` is higher, or else a **pushed update** —
  a zip of `dist/` — when its `bundle.code` is above the running
  `__BUNDLE_CODE__` and this APK is at least its `minVersionCode`.
  No profile field, no identifier, no query string — the privacy policy,
  FAQ, About and the landing page all say so. Adding anything to that
  request is data collection: policy first, as below. It never downloads or
  installs on its own: the user taps Download (Android confirms) or Update
  now (the updater verifies the zip's SHA-256 against the manifest, then
  reloads). `UpdateManifest` in `types.ts` is the contract with
  `scripts/lib/release-manifest.mjs`, which both `site:release` and
  `ota:publish` write it through.
- **Pushed updates keep the APK constant.** Web changes ship with
  `npm run ota:publish`, which leaves versionCode, package id and
  signature alone; `npm run apk` is only for native changes (a plugin, a
  permission, the icon, anything in `android/` or `capacitor.config.ts`),
  because a bundle cannot carry those. The updater is
  `@capgo/capacitor-updater` in manual mode, and **every Capgo endpoint is
  blanked in `capacitor.config.ts`** — its defaults report update events,
  crashes and WebView errors to Capgo, which would make the privacy policy
  false. Never set `statsUrl`, `updateUrl` or `channelUrl`, and never turn
  `autoUpdate` on. `markBundleHealthy()` runs from `UpdatePrompt`'s first
  effect so a bundle that crashes on load is rolled back; keep it after the
  first render, not before. A Play build leaves the manifest URL unset.
- **No analytics, and this was decided rather than overlooked.** Google
  Analytics was considered and declined on 2026-09-11: `gtag.js` is a
  remote script, and more importantly the app tells users in three places
  — the privacy policy, the FAQ and About — that it collects nothing and
  that nothing leaves the device, and the landing site (`site/`) repeats
  it publicly. That promise is a feature, not an omission. Anything that
  would collect usage data needs those four pages rewritten and
  `docs/play-release.md`'s data-safety note changed in the same commit.
  The landing site holds itself to the same rule: no analytics, no
  cookies, nothing loaded from another origin — its footer says so.
- **`tailwind.config.js` is the single source of truth for the palette.** The
  token *names* are the prototype's, verbatim; the colour *values* are the
  brand's four — Light Cream `#E8D5C0` (the page), Burnt Orange `#E2583E`
  (actions), Dark Chocolate `#5A2108` (headings and text), Deep Espresso
  `#3F1708` (the illustration) — declared as `brand-*` tokens with every M3
  role derived from them. Two rules follow:
  - **`primary` is the chocolate, not the orange.** `text-primary` is the
    heading colour in 88 places, and orange on cream is 2.5:1. The orange
    lives in the *filled* roles (`primary-container`, `secondary`,
    `surface-tint`) where it carries cream or white on top of it.
  - Don't invent token names or hardcode hex in components. If a value is
    missing, add it to the config under the name the prototype uses, derived
    from one of the four.

## Conventions

- **The app is six sections, not a flat list of screens.** Hair SOS
  (`/sos`), Hair Styles (`/styles`), Hair Care (`/care`), Hair Growth
  (`/growth`), Locs World (`/locs`) and My Hair Profile (`/profile`).
  All six are drawer entries, in that order. There is no Home entry:
  Hair SOS *is* the front page, so a separate Home would point at the
  same screen. About, Privacy, Terms and Contact sit at the base of the
  drawer.

  **Six sections, four tabs.** The bottom bar carries SOS, Styles,
  Growth and Profile and stops there — five was the old ceiling and four
  is the structure. Hair Care and Locs World are drawer-only, each
  reached from the screen that needs it as well. The tab labels stay at
  the short form (`SOS`, `Styles`, `Growth`, `Profile`) because a
  quarter of a 412px screen does not hold "My Hair Profile"; the full
  names live in the drawer, the page headings and `titleForPath()`.

  **Locs World (`/locs`) is deliberately *not* under Hair Care.** Locs
  are a different thing to own, not a chapter of general care, and
  filing them under it is how a loc wearer ends up reading loose-hair
  technique. `/sos` shows a card pointing at it only when
  `isLocs(identity)`. That card is a pointer, not a fourth door.

  **Hair SOS is triage, not a page.** `/sos` asks "What's your
  emergency?" and offers two doors: `/sos/quick` (Quick Hairstyle — the
  `TIME_BANDS` over the ranked library) and Hair Care (`/care`). It used
  to be all of that on one scroll, which asked someone mid-problem to
  read the whole app first. Another door is almost always the wrong
  move: a short list is what makes it triage rather than a menu. `/sos`
  is still the one tab with children, so its `NavLink` deliberately
  omits `end` and stays lit inside them.

  There was a third door, **Hair Problem** (`/sos/problem` — the Quick
  Hair Check, featured rescues and every care guide), removed from this
  page on request. The screen and its route are untouched; what went is
  the way in from the front page. **Hair Care now carries that entry
  point**, as card E ("Something is wrong"), because "what is wrong with
  my hair" is the same question as the four traits above it and because
  putting it there keeps this screen at two doors. Do not rebuild the
  third door here — and do not remove card E without giving the guides
  another home first, or the only links left are the `<SectionCrumb>`
  inside a guide and the Locs World pointer that only loc wearers see.

  **The Hair Care door leaves the section.** It points at `/care`, which
  is a section of its own, not a screen under `/sos`. Hair Care spent a
  spell as a block on the Growth tab — the reasoning being that knowing
  your hair, scheduling it and buying for it are the *causes* of the
  retention Growth measures — and in practice that made one very long
  page out of two jobs: someone opening Growth to log a length check had
  to scroll past seven cards. Both older addresses (`/sos/care` and the
  Growth block) now resolve to `/care`. Do not reintroduce a screen at
  `/sos/care`.

  Hair Care is a hub and must stay one. `identity` is written in exactly
  two places — the quiz and the profile screen — and a third set of
  pickers would be a third thing to keep in step with
  `identityFieldsFor()`. Its "know your hair" cards show the value the
  profile already holds and link to where it is set.

  **Hair SOS is also the front page.** One screen answers to `/`,
  `/home` and `/sos`: a collage of three library photos, the title and
  one line fill the first viewport with Get Started at its foot, and the three doors are
  directly below, where Get Started scrolls to rather than navigates.
  These were two screens — a wordless cover outside `AppLayout`, then
  the triage — which spent a tap per launch on an app people reach for
  mid-problem, and left the drawer with a "Home" that was none of the
  sections. Three consequences to keep:

  - It renders **inside** `AppLayout`, so the app bar and tab bar are
    there on launch. Chrome-free meant landing with no way into Styles,
    Care, Growth or Profile except through a door, and a tab bar that
    blinked out on one screen and back in everywhere else.
  - The SOS tab and the drawer's Hair SOS entry carry an `also` list of
    `['/', '/home']`. Without it nothing is selected on the page every
    launch lands on — `NavLink` matches one path.
  - It stays nearly wordless: the title and one line under it, after
    the reference mockup. Copy added above the doors is copy nobody
    reads: put it where it is relevant instead (About for the data
    stance, the doors for what the app is for). The collage photos are
    decoration — hidden from screen readers and not links, so the first
    screen keeps one target.

  All three addresses render rather than redirect, so the address
  someone typed is the address they keep, and all three share one entry
  in `titleForPath()` — one screen, one title.

  Everything else belongs *inside* one of the six and is reached from it,
  never from the drawer or the tab bar: the care guides under Hair SOS;
  the porosity test, the product shelf and the calendar under Hair Care;
  the user's own worn styles under Hair Growth; the hair quiz under My
  Hair Profile; community tips under About; contributing a style
  (`/styles/submit`) under Hair Styles.
  A screen that lost its tab (`/calendar`, `/products`) carries a
  `<SectionCrumb>` naming its parent, and so does `/styles/submit`. Adding
  a new drawer entry is almost always the wrong move — find the section it
  belongs to.
- **The tour and the documentation describe the structure above, so
  they move with it.** The welcome tour (`src/lib/tour.ts` for the
  steps, `src/components/Tour.tsx` for the overlay) offers itself once,
  on the front page, to a profile with no `tourSeenISO`; finishing or
  declining sets it, and `/docs` replays it. Each step spotlights a
  `data-tour="…"` element and falls back to a centred card if that
  element is missing, so renaming one silently loses the highlight but
  not the step. `/docs` (`DocsScreen`) sits with About and FAQ at the
  foot of the drawer, not among the six. It is the manual, and like the
  FAQ every sentence in it is a claim about the code: when a section,
  door or ranking rule changes, change its step and its docs section in
  the same commit. Lists the code already holds (time bands,
  categories, occasions, preferences, climates) are read from
  `types.ts` rather than retyped.
- **Ask (`/ask`) is search that quotes, not an assistant.** It sits
  behind the search icon in the app bar on every screen, not in the
  drawer or the tab bar: it is a way into the six sections, not a
  seventh. `src/lib/ask/` ranks a corpus built at runtime from the
  content files and shows the best passage *verbatim* with a link to
  its page; the only sentences that are not quotes are the fixed lines
  in `src/content/ask.ts`. Four rules:
  - Never compose an answer from fragments, reword a passage, or let a
    template interpolate advice. A quote that does not fit is a missing
    passage in the content, not a reason to write one in Ask.
  - Hair type filters exactly as it does everywhere (`hairTypes`,
    `styleExclusion`, `rankProducts`), and a question naming locs is
    answered for locs. When the best match was filtered out, the screen
    says so — it never quietly substitutes.
  - A `caution` is shown in full beside its passage, and a question
    with a red-flag word leads with the documentation's dermatologist
    line. Outline sections of Locs World answer as "not written yet",
    with their topics as chips, never as advice.
  - Nothing is stored or sent. The question lives in the URL and the
    Earlier list in memory. Persisting questions would be data
    collection under the analytics rule above.

  The vocabulary in `content/ask.ts` is where most quality comes from.
  When Ask misses a real question, add it to `src/lib/ask/cases.ts`
  first, then fix the vocabulary or weights until `npm run ask:eval`
  passes. How-to topics restate `/docs`, so they move with it. Links
  into a long screen use `?open=<id>` (`src/lib/deep-link.ts`) because
  a second `#` would be read as a route; FAQ, Docs, Locs World, the
  Quick Hair Check and Products honour it.
- Screens live in `src/screens/`, shared UI in `src/components/`.
- **Hair type is the fork above everything.** `identity.hairType` is
  `'Loose Natural' | 'Locs'`, and styles, guides, products, the calendar's
  default schedule and the SOS screen's concern chips all branch on it. Loose-hair technique applied to locs is destructive, not
  merely unhelpful, so a `Style` with no `hairTypes` defaults to loose-only
  — a new entry opts in to being shown to loc wearers, never out. Loc
  derivations (stage from install date, retwist cadence) live in
  `src/lib/locs.ts`.
- The request/response contract between the app and the submissions
  function (`supabase/functions/submissions/`) lives in
  `src/lib/types.ts`; both sides import it so a shape change fails typecheck.
- **`bio` is not `identity`.** `identity` is facts about the hair;
  `bio` is name, photo and climate. None of the profile crosses the wire
  — the only request carrying user data is a style submission, which is
  built from the submit form, not the profile. Climate is a picker over
  `CLIMATES` rather than free text, which is why it is four coarse bands
  rather than a city.
- The hair quiz (`src/lib/quiz.ts`, `/quiz`) and the pickers on the
  profile screen write the same `identity` fields. The quiz asks in terms
  of what a person can observe on their own head; the pickers assume they
  already know the category. Keep both — and keep the quiz's step list
  in step with `identityFieldsFor()`, or the completeness meter and the
  quiz will disagree about what "done" means. The porosity questions and
  scoring live in `src/lib/porosity.ts` because two screens run them.
- Styles resolve four image slots each — `style-<id>-front|back|side|round`
  — through `styleAngles()` in `src/assets/imagery.ts`. Cards use
  `styleCover()`, which prefers the front shot and falls back through the
  other angles to the legacy un-suffixed file. Every angle renders a
  placeholder when its file is missing, so the layout is final before the
  photography is; the prompts are in `docs/image-prompts.md`. The full
  gallery lives on `/styles/:id`, not on the card.
- **The style library is contributed content, and nothing else.** The
  placeholder entries the app shipped with are gone; `STYLES` holds only
  what people have actually submitted. Two live consequences: it is
  **entirely loose-hair**, so a loc wearer sees an empty shelf and
  `StylesScreen` says so plainly rather than blaming their profile — do
  not "fix" that by relaxing the loose-only default on `hairTypes` — and
  every entry has `steps`, so an entry without them is a draft.
- Contributions are `StyleSubmission` on the profile, written by
  `/styles/submit` and seeded from a `MyStyle` via `?from=<id>`. There is
  **no community backend**: a submission is queued on the device and the
  screen says exactly that rather than showing a success tick and
  dropping it. Wiring a server later is a `status` transition
  (`Queued` → `Sent`), not a schema change. `rightsConfirmed` is a
  required claim, not fine print — see the images README for why.
  Withdrawing one deletes its photo files *before* the profile write,
  the same order `MyStyles` uses.

  **The form is short on purpose:** style name (shown, not asked, when
  `?name=` picked it), description, photos, credits, plus hair type when
  nothing set it and the rights tick. Category, timings, occasions,
  steps and kit were removed on request because the long form was not
  getting finished; the reviewer writes up what a library entry needs,
  so "an entry without steps is a draft" still holds for `STYLES`.
  The submissions function accepts a description *or* two steps (older
  queued rows carry steps) and no longer requires a category. Don't add
  fields back without a reason a contributor would accept.
- The thirty packed-and-parted styles came from the shared Hairstyle
  Library Drive folder. `npm run images:import` re-imports their photos
  from the mapping in `scripts/drive-images.json`. They are screen
  recordings, so the import first finds the photograph inside the frame
  — letterbox bars and the blurred filler beside a pillarboxed video are
  detected as *low-detail* regions, in two passes because the bars have
  to go before the columns can be read — then grows that box out to 4:5
  rather than magnifying it, and only then crops. Every surface draws
  these `object-cover`, and left to the browser a 720x1612 frame centres
  on a shoulder. `--no-trim` skips the detection. **Those files are not
  release-cleared** — they are watermarked frames from other people's
  social videos; see `src/assets/images/README.md` before shipping.
- **The style photos on disk now are generated, not imported.** Every
  Drive frame was removed (still in git history), and the slots are cut
  from the triptychs in `Claude outputs/` by `npm run images:generated`
  using `scripts/generated-images.json` — one sitter, one top, one cream
  backdrop, front | back | side, so only the hair changes. A sheet whose
  `style` is `null` is held back on purpose: a picture beside the wrong
  method is worse than a placeholder. Because the pictures are generated,
  the gallery, About, FAQ, Styles, Quick Hairstyle and the landing site
  say so — the claim is that nothing you *read* is generated. Don't
  re-run `images:import`; it would bring the uncleared frames back.
- **Loc styles are a lookbook inside Locs World, not library entries.**
  `/locs/styles` (`LocStylesScreen`, content in `src/content/loc-styles.ts`)
  shows the 18 styles from the AfroCoils Hairstyle Library PDF: names
  and descriptions word for word. They have no steps, so they stay out
  of `STYLES`. An entry there without a method is a draft, and moving
  one across would hand loc wearers a ranked shelf of styles nobody has
  written up.

  Their pictures are **generated**, like the library's: triptychs in
  `Locs Images/Generated images/` cut by `npm run images:locs` (same
  cutter as `images:generated`, in `scripts/lib/triptych.mjs`) into
  `loc-style-<id>-front|back|side`, with `-<n>-` for a second look, and
  read through `locStyleLooks()`. The sheet-to-style mapping is
  `scripts/loc-generated-images.json` and is never guessed from a
  filename; `style: null` holds a sheet back. Five styles have no sheet
  yet and draw placeholders, and each of those plates — and the "Help
  finish the lookbook" block at the foot — links to `/styles/submit`
  with `?name=<style>&hair=Locs`, which pre-fills the form. Only `Locs`
  is honoured for `hair`. The salon photos the lookbook used to carry
  were moved to `Locs Images/Removed from app/` for the owner to delete —
  don't bring them back into `src/assets/images`.

  **Locs World looks like its own place on purpose.** Both its screens
  open with `<LocsMasthead>` — Deep Espresso, cream type, drawn strands —
  and the lookbook is numbered espresso plates with a Front / Back /
  Side switch. It is still the four brand colours through the `inverse-*`
  and `tertiary` roles; keep it that way rather than adding tokens.
  `/locs/styles` honours `?open=<style id>`, and Ask links there.
- **Hair length ranks, it never excludes.** `suits.lengthBand` is a soft
  signal, unlike `hairTypes` and `locStage` which are hard filters — most
  of these styles survive shorter hair with a bun piece at the tip, and
  the source directions say so. The band is *derived* from the latest
  length check via `deriveLengthBand()` in `src/lib/growth.ts`, not asked
  for: the Growth tab already records inches, and its cut points are the
  `MILESTONES` landmarks so the two cannot drift apart.
- `Style.occasions` reuses the SOS screen's `Occasion` union rather than a
  second vocabulary, so "what can I wear to work" means one thing app-wide.
  `Style.needs` names kit as categories, never brands — `products.ts` is
  the one file allowed to name one.
- Use the design tokens (`bg-surface-container`, `text-on-surface-variant`,
  `p-lg`, `font-headline-md`) rather than raw Tailwind scales, so the prototype
  and the app stay visually in sync.
- **The look follows the reference mockup adopted on 2026-10-19**, drawn
  in the four brand colours rather than its own: one face (Plus Jakarta
  Sans, bold for headings), a cream-to-peach wash on a fixed layer behind
  `AppLayout` (`.page-wash`), white cards that float by `shadow-card`
  rather than a border, white chips that turn espresso when selected,
  and the tab bar as a floating espresso pill where only the current tab
  — an orange pill — shows its label (the others keep it as
  `aria-label`). White on the orange is 3.6:1, so text on it is bold.
- Routing is hash-based. Don't switch to `BrowserRouter` — it 404s on reload
  inside the Capacitor WebView.
- User state goes through `useHairProfile()` from `src/lib/profile-store.tsx`,
  never `localStorage` directly. One versioned document, one key; add a field
  to `HairProfile` in `types.ts` and `migrate()` in `storage.ts` backfills it
  for anyone with an older document.
- Screens read the profile, they don't hold their own copy of it. A screen
  that needs a value the profile lacks should add it to the model rather than
  keeping local state that dies on navigation.
- **`document.title` is one map, not a call per screen.** `titleForPath()`
  in `src/lib/page-title.ts` derives a distinct title from the path,
  including the two routes whose title is content (a guide, a style).
  `AppLayout` applies it, front page included. Child effects run before
  parent effects, so a
  screen setting its own title would lose the fight with the layout —
  which is the other reason they all live in the map. Add a route, add a
  title.
- **The privacy policy is written and must stay true.** `/legal/privacy`
  describes exactly what the app stores and the one thing that leaves the
  device. Anything that adds data collection — analytics, a crash
  reporter, accounts — makes several statements there false, and the FAQ
  and About repeat them. Change that page first, then the FAQ, then the
  landing site's Privacy section and FAQ (`site/index.html`), then
  `docs/play-release.md`'s data-safety note.
- **The landing site states nothing by hand.** `site/` is the public page
  and the APK download, built separately (`npm run site:build` →
  `dist-site/`) so it never ends up inside the APK. Its counts, the Locs
  World chapter list and the Quick Hairstyle examples are read from
  `src/content/` by `vite.site.config.ts`; version, size, SHA-256 and
  minimum Android come from `site/release.json`, which
  `npm run site:release` writes from the APK itself. The HTML uses
  `%placeholders%` and the build fails on an unknown one — do not replace
  one with a literal. Its phone mockups are copies of real screens: when a
  screen's copy or structure changes (the doors, the tab bar), change the
  mockup in the `<template>` too. No style photograph appears on it, for
  the same reason none is cleared to ship.
- New icons must be added to `src/components/icon-codepoints.json` with their
  Material Symbols codepoint — `IconName` is derived from that file, and the
  font subset is built from it, so an unlisted icon is a type error.
- **The brand logo is one file, cut many ways.** The artwork is
  `src/assets/brand/afrocoils-logo.png`; `BrandMark.tsx` serves `hero`
  (the whole logo, wordmark included, beside the front page's title) and
  `mark` (the illustration alone, for the app bar, drawer and footer).
  `<BrandLockup>` draws the mark beside the logo's own wordmark, cut from
  the same file, so nothing retypes the words "AfroCoils" — which is how
  the prototype ended up with a footer that said something else. The
  favicon in `public/`, the launcher icons and the splash screens under
  `android/app/src/main/res/` are cut from the same artwork, with its
  cream field keyed out. Replace the artwork with `npm run brand:import`,
  which regenerates every one of them in the same pass; never edit one by
  hand. The launcher icon and splash are native, so they reach phones
  only through `npm run apk`, not a pushed update.
- Lengths are stored canonically in inches; `lengthUnit` is display only.
  Convert at the edges with `toDisplay`/`fromDisplay` from `src/lib/growth.ts`,
  never by rewriting stored rows.
- Derivations that a user could dispute (retention, milestone ETAs, style
  ranking) live in `src/lib/growth.ts` and `src/content/styles.ts` as pure
  functions, not inside a screen — so they can be read and tested alone.
- **Browsing and recommending are two screens, not two halves of one.**
  `/styles` is the general library — everything, by category and occasion
  — and carries a button at the top to `/styles/recommended`, which is
  the profile-driven list. `StyleCard` is shared between them so the two
  read as one shelf seen two ways.

  The recommendations screen states the criteria it used, and that list
  has to stay true to `rankStyles`. Today it is: hair type (a hard
  exclusion), length band (derived from the last length check, ranks
  only) and the care preferences. **Porosity, density and curl pattern
  are deliberately named as *not* ranking**, because no contributed entry
  declares them — `suits.lengthBand` is the only soft signal any style in
  the library carries. If a contribution ever declares one, `rankStyles`
  already scores it and that note is what needs editing.
- A style that clashes with an enforced preference is dropped from the list,
  never shown greyed out — a lower position in a list is not a guarantee,
  and the cost of getting it wrong is somebody's hair. `styleExclusion()`
  is the one place that decision is made. Hair type and loc stage are
  exclusions of the same kind.
- **User photos are files, not fields.** `MyStyle.photos` holds filenames;
  the bytes live on disk via `src/lib/photos.ts`. The profile document is
  read whole on launch and rewritten on every edit, so base64 images inside
  it would eventually exceed what SharedPreferences holds. Deleting a style
  must delete its files too — files first, then the profile write.
- Calendar days are `YYYY-MM-DD` strings in local time, never timestamps
  and never `Date.parse` of a bare date string (that is UTC midnight, which
  is the previous day west of Greenwich). Use `dateKey`/`parseKey` from
  `src/lib/calendar.ts`. "Next due" is always derived from the last logged
  event plus a cadence, never stored.
- Reminders schedule only the *next* occurrence and are rebuilt from
  scratch whenever the schedule or history changes. `SCHEDULE_EXACT_ALARM`
  is deliberately stripped from the merged Android manifest — Play
  restricts it to alarm and calendar apps, and the plugin falls back to an
  inexact alarm on its own.
- Products in `src/content/products.ts` name real brands, and it is the
  only file in the app that does — everywhere else speaks in categories
  ("a creamy leave-in"), because a brand name is a claim that the product
  is still made the same way and this is the one place that claim is
  written down and reviewable. There are also no product images: the app
  has no licence to a brand's packaging shots.
  `src/content/hair-check.ts` is the near miss: its `ingredients` lists
  read like a label (niacinamide, shea butter, zinc pyrithione), which is
  a fact about a formulation rather than a claim about a product. Keep it
  that way — the moment a brand appears there, there are two files to
  review instead of one.
- **`src/content/loc-care.ts` ships in two states, and the difference is
  visible on purpose.** A section is either written — real signs,
  solutions and label advice, drawn as a checked list — or
  `outline: true`, a list of the topics a written guide will cover, drawn
  as grey chips with one line at the top of the screen saying so. A
  bullet reading "How locs form" is a heading somebody still has to
  write, not an answer, and rendering it as advice would make the app
  claim it knows something it does not. Fill one in by putting the prose
  in `blocks` and deleting the `outline` flag; nothing else changes. Same
  bargain the image slots take, and for the same reason. A block of
  things to *avoid* carries `tone: 'avoid'` and is drawn with a struck
  marker — a tick beside "petroleum-heavy products" reads as an
  instruction to use them.
- **The Quick Hair Check does not diagnose**, and four of its entries say
  so in the content itself. `hair-check.ts` carries twenty-four concerns
  as symptoms ("my hair is… falling out"), and hair loss, bald patches, a
  receding hairline and scalp bumps each carry a `caution` — three of
  them *instead of* an ingredient list, because no cosmetic is the answer
  and offering one would be the app making a medical claim. A `caution`
  is content, not a disclaimer: never drop one to tidy a card, and never
  add a shopping list to an entry that deliberately has none.
  `hairCheckFor()` applies the same hard hair-type filter as everything
  else — anything turning on detangling, combing or a curl pattern is
  loose-only, which is the whole "My curls are…" group plus tangling and
  breakage, because the screen's own subtitle promises the user that what
  is on it is written for their hair type.

## Porting a new prototype screen

1. Drop the HTML in `prototype/` as `screen-NN-name.html`.
2. Diff its inline `tailwind.config` against `tailwind.config.js`; add any new
   tokens.
3. Create `src/screens/NameScreen.tsx` and replace the placeholder in
   `src/App.tsx`.
4. Convert `class` → `className`, `<a href="{{DATA:SCREEN:...}}">` → `<Link>`,
   and inline `<span class="material-symbols-outlined">name</span>` →
   `<Icon name="name" />`.
5. Drop the prototype's own `<script>` micro-interaction block — Tailwind's
   `active:scale-95` covers it and the script assumes a single-page DOM.
6. Drop any AI entry point it carries. `prototype/screen-04-sos.html` is kept
   as the design record, unedited, so it still has a "Quick Chat with AI"
   button and an Ask AI FAB in it. Those are history, not a spec — the app
   has no assistant. Re-tone any cool colour it brings with it, too.

## The one server route

`supabase/functions/submissions/` is a Supabase Edge Function that
receives a style offered to the community library, and it is the only
server code — there is no model client, no prompt and no
`ANTHROPIC_API_KEY`. Under `_shared/`: `cors.ts` is the CORS policy,
`limits.ts` one route's counters, `store.ts` the records and the
photographs, `supabase.ts` the connection all three use, and `env.ts` the
two Deno globals, declared so `tsc -b` checks these files with the app.
Keep them to web APIs (`fetch`, `crypto`, `atob`) — no `Buffer`, no
`process`. It moved here from a Vercel function on 2026-10-21; Vercel now
builds only the landing page. Deploy with `npm run backend:deploy` (JWT
verification off: the app holds no Supabase key to present).

**The backend is one Supabase project**, `runhkccoeyxfgsfrzezn`, and the
migrations under `supabase/migrations/` define it (`npm run db:push`).
Four rules there are load-bearing:

- **The service role key is server-only, and there is no anon key.** It
  bypasses row-level security entirely. Supabase injects it into the
  function's environment, so it is never copied anywhere; a `VITE_` copy
  would ship inside the APK, and `vite.config.ts` refuses to build if one
  appears. The client has no Supabase import at all; it talks to the
  function, which is what keeps validation, rate limiting and the
  moderation rule somewhere the device cannot route around. Going direct
  with an anon key would move all three into RLS policies and make the
  limiter decorative.
- **RLS is enabled and forced with no policies**, which is deny for everyone
  but the bypassing service role, and grants are revoked explicitly on top.
  Adding a policy to let the client read directly undoes the paragraph above.
- **The photo bucket is private.** These are photographs of people's hair
  waiting to be reviewed, rejections included; a public bucket makes each one
  a permanent shareable link. Reviewers read through `signedPhotoUrl()`.
- **The `releases` bucket is public-read and nothing else.** It holds the
  APK, the pushed-update zips and `latest.json`. No storage policy, so only
  the service role writes — and whoever can write a bundle there can put
  code on every installed phone. Uploads go through the CLI under the
  developer's own login (`scripts/lib/release-manifest.mjs`), never a key
  in a file.

No `@supabase/supabase-js`: PostgREST and Storage are plain HTTP. A package
in the function bundle to save thirty lines of `fetch` is not worth the
cold start.

`client_id` is `unique` and the route checks it before writing anything, so a
retry after a lost response returns the original id rather than queueing the
contribution twice. Keep that check *before* the photo upload — behind it,
the duplicate is caught by the constraint only after four photographs have
been orphaned in the bucket.

Nothing it accepts is published: every submission lands as `Pending` for a
human to read, because a moderation queue that auto-publishes is not a
moderation queue, and this one holds a rights claim the library has already
been burnt by once.

The device keeps its own copy either way — a submission is written to the
profile as `Queued` *before* the request and only becomes `Sent` on a 200 —
so leave the row `Queued` on every error path. `submitStyle()` in
`src/lib/api.ts` throws rather than returning a result union for exactly
that reason: one `catch` is more reliable than a branch nobody remembers to
write.

If you are ever asked to add a model call back, the non-negotiable above is
the answer; if it is overruled, load the `claude-api` skill first, because
patterns recalled from memory are stale.

## Verifying a change

```bash
npm run build        # typecheck + production bundle
npm run ask:eval     # after touching content, the Ask vocabulary or its weights
npm run android:build # full APK compile — catches native/config breakage
npm run ota:publish -- --dry-run # builds and zips a pushed update, uploads nothing
```

**After any `npm install` on this Windows machine, check the lockfile
still has `node_modules/@emnapi/core` and `node_modules/@emnapi/runtime`
(1.11.3).** npm on Windows drops them, `npm ci` here still passes, and
Vercel's Linux `npm ci` then refuses the whole build ("Missing:
@emnapi/runtime@1.11.3 from lock file"), so the landing page silently
stays on the last good deploy. It has happened twice (`be2ad9b`, and
again after the Supabase move); restore them from the last commit Vercel
deployed.

An APK for a phone comes from `npm run apk` and nothing else: one file,
`apk-output/afrocoil.apk`. It raises `appVersionCode` and refuses any
build not signed by the pinned certificate in `scripts/build-apk.mjs`,
because a different key or a lower code is an APK that cannot install
over the existing app. Do not change that pin, and do not let debug
builds fall back to the machine's debug keystore. It also refuses to
build without the production function and manifest URLs in
`.env.production`, because an APK that cannot read `latest.json` can
never receive a pushed update. Because every `npm run apk` raises the
versionCode, do not reach for it to ship screens or content — that is
`npm run ota:publish`.
