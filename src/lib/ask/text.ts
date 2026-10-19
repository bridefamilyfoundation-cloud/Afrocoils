/**
 * Words in, comparable tokens out — the shared front end of Ask.
 *
 * The query and every passage in the app go through exactly the same
 * functions, which is the whole trick: "my hair keeps shedding" and a
 * guide that says "normal daily shedding" only meet if both sides were
 * cut up the same way. Nothing here knows about hair; the vocabulary
 * that does lives in content/ask.ts.
 */

/** Words that carry no meaning on their own in a hair question. */
const STOPWORDS = new Set(
  (
    'a an the and or but if then so of to in on at by for from with without into onto about ' +
    'is are was were be been being am do does did done doing have has had having ' +
    'i me my mine myself we us our you your yours it its this that these those there here ' +
    'what which who whom whose when where why how can could should would will shall may might must ' +
    'just really very quite too also still even ever any some all each every much many more most ' +
    'get got gets getting go goes going make makes made want wants need please help tell know ' +
    'give gives giving gave given put puts putting ' +
    'after before during while since until again back off all day days time times ' +
    'like thing things stuff way ok okay hey um uh pls plz abit bit lot lots ' +
    'they them their theirs he him his she her hers it itself ' +
    'everywhere always constantly lately recently now today tonight tomorrow yesterday anymore ' +
    'literally actually basically seriously honestly so such ' +
    'monday tuesday wednesday thursday friday saturday sunday week weekend'
  ).split(' '),
)

/**
 * Lower-case, straighten quotes, expand the contractions people type,
 * and reduce everything else to letters, digits and single spaces.
 */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\b(can|won|don|doesn|didn|isn|aren|wasn|weren|hasn|haven|shouldn|wouldn|couldn)'?t\b/g, '$1 not')
    .replace(/'(s|re|ve|ll|d|m)\b/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Reduce a word to something comparable with its relatives.
 *
 * Crude on purpose, like the guide search before it: it exists to close
 * the gap between "itchy" and "itch", "tangled" and "tangles",
 * "shedding" and "shed", not to be a linguistics exercise. What matters
 * is that it is applied identically on both sides.
 */
/** Irregular forms the suffix rules cannot reach, mapped to what those rules make of the regular ones. */
const IRREGULAR: Record<string, string> = {
  lost: 'los',
  broke: 'break',
  broken: 'break',
  fell: 'fall',
  fallen: 'fall',
  grew: 'grow',
  grown: 'grow',
  wore: 'wear',
  worn: 'wear',
  dried: 'dry',
  dries: 'dry',
  slept: 'sleep',
  hurt: 'hurt',
  split: 'split',
  children: 'child',
  women: 'woman',
}

export function stem(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word]
  let w = word
  if (w.length <= 3 || /^\d/.test(w)) return w
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`
  // breakage -> break, shrinkage -> shrink; "damage" is too short to lose it.
  if (w.length >= 8 && w.endsWith('age')) return w.slice(0, -3)
  for (const suffix of ['ingly', 'edly', 'ing', 'ed', 'es', 'ly', 's']) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length)
      break
    }
  }
  if (w.length > 3 && (w.endsWith('y') || w.endsWith('e'))) w = w.slice(0, -1)
  // shedd -> shed, frizz -> friz: doubled consonants collapse either way.
  if (w.length > 3 && w.at(-1) === w.at(-2) && !/[aeiou]/.test(w.at(-1)!)) w = w.slice(0, -1)
  return w
}

/** Every word, stemmed, stopwords kept — phrase matching needs them in place. */
export function words(text: string): string[] {
  const n = normalise(text)
  return n ? n.split(' ').map(stem) : []
}

/**
 * Stopwords as the stemmer leaves them, too: tokens are compared after
 * stemming, and "everywhere" arrives as "everywher".
 */
const STOP_STEMS = new Set([...STOPWORDS].map(stem))

export function isStopword(word: string): boolean {
  return STOPWORDS.has(word) || STOP_STEMS.has(word)
}

/**
 * Edit distance, capped. Returns `max + 1` as soon as the answer is
 * known to exceed `max`, which is all a typo check needs and keeps it
 * cheap enough to run against the whole vocabulary on every question.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let older: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      // An adjacent swap ("tnagle") is one slip, not two.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, older[j - 2] + 1)
      }
      row.push(value)
      best = Math.min(best, value)
    }
    if (best > max) return max + 1
    older = prev
    prev = row
  }
  return prev[b.length]
}

/** Split prose into sentences, keeping each one whole and verbatim. */
export function sentences(text: string): string[] {
  return (
    text
      .match(/[^.!?]+(?:[.!?]+["'”’)]*|$)/g)
      ?.map((s) => s.trim())
      .filter((s) => s.length > 0) ?? []
  )
}
