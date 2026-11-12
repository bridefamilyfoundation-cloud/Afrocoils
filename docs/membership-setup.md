# Membership, email and the admin site: setup

Every feature of AfroCoils is for paying members (decided 2026-11-05). This
is the one-time setup behind that: the email on `afrocoils.app`, Paystack,
the backend secrets, and `admin.afrocoils.app`. Steps marked **(you)** need
an account login; everything else is a command.

What talks to what:

```
phone ──auth/request-code──▶ auth fn ──Resend──▶ code email from no-reply@afrocoils.app
phone ──auth/verify, status─▶ auth fn ──▶ members table
phone ──billing/trial───────▶ billing fn ──▶ trials, members (three days, no card)
phone ──billing/checkout────▶ billing fn ──Paystack──▶ checkout page (browser)
Paystack ──webhook──────────▶ billing fn ──▶ members, payments
auth/status ──transaction/verify──▶ Paystack (a checkout not yet seen paid)
pg_cron, daily ──billing/reminders──▶ billing fn ──Resend──▶ trial / renewal / ending emails
mail to support@/hello@ ──▶ Resend ──webhook──▶ inbound fn ──▶ support_messages
admin.afrocoils.app ──admin token──▶ admin fn ──▶ every table above + submissions + ask_questions
```

## 1. Resend: sending and receiving on afrocoils.app (you)

1. Create a Resend account and add the domain **afrocoils.app**. Turn on
   **receiving** for it as well as sending.
2. Resend shows the DNS records to add. They are the authority; the list
   below is what to expect, so you can tell if one is missing.
3. Create an API key with **full access** (it sends mail *and* reads
   received mail). It goes into the function secrets in step 4 and nowhere
   else.
4. Add a webhook: URL `https://runhkccoeyxfgsfrzezn.supabase.co/functions/v1/inbound`,
   event **email.received**. Copy its signing secret (`whsec_…`).

## 2. DNS on Vercel (you, or a token for the AfroCoils Vercel account)

The domain's nameservers are Vercel's (`ns1/ns2.vercel-dns.com`), but under
the **AfroCoils** Vercel account, not the PrimeHive one this machine's
`vercel` CLI is logged into — don't switch that login. Either add the
records in the Vercel dashboard (Domains → afrocoils.app → DNS Records), or
run the CLI with the AfroCoils account's token per command:
`vercel dns add afrocoils.app <name> <type> <value> --token $AFROCOILS_VERCEL_TOKEN`.

| Name | Type | Value | Why |
|---|---|---|---|
| `resend._domainkey` | TXT | *(the DKIM key Resend shows)* | Signs outgoing mail |
| `send` | MX | `feedback-smtp.<region>.amazonses.com`, priority 10 | Bounces for sent mail |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` | Allows Resend to send |
| `@` | MX | *(the receiving host Resend shows)*, priority 10 | Delivers support@ and hello@ to Resend |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:support@afrocoils.app` | Start at `p=none`; move to `quarantine` once reports are clean |

There must be **no other MX on `@`**, or mail to support@ goes wherever the
lowest priority points. Wait for Resend to show every record as verified.

## 3. Paystack (you)

1. Business account verified for live payments (test keys work before
   that, for trying the flow end to end).
2. **Products → Plans → Create plan**, three times, currency NGN, and copy
   each plan code (`PLN_…`):

   | Plan | Paystack interval | Amount | Secret |
   |---|---|---|---|
   | Monthly | Monthly | ₦1,500 | `PAYSTACK_PLAN_MONTHLY` |
   | 6 Months | Biannually | ₦7,500 | `PAYSTACK_PLAN_BIANNUAL` |
   | Annual | Annually | ₦12,000 | `PAYSTACK_PLAN_ANNUAL` |

   The app and the join screen read every price from these plans, and work
   out "₦1,250 a month · Save ₦1,500" from them — change a price here, not
   in code. A plan whose secret is unset is not offered. `PAYSTACK_PLAN_CODE`
   (the single plan before 2026-11-11) still counts as Monthly if
   `PAYSTACK_PLAN_MONTHLY` is unset.

   The free trial (three days, no card) is ours, not Paystack's: don't set
   an invoice limit or a trial on these plans.
3. **Settings → API Keys & Webhooks**: copy the **secret key**, and set the
   webhook URL to
   `https://runhkccoeyxfgsfrzezn.supabase.co/functions/v1/billing/webhook`.
4. Settings → Preferences: make sure subscription emails to customers are on
   (Paystack's own receipts and renewal notices).

## 4. Secrets and deploy

From PowerShell, with the AfroCoils token (see the memory note on the
shared Supabase login):

```powershell
$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable("AFROCOILS_SUPABASE_TOKEN","User")
npx supabase secrets set --project-ref runhkccoeyxfgsfrzezn `
  AUTH_SECRET=<64 random characters> `
  RESEND_API_KEY=<re_…> `
  RESEND_WEBHOOK_SECRET=<whsec_…> `
  PAYSTACK_SECRET_KEY=<sk_live_… or sk_test_…> `
  PAYSTACK_PLAN_MONTHLY=<PLN_…> `
  PAYSTACK_PLAN_BIANNUAL=<PLN_…> `
  PAYSTACK_PLAN_ANNUAL=<PLN_…> `
  CRON_SECRET=<48 random characters> `
  PAYSTACK_CALLBACK_URL=https://afrocoils.app/joined.html `
  ADMIN_EMAILS=<your email>,<anyone else>
npm run db:push          # 0005: members, login_codes, payments, support_messages
                         # 0006: plans, trials, pending checkouts, the daily reminder job
npm run backend:deploy   # all six functions, JWT verification off
```

Then put the **same** `CRON_SECRET` into Vault, once, so the daily job can
present it (SQL editor in the Supabase dashboard — not a migration, which
is public):

```sql
select vault.create_secret('<the CRON_SECRET value>', 'cron_secret');
```

Check the job with `select * from cron.job_run_details order by start_time desc limit 5;`
and the function's logs ("reminders: N sent of M checked").

Generate `AUTH_SECRET` (and `CRON_SECRET`) with
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
Changing it signs every phone out (their next status check answers 401);
keep it stable. None of these values belongs in an `.env` file, the repo or
anything `VITE_`-prefixed.

## 5. admin.afrocoils.app (you, once)

1. In the AfroCoils Vercel account: **Add New → Project**, import the same
   GitHub repo, set **Root Directory** to `admin`. `admin/vercel.json`
   supplies the install, build and output settings and the headers.
2. Add the domain `admin.afrocoils.app` to that project; Vercel's DNS adds
   the record itself.
3. Sign in at admin.afrocoils.app with an address in `ADMIN_EMAILS`. The
   code comes by email; the session lasts twelve hours, and taking an
   address off `ADMIN_EMAILS` ends its session on its next request.

## 6. Shipping it to phones

The lock, the join screen and the membership card are web code, so they
ship as a pushed update — but **only after steps 1–4 work**, because the
update locks every phone that installs it:

```powershell
npm run ota:publish -- --dry-run      # builds and zips, uploads nothing
node scripts/ota-publish.mjs --note "Membership: sign in with your email"
```

Then publish the landing page (Vercel builds `site/` on push) so its copy
and `joined.html` match.

## Testing before going live

- With Paystack **test** keys and three test plans, the whole loop runs:
  sign in, start the trial (the app opens), choose a plan, pay with
  Paystack's test card, come back — My Hair Profile shows the plan.
- Payment is believed from the webhook *or* from `transaction/verify` on
  the checkout's reference, whichever comes first; turning the webhook off
  in test mode and tapping "I've paid — check again" proves the second.
- Reminders: `curl -X POST -H "x-cron-secret: <value>" https://runhkccoeyxfgsfrzezn.supabase.co/functions/v1/billing/reminders`
  runs one pass by hand and answers `{ checked, sent }`. Each email goes
  once (`members.last_notice`).
- In the admin, **Members → Grant** gives any email a month without paying
  (shown as "Membership given by AfroCoils", not a plan);
  that is also the way to let a reviewer or a tester in.
- `auth/status` self-heals: if a webhook was missed, the next status check
  asks Paystack for the subscription before answering.
