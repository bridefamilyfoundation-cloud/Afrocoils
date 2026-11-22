import { Link, useLocation } from 'react-router-dom'
import Icon from '../components/Icon'
import SectionCrumb from '../components/SectionCrumb'
import { useHairProfile } from '../lib/profile-store'

/** What the submit screen hands over when it sends someone here. */
export interface ThankYouState {
  /** The style just contributed, so the page can name it back. */
  name?: string
  /** Its submission id, so the page can say whether it has been sent yet. */
  id?: string
  /** Contributed from the loc lookbook, which is where the ways out should lead. */
  lookbook?: boolean
}

/**
 * Thank you, at `/styles/submit/thanks`.
 *
 * Contributing is the one thing in this app a person does *for* the app
 * rather than for themselves — ten minutes of writing up a method and
 * photographing four angles, for a library other people read. An inline
 * green tick under the form acknowledged that in the same visual weight
 * as a validation message. This is a page.
 *
 * It is also where the honest part goes. Nothing is published
 * automatically: the submission is queued on the device and waits for a
 * person to read it, because it carries a rights claim about the
 * photographs. Saying that here, once the work is done, is the right
 * moment — before they typed a word it reads as a hurdle, and never
 * saying it at all would be the app implying their style is already on
 * the shelf.
 */
export default function ThankYouScreen() {
  const { state } = useLocation()
  const handed = state as ThankYouState | null
  const name = handed?.name
  const lookbook = handed?.lookbook === true
  const { profile } = useHairProfile()
  // Read live: the send started when submit was tapped and may land
  // while this page is showing.
  const sent = profile.submissions.find((s) => s.id === handed?.id)?.status === 'Sent'

  return (
    <>
      {lookbook ? (
        <SectionCrumb to="/locs/styles" label="Locs World" />
      ) : (
        <SectionCrumb to="/styles/submit" label="Share a style" />
      )}

      <section className="mb-2xl rounded-2xl bg-secondary-container p-xl text-center text-on-secondary-container">
        <Icon name="check_circle" className="mb-md text-4xl" />
        <h2 className="mb-sm font-headline-lg text-headline-lg">Thank you</h2>
        <p className="mx-auto max-w-md font-body-md text-body-md opacity-90">
          {name ? (
            <>
              <strong>{name}</strong> {sent ? 'has been sent for review.' : 'is saved on this phone and on its way.'}
            </>
          ) : sent ? (
            'Your style has been sent for review.'
          ) : (
            'Your style is saved on this phone and on its way.'
          )}{' '}
          The library is contributed content and nothing else, so every entry in it —
          including this one — exists because somebody did what you just did.
        </p>
      </section>

      <section className="mb-2xl space-y-md">
        <div className="rounded-xl shadow-card bg-surface-container-lowest p-lg">
          <h3 className="mb-xs font-headline-md text-body-lg text-on-surface">
            What happens next
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {sent
              ? 'It has reached us.'
              : 'It is being sent now. If there is no signal it stays queued on this phone, so a bad connection cannot cost you the write-up: open Share a style and tap “Send to the library” on it when you are back online.'}{' '}
            A person reads it before anything is published, because you have claimed the
            photographs are yours to give and that claim deserves a human on the other end.
          </p>
        </div>

        <div className="rounded-xl shadow-card bg-surface-container-lowest p-lg">
          <h3 className="mb-xs font-headline-md text-body-lg text-on-surface">
            You can change your mind
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Until it has been sent, withdraw it from the bottom of the Share a style screen;
            that deletes its photographs from this phone as well as the entry. Once it has
            been sent, write to support@afrocoils.app with the style&rsquo;s name and we will
            take it out of the review queue.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-md">
        <Link
          to={lookbook ? '/locs/styles' : '/styles'}
          className="rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
        >
          {lookbook ? 'Back to the lookbook' : 'Back to the library'}
        </Link>
        <Link
          to={lookbook ? '/styles/submit?hair=Locs' : '/styles/submit'}
          className="rounded-full border border-outline-variant px-xl py-3 font-label-md text-label-md text-on-surface transition-all active:scale-95"
        >
          Share another
        </Link>
      </div>
    </>
  )
}
