-- Refunds and chargebacks, as Paystack's webhook reports them.
--
-- Added 2026-11-13 with `reverseCharge()` (supabase/functions/_shared/
-- membership.ts). A payment row is marked when its charge is refunded
-- (`refund.processed`) or a dispute is lost (`charge.dispute.resolve`),
-- so the admin's payments list shows it and a replayed `charge.success`
-- cannot reopen the period it paid for. The privacy policy's "Paying"
-- paragraph says we keep whether a payment was refunded or disputed.
--
-- Same table, same posture: service role only.

alter table public.payments
  add column if not exists reversed_at     timestamptz,
  add column if not exists reversal        text check (reversal in ('refund', 'chargeback')),
  add column if not exists reversed_amount bigint;

comment on table public.payments is
  'Successful Paystack charges, from the webhook, and whether each was later refunded or charged back. No card data: Paystack keeps that. Service role only.';
