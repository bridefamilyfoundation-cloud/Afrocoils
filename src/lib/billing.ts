import type { PlusEntitlement } from './types'

/**
 * Buying and restoring AfroCoils Plus.
 *
 * **This is a stand-in.** There is no payment provider yet, so a
 * "purchase" here succeeds after a short pause and takes no money, and
 * the unlock sheet says so in a banner while `BILLING_MODE` is 'test'.
 * It exists so the whole flow — lock, preview, sheet, unlock, restore —
 * can be clicked through on a phone before billing is chosen.
 *
 * When real billing arrives, only this file changes: the screens call
 * `purchasePlus()` and `restorePlus()` and nothing else. The real
 * versions will hand the store's purchase token to the server, which
 * verifies it with the store and only then releases the paid content.
 * The device's own `profile.plus` is a cache of that answer, never the
 * authority, because anything stored on a phone can be edited.
 */

export const BILLING_MODE: 'test' | 'live' = 'test'

/** Thrown when the user backs out of the store's payment screen. */
export class PurchaseCancelled extends Error {
  constructor() {
    super('Purchase cancelled')
  }
}

/**
 * The price as the store will show it, in the user's currency. The store
 * owns this, so it is fetched rather than written into the app; the test
 * stand-in has none, and the sheet says "one payment" instead.
 */
export async function plusPrice(): Promise<string | null> {
  return null
}

export async function purchasePlus(): Promise<PlusEntitlement> {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return { via: 'test', unlockedISO: new Date().toISOString() }
}

/**
 * Finds an earlier purchase — a new phone, a reinstall. Resolves null
 * when there is none, which the stand-in always does: a test unlock
 * lives only in this phone's profile.
 */
export async function restorePlus(): Promise<PlusEntitlement | null> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return null
}
