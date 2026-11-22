/**
 * This session's Ask questions, oldest first. In memory only: never
 * written to the profile, gone when the app closes.
 *
 * One list for both forms of Ask. The floating sheet and the full
 * screen at `/ask` used to keep a list each, so a question asked in one
 * was unknown to the other: the sheet opened empty after an answer had
 * just been read on `/ask`, and `/ask` offered no "Earlier" for anything
 * asked in the sheet.
 */

export interface AskTurn {
  id: number
  q: string
}

const MAX_TURNS = 8
const turns: AskTurn[] = []
let nextId = 1

/** The session so far. A copy, so a caller can hold it as state. */
export function askSession(): AskTurn[] {
  return [...turns]
}

/**
 * Add a question. Asking the same thing twice in a row is one turn, so
 * `/ask` replaying its address on back or forward does not stack copies.
 */
export function recordAsk(q: string): AskTurn[] {
  const last = turns[turns.length - 1]
  if (!last || last.q.toLowerCase() !== q.toLowerCase()) {
    turns.push({ id: nextId++, q })
    if (turns.length > MAX_TURNS) turns.splice(0, turns.length - MAX_TURNS)
  }
  return askSession()
}

export function clearAskSession(): void {
  turns.length = 0
}

/** Distinct questions, newest first, for the "Earlier" chips. */
export function earlierAsks(except: string, limit = 6): string[] {
  const seen = new Set<string>([except.toLowerCase()])
  const out: string[] = []
  for (let i = turns.length - 1; i >= 0 && out.length < limit; i--) {
    const key = turns[i].q.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(turns[i].q)
  }
  return out
}
