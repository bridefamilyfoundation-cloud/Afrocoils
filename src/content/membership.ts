import type { IconName } from '../components/Icon'

/**
 * What membership opens, as the locked front page and the join screen
 * both describe it: the six sections, in drawer order. A description,
 * not a door — nothing here links anywhere while the app is locked.
 * Change a section and this changes with it, like the tour and /docs.
 */
export const MEMBER_SECTIONS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'emergency_home', title: 'Hair SOS', body: 'The front page: quick styles by the time you have, and the way into Hair Care.' },
  { icon: 'auto_awesome', title: 'Hair Styles', body: 'The style library with step-by-step methods, and picks for your hair.' },
  { icon: 'spa', title: 'Hair Care', body: 'The AfroCoils Hair Guide and its lessons, porosity, a care calendar with reminders, the product shelf, and help when something is wrong.' },
  { icon: 'show_chart', title: 'Hair Growth', body: 'Length checks, how much you are keeping, and when you reach each milestone.' },
  { icon: 'waves', title: 'Locs World', body: 'Every chapter on starting and caring for locs, and the loc lookbook.' },
  { icon: 'face_3', title: 'My Hair Profile', body: 'Hair Discovery, and everything above fitted to your hair.' },
]
