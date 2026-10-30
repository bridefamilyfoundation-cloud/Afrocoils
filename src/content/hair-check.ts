import type { HairType } from '../lib/types'

/**
 * The Quick Hair Check — twenty-four concerns, asked as symptoms.
 *
 * This is the symptom-first way into Hair Problem: someone arrives
 * knowing their hair "feels hard" or their edges are thinning, not
 * knowing which care guide covers it. Each entry says what the thing is,
 * what it looks like, what to do, and what to read on a label.
 *
 * Three rules this file is under, all of them load-bearing:
 *
 * - **Nothing here is generated, and nothing here diagnoses.** It is
 *   written prose that ships in the bundle, like every guide. Several
 *   entries carry a `caution` instead of, or alongside, ingredients —
 *   hair loss, bald patches, a receding hairline and scalp bumps are
 *   medical before they are cosmetic, and a shampoo is not a treatment
 *   for them. Those cautions are the content, not decoration: do not
 *   quietly drop one to make a card tidier.
 * - **`ingredients` names ingredients, never brands.** It reads like a
 *   label, not a shelf. `src/content/products.ts` is still the only file
 *   in the app that names a brand, and this one does not become a second
 *   one — "niacinamide" is a fact about a formulation, "Brand X Serum"
 *   would be a claim about a product still being made the same way.
 * - **`hairTypes` is a hard filter, the same as everywhere else.** The
 *   Hair Problem screen tells the user in its own subtitle that
 *   everything on it is written for their hair type, so an entry that is
 *   only true of loose hair must not appear for a loc wearer. Anything
 *   whose signs or solutions turn on detangling, combing or a curl
 *   pattern is loose-only — a loc is meant to be matted and is never
 *   detangled or re-set.
 */

const BOTH: HairType[] = ['Loose Natural', 'Locs']
const LOOSE: HairType[] = ['Loose Natural']

export type HairCheckConcern = {
  /** Unique across every group — labels repeat ("Breaking" is three of them). */
  id: string
  label: string
  problem: string
  signs: string[]
  solutions: string[]
  /** What to read on a label. Absent where no cosmetic ingredient is the answer. */
  ingredients?: string[]
  /** Shown in place of, or beneath, the ingredients. Never omitted to save space. */
  caution?: string
  hairTypes: HairType[]
}

export type HairCheckGroup = {
  id: string
  /** "My hair is…", and the label each concern completes. */
  heading: string
  concerns: HairCheckConcern[]
}

export const HAIR_CHECK: HairCheckGroup[] = [
  {
    id: 'hair',
    heading: 'My hair is…',
    concerns: [
      {
        id: 'hair-falling-out',
        label: 'Falling out',
        problem:
          'Excessive hair shedding or hair loss can happen for many reasons, including stress, hormonal changes, nutritional deficiencies, genetics, illness, or certain hairstyles.',
        signs: [
          'More hair than usual coming out when washing or combing',
          'Noticeable thinning',
          'Visible scalp',
          'Bald patches',
          'Receding hairline',
        ],
        solutions: [
          'Avoid tight hairstyles and excessive manipulation',
          'Handle the hair gently',
          'Maintain a balanced diet with adequate protein and nutrients',
          'Maintain a healthy scalp',
          'Identify and address possible triggers',
          'See a dermatologist if hair loss is sudden, severe, patchy, or persistent',
        ],
        ingredients: ['Caffeine', 'Niacinamide', 'Rosemary', 'Peptides', 'Panthenol'],
        caution:
          'Hair-loss treatments depend on the cause. Cosmetic ingredients are not a cure for medical hair-loss conditions.',
        hairTypes: BOTH,
      },
      {
        id: 'hair-breaking',
        label: 'Breaking',
        problem:
          'Hair breakage happens when the hair shaft becomes weak and breaks before reaching its full length.',
        signs: [
          'Short broken hairs',
          'Uneven hair length',
          'Split ends',
          'Excessive shedding of short pieces',
          'Hair feels weak or rough',
        ],
        solutions: [
          'Reduce excessive manipulation',
          'Detangle gently',
          'Keep hair moisturised',
          'Protect the ends',
          'Avoid excessive heat and chemical processing',
          'Avoid hairstyles that put constant tension on the hair',
        ],
        ingredients: [
          'Hydrolyzed proteins',
          'Panthenol',
          'Ceramides',
          'Shea butter',
          'Aloe vera',
          'Glycerin',
        ],
        // Loose-only for the detangling step. Locs break too, and the loc
        // care guides cover it in terms that do not involve a comb.
        hairTypes: LOOSE,
      },
      {
        id: 'hair-thinning',
        label: 'Thinning',
        problem:
          'Thinning means the overall density of the hair has reduced or individual areas have become less full.',
        signs: [
          'Scalp becoming more visible',
          'Smaller ponytail or puff',
          'Hair feels less dense',
          'Thinner edges or temples',
        ],
        solutions: [
          'Reduce tight hairstyles',
          'Avoid excessive manipulation',
          'Maintain good scalp care',
          'Eat a balanced diet',
          'Monitor changes in hair density',
          'Seek professional assessment if thinning continues',
        ],
        ingredients: ['Caffeine', 'Niacinamide', 'Panthenol', 'Peptides', 'Rosemary'],
        hairTypes: BOTH,
      },
      {
        id: 'hair-dry',
        label: 'Dry',
        problem:
          'Dry hair lacks sufficient moisture and may become more vulnerable to tangling and breakage.',
        signs: [
          'Rough texture',
          'Hair feels dry or stiff',
          'Dull appearance',
          'Increased tangling',
          'Frizz',
          'Breakage',
        ],
        solutions: [
          'Use a gentle shampoo',
          'Condition after washing',
          'Deep condition regularly',
          'Use a leave-in conditioner',
          'Reduce excessive heat',
          'Protect hair from environmental dryness',
        ],
        ingredients: [
          'Aloe vera',
          'Glycerin',
          'Panthenol',
          'Shea butter',
          'Avocado oil',
          'Coconut oil',
          'Jojoba oil',
        ],
        hairTypes: BOTH,
      },
      {
        id: 'hair-greasy',
        label: 'Greasy or oily',
        problem:
          'An oily scalp produces excess sebum, which can leave the roots greasy and contribute to buildup.',
        signs: [
          'Greasy roots',
          'Hair becomes oily quickly',
          'Heavy or flat-looking hair',
          'Product buildup',
          'Scalp may feel uncomfortable',
        ],
        solutions: [
          'Cleanse the scalp regularly',
          'Avoid applying excessive oils directly to the scalp',
          'Use a clarifying shampoo when needed',
          'Avoid layering too many products',
        ],
        ingredients: ['Salicylic acid', 'Zinc pyrithione', 'Tea tree', 'Niacinamide'],
        hairTypes: BOTH,
      },
      {
        id: 'hair-tangling',
        label: 'Tangling',
        problem:
          'Hair tangles when strands catch and wrap around each other, often because of dryness, friction, damage, or insufficient conditioning.',
        signs: [
          'Knots',
          'Difficult detangling',
          'Hair snapping during combing',
          'Excessive shedding during detangling',
        ],
        solutions: [
          'Detangle in sections',
          'Use a conditioner or detangling product',
          'Start from the ends and work upward',
          'Use your fingers or a suitable wide-tooth comb',
          'Avoid aggressive brushing',
          'Keep the hair moisturised',
        ],
        ingredients: [
          'Behentrimonium chloride',
          'Cetrimonium chloride',
          'Aloe vera',
          'Glycerin',
          'Panthenol',
          'Shea butter',
        ],
        hairTypes: LOOSE,
      },
      {
        id: 'hair-frizzy',
        label: 'Frizzy',
        problem:
          'Frizz occurs when individual hairs become raised or lose alignment, often due to dryness, humidity, friction, or damage.',
        signs: ['Flyaways', 'Puffy appearance', 'Hair feels rough', 'Lack of definition'],
        solutions: [
          'Keep hair conditioned',
          'Reduce excessive manipulation',
          'Protect hair from humidity and friction',
          'Use leave-in products',
          'Avoid excessive heat',
        ],
        ingredients: [
          'Aloe vera',
          'Glycerin',
          'Shea butter',
          'Jojoba oil',
          'Argan oil',
          'Silicones such as dimethicone',
        ],
        hairTypes: BOTH,
      },
      {
        id: 'hair-hard',
        label: 'Hard or stiff',
        problem:
          'Hair that feels unusually hard or stiff may have excessive product buildup, too much protein, dryness, or damage.',
        signs: [
          'Hair feels hard',
          'Hair lacks flexibility',
          'Hair breaks easily',
          'Products seem to sit on the hair',
        ],
        solutions: [
          'Clarify the hair if there is buildup',
          'Reduce frequent protein treatments',
          'Increase conditioning',
          'Avoid excessive heat and chemical processing',
          'Assess whether the hair is dry or damaged',
        ],
        ingredients: [
          'Aloe vera',
          'Glycerin',
          'Panthenol',
          'Fatty alcohols such as cetyl alcohol and cetearyl alcohol',
          'Shea butter',
        ],
        hairTypes: BOTH,
      },
      {
        id: 'hair-not-retaining',
        label: 'Not retaining length',
        problem:
          'Hair may be growing from the scalp but breaking at the same rate, making it appear as though it is not growing.',
        signs: [
          'Hair remains around the same length',
          'Frequent breakage',
          'Split ends',
          'Uneven length',
          'Ends become thin',
        ],
        solutions: [
          'Focus on preventing breakage',
          'Protect the ends',
          'Reduce excessive manipulation',
          'Keep hair moisturised and conditioned',
          'Avoid tight hairstyles',
          'Handle hair gently',
        ],
        ingredients: [
          'Hydrolyzed proteins',
          'Ceramides',
          'Panthenol',
          'Shea butter',
          'Aloe vera',
          'Glycerin',
        ],
        hairTypes: BOTH,
      },
    ],
  },
  {
    id: 'scalp',
    heading: 'My scalp is…',
    concerns: [
      {
        id: 'scalp-itchy',
        label: 'Itchy',
        problem:
          'An itchy scalp can be caused by dryness, dandruff, product irritation, buildup, or scalp conditions.',
        signs: ['Persistent itching', 'Flaking', 'Redness', 'Burning or irritation'],
        solutions: [
          'Keep the scalp clean',
          'Avoid products that irritate your scalp',
          'Reduce buildup',
          'Use an appropriate medicated shampoo when needed',
          'See a dermatologist if itching persists',
        ],
        ingredients: [
          'Ketoconazole',
          'Zinc pyrithione',
          'Salicylic acid',
          'Selenium sulfide',
        ],
        hairTypes: BOTH,
      },
      {
        id: 'scalp-flaky',
        label: 'Flaky',
        problem:
          'Scalp flakes can occur with dandruff, seborrheic dermatitis, dry scalp, or product buildup.',
        signs: [
          'White or yellow flakes',
          'Itching',
          'Redness',
          'Flakes appearing on clothing',
        ],
        solutions: [
          'Wash the scalp regularly',
          'Use an appropriate anti-dandruff shampoo',
          'Avoid scratching',
          'Avoid excessive product buildup',
        ],
        ingredients: [
          'Ketoconazole',
          'Zinc pyrithione',
          'Selenium sulfide',
          'Salicylic acid',
        ],
        hairTypes: BOTH,
      },
      {
        id: 'scalp-dry',
        label: 'Dry',
        problem: 'A dry scalp may feel tight, uncomfortable, and flaky.',
        signs: [
          'Tightness',
          'Small dry flakes',
          'Itching',
          'Scalp feels uncomfortable after washing',
        ],
        solutions: [
          'Use a gentle shampoo',
          'Avoid very hot water',
          'Avoid harsh or irritating products',
          'Maintain a consistent scalp-care routine',
        ],
        ingredients: ['Aloe vera', 'Glycerin', 'Panthenol', 'Jojoba oil', 'Squalane'],
        hairTypes: BOTH,
      },
      {
        id: 'scalp-oily',
        label: 'Oily',
        problem: 'An oily scalp produces excess sebum.',
        signs: [
          'Greasy scalp',
          'Hair looks oily shortly after washing',
          'Product buildup',
          'Flat roots',
        ],
        solutions: [
          'Cleanse regularly',
          'Avoid excessive scalp oils',
          'Use clarifying products when appropriate',
          'Avoid heavy product layering',
        ],
        ingredients: ['Salicylic acid', 'Niacinamide', 'Zinc PCA', 'Tea tree'],
        hairTypes: BOTH,
      },
      {
        id: 'scalp-irritated',
        label: 'Irritated',
        problem:
          'Scalp irritation can result from allergic reactions, harsh products, fragrances, chemical treatments, or existing scalp conditions.',
        signs: ['Burning', 'Redness', 'Itching', 'Stinging', 'Tenderness'],
        solutions: [
          'Stop using the suspected irritating product',
          'Use gentle, fragrance-free products',
          'Avoid scratching',
          'Seek professional care if symptoms are severe or persistent',
        ],
        ingredients: ['Aloe vera', 'Panthenol', 'Colloidal oatmeal', 'Allantoin'],
        hairTypes: BOTH,
      },
      {
        id: 'scalp-bumpy',
        label: 'Bumpy',
        problem:
          'Scalp bumps can have different causes, including folliculitis, irritation, ingrown hairs, or other scalp conditions.',
        signs: ['Small bumps', 'Pimples', 'Tenderness', 'Itching', 'Redness'],
        solutions: [
          'Keep the scalp clean',
          'Avoid scratching or picking',
          'Avoid tight hairstyles',
          'Avoid sharing combs and brushes',
          'Seek professional advice if bumps are painful, spreading, or persistent',
        ],
        caution:
          'Ingredients vary depending on the cause. For persistent or painful scalp bumps, get a professional assessment rather than reaching for a cosmetic treatment.',
        hairTypes: BOTH,
      },
      {
        id: 'scalp-sensitive',
        label: 'Sensitive',
        problem:
          'A sensitive scalp can react easily to products, fragrances, chemicals, heat, or styling.',
        signs: [
          'Burning',
          'Stinging',
          'Itching',
          'Redness',
          'Discomfort after applying products',
        ],
        solutions: [
          'Choose gentle products',
          'Patch-test new products',
          'Avoid unnecessary fragrance and harsh ingredients',
          'Stop products that cause reactions',
        ],
        ingredients: ['Panthenol', 'Aloe vera', 'Allantoin', 'Colloidal oatmeal'],
        hairTypes: BOTH,
      },
    ],
  },
  {
    id: 'edges',
    heading: 'My edges are…',
    concerns: [
      {
        id: 'edges-thinning',
        label: 'Thinning',
        problem:
          'Thinning edges may result from repeated tension, manipulation, genetics, hormonal changes, or other forms of hair loss.',
        signs: [
          'Sparse hairline',
          'Thinner temples',
          'More visible scalp around the edges',
        ],
        solutions: [
          'Reduce tension',
          'Avoid tight braids, wigs, ponytails and extensions',
          'Give the hairline regular breaks',
          'Handle edges gently',
          'Seek professional assessment if thinning continues',
        ],
        ingredients: ['Panthenol', 'Niacinamide', 'Caffeine', 'Peptides'],
        hairTypes: BOTH,
      },
      {
        id: 'edges-breaking',
        label: 'Breaking',
        problem:
          'The hair around the edges is delicate and can break easily from tension and excessive manipulation.',
        signs: [
          'Short hairs around the hairline',
          'Uneven edges',
          'Broken hairs',
          'Tenderness after styling',
        ],
        solutions: [
          'Stop tight styling',
          'Avoid excessive brushing and edge control',
          'Use gentle styling techniques',
          'Give the edges time to recover',
        ],
        ingredients: ['Panthenol', 'Aloe vera', 'Shea butter', 'Ceramides'],
        hairTypes: BOTH,
      },
      {
        id: 'edges-receding',
        label: 'Receding',
        problem:
          'A receding hairline may be caused by traction, genetics, hormonal changes, or other types of hair loss.',
        signs: [
          'Hairline gradually moving backward',
          'Thinning temples',
          'Increased scalp visibility',
        ],
        solutions: [
          'Remove tension from the hairline',
          'Avoid tight protective styles',
          'Monitor progression',
          'Seek professional assessment',
        ],
        caution:
          'Gentle scalp care is the honest goal here. No cosmetic product can promise regrowth on a receding hairline.',
        hairTypes: BOTH,
      },
      {
        id: 'edges-bald-patches',
        label: 'Bald patches',
        problem:
          'A completely bald area may indicate a type of alopecia or another scalp condition.',
        signs: [
          'Smooth bald patch',
          'Sudden hair loss in one area',
          'Multiple bald patches',
          'Changes in the scalp skin',
        ],
        solutions: [
          'Avoid tight hairstyles',
          'Do not aggressively massage or manipulate the area',
          'Seek professional assessment to determine the cause',
        ],
        caution:
          'No cosmetic product is a guaranteed solution for a bald patch, and this app will not suggest one. Get the cause identified first.',
        hairTypes: BOTH,
      },
    ],
  },
  {
    id: 'curls',
    heading: 'My coils are…',
    // Every entry below turns on a curl pattern behaving as loose hair
    // does — definition, bounce-back, detangling. None of it applies to a
    // loc, which is meant to be matted and is never re-set.
    concerns: [
      {
        id: 'curls-losing-definition',
        label: 'Losing definition',
        problem:
          'Coil definition can decrease because of dryness, damage, buildup, heat, chemical processing, or changes in the hair’s condition.',
        signs: [
          'Coils look less defined',
          'Hair appears puffy',
          'Coil pattern looks inconsistent',
        ],
        solutions: [
          'Clarify when there is buildup',
          'Deep condition',
          'Reduce heat',
          'Use suitable styling products',
          'Avoid excessive manipulation',
        ],
        ingredients: [
          'Aloe vera',
          'Glycerin',
          'Flaxseed',
          'Pectin',
          'Hydrolyzed proteins',
        ],
        hairTypes: LOOSE,
      },
      {
        id: 'curls-not-bouncing-back',
        label: 'Not bouncing back',
        problem:
          'Hair that does not return to its normal coil pattern may have experienced heat or chemical damage.',
        signs: [
          'Some areas remain straight',
          'Coil pattern is permanently looser',
          'Hair feels weak',
          'Reduced elasticity',
        ],
        solutions: [
          'Stop excessive heat',
          'Reduce chemical processing',
          'Deep condition',
          'Use strengthening treatments when appropriate',
          'Trim severely damaged areas',
        ],
        ingredients: ['Hydrolyzed proteins', 'Amino acids', 'Ceramides', 'Panthenol'],
        hairTypes: LOOSE,
      },
      {
        id: 'curls-extremely-dry',
        label: 'Extremely dry',
        problem: 'Very dry coils lack sufficient moisture and conditioning.',
        signs: [
          'Rough texture',
          'Dull appearance',
          'Excessive frizz',
          'Tangling',
          'Breakage',
        ],
        solutions: [
          'Deep condition regularly',
          'Use leave-in conditioner',
          'Reduce harsh cleansing',
          'Protect hair from excessive heat and friction',
        ],
        ingredients: [
          'Aloe vera',
          'Glycerin',
          'Shea butter',
          'Avocado oil',
          'Jojoba oil',
          'Panthenol',
        ],
        hairTypes: LOOSE,
      },
      {
        id: 'curls-breaking',
        label: 'Breaking',
        problem:
          'Coily hair can be vulnerable to breakage because of its structure, dryness, manipulation, and mechanical stress.',
        signs: ['Short broken hairs', 'Uneven length', 'Split ends', 'Reduced density'],
        solutions: [
          'Detangle gently',
          'Keep hair conditioned',
          'Reduce manipulation',
          'Protect the ends',
          'Avoid tight hairstyles',
        ],
        ingredients: [
          'Hydrolyzed proteins',
          'Ceramides',
          'Panthenol',
          'Shea butter',
          'Aloe vera',
        ],
        hairTypes: LOOSE,
      },
    ],
  },
]

/**
 * The check, filtered to one hair type, with empty groups dropped.
 *
 * A pure function rather than a filter inside the component, so the thing
 * a loc wearer is and is not shown can be read and tested on its own.
 */
export function hairCheckFor(hairType: HairType | undefined): HairCheckGroup[] {
  // With no hair type on file the app knows nothing yet, so it shows the
  // safe subset rather than everything: the same rule the style library
  // follows, where an unclaimed entry is loose-only rather than universal.
  const type = hairType ?? 'Loose Natural'
  return HAIR_CHECK.map((group) => ({
    ...group,
    concerns: group.concerns.filter((concern) => concern.hairTypes.includes(type)),
  })).filter((group) => group.concerns.length > 0)
}
