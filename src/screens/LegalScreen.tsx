import { Link, Navigate, useParams } from 'react-router-dom'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'

/**
 * The footer documents.
 *
 * Privacy is written out in full, because it can be: the app's data
 * behaviour is now small enough to describe exactly — one document on
 * the device, one optional upload, Ask questions shared anonymously
 * (on by default, switched off on About), one version check that
 * carries nothing, no accounts. A policy
 * is only worth writing when it can be checked against the code, and
 * every claim below has a file behind it.
 *
 * Terms and Contact are still deliberately empty. They need decisions
 * nobody has made (a legal entity, a jurisdiction, a support address)
 * and inventing plausible clauses would be worse than an empty page,
 * because drafted text looks finished and tends to ship.
 *
 * **If anything about data collection changes, this page changes first.**
 * Adding an analytics SDK, a crash reporter or an account system would
 * each make several statements here false, and this is the page users
 * and app stores are entitled to rely on.
 */

/** What the owner still has to supply before this is a publishable policy. */
const OUTSTANDING = [
  'The legal entity that operates AfroCoils, and its registered address',
  'A contact address for privacy and data requests',
  'The governing jurisdiction',
  'An effective date, set when it is first published',
]

function PrivacyPolicy() {
  return (
    <>
      <section className="mb-2xl rounded-2xl shadow-card bg-surface-container-lowest p-lg">
        <h2 className="mb-sm font-headline-md text-body-lg text-on-surface">In short</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          AfroCoils has no accounts. Everything you enter about yourself — your hair profile,
          length history, calendar, photographs and saved styles — is stored on your own
          device and is never uploaded. Two things leave your phone: the questions you type
          into Ask, sent anonymously so we can write better answers (you can switch this
          off), and a style you deliberately choose to contribute to the community library.
          Separately, the app asks our update server whether a newer version is out; that
          request carries nothing about you, and you can switch it off too.
        </p>
      </section>

      <Article title="What the app stores, and where">
        <p>
          One document, on this device, under the app&rsquo;s private storage. It holds your
          hair type and traits, your care preferences, your length checks, your care
          calendar, the styles you have saved and the styles you have worn. Photographs you
          add are written as files in the app&rsquo;s own directory — the document stores
          only their filenames.
        </p>
        <p>
          None of it is transmitted anywhere, and none of it is readable by other apps.
          Uninstalling AfroCoils deletes all of it. There is no copy on a server to ask us
          to delete, because there is no server holding one.
        </p>
      </Article>

      <Article title="What leaves the device, and when">
        <p>
          <strong>Questions you type into Ask.</strong> Each question is sent to our server as
          you ask it, together with what Ask answered (for example, which guide it showed)
          and the number of the app update you are running. That is all: no name, nothing
          from your hair profile, no account, no advertising or device identifier. Two
          questions from the same phone cannot be linked to each other or to you. We use
          them only to see what people ask and to write the answers that are missing; we
          never sell them or use them for advertising. They are kept for up to twelve months
          and then deleted. Because they are anonymous, we cannot find or delete one
          particular person&rsquo;s questions, so if you would rather not share, switch it
          off under{' '}
          <Link to="/about" className="text-primary underline">
            About
          </Link>{' '}
          — Ask works exactly the same either way, on your phone, and the line under the
          question box tells you whether sharing is on.
        </p>
        <p>
          <strong>A style you submit</strong> through{' '}
          <Link to="/styles/submit" className="text-primary underline">
            Share a style
          </Link>
          . When you tap submit, the write-up you typed, the photographs you attached, the
          credit name you chose and your confirmation that the images are yours to give are
          sent to our server so a person can review them for the library. Each photograph is
          checked there before it is kept: anything that is not a plain photo is refused, and
          what is kept is rebuilt from the picture alone, without the hidden details a phone
          writes into a photo — where it was taken, the time, the phone model.
        </p>
        <p>
          Nothing else in your profile goes with a submission. Your name, your avatar, your length
          history, your calendar and your saved styles are not part of a submission. A
          submission is stored on your device first and only sent afterwards, so nothing is
          uploaded in the background and a failed send costs you nothing.
        </p>
      </Article>

      <Article title="Checking for a new version">
        <p>
          When the app opens, and when you come back to it after a few hours, it fetches a
          small public file from our update server (hosted with Supabase) that names the
          newest version and the newest update. The request contains nothing from your
          profile, no identifier and no information about how you use the app. Like any
          request to a website, it reveals your connection&rsquo;s IP address to the
          server&rsquo;s host, which we do not use to identify you.
        </p>
        <p>
          If something newer exists, the app tells you. Most updates install in place: when
          you tap Update now, the app downloads the update from the same server, checks it
          against the fingerprint in that file, and restarts into it. A change to the app
          itself comes as a new version to download instead, which your phone asks you to
          confirm. Nothing downloads or installs unless you tap. The update component reports
          nothing back to anyone: no statistics, no crash reports. Turn the check off, or
          run it by hand, under{' '}
          <Link to="/about" className="text-primary underline">
            About
          </Link>
          .
        </p>
      </Article>

      <Article title="What the app does not do">
        <ul className="list-disc space-y-xs pl-5">
          <li>
            No tracking: no analytics SDK, no advertising identifiers, nothing that links what
            you do in the app to you. The Ask questions above are the only usage data, and
            they carry no identifier.
          </li>
          <li>No crash or telemetry reporting.</li>
          <li>No accounts, sign-in, email collection or newsletters.</li>
          <li>No third-party SDKs that observe your use of the app.</li>
          <li>
            No AI features. Nothing you enter is sent to a model, because the app makes no
            model calls at all.
          </li>
        </ul>
      </Article>

      <Article title="Device permissions">
        <p>
          <strong>Camera and photo library</strong> — only when you add a photograph to one
          of your own styles or to a submission. The app never opens the camera on its own.
        </p>
        <p>
          <strong>Notifications</strong> — only if you turn on a reminder in the care
          calendar. Reminders are scheduled by your device; nothing is sent to it from
          outside.
        </p>
      </Article>

      <Article title="Who else is involved">
        <p>
          Our server runs on Supabase. Shared Ask questions, and submissions with their
          photographs, are held there; submissions until a person has reviewed them, questions
          for up to twelve months. Supabase processes that data on our behalf and for no other
          purpose. Like any server it sees your connection&rsquo;s IP address; ours uses it
          only to limit how many requests one address can make, holds it for a few minutes
          for that, and never stores it with a question or a submission. The version check
          goes to the same server and carries nothing of yours. The AfroCoils website is
          hosted on Vercel and sees nothing from the app, except that a new version you choose
          to download comes from the website.
        </p>
      </Article>

      <Article title="Children">
        <p>
          The app is not directed at children under 13 and collects nothing that would
          identify one: Ask questions are anonymous. A submission should be made by the
          person whose hair and photographs it is, or by their parent or guardian.
        </p>
      </Article>

      <Article title="Your choices">
        <p>
          Withdraw a submission at any time from the Share a style screen — withdrawing
          deletes its photographs from your device as well as the entry. Switch Ask question
          sharing and the version check off under About. To remove everything the app holds
          on your phone, uninstall it. To have a reviewed submission removed after the fact,
          use the contact route below.
        </p>
      </Article>

      {/* The honest gap, kept visible rather than papered over with
          invented boilerplate. */}
      <section className="rounded-2xl border border-dashed border-outline-variant bg-surface-container/50 p-lg">
        <div className="mb-sm flex items-center gap-sm">
          <Icon name="info" className="text-primary" />
          <h2 className="font-headline-md text-body-lg text-on-surface">
            Not publishable yet
          </h2>
        </div>
        <p className="mb-md font-body-md text-body-md text-on-surface-variant">
          The description of what the app does with data above is accurate and checked
          against the code. Four things are still missing, and they are decisions rather
          than text:
        </p>
        <ul className="list-disc space-y-xs pl-5">
          {OUTSTANDING.map((item) => (
            <li key={item} className="font-body-md text-body-md text-on-surface">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2xl">
      <h2 className="mb-sm font-headline-md text-headline-md text-primary">{title}</h2>
      <div className="space-y-md font-body-md text-body-md text-on-surface-variant">
        {children}
      </div>
    </section>
  )
}

const SHELLS: Record<string, { title: string; needs: string[] }> = {
  terms: {
    title: 'Terms of Service',
    needs: [
      'Acceptable use and account termination',
      'That hair guidance is informational and not medical advice',
      'Liability limits and warranty disclaimers',
      'Ownership and licensing of contributed photos and write-ups',
    ],
  },
  contact: {
    title: 'Contact Us',
    needs: [
      'Support email or in-app contact form',
      'Expected response time',
      'A separate route for privacy and data requests',
    ],
  },
}

export default function LegalScreen() {
  const { slug } = useParams()

  if (slug === 'privacy') {
    return (
      <>
        <ScreenHeader
          title="Privacy Policy"
          subtitle="What AfroCoils stores, what leaves your phone, and what it never collects."
        />
        <PrivacyPolicy />
      </>
    )
  }

  const doc = slug ? SHELLS[slug] : undefined
  if (!doc) return <Navigate to="/sos" replace />

  return (
    <>
      <ScreenHeader title={doc.title} />

      <section className="mb-2xl rounded-2xl border border-dashed border-outline-variant bg-surface-container/50 p-xl">
        <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
          This document has not been written yet. It is intentionally blank rather than
          filled with placeholder legal text &mdash; drafted clauses look finished and tend
          to ship.
        </p>
        <h2 className="mb-sm font-headline-md text-body-lg font-bold text-on-surface">
          It will need to cover
        </h2>
        <ul className="list-disc space-y-xs pl-5">
          {doc.needs.map((item) => (
            <li key={item} className="font-body-md text-body-md text-on-surface">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center font-body-md text-body-md text-on-surface-variant">
        The{' '}
        <Link to="/legal/privacy" className="text-primary underline">
          privacy policy
        </Link>{' '}
        is written, and the{' '}
        <Link to="/faq" className="text-primary underline">
          FAQ
        </Link>{' '}
        answers most of what people ask.
      </p>
    </>
  )
}
