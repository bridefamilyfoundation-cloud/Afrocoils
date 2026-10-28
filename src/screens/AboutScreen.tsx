import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { version } from '../../package.json'
import Icon from '../components/Icon'
import { PlusStatus } from '../components/Plus'
import ScreenHeader from '../components/ScreenHeader'
import { useHairProfile } from '../lib/profile-store'
import {
  checkForUpdates,
  formatBytes,
  installedVersion,
  installPushedUpdate,
  RUNNING_BUNDLE,
  updatesConfigured,
  useUpdateStatus,
  type InstalledVersion,
} from '../lib/updates'
import { isNative } from '../native/shell'

/**
 * About, plus the community tips that used to have their own screen.
 *
 * The tips were never a feed — they are four pieces of received wisdom
 * with no author and no way to add a fifth, which makes them editorial
 * content about the app's point of view rather than a section of it.
 * They sit here, under the page that explains what the app believes.
 *
 * DRAFT COPY. Everything in ABOUT below is written to be replaced —
 * it says what the app currently does, which is the part that has to be
 * true, but the voice and emphasis are a first pass.
 */

/* Read from package.json, which is also where the Android versionName
   comes from — a literal here said 0.1.0 for the whole of 0.2.0. */
const VERSION = version

const ABOUT: { heading: string; body: string }[] = [
  {
    heading: 'What this is',
    body: 'A hair app for type 4 hair, loose or locked. It opens into Hair SOS rather than a home page, because people reach for it mid-problem far more often than they browse it — hair that will not cooperate, twenty minutes, somewhere to be.',
  },
  {
    heading: 'Who it is for',
    body: 'Coils, curls and locs. Locs are treated as their own thing throughout, not as a style worn on loose hair: half the technique that is correct for loose hair will damage a loc, so the two never share a recommendation. Tell the app which you have and it stops showing you the other.',
  },
  {
    heading: 'Your data stays on your device',
    body: 'Your hair profile, your length checks, your calendar and your photos are stored on this phone and nowhere else. There is no account, no sign-in and no server holding your history. Uninstalling the app deletes all of it. The one routine request the app makes is asking our website whether a newer version is out, and that carries nothing about you — see Updates below.',
  },
  {
    heading: 'Nothing you read is generated',
    body: 'Every guide, every style and every step in this app was written by a person, and all of it ships inside the app. The style pictures are the one exception: they are illustrations made with an image generator before release, one sitter shown front, back and side so that only the hair changes. There is no chatbot and no AI feature: what you are shown is content the app already has, filtered and ranked against the profile you filled in. Ask, the button at the bottom right, works the same way: it finds the answer people have written for your question and shows it word for word, with the lines written for your kind of hair, on your phone. It works with the phone in aeroplane mode, which is usually where a hair emergency happens.',
  },
  {
    heading: 'It is not a stylist, and not a doctor',
    body: 'Everything here is general guidance about hair. It cannot see your hair, and it does not know your medical history. Sudden shedding, bald patches, persistent scalp pain or anything that is getting worse is a question for a dermatologist or a trichologist, not an app.',
  },
]

const TIPS = [
  {
    title: 'Detangle on wash day, with conditioner in',
    body: 'Mid-week dry detangling is where most breakage happens. Moving it to wash day removes the problem rather than managing it.',
    tag: 'Breakage',
  },
  {
    title: 'Satin, every night, no exceptions',
    body: 'Cotton wicks moisture straight out of the hair. A bonnet or a satin pillowcase is the cheapest retention win available.',
    tag: 'Retention',
  },
  {
    title: 'Water is the moisturiser',
    body: 'Oils and butters seal; they do not hydrate. If hair feels dry, start with water, not more product.',
    tag: 'Moisture',
  },
  {
    title: 'Protein and moisture are a balance, not a ladder',
    body: 'Dry and snapping usually means protein. Mushy and over-elastic means too much protein. Both feel like "damage".',
    tag: 'Balance',
  },
]

export default function AboutScreen() {
  return (
    <>
      <ScreenHeader title="About" subtitle="What AfroCoils is, and what it does with your data." />

      <section className="mb-2xl space-y-lg">
        {ABOUT.map((item) => (
          <article key={item.heading}>
            <h2 className="mb-xs font-headline-md text-body-lg text-on-surface">
              {item.heading}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mb-2xl">
        <h2 className="mb-md font-headline-md text-body-lg font-bold text-on-surface">
          Things worth knowing
        </h2>
        <div className="space-y-md">
          {TIPS.map((tip) => (
            <article
              key={tip.title}
              className="rounded-2xl shadow-card bg-surface-container-lowest p-lg"
            >
              <span className="mb-sm inline-block rounded-full bg-surface-container-high px-3 py-1 font-caption text-caption text-on-surface-variant">
                {tip.tag}
              </span>
              <h3 className="mb-xs font-headline-md text-body-lg text-on-surface">{tip.title}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{tip.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* A reading feed still needs a backend, accounts and a moderation
          policy, so that half stays held rather than mocked up. The
          *writing* half exists — contributions are what the style library
          is made of — so this points at it rather than at nothing. */}
      <section className="mb-2xl rounded-2xl border border-dashed border-outline-variant bg-surface-container/50 p-xl text-center">
        <Icon name="face_3" className="mb-sm text-3xl text-outline" />
        <h2 className="mb-sm font-headline-md text-headline-md text-on-surface">
          The community, so far
        </h2>
        <p className="mx-auto mb-lg max-w-sm font-body-md text-body-md text-on-surface-variant">
          Every style in the library was contributed by someone who wears it, and you can add
          yours. A feed to read — member posts, expert sessions — needs a server, accounts and
          a moderation policy first, so rather than mock one up with invented people, that
          space is held.
        </p>
        <div className="flex flex-wrap justify-center gap-sm">
          <Link
            to="/styles/submit"
            className="inline-block rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
          >
            Share a style
          </Link>
          <Link
            to="/styles"
            className="inline-block rounded-full border border-outline-variant px-xl py-3 font-label-md text-label-md text-on-surface transition-all active:scale-95"
          >
            Browse the library
          </Link>
        </div>
      </section>

      <UpdatesSection />

      <PlusStatus />

      <AskSharingSection />

      <section className="mb-2xl flex flex-col items-center gap-sm text-center">
        <p className="font-caption text-caption text-on-surface-variant">
          AfroCoils, version {VERSION}
        </p>
        <nav className="flex flex-wrap justify-center gap-lg">
          <Link to="/legal/privacy" className="font-body-md text-body-md text-primary underline">
            Privacy Policy
          </Link>
          <Link to="/legal/terms" className="font-body-md text-body-md text-primary underline">
            Terms of Service
          </Link>
          <Link to="/legal/contact" className="font-body-md text-body-md text-primary underline">
            Contact Us
          </Link>
        </nav>
      </section>
    </>
  )
}

/**
 * Updates: what is installed, whether a newer build is posted, and the
 * switch for checking at all.
 *
 * This is where the update check is disclosed and where it is turned
 * off, so it says what the check sends (nothing about you) in the same
 * place as the switch. The prompt that pops up on launch is the same
 * check; this is its permanent home, so a "Not now" never hides an
 * update for good.
 */
function UpdatesSection() {
  const { profile, update } = useHairProfile()
  const status = useUpdateStatus()
  const [installed, setInstalled] = useState<InstalledVersion>()
  const checking = profile.updates.check

  useEffect(() => {
    if (isNative) void installedVersion().then(setInstalled)
  }, [])

  const line = (() => {
    switch (status.kind) {
      case 'checking':
        return 'Checking…'
      case 'current':
        return 'You have the latest version.'
      case 'unsupported':
        return `Version ${status.version} needs Android ${status.minAndroid} or newer, so this phone stays on this one.`
      case 'failed':
        return 'Could not reach the update server. It will try again next time you open the app.'
      default:
        return undefined
    }
  })()

  return (
    <section className="mb-2xl rounded-2xl shadow-card bg-surface-container-lowest p-lg">
      <div className="mb-sm flex items-center gap-sm">
        <Icon name="system_update" className="text-primary" />
        <h2 className="font-headline-md text-body-lg text-on-surface">Updates</h2>
      </div>
      <p className="mb-md font-body-md text-body-md text-on-surface-variant">
        Installed: version {installed?.version ?? VERSION}
        {installed ? ` (build ${installed.build})` : ''}
        {RUNNING_BUNDLE > 0 ? `, update ${RUNNING_BUNDLE}` : ''}.
      </p>

      {!updatesConfigured ? (
        <p className="font-body-md text-caption text-on-surface-variant">
          {isNative
            ? 'This build was made without an update address, so it cannot check for new versions. Check the AfroCoils website instead.'
            : 'Updates are for the Android app. This is the web version, which is always the latest.'}
        </p>
      ) : (
        <>
          {status.kind === 'pushed' || status.kind === 'installing' || status.kind === 'install-failed' ? (
            <div className="mb-md rounded-xl bg-primary-container p-md text-on-primary-container" aria-live="polite">
              <p className="mb-sm font-label-md text-label-md">
                {status.kind === 'installing'
                  ? `Downloading update ${status.push.code}… ${Math.round(status.percent)}%`
                  : status.kind === 'install-failed'
                    ? `Update ${status.push.code} did not download or did not check out. Nothing was changed.`
                    : `Update ${status.push.code} is ready · ${formatBytes(status.push.bytes)}. It installs in place, no reinstall.`}
              </p>
              <button
                type="button"
                disabled={status.kind === 'installing'}
                onClick={() => void installPushedUpdate(status.push)}
                className="inline-flex items-center gap-xs rounded-full bg-surface-container-lowest px-lg py-2 font-label-md text-label-md text-primary transition-all active:scale-95 disabled:opacity-60"
              >
                <Icon name="system_update" className="text-[18px]" />
                {status.kind === 'installing' ? 'Updating…' : status.kind === 'install-failed' ? 'Try again' : 'Update now'}
              </button>
            </div>
          ) : status.kind === 'available' ? (
            <div className="mb-md rounded-xl bg-primary-container p-md text-on-primary-container">
              <p className="mb-sm font-label-md text-label-md">
                Version {status.update.version} is available · {formatBytes(status.update.bytes)}
              </p>
              <a
                href={status.update.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-xs rounded-full bg-surface-container-lowest px-lg py-2 font-label-md text-label-md text-primary transition-all active:scale-95"
              >
                <Icon name="download" className="text-[18px]" />
                Download update
              </a>
            </div>
          ) : (
            line && (
              <p className="mb-md font-body-md text-caption text-on-surface-variant" aria-live="polite">
                {line}
              </p>
            )
          )}

          <div className="mb-md flex flex-wrap gap-sm">
            <button
              type="button"
              disabled={status.kind === 'checking'}
              onClick={() => void checkForUpdates({ force: true })}
              className="flex items-center gap-xs rounded-full bg-primary px-lg py-2 font-label-md text-label-md text-on-primary transition-all active:scale-95 disabled:opacity-60"
            >
              <Icon name="history" className="text-[16px]" />
              Check now
            </button>
            <button
              type="button"
              aria-pressed={checking}
              onClick={() => update({ updates: { ...profile.updates, check: !checking } })}
              className={`flex items-center gap-xs rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                checking
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <Icon
                name={checking ? 'check_circle' : 'radio_button_unchecked'}
                filled={checking}
                className="text-[16px]"
              />
              Check when the app opens
            </button>
          </div>

          <p className="font-caption text-caption text-on-surface-variant">
            The check asks the AfroCoils website which version is newest. It sends nothing from
            your profile and no identifier — the website sees what any website sees, your
            connection&rsquo;s IP address. Nothing downloads unless you tap Download.
          </p>
        </>
      )}
    </section>
  )
}

/**
 * The switch for sharing Ask questions, and exactly what it shares.
 *
 * On by default. The same words the privacy policy uses, because this
 * is where someone decides, and the policy is where they check.
 */
function AskSharingSection() {
  const { profile, update } = useHairProfile()
  const sharing = profile.askSharing
  return (
    <section className="mb-2xl rounded-2xl shadow-card bg-surface-container-lowest p-lg">
      <div className="mb-sm flex items-center gap-sm">
        <Icon name="forum" className="text-primary" />
        <h2 className="font-headline-md text-body-lg text-on-surface">Ask questions</h2>
      </div>
      <p className="mb-md font-body-md text-body-md text-on-surface-variant">
        Questions you type into Ask are sent to the AfroCoils team so we can see what people
        ask and write the answers that are missing. Only the words you typed go, with what Ask
        answered and the app&rsquo;s update number — nothing from your profile, no name, no
        account and no device identifier. Ask answers on your phone either way.
      </p>
      <button
        type="button"
        aria-pressed={sharing}
        onClick={() => update({ askSharing: !sharing })}
        className={`mb-md flex items-center gap-xs rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
          sharing ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container-high text-on-surface-variant'
        }`}
      >
        <Icon name={sharing ? 'check_circle' : 'radio_button_unchecked'} filled={sharing} className="text-[16px]" />
        Share my questions anonymously
      </button>
      <p className="font-caption text-caption text-on-surface-variant">
        Questions are kept for up to twelve months, read only by the team, and never sold or
        used for advertising. Our server sees your connection&rsquo;s IP address, as any website
        does, and does not store it with your question.
      </p>
    </section>
  )
}
