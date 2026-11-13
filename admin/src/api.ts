import type { AdminSessionResponse, MemberStatus, PlanId } from '../../src/lib/types'

/**
 * The admin site's only connection: the `auth` and `admin` Edge
 * Functions. The session is an admin token from `auth/verify`, kept in
 * sessionStorage so closing the tab signs out; it runs out after twelve
 * hours, and the function also checks the address is still on
 * ADMIN_EMAILS on every request.
 */
const BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://runhkccoeyxfgsfrzezn.supabase.co/functions/v1'

const KEY = 'afrocoils-admin-session'

export function loadSession(): AdminSessionResponse | null {
  try {
    const session = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as AdminSessionResponse | null
    return session && Date.parse(session.expiresISO) > Date.now() ? session : null
  } catch {
    return null
  }
}

export function saveSession(session: AdminSessionResponse | null): void {
  if (session) sessionStorage.setItem(KEY, JSON.stringify(session))
  else sessionStorage.removeItem(KEY)
}

export class SignedOut extends Error {}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${BASE}/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (response.status === 401 && token) throw new SignedOut('Signed out')
  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null
  if (!response.ok) throw new Error(body?.error ?? `Request failed (${response.status})`)
  return body as T
}

export const sendCode = (email: string) =>
  request<void>('auth/request-code', { method: 'POST', body: JSON.stringify({ email, purpose: 'admin' }) })

export const verify = (email: string, code: string) =>
  request<AdminSessionResponse>('auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code, purpose: 'admin' }),
  })

export function adminApi(token: string, onSignedOut: () => void) {
  const guard = <T,>(promise: Promise<T>): Promise<T> =>
    promise.catch((error: unknown) => {
      if (error instanceof SignedOut) onSignedOut()
      throw error
    })
  return {
    get: <T,>(route: string, query: Record<string, string> = {}) => {
      const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '')).toString()
      return guard(request<T>(`admin/${route}${qs ? `?${qs}` : ''}`, { method: 'GET' }, token))
    },
    post: <T,>(route: string, body: unknown) =>
      guard(request<T>(`admin/${route}`, { method: 'POST', body: JSON.stringify(body) }, token)),
  }
}
export type AdminApi = ReturnType<typeof adminApi>

/* Rows as the admin function returns them (snake_case: Postgres). */

export interface Overview {
  members: number
  paying: number
  pending: number
  open: number
  unread: number
  unanswered: number
}

export interface MemberRow {
  email: string
  status: MemberStatus
  paid_until: string | null
  source: 'paystack' | 'manual'
  paystack_customer: string | null
  paystack_subscription: string | null
  plan: PlanId | null
  period_start: string | null
  trial_ends_at: string | null
  last_notice: string | null
  note: string | null
  created_at: string
  updated_at: string
  last_seen_at: string | null
}

export interface PaymentRow {
  reference: string
  email: string
  amount: number
  currency: string
  paid_at: string
  plan: string | null
  reversed_at: string | null
  reversal: 'refund' | 'chargeback' | null
  reversed_amount: number | null
}

/** One @afrocoils.app address and its conversations. */
export interface MailboxSummary {
  mailbox: string
  address: string
  /** support, hello, no-reply: listed even when empty. */
  known: boolean
  /** Where replies come from (no-reply@ is answered from support@). */
  repliesFrom: string
  unread: number
  open: number
  total: number
}

export interface ThreadSummary {
  id: number
  mailbox: string
  with: string
  subject: string
  status: 'open' | 'closed'
  unread: boolean
  count: number
  lastISO: string
  preview: string
}

export interface MessageRow {
  id: number
  direction: 'in' | 'out'
  mailbox: string
  from_address: string
  to_address: string
  subject: string
  body: string
  sent_by: string | null
  created_at: string
}

export interface SubmissionRow {
  id: string
  received_at: string
  review: 'Pending' | 'Approved' | 'Rejected'
  body: Record<string, unknown>
  photos: (string | null)[]
  reviewer_note: string | null
}

export interface QuestionRow {
  id: number
  asked_at: string
  question: string
  outcome: string
  matched: string | null
  bundle: number | null
  reviewed: boolean
}

export const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

export const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
