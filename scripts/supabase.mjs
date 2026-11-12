/**
 * `npx supabase …`, always as the AfroCoils account (see lib/supabase-env.mjs).
 *
 *   node scripts/supabase.mjs db push --linked
 *   node scripts/supabase.mjs --deploy-functions
 *
 * `--deploy-functions` deploys all six functions, JWT verification off
 * (the app holds no Supabase key to present), stopping at the first
 * failure.
 */
import { spawnSync } from 'node:child_process'
import { PROJECT_REF, supabaseEnv } from './lib/supabase-env.mjs'

const FUNCTIONS = ['submissions', 'questions', 'auth', 'billing', 'inbound', 'admin']
const env = supabaseEnv()
const windows = process.platform === 'win32'
const quote = (arg) => (windows && /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg)

function run(args) {
  const result = spawnSync('npx', ['supabase', ...args].map(quote), { stdio: 'inherit', env, shell: windows })
  return result.status ?? 1
}

const args = process.argv.slice(2)
if (args[0] === '--deploy-functions') {
  for (const name of FUNCTIONS) {
    console.log(`\n— deploying ${name}`)
    const status = run(['functions', 'deploy', name, '--no-verify-jwt', '--use-api', '--project-ref', PROJECT_REF])
    if (status !== 0) process.exit(status)
  }
  console.log(`\nAll ${FUNCTIONS.length} functions deployed to ${PROJECT_REF}.`)
} else {
  process.exit(run(args))
}
