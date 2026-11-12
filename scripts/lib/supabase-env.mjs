/**
 * The environment every Supabase CLI call in this repo runs with.
 *
 * This machine's shared `supabase login` belongs to whichever project
 * logged in last, and another project here logs in as a different
 * account; under that login every AfroCoils call answers 403 "does not
 * have the necessary privileges". So no script here trusts the shared
 * login: each one hands the CLI the AfroCoils token explicitly, as
 * SUPABASE_ACCESS_TOKEN, for that one process only. The global login is
 * never changed, so the other project keeps working.
 *
 * The token is the user environment variable AFROCOILS_SUPABASE_TOKEN
 * (a personal access token for the account that owns the project). A
 * shell opened before it was set will not have it, so on Windows it is
 * also read straight from the user's registry environment. It is never
 * printed and never written to a file.
 */
import { execFileSync } from 'node:child_process'

export const PROJECT_REF = 'runhkccoeyxfgsfrzezn'

function fromRegistry(name) {
  if (process.platform !== 'win32') return undefined
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', name], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const match = out.match(new RegExp(`${name}\\s+REG_(?:EXPAND_)?SZ\\s+(\\S+)`))
    return match?.[1]
  } catch {
    return undefined
  }
}

export function afrocoilsToken() {
  return process.env.AFROCOILS_SUPABASE_TOKEN?.trim() || fromRegistry('AFROCOILS_SUPABASE_TOKEN')
}

/** process.env with the AfroCoils token in place; exits with a clear message without one. */
export function supabaseEnv() {
  const token = afrocoilsToken()
  if (!token) {
    console.error(
      'AFROCOILS_SUPABASE_TOKEN is not set. Create a personal access token while signed in to the ' +
        `account that owns project ${PROJECT_REF} (supabase.com → Account → Access Tokens), then:\n` +
        '  [Environment]::SetEnvironmentVariable("AFROCOILS_SUPABASE_TOKEN", "<token>", "User")',
    )
    process.exit(1)
  }
  return { ...process.env, SUPABASE_ACCESS_TOKEN: token }
}
