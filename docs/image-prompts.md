# Image prompts

Every image in the app resolves through the slot system in
[`src/assets/imagery.ts`](../src/assets/imagery.ts). Drop a file into
`src/assets/images/` named after the slot key and it is picked up
automatically — no import to add, no code to change. Until then the slot
renders a styled placeholder in the app's own palette, so layout and
spacing are already correct.

```
src/assets/images/loc-dryness.jpg   ->  fills the `loc-dryness` slot
src/assets/images/style-loc-pineapple.jpg  ->  fills that style's card
```

Accepted extensions: `.png .jpg .jpeg .webp .avif`. Vite hashes and bundles
them into the APK, so they work offline. Prefer `.webp` — same quality at
roughly half the size of a JPEG, and the Android WebView has supported it
for years.

## House style

Put this in front of every prompt below, so the set reads as one app
rather than as a stock-photo search:

> Warm, natural editorial photography. Soft golden-hour or diffused window
> light, never flash. Shallow depth of field. Muted warm palette — creams,
> terracotta, soft browns — matching a background of `#fdf9f6` and an
> accent of `#86452a`. Real texture, visible strands, no plastic skin
> smoothing. No text, no logos, no watermarks.

And check every generated image against these before you commit it:

- **Real texture.** Generators drift towards loose type 3 curls for
  anything labelled "natural hair", and towards neat, uniform, freshly
  retwisted locs for anything labelled "locs". Both are the exception, not
  the rule. Reject anything that looks like a wig or a rendering.
- **Nobody recognisable.** These are illustrative, not portraits of real
  people. Avoid anything that resembles a specific public figure.
- **No packaging, no brands.** See the note at the bottom.
- **Check the hands.** Still the reliable tell.

## Priority order

If you are only generating a few, generate them in this order — the first
group is what a user sees before they have done anything at all.

### 1. Chrome and hero (5 images)

| Slot key | Size | Prompt |
| --- | --- | --- |
| `avatar` | 160×160 | Portrait headshot of a person with well-maintained type 4C natural hair, warm cinematic light picking out the coil texture. Head and shoulders, looking slightly off-camera, plain warm background. |
| `dryness-rescue` | 512×512 | Close-up of hydrated type 4 coils glistening with moisture, water droplets and a sheen of oil catching low golden light. Fills the frame; no face. |
| `loc-dryness` | 512×512 | Close-up of healthy mature locs catching warm side light. Surface soft and matte rather than glossy, a fine mist of water droplets across them. Fills the frame; no face. |
| `stop-the-snap` | 256×256 | Extreme macro of a single coily hair strand showing cuticle scales, clinical but warm, shallow focus falling off to a cream background. |
| `loc-stages` | 256×256 | Four portraits side by side of the same person at starter, budding, teen and mature loc stages. Even lighting, plain warm background, consistent framing across all four. |

### 2. Community (3 images)

Small overlapping avatars, so they read at 32×32. Keep faces central and
the crop tight.

| Slot key | Size | Prompt |
| --- | --- | --- |
| `community-1` | 160×160 | Portrait of a woman with a large, well-defined afro, smiling warmly, tight crop. |
| `community-2` | 160×160 | Portrait of a person with shoulder-length locs, calm and serene, tight crop. |
| `community-3` | 160×160 | Portrait of a person with short type 4 coils, laughing, tight crop. |

### 3. Style cards (one per style)

Card slots are `style-<id>`, where the id is the `id` field in
[`src/content/styles.ts`](../src/content/styles.ts). They render at 96×96
on the card and 96×160 in the saved row, so **generate at 256×256** and
keep the subject centred.

Prefix each with the house style above, then:

**Loose natural**

| Slot key | Prompt |
| --- | --- |
| `style-chunky-twists` | Back view of chunky two-strand twists on type 4 hair, six to eight thick twists, natural and slightly uneven. |
| `style-pineapple` | High loose gather of coils at the very top of the head, seen from the side, curls spilling forward. |
| `style-flat-twist-crown` | Flat twists running around the crown like a headband, tucked ends, seen from above and behind. |
| `style-banded-stretch` | Sections of type 4 hair wrapped in a series of small hair ties down their length to stretch them, heatless, mid-routine. |
| `style-wash-and-go` | Soaking-wet defined curl clumps on type 4A hair, product sheen, water beading. |
| `style-bantu-knots` | A head of small coiled knots in even rows on damp type 4 hair, seen three-quarter from behind. |
| `style-loc-method` | Three product textures side by side on a warm surface — a spray of water, a clear light oil, a thick cream — no packaging, decanted into plain glass. |
| `style-silk-press` | Straightened, glossy type 4 hair with visible movement and body, warm light. |
| `style-protein-treatment` | A creamy white treatment being smoothed onto a section of damp coily hair, close crop on the hands and the section. |
| `style-finger-coils` | Close-up of finger-coiled type 4 hair, uniform springy coils, high definition. |
| `style-halo-braid` | A braid wrapped around the crown of the head like a halo, ends tucked away, three-quarter view. |
| `style-twist-out` | Type 4 hair after a twist-out, soft defined waves with volume, separated not fluffy. |

**Locs**

| Slot key | Prompt |
| --- | --- |
| `style-loc-basic-retwist` | Freshly retwisted locs at the root, neat parts visible, mature locs hanging. Close on the crown from above. |
| `style-loc-pineapple` | Locs loosely gathered at the top of the head with a satin scrunchie, side view. |
| `style-loc-barrel-roll` | Locs rolled into horizontal barrel rolls up the back of the head and pinned, back view. |
| `style-loc-two-strand` | Pairs of locs twisted around each other down their length, close three-quarter view. |
| `style-loc-pipe-cleaner` | Locs set into tight spiral curls, springy and uniform, shoulder length. |
| `style-loc-basket-weave` | Locs woven flat across the crown in a basket pattern, seen from above. |
| `style-loc-half-up` | Half of the locs gathered into a bun at the crown, the rest hanging loose, side view. |
| `style-loc-wash` | Locs inside a mesh stocking cap under running water in a shower, close crop, no face. |
| `style-loc-clarify` | Locs soaking in a basin of cloudy warm water, seen from above, warm bathroom light. |
| `style-loc-scalp-oil` | An applicator bottle nozzle parting locs to reach the scalp, close crop on the parting. |

### 4. Guide headers (optional)

The guide screen uses a coloured band rather than a photo, so these are a
nice-to-have. If you add them, the slot key is `guide-<slug>` and nothing
reads it yet — wire it up in `GuideScreen.tsx` first.

## What is deliberately not generated

**No product photographs.** [`src/content/products.ts`](../src/content/products.ts)
names real brands, and an AI-generated image of a real brand's bottle is a
fabricated product shot — it will get the packaging, the colour and the
claims wrong while looking authoritative. The products screen uses category
icons instead. Do not replace them with generated pack shots, and do not
scrape real ones either; that is someone else's copyright.

**No before-and-after growth imagery.** Generated length comparisons make a
claim about results that the app cannot stand behind. The growth screen
uses the user's own photos and their own measurements.

## Style galleries (4 angles each)


Every entry in the style library resolves four slots, one per camera
angle. The card in the grid uses whichever exists first; the detail
screen at `/styles/:id` shows all four. Any angle with no file draws a
placeholder on its own, so a style with only a front shot is fine and
gains the rest whenever they land.

```
src/assets/images/style-<id>-front.webp
src/assets/images/style-<id>-back.webp
src/assets/images/style-<id>-side.webp
src/assets/images/style-<id>-round.webp
```

**The angles are not four takes of the same photo.** Same person, same
hair, same light, same background, same session — the camera moves, the
subject does not. Shoot them as a set or they read as four different
people.

| Angle | What it must show |
| --- | --- |
| `front` | Face forward, hairline and the front of the style. Crop at the shoulders. |
| `back` | Directly behind, filling the frame with the back of the head. This is the important one — parting, pattern, and how the ends are finished. It is the side the wearer cannot see on themselves. |
| `side` | Full profile from one side, ear visible, showing depth and how far the style projects. |
| `round` | A three-quarter turn between front and side, which is how the style actually reads to other people. |

Add the house-style block from the top of this file to every one, then
the per-style line below, then the angle from the table. Size 1024x1280
(4:5) for the main views — the gallery frame is 4:5 and a square source
gets cropped at the top and bottom, which is where hair is.

### Loose natural hair

- **`style-chunky-twists-*`** — Chunky Two-Strand Twists (protective). Type 4 loose natural hair.
- **`style-pineapple-*`** — Pineapple Updo (quick). Type 4 loose natural hair.
- **`style-flat-twist-crown-*`** — Flat Twist Crown (protective). Type 4 loose natural hair.
- **`style-banded-stretch-*`** — Banded Stretch (stretched). Type 4 loose natural hair.
- **`style-wash-and-go-*`** — Wash-and-Go (defined). Type 4 loose natural hair.
- **`style-bantu-knots-*`** — Bantu Knots (wash day). Type 4 loose natural hair.
- **`style-loc-method-*`** — L.O.C. Layering (wash day). Type 4 loose natural hair.
- **`style-silk-press-*`** — Silk Press (stretched). Type 4 loose natural hair.
- **`style-protein-treatment-*`** — Protein Reconstruction (wash day). Type 4 loose natural hair.
- **`style-finger-coils-*`** — Finger Coils (defined). Type 4 loose natural hair.
- **`style-halo-braid-*`** — Halo Braid (protective). Type 4 loose natural hair.
- **`style-twist-out-*`** — Twist-Out (defined). Type 4 loose natural hair.

### Locs


Same four angles. Two notes that apply to every loc image here:
generators default to neat, uniform, freshly retwisted traditional locs,
which is the exception rather than the rule — ask for varied thickness
and visible new growth. And the loc set has to hold the same visual
weight as the loose set, because a filled loose-hair library beside a
wall of loc placeholders reads as an app that cares less about locs.

- **`style-loc-basic-retwist-*`** — Root Retwist (maintenance). Mature traditional locs unless the style says otherwise.
- **`style-loc-pineapple-*`** — Loc Pineapple (quick). Mature traditional locs unless the style says otherwise.
- **`style-loc-barrel-roll-*`** — Barrel Roll Updo (protective). Mature traditional locs unless the style says otherwise.
- **`style-loc-two-strand-*`** — Two-Strand Loc Twists (defined). Mature traditional locs unless the style says otherwise.
- **`style-loc-pipe-cleaner-*`** — Pipe Cleaner Curls (defined). Mature traditional locs unless the style says otherwise.
- **`style-loc-basket-weave-*`** — Basket Weave (protective). Mature traditional locs unless the style says otherwise.
- **`style-loc-half-up-*`** — Half-Up Loc Bun (quick). Mature traditional locs unless the style says otherwise.
- **`style-loc-wash-*`** — Loc Wash Day (wash day). Mature traditional locs unless the style says otherwise.
- **`style-loc-clarify-*`** — Deep Clarify Soak (maintenance). Mature traditional locs unless the style says otherwise.
- **`style-loc-scalp-oil-*`** — Scalp Oiling Between Washes (maintenance). Mature traditional locs unless the style says otherwise.

### Priority within the set

Front and back first, for every style, before any style gets all four.
Two angles across the whole library is worth more than four angles on a
quarter of it — the grid shows one image and the detail screen degrades
gracefully, but an empty back view is the one people came for.
