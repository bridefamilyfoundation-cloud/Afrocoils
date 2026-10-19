# Style image triage

A visual review of all 75 imported `style-*` files, 2026-09-11. Every one
was looked at. The verdicts are recorded per angle in
`scripts/drive-images.json` so they cannot be lost, and
`npm run images:check` prints them beside the coverage report.

## The one thing to read first

**None of these 75 files is cleared for release, including the ones with
no visible watermark.** Absence of a mark is not a licence — it means the
creator did not brand that frame, not that the frame is ours. Every file
is a still lifted from somebody else's social video, and the mapping
records `permission: "none"` on all of them because that is the true
state.

That is why `reshoot` is the default verdict rather than `keep`.

## The verdicts

| Action | Files | Means |
| --- | --- | --- |
| `delete-now` | 14 | Off the disk before anything else. Not a release question. |
| `trace` | 13 | A legible handle in the frame, so there is a person to ask. |
| `reshoot` | 48 | No route back to a creator. Commission or drop. |

### `delete-now` — 14 files

Ten of these show an **identifiable minor**. That is a different problem
from copyright and clearing it with the video's creator does not solve
it: the permission needed is a guardian's, and no amount of retouching
substitutes. They go first, ahead of any other work on this folder.

- `style-side-plait-bun-{front,round,side}` — a child, plus a readable
  slogan on the shirt
- `style-curved-part-afro-bun-{back,front,side}` — a child in school
  uniform; `front` additionally has the recording phone's status bar
  (clock, battery, signal) burnt into the top of the frame
- `style-donut-bun-twist-front-{front,side}` — a child
- `style-high-gel-bun-puff-{front,side}` — appears to be a minor;
  watermarked `@ndumi_beauty_studio`

The other four are not the hairstyle they claim to be, so they have no
value to weigh against the risk:

- `style-beaded-bridal-bun-round` — three bobby pins on a table, with the
  back button and avatar of the app *being screen-recorded* still in
  shot, under a 21% black bar
- `style-curved-weave-bun-front` — a mid-process scalp close-up
- `style-threaded-ponytail-{round,side}` — the crop failed; the subject
  is a thumbnail in the corner of a picture of a ceiling

### `trace` — 13 files

A handle is legible in the frame, so these are the only ones where
clearing rights is a conversation rather than a search. Worth the ask
only where the shot is actually good.

| Files | Credit |
| --- | --- |
| `twisted-front-roll-bun-{back,front,round,side}` | `@gloryokinna` |
| `banded-link-afro-{back,front,side}` | `BLNK` (brand mark — best quality in the set) |
| `front-twists-afro-bun-{back,front}` | `@steph_tika` (TikTok) |
| `two-ponytail-weave-front-{front,side}` | `@oyinnab…` (TikTok, truncated by the crop) |
| `beaded-bridal-bun-back` | `@abanaturelle` |
| `shuku-flat-twist-front-side` | `@safiadh_` (Instagram) |

### `reshoot` — 48 files

No legible credit, so no way back to a creator. Some are unmarked, some
carry a platform logo with the handle cropped away or illegible —
`gelled-section-pack` (TikTok), `linked-weave-pack` (Snapchat),
`rolled-section-updo` (a partial `…ana`). Untraceable either way.

Recurring defects in this group, none of them fixable in post:

- **Platform chrome and app UI.** A back-chevron button survives the crop
  on a dozen files; `woven-roll-attachment-side` carries TikTok's music
  ticker; `crossed-twist-crown-side` and `square-front-weave-afro-side`
  have burnt-in captions ("Pov: you need a quick, easy protective
  style…", "Full video on my channel").
- **Residual bars.** 52 of the 75 still have a flat band on at least one
  edge after the trim — mostly 1–2% slivers, but
  `beaded-bridal-bun-round` keeps 21% and `rolled-section-updo`
  `{round,side}` keep the blurred pillarbox column the detector was
  meant to remove.
- **Not house style.** Kitchens, bathrooms, video compression, motion
  blur, hands mid-technique. `docs/image-prompts.md` describes what these
  should look like instead.

## What was changed in the pipeline

**The crop was biased toward the hair.** `fitAspect()` centred its
vertical cut and the final resize used `sharp.strategy.attention`, which
finds the *face* — the most salient region of the picture and the least
relevant one in a hair app. Between them they put the bun out of frame on
several shots. The cut now takes three quarters off the bottom
(`HEAD_BIAS`) and the resize anchors north.

**The importer refuses to re-pull a condemned frame.** `delete-now`
entries are skipped at the fetch, so deleting the files cannot be undone
by the next `npm run images:import`.

**The prompt generator reads the folder, not the triage.** Now that the
14 are gone, a slot is in one of three states — holding a file, holding
nothing after a deletion, or never filled — and
`gen-image-prompts.mjs` reads `src/assets/images/` to tell them apart.
Inferring it from the mapping instead is how the doc ends up announcing
"replaces a file on disk" over a file nobody has.

**A brief is dropped where the frame was not the style.** The four
`off-subject` frames are briefed as a plain angle rather than reproduced.
This settles the open question the last pass left on
`beaded-bridal-bun-round`: with the file deleted there is no card framing
left to preserve, so there is no longer a reason to commission another
flat-lay of hairpins for a slot that wants a view of the style.

**`npm run images:check` reports a clean folder, not just a dirty one.**
An absence of warnings is not a confirmation, and this doc tells you to
check for one.

## Done: the 14 are deleted

Removed on 2026-09-15. `npm run images:check` now reports:

```
[rights] 61 style files on disk, none of them cleared for release
[rights] 0 delete-now, 13 trace, 48 reshoot, 0 untracked
[rights] Clean: all 14 delete-now file(s) are off the disk.
```

That takes **six** styles to a placeholder card — `side-plait-bun`,
`curved-part-afro-bun`, `donut-bun-twist-front`, `threaded-ponytail`,
`high-gel-bun-puff` and `curved-weave-bun` — and `beaded-bridal-bun`
down to one angle. With `moisturise-between-twists`, which never had a
file, seven of the 31 styles now render a placeholder card. 61 files
remain, all of them still uncleared.

**They are still in git history**, at `250cccc` and every commit since.
For the four off-subject frames that is a convenience. For the ten
showing an identifiable minor it is not: the working tree is clean but
the repository is not, and anyone with the clone can still check them
out. Deciding whether this branch gets its history rewritten before it
is pushed anywhere is the outstanding item, and it gets harder with
every commit stacked on top.

## What is still to do

- **Decide on the history rewrite** for the ten minor frames — see above.
  The cheap moment for it is now.
- Decide `trace` case by case. `banded-link-afro` is the one genuinely
  good set in the folder and the likeliest yes.
- Commission the rest, or ship placeholders. The app degrades to
  placeholder tiles cleanly and `StylesScreen` already states an empty
  shelf honestly, so a release with placeholders is shippable in a way
  that a release with another creator's watermark is not.
- Backfill `sourceUrl` on the `trace` rows while the Drive folder is
  still to hand. The mapping has the field and it is `null` everywhere.
  This is the perishable one — a handle with no link is a search.

The 14 slots are the ones to commission first: they are empty in the app
today, and their prompts are in
[`docs/style-image-prompts.md`](style-image-prompts.md). Ten of those
prompts still reproduce the original framing, because the style in those
frames was real and only the subject was a child. The other four get a
plain angle direction instead — those frames were a mid-process scalp, two
failed crops and a flat-lay of hairpins, so there was nothing worth
matching.
