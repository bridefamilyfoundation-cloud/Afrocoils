# Shipping to Google Play

How to get a build onto the Play Console, and what Play asks for that isn't code.

The fastest route to testers is the **Internal testing** track: up to 100
testers by email, no review wait, and it skips the 12-testers-for-14-days rule
that gates production for personal developer accounts.

## One-time setup

### 1. Developer account

Sign up at [play.google.com/console](https://play.google.com/console), $25 once.

The account type is **irreversible**, so pick deliberately:

| | Personal | Organisation |
| --- | --- | --- |
| Verification | Government ID + address | D-U-N-S number, business site |
| Lead time | 2 days – 2 weeks | Add 1–2 weeks for D-U-N-S |
| Production gate | 12 testers opted in for 14 continuous days | None |

Internal testing is unaffected by the production gate either way. Start
verification early — it runs in parallel with everything below.

### 2. Upload key

Play App Signing means Google holds the real app signing key; you sign uploads
with an upload key that Google verifies and strips.

```bash
cd android
keytool -genkeypair -v -keystore afro-coily-upload.keystore \
  -alias afro-coily-upload -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=AfroCoils, O=AfroCoils, C=NG"
```

Then point `android/keystore.properties` at it (copy from
`keystore.properties.example`). Both that file and the keystore are gitignored.

> `afro-coily-dev.keystore` is a throwaway for sideloading. Never upload a build
> signed with it — `applicationId` and signing identity are bound together
> permanently on first upload, and `com.afrocoilyhair.app` can never be reused.

**Back up the keystore file and both passwords off this machine.** While
enrolled in Play App Signing a lost upload key is recoverable via a reset
request (a few days). Without that enrolment it is terminal.

### 3. Deploy the API

Optional, and only one screen depends on it. The app makes no model calls and
every screen works offline; the single route in `api/` receives a style offered
to the community library. Skip this and "Share a style" leaves the submission
queued on the device — which is what it does on a failed send anyway.

1. Deploy, with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in the
   Vercel project environment (see `.env.example` and the README's
   *Deploying to Vercel*).
2. Add the deployment origin to `ALLOWED_ORIGINS` if it isn't already covered
   by the Capacitor defaults in `api/_shared.ts`.
3. Record the deployment URL for the next step.

### 4. Point the release build at it

`VITE_API_BASE_URL` is inlined at build time, so it must be set *before*
building the bundle. Keep it out of `.env` (which local dev shares) and put it
in `.env.production`, which only `vite build` loads:

```bash
# .env.production  — gitignored
VITE_API_BASE_URL=https://your-deployment.vercel.app
```

## Building the artifact

Play takes an `.aab`, not an `.apk`.

```bash
npm run android:bundle
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

The build fails fast if `keystore.properties` is missing, since an unsigned AAB
is rejected at upload. `npm run android:release` still produces a release APK
for sideloading, and works unsigned.

### Versioning

- **`versionName`** comes from `package.json` — one place for the marketing
  version.
- **`versionCode`** is `appVersionCode` in `android/gradle.properties`, kept
  separate because Play requires it to *strictly increase* on every upload.
  A rejected build cannot be re-uploaded under the same number, so bump it for
  each artifact you send, not just each release.

## What Play asks for besides the binary

Most rejections happen here, not in the build.

**Privacy policy URL — mandatory, must be live before the listing is.** The
hair profile, photos, growth history and calendar stay on the device. The one
thing that leaves it is a community style submission, which the user starts
deliberately and which carries the photographs and text they wrote. Say exactly
that.

**Data safety form.** Declare photos and user-generated content as collected
and transmitted *only* via that submission flow, and optional. Inconsistency
between this form and observed network behaviour is the single most common
rejection — and this app's network behaviour is now easy to describe: one POST,
only when the user taps Share, plus a GET of the landing site's public
`latest.json` on open (the update check, `src/lib/updates.ts`). That GET sends
no user data and no identifier, so it declares nothing — but say so in the
privacy policy, which it does. A Play build can leave `VITE_UPDATE_MANIFEST_URL`
unset, since Play delivers its own updates; About then says the build does not
check.

**Generative AI policy.** Out of scope. The app generates nothing: every guide,
style and step ships inside the bundle and was written by a person.

**Content rating questionnaire**, **target audience** (keep it 13+ or 18+;
declaring a child audience pulls in substantially stricter rules), and an **ads
declaration** (none).

**Store listing assets**: 512×512 icon, 1024×500 feature graphic, at least two
phone screenshots, short description (80 chars), full description (4000).

**Avoid health claims.** Describe the app as hair *care and styling*. Treatment
or medical framing triggers a stricter review track.

## Content readiness

Per the README, Styles, Profile and Growth render illustrative sample data
rather than real content. Internal testing tolerates that. Closed and open
testing do not — Play's minimum-functionality policy rejects apps that present
as stubs. Before moving past internal testing, either wire those screens to real
sources or hide the tabs.

## Image rights

**No `style-*` file in `src/assets/images/` is cleared for release.** All 61
are frames lifted from other people's social videos; the 14 worst were deleted
outright. A file with no visible watermark is not thereby clear — it means the
creator did not brand that frame, not that the frame is ours.

This is a hard gate on any public track. Play's policy aside, these are other
people's copyrighted work and several carry a legible handle.

```bash
npm run images:check   # prints the rights report beside the coverage report
```

The way through is either a licence from each creator or a commissioned
replacement — the per-slot briefs are in
[`style-image-prompts.md`](style-image-prompts.md). Shipping with placeholder
tiles is the third option and a real one: the app degrades to them cleanly and
`StylesScreen` states an empty shelf honestly. A release on placeholders is
shippable in a way that a release on another creator's watermark is not. See
[`image-triage.md`](image-triage.md).

## Release checklist

- [ ] Developer account verified
- [ ] Upload keystore generated **and backed up off-machine**
- [ ] `android/keystore.properties` points at the upload key
- [ ] `api/` deployed with `ANTHROPIC_API_KEY` set
- [ ] `.env.production` has `VITE_API_BASE_URL`
- [ ] `appVersionCode` bumped
- [ ] `npm run android:bundle` succeeds
- [ ] AAB installs and the AI screens work against the deployed API
- [ ] Privacy policy live at a public URL
- [ ] Data safety, content rating, target audience, ads declaration submitted
- [ ] Listing assets uploaded
- [ ] **Style images licensed, replaced, or removed** — `npm run images:check`
      reports nothing on disk that is not cleared (see *Image rights* above)
- [ ] Upload to Internal testing, add testers by email, share the opt-in link
