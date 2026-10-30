import type {
  CarePreferences,
  CurlPattern,
  Density,
  HairType,
  LengthBand,
  LocStage,
  Occasion,
  PorosityLevel,
  StyleCategory,
  StyleDifficulty,
} from '../lib/types'
import type { IconName } from '../components/icon-names'
import { STYLE_CATEGORIES } from '../lib/types'

/**
 * The style library.
 *
 * Static content rather than an API response: these are techniques, not
 * inventory, they do not change often enough to be worth a network round
 * trip on a screen the user opens mid-routine, and a rescue flow that
 * needs a signal is a rescue flow that fails in the one place it is
 * used. The whole library ships inside the app.
 *
 * Every entry here is contributed content, photographed and written up
 * by the person who wore it. The placeholder library this shipped with
 * has been removed rather than left to pad the shelf — a made-up entry
 * next to a real one teaches the reader to trust neither.
 *
 * Two consequences worth knowing before editing:
 *
 * - **It is entirely loose-hair.** Nothing contributed so far is a loc
 *   style, and `styleHairTypes()` defaults an unmarked entry to
 *   loose-only, so a loc wearer currently sees an empty library. That is
 *   the honest state and the screens say so plainly; the fix is loc
 *   contributions, not relaxing the default.
 * - **Every entry has `steps`.** Nothing here is a name and a note.
 *
 * Each entry carries the traits it suits so the screen can rank against
 * the hair profile. `suits` is a soft signal used for ordering; `avoid`
 * is a hard exclusion, matching the enforced preferences on the server.
 */

/**
 * Categories live in lib/types.ts because the user's own styles carry
 * one too and are part of the persisted profile. Re-exported here so the
 * library remains the one import a screen needs.
 */
export { STYLE_CATEGORIES }
export type { StyleCategory }

/**
 * A glyph per category, used on placeholder tiles while the photography
 * is missing so an unfilled library still tells you what each entry is.
 * Lives beside the categories rather than in a component because three
 * screens draw these and they must not drift apart.
 */
export const CATEGORY_ICONS: Record<StyleCategory, IconName> = {
  Protective: 'shield',
  'Wash Day': 'water_drop',
  Quick: 'schedule',
  Stretched: 'straighten',
  Defined: 'waves',
  Maintenance: 'content_cut',
}

export interface Style {
  id: string
  name: string
  category: StyleCategory
  minutes: number
  difficulty: StyleDifficulty
  note: string
  /**
   * Which hair types the style is for.
   *
   * A hard filter, not a preference. Loose-hair technique on locs is not
   * merely unhelpful, it is damaging — combing, parting and re-packing
   * all assume hair that can be separated, and a loc cannot be.
   * Defaults to loose-only when omitted, so a new entry has to opt in to
   * being shown to loc wearers rather than opt out. Every entry in the
   * library today relies on that default; none has opted in.
   */
  hairTypes?: HairType[]
  /** Traits this style particularly suits. Absent means "suits anything". */
  suits?: {
    porosity?: PorosityLevel[]
    density?: Density[]
    curlPattern?: CurlPattern[]
    /** Loc stages this suits. A starter loc cannot hold most loc styles. */
    locStage?: LocStage[]
    /**
     * Length bands the style was demonstrated on.
     *
     * A soft signal, unlike `hairTypes` and `locStage`. Most of these
     * survive being done on shorter hair with a hair piece at the tip,
     * and the source directions usually say so, so a mismatch ranks the
     * style down rather than hiding it.
     */
    lengthBand?: LengthBand[]
  }
  /** Preferences that rule this style out entirely. */
  avoid?: (keyof CarePreferences)[]
  /** True where the style is itself low-manipulation / protective. */
  lowManipulation?: boolean
  /**
   * Where the style is meant to be worn.
   *
   * Reuses the SOS screen's `Occasion` vocabulary rather than inventing
   * a second one, so "what can I wear to work" means the same thing on
   * both surfaces. The source material states this for every entry —
   * church, the office, school, casual outings — and it is often the
   * deciding factor between two styles that cost the same half hour.
   */
  occasions?: Occasion[]
  /**
   * Kit the style will not work without.
   *
   * Named as categories, never brands — the same rule the rest of the
   * app follows, with `content/products.ts` the single exception that
   * names bottles. Worth stating up front because several of these
   * need a hair piece, wool or a rat-tail comb that a reader may not
   * own, and finding that out at step four is too late.
   */
  needs?: string[]
  /**
   * Ordered how-to.
   *
   * Optional on the type because a contribution can arrive without one
   * and the detail screen has to render something — but every entry in
   * the library today has them, and a new one without steps is a draft,
   * not an entry.
   */
  steps?: string[]
}

export const STYLES: Style[] = [
  /* ---------------------------------------------------------------- *
   * Contributed styles
   *
   * From the shared Hairstyle Library folder: looks built out of
   * parting, plaiting, weaving and packing rather than out of product.
   * They are grouped at the source by hair length first and by how long
   * they take second, which is why `suits.lengthBand` exists — but as a
   * ranking signal only, since most of them survive being done on
   * shorter hair with a bun piece at the tip, and the source directions
   * say so themselves.
   *
   * Vocabulary, kept as the source uses it because it is what the
   * reader will hear in a salon: to *pack* hair is to gather and secure
   * it; to *weave* is to cornrow flat to the scalp; to *cut* a line is
   * to part one; *shuku* is cornrows fed upward into a crown gathering.
   * `HOW TO FLAT TWIST` came with the folder and is a guide, not a
   * style — see the `flat-twisting` entry in content/guides.ts.
   * ---------------------------------------------------------------- */
  {
    id: 'curved-part-afro-bun',
    name: 'Curved Part Afro Bun',
    category: 'Protective',
    minutes: 8,
    difficulty: 'Beginner',
    note: 'Two curved plaits swept into a full afro bun. Short hair can wear it with a bun piece at the tip.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event'],
    needs: ['Water spray bottle', 'Rat-tail comb', 'Hair thread or band', 'Afro bun piece (optional)'],
    steps: [
      'Spray your hair with water to soften it, then comb it through.',
      'Divide the hair down the middle into a front and a back section, and band each one separately.',
      'Let the back section down and part a curved line from the left side across to the right of the middle parting.',
      'Plait the hair below that line down to the middle.',
      'Repeat on the front section, but part from the right side across to the left of the middle.',
      'Let both sections down, comb them together, and pack into an afro bun with a thread or band.',
      'Decorate with beads or cuffs if you want them — the style holds without.',
    ],
  },
  {
    id: 'side-plait-bun',
    name: 'Side Plait Bun',
    category: 'Protective',
    minutes: 10,
    difficulty: 'Beginner',
    note: 'Three plaited lines, two on one side and one on the other, gathered into a bun.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event', 'Casual Day'],
    needs: ['Water spray bottle', 'Rat-tail comb', 'Hair thread or band', 'Afro bun piece (optional)'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Divide it into two sections from front to back and pack each separately.',
      'Let the right section down. Part a curved line near the front, then a second smaller line following the same curve, and plait each of them — two plaited lines on the right.',
      'Let the left section down and part a two-inch line from the middle out to the front near your ear, then plait it.',
      'Comb everything back together and pack into a bun or an afro bun.',
    ],
  },
  {
    id: 'front-twists-afro-bun',
    name: 'Front Twists into Afro Bun',
    category: 'Protective',
    minutes: 10,
    difficulty: 'Beginner',
    note: 'Four loose front twists pinned back into a thick bun, with two left to frame the face.',
    suits: { lengthBand: ['Long', 'Medium'] },
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle', 'Small elastic bands', 'Bobby pins', 'Hair thread or band'],
    steps: [
      'Damp the hair a little with a water spray and comb it.',
      'Part a straight line across the front, from beside one ear to the other.',
      'Pull everything behind that line into a thick, full afro bun with a thread or band.',
      'Divide the front section into four, hold each with a small band, and twist each one loosely.',
      'Take the twist on the right across to the middle where the bun sits and clip it there with a bobby pin.',
      'Do the same with the twist on the left, and let the remaining two fall to either side of your face.',
    ],
  },
  {
    id: 'gelled-section-pack',
    name: 'Gelled Section Pack',
    category: 'Stretched',
    minutes: 10,
    difficulty: 'Intermediate',
    note: 'Brushed section by section with gel and set overnight under a scarf, so it lies flat and stays flat.',
    suits: { lengthBand: ['Long', 'Medium'] },
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle', 'Styling gel', 'Edge control', 'Brush', 'Satin scarf or durag'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Starting at the back, work in sections: apply gel, brush the section smooth, and pack it.',
      'Carry on section by section until you reach the front.',
      'At the front, part a line — curved holds better than straight — either at the middle or to one side, apply gel, brush each side downward and pack it in with a band or thread.',
      'Style your edges with edge control.',
      'Tie the whole thing down with a satin scarf or durag and leave it for a few hours, or overnight, to set firm.',
    ],
  },
  {
    id: 'donut-bun-twist-front',
    name: 'Donut Bun with Twisted Front',
    category: 'Defined',
    minutes: 10,
    difficulty: 'Intermediate',
    note: 'A rolled donut at the back and a flat twist at the front that unravels into a wave.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle', 'Satin scarf or durag'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Part off a small section at the front, pack the rest into a bun, and roll the back into a donut.',
      'Flat twist the front section all the way down to the tip.',
      'Tie the hair with a scarf or durag to keep it firm and leave it for a few hours, preferably overnight.',
      'Take the covering off and unravel the front twist, holding on to the wave rather than combing it out.',
    ],
  },
  {
    id: 'threaded-ponytail',
    name: 'Threaded Ponytail',
    category: 'Quick',
    minutes: 5,
    difficulty: 'Beginner',
    note: 'A ponytail built in three passes of thread, with no gel anywhere near it.',
    suits: { lengthBand: ['Long', 'Medium'] },
    occasions: ['Casual Day', 'Formal Event'],
    needs: ['Water spray bottle', 'Long elastic hair thread'],
    lowManipulation: true,
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Section into a front and a back. Comb the back and pull it into a bun with a long hair thread, leaving plenty of thread spare.',
      'Divide the front into two. Brush one half back, pack it in with the bun using the spare thread, and again leave some thread over.',
      'Brush the last half back and pack it in the same way. The ponytail is finished.',
    ],
  },
  {
    id: 'pinned-afro-updo',
    name: 'Pinned Afro Updo',
    category: 'Quick',
    minutes: 4,
    difficulty: 'Beginner',
    note: 'Your usual packed afro, held with bobby pins instead of a rope. Nothing pulls.',
    suits: { lengthBand: ['Long', 'Medium'] },
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Water spray bottle', 'Bobby pins'],
    lowManipulation: true,
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Push the hair upward with your hands and secure the sides with bobby pins, working right the way round.',
      'Pin the middle, closer to the front, so the hair sits a little over your forehead.',
    ],
  },
  {
    id: 'afro-donut-bun',
    name: 'Afro Donut Bun',
    category: 'Quick',
    minutes: 5,
    difficulty: 'Beginner',
    note: 'Packed with a rope until it reads as a donut, with the very tip plaited and tucked inside.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event', 'Casual Day'],
    needs: ['Water spray bottle', 'Styling gel', 'Brush', 'Hair rope or thread', 'Bobby pins'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Apply gel to the edges all the way round and brush it back into the hair.',
      'Place a rope or thread at the back of the head, bring it round to the front, cross it over in your hands and draw it back until the afro sits where you want it.',
      'Gather just the very tip of the afro with your fingertips, plait that tip alone, and pin it into the middle of the hair.',
    ],
  },
  {
    id: 'rolled-section-updo',
    name: 'Rolled Section Updo',
    category: 'Protective',
    minutes: 25,
    difficulty: 'Intermediate',
    note: 'Four sections, each split and rolled back on itself. The front rolls forward instead.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event'],
    needs: ['Water spray bottle', 'Small elastic bands', 'Styling gel', 'Bobby pins'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Divide it into four sections running from the front to the back.',
      'Hold each section with a small band and smooth the sides of each with gel.',
      'Split a section in two and roll each half back towards the band with your hands, pinning it in place where it meets the band.',
      'Repeat for the remaining sections — but at the front, roll forward rather than backward.',
    ],
  },
  {
    id: 'shuku-flat-twist-front',
    name: 'Shuku with Flat Twist Front',
    category: 'Protective',
    minutes: 30,
    difficulty: 'Intermediate',
    note: 'Flat twists fed up into a shuku, with the tips set on rollers overnight.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle', 'Rollers or rolling pins', 'Satin scarf or durag', 'Afro bun piece (optional)'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Divide it into a front and a back, and band the back out of the way.',
      'Part a section from the middle of the front for the front of the style, and band the rest.',
      'Divide that front section into four lines and flat twist each of them downward.',
      'Let the remaining front hair down and flat twist it towards the back to form a shuku. Any number of lines works.',
      'Roll the tips at the front onto rollers or something round to set them.',
      'Cover with a satin tie or durag to smooth it and leave for a few hours, preferably overnight.',
      'Uncover, let the back down, comb and pack it together with the front into a bun or shuku, then take the rollers out of the front.',
    ],
  },
  {
    id: 'banded-link-afro',
    name: 'Banded Link Afro',
    category: 'Protective',
    minutes: 25,
    difficulty: 'Intermediate',
    note: 'Six banded sections chained into one another, then packed into an afro.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Water spray bottle', 'Small elastic bands', 'Styling gel', 'Brush', 'Hair rope or band'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Part it into a left and a right side. Split each side into a front and a back, with much more hair in the back, and clip the front of each out of the way.',
      'Divide each back into three, smooth each with gel, brush it, and hold each of the three with a small band.',
      'On the right, start at the back: take the last section, add it into the next and hold them together, then take that and add it into the one after, banding as you go. Repeat on the left.',
      'Unclip the front sections, comb them, and pack everything together with a band or rope into an afro.',
    ],
  },
  {
    id: 'flat-twist-front-afro',
    name: 'Flat Twist Front Afro',
    category: 'Protective',
    minutes: 10,
    difficulty: 'Beginner',
    note: 'Two flat twists at the front pinned into a packed afro. The everyday version of this shape.',
    suits: { lengthBand: ['Medium', 'Long'] },
    occasions: ['Formal Event', 'Casual Day'],
    needs: ['Water spray bottle', 'Edge control or styling gel', 'Bobby pins', 'Hair thread or rope'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Part a two-inch line across the front, from beside one ear to the other.',
      'Divide that front section into two, and pack the back into an afro with a thread or rope.',
      'On the right of the front, smooth the edges with edge control or gel, flat twist the hair, and pin it where the twist ends at your scalp.',
      'Repeat on the left, then pin the tip of each twist into the afro where the band sits.',
    ],
  },
  {
    id: 'bantu-curl-front-bun',
    name: 'Bantu Coil Front Bun',
    category: 'Defined',
    minutes: 12,
    difficulty: 'Intermediate',
    note: 'The front twisted into bantu knots the night before, unravelled into coils over a packed bun.',
    suits: { lengthBand: ['Medium', 'Long'] },
    occasions: ['Formal Event', 'Casual Day'],
    needs: ['Water spray bottle', 'Edge control or styling gel', 'Brush', 'Hair thread or band'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Part a section at the front for styling, smooth the edges with edge control or gel, and brush it.',
      'Pull the back into an afro bun with a thread, rope or band.',
      'Divide the front section into small sections and twist each of them.',
      'Roll each twist into a bantu knot so the front sets in coils.',
      'When you are ready to go out, take the knots down, unravel the twists, and separate carefully so the coils survive.',
    ],
  },
  {
    id: 'two-side-flat-twist',
    name: 'Two-Side Flat Twist',
    category: 'Protective',
    minutes: 5,
    difficulty: 'Beginner',
    note: 'One curved parting, one flat twist each side, tips met and pinned at the back.',
    suits: { lengthBand: ['Medium'] },
    occasions: ['Formal Event', 'Casual Day'],
    needs: ['Water spray bottle', 'Rat-tail comb', 'Bobby pins', 'Edge control (optional)'],
    lowManipulation: true,
    steps: [
      'Use a water spray to damp the hair and soften it before combing.',
      'With a rat-tail comb, part a curved line from the front at one side all the way to the middle of the back.',
      'Flat twist each side towards the back.',
      'Bring the tip of each side to the middle and pin it in place.',
      'Style the edges with gel or edge control, and tie with a scarf or durag to settle it.',
    ],
  },
  {
    id: 'high-gel-bun-puff',
    name: 'High Gel Bun with Puff',
    category: 'Stretched',
    minutes: 12,
    difficulty: 'Beginner',
    note: 'Packed straight up into a tight gelled bun, with a puff piece over the top.',
    suits: { lengthBand: ['Medium', 'Short'] },
    occasions: ['Formal Event', 'Casual Day'],
    needs: ['Water spray bottle', 'Styling gel', 'Afro bun piece'],
    steps: [
      'Spray water on the hair to soften it, then comb it through.',
      'Pack the hair upward into a tight bun using gel.',
      'Cover the bun with an afro puff piece.',
    ],
  },
  {
    id: 'twisted-front-roll-bun',
    name: 'Twisted Front Roll Bun',
    category: 'Protective',
    minutes: 20,
    difficulty: 'Intermediate',
    note: 'Four flat twists across the front, two back and two towards the ears, rolled into one bun.',
    suits: { lengthBand: ['Medium'] },
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Water spray bottle', 'Hair band'],
    steps: [
      'Spray the hair with water, detangle and comb it.',
      'Part a section across the front from one ear to the other, brush the back and hold it with a band.',
      'Starting on the left of the front, part a small section, divide it into two lines, and flat twist both to the back.',
      'Divide the rest of the front section on the right into two equal parts and flat twist each towards the ears.',
      'Let the back down and pack everything, tips of the twists included, with a band. Roll it into a bun.',
    ],
  },
  {
    id: 'curved-weave-back-bun',
    name: 'Curved Weave-Back Bun',
    category: 'Protective',
    minutes: 25,
    difficulty: 'Intermediate',
    note: 'Two curved cornrowed halves feeding into a brushed-up bun at the back.',
    suits: { lengthBand: ['Medium'] },
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Water spray bottle', 'Styling gel', 'Brush', 'Hair band', 'Afro bun piece'],
    steps: [
      'Damp the hair, detangle and comb it.',
      'Part off a small section at the back and hold it with a band.',
      'Divide the remaining hair into two sections along a curved line.',
      'Apply gel to the sides of the right section, brush it together, and weave it to the back.',
      'Repeat on the left, then let the small back section down, apply gel, brush it upward and hold it securely with a band.',
      'Cover the tip with an afro bun piece.',
    ],
  },
  {
    id: 'five-line-cornrows',
    name: 'Five-Line Curved Cornrows',
    category: 'Protective',
    minutes: 45,
    difficulty: 'Advanced',
    note: 'Five curved cornrows straight back, tied off with a ribbon. A week of not thinking about it.',
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle', 'Rat-tail comb', 'Ribbon', 'Afro bun piece (optional)'],
    lowManipulation: true,
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Section the hair into five curved lines, each one running alongside the next, and weave each to the back.',
      'Gather the ends and tie them with a ribbon.',
      'For a more corporate finish, add an afro bun piece at the tip.',
    ],
  },
  {
    id: 'wool-threaded-ponytail',
    name: 'Wool-Threaded Ponytail',
    category: 'Protective',
    minutes: 75,
    difficulty: 'Advanced',
    note: 'Four sections threaded through with wool rather than braided, then woven out into a ponytail.',
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle', 'Large blunt needle', 'Brazilian wool', 'Styling gel', 'Elastic bands'],
    lowManipulation: true,
    steps: [
      'Detangle the hair, damp it with a water spray and comb it.',
      'Section the hair into four even lines, then thread a large needle with Brazilian wool as though you were about to sew.',
      'Hold each section separately with a band or clip.',
      'Apply gel to a section and hold it down as if to weave it, but pass the needle through the hair instead, keeping it in place with your other hand. At the tip, wrap the wool round and tie it off before cutting the excess.',
      'Repeat for the remaining sections.',
      'Band a batch of wool at the root of each and weave it on as a continuation of the hair.',
      'Roll the woven lengths up into a ponytail.',
      'No wool, or no ponytail wanted: finish with an afro bun piece instead.',
    ],
  },
  {
    id: 'linked-weave-pack',
    name: 'Linked Weave Pack',
    category: 'Protective',
    minutes: 40,
    difficulty: 'Intermediate',
    note: 'Eight woven sections, each fed into the next so the whole side reads as one line.',
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Water spray bottle', 'Styling gel', 'Small elastic bands', 'Hair band or rope', 'Afro bun piece'],
    lowManipulation: true,
    steps: [
      'Damp the hair and comb it.',
      'Part it into a left and a right side.',
      'On the right, divide into four sections from the front. Smooth the first with gel, band it, and weave it.',
      'Split the second section with your hands, lay the woven first section into the middle of it, close the hair around it, band it, and weave that.',
      'Carry on the same way through the third and fourth sections.',
      'Repeat the whole thing on the left.',
      'Pack everything together with a band or rope and finish the tip with an afro bun piece.',
    ],
  },
  {
    id: 'double-flat-twist-buns',
    name: 'Double Flat Twist Buns',
    category: 'Protective',
    minutes: 20,
    difficulty: 'Beginner',
    note: 'Four flat twists, two a side, rolled into a bun each. About as few steps as a protective style gets.',
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle'],
    lowManipulation: true,
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Divide the hair into two sections. Starting on the right, divide that side into two, flat twist each, and roll the twists up into a bun.',
      'Repeat on the left.',
    ],
  },
  {
    id: 'crossed-twist-crown',
    name: 'Crossed Twist Crown',
    category: 'Protective',
    minutes: 35,
    difficulty: 'Intermediate',
    note: 'Six banded twists taken across the head in opposite directions and pinned into a crown.',
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle', 'Small elastic bands', 'Bobby pins'],
    lowManipulation: true,
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Divide the hair into two sides.',
      'On the right, divide into three sections, parting a small piece out of the front section and clipping it aside. Band each of the three and twist them.',
      'Repeat on the left, and flat twist the front piece.',
      'Take each twist from the left across to the right and secure it with a bobby pin, then take each from the right across to the left. Work through all three on each side.',
      'Unravel the flat twist at the front and style it however you like.',
    ],
  },
  {
    id: 'sectioned-twist-buns',
    name: 'Sectioned Twist Buns',
    category: 'Protective',
    minutes: 15,
    difficulty: 'Beginner',
    note: 'The day-two restyle of the crossed twist crown — same sections, same bands, two buns instead.',
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Small elastic bands'],
    lowManipulation: true,
    steps: [
      'Unravel the twists without breaking the sections up or taking the bands out.',
      'Starting on the right, twist the hair and feed each section into the twist as you reach it, then roll the whole thing into a bun at the end.',
      'Repeat on the left.',
    ],
  },
  {
    id: 'square-front-weave-afro',
    name: 'Square Front Weave Afro',
    category: 'Protective',
    minutes: 10,
    difficulty: 'Intermediate',
    note: 'A square parted off the front and woven into four, two crossed back and two left at the face.',
    suits: { lengthBand: ['Short', 'Medium'] },
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Water spray bottle', 'Small elastic bands', 'Styling gel', 'Edge control', 'Hair thread or rope'],
    steps: [
      'Detangle the hair, damp it with a water spray and comb it.',
      'Part a square section at the front, running from the hairline back to the middle of the head.',
      'Band the back out of the way. Divide that square into four equal sections, two at the front and two behind, band each at the scalp, and weave all four separately.',
      'Cross the two rear weaves over each other, apply gel to the edges, and pull everything into an afro with a thread or rope.',
      'Leave the two front weaves falling at the sides of your face, and style your edges.',
    ],
  },
  {
    id: 'curved-weave-bun',
    name: 'Curved Weave Bun',
    category: 'Protective',
    minutes: 5,
    difficulty: 'Beginner',
    note: 'Two short curved cornrows into a tight bun. The fastest thing in the short-hair library.',
    suits: { lengthBand: ['Short'] },
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Water spray bottle', 'Styling gel', 'Brush', 'Hair thread or band', 'Afro bun piece (optional)'],
    steps: [
      'Detangle the hair and spray it damp before combing.',
      'Part a small curved line on the left and weave it to the middle, then do the same on the right.',
      'Apply gel, brush the hair backwards, and hold it into a tight bun in the middle — or at the back, whichever suits you — with a thread, rope or band.',
      'On very short hair, finish the tip with an afro bun piece.',
    ],
  },
  {
    id: 'twin-bun-weave-back',
    name: 'Twin Bun Weave-Back',
    category: 'Protective',
    minutes: 20,
    difficulty: 'Intermediate',
    note: 'Four front weaves brushed back into two small buns. One bun works just as well.',
    suits: { lengthBand: ['Short', 'Medium'] },
    occasions: ['Formal Event', 'Casual Day'],
    needs: ['Water spray bottle', 'Small elastic bands', 'Styling gel', 'Brush', 'Edge control'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Divide it into two sections and band the back.',
      'Divide the front into four even lines and weave each to the middle. Leave the tips unwoven, holding them in pairs with a small band.',
      'Divide the back into two equal sides along the same middle line as the front.',
      'Apply gel, brush each side together with the front weaves on that side, and pack it into a small bun at the back.',
      'Repeat on the other side, then style the front with edge control.',
      'For one bun rather than two, brush everything together and pack it into a single afro bun with a rope or thread.',
    ],
  },
  {
    id: 'two-ponytail-weave-front',
    name: 'Two Ponytail Weave Front',
    category: 'Protective',
    minutes: 15,
    difficulty: 'Beginner',
    note: 'Two ponytails split on a curve, with three woven lines on one side only.',
    suits: { lengthBand: ['Short', 'Medium'] },
    occasions: ['Formal Event', 'Casual Day'],
    needs: ['Water spray bottle', 'Hair bands'],
    steps: [
      'Damp the hair and comb it.',
      'Divide it into two sections along a curved line.',
      'Band the left side out of the way. On the right, part a small section at the front, divide it into three lines and weave each one.',
      'Brush that side together, gather the woven lines in with it and pack it with a band.',
      'Do the same on the left, but without the weaving.',
    ],
  },
  {
    id: 'flat-twist-bun-extension',
    name: 'Flat Twist Bun with Extension',
    category: 'Protective',
    minutes: 20,
    difficulty: 'Intermediate',
    note: 'Two flat twists set overnight, finished with an extension wrapped round to build the bun out.',
    suits: { lengthBand: ['Short', 'Medium'] },
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Styling gel', 'Satin scarf or durag', 'Hair extension', 'Elastic band'],
    steps: [
      'Detangle the hair and comb it.',
      'Divide it into two sections and hold one with a clip or band.',
      'Apply gel to the sides, brush the section together, and flat twist it to the back. Repeat on the other side.',
      'Wrap the hair in a scarf or durag for a few hours, overnight, or until you are ready to go out.',
      'Band a hair extension at its middle, twist it, and wrap it round the bun to build it out.',
    ],
  },
  {
    id: 'woven-roll-attachment',
    name: 'Woven Roll with Attachment',
    category: 'Protective',
    minutes: 30,
    difficulty: 'Intermediate',
    note: 'The ends plaited and rolled into the back, then matched with a longer woven attachment.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event', 'Work/Professional', 'Casual Day'],
    needs: ['Water spray bottle', 'Hair attachment'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Part a small line at the front and weave it towards the back.',
      'Pack the hair to the back, gather the tips with your fingers, plait them, and roll the plait into the back of the hair — then use the woven front line to hold it all together.',
      'Weave an attachment to the same thickness but a greater length, and roll it in at the back.',
    ],
  },
  {
    id: 'beaded-bridal-bun',
    name: 'Beaded Bun',
    category: 'Protective',
    minutes: 25,
    difficulty: 'Intermediate',
    note: 'A bun split into three loose weaves, rolled in on itself and pinned with beaded pins. Made for weddings.',
    suits: { lengthBand: ['Long'] },
    occasions: ['Formal Event', 'Work/Professional'],
    needs: ['Water spray bottle', 'Styling gel', 'Brush', 'Hair band', 'Bobby pins', 'Beads'],
    steps: [
      'Damp the hair with a water spray and comb it.',
      'Apply gel at the front and brush everything back.',
      'Hold it securely at the back with a hair band.',
      'Divide the bun into three, weave each loosely, then hold the three tips together and roll them inward, pinning them in place.',
      'Thread three small beads onto three bobby pins and insert them where the band sits.',
    ],
  },
  {
    id: 'moisturise-between-twists',
    name: 'Moisturise Twist by Twist',
    category: 'Wash Day',
    minutes: 40,
    difficulty: 'Beginner',
    note: 'Re-moisturising one twist at a time, so the hair is never loose and tangling all at once.',
    occasions: ['Casual Day'],
    needs: ['Water spray bottle', 'Leave-in conditioner', 'Styling cream', 'Oil', 'Wide-tooth comb'],
    lowManipulation: true,
    steps: [
      'Take one twist down and spray it with water.',
      'Apply leave-in conditioner.',
      'Add styling cream.',
      'Add oil at the scalp and massage it in.',
      'Add oil down the hair itself to seal the moisture in.',
      'Detangle with a wide-tooth comb.',
      'Re-braid or re-twist that section.',
      'Repeat for the remaining twists, one at a time.',
    ],
  },
]

export interface RankedStyle {
  style: Style
  /** Higher is a better fit. Zero means nothing in the profile matched. */
  score: number
  /** Human-readable reasons, for showing why a style was surfaced. */
  reasons: string[]
}

export interface StyleFilterInput {
  hairType?: HairType
  porosity?: PorosityLevel
  density?: Density
  curlPattern?: CurlPattern
  locStage?: LocStage
  /** Derived from the latest length check, not asked. Ranks, never excludes. */
  lengthBand?: LengthBand
}

/**
 * Which hair types a style is for, with the safe default applied.
 *
 * Omitting `hairTypes` means loose-only. The library predates loc
 * support and every unmarked entry in it assumes hair that can be
 * combed, separated and re-set — none of which is true of a loc.
 */
export function styleHairTypes(style: Style): HairType[] {
  return style.hairTypes ?? ['Loose Natural']
}

/**
 * Why a style was dropped, or undefined if it was not.
 *
 * Named rather than boolean because the screens have to *say* which it
 * was, and the three are different claims about the world. Hiding a
 * twist-out from a loc wearer is not "your care preferences" doing it,
 * and a starter loc being too young for a style is not the same as the
 * style being wrong for locs at all. A single flag forced the caller to
 * guess, and it guessed "preference" for all three.
 */
export type StyleExclusion = 'hairType' | 'locStage' | 'preference'

/**
 * The one place a style is ruled out.
 *
 * `rankStyles` filters on this and the screens report on it, so the
 * count in the library header and the notice on the detail screen
 * cannot disagree with what was actually dropped.
 */
export function styleExclusion(
  style: Style,
  identity: StyleFilterInput,
  preferences: CarePreferences,
): StyleExclusion | undefined {
  /*
   * Ordered most fundamental to most adjustable, because the first match
   * is what the screens report.
   *
   * Preference used to be tested first, which meant a loc wearer with
   * any preference switched on was told that *their care preferences*
   * had hidden a twist-out — the one claim the docblock above says this
   * function exists to avoid making. Hair type is the fork above
   * everything, so it is the reason that wins; a preference is only the
   * explanation when nothing more basic already ruled the style out.
   */
  if (identity.hairType && !styleHairTypes(style).includes(identity.hairType)) return 'hairType'
  // Stage gating only bites once we know the stage; an unknown stage
  // shows everything rather than hiding the library from someone who
  // has not filled in their install date.
  if (
    identity.locStage &&
    style.suits?.locStage &&
    !style.suits.locStage.includes(identity.locStage)
  ) {
    return 'locStage'
  }
  if (style.avoid?.some((key) => preferences[key])) return 'preference'
  return undefined
}

/**
 * Rank the library against the hair profile.
 *
 * Excluded styles are dropped entirely rather than ranked last — the
 * same rule the server applies to generated recommendations. A style
 * that breaks a stated preference should not be visible at all.
 *
 * Hair type and loc stage are exclusions of the same kind. A loc wearer
 * has no use for a wash-and-go, and a starter loc physically cannot hold
 * a barrel roll; showing either as a dimmed, unavailable option would
 * just be a longer list with the same answer.
 */
export function rankStyles(
  styles: Style[],
  identity: StyleFilterInput,
  preferences: CarePreferences,
): RankedStyle[] {
  return styles
    .filter((style) => !styleExclusion(style, identity, preferences))
    .map((style) => {
      const reasons: string[] = []
      let score = 0

      if (identity.locStage && style.suits?.locStage?.includes(identity.locStage)) {
        score += 3
        reasons.push(`suits ${identity.locStage.toLowerCase()} locs`)
      }
      if (identity.porosity && style.suits?.porosity?.includes(identity.porosity)) {
        score += 3
        reasons.push(`suits ${identity.porosity.toLowerCase()} porosity`)
      }
      if (identity.curlPattern && style.suits?.curlPattern?.includes(identity.curlPattern)) {
        score += 2
        reasons.push(`suits ${identity.curlPattern}`)
      }
      if (identity.density && style.suits?.density?.includes(identity.density)) {
        score += 1
        reasons.push(`suits ${identity.density.toLowerCase()} density`)
      }
      // Ranked, never excluded: most of these work on shorter hair with a
      // bun piece at the tip, and the source directions say as much. A
      // mismatch is a "you will need a hair piece", not a "you cannot".
      if (identity.lengthBand && style.suits?.lengthBand?.includes(identity.lengthBand)) {
        score += 2
        reasons.push(`suits ${identity.lengthBand.toLowerCase()} hair`)
      }
      if (preferences.protectiveBias && style.category === 'Protective') {
        score += 2
        reasons.push('protective')
      }
      if (preferences.lowManipulation && style.lowManipulation) {
        score += 2
        reasons.push('low manipulation')
      }

      return { style, score, reasons }
    })
    /*
     * Score first, then the clock.
     *
     * The scores are coarse on purpose — six points across the whole
     * library — and three quarters of the shelf is Protective, so with
     * `protectiveBias` on, twenty-odd entries land on the same number.
     * A stable sort then hands back file order and calls it a ranking.
     * Time is the honest second key: between two styles the profile
     * likes equally, the shorter one is the better suggestion, and it
     * is a tie-break the user can see the sense of.
     */
    .sort((a, b) => b.score - a.score || a.style.minutes - b.style.minutes)
}
