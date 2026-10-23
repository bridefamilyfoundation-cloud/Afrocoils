import { KNOWLEDGE, type ForYou } from '../../content/answers'
import { TOPICS } from '../../content/ask'
import { FAQS, faqText } from '../../content/faq'
import { GUIDES, guideHairTypes } from '../../content/guides'
import { HAIR_CHECK } from '../../content/hair-check'
import { LOC_CARE } from '../../content/loc-care'
import { LOC_STYLES } from '../../content/loc-styles'
import { AVOID_LIST, PRODUCTS, PRODUCT_CATEGORIES, type ProductCategory } from '../../content/products'
import { STYLES, styleHairTypes, type Style } from '../../content/styles'
import { HAIR_TYPES, type HairType, type LocStage } from '../types'
import { sentences } from './text'

/**
 * Everything Ask can answer from, as one flat list of records.
 *
 * Built from the content files at runtime rather than copied into an
 * index at build time, so a guide edited today is a guide Ask quotes
 * today. Each record keeps the words exactly as they were written: the
 * `passages` are what Ask may quote, the `points` are the lists it may
 * show beneath, and neither is ever reworded.
 *
 * Hair type is carried on every record and applied as a hard filter by
 * the engine, with the same defaults each library already uses: guides
 * default to both types, styles to loose-only.
 */

export type AskKind =
  | 'answer'
  | 'guide'
  | 'concern'
  | 'loc-section'
  | 'style'
  | 'loc-style'
  | 'shelf'
  | 'product'
  | 'avoid'
  | 'faq'
  | 'topic'

export interface AskPassage {
  text: string
  /** Where in the source it sits: "Step 3 · Seal the ends", "Caution". */
  label?: string
}

export interface AskPoints {
  label: string
  items: string[]
  tone?: 'avoid'
  ordered?: boolean
}

export interface AskDoc {
  id: string
  kind: AskKind
  title: string
  /** Where it lives, in the app's own words. */
  source: string
  route: string
  cta: string
  hairTypes: HairType[]
  /** Searchable text by weight: the title outranks a passing mention. */
  fields: { title: string; keys: string; lead: string; body: string }
  /** Quotable passages, the default first. */
  passages: AskPassage[]
  points: AskPoints[]
  caution?: string
  /** A Locs World section that is still a topic list, not advice. */
  pending?: boolean
  locStages?: LocStage[]
  style?: Style
  category?: ProductCategory
  /** A secondary link — the documentation section behind a how-to topic. */
  more?: { to: string; label: string }
  /** Lines written for one kind of hair; the engine picks the ones the profile matches. */
  forYou?: ForYou[]
}

const BOTH: HairType[] = [...HAIR_TYPES]

/** "My hair is…" + "Falling out" → "My hair is falling out". */
function concernTitle(heading: string, label: string): string {
  return `${heading.replace(/…$/, '').trim()} ${label.toLowerCase()}`
}

/**
 * The answer bank. The question is the title, so a question asked the
 * way it was written lands on it; the answer is the one passage, and
 * the steps are shown beneath it as the list they are.
 */
function answers(): AskDoc[] {
  return KNOWLEDGE.map((entry) => ({
    id: `answer:${entry.id}`,
    kind: 'answer',
    title: entry.question,
    source: 'AfroCoils answers',
    route: entry.next.to,
    cta: entry.next.label,
    hairTypes: entry.hairTypes ?? BOTH,
    caution: entry.caution,
    forYou: entry.forYou,
    fields: {
      title: entry.question,
      keys: entry.asks.split('|').join('. '),
      lead: entry.answer,
      body: [...(entry.steps ?? []), ...(entry.forYou ?? []).map((f) => f.text)].join('. '),
    },
    passages: [{ text: entry.answer }],
    points: entry.steps?.length ? [{ label: 'What to do', items: entry.steps, ordered: true }] : [],
  }))
}

function guides(): AskDoc[] {
  return GUIDES.map((guide) => ({
    id: `guide:${guide.slug}`,
    kind: 'guide',
    title: guide.title,
    source: `Care guide · ${guide.minutes} min read`,
    route: `/guide/${guide.slug}`,
    cta: 'Read the guide',
    hairTypes: guideHairTypes(guide),
    locStages: guide.locStages,
    fields: {
      title: guide.title,
      keys: guide.badge ?? '',
      lead: guide.summary,
      body: [
        ...guide.steps.flatMap((s) => [s.title, s.body]),
        ...guide.toolsAndProducts,
        ...guide.cautions,
      ].join('. '),
    },
    passages: [
      ...sentences(guide.summary).map((text) => ({ text })),
      ...guide.steps.map((s, i) => ({ text: s.body, label: `Step ${i + 1} · ${s.title}` })),
      ...guide.cautions.map((text) => ({ text, label: 'Caution' })),
    ],
    points: [{ label: 'The steps', items: guide.steps.map((s) => s.title), ordered: true }],
  }))
}

function concerns(): AskDoc[] {
  return HAIR_CHECK.flatMap((group) =>
    group.concerns.map((c): AskDoc => {
      const points: AskPoints[] = [{ label: 'What you can do', items: c.solutions }]
      if (c.ingredients) points.push({ label: 'Look for on the label', items: c.ingredients })
      return {
        id: `concern:${c.id}`,
        kind: 'concern',
        title: concernTitle(group.heading, c.label),
        source: 'Quick Hair Check',
        route: `/sos/problem?open=${c.id}`,
        cta: 'Open in the Quick Hair Check',
        hairTypes: c.hairTypes,
        caution: c.caution,
        fields: {
          title: concernTitle(group.heading, c.label),
          keys: c.label,
          lead: c.problem,
          body: [...c.signs, ...c.solutions, ...(c.ingredients ?? []), c.caution ?? ''].join('. '),
        },
        // Only the explanation is quoted. The signs and solutions are
        // fragments of a list ("Visible scalp") and read as non-answers
        // on their own; they are shown beneath it, as the list they are.
        passages: [{ text: c.problem }],
        points,
      }
    }),
  )
}

function locSections(): AskDoc[] {
  return LOC_CARE.flatMap((chapter) =>
    chapter.sections.map((section, i): AskDoc => {
      const items = section.blocks.flatMap((b) => b.items)
      return {
        id: `loc:${chapter.id}:${i}`,
        kind: 'loc-section',
        title: section.heading,
        source: `Locs World · ${chapter.title}`,
        route: `/locs?open=${chapter.id}`,
        cta: 'Open in Locs World',
        // Written for loc wearers and for anyone deciding whether to loc,
        // so it is shown to both. None of it is loose-hair technique.
        hairTypes: BOTH,
        pending: section.outline,
        fields: {
          title: section.heading,
          keys: `${chapter.title} locs ${section.blocks
            .map((b) => `${b.label ?? ''} ${b.tone === 'avoid' ? 'avoid' : ''}`)
            .join(' ')}`,
          lead: section.note ?? '',
          body: items.join('. '),
        },
        passages: section.note ? [{ text: section.note }] : [],
        points: section.outline
          ? [{ label: 'Topics it will cover', items }]
          : section.blocks.map((b) => ({
              label: b.label ?? section.heading,
              items: b.items,
              tone: b.tone,
              ordered: b.ordered,
            })),
      }
    }),
  )
}

function styles(): AskDoc[] {
  return STYLES.filter((s) => s.steps?.length).map((style) => ({
    id: `style:${style.id}`,
    kind: 'style',
    title: style.name,
    source: `Hair Styles · ${style.category} · ${style.minutes} min`,
    route: `/styles/${style.id}`,
    cta: 'See the style',
    hairTypes: styleHairTypes(style),
    style,
    fields: {
      title: style.name,
      keys: [style.category, style.difficulty, ...(style.occasions ?? []), 'style hairstyle'].join(
        ' ',
      ),
      lead: style.note,
      body: [...(style.steps ?? []), ...(style.needs ?? [])].join('. '),
    },
    passages: [
      { text: style.note },
      ...(style.steps ?? []).map((text, i) => ({ text, label: `Step ${i + 1}` })),
    ],
    points: style.needs?.length ? [{ label: 'You’ll need', items: style.needs }] : [],
  }))
}

function locStyles(): AskDoc[] {
  return LOC_STYLES.map((style) => ({
    id: `loc-style:${style.id}`,
    kind: 'loc-style',
    title: style.name,
    source: `Locs World · ${style.group === 'Loc styles' ? 'Loc styles' : `Loc styles · ${style.group}`}`,
    route: `/locs/styles?open=${style.id}`,
    cta: 'See loc styles',
    hairTypes: BOTH,
    fields: {
      title: style.name,
      keys: `${style.group} loc style locs`,
      lead: style.description,
      body: '',
    },
    passages: [{ text: style.description }],
    points: [],
  }))
}

/**
 * One record per shelf, then one per product. A question like "which
 * oil should I use?" is about the shelf, and the engine answers it with
 * the shelf ranked against the profile; a question naming a brand finds
 * the product itself.
 */
function shelves(): AskDoc[] {
  return PRODUCT_CATEGORIES.map((category) => {
    const items = PRODUCTS.filter((p) => p.category === category)
    return {
      id: `shelf:${category}`,
      kind: 'shelf',
      title: `${category} — product shelf`,
      source: 'Product recommendations',
      route: `/products?open=${encodeURIComponent(category)}`,
      cta: `See the ${category.toLowerCase()} shelf`,
      hairTypes: BOTH.filter((t) => items.some((p) => p.hairTypes.includes(t))),
      category,
      fields: {
        title: category,
        keys: `${category} products product shelf buy`,
        lead: items.map((p) => p.role).join('. '),
        body: items.map((p) => `${p.brand} ${p.name}. ${p.note}`).join(' '),
      },
      passages: [],
      points: [],
    }
  })
}

function products(): AskDoc[] {
  return PRODUCTS.map((p) => ({
    id: `product:${p.id}`,
    kind: 'product',
    title: `${p.brand} ${p.name}`,
    source: `Product recommendations · ${p.category} · ${p.price}`,
    route: `/products?open=${encodeURIComponent(p.category)}`,
    cta: `See the ${p.category.toLowerCase()} shelf`,
    hairTypes: p.hairTypes,
    category: p.category,
    fields: {
      title: `${p.brand} ${p.name}`,
      keys: `${p.brand} ${p.category} ${p.role}`,
      lead: p.note,
      body: '',
    },
    passages: [{ text: p.role }, ...sentences(p.note).map((text) => ({ text }))],
    points: [],
  }))
}

function avoid(): AskDoc[] {
  return AVOID_LIST.map((item, i) => ({
    id: `avoid:${i}`,
    kind: 'avoid',
    title: item.what,
    source: 'Product recommendations · What to leave on the shelf',
    route: '/products?open=avoid',
    cta: 'See what to leave on the shelf',
    hairTypes: BOTH,
    fields: {
      // "Avoid" is what every one of these is about, so it sits in the
      // searchable title even though the card shows only the item.
      title: `Avoid ${item.what}`,
      keys: `bad for harmful damage not recommended ${item.forLocs ? 'locs' : ''}`,
      lead: item.why,
      body: '',
    },
    passages: [{ text: item.why }],
    points: [],
  }))
}

function faqs(): AskDoc[] {
  return FAQS.map((faq) => {
    const text = faqText(faq)
    return {
      id: `faq:${faq.id}`,
      kind: 'faq',
      title: faq.q,
      source: 'Frequently asked questions',
      route: `/faq?open=${faq.id}`,
      cta: 'Read the full answer',
      hairTypes: BOTH,
      fields: { title: faq.q, keys: faq.keys?.split('|').join('. ') ?? '', lead: text, body: '' },
      passages: sentences(text).map((t) => ({ text: t })),
      points: [],
    }
  })
}

function topics(): AskDoc[] {
  return TOPICS.map((topic) => ({
    id: `topic:${topic.id}`,
    kind: 'topic',
    title: topic.title,
    source: 'How the app works',
    route: topic.route,
    cta: topic.cta,
    hairTypes: topic.hairTypes ?? BOTH,
    fields: { title: topic.title, keys: topic.keys.split('|').join('. '), lead: topic.answer, body: '' },
    passages: [{ text: topic.answer }],
    points: [],
    more: topic.docs ? { to: `/docs?open=${topic.docs}`, label: 'Read more in Documentation' } : undefined,
  }))
}

let cache: AskDoc[] | undefined

/** The whole corpus, built once. */
export function corpus(): AskDoc[] {
  cache ??= [
    ...answers(),
    ...concerns(),
    ...guides(),
    ...locSections(),
    ...styles(),
    ...locStyles(),
    ...shelves(),
    ...products(),
    ...avoid(),
    ...faqs(),
    ...topics(),
  ]
  return cache
}
