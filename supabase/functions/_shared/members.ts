/**
 * The `members` table, as auth, billing and admin all read it.
 */
import type { MemberStatus } from '../../../src/lib/types.ts'
import { patch, select, supabaseConfig, upsert, type SupabaseConfig } from './supabase.ts'

export interface MemberRow {
  email: string
  status: MemberStatus
  paid_until: string | null
  source: 'paystack' | 'manual'
  paystack_customer: string | null
  paystack_subscription: string | null
  paystack_email_token: string | null
  note: string | null
  created_at: string
  updated_at: string
  last_seen_at: string | null
}

export function db(): SupabaseConfig {
  const config = supabaseConfig()
  if (!config) throw new Error('SUPABASE_URL or the service key is missing from the function environment.')
  return config
}

export async function getMember(email: string): Promise<MemberRow | undefined> {
  const rows = await select<MemberRow>(db(), 'members', `email=eq.${encodeURIComponent(email)}&limit=1`)
  return rows[0]
}

/**
 * Create the row if it is missing, then apply `values`. Two calls rather
 * than one merge-upsert so a partial update never overwrites columns it
 * did not name with their defaults.
 */
export async function saveMember(email: string, values: Partial<Omit<MemberRow, 'email'>>): Promise<MemberRow> {
  await upsert(db(), 'members', [{ email }], { ignore: true })
  const rows = await patch<MemberRow>(db(), 'members', `email=eq.${encodeURIComponent(email)}`, {
    ...values,
    updated_at: new Date().toISOString(),
  })
  return rows[0]!
}

/** A later date wins: a webhook arriving out of order never shortens a paid period. */
export function laterOf(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return Date.parse(a) >= Date.parse(b) ? a : b
}
