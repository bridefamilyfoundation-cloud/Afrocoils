import { Link, Navigate, useParams } from 'react-router-dom'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'

/**
 * The footer documents.
 *
 * Privacy is written out in full, because it can be: the app's data
 * behaviour is small enough to describe exactly — one document on the
 * device, a membership by email (decided 2026-11-05: every feature is
 * for paying members), payment on Paystack's page, one optional upload,
 * Ask questions shared anonymously (on by default, switched off on
 * About), one version check that carries nothing. A policy is only worth
 * writing when it can be checked against the code, and every claim
 * below has a file behind it.
 *
 * Terms carry what the code decides — what membership is, how it renews
 * and ends — and list what is still a decision (the legal entity, the
 * jurisdiction, the refund policy) rather than inventing it: drafted
 * clauses look finished and tend to ship. Contact is written: the
 * support address exists.
 *
 * **If anything about data collection changes, this page changes first.**
 * Adding an analytics SDK, a crash reporter or an account system would
 * each make several statements here false, and this is the page users
 * and app stores are entitled to rely on.
 */

/** What the owner still has to supply before this is a publishable policy. */
const OUTSTANDING = [
  'The legal entity that operates AfroCoils, and its registered address',
  'The governing jurisdiction',
  'How long a lapsed member’s email and payment records are kept',
  'An effective date, set when it is first published',
]

function PrivacyPolicy() {
  return (
    <>
      <section className="mb-2xl rounded-2xl shadow-card bg-surface-container-lowest p-lg">
        <h2 className="mb-sm font-headline-md text-body-lg text-on-surface">In short</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          AfroCoils is for members, and your membership is your email address. We hold that
          email, whether and until when it is paid up, and the record of your payments; the
          card itself is handled by Paystack and never reaches us. Everything you enter about
          your hair — your profile, length history, calendar, photographs and saved styles —
          stays on your own device and is never uploaded, and none of it is linked to your
          email. Besides signing in and paying, two things leave your phone: the questions you
          type into Ask, sent anonymously so we can write better answers (you can switch this
          off), and a style you deliberately choose to contribute to the community library.
          The app also asks our update server whether a newer version is out; that request
          carries nothing about you, and you can switch it off too.
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
          to delete, because there is no server holding one. The same document also keeps
          your membership — your email, a sign-in token, your plan and the dates it and any
          free trial start and end — so the app opens without signal.
        </p>
      </Article>

      <Article title="Your membership">
        <p>
          <strong>Signing in.</strong> You type your email into the app and we send a
          six-digit code to it, from no-reply@afrocoils.app, through our email provider,
          Resend. Entering the code proves the address is yours. We keep the code only as a
          scrambled fingerprint, for ten minutes, and the address itself in our members list.
        </p>
        <p>
          <strong>The free trial.</strong> A new member can try every section free for three
          days, with no card. We note that your address has had its trial, and when it ends,
          so each person has one; for that we also keep the address with any
          &ldquo;+&rdquo; part removed (and, for Gmail, its dots), because those reach the
          same inbox.
        </p>
        <p>
          <strong>Paying.</strong> Membership is a subscription on one of three plans —
          Monthly, 6 Months or Annual — paid by card on Paystack&rsquo;s own page, which opens
          in your browser. Paystack holds your card details; we never see them. Paystack tells
          us your email, the plan, the amount, the date and its own reference numbers for the
          payment and the subscription, and whether a payment was later refunded or disputed,
          and we keep those so we know you are paid up and can help if something goes wrong. When you start a payment we keep its reference
          number, so our server can ask Paystack whether it went through.
        </p>
        <p>
          <strong>Reminder emails.</strong> We email you, from no-reply@afrocoils.app, the day
          before your free trial ends, three days before a plan renews or ends, and once when
          your access has ended. We keep a note of the last reminder sent so nobody gets one
          twice. These are about your membership and nothing else.
        </p>
        <p>
          <strong>Staying signed in.</strong> While you are signed in, the app asks our server
          when it opens and at most twice a day whether your membership is still paid up. That
          request carries your sign-in token and nothing else: not your hair profile, not your
          Ask questions. We note when we last heard from your email, and nothing about what
          you did in the app.
        </p>
        <p>
          We use your email only to sign you in, to run your membership (the reminders above
          included) and to answer you when you write to us. No newsletters, no marketing, and we never sell or share it except
          with Paystack and Resend, to do exactly those jobs. To have it removed, cancel your
          membership and write to{' '}
          <a href="mailto:support@afrocoils.app" className="text-primary underline">
            support@afrocoils.app
          </a>
          ; we keep the payment records the law requires us to keep.
        </p>
      </Article>

      <Article title="What leaves the device, and when">
        <p>
          <strong>Questions you type into Ask.</strong> Each question is sent to our server as
          you ask it, together with what Ask answered (for example, which guide it showed)
          and the number of the app update you are running. That is all: no name, nothing
          from your hair profile, not your email or membership, no advertising or device
          identifier. Two
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
          <li>
            No newsletters or marketing email. Your email is for signing in, your membership
            and replies to you, and nothing about your hair is stored with it.
          </li>
          <li>
            No third-party SDKs that observe your use of the app. Paying happens on
            Paystack&rsquo;s page in your browser, not inside the app.
          </li>
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
        <p>
          <strong>Paystack</strong> takes your card payment and runs the subscription, under its
          own privacy policy. <strong>Resend</strong> sends the sign-in codes, the reminder
          emails and our replies, and receives mail you send to any @afrocoils.app address (support@, hello@ or another); we keep that
          correspondence as text so we can answer it.
        </p>
      </Article>

      <Article title="Children">
        <p>
          The app is not directed at children under 13, and membership is for adults who can
          pay by card. Ask questions are anonymous. A submission should be made by the
          person whose hair and photographs it is, or by their parent or guardian.
        </p>
      </Article>

      <Article title="Your choices">
        <p>
          Withdraw a submission at any time from the Share a style screen — withdrawing
          deletes its photographs from your device as well as the entry. Switch Ask question
          sharing and the version check off under About. To remove everything the app holds
          on your phone, uninstall it. Cancel your membership from My Hair Profile, and sign
          the phone out there too. To have your email removed, or a reviewed submission
          removed after the fact, write to support@afrocoils.app.
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

/** What the Terms still need, as decisions rather than drafted clauses. */
const TERMS_OUTSTANDING = [
  'The legal entity that runs AfroCoils, its registered address and the governing law',
  'The refund policy for a period already paid for, including a 6-month or annual plan cancelled early',
  'Liability limits and warranty disclaimers',
  'Ownership and licensing of contributed photos and write-ups',
  'An effective date, set when it is first published',
]

function Terms() {
  return (
    <>
      <Article title="Membership">
        <p>
          Every feature of AfroCoils is for members. A membership belongs to one email
          address, confirmed with a code we send to it, and is paid as a subscription by
          card through Paystack on one of three plans — Monthly, 6 Months or Annual — at the
          price shown for each before you pay. The longer plans cost less per month.
        </p>
        <p>
          <strong>Free trial.</strong> A new member can use every section free for three
          days, once per person, without a card. When the trial ends the app locks until you
          choose a plan; nothing is charged unless you choose one. Choosing a plan during the
          trial starts the plan that day.
        </p>
        <p>
          A plan renews at the end of each period — every month, every six months or every
          year, from the date you paid — at the plan&rsquo;s price, until you cancel. We email
          you three days before it renews. Cancel any time from My Hair Profile (Manage or
          cancel opens Paystack&rsquo;s page for your subscription). Cancelling stops the next
          charge; the app stays open to the end of the period you have already paid for. To
          change plan, cancel the current one and choose the new one; it starts the day you
          pay for it.
        </p>
        <p>
          If a renewal fails, Paystack tries the card again, and the app stays open for three
          days past the end of the paid period while it does. After that it locks until the
          membership is paid again. Your hair profile, history and photographs stay on your
          phone throughout, and open again when you do.
        </p>
        <p>
          One membership is for one person. You can sign in with it on a new phone; sharing
          the address so others can sign in is not allowed, and we can end a membership that
          is being shared.
        </p>
      </Article>

      <Article title="What the app is, and is not">
        <p>
          AfroCoils is written guidance about Type 4 hair and locs. It is information, not
          medical advice, and it does not diagnose. Where a guide says to see a dermatologist
          or a professional loctician, do.
        </p>
      </Article>

      <section className="mb-2xl rounded-2xl border border-dashed border-outline-variant bg-surface-container/50 p-lg">
        <div className="mb-sm flex items-center gap-sm">
          <Icon name="info" className="text-primary" />
          <h2 className="font-headline-md text-body-lg text-on-surface">Not finished yet</h2>
        </div>
        <p className="mb-md font-body-md text-body-md text-on-surface-variant">
          What is written above is how membership works in the app today. These are still
          decisions rather than text, and are left blank rather than filled with placeholder
          legal wording:
        </p>
        <ul className="list-disc space-y-xs pl-5">
          {TERMS_OUTSTANDING.map((item) => (
            <li key={item} className="font-body-md text-body-md text-on-surface">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Contact() {
  return (
    <>
      <Article title="Write to us">
        <p>
          <strong>Support</strong> — signing in, payments, your membership, something not
          working:{' '}
          <a href="mailto:support@afrocoils.app" className="text-primary underline">
            support@afrocoils.app
          </a>
          . Write from the email your membership is on if it is about the membership.
        </p>
        <p>
          <strong>Everything else</strong> — a question about the guides, a style you want to
          share, working with us:{' '}
          <a href="mailto:hello@afrocoils.app" className="text-primary underline">
            hello@afrocoils.app
          </a>
          .
        </p>
        <p>
          A person reads every message. Privacy and data requests (having your email removed,
          or a submission taken down) go to support@ too.
        </p>
      </Article>
    </>
  )
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

  if (slug === 'terms') {
    return (
      <>
        <ScreenHeader title="Terms of Service" subtitle="How membership works, and what the app is for." />
        <Terms />
      </>
    )
  }

  if (slug === 'contact') {
    return (
      <>
        <ScreenHeader title="Contact Us" subtitle="Two addresses, both read by a person." />
        <Contact />
      </>
    )
  }

  return <Navigate to="/sos" replace />
}
