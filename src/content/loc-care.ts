/**
 * Locs World — the loc reference, at `/locs`.
 *
 * Its own section deliberately, not a chapter of Hair Care. Locs are not
 * a style worn on loose hair, they are a different thing to own, and
 * filing them under general care is how a loc wearer ends up reading
 * loose-hair technique that would damage their hair.
 *
 * **Two states, and the difference is visible on purpose.** A section is
 * either written (`blocks` carrying real signs, solutions and
 * ingredients — chapter 11's problems, chapter 12's labels, chapter 13's
 * routines) or an `outline: true` list of the topics a written guide
 * will cover. Outline sections render as topic chips rather than as
 * advice, because a bullet reading "How locs form" is a heading somebody
 * still has to write, not an answer, and dressing it up as one would
 * make the app claim it knows something it does not.
 *
 * That is the same bargain the image slots take: a placeholder renders so
 * the layout is final before the photography is. Fill a section in by
 * dropping the prose into `blocks` and deleting its `outline` flag —
 * nothing else has to change.
 *
 * Nothing here is generated, and nothing here diagnoses. Chapter 16 is
 * the escalation path, and it is content rather than a footnote: locs
 * fail at the root and the scalp, and both of those are a professional's
 * job long before they are a product's.
 */

export type LocBlock = {
  /** 'Signs', 'Solutions', 'Look for'. Absent where the list needs no label. */
  label?: string
  items: string[]
  /** A sequence rather than a set — Wash, then Moisturise, then Dry. */
  ordered?: boolean
  /**
   * Things to avoid rather than things to do. Drawn with a struck-through
   * marker: a tick beside "petroleum-heavy products" reads as an
   * instruction to use them, which is the opposite of the advice.
   */
  tone?: 'avoid'
}

export type LocSection = {
  heading: string
  note?: string
  /** True while `items` are the topics a guide will cover, not the guide. */
  outline?: boolean
  blocks: LocBlock[]
}

export type LocChapter = {
  id: string
  title: string
  sections: LocSection[]
}

export const LOC_CARE: LocChapter[] = [
  {
    id: 'basics',
    title: 'Loc basics',
    sections: [
      {
        heading: 'What are locs?',
        outline: true,
        blocks: [
          {
            items: [
              'What locs are',
              'How locs form',
              'How locs grow',
              'Locs vs loose natural hair',
              'Common misconceptions about locs',
            ],
          },
        ],
      },
      {
        heading: 'Are locs right for you?',
        outline: true,
        blocks: [
          {
            items: [
              'Lifestyle',
              'Hair type and texture',
              'Maintenance commitment',
              'Time and patience',
              'Professional and personal considerations',
            ],
          },
        ],
      },
      {
        heading: 'Types of locs',
        blocks: [
          {
            items: [
              'Traditional locs',
              'Sisterlocks',
              'Microlocs',
              'Freeform locs',
              'Semi-freeform locs',
              'Interlocked locs',
              'Palm-rolled locs',
            ],
          },
        ],
      },
      {
        heading: 'Loc terminology',
        outline: true,
        blocks: [
          {
            items: [
              'Starter locs',
              'Roots',
              'New growth',
              'Budding',
              'Maturation',
              'Retwist',
              'Interlocking',
              'Loc repair',
              'Loc extensions',
              'Combining locs',
              'Locs thinning',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'starting',
    title: 'Starting your locs',
    sections: [
      {
        heading: 'Before you start',
        outline: true,
        blocks: [
          {
            items: [
              'Choosing a loc method',
              'Preparing your hair',
              'Starting with clean hair',
              'Choosing a professional loctician',
              'What to expect during the first few months',
            ],
          },
        ],
      },
      {
        heading: 'Starter locs',
        outline: true,
        blocks: [
          {
            items: [
              'Washing starter locs',
              'Keeping starter locs clean',
              'Moisturising starter locs',
              'Sleeping with starter locs',
              'Preventing unravelling',
              'When to retwist',
              'What not to do',
            ],
          },
        ],
      },
      {
        heading: 'The loc journey',
        note: 'Four stages, and what changes at each one.',
        outline: true,
        blocks: [
          {
            label: 'Stage 1 — Starter locs',
            items: ['What to expect', 'Washing', 'Unravelling', 'Frizz'],
          },
          {
            label: 'Stage 2 — Budding',
            items: [
              'What budding looks like',
              'Changes in texture',
              'Increased thickness',
            ],
          },
          {
            label: 'Stage 3 — Teenage locs',
            items: ['Frizz', 'Shrinking', 'Unevenness', 'Changing texture'],
          },
          {
            label: 'Stage 4 — Mature locs',
            items: ['Maintenance', 'Moisture', 'Strength', 'Styling'],
          },
        ],
      },
    ],
  },
  {
    id: 'washing',
    title: 'Washing and cleansing',
    sections: [
      {
        heading: 'How to wash locs',
        outline: true,
        blocks: [
          {
            items: [
              'How often to wash',
              'How to properly wet locs',
              'Shampooing the scalp',
              'Cleaning the length of the loc',
              'Rinsing properly',
              'Drying locs properly',
            ],
          },
        ],
      },
      {
        heading: 'Washing different types of locs',
        outline: true,
        blocks: [{ items: ['Starter locs', 'Microlocs', 'Mature locs', 'Freeform locs'] }],
      },
      {
        heading: 'Product buildup',
        outline: true,
        blocks: [
          {
            items: [
              'What causes buildup',
              'How to recognise buildup',
              'How to prevent buildup',
              'Clarifying locs',
            ],
          },
        ],
      },
      {
        heading: 'Drying locs',
        outline: true,
        blocks: [
          {
            items: [
              'Why locs must dry properly',
              'Air drying',
              'Towel drying',
              'Blow-drying',
              'Preventing mildew and unpleasant odour',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'scalp',
    title: 'Scalp care',
    sections: [
      {
        heading: 'A healthy loc scalp',
        outline: true,
        blocks: [
          {
            items: [
              'Keeping the scalp clean',
              'Scalp moisturising',
              'Scalp massage',
              'Managing oil production',
              'Avoiding excessive product',
            ],
          },
        ],
      },
      {
        heading: 'Common scalp problems',
        note: 'Each will cover the problem, its signs, its possible causes, what to do, what to look for on a label, and when to see a professional.',
        outline: true,
        blocks: [
          {
            items: [
              'Itchy scalp',
              'Dandruff',
              'Dry scalp',
              'Oily scalp',
              'Scalp buildup',
              'Irritation',
              'Folliculitis',
              'Scalp odour',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'moisture',
    title: 'Moisture and hydration',
    sections: [
      {
        heading: 'Understanding moisture',
        outline: true,
        blocks: [
          {
            items: [
              'Why locs need moisture',
              'How often to moisturise',
              'Signs of dry locs',
              'Signs of over-moisturising',
            ],
          },
        ],
      },
      {
        heading: 'Moisturising locs',
        blocks: [
          {
            items: [
              'Water-based moisturisers',
              'Loc sprays',
              'Lightweight oils',
              'Scalp moisturising',
              'Avoiding heavy products',
            ],
          },
        ],
      },
      {
        heading: 'What to look for',
        blocks: [
          {
            label: 'Look for',
            items: [
              'Aloe vera',
              'Glycerin',
              'Panthenol',
              'Rose water',
              'Jojoba oil',
              'Argan oil',
              'Grapeseed oil',
            ],
          },
          {
            label: 'Be careful with',
            tone: 'avoid',
            items: [
              'Heavy waxes',
              'Petroleum-heavy products',
              'Excessive butter',
              'Heavy oils',
              'Products that leave visible residue',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'retwisting',
    title: 'Retwisting and maintenance',
    sections: [
      {
        heading: 'Retwisting',
        outline: true,
        blocks: [
          {
            items: [
              'What a retwist is',
              'When to retwist',
              'How often to retwist',
              'Retwisting too frequently',
              'Retwisting too tightly',
              'Retwist vs interlocking',
            ],
          },
        ],
      },
      {
        heading: 'Healthy retwisting',
        blocks: [
          {
            items: [
              'Protect the roots',
              'Avoid excessive tension',
              'Maintain healthy edges',
              'Choose your loctician carefully',
            ],
          },
        ],
      },
      {
        heading: 'Interlocking',
        outline: true,
        blocks: [
          {
            items: [
              'What interlocking is',
              'Who may benefit from it',
              'Advantages',
              'Potential risks',
              'Proper maintenance',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'roots',
    title: 'Loc and root health',
    sections: [
      {
        heading: 'Healthy roots',
        outline: true,
        blocks: [
          {
            items: ['Strong roots', 'New growth', 'Normal shedding', 'Root maintenance'],
          },
        ],
      },
      {
        heading: 'Weak roots',
        blocks: [
          {
            label: 'Signs',
            items: [
              'Loc becoming thinner at the root',
              'Excessive movement',
              'Hair breaking around the root',
            ],
          },
          {
            label: 'Solutions',
            items: [
              'Reduce tension',
              'Avoid heavy styling',
              'Give the roots a break',
              'Seek professional loc repair when necessary',
            ],
          },
        ],
      },
      {
        heading: 'Thinning locs',
        outline: true,
        blocks: [{ items: ['Causes', 'Signs', 'Prevention', 'Repair options'] }],
      },
      {
        heading: 'Thinning edges',
        outline: true,
        blocks: [
          { items: ['Causes', 'Tight styling', 'Frequent retwisting', 'Traction'] },
        ],
      },
      {
        heading: 'Loc repair',
        outline: true,
        blocks: [
          {
            items: [
              'Combining locs',
              'Root repair',
              'Weak loc reinforcement',
              'When professional repair is necessary',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'length',
    title: 'Length and growth',
    sections: [
      {
        heading: 'Understanding loc growth',
        outline: true,
        blocks: [
          {
            items: [
              'How locs grow',
              'Hair growth vs length retention',
              'Shrinkage',
              'Why locs may appear to grow slowly',
            ],
          },
        ],
      },
      {
        heading: 'Length retention',
        blocks: [
          {
            items: [
              'Protect the ends',
              'Prevent breakage',
              'Reduce manipulation',
              'Keep maintenance healthy',
            ],
          },
        ],
      },
      {
        heading: 'Loc ends',
        outline: true,
        blocks: [
          {
            items: [
              'Dry ends',
              'Thin ends',
              'Weak ends',
              'Split ends',
              'Repairing or trimming damaged ends',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'styling',
    title: 'Loc styling',
    sections: [
      {
        heading: 'Safe loc styling',
        outline: true,
        blocks: [
          {
            items: [
              'Everyday styles',
              'Work styles',
              'Protective styles',
              'Special occasion styles',
              'Short loc styles',
              'Long loc styles',
            ],
          },
        ],
      },
      {
        heading: 'Styling safely',
        blocks: [
          {
            items: [
              'Avoid excessive tension',
              'Protect the hairline',
              'Avoid heavy accessories',
              'Avoid styles that pull on the roots',
            ],
          },
        ],
      },
      {
        heading: 'Styling frequency',
        outline: true,
        blocks: [
          {
            items: [
              'How long to keep styles',
              'Giving locs breaks between styles',
              'Sleeping with styled locs',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'accessories',
    title: 'Loc accessories',
    sections: [
      {
        heading: 'Safe accessories',
        blocks: [
          {
            items: [
              'Satin bonnets',
              'Satin scarves',
              'Satin pillowcases',
              'Loc-friendly hair ties',
              'Lightweight accessories',
            ],
          },
        ],
      },
      {
        heading: 'Things to consider',
        blocks: [{ items: ['Weight', 'Tension', 'Friction', 'Product buildup'] }],
      },
    ],
  },
  {
    id: 'problems',
    title: 'Loc problems',
    sections: [
      {
        heading: 'Dry locs',
        blocks: [
          {
            label: 'Signs',
            items: ['Rough texture', 'Brittle locs', 'Excessive frizz'],
          },
          {
            label: 'Solutions',
            items: [
              'Hydrate regularly',
              'Use lightweight moisturising products',
              'Avoid excessive heat',
            ],
          },
        ],
      },
      {
        heading: 'Itchy locs',
        blocks: [
          { label: 'Signs', items: ['Constant itching', 'Flaking', 'Irritation'] },
          {
            label: 'Solutions',
            items: [
              'Clean the scalp',
              'Identify irritating products',
              'Use appropriate scalp treatments',
            ],
          },
        ],
      },
      {
        heading: 'Buildup',
        blocks: [
          {
            label: 'Signs',
            items: [
              'White or coloured residue',
              'Heavy locs',
              'Unusual smell',
              'Sticky texture',
            ],
          },
          {
            label: 'Solutions',
            items: ['Clarify', 'Reduce heavy products', 'Rinse thoroughly'],
          },
        ],
      },
      {
        heading: 'Loc breakage',
        blocks: [
          {
            label: 'Signs',
            items: ['Locs snapping', 'Thinning sections', 'Weak ends'],
          },
          {
            label: 'Solutions',
            items: [
              'Reduce manipulation',
              'Avoid tight styling',
              'Improve conditioning and moisture',
              'Seek professional repair when needed',
            ],
          },
        ],
      },
      {
        heading: 'Thinning locs',
        blocks: [
          {
            label: 'Signs',
            items: ['Loc becoming smaller', 'Thin roots', 'Visible weak sections'],
          },
          {
            label: 'Solutions',
            items: [
              'Reduce tension',
              'Avoid frequent retwisting',
              'Consider professional loc repair',
            ],
          },
        ],
      },
      {
        heading: 'Loc odour',
        blocks: [
          {
            label: 'Signs',
            items: ['Unpleasant smell', 'Locs remain damp', 'Odour returns quickly'],
          },
          {
            label: 'Solutions',
            items: [
              'Wash properly',
              'Dry completely',
              'Avoid excessive product',
              'Check for scalp problems',
            ],
          },
        ],
      },
      {
        heading: 'Unravelling',
        blocks: [
          { label: 'Signs', items: ['Locs becoming loose', 'Hair separating'] },
          {
            label: 'Solutions',
            items: [
              'Follow the appropriate maintenance method',
              'Avoid excessive manipulation',
              'Allow starter locs time to mature',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'products',
    title: 'Products and ingredients',
    sections: [
      {
        heading: 'Cleansers',
        note: 'What to look for on the label, rather than a list of brands.',
        blocks: [
          {
            label: 'Look for',
            items: [
              'Gentle cleansing agents',
              'Clarifying ingredients when needed',
              'Anti-dandruff ingredients when appropriate',
            ],
          },
        ],
      },
      {
        heading: 'Moisturisers',
        blocks: [
          {
            label: 'Look for',
            items: ['Aloe vera', 'Glycerin', 'Panthenol', 'Lightweight oils'],
          },
        ],
      },
      {
        heading: 'Scalp care',
        blocks: [
          {
            label: 'Look for',
            items: [
              'Niacinamide',
              'Salicylic acid',
              'Ketoconazole, in an appropriate medicated product',
              'Zinc pyrithione where available and appropriate',
            ],
          },
        ],
      },
      {
        heading: 'Styling',
        blocks: [
          {
            label: 'Look for',
            items: [
              'Lightweight formulas',
              'Minimal residue',
              'Water-based products where appropriate',
            ],
          },
        ],
      },
      {
        heading: 'Go easy on',
        blocks: [
          {
            tone: 'avoid',
            items: [
              'Heavy waxes',
              'Thick butters',
              'Petroleum-heavy products',
              'Excessive oils',
              'Products that leave persistent residue',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'routines',
    title: 'Loc routines',
    sections: [
      {
        heading: 'Starter loc routine',
        blocks: [
          { items: ['Wash', 'Moisturise', 'Dry', 'Protect'], ordered: true },
        ],
      },
      {
        heading: 'Mature loc routine',
        blocks: [
          {
            items: [
              'Cleanse',
              'Condition if appropriate',
              'Moisturise',
              'Maintain',
              'Protect',
            ],
            ordered: true,
          },
        ],
      },
      {
        heading: 'Weekly',
        blocks: [
          {
            items: [
              'Scalp check',
              'Moisturise if needed',
              'Check roots',
              'Check edges',
              'Check for buildup',
            ],
          },
        ],
      },
      {
        heading: 'Monthly',
        blocks: [
          {
            items: [
              'Thorough wash',
              'Scalp assessment',
              'Check loc strength',
              'Assess buildup',
              'Assess roots and edges',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'myths',
    title: 'Loc myths',
    sections: [
      {
        heading: 'Common questions',
        outline: true,
        blocks: [
          {
            items: [
              'Can you wash locs?',
              'Do locs need oil?',
              'Does dirty hair make locs grow faster?',
              'Can you have healthy locs without retwisting?',
              'Can locs grow faster?',
              'Can locs be undone?',
              'Can you dye locs?',
              'Can you swim with locs?',
              'Can you sleep with wet locs?',
              'Do locs damage your hair?',
              'Can locs be repaired?',
              'How often should locs be retwisted?',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Loc lifestyle',
    sections: [
      {
        heading: 'Sleeping with locs',
        outline: true,
        blocks: [
          {
            items: ['Satin protection', 'Preventing friction', 'Protecting styles'],
          },
        ],
      },
      {
        heading: 'Swimming',
        outline: true,
        blocks: [
          {
            items: [
              'Before swimming',
              'Protecting locs from chlorine and salt water',
              'Washing after swimming',
            ],
          },
        ],
      },
      {
        heading: 'Exercise',
        outline: true,
        blocks: [
          {
            items: [
              'Sweat and scalp care',
              'Washing after heavy sweating',
              'Preventing buildup',
            ],
          },
        ],
      },
      {
        heading: 'Heat and sun',
        outline: true,
        blocks: [
          {
            items: [
              'Protecting locs',
              'Preventing excessive dryness',
              'Heat styling safely',
            ],
          },
        ],
      },
      {
        heading: 'Colouring locs',
        outline: true,
        blocks: [
          {
            items: [
              'Risks of bleaching',
              'Dyeing mature locs',
              'Maintaining coloured locs',
              'Preventing dryness and breakage',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'professional',
    title: 'Professional help',
    sections: [
      {
        heading: 'When to see a loctician',
        blocks: [
          {
            items: [
              'Thinning locs',
              'Weak roots',
              'Loc breakage',
              'Loc repair',
              'Combining locs',
              'Major buildup',
            ],
          },
        ],
      },
      {
        heading: 'When to see a dermatologist',
        blocks: [
          {
            items: [
              'Sudden hair loss',
              'Bald patches',
              'Persistent scalp itching',
              'Painful bumps',
              'Severe inflammation',
              'Scarring',
              'Persistent dandruff',
              'Unexplained thinning',
            ],
          },
        ],
      },
    ],
  },
]

/** How many sections are still topic lists, for the note at the top of the screen. */
export function outlineCount(): number {
  return LOC_CARE.reduce(
    (n, chapter) => n + chapter.sections.filter((s) => s.outline).length,
    0,
  )
}
