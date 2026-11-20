import type { IconName } from '../components/Icon'
import { HAIR_TYPES, type HairType } from '../lib/types'

/**
 * The AfroCoils Hair Guide — "Understand your hair. Care for your hair.
 * Style your hair." — read at `/care/guide`.
 *
 * This is the owner's foundation guide for 4C and other tightly coiled
 * hair (AfroCoils_4C_Hair_Education_Guide_and_Starter_Kit.pdf, added
 * 2026-11-20), carried word for word. The only edits are the ones the
 * app's own rules require: "curl" becomes "coil" in visible copy, and
 * the PDF's blank routine-notes table is left out because the calendar
 * is where this app keeps that record (the chapter links to it).
 *
 * Its stance is deliberately conservative — porosity labels are clues,
 * the float test is unreliable, oil does not hydrate, LCO and LOC are
 * methods rather than rules — and the rest of the app already agrees
 * (Hair Discovery says the same about the float test). When a guide in
 * `guides.ts` or an answer in `answers.ts` is edited, it should not
 * start contradicting this.
 *
 * Content is data, like every other guide, so one screen renders it and
 * Ask quotes it (`lib/ask/corpus.ts`, kind `handbook`). Paragraphs and
 * callouts are quotable; lists and tables are shown as the lists they
 * are, never as sentences.
 */

export type HairGuideBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  /**
   * A boxed paragraph. `caution` marks the ones about pain, hair loss
   * and when to see someone — drawn with a warning marker, never tidied
   * away, the same rule as a Quick Hair Check `caution`.
   */
  | { kind: 'callout'; title?: string; text: string; tone?: 'caution' }
  /** Read as cards on a phone: the first column heads each row. */
  | { kind: 'table'; columns: string[]; rows: string[][] }
  /** The 4A / 4B / 4C drawings, from Hair Discovery's illustrations. */
  | { kind: 'coil-types' }
  /** The strand's three layers, side on and in cross-section. */
  | { kind: 'strand' }
  /** The cleanse → condition → leave-in → cream → oil chain. */
  | { kind: 'sequence'; steps: string[] }
  /** A link onward, to the screen where the thing is done. */
  | { kind: 'link'; to: string; label: string; icon: IconName }

export interface HairGuideSection {
  heading?: string
  blocks: HairGuideBlock[]
}

export interface HairGuideChapter {
  id: string
  /** The PDF's own chapter number; the opening chapter has none. */
  number?: number
  title: string
  /**
   * How people ask for it, `|`-separated, for Ask only — never shown.
   * Like `asks` in `answers.ts`: a missed question gets a phrasing here,
   * not looser weights.
   */
  keys?: string
  /**
   * Who it is written for. Omitted means both.
   *
   * Most of the guide is loose-hair technique — combing, detangling,
   * twist-outs, restyling — which is destructive on locs, so those
   * chapters are loose-only and a loc wearer is pointed at Locs World
   * instead. The chapters about what hair *is*, about oils, and the
   * glossary and references, are true for both.
   */
  hairTypes?: HairType[]
  sections: HairGuideSection[]
}

const LOOSE: HairType[] = ['Loose Natural']

export function chapterHairTypes(chapter: HairGuideChapter): HairType[] {
  return chapter.hairTypes ?? [...HAIR_TYPES]
}

/** Chapters for a hair type, in guide order. No type set shows all of them. */
export function hairGuideFor(hairType: HairType | undefined): HairGuideChapter[] {
  if (!hairType) return HAIR_GUIDE
  return HAIR_GUIDE.filter((c) => chapterHairTypes(c).includes(hairType))
}

export const HAIR_GUIDE_TITLE = 'The AfroCoils Hair Guide'
export const HAIR_GUIDE_TAGLINE = 'Understand your hair. Care for your hair. Style your hair.'
export const HAIR_GUIDE_INTRO =
  'A practical, evidence-informed guide to understanding and caring for 4C and other tightly coiled natural hair.'
export const HAIR_GUIDE_START =
  'You do not need a shelf full of products or a complicated routine. You need to understand what your hair is doing, learn how to handle it gently, and build a repeatable routine that fits your life.'

export const HAIR_GUIDE: HairGuideChapter[] = [
  {
    id: 'how-to-use',
    title: 'How to use this guide',
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: 'This guide is designed for people beginning or rebuilding a natural-hair routine, with special attention to 4C hair. It moves in three stages: understand the hair you have, care for it consistently, and style it with less unnecessary manipulation.',
          },
        ],
      },
      {
        heading: 'A note about evidence',
        blocks: [
          {
            kind: 'text',
            text: 'Hair-care advice online often presents personal routines as universal rules. This guide separates three things: (1) well-established hair and scalp-care principles, (2) practical methods that can work but vary from person to person, and (3) personal experiments you should test gently on your own hair. A technique is useful when it improves manageability without causing irritation, excessive buildup, or breakage.',
          },
        ],
      },
      {
        heading: 'What this guide is—and is not',
        blocks: [
          {
            kind: 'list',
            items: [
              'An educational starting point, not a diagnosis or a guarantee of hair growth.',
              'Focused on healthy hair practices and length retention: keeping the hair you grow by reducing avoidable breakage.',
              'Not a prescription for treating scalp disease or unexplained hair loss. Persistent itching, pain, sores, scaling, sudden shedding, bald patches, or thinning should be assessed by a qualified clinician or dermatologist.',
              'Not every person with 4C hair has the same density, strand thickness, porosity, scalp condition, or product needs.',
            ],
          },
          {
            kind: 'callout',
            title: 'The central idea',
            text: 'Your hair does not need to look a certain way to be healthy. The aim is a scalp that is cared for, strands that are handled gently, a routine you can maintain, and styles that suit your preferences.',
          },
        ],
      },
    ],
  },
  {
    id: 'understand',
    number: 1,
    title: 'Understand your hair',
    sections: [
      {
        heading: 'What does 4C mean?',
        blocks: [
          {
            kind: 'text',
            text: 'The commonly used hair-typing system groups hair patterns from Type 1 (straight) through Type 4 (coily). Type 4 hair has very tight coils, bends, or zigzag-like patterns. Type 4C is commonly used to describe a particularly compact coil pattern, often with less visibly defined coil clumping when the hair is in its natural state.',
          },
          { kind: 'coil-types' },
          {
            kind: 'callout',
            title: 'Important',
            text: 'Hair typing is a visual shorthand, not a scientific measurement of health, strength, or what products you must use. One head can have several patterns. Your pattern can also look different depending on length, styling, humidity, products, and whether the hair is stretched.',
          },
          { kind: 'link', to: '/quiz?step=curlPattern', label: 'Find your coil pattern', icon: 'science' },
        ],
      },
      {
        heading: 'Why tightly coiled hair can feel dry',
        blocks: [
          {
            kind: 'text',
            text: 'The scalp produces sebum, an oily substance that helps lubricate the hair and skin. With a straighter strand, sebum can travel down the shaft more easily. With a tightly coiled strand, the bends and turns can make that movement less even. The hair may therefore feel dry along its length even when the scalp produces oil.',
          },
          {
            kind: 'text',
            text: 'The bends in a coily strand can also create points where friction and handling stress concentrate. This does not mean 4C hair is weak or incapable of retaining length. It means gentle handling, conditioning, and friction reduction are especially useful habits.',
          },
        ],
      },
      {
        heading: 'The hair strand, simply explained',
        blocks: [
          { kind: 'strand' },
          {
            kind: 'text',
            text: 'The hair shaft is commonly described in three layers: the outer cuticle, the cortex beneath it, and sometimes a central medulla. The cuticle is made of overlapping cells that help protect the inner structure. Repeated friction, harsh handling, excessive heat, and chemical processing can compromise the shaft and increase breakage.',
          },
        ],
      },
    ],
  },
  {
    id: 'characteristics',
    number: 2,
    title: 'Learn the characteristics that affect your routine',
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: 'Coil pattern is only one piece of the picture. Four other characteristics can help you understand why a product or technique works differently on different heads.',
          },
        ],
      },
      {
        heading: 'Porosity: how readily hair takes in and releases water',
        blocks: [
          {
            kind: 'text',
            text: 'Porosity describes how easily water and some substances move into and out of the hair shaft. It is influenced by the condition of the cuticle and by factors such as heat, chemical processing, weathering, and handling. People often describe hair as low, medium, or high porosity, but these labels are simplified and are not a medical diagnosis.',
          },
          {
            kind: 'table',
            columns: ['Common description', 'What you may notice', 'Practical approach'],
            rows: [
              [
                'Lower porosity',
                'Water or products may seem to sit on the surface; heavy layering can build up.',
                'Use lighter layers, apply conditioner thoroughly, and avoid piling on products.',
              ],
              [
                'Medium porosity',
                'Hair may respond predictably to a balanced routine.',
                'Keep the routine simple and adjust based on results.',
              ],
              [
                'Higher porosity / weathered hair',
                'Hair may wet quickly and lose moisture feel sooner; it may be more vulnerable if damaged.',
                'Prioritise conditioning, gentle handling, and protection from heat/friction.',
              ],
            ],
          },
          {
            kind: 'callout',
            title: 'Do not rely on the floating-hair test',
            text: 'The popular glass-of-water float test is not a reliable stand-alone way to diagnose porosity. Residue, oils, surface tension, hair condition, and how the test is performed can affect what happens. Treat porosity labels as clues, not fixed facts. Observe how your clean hair responds to water, conditioner, and product layering over several wash cycles.',
          },
          { kind: 'link', to: '/porosity', label: 'Take the porosity questions', icon: 'water_drop' },
        ],
      },
      {
        heading: 'Density: how much hair grows on your scalp',
        blocks: [
          {
            kind: 'text',
            text: 'Density refers to how many hair strands are present in a given area. Low density does not mean unhealthy hair, and high density does not automatically mean strong hair. Density can affect how much product you need, how long wash day takes, and how easily you can reach your scalp.',
          },
        ],
      },
      {
        heading: 'Strand thickness: the size of an individual strand',
        blocks: [
          {
            kind: 'text',
            text: 'Fine, medium, and coarse describe the diameter of an individual strand—not how much hair you have. Fine strands may be more easily weighed down by heavy products or stressed by rough handling. Coarser strands may tolerate richer products, but they still need gentle treatment.',
          },
        ],
      },
      {
        heading: 'Elasticity: how hair stretches and returns',
        blocks: [
          {
            kind: 'text',
            text: 'Hair has some ability to stretch and recover. Very rough handling, damage, or dryness can affect how it behaves. Do not repeatedly stretch or snap-test strands to judge health. Instead, notice whether your hair feels unusually brittle, mushy, gummy, or breaks easily during normal handling. If the change is sudden or severe, seek professional advice.',
          },
          { kind: 'link', to: '/quiz', label: 'Answer these in Hair Discovery', icon: 'science' },
        ],
      },
    ],
  },
  {
    id: 'shrinkage-shedding-breakage',
    number: 3,
    title: 'Shrinkage, shedding, and breakage',
    hairTypes: LOOSE,
    sections: [
      {
        heading: 'Shrinkage is normal',
        blocks: [
          {
            kind: 'text',
            text: 'Shrinkage is the way coily hair contracts as it dries. Hair can look much shorter in its natural coiled state than when stretched. Shrinkage is not proof that your hair is not growing. It is a normal feature of textured hair and can vary with coil pattern, moisture, humidity, styling, and length.',
          },
        ],
      },
      {
        heading: 'Shedding is not the same as breakage',
        blocks: [
          {
            kind: 'table',
            columns: ['', 'Shedding', 'Breakage'],
            rows: [
              [
                'What happens',
                'A strand completes its growth cycle and falls from the scalp. A shed strand may have a tiny club-shaped bulb at one end.',
                'A strand snaps somewhere along its length. Pieces may be shorter and may not have a bulb.',
              ],
              [
                'How much',
                'Some daily shedding is normal. The amount varies with wash frequency, hair length, and individual factors.',
                'Frequent breakage can be linked to friction, tangling, tension, heat, chemical damage, or rough detangling.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'How to reduce avoidable breakage',
        blocks: [
          {
            kind: 'list',
            items: [
              'Work in sections so you can see and feel what you are doing.',
              'Use conditioner with enough slip when detangling; start at the ends and gradually work upward.',
              'Use fingers or a wide-tooth comb, and pause when you meet resistance rather than pulling through knots.',
              'Do not force a comb through tightly packed, dry, tangled hair.',
              'Limit repeated restyling, tight ponytails, and styles that pull on the edges or scalp.',
              'Use heat sparingly and follow product instructions for heat protection.',
              'Protect hair from unnecessary rubbing against rough fabrics and bedding.',
            ],
          },
          {
            kind: 'callout',
            title: 'Length retention: what you can control',
            text: "Hair grows from follicles in the scalp. Hair-care routines do not make every person's follicles grow at the same speed. Length retention is about reducing the amount of hair lost through breakage while new growth continues. Consistency, gentle handling, scalp care, and realistic expectations matter more than chasing a miracle product.",
          },
          { kind: 'link', to: '/growth', label: 'Track your length retention', icon: 'trending_up' },
        ],
      },
    ],
  },
  {
    id: 'cleanse-condition',
    number: 4,
    title: 'Cleanse and condition well',
    hairTypes: LOOSE,
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: 'A healthy routine includes cleaning the scalp. Oils, sweat, dead skin, styling products, and environmental debris can build up. Leaving buildup for too long may cause discomfort or worsen some scalp conditions. On the other hand, harsh or overly frequent cleansing can leave some hair feeling dry. The right schedule depends on your scalp, activity, products, and hairstyle.',
          },
        ],
      },
      {
        heading: 'How often should you wash?',
        blocks: [
          {
            kind: 'callout',
            text: 'A useful starting point for many people with tightly coiled hair is roughly every 1–2 weeks, then adjust. Some may need more frequent washing; others may wash less often depending on scalp needs and styling. Do not treat any interval as a rule that overrides itching, heavy buildup, sweat, or medical advice.',
          },
          { kind: 'link', to: '/calendar', label: 'Set your wash-day cadence', icon: 'calendar_month' },
        ],
      },
      {
        heading: 'A simple wash-day sequence',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              'Before washing, divide hair into manageable sections if this makes it easier to handle.',
              'Thoroughly wet the scalp and hair with lukewarm water.',
              'Apply shampoo mainly to the scalp. Massage with the pads of your fingers, not your nails. Let the lather rinse through the lengths rather than scrubbing the lengths together.',
              'Rinse well. Repeat only if needed—for example, when there is substantial buildup or the product instructions recommend it.',
              'Apply rinse-out conditioner, concentrating on the lengths and ends. Follow the product directions and allow it time to work.',
              'Detangle gently while the hair is conditioned and slippery, if that works best for your hair. Use sections and avoid force.',
              'Rinse as directed. Blot or squeeze out excess water with a soft T-shirt or smooth towel; do not rub vigorously.',
              'Apply your leave-in or moisturising products to damp hair, then style gently.',
            ],
          },
        ],
      },
      {
        heading: 'Shampoo, conditioner, and deep conditioner',
        blocks: [
          {
            kind: 'table',
            columns: ['Product', 'Main job', 'What to look for'],
            rows: [
              [
                'Shampoo',
                'Removes soil, sweat, oil, and product buildup from scalp and hair.',
                'A cleanser that leaves your scalp comfortable. Sulfate-free is an option, not a universal requirement.',
              ],
              [
                'Rinse-out conditioner',
                'Improves slip, softness, and manageability after cleansing.',
                'A formula that helps your hair detangle with less force.',
              ],
              [
                'Deep conditioner / mask',
                'Provides a more intensive conditioning step when hair needs it.',
                'Use according to directions; more time or more product is not automatically better.',
              ],
              [
                'Leave-in conditioner',
                'Provides light conditioning after rinsing and can support styling.',
                'Choose a texture that layers well and does not irritate your scalp.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'A clean scalp is not the same as squeaky hair',
        blocks: [
          {
            kind: 'text',
            text: 'If hair feels stripped, tangled, or rough after every wash, reconsider the cleanser, technique, water temperature, and conditioning step. The goal is a comfortable scalp and manageable lengths—not a squeaky feeling.',
          },
        ],
      },
    ],
  },
  {
    id: 'moisture-layering',
    number: 5,
    title: 'Moisture, hydration, and product layering',
    hairTypes: LOOSE,
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: "People often say that hair needs moisture. In hair care, this usually means improving the hair's water content temporarily and using conditioning ingredients that help the strand feel smoother, softer, and easier to manage. Hair is not living tissue along its length, so products do not permanently repair it or make it biologically healthier. They can, however, reduce friction and improve handling.",
          },
        ],
      },
      {
        heading: 'Water versus oil',
        blocks: [
          {
            kind: 'callout',
            text: 'Water is the main source of hydration in a routine. Oils are not water and do not hydrate hair by themselves. Oils can lubricate the shaft, reduce friction, and in some cases help limit water loss or protein loss. A product that makes hair feel soft is not necessarily adding water; it may be coating or conditioning the strand.',
          },
        ],
      },
      {
        heading: 'A practical layering sequence',
        blocks: [
          { kind: 'sequence', steps: ['Cleanse', 'Condition', 'Leave-in', 'Cream', 'Oil (optional)'] },
          {
            kind: 'text',
            text: 'One common approach is to apply a water-based leave-in, then a cream, then a small amount of oil if needed. This is often called LCO (Liquid/Leave-in, Cream, Oil). Some people prefer LOC (Liquid/Leave-in, Oil, Cream). Neither order is a universal scientific rule. The best sequence depends on the products, hair response, climate, and personal preference.',
          },
        ],
      },
      {
        heading: 'How to test LCO or LOC',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              'Start with clean, damp—not dripping—hair in sections.',
              'Apply a modest amount of leave-in and distribute it evenly.',
              'Apply cream only if you need more softness, definition, or help with styling.',
              'Use a little oil last (LCO) or before cream (LOC) only if it improves slip or helps your hair feel comfortable.',
              'Compare the results over several wash cycles: softness, tangling, buildup, drying time, and ease of restyling.',
            ],
          },
        ],
      },
      {
        heading: 'Signs you may be using too much',
        blocks: [
          {
            kind: 'list',
            items: [
              'Hair feels coated, sticky, waxy, or unusually heavy.',
              'Products sit on the hair and are difficult to wash out.',
              'Your scalp becomes itchy or irritated after application.',
              'Hair feels less manageable despite adding more layers.',
            ],
          },
          {
            kind: 'callout',
            text: 'You do not need all three layers every day. Some hair does well with a leave-in alone; some benefits from a cream; oil may be optional. Adjust based on results rather than following a fixed number of products.',
          },
        ],
      },
    ],
  },
  {
    id: 'oils',
    number: 6,
    title: 'Oils: what they can and cannot do',
    keys: 'coconut oil|olive oil|sunflower oil|jojoba oil|argan oil|mineral oil|essential oils|scalp oil|oiling my scalp|which oil|is oil good for my hair',
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: 'Oils are useful tools, but they are often over-promised. An oil does not replace shampoo, conditioner, or water. It does not make hair grow directly from the scalp. Depending on the oil and how it is used, it may improve lubrication, reduce friction, support styling, or help limit certain kinds of hair-shaft damage.',
          },
          {
            kind: 'table',
            columns: ['Oil / category', 'What evidence or practical use suggests', 'Keep in mind'],
            rows: [
              [
                'Coconut oil',
                'Research has found it can reduce protein loss from hair under studied conditions and may penetrate the hair shaft better than some oils.',
                'Not everyone likes its feel; it can make some hair feel stiff or coated. Use a small amount and test.',
              ],
              [
                'Other plant oils (e.g. olive, sunflower, jojoba, argan)',
                'May provide lubrication, shine, and help reduce friction on the hair surface.',
                'Effects vary by oil and formulation. Do not assume all oils penetrate or behave alike.',
              ],
              [
                'Mineral oil / oil blends',
                'Can coat and lubricate the strand; may help reduce friction in some routines.',
                'A coating effect is not the same as hydration. Product quality and individual response matter.',
              ],
              [
                'Essential oils',
                'Some are used in cosmetic formulations for scent or specific purposes.',
                'Concentrated essential oils can irritate or trigger allergy. Never apply undiluted; they are not required for a basic routine.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Scalp oiling is optional',
        blocks: [
          {
            kind: 'callout',
            tone: 'caution',
            text: 'A dry-feeling scalp does not automatically need oil. Scalp itching, flakes, redness, tenderness, or sores may have causes that oil cannot treat and may sometimes be worsened by heavy products. If you use oil, keep the amount modest and stop if irritation occurs. Persistent symptoms deserve professional assessment.',
          },
        ],
      },
      {
        heading: 'A sensible oil routine',
        blocks: [
          {
            kind: 'list',
            items: [
              'Use oil on the lengths when you want extra lubrication or to reduce friction—not because a schedule says you must.',
              'Try a small amount first; more oil does not equal more moisture.',
              'Consider a pre-wash oil treatment if it suits your hair and washes out comfortably.',
              'Cleanse the scalp regularly enough to prevent uncomfortable buildup.',
              'Patch-test new products on a small area of skin and stop if you develop burning, rash, or swelling.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'protect',
    number: 7,
    title: 'Protect your hair between wash days',
    hairTypes: LOOSE,
    sections: [
      {
        heading: 'Night protection',
        blocks: [
          {
            kind: 'text',
            text: 'A satin or silk bonnet, scarf, or pillowcase can reduce friction between hair and bedding. This can help reduce tangling and friction-related breakage. The bonnet should be comfortable—not painfully tight—and should not pull at the hairline. If a bonnet will not stay on, a satin pillowcase is a useful alternative.',
          },
        ],
      },
      {
        heading: 'Simple night routine',
        blocks: [
          {
            kind: 'list',
            items: [
              'Loosely gather or section hair in a way that does not pull.',
              'Use a satin bonnet or scarf, or sleep on a satin/silk pillowcase.',
              'Do not tie hair so tightly that your scalp feels sore.',
              'If hair feels dry in the morning, lightly mist or use a small amount of leave-in as needed; avoid soaking it every day if that creates tangles or prolonged dampness.',
            ],
          },
        ],
      },
      {
        heading: 'Protective styles versus low-manipulation styles',
        blocks: [
          {
            kind: 'callout',
            text: 'A protective style is intended to reduce daily handling and shield some of the hair from friction. A low-manipulation style is one that requires less frequent combing, brushing, or restyling. A style is not protective just because it has a popular name. It should be comfortable, not too heavy, not too tight, and maintained so the scalp can be cleaned and checked.',
          },
          {
            kind: 'table',
            columns: ['Style approach', 'Potential benefit', 'Watch out for'],
            rows: [
              [
                'Loose twists / plaits',
                'Can keep sections organised and reduce daily detangling.',
                'Avoid excessive tension and tiny, tight sections if they cause stress.',
              ],
              [
                'Braids / cornrows',
                'Can reduce daily styling time and friction when installed and maintained gently.',
                'Pain, bumps, pulling edges, heavy extensions, and prolonged tension are warning signs.',
              ],
              [
                'Buns / puffs',
                'Quick, accessible styles.',
                'Repeated tight placement can stress the same areas, especially the hairline.',
              ],
              [
                'Wigs / extensions',
                'Can offer styling flexibility and reduce some daily manipulation.',
                'Avoid tight caps, adhesive irritation, poor scalp access, and neglecting cleansing.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Pain is a warning sign',
        blocks: [
          {
            kind: 'callout',
            tone: 'caution',
            text: 'A style that causes pain, headaches, bumps, or persistent scalp tenderness is too tight or too stressful. Loosen or remove it. Repeated tension can contribute to traction-related hair loss, which may become permanent if the follicles are damaged.',
          },
        ],
      },
    ],
  },
  {
    id: 'styling',
    number: 8,
    title: 'Styling 4C hair with less stress',
    hairTypes: LOOSE,
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: 'Styling should support your life, not turn wash day into a battle. The goal is to choose styles that suit your time, skill, hair condition, and comfort.',
          },
        ],
      },
      {
        heading: 'A gentle detangling method',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              'Work on damp, conditioned hair or use a suitable detangling product with slip.',
              'Divide hair into sections you can comfortably manage.',
              'Hold the section above the area you are detangling to reduce pulling at the roots.',
              'Begin at the ends, gently loosening tangles before moving upward.',
              'Use fingers first for stubborn knots; then use a wide-tooth comb if needed.',
              'Do not rush. If the hair is resisting, add conditioner or water as appropriate and work more slowly.',
            ],
          },
        ],
      },
      {
        heading: 'Beginner-friendly style ideas',
        blocks: [
          {
            kind: 'table',
            columns: ['Style', 'Basic idea', 'Why it can be practical'],
            rows: [
              [
                'Two-strand twists',
                'Divide a section into two strands and wrap them around each other.',
                'Keeps hair organised; can be worn as twists or unravelled for a twist-out.',
              ],
              [
                'Flat twists',
                'Twist sections close to the scalp while adding hair as you move.',
                'Can create a neat style without extensions; practice with larger sections.',
              ],
              [
                'Braid-out',
                'Braid damp, conditioned sections and unravel when fully dry.',
                'Creates stretched texture and can reduce daily restyling.',
              ],
              [
                'Puff',
                'Gather hair loosely into a puff using a soft band or scarf.',
                'Quick style; vary placement and avoid tight pulling.',
              ],
              [
                'Chunky plaits',
                'Make a few larger plaits to organise the hair.',
                'Simple, beginner-friendly, and easy to maintain gently.',
              ],
            ],
          },
          { kind: 'link', to: '/styles', label: 'See the style library', icon: 'checkroom' },
        ],
      },
      {
        heading: 'Avoid making a style last at all costs',
        blocks: [
          {
            kind: 'text',
            text: 'A style should be refreshed or removed if it becomes tangled, uncomfortable, dirty, or difficult to maintain. A long-lasting style is not automatically a healthy style. Keep the scalp accessible and pay attention to how your hair and edges feel.',
          },
        ],
      },
      {
        heading: 'Heat and chemical services',
        blocks: [
          {
            kind: 'text',
            text: 'Frequent high heat can damage the hair shaft. If you use heat, start with clean, conditioned hair, use an appropriate heat protectant, keep the temperature as low as practical, and limit repeated passes. Chemical relaxers and other texture-altering services change the hair structure and need careful handling. This guide focuses on natural-hair care; seek a qualified professional for chemical or high-heat services.',
          },
        ],
      },
    ],
  },
  {
    id: 'routine',
    number: 9,
    title: 'Build a routine you can actually keep',
    keys: 'is my routine working|routine is working|simple routine|beginner routine|hair journal|weekly routine',
    hairTypes: LOOSE,
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: 'A routine should be simple enough to repeat. You can begin with a few core steps and add products only when you can identify a reason.',
          },
        ],
      },
      {
        heading: 'A beginner weekly / fortnightly rhythm',
        blocks: [
          {
            kind: 'table',
            columns: ['Moment', 'What to do', 'Keep it simple'],
            rows: [
              [
                'Wash day (often every 1–2 weeks as a starting point)',
                'Cleanse scalp, condition lengths, detangle gently, apply leave-in, style.',
                'Adjust the frequency to your scalp and buildup.',
              ],
              [
                'Between wash days',
                'Refresh only where needed with a little water-based leave-in or a light mist; restyle gently.',
                'Do not automatically reapply every product each day.',
              ],
              [
                'At night',
                'Loosely protect hair with bonnet, scarf, or satin pillowcase.',
                'Comfort matters; no tight tying.',
              ],
              [
                'When styling',
                'Choose low-tension, low-manipulation styles that suit your schedule.',
                'Change styles if they cause pain or excessive tangling.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'How to know if your routine is working',
        blocks: [
          {
            kind: 'list',
            items: [
              'Your scalp feels comfortable and can be cleaned properly.',
              'Detangling takes less force and results in fewer snapped strands.',
              'Hair feels manageable between wash days without excessive product layering.',
              'You can maintain the routine without spending beyond your budget or exhausting yourself.',
              'Styles are comfortable and do not cause pain, bumps, or persistent tension.',
            ],
          },
        ],
      },
      {
        heading: 'Keep a simple hair journal',
        blocks: [
          {
            kind: 'text',
            text: 'Record your wash date, products used, style, how your scalp felt, how detangling went, and what you would change next time. Change one major thing at a time where possible. That makes it easier to identify what actually helped instead of changing everything at once.',
          },
          { kind: 'link', to: '/calendar', label: 'Log wash days in your calendar', icon: 'calendar_month' },
        ],
      },
      {
        heading: 'A reminder about growth',
        blocks: [
          {
            kind: 'callout',
            text: 'Photographs taken under similar lighting and with similar styling can help you observe changes over months. Do not compare stretched hair in one photo with shrunken hair in another. Hair growth is gradual, and day-to-day appearance is affected by shrinkage, styling, and moisture.',
          },
          { kind: 'link', to: '/growth', label: 'Record a length check', icon: 'straighten' },
        ],
      },
    ],
  },
  {
    id: 'products',
    number: 10,
    title: 'Choose products without getting overwhelmed',
    hairTypes: LOOSE,
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: "You do not need a product marketed specifically for 4C hair to care for 4C hair. Labels can help you understand a product's intended use, but your scalp comfort and hair response are more useful than marketing claims.",
          },
        ],
      },
      {
        heading: 'A practical shopping checklist',
        blocks: [
          {
            kind: 'list',
            items: [
              'Choose a shampoo that cleans your scalp without leaving it persistently uncomfortable.',
              'Choose a rinse-out conditioner that gives enough slip for gentle detangling.',
              'Choose a leave-in conditioner that does not irritate your scalp or leave excessive buildup.',
              'Add a cream or oil only if it solves a specific problem for your hair.',
              'Read directions and ingredient lists, especially if you have known sensitivities.',
              'Buy smaller sizes first when testing an unfamiliar product, if available.',
            ],
          },
        ],
      },
      {
        heading: 'Common claims to question',
        blocks: [
          {
            kind: 'table',
            columns: ['Claim', 'A more accurate way to think about it'],
            rows: [
              [
                '“This oil will grow your hair fast.”',
                'Oils may condition or lubricate hair, but they do not guarantee faster follicle growth.',
              ],
              [
                '“Everyone with 4C hair needs the same routine.”',
                'Hair characteristics, scalp needs, climate, styling, and budget differ.',
              ],
              [
                '“Never use shampoo; it dries hair.”',
                'The scalp needs cleansing. Choose a suitable cleanser and condition the lengths.',
              ],
              [
                '“The floating test tells your exact porosity.”',
                'It is not a reliable stand-alone diagnostic test.',
              ],
              [
                '“Protective styles cannot damage hair.”',
                'Tension, weight, poor maintenance, and lack of scalp access can cause damage.',
              ],
              [
                '“More products mean more moisture.”',
                'Too many layers can cause buildup and make hair harder to manage.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Do not confuse a product effect with a biological change',
        blocks: [
          {
            kind: 'callout',
            text: "A conditioner can make hair feel smoother; an oil can reduce friction; a styling cream can help define or hold a style. These are useful cosmetic effects, but they do not mean a product has permanently changed the hair's biology or guaranteed growth.",
          },
          { kind: 'link', to: '/products', label: 'See the product shelf', icon: 'storefront' },
        ],
      },
    ],
  },
  {
    id: 'starter-kit',
    number: 11,
    title: 'The AfroCoils beginner starter kit',
    keys: 'starter kit|beginner|new to natural hair|start my natural hair journey|starting natural hair|what do i need to start|essentials|what to buy first',
    hairTypes: LOOSE,
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: 'The starter kit is meant to help someone begin with the essentials—not encourage unnecessary spending. Start with the core items below. You can build on them later as you learn what your hair responds to.',
          },
        ],
      },
      {
        heading: 'Core essentials',
        blocks: [
          {
            kind: 'table',
            columns: ['Item', 'Why it is useful', 'Budget-friendly substitute / note'],
            rows: [
              [
                'Satin bonnet',
                'Reduces friction while sleeping and helps keep hair contained.',
                'A satin scarf or satin pillowcase can work. Choose a comfortable fit that does not pull.',
              ],
              [
                'Spray bottle',
                'Lets you lightly re-wet sections during styling or refreshing.',
                'A clean, reusable mist bottle is enough. Plain water is fine; no special mixture is required.',
              ],
              [
                'Wide-tooth comb',
                'Helps detangle with more space between teeth.',
                'Fingers can be your first detangling tool. A smooth, wide-tooth comb is a useful addition.',
              ],
              [
                'Shampoo',
                'Cleans scalp and removes buildup.',
                'One suitable shampoo is enough to start; you do not need several cleansers.',
              ],
              [
                'Rinse-out conditioner',
                'Adds slip and makes detangling easier.',
                'Prioritise a conditioner that works for your hair over a product with elaborate claims.',
              ],
              [
                'Leave-in conditioner',
                'Provides conditioning after wash day and supports styling.',
                'Choose one leave-in to begin; it need not be expensive or heavily fragranced.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'Useful additions—not all required on day one',
        blocks: [
          {
            kind: 'table',
            columns: ['Item', 'When it helps'],
            rows: [
              [
                'Sectioning clips',
                'Useful for keeping hair divided during wash day and styling. Use clips with smooth edges.',
              ],
              [
                'Soft T-shirt / microfibre towel',
                'Helps blot excess water without vigorous rubbing. A clean cotton T-shirt is an inexpensive option.',
              ],
              [
                'Moisturising cream',
                'Useful if leave-in alone does not provide enough softness, styling support, or manageability.',
              ],
              [
                'A small bottle of oil',
                'Optional for lubrication or sealing feel on the lengths. It is not a substitute for water or conditioner.',
              ],
              ['Satin pillowcase', 'A useful backup if a bonnet slips off or feels uncomfortable.'],
              [
                'Detangling brush',
                'Optional. Only choose one that works gently for your hair and learn to use it without force.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'What you can skip at the beginning',
        blocks: [
          {
            kind: 'list',
            items: [
              'Multiple oils, butters, and creams before you know what your hair needs.',
              'Several shampoos and conditioners that do the same job.',
              'Expensive growth serums or products promising dramatic results.',
              'Essential oils or homemade mixtures that may irritate the scalp.',
              'Special tools you do not yet know how to use.',
              "Buying every product recommended by an influencer. One person's routine is not a universal prescription.",
            ],
          },
          {
            kind: 'callout',
            title: 'The minimum viable kit',
            text: 'Bonnet or satin alternative + spray bottle + wide-tooth comb + shampoo + rinse-out conditioner + leave-in conditioner. Begin here. Add a cream, oil, clips, or other tools only when you have a clear use for them.',
          },
        ],
      },
    ],
  },
  {
    id: 'first-wash-day',
    number: 12,
    title: 'Your first wash day: a beginner walkthrough',
    hairTypes: LOOSE,
    sections: [
      {
        heading: 'Before you begin',
        blocks: [
          {
            kind: 'list',
            items: [
              'Set out your shampoo, conditioner, leave-in, comb or clips, towel/T-shirt, and bonnet.',
              'Give yourself enough time. Rushing is one of the easiest ways to pull or break hair.',
              'Decide whether you will work in sections. For dense or long hair, sections often make the process easier.',
            ],
          },
        ],
      },
      {
        heading: 'Step-by-step',
        blocks: [
          {
            kind: 'table',
            columns: ['Step', 'Action', 'Remember'],
            rows: [
              [
                '1. Section',
                'Divide hair into manageable parts if useful.',
                'Do not make sections so small that the process becomes exhausting.',
              ],
              ['2. Wet', 'Saturate scalp and hair with lukewarm water.', 'Give water time to reach the hair.'],
              [
                '3. Cleanse',
                'Apply shampoo to scalp and massage gently with fingertips.',
                'Do not scratch with nails or scrub lengths together.',
              ],
              [
                '4. Condition',
                'Apply conditioner to lengths and ends; follow label directions.',
                'Use enough slip to make handling easier.',
              ],
              ['5. Detangle', 'Work from ends upward in sections.', 'Pause at knots; never force the comb.'],
              [
                '6. Rinse',
                'Rinse as directed, ensuring scalp is comfortable and not coated.',
                'Remove excess product buildup.',
              ],
              [
                '7. Condition/style',
                'Apply leave-in; add cream or oil only if useful.',
                'Use small amounts and observe the result.',
              ],
              [
                '8. Protect',
                'Choose a comfortable low-manipulation style and cover for sleep.',
                'No painful tension.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'After wash day',
        blocks: [
          {
            kind: 'text',
            text: 'Notice how long your hair remains manageable, whether the scalp stays comfortable, and whether detangling is easier next time. If a product causes itching, burning, rash, or swelling, stop using it. If a routine consistently leaves hair coated or difficult to handle, simplify it and reassess.',
          },
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    number: 13,
    title: 'Troubleshooting common experiences',
    hairTypes: LOOSE,
    sections: [
      {
        blocks: [
          {
            kind: 'table',
            columns: ['What you notice', 'Possible reasons', 'What to try'],
            rows: [
              [
                'Hair feels dry soon after styling',
                'Not enough conditioning; product mismatch; too much friction; dry environment; or buildup preventing products from working well.',
                'Check cleansing and conditioning first. Try smaller, simpler layers and protect hair at night.',
              ],
              [
                'Hair feels greasy or coated',
                'Too much oil/cream; heavy layering; inadequate cleansing; product not suited to your hair.',
                'Reduce the amount, remove unnecessary layers, and cleanse the scalp and hair appropriately.',
              ],
              [
                'Detangling takes a long time',
                'Hair is tangled, sections are too large, there is not enough slip, or detangling is being delayed too long.',
                'Use sections, add conditioner or detangler, start at ends, and take breaks.',
              ],
              [
                'Hair breaks during combing',
                'Rough handling, dryness, knots, tension, heat/chemical damage, or tool choice may contribute.',
                'Stop pulling; add slip, use fingers first, and change the technique or tool.',
              ],
              [
                'Scalp is itchy or flaky',
                'Buildup, irritation, dandruff/seborrhoeic dermatitis, eczema, psoriasis, or another condition may be involved.',
                'Avoid scratching and adding many oils. Seek clinical advice if persistent, severe, painful, or recurrent.',
              ],
              [
                'Edges look thinner',
                'Repeated tension, tight styles, chemical/heat damage, or a medical hair-loss condition may contribute.',
                'Stop tight styles and seek early assessment from a dermatologist or clinician.',
              ],
            ],
          },
        ],
      },
      {
        heading: 'When to seek professional help',
        blocks: [
          {
            kind: 'callout',
            tone: 'caution',
            text: 'Seek medical assessment for sudden or patchy hair loss, widening part, persistent thinning, scalp pain, sores, swelling, severe itching, thick scaling, or changes that continue despite gentler care. Hair loss can have causes that a cosmetic routine cannot address. Early assessment can matter.',
          },
          { kind: 'link', to: '/sos/problem', label: 'Open the Quick Hair Check', icon: 'warning' },
        ],
      },
    ],
  },
  {
    id: 'glossary',
    number: 14,
    title: 'Quick glossary',
    sections: [
      {
        blocks: [
          {
            kind: 'table',
            columns: ['Term', 'Plain-language meaning'],
            rows: [
              ['Afro-textured hair', 'A broad description for hair with coily or tightly coiled patterns.'],
              ['4C', 'A commonly used label for a very tight, compact coily pattern; not a diagnosis.'],
              ['Porosity', 'How readily water and certain substances move into and out of the hair shaft.'],
              ['Density', 'How many strands grow in a given area of the scalp.'],
              ['Strand thickness', 'The diameter of an individual hair strand.'],
              ['Elasticity', "The hair fibre's ability to stretch and recover to some extent."],
              ['Shrinkage', 'The contraction of coily hair as it dries or returns to its natural pattern.'],
              ['Shedding', 'The release of a hair strand from the scalp as part of the growth cycle.'],
              ['Breakage', 'A hair strand snapping along its length.'],
              ['Length retention', 'Keeping the length that grows by reducing avoidable breakage.'],
              [
                'LCO / LOC',
                'Product-layering sequences: leave-in/liquid, cream, oil; or leave-in/liquid, oil, cream.',
              ],
              ['Low manipulation', 'A routine or style that reduces frequent handling and restyling.'],
              ['Traction alopecia', 'Hair loss caused by repeated pulling or tension on hair follicles.'],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'references',
    number: 15,
    title: 'Research notes and references',
    sections: [
      {
        blocks: [
          {
            kind: 'text',
            text: 'This guide draws on dermatology guidance and published hair-science literature. Recommendations are presented conservatively: research on hair fibres does not always translate into a guaranteed result for every individual, and some popular routines (including LCO/LOC) are practical methods rather than clinically proven universal protocols.',
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              'American Academy of Dermatology (AAD). “Black hair: Tips for everyday care.” Dermatologist guidance on cleansing, conditioning, heat, and avoiding tight styles.',
              'American Academy of Dermatology (AAD). “10 hair care habits that can damage your hair.” Guidance on shampoo technique, conditioning, detangling, heat, and tension.',
              'British Association of Dermatologists. “Caring for Afro-textured hair.” Practical guidance on cleansing, conditioning, moisturising, detangling, and satin/silk protection.',
              'DermNet. “Hair care practices in women of African descent.” Dermatology overview of cleansing, conditioning, styling, and heat.',
              'Rele, A. S. & Mohile, R. B. (2003). “Effect of mineral oil, sunflower oil, and coconut oil on prevention of hair damage.” Journal of Cosmetic Science. Study reporting reduced protein loss with coconut oil under the tested conditions.',
              '“Hair Cosmetics: An Overview.” Review article discussing hair-shaft structure, conditioning, and cosmetic oils.',
              '“Afro-textured hair care: a narrative review and recommendations for dermatologists.” Published review discussing Afro-textured hair structure, care practices, products, and styling-related risks.',
            ],
          },
        ],
      },
      {
        heading: 'Educational-use note',
        blocks: [
          {
            kind: 'callout',
            tone: 'caution',
            text: "This guide is for general education and does not replace individual medical advice. Hair products and routines should be adapted to the person's scalp, hair condition, sensitivities, lifestyle, and budget. Where symptoms suggest a scalp or hair-loss condition, consult a qualified healthcare professional.",
          },
        ],
      },
    ],
  },
]
