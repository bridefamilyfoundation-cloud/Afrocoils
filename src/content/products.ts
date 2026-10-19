import type { IconName } from '../components/Icon'
import type {
  CarePreferences,
  CurlPattern,
  Density,
  HairType,
  LocStage,
  PorosityLevel,
  ScalpCondition,
} from '../lib/types'

/**
 * The product library.
 *
 * Editorial content the app owns, and the only place in it that names a
 * brand at all. Everywhere else speaks in categories — "a creamy
 * leave-in" rather than a bottle — because a name is a claim about a
 * product that is still on the shelf and still made the same way, and
 * this list is the one place that claim is written down, reviewable, and
 * changed only when somebody edits it.
 *
 * What is claimed here is deliberately shallow: what a product is for,
 * roughly what it costs, and whether it belongs anywhere near a given
 * hair type. Formulations get reworked without renaming the bottle, so
 * `siliconeFree` and `containsProtein` are the app's best current
 * understanding and the UI says so — every screen that shows them also
 * tells the user to read the label. Nothing here is sponsored and
 * nothing links out to a shop.
 */

export const PRODUCT_CATEGORIES = [
  'Cleanser',
  'Conditioner',
  'Deep Treatment',
  'Leave-In',
  'Cream & Butter',
  'Gel & Definer',
  'Oil',
  'Scalp',
  'Loc Care',
  'Tools',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const CATEGORY_ICONS: Record<ProductCategory, IconName> = {
  Cleanser: 'water_drop',
  Conditioner: 'spa',
  'Deep Treatment': 'science',
  'Leave-In': 'water_drop',
  'Cream & Butter': 'auto_awesome',
  'Gel & Definer': 'waves',
  Oil: 'water_drop',
  Scalp: 'spa',
  'Loc Care': 'grass',
  Tools: 'straighten',
}

/** Rough band rather than a number — prices differ by country and by week. */
export type PriceBand = '£' | '££' | '£££'

export interface Product {
  id: string
  brand: string
  name: string
  category: ProductCategory
  /** One line on what job it does. */
  role: string
  price: PriceBand
  /** Which hair types this is for. Most are for both. */
  hairTypes: HairType[]
  /** Traits it particularly suits. Absent means "suits most hair". */
  suits?: {
    porosity?: PorosityLevel[]
    density?: Density[]
    curlPattern?: CurlPattern[]
    scalp?: ScalpCondition[]
    locStage?: LocStage[]
  }
  /**
   * Best current understanding of the formula. Used to enforce the
   * silicone-free and protein-sensitive preferences, so an unknown is
   * recorded as the cautious answer rather than left out.
   */
  siliconeFree: boolean
  containsProtein: boolean
  /** Preferences that rule it out outright, beyond the two above. */
  avoid?: (keyof CarePreferences)[]
  /** Why it earns a place, in the app's own voice. */
  note: string
}

/* ------------------------------------------------------------------ *
 * The library
 * ------------------------------------------------------------------ */

const BOTH: HairType[] = ['Loose Natural', 'Locs']
const LOOSE: HairType[] = ['Loose Natural']
const LOCS: HairType[] = ['Locs']

export const PRODUCTS: Product[] = [
  /* --- Cleansers --- */
  {
    id: 'as-i-am-cowash',
    brand: 'As I Am',
    name: 'Coconut CoWash Cleansing Conditioner',
    category: 'Cleanser',
    role: 'Washes without stripping',
    price: '£',
    hairTypes: LOOSE,
    suits: { porosity: ['Low', 'Medium'], curlPattern: ['3C', '4A', '4B', '4C'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'The reference co-wash. Cleans enough for a mid-week refresh while leaving the slip you need to detangle. Not a substitute for a real shampoo every few washes.',
  },
  {
    id: 'kinky-curly-come-clean',
    brand: 'Kinky-Curly',
    name: 'Come Clean Moisturizing Shampoo',
    category: 'Cleanser',
    role: 'Gentle sulphate-free wash',
    price: '££',
    hairTypes: LOOSE,
    siliconeFree: true,
    containsProtein: false,
    note: 'Cleans properly without the squeak. A good default wash-day shampoo when you are not fighting buildup.',
  },
  {
    id: 'sm-african-black-soap',
    brand: 'SheaMoisture',
    name: 'African Black Soap Deep Cleansing Shampoo',
    category: 'Cleanser',
    role: 'Clarifies buildup',
    price: '£',
    hairTypes: LOOSE,
    suits: { scalp: ['Oily', 'Flaky'], porosity: ['Low'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'The reset button. Low-porosity hair that has stopped absorbing anything usually just has product sitting on it — this shifts it. Follow with a deep conditioner, it is a stripping wash by design.',
  },
  {
    id: 'sm-coconut-hibiscus-shampoo',
    brand: 'SheaMoisture',
    name: 'Coconut & Hibiscus Curl & Shine Shampoo',
    category: 'Cleanser',
    role: 'Everyday moisture wash',
    price: '£',
    hairTypes: LOOSE,
    suits: { porosity: ['Medium', 'High'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Widely stocked and forgiving. A sensible first shampoo if you are still working out what your hair likes.',
  },

  /* --- Conditioners --- */
  {
    id: 'kinky-curly-knot-today',
    brand: 'Kinky-Curly',
    name: 'Knot Today Leave-In / Detangler',
    category: 'Conditioner',
    role: 'Detangling slip',
    price: '££',
    hairTypes: LOOSE,
    suits: { curlPattern: ['3C', '4A', '4B', '4C'], density: ['High'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'The slip is the point. Section, soak, and let it sit for a few minutes before your fingers go anywhere near a knot.',
  },
  {
    id: 'tresemme-botanique',
    brand: 'TRESemmé',
    name: 'Botanique Nourish & Replenish Conditioner',
    category: 'Conditioner',
    role: 'Cheap slip in volume',
    price: '£',
    hairTypes: LOOSE,
    suits: { density: ['High'] },
    siliconeFree: false,
    containsProtein: false,
    note: 'Not a boutique product and does not pretend to be. When you have a lot of hair and detangling takes a whole bottle, this is the one people reach for.',
  },

  /* --- Deep treatments --- */
  {
    id: 'sm-manuka-masque',
    brand: 'SheaMoisture',
    name: 'Manuka Honey & Mafura Oil Intensive Hydration Masque',
    category: 'Deep Treatment',
    role: 'Heavy moisture mask',
    price: '££',
    hairTypes: BOTH,
    suits: { porosity: ['High'], curlPattern: ['4A', '4B', '4C'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Thick enough to feel like it is doing something, which for high-porosity 4C hair it generally is. Twenty minutes under a cap beats an hour without one.',
  },
  {
    id: 'tgin-honey-mask',
    brand: 'TGIN',
    name: 'Honey Miracle Hair Mask',
    category: 'Deep Treatment',
    role: 'Weekly moisture treatment',
    price: '££',
    hairTypes: BOTH,
    suits: { porosity: ['Medium', 'High'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Softens without weighing hair down, which is the hard part. A reliable weekly deep conditioner that suits most textures.',
  },
  {
    id: 'as-i-am-hydration-elation',
    brand: 'As I Am',
    name: 'Hydration Elation Intensive Conditioner',
    category: 'Deep Treatment',
    role: 'Moisture rebuild',
    price: '££',
    hairTypes: LOOSE,
    suits: { porosity: ['Low', 'Medium'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Light enough for low-porosity hair, which most deep conditioners are not. Use gentle heat — low porosity needs the cuticle opened before anything gets in.',
  },
  {
    id: 'aphogee-2-min',
    brand: 'ApHogee',
    name: 'Keratin 2 Minute Reconstructor',
    category: 'Deep Treatment',
    role: 'Light protein repair',
    price: '£',
    hairTypes: BOTH,
    suits: { porosity: ['High'] },
    siliconeFree: false,
    containsProtein: true,
    note: 'For hair that feels stretchy and limp rather than dry. Two minutes means two minutes, and always chase it with a moisture conditioner.',
  },
  {
    id: 'aphogee-two-step',
    brand: 'ApHogee',
    name: 'Two-Step Protein Treatment',
    category: 'Deep Treatment',
    role: 'Serious damage repair',
    price: '££',
    hairTypes: LOOSE,
    suits: { porosity: ['High'] },
    siliconeFree: false,
    containsProtein: true,
    note: 'The strongest thing on this list, and the easiest to misuse. Only for hair that is genuinely breaking — twice a year at most, and never on a whim.',
  },

  /* --- Leave-ins --- */
  {
    id: 'camille-rose-curl-love',
    brand: 'Camille Rose',
    name: 'Curl Love Moisture Milk',
    category: 'Leave-In',
    role: 'Lightweight daily leave-in',
    price: '££',
    hairTypes: LOOSE,
    suits: { porosity: ['Low', 'Medium'], density: ['Low', 'Medium'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Light enough that fine, low-porosity hair does not go flat under it. The first layer of a L.O.C. routine.',
  },
  {
    id: 'mielle-pomegranate-leave-in',
    brand: 'Mielle Organics',
    name: 'Pomegranate & Honey Leave-In Conditioner',
    category: 'Leave-In',
    role: 'Moisture base for thick hair',
    price: '££',
    hairTypes: LOOSE,
    suits: { curlPattern: ['4B', '4C'], density: ['Medium', 'High'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Built for high-density type 4 hair and it behaves like it. Rake it through soaking-wet sections, not damp ones.',
  },
  {
    id: 'as-i-am-leave-in',
    brand: 'As I Am',
    name: 'Leave-In Conditioner',
    category: 'Leave-In',
    role: 'All-rounder leave-in',
    price: '£',
    hairTypes: LOOSE,
    siliconeFree: true,
    containsProtein: false,
    note: 'Unglamorous and consistently good. If you want one leave-in and no decisions, this is a safe one.',
  },

  /* --- Creams & butters --- */
  {
    id: 'camille-rose-almond-jai',
    brand: 'Camille Rose',
    name: 'Almond Jai Twisting Butter',
    category: 'Cream & Butter',
    role: 'Twist and braid definition',
    price: '£££',
    hairTypes: LOOSE,
    suits: { curlPattern: ['4A', '4B', '4C'], porosity: ['Medium', 'High'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Made for twist-outs and it shows — soft hold, no crunch, and the definition survives the takedown. Expensive per use if you have a lot of hair.',
  },
  {
    id: 'sm-curl-smoothie',
    brand: 'SheaMoisture',
    name: 'Coconut & Hibiscus Curl Enhancing Smoothie',
    category: 'Cream & Butter',
    role: 'Heavy moisture cream',
    price: '£',
    hairTypes: LOOSE,
    suits: { porosity: ['High'], curlPattern: ['4A', '4B', '4C'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Thick, cheap and everywhere. Too heavy for fine or low-porosity hair, close to ideal for coarse high-porosity coils.',
  },
  {
    id: 'melanin-twist-cream',
    brand: 'Melanin Haircare',
    name: 'Twist-Elongating Style Cream',
    category: 'Cream & Butter',
    role: 'Stretch without heat',
    price: '£££',
    hairTypes: LOOSE,
    suits: { curlPattern: ['4B', '4C'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Aimed squarely at shrinkage. Pairs with banding or threading if you want length without going near a dryer.',
  },
  {
    id: 'tgin-butter-cream',
    brand: 'TGIN',
    name: 'Butter Cream Daily Moisturizer',
    category: 'Cream & Butter',
    role: 'Mid-week refresh',
    price: '££',
    hairTypes: LOOSE,
    siliconeFree: true,
    containsProtein: false,
    note: 'For day three, when the ends have gone dry but you are not re-doing the whole style.',
  },

  /* --- Gels & definers --- */
  {
    id: 'eco-style-black-castor',
    brand: 'Eco Style',
    name: 'Black Castor & Flaxseed Oil Gel',
    category: 'Gel & Definer',
    role: 'Strong hold, low cost',
    price: '£',
    hairTypes: BOTH,
    siliconeFree: true,
    containsProtein: false,
    note: 'Holds edges, sleeks buns and costs almost nothing. The flaxseed version is softer than the classic olive-oil tub. Alcohol-forward, so seal underneath it.',
  },
  {
    id: 'camille-rose-curl-maker',
    brand: 'Camille Rose',
    name: 'Curl Maker',
    category: 'Gel & Definer',
    role: 'Wash-and-go definition',
    price: '£££',
    hairTypes: LOOSE,
    suits: { curlPattern: ['3B', '3C', '4A'], porosity: ['Medium', 'High'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Marshmallow-root slip with real hold. Apply to hair that is genuinely dripping, then do not touch it until it is dry.',
  },
  {
    id: 'kinky-curly-custard',
    brand: 'Kinky-Curly',
    name: 'Curling Custard',
    category: 'Gel & Definer',
    role: 'Long-lasting definition',
    price: '£££',
    hairTypes: LOOSE,
    suits: { curlPattern: ['3B', '3C', '4A'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'A cast you scrunch out later. Notorious for flaking over the wrong products — use it on bare wet hair or over Knot Today, nothing else.',
  },

  /* --- Oils --- */
  {
    id: 'sunny-isle-jbco',
    brand: 'Sunny Isle',
    name: 'Jamaican Black Castor Oil',
    category: 'Oil',
    role: 'Heavy sealing oil',
    price: '££',
    hairTypes: BOTH,
    suits: { porosity: ['High'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Thick and genuinely sealing. Best on ends and thinning edges, cut with a lighter oil if it feels like tar.',
  },
  {
    id: 'jojoba-oil',
    brand: 'Any 100% cold-pressed',
    name: 'Jojoba Oil',
    category: 'Oil',
    role: 'Light sealing oil',
    price: '££',
    hairTypes: BOTH,
    suits: { porosity: ['Low'], scalp: ['Balanced', 'Oily'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'The closest common oil to the scalp’s own sebum, and light enough that low-porosity hair does not just wear it. Brand barely matters — buy it unscented and single-ingredient.',
  },
  {
    id: 'grapeseed-oil',
    brand: 'Any 100% cold-pressed',
    name: 'Grapeseed Oil',
    category: 'Oil',
    role: 'Featherweight seal',
    price: '£',
    hairTypes: BOTH,
    suits: { porosity: ['Low'], density: ['Low'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'The lightest useful oil here. If every oil you have tried has left your hair greasy and flat, start with this one.',
  },

  /* --- Scalp --- */
  {
    id: 'mielle-rosemary-mint',
    brand: 'Mielle Organics',
    name: 'Rosemary Mint Scalp & Hair Strengthening Oil',
    category: 'Scalp',
    role: 'Scalp massage oil',
    price: '££',
    hairTypes: BOTH,
    suits: { scalp: ['Dry', 'Balanced'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Popular for good reason, but it is potent — dilute it if your scalp is sensitive, and it is a scalp product, not a length product.',
  },
  {
    id: 'hs-royal-oils',
    brand: 'Head & Shoulders',
    name: 'Royal Oils Scalp Care Shampoo',
    category: 'Scalp',
    role: 'Flaking and itch',
    price: '£',
    hairTypes: LOOSE,
    suits: { scalp: ['Flaky', 'Sensitive', 'Oily'] },
    siliconeFree: false,
    containsProtein: false,
    note: 'An actual anti-dandruff active in a base built for textured hair. If you are flaking, treat the scalp properly first and go back to your gentle shampoo after.',
  },
  {
    id: 'the-mane-choice-scalp',
    brand: 'The Mane Choice',
    name: 'Tropical Moringa Scalp Nourishing Serum',
    category: 'Scalp',
    role: 'Between-wash scalp relief',
    price: '££',
    hairTypes: BOTH,
    suits: { scalp: ['Dry', 'Sensitive'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'A nozzle that actually reaches the scalp through a dense style, which is most of the battle in braids or locs.',
  },

  /* --- Loc care --- */
  {
    id: 'dollylocks-clarifying',
    brand: 'Dollylocks',
    name: 'Clarifying Shampoo',
    category: 'Loc Care',
    role: 'Residue-free loc wash',
    price: '£££',
    hairTypes: LOCS,
    siliconeFree: true,
    containsProtein: false,
    note: 'Residue-free is the whole point: anything that does not rinse fully out of a loc stays inside it. Made for locs and it behaves that way.',
  },
  {
    id: 'dollylocks-tightening-gel',
    brand: 'Dollylocks',
    name: 'Tightening Gel',
    category: 'Loc Care',
    role: 'Retwist hold without wax',
    price: '£££',
    hairTypes: LOCS,
    suits: { locStage: ['Starter', 'Budding', 'Teen'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Holds a fresh retwist and washes out. Use this instead of anything sold as "loc wax" — wax does not come out, it accumulates for years.',
  },
  {
    id: 'lion-locs-shampoo',
    brand: 'Lion Locs',
    name: 'Residue-Free Loc Shampoo',
    category: 'Loc Care',
    role: 'Deep clean for mature locs',
    price: '££',
    hairTypes: LOCS,
    suits: { locStage: ['Teen', 'Mature', 'Rooted'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Cuts through what a mature loc has been quietly holding on to. Rinse twice as long as feels necessary.',
  },
  {
    id: 'jml-locking-gel',
    brand: 'Jamaican Mango & Lime',
    name: 'No More Itch Locking Gel',
    category: 'Loc Care',
    role: 'Budget retwist gel',
    price: '£',
    hairTypes: LOCS,
    siliconeFree: true,
    containsProtein: false,
    note: 'The widely stocked, affordable option. Use sparingly — a little goes further than the tub suggests, and buildup is the enemy here.',
  },
  {
    id: 'loc-spray-rosewater',
    brand: 'Dollylocks',
    name: 'Hydrating Loc Spray',
    category: 'Loc Care',
    role: 'Daily moisture mist',
    price: '££',
    hairTypes: LOCS,
    siliconeFree: true,
    containsProtein: false,
    note: 'Locs dry out from the inside and you cannot see it happening. A light water-based mist between washes, not a soaking.',
  },
  {
    id: 'loc-sock',
    brand: 'Any nylon mesh',
    name: 'Loc Sock / Stocking Cap',
    category: 'Loc Care',
    role: 'Stops starter locs unravelling in the wash',
    price: '£',
    hairTypes: LOCS,
    suits: { locStage: ['Starter', 'Budding'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'The single cheapest thing that will save a starter loc journey. Wash through the mesh; do not rub.',
  },

  /* --- Tools --- */
  {
    id: 'satin-bonnet',
    brand: 'Grace Eleyae or similar',
    name: 'Satin-Lined Bonnet',
    category: 'Tools',
    role: 'Overnight protection',
    price: '££',
    hairTypes: BOTH,
    siliconeFree: true,
    containsProtein: false,
    note: 'Nothing else on this list protects more hair for less money. Satin, not polyester passed off as satin — check the lining.',
  },
  {
    id: 'satin-pillowcase',
    brand: 'Any mulberry silk or satin',
    name: 'Satin or Silk Pillowcase',
    category: 'Tools',
    role: 'For the nights the bonnet comes off',
    price: '££',
    hairTypes: BOTH,
    siliconeFree: true,
    containsProtein: false,
    note: 'Backup, not replacement. It catches the nights the bonnet slides off, which is most of them.',
  },
  {
    id: 'wide-tooth-comb',
    brand: 'Hercules Sägemann or similar',
    name: 'Seamless Wide-Tooth Comb',
    category: 'Tools',
    role: 'Detangling without snagging',
    price: '££',
    hairTypes: LOOSE,
    siliconeFree: true,
    containsProtein: false,
    note: 'Seamless matters: the moulding seam on a cheap comb is a row of tiny blades running down every tooth. Only ever on conditioned, wet hair.',
  },
  {
    id: 'microfibre-towel',
    brand: 'Any microfibre, or a cotton T-shirt',
    name: 'Microfibre Towel',
    category: 'Tools',
    role: 'Drying without frizz',
    price: '£',
    hairTypes: BOTH,
    siliconeFree: true,
    containsProtein: false,
    note: 'A terry towel roughs up the cuticle every time. An old T-shirt does the job for free if you would rather not buy anything.',
  },
  {
    id: 'spray-bottle',
    brand: 'Any continuous-mist',
    name: 'Continuous Mist Spray Bottle',
    category: 'Tools',
    role: 'Rehydrating between washes',
    price: '£',
    hairTypes: BOTH,
    siliconeFree: true,
    containsProtein: false,
    note: 'Water is the moisturiser; everything else seals it in. A fine continuous mist wets hair evenly where a trigger spray just soaks one patch.',
  },
  {
    id: 'denman-d3',
    brand: 'Denman',
    name: 'D3 Classic Styling Brush',
    category: 'Tools',
    role: 'Curl definition on wet hair',
    price: '££',
    hairTypes: LOOSE,
    suits: { curlPattern: ['3A', '3B', '3C', '4A'] },
    siliconeFree: true,
    containsProtein: false,
    note: 'Genuine definition on looser patterns, real breakage on tight ones. Soaking wet and conditioned only, and pull rows out if it drags.',
  },
]

/* ------------------------------------------------------------------ *
 * Ranking
 * ------------------------------------------------------------------ */

export interface RankedProduct {
  product: Product
  score: number
  reasons: string[]
}

export interface ProductFilterInput {
  hairType?: HairType
  porosity?: PorosityLevel
  density?: Density
  curlPattern?: CurlPattern
  scalpCondition?: ScalpCondition
  locStage?: LocStage
}

/**
 * Rank the library against the profile.
 *
 * Same rule as the style library and the server: anything that breaks an
 * enforced preference is dropped from the list entirely, not shown greyed
 * out. A silicone-free user scrolling past silicone products has been
 * given a worse version of the list they asked for.
 *
 * Hair type is a hard filter too. Loc-specific products on a loose-hair
 * shelf are noise; loose-hair detanglers on a loc shelf are actively bad
 * advice.
 */
export function rankProducts(
  products: Product[],
  identity: ProductFilterInput,
  preferences: CarePreferences,
): RankedProduct[] {
  return products
    .filter((product) => {
      if (identity.hairType && !product.hairTypes.includes(identity.hairType)) return false
      if (preferences.siliconeFree && !product.siliconeFree) return false
      if (preferences.proteinSensitive && product.containsProtein) return false
      if (product.avoid?.some((key) => preferences[key])) return false
      return true
    })
    .map((product) => {
      const reasons: string[] = []
      let score = 0

      if (identity.porosity && product.suits?.porosity?.includes(identity.porosity)) {
        score += 3
        reasons.push(`${identity.porosity.toLowerCase()} porosity`)
      }
      if (identity.curlPattern && product.suits?.curlPattern?.includes(identity.curlPattern)) {
        score += 2
        reasons.push(`suits ${identity.curlPattern}`)
      }
      if (identity.scalpCondition && product.suits?.scalp?.includes(identity.scalpCondition)) {
        score += 3
        reasons.push(`${identity.scalpCondition.toLowerCase()} scalp`)
      }
      if (identity.locStage && product.suits?.locStage?.includes(identity.locStage)) {
        score += 3
        reasons.push(`${identity.locStage.toLowerCase()} locs`)
      }
      if (identity.density && product.suits?.density?.includes(identity.density)) {
        score += 1
        reasons.push(`${identity.density.toLowerCase()} density`)
      }

      return { product, score, reasons }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * What the app will not recommend, and why.
 *
 * Shown on the products screen rather than hidden in a guide: the things
 * that damage coily hair and locs are sold in the same aisle as the
 * things that help, and "not recommended" is more useful than silence.
 */
export const AVOID_LIST: { what: string; why: string; forLocs?: boolean }[] = [
  {
    what: 'Loc wax and beeswax "dread wax"',
    why: 'It does not wash out. It traps water and lint inside the loc and the only fix is a long, harsh clarify — or cutting the loc off.',
    forLocs: true,
  },
  {
    what: 'Petroleum jelly and petrolatum-based grease',
    why: 'Coats the scalp and the strand, blocks water from getting in, and needs a sulphate wash to remove. It makes hair look moisturised while drying it out.',
  },
  {
    what: 'Anything with drying alcohol high in the list',
    why: 'Alcohol denat and isopropyl alcohol near the top of an ingredients list will undo the moisture you just put in. Fatty alcohols — cetyl, cetearyl, stearyl — are the opposite and are fine.',
  },
  {
    what: 'Heavy butters on starter locs',
    why: 'A starter loc cannot shed what you put on it. Butters sit inside the loc, go rancid, and stop it from tightening.',
    forLocs: true,
  },
  {
    what: 'Terry cotton towels',
    why: 'The loops lift the cuticle on every pass. A microfibre towel or an old T-shirt does the same job without the frizz.',
  },
]
