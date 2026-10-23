/**
 * What people asked Ask, and what Ask still cannot answer.
 *
 * The learning loop, with a person in it:
 *
 *   1. The app shares each question (lib/ask/share.ts) into the
 *      `ask_questions` table (supabase/functions/questions).
 *   2. This script pulls the recent ones and runs every distinct
 *      question back through the *current* Ask, for loose hair and for
 *      locs. Anything answered at the time but still unanswered now is
 *      the backlog; anything that was a miss and now lands is learning
 *      that already shipped.
 *   3. The report lists the backlog by how often it was asked, with a
 *      ready-to-paste line for src/lib/ask/cases.ts each. Write the
 *      answer in content/answers.ts (or the phrasing into an answer's
 *      `asks`), paste the case, `npm run ask:eval`, push.
 *
 * Nothing here writes advice — a person still writes every answer.
 *
 *   npm run ask:study                    # pull the last 30 days via the Supabase CLI
 *   npm run ask:study -- --days 90
 *   npm run ask:study -- --file rows.json   # study an export instead of pulling
 *
 * The report goes to ask-study/, which is gitignored: these are things
 * people typed, and the repository is public. Do not commit them.
 *
 * Pulling needs the CLI logged in to the AfroCoils project; on this
 * machine set SUPABASE_ACCESS_TOKEN from AFROCOILS_SUPABASE_TOKEN first.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const days = Math.max(1, Math.min(365, Number(flag('days') ?? 30)))
const file = flag('file')

/** The first array of row-shaped objects anywhere in the CLI's JSON. */
function rowsIn(value) {
  if (Array.isArray(value)) {
    if (value.every((r) => typeof r === 'object' && r !== null && 'question' in r)) return value
    for (const v of value) {
      const found = rowsIn(v)
      if (found) return found
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const v of Object.values(value)) {
      const found = rowsIn(v)
      if (found) return found
    }
  }
  return undefined
}

function pull() {
  const sql =
    `select question, outcome, matched, bundle, asked_at from public.ask_questions ` +
    `where asked_at > now() - interval '${days} days' order by asked_at desc limit 20000`
  const out = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['supabase', 'db', 'query', '--linked', '--output-format', 'json', sql],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32' },
  )
  const rows = rowsIn(JSON.parse(out.slice(out.search(/[[{]/))))
  if (!rows) throw new Error('No rows in the CLI output. Is the CLI linked to runhkccoeyxfgsfrzezn?')
  return rows
}

const rows = file ? rowsIn(JSON.parse(readFileSync(file, 'utf8'))) ?? [] : pull()

const server = await createServer({
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})

try {
  const { ask, askOutcome, explain } = await server.ssrLoadModule('/src/lib/ask/engine.ts')
  const { normalise } = await server.ssrLoadModule('/src/lib/ask/text.ts')

  const preferences = {
    heatlessOnly: false,
    siliconeFree: false,
    proteinSensitive: false,
    protectiveBias: false,
    lowManipulation: false,
  }
  const contexts = {
    loose: { identity: { hairType: 'Loose Natural' }, preferences },
    locs: { identity: { hairType: 'Locs' }, preferences },
  }

  // One entry per question as a person would read it: "My hair is dry!"
  // and "my hair is dry" are the same question asked twice.
  const groups = new Map()
  const asked = {}
  for (const row of rows) {
    asked[row.outcome] = (asked[row.outcome] ?? 0) + 1
    const key = normalise(String(row.question))
    if (!key) continue
    const g = groups.get(key) ?? { text: String(row.question).trim(), count: 0, then: {} }
    g.count++
    g.then[row.outcome] = (g.then[row.outcome] ?? 0) + 1
    groups.set(key, g)
  }

  const studied = [...groups.values()].map((g) => {
    const now = {}
    for (const [hair, ctx] of Object.entries(contexts)) {
      const reply = ask(g.text, ctx)
      const { outcome, matched } = askOutcome(reply)
      const why = explain(g.text, ctx)
      now[hair] = { outcome, matched, coverage: why.top[0]?.coverage ?? 0, corrected: why.corrected }
    }
    return { ...g, now }
  })

  const isMiss = (o) => o === 'none'
  const backlog = studied
    .filter((s) => isMiss(s.now.loose.outcome) && isMiss(s.now.locs.outcome))
    .sort((a, b) => b.count - a.count)
  const weak = studied
    .filter((s) => !backlog.includes(s))
    // Loosely matched, or matched only after Ask "fixed" a word it did
    // not know — "rice" read as "rid" once sent rice water to dandruff.
    .filter(
      (s) =>
        ['answer', 'quote'].includes(s.now.loose.outcome) &&
        (s.now.loose.coverage < 0.5 || s.now.loose.corrected),
    )
    .sort((a, b) => b.count - a.count)
  const learned = studied
    .filter((s) => (s.then.none ?? 0) > 0 && !isMiss(s.now.loose.outcome) && s.now.loose.outcome !== 'off-topic')
    .sort((a, b) => b.count - a.count)
  const popular = new Map()
  for (const s of studied) {
    const m = s.now.loose.matched ?? s.now.locs.matched
    if (m) popular.set(m, (popular.get(m) ?? 0) + s.count)
  }
  const offTopic = studied.filter((s) => s.now.loose.outcome === 'off-topic')

  const q = (s) => s.text.replace(/'/g, '’')
  const lines = []
  const say = (line = '') => lines.push(line)

  say(`# Ask study — ${new Date().toISOString().slice(0, 10)}`)
  say()
  say(`${rows.length} questions over the last ${days} days, ${groups.size} distinct.`)
  say()
  say('## As answered at the time')
  for (const [outcome, n] of Object.entries(asked).sort((a, b) => b[1] - a[1])) say(`- ${outcome}: ${n}`)
  say()
  say(`## Write these next — still unanswered (${backlog.length})`)
  say()
  say('Most asked first. Each needs an entry in src/content/answers.ts, or its phrasing in an')
  say('existing answer’s `asks`. Then paste the case into src/lib/ask/cases.ts and run ask:eval.')
  say()
  for (const s of backlog.slice(0, 60)) say(`- **${s.count}×** ${s.text}`)
  say()
  say('```ts')
  for (const s of backlog.slice(0, 60)) say(`  { q: '${q(s)}', expect: ['answer:TODO'], top: true },`)
  say('```')
  say()
  say(`## Check these — answered, but only loosely (${weak.length})`)
  say()
  say('Ask found something, but it covers under half of the question, or it only matched after')
  say('changing a word it did not know. Either the answer is right and needs this phrasing in its')
  say('`asks`, or it is wrong and a new answer is needed.')
  say()
  for (const s of weak.slice(0, 40)) {
    const read = s.now.loose.corrected ? ` (read as “${s.now.loose.corrected}”)` : ''
    say(`- **${s.count}×** ${s.text}${read} → ${s.now.loose.matched}`)
  }
  say()
  say(`## Learned — missed when asked, answered now (${learned.length})`)
  say()
  for (const s of learned.slice(0, 40)) say(`- ${s.count}× ${s.text} → ${s.now.loose.matched ?? s.now.locs.matched}`)
  say()
  say('## What people ask about most')
  say()
  for (const [id, n] of [...popular.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) say(`- ${n}× ${id}`)
  say()
  say(`## Not about hair (${offTopic.length} distinct)`)
  say()
  say('Only worth reading for hair questions hiding in here — add their words to the vocabulary.')
  say()
  for (const s of offTopic.sort((a, b) => b.count - a.count).slice(0, 20)) say(`- ${s.count}× ${s.text}`)

  const dir = 'ask-study'
  mkdirSync(dir, { recursive: true })
  const out = join(dir, `report-${new Date().toISOString().slice(0, 10)}.md`)
  writeFileSync(out, lines.join('\n') + '\n')

  console.log(`${rows.length} questions, ${groups.size} distinct, last ${days} days`)
  console.log(`  still unanswered: ${backlog.length}   loosely answered: ${weak.length}   learned since: ${learned.length}   off-topic: ${offTopic.length}`)
  for (const s of backlog.slice(0, 10)) console.log(`  ${String(s.count).padStart(4)}×  ${s.text}`)
  console.log(`\nReport: ${out}  (gitignored — these are people’s questions)`)
} finally {
  await server.close()
}
