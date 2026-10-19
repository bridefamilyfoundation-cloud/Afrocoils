import { Link, useLocation } from 'react-router-dom'
import Icon from '../components/Icon'
import SectionCrumb from '../components/SectionCrumb'

/** What the submit screen hands over when it sends someone here. */
export interface ThankYouState {
  /** The style just contributed, so the page can name it back. */
  name?: string
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
  const name = (state as ThankYouState | null)?.name

  return (
    <>
      <SectionCrumb to="/styles/submit" label="Share a style" />

      <section className="mb-2xl rounded-2xl bg-secondary-container p-xl text-center text-on-secondary-container">
        <Icon name="check_circle" className="mb-md text-4xl" />
        <h2 className="mb-sm font-headline-lg text-headline-lg">Thank you</h2>
        <p className="mx-auto max-w-md font-body-md text-body-md opacity-90">
          {name ? (
            <>
              <strong>{name}</strong> is queued on this device.
            </>
          ) : (
            'Your style is queued on this device.'
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
            It sends the next time there is somewhere to send it, and stays queued until
            then — a bad connection cannot cost you the write-up. After that a person reads
            it before anything is published, because you have claimed the photographs are
            yours to give and that claim deserves a human on the other end.
          </p>
        </div>

        <div className="rounded-xl shadow-card bg-surface-container-lowest p-lg">
          <h3 className="mb-xs font-headline-md text-body-lg text-on-surface">
            You can change your mind
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Withdraw it from the bottom of the Share a style screen at any point. Withdrawing
            deletes its photographs from this device as well as the entry.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-md">
        <Link
          to="/styles"
          className="rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
        >
          Back to the library
        </Link>
        <Link
          to="/styles/submit"
          className="rounded-full border border-outline-variant px-xl py-3 font-label-md text-label-md text-on-surface transition-all active:scale-95"
        >
          Share another
        </Link>
      </div>
    </>
  )
}
