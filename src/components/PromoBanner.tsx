import Icon from './Icon'
import { longDate } from '../lib/membership'
import { PLANS, PLAN_IDS, type Promo } from '../lib/types'

/**
 * A promotion running on bank-transfer prices, set on the admin site
 * (added 2026-11-27). Shown on `/join` and at the top of the transfer
 * form. It always says the discount is for bank transfer, because card
 * prices are Paystack's and a promotion does not change them: telling
 * someone a price they will not be charged is the one thing it must not
 * do. The amounts themselves come from the server.
 */
export default function PromoBanner({ promo }: { promo: Promo }) {
  const every = PLAN_IDS.every((id) => promo.plans.includes(id))
  const which = every ? 'every plan' : `the ${promo.plans.map((id) => PLANS[id].label).join(' and ')} plan${promo.plans.length > 1 ? 's' : ''}`
  return (
    <div role="note" className="mb-md flex items-start gap-sm rounded-2xl bg-secondary p-md text-on-secondary shadow-card">
      <Icon name="account_balance" className="mt-0.5 shrink-0 text-[22px]" />
      <p className="font-body-md text-body-md font-bold">
        {promo.name}: {promo.percentOff}% off {which} when you pay by bank transfer, until {longDate(promo.endsISO)}.
        <span className="mt-xs block font-body-md text-caption font-bold opacity-90">Card prices stay the same.</span>
      </p>
    </div>
  )
}
