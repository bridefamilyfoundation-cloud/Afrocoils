import {
  APP_CONCEPTS,
  CONCEPTS,
  DISTRESS,
  LEADS,
  LOC_CONCEPTS,
  LOC_LEANING,
  NOTES,
  NOTHING_FOUND,
  NOT_UNDERSTOOD,
  OCCASION_WORDS,
  OFF_TOPIC,
  PRODUCT_CONCEPTS,
  QUICK_MAX_MINUTES,
  RED_FLAGS,
  SAFETY_LINE,
  SMALL_TALK,
} from '../../content/ask'
import type { ForYou, ForYouWhen } from '../../content/answers'
import { PRODUCTS, rankProducts, type RankedProduct } from '../../content/products'
import { styleExclusion } from '../../content/styles'
import {
  PREFERENCE_LABELS,
  type AskOutcome,
  type CarePreferences,
  type HairBio,
  type HairIdentity,
  type HairType,
  type LocStage,
  type Occasion,
} from '../types'
import { corpus, type AskDoc, type AskKind, type AskPassage } from './corpus'
import { editDistance, isStopword, normalise, stem, words } from './text'

/**
 * Ask: a question in, the passage of the app that answers it out.
 *
 * Retrieval, not generation. Every word the answer card shows is either
 * quoted from a content file or one of the fixed lines in content/ask.ts.
 * Nothing is composed and the answer is worked out on the phone. The
 * question itself is shared anonymously afterwards (lib/ask/share.ts),
 * outside this file, so the team can study what Ask could not answer.
 *
 * The pipeline, in the order it runs:
 *
 * 1. **Read the question.** Normalise it, fix obvious typos against the
 *    app's own vocabulary, and tag it with the ideas it mentions — the
 *    same tagging every passage got when the index was built, which is
 *    how "my hair keeps coming out" finds a guide about shedding.
 * 2. **Work out what kind of question it is.** About a problem, a style,
 *    a product or the app; for which hair type; for what occasion and
 *    how many minutes; whether it is worried; whether it is medical.
 * 3. **Rank** every record with BM25F (title over keys over summary over
 *    body), nudged by those signals.
 * 4. **Filter by hair type**, hard, the same rule as every list in the
 *    app: loose-hair technique is never shown to a loc wearer. If the
 *    best match was filtered out, say so rather than pretending it
 *    does not exist.
 * 5. **Answer** with the best record, its best passage, and the next few
 *    as "also in the app" — or say plainly that the app has nothing.
 * 6. **Fit it to the person.** An answer-bank entry can carry lines
 *    written for one kind of hair (low porosity, starter locs, a dry
 *    climate). The ones the profile matches are shown, whole, beside
 *    the answer. They are chosen, never composed — no profile value is
 *    ever written into advice.
 */

/* ------------------------------------------------------------------ *
 * Phrase tagging
 * ------------------------------------------------------------------ */

interface Phrase {
  tokens: string[]
  tag: string
}

/** Phrases indexed by their first token, so tagging is one pass. */
function compile(table: Record<string, string>): Map<string, Phrase[]> {
  const byFirst = new Map<string, Phrase[]>()
  for (const [tag, list] of Object.entries(table)) {
    for (const phrase of list.split('|')) {
      const tokens = words(phrase)
      if (tokens.length === 0) continue
      const bucket = byFirst.get(tokens[0]) ?? []
      bucket.push({ tokens, tag })
      byFirst.set(tokens[0], bucket)
    }
  }
  return byFirst
}

interface Tagged {
  /** Tag → the position of its first occurrence. */
  tags: Map<string, number>
  /** Positions covered by a matched phrase. */
  consumed: Set<number>
}

/**
 * Tag a token sequence, longest phrase first: "loc method" is the
 * moisturising method, not a question about locs, because the two-word
 * phrase claims both words before "loc" alone gets a look in.
 */
function tag(tokens: string[], phrases: Map<string, Phrase[]>): Tagged {
  const tags = new Map<string, number>()
  const consumed = new Set<number>()
  let i = 0
  while (i < tokens.length) {
    const found = (phrases.get(tokens[i]) ?? []).filter((p) =>
      p.tokens.every((t, k) => tokens[i + k] === t),
    )
    const longest = Math.max(0, ...found.map((p) => p.tokens.length))
    for (const p of found) {
      if (p.tokens.length === longest && !tags.has(p.tag)) tags.set(p.tag, i)
    }
    for (let k = 0; k < longest; k++) consumed.add(i + k)
    i += Math.max(1, longest)
  }
  return { tags, consumed }
}

function tagsIn(tokens: string[], phrases: Map<string, Phrase[]>): Set<string> {
  return new Set(tag(tokens, phrases).tags.keys())
}

const CONCEPT_PHRASES = compile(CONCEPTS)
const OCCASION_PHRASES = compile(OCCASION_WORDS)
/** Occasions tag as ideas too, so "a wedding" meets a style marked Formal Event. */
const OCCASION_TAGS = compile(
  Object.fromEntries(Object.entries(OCCASION_WORDS).map(([o, list]) => [`occasion:${o}`, list])),
)
const FLAG_PHRASES = compile({ distress: DISTRESS, medical: RED_FLAGS })
const OFF_TOPIC_WORDS = new Set(OFF_TOPIC.split('|'))
const SMALL_TALK_LINES = new Map<string, string>(
  SMALL_TALK.flatMap(({ match, reply }) =>
    match.split('|').map((m) => [normalise(m), reply] as const),
  ),
)

/** The searchable terms in a piece of text: content words plus `#idea` tags. */
function termsOf(text: string, occasions = false): string[] {
  const all = words(text)
  const terms = all.filter((w) => !isStopword(w) && !/^\d+$/.test(w))
  for (const t of tagsIn(all, CONCEPT_PHRASES)) terms.push(`#${t}`)
  // Only styles carry occasions. Tagged everywhere, "how does the app
  // work?" would make a how-to topic look like an office hairstyle.
  if (occasions) for (const t of tagsIn(all, OCCASION_TAGS)) terms.push(`#${t}`)
  return terms
}

/* ------------------------------------------------------------------ *
 * The index
 * ------------------------------------------------------------------ */

const FIELDS = ['title', 'keys', 'lead', 'body'] as const
const WEIGHTS = [4, 2.5, 1.6, 1]
// A guide is long because it is thorough; penalising its length as
// hard as BM25's default would hand every question to the shortest card.
const B = [0.3, 0.5, 0.6, 0.55]
const K1 = 1.2

interface Indexed {
  doc: AskDoc
  tf: Map<string, number>[]
  len: number[]
  terms: Set<string>
  /** Ideas named in the title — what the record is *about*, not just mentions. */
  about: Set<string>
}

interface Index {
  docs: Indexed[]
  df: Map<string, number>
  avg: number[]
  /** Stemmed word → how common it is and one way it is spelled. */
  vocab: Map<string, { df: number; surface: string }>
}

let built: Index | undefined

function index(): Index {
  if (built) return built
  const docs = corpus().map((doc): Indexed => {
    const tf: Map<string, number>[] = []
    const len: number[] = []
    const terms = new Set<string>()
    for (const field of FIELDS) {
      const counts = new Map<string, number>()
      const list = termsOf(doc.fields[field], doc.kind === 'style')
      for (const t of list) {
        counts.set(t, (counts.get(t) ?? 0) + 1)
        terms.add(t)
      }
      tf.push(counts)
      len.push(list.length)
    }
    const about = new Set([...tf[0].keys()].filter((t) => t.startsWith('#')))
    return { doc, tf, len, terms, about }
  })

  const df = new Map<string, number>()
  const vocab = new Map<string, { df: number; surface: string }>()
  const remember = (surface: string, weight: number) => {
    const s = stem(surface)
    const seen = vocab.get(s)
    if (seen) seen.df += weight
    else vocab.set(s, { df: weight, surface })
  }
  for (const d of docs) {
    for (const t of d.terms) df.set(t, (df.get(t) ?? 0) + 1)
    const raw = normalise(FIELDS.map((f) => d.doc.fields[f]).join(' ')).split(' ')
    for (const w of new Set(raw)) if (w.length > 2 && !isStopword(w)) remember(w, 1)
  }
  // The vocabulary's own phrasings count as known words even when no
  // passage uses them — "dandruff" is a word Ask understands though no
  // guide happens to say it.
  for (const list of [...Object.values(CONCEPTS), ...Object.values(OCCASION_WORDS)]) {
    for (const phrase of list.split('|')) {
      for (const w of normalise(phrase).split(' ')) if (w.length > 2 && !isStopword(w)) remember(w, 3)
    }
  }

  const avg = FIELDS.map((_, f) => docs.reduce((n, d) => n + d.len[f], 0) / docs.length || 1)
  built = { docs, df, avg, vocab }
  return built
}

function idf(ix: Index, term: string): number {
  const n = ix.docs.length
  const df = ix.df.get(term) ?? 0
  return Math.log(1 + (n - df + 0.5) / (df + 0.5))
}

function bm25(ix: Index, d: Indexed, query: Map<string, number>): number {
  let score = 0
  for (const [term, weight] of query) {
    let pseudo = 0
    for (let f = 0; f < FIELDS.length; f++) {
      const tf = d.tf[f].get(term)
      if (!tf) continue
      // Length is capped at three times the average: a twelve-minute
      // guide is fifteen times longer than a Hair Check card, and left
      // uncapped its exact sentence ("if a style gives you a headache")
      // would be diluted to nothing.
      const ratio = Math.min(d.len[f] / ix.avg[f], 3)
      pseudo += (WEIGHTS[f] * tf) / (1 - B[f] + B[f] * ratio)
    }
    if (pseudo > 0) score += (weight * idf(ix, term) * pseudo * (K1 + 1)) / (K1 + pseudo)
  }
  return score
}

/* ------------------------------------------------------------------ *
 * Reading the question
 * ------------------------------------------------------------------ */

/** Ideas that mean something is wrong — a style question with one of these is a care question. */
const PROBLEMS = new Set([
  'shedding',
  'breakage',
  'thinning',
  'bald',
  'dryness',
  'tangles',
  'frizz',
  'greasy',
  'itch',
  'flakes',
  'irritation',
  'bumps',
  'buildup',
  'odour',
  'tension',
  'medical',
  'unravel',
])

/** Ideas about looking after hair, which time words alone do not turn into a style question. */
const CARE = new Set([
  ...PROBLEMS,
  'wash',
  'condition',
  'protein',
  'porosity',
  'moisture',
  'night',
  'heat',
  'chemical',
  'hardWater',
  'growth',
  'retwist',
  'trim',
])

/** The Quick Hair Check's groups, and the ideas that name each one. */
const CHECK_GROUPS: [string, string[]][] = [
  ['scalp', ['scalp', 'itch', 'flakes', 'bumps', 'irritation']],
  ['edges', ['edges', 'bald']],
  ['curls', ['curls', 'definition']],
]

/** Words that turn an occasion into a request for something to wear. */
const WANTS = new Set(['wear', 'something', 'idea', 'ideas', 'look', 'do', 'style'].map(stem))

/** Tags that say what kind of question it is rather than what it is about. */
const META = new Set(['shopping', 'app'])

const NUMBER_WORDS: Record<string, number> = {
  five: 5,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  sixty: 60,
}

/** "10 minutes", "half an hour", "an hour" → minutes. Undefined if no time was given. */
export function minutesIn(normalised: string): number | undefined {
  const minutes = normalised.match(/\b(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/)
  if (minutes) return Number(minutes[1])
  const hours = normalised.match(/\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/)
  if (hours) return Number(hours[1]) * 60
  const word = normalised.match(/\b(five|ten|fifteen|twenty|thirty|forty|sixty)\s*(?:min|mins|minute|minutes)\b/)
  if (word) return NUMBER_WORDS[word[1]]
  if (/\b(quarter of an hour|quarter hour)\b/.test(normalised)) return 15
  if (/\b(half an hour|half hour|half an hr)\b/.test(normalised)) return 30
  if (/\b(an hour|one hour|1 hour)\b/.test(normalised)) return 60
  if (/\b(few minutes|couple of minutes|couple minutes|no time)\b/.test(normalised)) return 10
  return undefined
}

interface Reading {
  /** The words as typed, typos fixed. */
  tokens: string[]
  /** Term → weight. Words inside a matched phrase count for less than the idea they name. */
  terms: Map<string, number>
  /**
   * What "how much of the question did this answer" is measured against:
   * one unit per idea, one per word no idea claimed. "Tender headed" is
   * one thing someone said, not two words to find separately.
   */
  units: Map<string, number>
  tags: Set<string>
  corrected?: string
  hairType?: HairType
  occasion?: Occasion
  minutes?: number
  intent: 'style' | 'product' | 'howTo' | 'care'
  worried: boolean
  medical: boolean
  known: boolean
  /** Names something that is not hair (OFF_TOPIC). Decisive only when no hair idea is present. */
  elsewhere: boolean
}

function read(query: string, ix: Index): Reading {
  const normal = normalise(query)
  const raw = normal.split(' ').filter(Boolean)

  // Typos, fixed against words the app actually uses. Short words are
  // left alone: at three letters nearly everything is one edit away —
  // and that is measured after stemming, because "rice" stems to "ric",
  // one edit from "rid", and "rice water" became a dandruff question.
  let changed = false
  const fixed = raw.map((w) => {
    if (w.length < 4 || stem(w).length < 4 || isStopword(w) || /\d/.test(w) || OFF_TOPIC_WORDS.has(w) || ix.vocab.has(stem(w))) return w
    const max = w.length >= 7 ? 2 : 1
    const s = stem(w)
    let best: { surface: string; d: number; df: number } | undefined
    for (const [key, entry] of ix.vocab) {
      if (Math.abs(key.length - s.length) > max) continue
      const d = editDistance(s, key, max)
      if (d > max) continue
      if (!best || d < best.d || (d === best.d && entry.df > best.df)) {
        best = { surface: entry.surface, d, df: entry.df }
      }
    }
    if (!best) return w
    changed = true
    return best.surface
  })

  const tokens = fixed.map(stem)
  const concepts = tag(tokens, CONCEPT_PHRASES)
  const occasions = tag(tokens, OCCASION_TAGS)
  const tags = new Set(concepts.tags.keys())
  const flags = tagsIn(tokens, FLAG_PHRASES)

  // "without breaking" is not a question about breakage. The words
  // after "without" still count, but for much less.
  const muted = new Set<number>()
  tokens.forEach((t, i) => {
    if (t === 'without' || (t === 'instead' && tokens[i + 1] === 'of')) {
      for (let k = i + 1; k <= i + 3; k++) muted.add(k)
    }
  })
  const consumed = new Set([...concepts.consumed, ...occasions.consumed])
  const terms = new Map<string, number>()
  const units = new Map<string, number>()
  const add = (term: string, weight: number, unit: boolean) => {
    terms.set(term, Math.max(terms.get(term) ?? 0, weight))
    if (unit) units.set(term, Math.max(units.get(term) ?? 0, weight))
  }
  tokens.forEach((t, i) => {
    // Numbers are read as minutes above; as words they match nothing useful.
    if (isStopword(t) || /^\d+$/.test(t)) return
    const w = muted.has(i) ? 0.4 : 1
    add(t, consumed.has(i) ? 0.85 * w : w, !consumed.has(i))
  })
  for (const [t, at] of [...concepts.tags, ...occasions.tags]) {
    add(`#${t}`, muted.has(at) ? 0.4 : 1, !META.has(t))
  }

  const has = (list: Iterable<string>) => [...list].some((t) => tags.has(t))
  const problem = has(PROBLEMS)
  const care = has(CARE)
  const occasion = [...tagsIn(tokens, OCCASION_PHRASES)][0] as Occasion | undefined
  const minutes = minutesIn(fixed.join(' '))

  // What kind of question, most specific first. A "why" is a request
  // for an explanation, never for a shelf of styles; a question that
  // names part of the app is about the app even when it says "style";
  // and an occasion on its own ("swimming with locs") is not a request
  // for a hairstyle unless the question asks for something to wear.
  const why = tokens[0] === 'why' || tokens.includes('why')
  const app = has(APP_CONCEPTS.filter((t) => t !== 'recommend'))
  const shopping = tags.has('shopping') && !problem
  const wants = tokens.some((t) => WANTS.has(t))
  let intent: Reading['intent'] = 'care'
  if (!problem && app) {
    intent = 'howTo'
  } else if (
    !problem &&
    (tags.has('products') || (shopping && (has(PRODUCT_CONCEPTS) || has(['wash', 'condition', 'moisture']))))
  ) {
    intent = 'product'
  } else if (
    !problem &&
    !why &&
    (tags.has('style') ||
      ((tags.has('quick') || minutes !== undefined) && !care) ||
      (occasion && wants && !care))
  ) {
    intent = 'style'
  } else if (!problem && tags.has('recommend')) {
    intent = 'howTo'
  }
  // "How are styles recommended?" asks how the app works, not for styles.
  if (intent === 'style' && tags.has('recommend') && (why || tokens[0] === 'how')) intent = 'howTo'

  // "Quick" with no number means what Quick Hairstyle means by it.
  const quickest = intent === 'style' && minutes === undefined && tags.has('quick')
  const within = quickest ? QUICK_MAX_MINUTES : minutes

  // An occasion is only an occasion in a style question. Elsewhere
  // "swimming" is just the thing being asked about — "swimming with
  // locs" — so its words go back to counting as words.
  if (intent !== 'style') {
    for (const t of occasions.tags.keys()) units.delete(`#${t}`)
    for (const i of occasions.consumed) {
      if (!concepts.consumed.has(i) && !isStopword(tokens[i])) add(tokens[i], 1, true)
    }
  }

  return {
    tokens,
    terms,
    units,
    tags,
    corrected: changed ? fixed.join(' ') : undefined,
    hairType: has(LOC_CONCEPTS) ? 'Locs' : tags.has('loose') ? 'Loose Natural' : undefined,
    occasion,
    minutes: within,
    intent,
    worried: flags.has('distress') || flags.has('medical'),
    medical: flags.has('medical'),
    elsewhere: raw.some((w) => OFF_TOPIC_WORDS.has(w)),
    // An occasion alone ("who won the football") is not a hair question.
    known:
      tags.size > 0 ||
      [...terms.keys()].some((t) => !t.startsWith('#') && ix.df.has(t)) ||
      (occasion !== undefined && wants),
  }
}

/* ------------------------------------------------------------------ *
 * Ranking
 * ------------------------------------------------------------------ */

const PRIOR: Record<AskKind, number> = {
  // Written as replies to the question, so they lead when they fit.
  answer: 1.3,
  concern: 1.15,
  guide: 1.1,
  'loc-section': 1,
  topic: 1,
  faq: 0.95,
  style: 0.9,
  shelf: 0.9,
  avoid: 0.85,
  'loc-style': 0.8,
  product: 0.7,
}

/**
 * How the kind of question shifts the kinds of answer. Products only
 * lead when the question is about buying or using one — "satin bonnet"
 * is a question about nights, and the night routine answers it better
 * than a bonnet on a shelf.
 */
const INTENT_BOOST: Record<Reading['intent'], Partial<Record<AskKind, number>>> = {
  style: {
    answer: 0.6,
    style: 1.9,
    'loc-style': 1.6,
    topic: 0.9,
    guide: 0.75,
    concern: 0.7,
    product: 0.5,
    shelf: 0.6,
  },
  product: { answer: 0.85, shelf: 2, product: 1.4, avoid: 1.5, guide: 0.8, concern: 0.7, topic: 0.6 },
  howTo: { answer: 0.6, topic: 1.7, faq: 1.75, style: 0.5, 'loc-style': 0.5, product: 0.4, shelf: 0.5 },
  care: { product: 0.5, shelf: 0.7, 'loc-style': 0.7, style: 0.8 },
}

export interface AskContext {
  identity: HairIdentity
  preferences: CarePreferences
  /** Resolved from the install date when the profile has one. */
  locStage?: LocStage
  /** Name for the greeting; climate and hard water for `forYou`. */
  bio?: HairBio
}

interface Scored {
  doc: AskDoc
  d: Indexed
  score: number
}

function boost(r: Reading, s: Scored, hairType: HairType | undefined): number {
  const { doc, d } = s
  let m = PRIOR[doc.kind] * (INTENT_BOOST[r.intent][doc.kind] ?? 1)
  if (doc.pending) m *= 0.75
  // A record whose title names what was asked about is about it; one
  // that mentions it in a list of signs is only near it.
  // Hair type is the context of a question, not its subject, so "locs"
  // in a title earns nothing here — the hair-type filter has done that job.
  const named = [...r.tags].filter(
    (t) => !META.has(t) && t !== 'locs' && t !== 'loose' && d.about.has(`#${t}`),
  ).length
  m *= Math.min(1.8, 1 + 0.35 * named)
  const aboutLocs = r.hairType === 'Locs' || LOC_LEANING.some((t) => r.tags.has(t))
  if (aboutLocs && d.terms.has('#locs')) m *= 1.3
  // Locs World is shown to everyone, but a loose-hair question about
  // sleeping wants the night routine, not "Sleeping with locs". With no
  // hair type set the app treats hair as loose for safety, and so does
  // the ranking here — without hiding anything.
  if (hairType !== 'Locs' && !aboutLocs && d.terms.has('#locs')) m *= 0.55
  if (r.medical && (doc.caution || doc.id.startsWith('loc:professional'))) m *= 1.2
  // The Quick Hair Check is grouped by where the problem is. "My hair
  // feels like straw" is not "my scalp is dry", though both are dry.
  if (doc.kind === 'concern') {
    const group = doc.id.slice('concern:'.length).split('-')[0]
    const where = CHECK_GROUPS.filter(([, tags]) => tags.some((t) => r.tags.has(t))).map(([g]) => g)
    if (where.includes(group)) m *= 1.25
    else if (where.length || r.tokens.includes('hair')) m *= group === 'hair' ? 1 : 0.75
    else if (group !== 'hair') m *= 0.85
  }
  if (doc.style) {
    if (r.occasion && doc.style.occasions?.includes(r.occasion)) m *= 1.4
    if (r.minutes !== undefined) m *= doc.style.minutes <= r.minutes ? 1.4 : 0.5
  }
  return m
}

/** Why a record was held back, or undefined if it may be shown. */
function heldBack(
  doc: AskDoc,
  hairType: HairType | undefined,
  ctx: AskContext,
  allowedProducts: Set<string>,
): 'hairType' | 'preference' | undefined {
  if (hairType && !doc.hairTypes.includes(hairType)) return 'hairType'
  if (doc.style) {
    const why = styleExclusion(
      doc.style,
      { ...ctx.identity, hairType, locStage: ctx.locStage },
      ctx.preferences,
    )
    if (why === 'hairType') return 'hairType'
    if (why) return 'preference'
  }
  if (doc.kind === 'product' && !allowedProducts.has(doc.id.slice('product:'.length))) {
    return 'preference'
  }
  return undefined
}

/* ------------------------------------------------------------------ *
 * The reply
 * ------------------------------------------------------------------ */

export interface AskHit {
  doc: AskDoc
  score: number
  quote?: AskPassage
}

/** A line written for one kind of hair, and what on the profile chose it. */
export interface AskForYou {
  text: string
  because: string
}

export interface AskNote {
  text: string
  to?: string
  label?: string
}

export type AskReply =
  | { type: 'chat'; text: string }
  | {
      type: 'none'
      text: string
      corrected?: string
      /** Not about hair at all, as opposed to about hair with no written answer. */
      offTopic: boolean
    }
  | {
      type: 'answer'
      lead: string
      hit: AskHit
      mode: 'quote' | 'styles' | 'products' | 'pending'
      styles: AskHit[]
      products: RankedProduct[]
      related: AskHit[]
      forYou: AskForYou[]
      safety?: string
      notes: AskNote[]
      corrected?: string
      answeredFor?: { hairType: HairType; from: 'question' | 'profile' }
      seeAll?: { to: string; label: string }
    }

/** Below this, the best match shares too little with the question to be an answer. */
const MIN_SCORE = 2.2
const MIN_COVERAGE = 0.3

function pick<T>(list: readonly T[], seed: string): T {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  return list[Math.abs(h) % list.length]
}

/**
 * Put the person's first name into a fixed line, or take the slot out.
 * The name is the only thing ever placed into a line, and only into
 * the voice — never into advice.
 */
export function withName(line: string, name: string | undefined): string {
  const first = name?.trim().split(/\s+/)[0]
  return line.replace(/, \{name\}/g, first ? `, ${first}` : '')
}

/** Which profile values a `forYou` line needs, as a reader would say them. */
function describe(when: ForYouWhen): string {
  const parts: string[] = []
  if (when.hairType) parts.push(when.hairType === 'Locs' ? 'locs' : 'loose natural hair')
  if (when.locStage) parts.push(`${when.locStage.toLowerCase()} locs`)
  if (when.porosity) parts.push(`${when.porosity.toLowerCase()} porosity`)
  if (when.texture) parts.push(`${when.texture.toLowerCase()} strands`)
  if (when.scalpCondition) parts.push(`${when.scalpCondition.toLowerCase()} scalp`)
  if (when.climate) parts.push(`${when.climate.toLowerCase()} climate`)
  if (when.hardWater) parts.push('hard water')
  if (when.preference) parts.push(PREFERENCE_LABELS[when.preference].toLowerCase())
  return parts.join(', ')
}

/** One — the first that fits — so the answer stays the answer. */
const MAX_FOR_YOU = 1

/** The `forYou` lines whose every condition the profile meets. */
function forYouFor(
  lines: ForYou[] | undefined,
  hairType: HairType | undefined,
  ctx: AskContext,
): AskForYou[] {
  if (!lines) return []
  const { identity, preferences, bio, locStage } = ctx
  const matches = (w: ForYouWhen) =>
    (w.hairType === undefined || w.hairType === hairType) &&
    (w.locStage === undefined || (hairType === 'Locs' && w.locStage === locStage)) &&
    (w.porosity === undefined || w.porosity === identity.porosity) &&
    (w.texture === undefined || w.texture === identity.texture) &&
    (w.scalpCondition === undefined || w.scalpCondition === identity.scalpCondition) &&
    (w.climate === undefined || w.climate === bio?.climate) &&
    (w.hardWater === undefined || w.hardWater === (bio?.hardWater ?? false)) &&
    (w.preference === undefined || preferences[w.preference])
  return lines
    .filter((line) => matches(line.when))
    .slice(0, MAX_FOR_YOU)
    .map((line) => ({ text: line.text, because: describe(line.when) }))
}

/** The passage that shares the most with the question, or the record's opening one. */
function bestPassage(ix: Index, doc: AskDoc, r: Reading): AskPassage | undefined {
  if (doc.passages.length === 0) return undefined
  const scored = doc.passages.map((p) => ({
    p,
    s: [...new Set(termsOf(p.text))].reduce((n, t) => n + (r.terms.get(t) ?? 0) * idf(ix, t), 0),
  }))
  const first = scored[0]
  const best = scored.reduce((a, b) => (b.s > a.s ? b : a))
  // The opening passage is the one written to stand alone; a later one
  // has to be clearly better, and long enough to make sense out of its
  // list, before it takes the lead.
  return best.s > first.s * 1.3 && best.p.text.length >= 40 ? best.p : first.p
}

function coverage(ix: Index, d: Indexed, r: Reading): number {
  let total = 0
  let hit = 0
  for (const [t, weight] of r.units) {
    // A word no passage uses cannot tell two answers apart; it still says
    // the question was about something else, but not as loudly as the
    // rarest word in the app would.
    const w = (ix.df.has(t) ? idf(ix, t) : 3) * weight
    total += w
    if (d.terms.has(t)) hit += w
  }
  return total ? hit / total : 0
}

/** Every record that shares anything with the question, best first. */
function rank(ix: Index, r: Reading, hairType: HairType | undefined): Scored[] {
  const scored: Scored[] = []
  for (const d of ix.docs) {
    const base = bm25(ix, d, r.terms)
    if (base <= 0) continue
    const s: Scored = { doc: d.doc, d, score: base }
    // How much of the question a record answers matters as much as how
    // strongly it answers part of it: "dread wax" shares a word with
    // "my dreads are coming undone" and nothing else.
    s.score = base * boost(r, s, hairType) * (0.35 + 0.65 * coverage(ix, d, r))
    scored.push(s)
  }
  return scored.sort((a, b) => b.score - a.score)
}

/** What Ask made of a question and its ten best records, for `npm run ask:eval -- --why`. */
export function explain(query: string, ctx: AskContext) {
  const ix = index()
  const r = read(query, ix)
  const hairType = r.hairType ?? ctx.identity.hairType
  const top = rank(ix, r, hairType)
    .slice(0, 10)
    .map((s) => ({ id: s.doc.id, score: s.score, coverage: coverage(ix, s.d, r) }))
  return { ...r, terms: Object.fromEntries(r.terms), units: Object.fromEntries(r.units), tags: [...r.tags], top }
}

export function ask(query: string, ctx: AskContext): AskReply {
  const normal = normalise(query)
  if (!normal) return { type: 'chat', text: NOT_UNDERSTOOD }

  const greeting = SMALL_TALK_LINES.get(normal.replace(/\s*(afrocoils?|ask|please|pls)$/, ''))
  if (greeting) return { type: 'chat', text: withName(greeting, ctx.bio?.name) }

  const ix = index()
  const r = read(query, ix)
  // Saying "hair" makes it a hair question even when nothing else in
  // it is a word Ask knows: "can I use rice water on my hair" deserves
  // "not written yet" (and a place in the backlog), not "outside my lane".
  const aboutHair = [...r.tags].some((t) => !META.has(t)) || r.tokens.includes('hair')
  if (!r.known || (r.elsewhere && !aboutHair)) {
    return { type: 'none', text: NOT_UNDERSTOOD, offTopic: true }
  }

  const hairType = r.hairType ?? ctx.identity.hairType
  const allowedProducts = new Set(
    rankProducts(
      PRODUCTS,
      {
        hairType,
        porosity: ctx.identity.porosity,
        density: ctx.identity.density,
        curlPattern: ctx.identity.curlPattern,
        scalpCondition: ctx.identity.scalpCondition,
        locStage: hairType === 'Locs' ? ctx.locStage : undefined,
      },
      ctx.preferences,
    ).map((rp) => rp.product.id),
  )

  const scored = rank(ix, r, hairType)

  const shown: Scored[] = []
  let hidden: { s: Scored; why: 'hairType' | 'preference' } | undefined
  for (const s of scored) {
    const why = heldBack(s.doc, hairType, ctx, allowedProducts)
    if (!why) shown.push(s)
    else if (!hidden) hidden = { s, why }
  }

  const top = shown[0]
  // With no idea recognised, only plain word overlap is left to go on,
  // and "the meaning of life" overlaps with a guide somewhere. Ask for
  // much more before calling that an answer.
  const bare = ![...r.tags].some((t) => !META.has(t)) && r.occasion === undefined
  if (
    !top ||
    top.score < MIN_SCORE * (bare ? 2 : 1) ||
    coverage(ix, top.d, r) < (bare ? 0.75 : MIN_COVERAGE)
  ) {
    // With no hair idea in it at all, a weak match is a question about
    // something else that happened to share a word with a guide.
    return bare && !aboutHair
      ? { type: 'none', text: NOT_UNDERSTOOD, corrected: r.corrected, offTopic: true }
      : { type: 'none', text: NOTHING_FOUND, corrected: r.corrected, offTopic: false }
  }

  const notes: AskNote[] = []
  if (hidden && hidden.s.score > top.score) {
    notes.push({
      text:
        hidden.why === 'preference'
          ? NOTES.hiddenByPreference
          : hairType === 'Locs'
            ? NOTES.hiddenForLocs
            : NOTES.hiddenForLoose,
    })
  }
  if (!hairType && top.doc.hairTypes.length === 1) {
    notes.push({ text: NOTES.noHairType, to: '/quiz', label: 'Take the hair quiz' })
  }

  let hit: AskHit = { doc: top.doc, score: top.score, quote: bestPassage(ix, top.doc, r) }

  // Style questions are answered with several styles, not one.
  let mode: 'quote' | 'styles' | 'products' | 'pending' = top.doc.pending ? 'pending' : 'quote'
  let styles: AskHit[] = []
  let seeAll: { to: string; label: string } | undefined
  const firstStyle =
    r.intent === 'style'
      ? shown.find(
          (s) =>
            (s.doc.kind === 'style' || s.doc.kind === 'loc-style') && s.score >= top.score * 0.35,
        )
      : undefined
  if (firstStyle) {
    const kind = firstStyle.doc.kind
    let pool = shown.filter((s) => s.doc.kind === kind)
    if (r.minutes !== undefined && kind === 'style') {
      const fits = pool.filter((s) => s.doc.style!.minutes <= r.minutes!)
      if (fits.length) pool = fits
    }
    styles = pool.slice(0, 4).map((s) => ({ doc: s.doc, score: s.score, quote: s.doc.passages[0] }))
    hit = styles[0]
    mode = 'styles'
    seeAll =
      kind === 'loc-style'
        ? { to: '/locs/styles', label: 'See every loc style' }
        : r.minutes !== undefined && r.minutes <= QUICK_MAX_MINUTES
          ? { to: '/sos/quick', label: 'See all quick hairstyles' }
          : r.tags.has('recommend')
            ? { to: '/styles/recommended', label: 'See styles recommended for you' }
            : { to: '/styles', label: 'Browse the style library' }
  }

  // A shelf is answered with the shelf, ranked against the profile.
  let products: RankedProduct[] = []
  if (top.doc.kind === 'shelf' && top.doc.category) {
    products = PRODUCTS.filter(
      (p) => p.category === top.doc.category && allowedProducts.has(p.id),
    )
      .map((p) => ({ p, rank: [...allowedProducts].indexOf(p.id) }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map(({ p }) => ({ product: p, score: 0, reasons: [] }))
    mode = 'products'
    seeAll = { to: top.doc.route, label: top.doc.cta }
  }

  const inAnswer = new Set([hit.doc.id, top.doc.id, ...styles.map((s) => s.doc.id)])
  // A how-to topic that outscored the styles still belongs on the card.
  const extra = hit.doc.id !== top.doc.id ? [{ doc: top.doc, score: top.score }] : []
  // "Also in the app" has to be about the question too, not merely share
  // a word with it: at least half of what was asked, and not far behind.
  const related = shown
    .filter((s) => !inAnswer.has(s.doc.id) && s.score >= top.score * 0.3)
    .filter((s) => coverage(ix, s.d, r) >= 0.5)
    // A question about locs keeps its extras about locs.
    .filter((s) => r.hairType !== 'Locs' || s.d.terms.has('#locs') || s.doc.hairTypes.length === 1)
    .filter((s) => !(mode === 'products' && s.doc.kind === 'product'))
    // Under a written answer, "also in the app" is where to go deeper —
    // the guides and checks — not more answers on the same subject.
    .filter((s) => !(hit.doc.kind === 'answer' && s.doc.kind === 'answer'))
    .filter((s, i, all) => all.findIndex((o) => o.doc.title === s.doc.title) === i)
    .slice(0, 4 - extra.length)
    .map((s) => ({ doc: s.doc, score: s.score }))
  related.unshift(...extra)

  // A partial match is still pointed at plainly: it is the part of the
  // app nearest the question, and the card says where it came from.
  const weak = coverage(ix, top.d, r) < 0.5
  const lead = pick(
    mode === 'pending'
      ? LEADS.pending
      : weak
        ? LEADS.closest
        : mode === 'styles'
          ? LEADS.styles
          : mode === 'products'
            ? LEADS.products
            : top.doc.kind === 'topic'
              ? LEADS.howTo
              : r.worried
                ? LEADS.worried
                : LEADS.answer,
    normal,
  )

  return {
    type: 'answer',
    lead: withName(lead, ctx.bio?.name),
    hit,
    mode,
    styles,
    products,
    related,
    forYou: mode === 'quote' ? forYouFor(hit.doc.forYou, hairType, ctx) : [],
    safety: r.medical ? SAFETY_LINE : undefined,
    notes,
    corrected: r.corrected,
    answeredFor: hairType
      ? { hairType, from: r.hairType ? 'question' : 'profile' }
      : undefined,
    seeAll,
  }
}

/** What Ask did with a question, in the words the review queue stores. */
export function askOutcome(reply: AskReply): { outcome: AskOutcome; matched?: string } {
  if (reply.type === 'chat') return { outcome: 'chat' }
  if (reply.type === 'none') return { outcome: reply.offTopic ? 'off-topic' : 'none' }
  const matched = reply.hit.doc.id
  if (reply.mode !== 'quote') return { outcome: reply.mode, matched }
  return { outcome: reply.hit.doc.kind === 'answer' ? 'answer' : 'quote', matched }
}
