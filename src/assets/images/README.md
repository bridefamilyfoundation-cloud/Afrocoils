# Image slots

Drop image files here named after the slot key and they are picked up
automatically — no code change, no import to add. Vite hashes and bundles them
into the APK, so they work offline.

| Filename (any of `.png .jpg .jpeg .webp .avif`) | Where it appears |
| --- | --- |
| `avatar` | User avatar, top app bar and profile |
| `dryness-rescue` | Hero image on the SOS screen, loose hair |
| `loc-dryness` | Hero image on the SOS screen, locs |
| `stop-the-snap` | Porosity card, loose hair |
| `loc-stages` | Loc stage card, locs |
| `community-1`, `community-2`, `community-3` | Overlapping avatars on the third SOS card |
| `style-<id>` | Style card, where `<id>` is the entry's `id` in `src/content/styles.ts` |

An unfilled slot renders a styled placeholder in the app's palette, so layout
and spacing stay correct until real artwork lands.

## The `loc-style-*` files are generated illustrations

The lookbook on `/locs/styles` shows each loc style front, back and side,
as `loc-style-<id>-front|back|side.webp` (a second look adds `-2-`
before the angle). They are cut from the generated triptychs in
`Locs Images/Generated images/` by `npm run images:locs`, using the
same cutter as the library's `style-*` files and the mapping in
`scripts/loc-generated-images.json`. Re-run it after adding or
reassigning a sheet. Five styles have no sheet yet and render
placeholders.

The salon and social photographs from the Hairstyle Library PDF that used
to fill these slots were **not** cleared for release. They have been moved
out of the bundle to `Locs Images/Removed from app/`, for the owner to
delete; the PDF originals are still in `Locs Images/`.

## The `style-*` files are generated illustrations

Every Drive frame described below has been deleted. The `style-*` files
here now come from the generated triptychs in `Claude outputs/`, cut into
`front`, `back` and `side` 4:5 slots by `npm run images:generated`, with
the sheet-to-style mapping in `scripts/generated-images.json`. Re-run that
after adding or reassigning a sheet. The section below is kept as the
record of why the old set went.

## ⚠️ None of the imported `style-*` files is cleared for release

`npm run images:import` pulls the photography for the thirty
packed-and-parted styles out of the shared Hairstyle Library Drive folder
(`scripts/drive-images.json` holds the mapping). Those files are in this
folder now, and they are **placeholders standing in for licensed artwork,
not final assets**:

- They are frames grabbed from social media videos, not original
  photography. Several carry a **visible TikTok watermark and another
  creator's handle**, which makes them someone else's copyrighted work.
  Shipping them in an APK is a rights problem, and painting the watermark
  out would be a worse one.
- The import crops the padding away — letterbox bars, the blurred filler
  either side of a pillarboxed video, burnt-in captions — but it cannot
  fix what is inside the picture: motion blur, video compression, and
  backgrounds that are somebody's kitchen. They do not meet the house
  style in [`docs/image-prompts.md`](../../../docs/image-prompts.md).
- It does **not** remove watermarks, and should not. Where the mark sits
  inside the photograph it survives the crop, which is the honest
  outcome — a cropped-out credit is a licensing problem wearing a
  disguise.

Every one of the 75 was looked at individually and given a verdict,
recorded per angle in `scripts/drive-images.json` and summarised in
[`docs/image-triage.md`](../../../docs/image-triage.md): **14
`delete-now`** (ten of them showing an identifiable minor, which is a
guardian's permission to give and not a creator's), **13 `trace`** (a
legible handle, so there is someone to ask) and **48 `reshoot`** (no route
back to a creator).

**The 14 have been deleted.** 61 files remain, and none of those is
cleared either — `delete-now` was the subset that could not wait for a
licensing conversation, not the subset with a problem. Their slots render
a placeholder, which takes six styles to a placeholder card. The files are
still in git history at `250cccc`; see the triage doc for the decision
that leaves open.

Note what the default is and why. A file with no visible watermark is
*not* thereby clear — it means the creator did not brand that frame, not
that the frame is ours — so the mapping records `permission: "none"` on
all 75 and the default verdict is `reshoot`, never `keep`.

`npm run images:check` prints this beside the coverage report, because a
filled slot and a shippable slot are different things.

So before release, either clear the rights with the original creators, or
delete the remaining 61 too and commission replacements:

```bash
rm src/assets/images/style-*.webp   # back to placeholders, app still works
npm run images:prompts              # regenerates every prompt
```

**The prompts are matched to the frames they replace.** Each
angle in `scripts/drive-images.json` carries a `composition` — what that
specific frame shows: the pose, the crop, what the hands are doing, the
wardrobe, the jewellery — recorded by looking at the file. So a generated
replacement drops into the same card at the same framing, and the four
angles of a style still read as one session rather than four unrelated
photographs.

What the briefs deliberately drop is everything that made the file
unshippable in the first place: the watermarks and handles, the phone
status bars and app chrome, the readable slogans, the subjects flagged as
minors — and the original backgrounds, which are somebody's kitchen. The
house style in [`docs/image-prompts.md`](../../../docs/image-prompts.md)
supplies the background instead, which is what makes the set cohere.

A brief is dropped altogether where the frame was never the style — the
four `off-subject` files, which were a mid-process scalp close-up, two
crops that failed onto a ceiling and a flat-lay of hairpins. Those slots
get the plain angle direction, because matching them would commission a
photograph the screen has no use for.

One slot still needs a decision before it is generated, and
`docs/style-image-prompts.md` flags it: `style-woven-roll-attachment-front`
is shot from above and behind rather than from the front, and its brief
reproduces that. If you would rather correct the slot, edit its
`composition` and re-run the script. (`style-beaded-bridal-bun-round` was
the other one; its file is deleted, so it now takes the plain `round`
direction and there is nothing left to decide.)

The app degrades to placeholder tiles the moment they are gone — nothing
else needs changing.

**Fill the loose-hair and loc slots in pairs.** The SOS screen swaps between
them by hair type, so a filled `dryness-rescue` next to an empty `loc-dryness`
means loc wearers get the placeholder version of the same screen.

Alt text lives in `../imagery.ts` for the fixed slots, and is generated from
the style name for style cards — update `imagery.ts` if the artwork changes
meaning.

**Ready-to-use generation prompts, sizes and the house style are in
[`docs/image-prompts.md`](../../../docs/image-prompts.md).**

**Suggested sizes** (2× for crisp rendering on phone displays):
`avatar` and `community-*` 160×160; `stop-the-snap` and `loc-stages` 256×256;
`style-*` 256×256; `dryness-rescue` and `loc-dryness` 512×512.

Note there are deliberately no product images — see the last section of the
prompts doc for why.
