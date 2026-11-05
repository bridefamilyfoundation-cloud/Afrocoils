import type { BillingLinkResponse } from '../../../src/lib/types.ts'
import { membershipOpen } from '../../../src/lib/types.ts'
import { BodyTooLarge, readText } from '../_shared/body.ts'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { serve } from '../_shared/env.ts'
import { checkLimits, limitResponse } from '../_shared/limits.ts'
import { db, getMember, laterOf, saveMember } from '../_shared/members.ts'
import {
  manageLink,
  memberStatus,
  planCode,
  startCheckout,
  verifyPaystackSignature,
} from '../_shared/paystack.ts'
import { upsert } from '../_shared/supabase.ts'
import { bearer } from '../_shared/token.ts'

/**
 * Paying for membership, through Paystack.
 *
 * - `POST billing/checkout` (member token) answers a Paystack checkout
 *   URL for the monthly plan. The phone opens it in the browser; card
 *   details go to Paystack and never touch the app or this project.
 * - `POST billing/manage` (member token) answers Paystack's own page for
 *   changing the card or cancelling.
 * - `POST billing/webhook` is Paystack telling us what happened. It is
 *   the only thing that writes a payment, and it is believed only when
 *   `x-paystack-signature` matches. Always 200 once verified, so Paystack
 *   does not retry an event we have already handled.
 *
 * Set the webhook URL in the Paystack dashboard (Settings → API Keys &
 * Webhooks) to `https://<ref>.supabase.co/functions/v1/billing/webhook`.
 */

/** One month on from `iso`, for a charge that arrives before its subscription event. */
function monthAfter(iso: string): string {
  const date = new Date(iso)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString()
}

async function checkout(req: Request, origin?: string): Promise<Response> {
  const session = await bearer(req, 'member')
  if (!session) return jsonResponse({ error: 'Sign in with your email first.' }, 401, origin)

  const member = await getMember(session.sub)
  if (member && member.status === 'active' && membershipOpen(member.paid_until)) {
    return jsonResponse({ error: 'This email is already a paid member. Pull down to refresh.' }, 409, origin)
  }
  const url = await startCheckout(session.sub)
  return jsonResponse({ url } satisfies BillingLinkResponse, 200, origin)
}

async function manage(req: Request, origin?: string): Promise<Response> {
  const session = await bearer(req, 'member')
  if (!session) return jsonResponse({ error: 'Sign in with your email first.' }, 401, origin)

  const member = await getMember(session.sub)
  if (!member?.paystack_subscription) {
    return jsonResponse(
      { error: 'There is no card subscription on this email. Write to support@afrocoils.app.' },
      404,
      origin,
    )
  }
  const url = await manageLink(member.paystack_subscription)
  return jsonResponse({ url } satisfies BillingLinkResponse, 200, origin)
}

/* ------------------------------------------------------------------ */

interface PaystackEvent {
  event: string
  data: Record<string, unknown> & {
    reference?: string
    amount?: number
    currency?: string
    paid_at?: string
    paidAt?: string
    status?: string
    paid?: boolean
    subscription_code?: string
    email_token?: string
    next_payment_date?: string | null
    customer?: { email?: string; customer_code?: string }
    plan?: { plan_code?: string } | null
    subscription?: { subscription_code?: string; status?: string; next_payment_date?: string | null } | null
  }
}

async function webhook(req: Request): Promise<Response> {
  let raw: string
  try {
    raw = await readText(req, 256 * 1024)
  } catch (error) {
    if (error instanceof BodyTooLarge) return new Response(null, { status: 413 })
    throw error
  }
  if (!(await verifyPaystackSignature(raw, req.headers.get('x-paystack-signature')))) {
    console.warn('[billing] webhook with a bad signature, ignored')
    return new Response(null, { status: 401 })
  }

  const { event, data } = JSON.parse(raw) as PaystackEvent
  const email = data.customer?.email?.trim().toLowerCase()
  const ours = planCode()
  const planOf = data.plan?.plan_code
  console.log(`[billing] ${event}`)

  if (!email) return new Response(null, { status: 200 })

  switch (event) {
    case 'charge.success': {
      const paidAt = data.paid_at ?? data.paidAt ?? new Date().toISOString()
      if (data.reference) {
        await upsert(
          db(),
          'payments',
          [
            {
              reference: data.reference,
              email,
              amount: data.amount ?? 0,
              currency: data.currency ?? 'NGN',
              paid_at: paidAt,
              plan: planOf ?? null,
            },
          ],
          { ignore: true },
        )
      }
      if (planOf !== ours) break
      const member = await getMember(email)
      await saveMember(email, {
        status: 'active',
        source: 'paystack',
        paystack_customer: data.customer?.customer_code ?? member?.paystack_customer ?? null,
        paid_until: laterOf(member?.paid_until, monthAfter(paidAt)),
      })
      break
    }

    case 'subscription.create':
    case 'subscription.enable': {
      if (planOf && planOf !== ours) break
      const member = await getMember(email)
      await saveMember(email, {
        status: memberStatus(data.status ?? 'active'),
        source: 'paystack',
        paystack_customer: data.customer?.customer_code ?? null,
        paystack_subscription: data.subscription_code ?? null,
        paystack_email_token: data.email_token ?? null,
        paid_until: laterOf(member?.paid_until, data.next_payment_date ?? null),
      })
      break
    }

    case 'subscription.not_renew':
      await saveMember(email, { status: 'non-renewing' })
      break

    case 'subscription.disable':
      // Access runs to the end of the period already paid for.
      await saveMember(email, { status: 'cancelled' })
      break

    case 'invoice.payment_failed':
      await saveMember(email, { status: 'attention' })
      break

    case 'invoice.update': {
      const sub = data.subscription
      if (data.paid && sub?.next_payment_date) {
        const member = await getMember(email)
        await saveMember(email, {
          status: memberStatus(sub.status ?? 'active'),
          paid_until: laterOf(member?.paid_until, sub.next_payment_date),
        })
      }
      break
    }
  }

  return new Response(null, { status: 200 })
}

/* ------------------------------------------------------------------ */

serve(async (req) => {
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, origin)

  const route = new URL(req.url).pathname.split('/').pop()
  try {
    // Paystack is not rate-limited by IP: a burst of real events must
    // not be refused. The signature is what keeps everyone else out.
    if (route === 'webhook') return await webhook(req)

    const limit = await checkLimits(req, 'billing')
    if (!limit.allowed) return limitResponse(limit, origin)
    if (route === 'checkout') return await checkout(req, origin)
    if (route === 'manage') return await manage(req, origin)
    return jsonResponse({ error: 'Not found' }, 404, origin)
  } catch (error) {
    console.error(`[billing] ${route} failed`, error)
    if (route === 'webhook') return new Response(null, { status: 500 })
    return jsonResponse({ error: 'Payment is briefly unavailable. Try again in a minute.' }, 502, origin)
  }
})
