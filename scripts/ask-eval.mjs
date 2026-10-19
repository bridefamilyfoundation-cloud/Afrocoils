/**
 * Runs every question in src/lib/ask/cases.ts through Ask and reports
 * where each one landed.
 *
 * Loads the TypeScript through Vite's module runner rather than a
 * separate test framework: the engine is plain functions over the
 * content files, and the app's own build already knows how to load them.
 *
 *   npm run ask:eval            # summary and failures; exits 1 on any failure
 *   npm run ask:eval -- --all   # every question, pass or fail
 *   npm run ask:eval -- --why "my locs smell" --locs   # how one question was read and scored
 */
import { createServer } from 'vite'

const verbose = process.argv.includes('--all')
const whyAt = process.argv.indexOf('--why')
const why = whyAt > 0 ? process.argv[whyAt + 1] : undefined
const locsAt = process.argv.includes('--locs')

const server = await createServer({
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})

let failed = 0
try {
  const { ask, explain } = await server.ssrLoadModule('/src/lib/ask/engine.ts')
  const { CASES } = await server.ssrLoadModule('/src/lib/ask/cases.ts')

  const noPreferences = {
    heatlessOnly: false,
    siliconeFree: false,
    proteinSensitive: false,
    protectiveBias: false,
    lowManipulation: false,
  }

  if (why) {
    const ctx = { identity: { hairType: locsAt ? 'Locs' : 'Loose Natural' }, preferences: noPreferences }
    console.dir(explain(why, ctx), { depth: 4 })
    console.dir(ask(why, ctx), { depth: 2 })
    process.exit(0)
  }

  const matches = (id, pattern) =>
    pattern.endsWith('*') ? id.startsWith(pattern.slice(0, -1)) : id === pattern

  const started = performance.now()
  for (const c of CASES) {
    const reply = ask(c.q, { identity: { hairType: c.hair }, preferences: noPreferences })
    const problems = []
    let landed = reply.type

    if (reply.type === 'answer') {
      const card = [reply.hit.doc.id, ...reply.styles.map((s) => s.doc.id), ...reply.related.map((r) => r.doc.id)]
      landed = `${reply.hit.doc.id}  [${card.slice(1).join(', ')}]`
      if (c.chat || c.none) problems.push(`expected ${c.chat ? 'small talk' : 'nothing found'}`)
      if (c.expect) {
        const pool = c.top ? [reply.hit.doc.id, ...reply.styles.map((s) => s.doc.id)] : card
        if (!c.expect.some((e) => pool.some((id) => matches(id, e)))) {
          problems.push(`expected ${c.top ? 'answer' : 'on card'}: ${c.expect.join(' | ')}`)
        }
      }
      for (const n of c.never ?? []) {
        if (card.some((id) => matches(id, n))) problems.push(`must not show ${n}`)
      }
    } else {
      if (c.expect) problems.push(`expected ${c.expect.join(' | ')}, got ${reply.type}`)
      if (c.chat && reply.type !== 'chat') problems.push(`expected small talk, got ${reply.type}`)
      if (c.none && reply.type !== 'none') problems.push(`expected nothing found, got ${reply.type}`)
    }

    if (problems.length) failed++
    if (problems.length || verbose) {
      const mark = problems.length ? 'FAIL' : 'ok  '
      console.log(`${mark} ${c.hair ? `[${c.hair === 'Locs' ? 'locs' : 'loose'}] ` : ''}${c.q}`)
      console.log(`       → ${landed}`)
      for (const p of problems) console.log(`       ✗ ${p}`)
    }
  }
  const ms = performance.now() - started
  console.log(
    `\n${CASES.length - failed}/${CASES.length} passed  (${(ms / CASES.length).toFixed(1)} ms per question)`,
  )
} finally {
  await server.close()
}
process.exit(failed ? 1 : 0)
