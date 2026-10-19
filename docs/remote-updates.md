# Updating the app without a fresh install

Recommendation for shipping changes to installed devices without users
downloading a new APK.

> **What is built today** is the step before any of this: an update
> *notifier*. The APK reads the landing site's `latest.json` on open and,
> when a higher `versionCode` is posted, offers the new APK for download
> (`src/lib/updates.ts`, `src/components/UpdatePrompt.tsx`; the release steps
> are in the README under *Shipping an update*). It needs no new native
> plugin and no licence decision, and users still install each update. The
> OTA bundle swap below would remove that step for web-only changes; it is
> still a recommendation, not a feature. If it is built, keep the notifier —
> it is the only way a native change (a plugin, a permission) reaches anyone.

## First: what actually needs to ship inside the APK

Before adding any OTA machinery, it's worth being precise about what needs a
new install. Since the AI features were removed, the honest answer is: nearly
everything. The app is now almost entirely on-device.

| What changes | Where it lives | Needs an app update? |
| --- | --- | --- |
| Submission handling, rate limits, moderation | `api/submissions.ts` on Vercel | **No** — redeploy |
| Screens, layout, copy, styling, routing | Web assets in the APK | Only without OTA |
| Guide content (`src/content/guides.ts`) | Web assets in the APK | Only without OTA — but see below |
| Style library (`src/content/styles.ts`) and its photos | Web assets in the APK | Only without OTA — but see below |
| Capacitor plugins, permissions, `targetSdk`, app icon | Native Android | **Yes, always** |

One consequence worth acting on:

**Content should move server-side before UI does.** Care guides, the style
library and community tips are data, not code, and they are now the highest-churn
part of the product by a distance — the library grows every time somebody
contributes. Serving them from an endpoint, with the bundled copies as the
offline fallback that the whole app is built around, makes the most
frequently-edited content updatable without any OTA dependency and without
app-store review. This is the cheapest win available and I'd do it before
reaching for anything below.

## The three approaches

### 1. OTA web-bundle updates — **recommended**

The app ships with bundled assets (so it works offline and on first launch),
and checks a server on startup for a newer web bundle. If one exists it
downloads, verifies and swaps it in; the next launch runs the new UI.

- **Library:** [`@capgo/capacitor-updater`](https://github.com/Cap-go/capacitor-updater).
  Open source (AGPL-3.0), with an optional paid cloud. Self-hostable if you'd
  rather not depend on a vendor or take the AGPL obligation.
- **Alternative:** Ionic Appflow Live Updates — the official commercial option.
  Better support, per-seat pricing, less control.

**Why this one:** it keeps the offline behaviour that made Capacitor the right
choice in the first place, while making everything except native code shippable
in minutes.

Sketch:

```ts
import { CapacitorUpdater } from '@capgo/capacitor-updater'

// After the web layer has booted successfully.
await CapacitorUpdater.notifyAppReady()

const { version } = await CapacitorUpdater.download({
  url: 'https://your-host/bundles/1.2.0.zip',
  version: '1.2.0',
})
await CapacitorUpdater.set({ id: version }) // applied on next launch
```

**`notifyAppReady()` is the safety net.** If the app never reaches that call —
because the new bundle crashes on boot — the plugin rolls back to the last
known-good bundle automatically. Without it a bad OTA bricks the app for every
user who took it, and the only recovery is a store update. Treat it as
mandatory, not optional.

### 2. Point the app at a hosted URL

Set `server.url` in `capacitor.config.ts` and the WebView loads the live site
instead of bundled assets. Every deploy is instantly live everywhere.

```ts
// capacitor.config.ts — NOT recommended for this app
const config: CapacitorConfig = {
  server: { url: 'https://afro-coily-hair.vercel.app', cleartext: false },
}
```

**Why not here:** it throws away offline support, which matters for an app
people open in the bathroom mid-wash-day with bad signal. Every launch becomes
network-dependent, cold start gets slower, and a Vercel outage takes the whole
app down rather than just the AI features. It also drifts towards "a website in
a shell", which both stores look at more sceptically. Useful as a *development*
convenience (`cap run android --livereload`), not as a shipping strategy.

### 3. Store updates only

No OTA. Every change is a new APK through Play.

Perfectly reasonable while the user base is small and you control the testers.
The cost shows up later: hours-to-days of review latency, users stuck on old
versions indefinitely, and no way to pull a bad release quickly.

## What OTA can never update

Web assets only. These always require a real APK and a store release:

- Adding or upgrading a Capacitor plugin (anything with native code)
- New Android permissions
- `targetSdk` / `minSdk` changes, including Play's annual target-API deadlines
- App name, package id, icon, splash screen
- Anything under `android/`

So the release cadence becomes: **web changes weekly or daily via OTA; native
changes a few times a year via the store.**

## Store policy

Google Play permits updating interpreted code (HTML/CSS/JS) inside a WebView
without a store release. Apple's Guideline 3.3.2 is similar in effect for
JavaScript in a WebView.

The constraint on both is *intent*: OTA is for updating your app, not for
materially changing what it is, shipping features that would fail review, or
targeting different content to reviewers than to users. Normal product
iteration is fine; using OTA to route around review is not.

## The failure mode to design for

The real risk isn't the update mechanism — it's **version skew**. Once OTA is
live, the web bundle and the API deploy independently, so an old bundle will
call a new API and vice versa. Two rules keep that safe:

1. **Make API changes additive.** Add fields; don't rename or remove them.
   Removing a field breaks every device that hasn't taken the OTA yet.
2. **Send the bundle version as a header** and log it. When something breaks in
   production, the first question is always "which bundle?", and without this
   it's unanswerable.

A breaking API change needs the old shape kept alive until OTA adoption is high
enough — which you can only know if you're logging (2).

## Suggested rollout

1. **Now:** move guide/style/tip content to an API with the bundled copies as
   offline fallback. Biggest win, no new dependency, no OTA needed.
2. **Before public launch:** add `@capgo/capacitor-updater`, with
   `notifyAppReady()` wired and rollback tested by deliberately shipping a
   broken bundle to a test device. Untested rollback is not rollback.
3. **At that point:** add the bundle-version header and a staged rollout
   (small percentage first, watch errors, then widen).
4. **Ongoing:** keep native changes batched into occasional store releases.
