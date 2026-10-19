import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { CareEventType, CareSchedule } from './types'
import { CARE_EVENT_TYPES } from './types'
import type { DueStatus } from './calendar'
import { parseKey, todayKey } from './calendar'

/**
 * Device reminders for the care calendar.
 *
 * Scheduling model: only the *next* occurrence of each enabled reminder
 * is ever scheduled, and the whole set is rebuilt every time the app
 * opens. Scheduling a repeating alarm instead would drift out of sync
 * the moment the user does something early or late — the due date is
 * derived from what they actually logged, so the alarm has to be
 * re-derived alongside it.
 *
 * Rebuilding on launch also covers the reboot case. Android's alarm
 * manager drops pending alarms on reboot unless a boot receiver
 * re-registers them; the plugin ships one, but an app that has been
 * force-stopped will not have run it, so a rebuild on next open is the
 * backstop that makes the feature honest.
 *
 * Everything here no-ops on web, where the plugin is unavailable and
 * `npm run dev` would otherwise throw on every launch.
 */

function available(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications')
}

/**
 * Stable numeric id per event type.
 *
 * The plugin requires a 32-bit int, and it must be derivable rather than
 * random: cancelling a reminder means knowing the id it was scheduled
 * under, across app restarts, with nothing persisted to look it up in.
 * The index into CARE_EVENT_TYPES gives that for free — so append to
 * that array, never reorder it.
 */
const ID_BASE = 4200

function idFor(type: CareEventType): number {
  const index = CARE_EVENT_TYPES.indexOf(type)
  return ID_BASE + (index >= 0 ? index : CARE_EVENT_TYPES.length)
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable'

export async function checkPermission(): Promise<PermissionState> {
  if (!available()) return 'unavailable'
  try {
    const { display } = await LocalNotifications.checkPermissions()
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'unavailable'
  }
}

/**
 * Ask for notification permission.
 *
 * Android 13+ requires a runtime grant. Called only when the user turns
 * a reminder on — asking at launch, before the user has any idea what
 * would be notified, is how apps get permission permanently denied.
 */
export async function requestPermission(): Promise<PermissionState> {
  if (!available()) return 'unavailable'
  try {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'unavailable'
  }
}

/** What a due reminder says. Short — it lands on a lock screen. */
function bodyFor(type: CareEventType, overdue: boolean): string {
  if (overdue) return `${type} is overdue. Open AfroCoils to log it or push it back.`
  switch (type) {
    case 'Wash day':
      return 'Wash day today. Set out your leave-in and give yourself the time.'
    case 'Retwist':
      return 'Root maintenance is due. Do not go tighter than comfortable.'
    case 'Deep condition':
      return 'Deep conditioning day — heat or a cap for 20 minutes.'
    case 'Length check':
      return 'Time for a length check. Same sections, stretched the same way.'
    default:
      return `${type} is due today.`
  }
}

/** The Date a reminder should fire, or null when it is already past. */
function fireAt(dueKey: string, reminderTime: string): Date | null {
  const [hours, minutes] = reminderTime.split(':').map(Number)
  const at = parseKey(dueKey)
  at.setHours(hours || 9, minutes || 0, 0, 0)
  // A due date in the past still deserves a nudge, but not at a moment
  // that has already gone — bring it to the next occurrence of that time.
  if (at.getTime() <= Date.now()) {
    const today = parseKey(todayKey())
    today.setHours(hours || 9, minutes || 0, 0, 0)
    if (today.getTime() > Date.now()) return today
    today.setDate(today.getDate() + 1)
    return today
  }
  return at
}

/**
 * Rebuild every scheduled reminder from the current due dates.
 *
 * Cancels the full set first rather than diffing: the set is at most a
 * handful of notifications, and a diff that gets it wrong leaves a
 * reminder firing for a schedule the user switched off.
 *
 * Returns the number scheduled, or -1 where notifications are
 * unavailable, so the caller can tell "none due" from "cannot".
 */
export async function syncReminders(statuses: DueStatus[]): Promise<number> {
  if (!available()) return -1
  if ((await checkPermission()) !== 'granted') return -1

  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      })
    }
  } catch {
    // Nothing pending, or the query failed. Scheduling below is still
    // worth attempting — a duplicate reminder beats a silent one.
  }

  const today = todayKey()
  const notifications = statuses
    .filter((status) => status.schedule.reminder && status.dueKey)
    .map((status) => {
      const at = fireAt(status.dueKey!, status.schedule.reminderTime)
      if (!at) return null
      return {
        id: idFor(status.schedule.type),
        title: status.schedule.type,
        body: bodyFor(status.schedule.type, status.dueKey! < today),
        // `allowWhileIdle` asks for delivery through Doze. The plugin
        // downgrades to an inexact alarm when the exact-alarm permission
        // is absent — which it is here by design, see AndroidManifest.xml
        // — so this reminder arrives within a window of the chosen time
        // rather than on the minute. Right trade for a wash-day nudge.
        schedule: { at, allowWhileIdle: true },
        // No `smallIcon`: there is no monochrome status-bar drawable in
        // this project yet, and naming one that does not exist renders a
        // blank notification icon. The plugin falls back to the app icon.
      }
    })
    .filter((n): n is NonNullable<typeof n> => n !== null)

  if (notifications.length === 0) return 0

  try {
    await LocalNotifications.schedule({ notifications })
    return notifications.length
  } catch (error) {
    console.error('[notifications] could not schedule', error)
    return -1
  }
}

/** Drop every scheduled reminder — used when the user turns them all off. */
export async function cancelAll(): Promise<void> {
  if (!available()) return
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length === 0) return
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    })
  } catch {
    // Nothing pending.
  }
}

/** True when any schedule wants a reminder — cheap guard before syncing. */
export function anyReminders(schedules: CareSchedule[]): boolean {
  return schedules.some((s) => s.enabled && s.reminder)
}

export function notificationsAvailable(): boolean {
  return available()
}
