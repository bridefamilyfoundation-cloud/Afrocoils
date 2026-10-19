import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { deriveDue } from './calendar'
import { anyReminders, cancelAll, syncReminders } from './notifications'
import { emptyProfile, ensureSchedules, loadProfile, saveProfile } from './storage'
import type { HairProfile } from './types'
import { identityFieldsFor } from './types'

/**
 * The hair profile, available app-wide.
 *
 * One provider at the root rather than per-screen loading: the profile is
 * read by nearly every screen, and a screen-local read would mean a
 * flash of default values on each navigation.
 *
 * Writes are optimistic — state updates immediately, the disk write
 * follows. Nothing in the app blocks on persistence completing.
 */

interface ProfileContextValue {
  profile: HairProfile
  /** False until the first read from disk resolves. */
  ready: boolean
  /** Merge a partial update into the profile and persist. */
  update: (patch: Partial<HairProfile>) => void
  /** How much of the identity tier is complete, 0–1. Drives onboarding nudges. */
  completeness: number
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function HairProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<HairProfile>(emptyProfile)
  const [ready, setReady] = useState(false)

  // Guards against a write landing before the initial read resolves, which
  // would otherwise persist defaults over a real stored profile.
  const loaded = useRef(false)

  useEffect(() => {
    let cancelled = false
    void loadProfile().then((stored) => {
      if (cancelled) return
      setProfile(stored)
      loaded.current = true
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const update = useCallback((patch: Partial<HairProfile>) => {
    setProfile((prev) => {
      const next: HairProfile = {
        ...prev,
        ...patch,
        updatedISO: new Date().toISOString(),
      }
      if (loaded.current) void saveProfile(next)
      return next
    })
  }, [])

  /**
   * Seed the care schedules once the hair type is known.
   *
   * Separate from the load effect because it also has to run when the
   * user changes hair type later — a loc wearer who switches to loose
   * should stop being asked about retwists. `ensureSchedules` returns
   * null when nothing needs changing, which is what stops this from
   * writing on every render.
   */
  useEffect(() => {
    if (!ready) return
    const schedules = ensureSchedules(profile)
    if (schedules) update({ schedules })
  }, [ready, profile, update])

  /**
   * Rebuild device reminders whenever the schedule or the history moves.
   *
   * Logging a wash changes when the next one is due, so the pending
   * notification has to be re-derived rather than left where it was.
   * Both branches no-op off-device and when permission was never
   * granted, so this is free in the browser.
   *
   * The empty case is a `cancelAll`, not an early return. Switching off
   * the last reminder is exactly when there is something registered with
   * the alarm manager and no longer any schedule that would re-derive
   * it — returning here left that notification to fire days after the
   * user had turned reminders off, with nothing in the app able to stop
   * it.
   */
  useEffect(() => {
    if (!ready) return
    if (anyReminders(profile.schedules)) {
      void syncReminders(deriveDue(profile.schedules, profile.careEvents))
    } else {
      void cancelAll()
    }
  }, [ready, profile.schedules, profile.careEvents])

  const value = useMemo<ProfileContextValue>(() => {
    // Which questions count depends on the answer to the first one: a loc
    // wearer is never asked to fill in fields that do not apply to them,
    // so their meter must not be permanently stuck below 100%.
    const fields = identityFieldsFor(profile.identity.hairType)
    const filled = fields.filter((f) => profile.identity[f] !== undefined).length

    // Hair type is itself one of the answers, and the one everything else
    // hangs off — an unanswered profile reads as 0%, not as "a fifth done".
    const total = fields.length + 1
    const answered = filled + (profile.identity.hairType ? 1 : 0)

    return {
      profile,
      ready,
      update,
      completeness: answered / total,
    }
  }, [profile, ready, update])

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useHairProfile(): ProfileContextValue {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useHairProfile must be used inside <HairProfileProvider>')
  }
  return context
}
