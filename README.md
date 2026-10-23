# AfroCoils

Mobile app for type 4 natural hair and locs, built as a Capacitor-wrapped
web app targeting Android.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 19 + TypeScript + Vite | Componentised screens with real state (rescue flow, style library, growth tracking) |
| Styling | Tailwind CSS 3.4 | The prototype's `tailwind.config` ports over near-verbatim — see below |
| Native shell | Capacitor 8 (Android) | Reuses the existing web work; one codebase, installable APK |
| Routing | React Router (hash mode) | Capacitor serves from a custom scheme with no server to rewrite paths |
| Content | Editorial data in `src/content/` | Guides, styles and products ship inside the APK and work offline |
| Storage | Capacitor Preferences | Hair profile persists on-device; no backend, no accounts |

## Layout

```
├── src/                  React app
│   ├── screens/          Section screens and the pages inside them
│   ├── components/       AppLayout, TopAppBar, BottomNav, Icon, …
│   ├── content/          Editorial data: styles, guides, products
│   ├── lib/              types.ts (shared contract), api.ts (fetch layer),
│   │                     locs.ts, calendar.ts, growth.ts, photos.ts
│   └── native/shell.ts   Capacitor plugin setup (status bar, keyboard, splash)
├── supabase/             The backend: migrations, and the one Edge Function (submissions)
├── android/              Generated Capacitor Android project
├── prototype/            Original HTML prototypes — the design source of truth
└── tailwind.config.js    Design tokens: the prototype's names, the brand's colours
```

## Getting started

```bash
npm install
cp .env.example .env      # optional: only the submissions route reads it
npm run dev               # http://localhost:5173
```

### Android

Requires JDK 21 and the Android SDK (platform 36 + build-tools). Both are
already present on the original dev machine; `android/local.properties` points
Gradle at the SDK and is gitignored, so each machine sets its own.

```bash
npm run cap:sync          # build web assets + copy into the Android project
npm run android:open      # open in Android Studio
npm run android:run       # build, install, and launch on a connected device
npm run android:build     # assembleDebug -> android/app/build/outputs/apk/debug/
npm run android:release   # assembleRelease -> .../apk/release/  (sideloading)
npm run android:bundle    # bundleRelease -> .../bundle/release/ (Google Play)
```

### Build output

| Build | Artifact | Use |
| --- | --- | --- |
| `android:bundle` | `app-release.aab` | **Google Play.** Signing required. |
| `android:release` | `app-release.apk` | Sideloading. R8-shrunk, ~1.4 MB. |
| `android:build` | `app-debug.apk` | Development. No R8, ~4.4 MB. |

Release signing reads `android/keystore.properties` (gitignored — copy from
`keystore.properties.example`). If that file is absent an APK build still
succeeds and simply produces an unsigned APK; `android:bundle` fails instead,
because Play rejects an unsigned AAB at upload.

### The one APK

```bash
npm run apk   # -> apk-output/afrocoil.apk
```

This is the command for any APK that goes onto a phone. It always writes
the same file in the same folder, `apk-output/afrocoil.apk`, and deletes
any other `.apk` in that folder. A file `afrocoil.json` beside it records
the version, versionCode, checksum and signer.

Each APK it produces installs over the app already on a phone, keeping the
profile, because it fixes the three things Android checks:

- **Same package id**, `com.afrocoilyhair.app`.
- **Same signing key.** The script reads the certificate off the built file
  and stops unless it is the pinned one
  (`6b782be2…466e`, `android/afro-coily-dev.keystore`) that every
  installed copy carries. Keep that keystore and `keystore.properties`
  backed up off this machine: a new key cannot update existing installs,
  and they would have to uninstall, losing their data.
- **A higher versionCode.** `appVersionCode` is raised before each build,
  past whatever is in `gradle.properties`, `site/release.json` and the last
  `afrocoil.json`. Commit the bumped `gradle.properties`.

Debug builds (`android:build`, `android:run`) sign with the same key when
`keystore.properties` is present, so a debug install and a release install
no longer conflict.

Android never lets an APK install over the app with a **lower** versionCode
(a downgrade). To go back to an older build, rebuild that code with
`npm run apk`, which gives it a new, higher number.

### Versioning

`versionName` is read from `package.json`, so the marketing version lives in one
place. `versionCode` is `appVersionCode` in `android/gradle.properties`, kept
separate because Play requires it to strictly increase on every upload — bump it
per artifact sent to Play, not per release.

> The key in `keystore.properties` today is a **throwaway development key**. Do
> not publish to Play with it. See [docs/play-release.md](docs/play-release.md)
> for generating a proper upload key and the rest of the release process.

### Landing site

`site/` is the public web page: what the app does, the privacy stance, and
the APK download. The design record is `prototype/screen-00-landing.html`.

```bash
npm run site:build        # -> dist-site/  (static: deploy the folder as-is)
npm run site:dev          # http://localhost:5174
```

Every figure on the page — version, size, checksum, minimum Android, and the
style, guide, symptom and chapter counts — is filled in at build time from
`site/release.json` and from `src/content/`, so none of them is typed by
hand. The download button links to the APK in the `releases` bucket (below).

Vercel builds the page from GitHub (`vercel.json` → `npm run site:build` →
`dist-site/`); every push to `main` redeploys it. It is only the page now:
the submissions route and the update manifest both live in Supabase.

### The backend: one Supabase project

| What | Where |
| --- | --- |
| Moderation queue, rate-limit counters | Postgres — `supabase/migrations/0001_community_submissions.sql` |
| Submitted photographs | Storage bucket `submission-photos` — **private** |
| APK, pushed updates, `latest.json` | Storage bucket `releases` — **public read**, `0002_releases.sql` |
| `POST /functions/v1/submissions` | Edge Function — `supabase/functions/submissions/` |

```bash
npx supabase login                                   # once per machine
npx supabase link --project-ref runhkccoeyxfgsfrzezn # once per checkout
npm run db:push           # apply new migrations
npm run backend:deploy    # deploy the submissions and questions functions
npm run ask:study         # what Ask could not answer, from the shared questions
```

Nothing to configure by hand: Supabase injects the project URL and service
key into the function, so the key is never copied into an env file, a
dashboard or CI. Every table has RLS forced on with no policies, and
neither bucket has a storage policy, so only the service role (the function,
and the CLI under your login) can read or write anything — the public
bucket is readable by URL and nothing else. See
[docs/community-backend.md](docs/community-backend.md).

`.env.production` (gitignored) holds the two public URLs a release build
needs; `npm run apk` and `npm run ota:publish` refuse to run without them:

```bash
VITE_API_BASE_URL=https://runhkccoeyxfgsfrzezn.supabase.co/functions/v1
VITE_UPDATE_MANIFEST_URL=https://runhkccoeyxfgsfrzezn.supabase.co/storage/v1/object/public/releases/latest.json
```

### Shipping an update

There are two kinds, and most changes are the first.

**A pushed update** — anything under `src/`: screens, copy, content,
styles, images. The APK's version, package id and signature do not change,
and nobody reinstalls anything.

```bash
npm run ota:publish -- --note "New loc styles" --note "Fixes the quiz"
```

It builds the app, zips `dist/`, uploads `bundles/<n>.zip` and rewrites
`latest.json`. Commit `site/release.json` afterwards. Within six hours of
next opening the app (or at once, with **Check now** on About) each phone
shows *An update is ready*; **Update now** downloads it, the updater checks
it against the SHA-256 in the manifest, and the app restarts into it with
the profile untouched. If the new bundle fails to start, the updater puts
the previous one back by itself. `--dry-run` builds and zips without
uploading.

**A new APK** — only for native changes: a Capacitor plugin added or
upgraded, a permission, the icon or splash, anything in `android/` or
`capacitor.config.ts`. A pushed bundle cannot carry those, and a bundle that
calls a plugin its APK lacks breaks on that call, so each bundle names the
oldest APK it runs on and is never offered to an older one.

1. Bump `version` in `package.json` if the release deserves a new name.
2. `npm run apk` — raises `appVersionCode`, builds the signed release and
   refuses to finish unless it is signed by **the same key as before** (see
   *The one APK* above).
3. `npm run site:release -- --note "What changed"` — uploads the APK to
   `releases/apk/`, rewrites `latest.json`, and writes `site/release.json`.
   It refuses an unsigned APK, one under a build number that is not higher,
   and one built before the latest push.
4. Commit `site/release.json` and `gradle.properties`, and push, so the
   landing page's button follows.

Phones then show *A new version is out*; **Download update** opens the APK
in the browser and Android installs it over the old one, profile intact.

**Not now** silences that one update only. About shows the installed build
and update, **Check now**, any update put off, and the switch that turns
checking off. Logic in `src/lib/updates.ts`, sheet in
`src/components/UpdatePrompt.tsx`.

Pushes use `@capgo/capacitor-updater` in manual mode, with every Capgo
endpoint blanked in `capacitor.config.ts`: out of the box it reports
update events and crashes to Capgo's servers, which would make the privacy
policy false. Builds older than the first one carrying that plugin and the
manifest URL cannot receive pushes, so that build has to reach people as a
download.

### Remote updates

[docs/remote-updates.md](docs/remote-updates.md) records why pushed updates
were built this way and what can never be updated without an APK.

## Everything runs on the device

There is no model behind any screen and no AI feature of any kind. Every guide,
every style and every step was written by a person and ships inside the bundle;
the screens filter and rank that content against the hair profile using the pure
functions in `src/content/styles.ts` and `src/lib/growth.ts`.

That is a product decision as much as a technical one. This app is opened in a
bathroom, mid-problem, often on a bad connection — a rescue flow that needs a
round trip is a rescue flow that fails exactly when it is needed. It also means
the app can say plainly that nothing it shows you was invented.

### Ask

Ask, opened from the floating button at the bottom right of every screen (a
conversation sheet, `src/components/AskLauncher.tsx`) or full screen at
`/ask`, answers a question by **quoting** the app rather than writing anything.
Common questions have a written answer in `src/content/answers.ts`, with
ordered steps, a button to the screen where the fix is done, and `forYou`
lines chosen by the profile (porosity, loc stage, climate and so on). A reply
is one card and one button, with a link to the community's tips; a question
that is not about hair gets one calm line back to hair.
`src/lib/ask/` indexes those answers and every
guide, Quick Hair Check concern, Locs World section, style, product, FAQ answer
and how-to topic, ranks them against the question with BM25F, and shows the
best passage word for word with a link to its page. It answers on the phone
and needs no signal.

**Questions are shared, anonymously.** While sharing is on (the default;
About switches it off), each question is posted to the `questions` function
with what Ask did with it and the bundle number — nothing from the profile, no
identifier — and kept twelve months (migration `0004_ask_questions.sql`).
`npm run ask:study` pulls them, re-runs each through the current Ask and
writes `ask-study/report-<date>.md` (gitignored): the unanswered backlog, most
asked first with ready-made `cases.ts` lines, the loose matches, and what has
been learned since. Writing those answers is how Ask improves.

What makes it feel like it understood is `src/content/ask.ts`: a vocabulary
that maps how people describe hair ("my hair keeps coming out", "white bits",
"dreads") to the ideas the guides are written in, plus typo tolerance against
the app's own words. Hair type is a hard filter there too, and the screen says
when it left the best match out for that reason.

`npm run ask:eval` runs the questions in `src/lib/ask/cases.ts` and fails on
any that land in the wrong place; `-- --why "question"` shows how one was read
and scored. Add a question there whenever Ask misses one.

### The one route that remains

**`POST /functions/v1/submissions`** (the Edge Function in
`supabase/functions/submissions/`) receives a style offered to the community
library: the write-up, the photographs, and the contributor's claim that the
images are theirs to give. Nothing else of the user's leaves the device, and
this only does when the user taps Share. Every submission lands as `Pending`
for a human to read — see
[docs/community-backend.md](docs/community-backend.md).

The one other request is the **update check**: on open, and on return after six
hours, the APK reads `latest.json` from the `releases` bucket and offers a
pushed update or a new APK if one is posted. It sends nothing — see *Shipping
an update* above.

The device keeps its own copy regardless. A submission is written to the profile
as `Queued` *before* the request and only becomes `Sent` on a 200, so a refusal,
an outage or aeroplane mode costs the contributor nothing.

### Key handling

The app holds no key of any kind, Supabase's included. The service key exists
only inside the Edge Function's environment, where Supabase puts it.
`vite.config.ts` refuses to build if a `VITE_`-prefixed Supabase key appears in
any env file, because anything `VITE_`-prefixed is inlined into the bundle —
and so into the APK and every pushed update — where it can be extracted. That
applies to a shared "service key" meant to authorise calls just as much as to
a provider key: a secret in the bundle is not authentication.

The function is deployed with JWT verification off (`--no-verify-jwt`) for the
same reason: verifying a JWT would need the app to carry the anon key, which
authenticates nobody.

### CORS

The Android WebView loads from `https://localhost` / `capacitor://localhost`, so
every API call is cross-origin. `supabase/functions/_shared/cors.ts` allow-lists
those two origins plus the Vite dev server; add anything else with
`npx supabase secrets set ALLOWED_ORIGINS=…`.

### Rate limits

CORS is not a security control. It decides whether a *browser* may read a
response; a script with curl never asks permission. The submissions route does
not authenticate its caller either — a shared secret shipped in the APK can be
extracted, so it would leak the thing it was guarding without protecting it.

What bounds an open upload endpoint is `supabase/functions/_shared/limits.ts`:
a per-IP window and a daily cap, counted before anything is parsed or stored.
The daily cap is the one that matters, since an attacker with many addresses
walks straight past a per-IP limit. The counters live in Postgres behind the
atomic `incr_rate_counter()`, and pg_cron sweeps expired ones nightly. If the
counter store is unreachable the route fails closed; the device keeps the
submission queued and sends it later, so nothing is lost.

## Structure

Every launch opens on `/` — the front page: a collage of three library
photos, the Hair SOS title, one line under it and a Get Started button.
Get Started scrolls to the doors below it on the same screen, which is also
`/sos`, the rescue flow.

`/home` renders the same screen, because "home" has to mean the front page —
it used to be an index of the four sections, which was a second table of
contents next to the drawer and a second thing called home. Both addresses
render it rather than one redirecting to the other, so whichever someone
typed is the one they keep.

The app itself is **four sections**, not a flat list of screens. Those four are
the bottom-nav tabs; the drawer adds Home, then About, Privacy, Terms and
Contact at its base.

Hair SOS is a triage screen, not a page of its own: *What's your emergency?*
offers three doors, and each owns the screen behind it. It used to be all of
them at once — a time filter, a guide list, concern chips, featured cards, two
tests and a shelf of shortcuts on one scroll — which asked someone mid-problem
to read the whole app before doing anything. Keep it to three; a triage screen
with six options is a menu, and a menu is what this replaced.

| Route | Section | What it does | What lives inside it |
| --- | --- | --- | --- |
| `/` `/home` `/sos` | **Hair SOS** | The front page *and* the section, one screen: a three-photo collage, the title, one line and Get Started fill the first viewport, then *What's your emergency?* — Quick Hairstyle, Hair Care, Hair Problem. Get Started scrolls to the doors. | `/sos/quick`, `/sos/problem`, and the care guides behind them |
| `/styles` | **Hair Styles** | The general library: every contributed look, by category and occasion. Carries a button to the recommendations. | `/styles/recommended`, `/styles/:id` — the full entry, four camera angles and the method |
| `/care` | **Hair Care** | Know your hair, then routine, products and styles — in the order they depend on each other. | The porosity test, the calendar and the product shelf |
| `/growth` | **Hair Growth** | What is underway, length checks, retention, milestones. | The user's own worn styles and their photos |
| `/profile` | **My Hair Profile** | Name, photo, climate, hair traits, care preferences, product shelf. | The hair quiz |
| `/locs` | **Locs World** | Sixteen chapters: basics, starting, washing, scalp, moisture, retwisting, roots, length, styling, accessories, problems, products, routines, myths, lifestyle, professional help. A drawer entry, not a tab. | — |

Everything else is reached from the section it belongs to, never from the
drawer or the tab bar:

| Route | Screen | Parent |
| --- | --- | --- |
| `/quiz` | Hair quiz — the whole identity, asked as observations | My Hair Profile |
| `/sos/quick` | Quick Hairstyle — three time bands over the style library | Hair SOS |
| `/styles/recommended` | Hairstyle recommendations — ranked from the profile, with the criteria | Hair Styles |
| `/sos/problem` | Hair Problem — the Quick Hair Check, featured rescues, every care guide | Hair SOS |
| `/porosity` | Porosity test — five questions, persists to the profile | Hair Care |
| `/products` | Curated brand shelf, filtered to the profile | Hair Care |
| `/calendar` | Wash days, treatments, retwists; derives what is next due | Hair Care |
| `/guide/:slug` | Static care guides from `src/content/guides.ts` | Hair SOS → Hair Problem |
| `/` | The front page: collage, title, Get Started | — (every launch) |
| `/home` | The front page again — same screen as `/` | — (drawer) |
| `/faq` | Five questions people actually ask | — (drawer base, footer) |
| `/styles/submit/thanks` | Thank you, after contributing a style | Styles → Share a style |
| `*` | A real 404 page, keeping the chrome | — |
| `/about` | What the app is, its data stance, collected tips | — (drawer base) |
| `/legal/:slug` | Privacy, Terms, Contact — placeholder shells | — (drawer base) |

Screens that lost their tab (`/calendar`, `/products`) carry a
`<SectionCrumb>` naming the section they belong to, so the hierarchy is
visible from inside them.

## Hair type

`identity.hairType` — `'Loose Natural'` or `'Locs'` — is the fork above
every other trait. It changes the style library, the care guides, the
product shelf, the calendar's default schedule and the concerns listed on
the SOS screen.

This is not cosmetic filtering. Most loose-hair technique is *destructive*
on locs: a loc is meant to be matted, so "detangle it" is an instruction
that ruins hair which cannot be un-ruined. So a `Style` with no `hairTypes`
field defaults to loose-only — new entries opt *in* to being shown to loc
wearers — and `styleExclusion()` drops a mismatch from the library entirely
rather than showing it greyed out.

Loc stage is estimated from the install date in `src/lib/locs.ts`, labelled
as an estimate, and always overridable. The wearer can see their own hair;
the arithmetic cannot.

## The hair profile

The determinant factors behind every recommendation. One JSON document in
Capacitor Preferences (`hair-profile:v1`), no backend and no account, so a
personalised app costs nothing to run and has no GDPR surface. The trade is
that a lost phone loses the history — the document is deliberately
serialisable so a sync layer can be added without a rewrite.

`PROFILE_VERSION` is 7. `migrate()` in `storage.ts` runs on every load, not
just on a version bump, and backfills every key the current code reads
unconditionally. It also *removes* keys nothing reads any more — `sosHistory`,
`tryOns`, `tryOnFace`, `tryOnConsent` from the builds that had AI features,
and `welcomeSeenISO` from the build where the front page was shown once per
install — and deletes the try-on images those pointed at: generated pictures
of the user's own face, which would otherwise sit on disk with nothing in the
app able to reach them.

### Photos

The profile stores photo *filenames*. The bytes live on disk under
`Directory.Data` via `src/lib/photos.ts`, because the document is read whole
on launch and rewritten on every edit — inlined base64 would grow it without
bound and eventually exceed what SharedPreferences will hold. Photos are
local-only: never uploaded except in a community submission the user
deliberately sends, and removed when the app is uninstalled.

### Reminders

The calendar can fire device notifications. Only the *next* occurrence of
each reminder is scheduled, and the whole set is rebuilt whenever the
schedule or the history changes — a repeating alarm would drift out of sync
the moment the user did something early or late.

`SCHEDULE_EXACT_ALARM` is deliberately stripped from the merged Android
manifest: Play restricts it to apps whose core function is alarms or
calendars, and the plugin already falls back to an inexact alarm, which
costs a few minutes' delivery window on a reminder the user picked the hour
for.

The model lives in `src/lib/types.ts` and is split by how often each factor
changes, because the lifetimes drive the UX:

| Tier | Fields | Asked | Consumed by |
| --- | --- | --- | --- |
| Identity | Curl pattern, porosity, density, hair texture, scalp | Once, at onboarding | Style ranking, guides, products |
| State | Protein/moisture balance, last wash, active protective style | When stale | Growth, the calendar |
| Constraint | Time available | Per visit | The SOS quick-fix finder |
| Preference | Heatless-only, silicone-free, protein-sensitive, protective bias, low manipulation | Occasionally | Exclusions + ranking |
| Outcome | Length checks, saved styles, worn styles | Per event | Growth, Styles |

`src/lib/profile-store.tsx` holds the provider and the `useHairProfile()`
hook; `src/lib/storage.ts` owns persistence and migration. There is no
"slice that crosses the wire" any longer — the whole document stays put.

### Enforced preferences

Three preferences exclude rather than rank: `heatlessOnly`, `siliconeFree`,
`proteinSensitive`. A style tagged `avoid: ['heatlessOnly']` is dropped from
the library for someone who set it, not sorted downwards and not shown greyed
out — a lower position in a list is not a guarantee, and the cost of getting
this wrong is somebody's hair. `styleExclusion()` in `src/content/styles.ts` is
the single place that decision is made, so the count in the library header and
the notice on the detail screen cannot disagree about what was dropped.

## Design system

`tailwind.config.js` is a port of the inline `tailwind.config` in
`prototype/screen-04-sos.html` — same colour *names*, spacing scale, font
families and type scale. When a new prototype screen arrives, diff its config
against this file rather than re-deriving values; the token names are what let
prototype markup drop into TSX almost unchanged.

Four deliberate departures from the prototype:

1. **One logo, cut many ways.** The supplied logo is
   `src/assets/brand/afrocoils-logo.png` — the illustration above the
   "AfroCoils" wordmark — and `BrandMark.tsx` serves three cuts of it:
   `hero`, the whole logo, beside the title on the front page; `mark`, the
   illustration alone, for the app bar, drawer and footer; and the wordmark,
   set beside the mark there so the name is the logo's own lettering rather
   than a retyping of it. Its cream field is keyed out by colour across the
   whole image (not flooded from the border, which would leave the letter
   counters filled) because it is not quite the page's cream. The favicon,
   the Android launcher icons and the splash screens are cut from the same
   file. **Replace the artwork with `npm run brand:import [path]`**, which
   regenerates all of them in one pass, or the app ships logos that
   disagree. It warns when the source is too small for the splash screens.
2. **Fonts and icons are bundled, not CDN-loaded.** The prototype used
   `<link>` tags to Google Fonts. A Capacitor app runs from local assets and has
   to render correctly with no network, so Plus Jakarta Sans and Material
   Symbols are npm packages imported in `src/index.css`.
3. **Safe-area padding.** `pt-safe` / `pb-safe` keep the app bar and bottom nav
   clear of the Android status bar, gesture bar, and display cutouts.
4. **The colour values are the brand palette, not the prototype's.** Four
   colours, declared as `brand-*` tokens at the top of the config with every
   M3 role derived from them:

   | | | |
   | --- | --- | --- |
   | Light Cream | `#E8D5C0` | the page |
   | Burnt Orange | `#E2583E` | actions, and the panels that carry them |
   | Dark Chocolate | `#5A2108` | headings and text |
   | Deep Espresso | `#3F1708` | the hair illustration, and the deepest text |

   The one thing to know before editing: **`primary` is the chocolate, not
   the orange.** `text-primary` is the heading colour in 88 places and burnt
   orange on light cream is 2.5:1 — unreadable — where chocolate on cream is
   8.9:1. So the orange lives in the roles that are *filled*:
   `primary-container`, `secondary`, `surface-tint`. It carries cream or
   white on top of it and never sets small text on the page. The token names
   are still the prototype's, so no component changed to make any of this
   happen.

## Screen status

| Screen | Route | Status |
| --- | --- | --- |
| Hair SOS | `/` `/home` `/sos` | **Live** — hero and Get Started, then three doors: Quick Hairstyle, Hair Care, Hair Problem |
| Quick Hairstyle | `/sos/quick` | **Live** — 5–10 / 15–20 / 20–45 min bands over the ranked library |
| Hair Problem | `/sos/problem` | **Live** — Quick Hair Check (24 concerns), featured rescues, searchable guides. Ported from `prototype/screen-04-sos.html` |
| My Hair Profile | `/profile` | **Live** — reads and writes the hair profile |
| Porosity | `/porosity` | **Live** — scored questionnaire, result persists to the profile |
| Hair Care | `/care` | **Live** — porosity, density, texture, routine, products, styles |
| Hair Growth | `/growth` | **Live** — length checks, retention, chart, milestones |
| Styles | `/styles` | **Live** — the general library, filters, saves persist |
| Recommendations | `/styles/recommended` | **Live** — profile-ranked, states the criteria it used |
| FAQ | `/faq` | **Live** — five questions, each checked against the code |
| Thank you | `/styles/submit/thanks` | **Live** — names the style back, says what happens next |
| Not found | `*` | **Live** — names the bad path and offers the four sections |
| Quiz | `/quiz` | **Live** — branches on hair type, writes the identity as it goes |
| Guide | `/guide/:slug` | Static content from `src/content/guides.ts` |
| About | `/about` | App, data stance, collected tips; live feed deliberately held (needs a backend + moderation) |
| Legal | `/legal/:slug` | Privacy **written**; Terms and Contact are deliberate shells |

Only the SOS screen is a port. The rest were designed against the same tokens
because no prototype was supplied, and leaving them as stubs blocked
everything downstream. Each is one self-contained file under `src/screens/` —
drop in a real prototype and replace it wholesale; nothing else depends on
their internals.

No screen renders invented sample data any more. What is left is the held
community feed on About (needs a backend and a moderation policy before it
can be anything but honest about that), Legal (placeholder text), the
drafted About copy, and images.

One structural note:

- **`/` sits outside `AppLayout`** — no app bar, no tab bar, no footer. It has
  one target and nothing should compete with it. Every link inside the app
  points at `/sos` instead, including the app-bar logo and the footer: tapping
  a logo should not throw you back out onto the launch screen.
### Growth maths

`src/lib/growth.ts` keeps the derivations as pure functions, away from the
screen, because retention is the one number here a user could reasonably
dispute:

- **Retention** is length gained over expected growth, against the
  0.5&Prime;/month population average. Suppressed below a 28-day span, where a
  fortnight's growth is close to the measurement error. A net loss from
  trimming produces a negative ratio; the screen clamps the displayed
  percentage at zero rather than the model hiding it.
- **Milestone ETAs** use the user's own measured rate once the record spans 60
  days, and the population average before that — flagged as an estimate either
  way. A flat or shrinking record yields no date at all rather than one in the
  far future.
- **Milestone landmarks are approximate by nature.** Where "shoulder length"
  falls depends on a torso, not a number, and the UI says so.

The chart is a single series, so it carries no legend — the section heading
names it. The check-in history list below it is its table view, so no value is
reachable only through the tooltip.

Placeholders use the real design tokens, so the shell stays coherent while
screens land one at a time.

## Known items

- **The style library is loose-hair only.** Every entry is contributed, and
  nothing contributed so far is a loc style, so a loc wearer sees an empty
  shelf and both screens say so plainly. The fix is loc contributions, not
  relaxing the loose-only default on `hairTypes`.
- **The imported style photographs are not release-cleared.** They are
  watermarked frames from other people's social videos — see
  [src/assets/images/README.md](src/assets/images/README.md) before shipping.
- **Legal pages are deliberately empty shells.** Drafted placeholder clauses
  look finished and tend to ship; `src/screens/LegalScreen.tsx` lists what each
  document has to cover instead.
