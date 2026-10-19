import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'
import SectionCrumb from '../components/SectionCrumb'
import UserPhoto from '../components/UserPhoto'
import ScreenFallback from '../components/ScreenFallback'
import { CATEGORY_ICONS } from '../content/styles'
import { newEventId } from '../lib/calendar'
import { capturePhoto, deletePhoto, PhotoError, photosAvailable } from '../lib/photos'
import { useHairProfile } from '../lib/profile-store'
import { useBackDismiss } from '../lib/back-button'
import { SubmissionError, sendSubmission } from '../lib/submissions'
import { apiConfigured } from '../lib/api'
import { isNative } from '../native/shell'
import type { HairType, StyleSubmission } from '../lib/types'
import { HAIR_TYPES, MAX_PHOTOS_PER_SUBMISSION } from '../lib/types'

/**
 * Offering a style to the community library.
 *
 * The library is contributed content end to end, so this is the way in.
 * Four things and a tick: the style's name, a description, photographs
 * and a credit line. It used to ask for a category, timings, occasions,
 * numbered steps and a kit list, and that was a form people opened and
 * closed. A person reviews every submission anyway, so the reviewer
 * writes up what the library entry still needs; the contributor only
 * has to say what the style is and show it.
 *
 * Two things stay that are not in that list, and both are about safety
 * rather than detail: the hair type (asked only when nothing has already
 * said — loose-hair technique damages locs, so it decides who ever sees
 * the style) and the claim that the photographs are theirs to share.
 *
 * Arriving from a gap in the loc lookbook (`?name=…&hair=Locs`), the
 * style is already chosen, so it is shown rather than asked.
 *
 * Part of Styles, reached from the library rather than from the drawer:
 * a contribution is a thing you do to the shelf while looking at it.
 *
 * **What it does not do is pretend.** There is no community service
 * behind this yet, and the screen says so in as many words rather than
 * showing a success tick and dropping the submission on the floor. A
 * submission is written to the profile, listed here with its status, and
 * can be edited or withdrawn. Wiring a backend later is a status
 * transition, not a rewrite.
 */

/** Short enough to be no obstacle, long enough that a reviewer has something to read. */
const MIN_DESCRIPTION = 10

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
        active
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-surface-container-high text-on-surface'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-xl">
      <h2 className="mb-xs font-label-md text-label-md uppercase tracking-widest text-primary">
        {label}
      </h2>
      {hint && <p className="mb-sm font-caption text-caption text-on-surface-variant">{hint}</p>}
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-3 font-body-md text-body-md text-on-surface placeholder:text-outline'

/**
 * The gate, kept separate from the form on purpose.
 *
 * Every field below seeds its `useState` from the profile — the style
 * named by `?from=` (or `?name=` and `?hair=`), the user's hair type, their name for the credit
 * line. `useState` reads its argument once, at mount, and the store
 * hands out `emptyProfile()` until the disk read resolves. With the
 * `!ready` check *inside* the form, that first render still happened:
 * the state froze against the empty document and the seeding silently
 * did nothing, intermittently, depending on which resolved first.
 *
 * Mounting the form only once the profile is real is the whole fix.
 */
export default function SubmitStyleScreen() {
  const { ready } = useHairProfile()
  if (!ready) return <ScreenFallback />
  return <SubmitStyleForm />
}

function SubmitStyleForm() {
  const navigate = useNavigate()
  const { profile, update } = useHairProfile()
  const [params] = useSearchParams()

  // Seeded from one of the user's own styles when they came from there,
  // so "I already logged this" does not mean typing it twice.
  const seed = profile.myStyles.find((s) => s.id === params.get('from'))
  // Or from a gap in a library: the loc lookbook links here with the name
  // of a style nobody has pictured yet, and says it is for locs. Only
  // `Locs` is honoured, so a link can never default someone's loc style
  // to loose hair — the one wrong answer on this form that does damage.
  const askedName = params.get('name')?.trim().slice(0, 80) || undefined
  const askedHair: HairType | undefined = params.get('hair') === 'Locs' ? 'Locs' : undefined

  // A style picked from the lookbook is a fixed thing to contribute to,
  // not a suggestion to edit.
  const chosen = askedName && !seed ? askedName : undefined

  const [name, setName] = useState(seed?.name ?? askedName ?? '')
  const [hairType, setHairType] = useState<HairType>(
    askedHair ?? profile.identity.hairType ?? 'Loose Natural',
  )
  const [note, setNote] = useState(seed?.notes ?? '')
  const [credit, setCredit] = useState(profile.bio.name ?? '')
  const [rights, setRights] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Withdrawing deletes the photographs off the disk as well as the
  // record, and there is no undo. `MyStyles` already asks twice for the
  // same reason; a bin icon that fires on the first tap did not belong
  // next to a list the user has spent ten minutes filling.
  const [confirming, setConfirming] = useState<string | null>(null)

  // Withdrawing is irreversible and deletes photographs with it, so back
  // has to mean "cancel that" rather than "leave the screen".
  useBackDismiss(confirming !== null, () => setConfirming(null))

  /*
   * Sending a queued submission.
   *
   * Per row rather than one "send everything" button: the failures are
   * per row too — one submission can be refused for a photograph that
   * will not read while another goes through — and a single button that
   * half-worked has nothing useful to say afterwards.
   *
   * `sendSubmission` never mutates anything. It returns the row to store
   * on success and throws on every failure, so the `Queued` row is left
   * exactly as it was unless a server has confirmed it holds a copy.
   */
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendError, setSendError] = useState<{ id: string; message: string } | null>(null)
  const canSend = apiConfigured(isNative)

  async function send(submission: StyleSubmission) {
    setSendingId(submission.id)
    setSendError(null)
    try {
      const sent = await sendSubmission(submission)
      // Read from the store rather than the closure: sending is slow
      // enough that the list can have changed underneath it.
      update({
        submissions: profile.submissions.map((s) => (s.id === sent.id ? sent : s)),
      })
    } catch (error) {
      setSendError({
        id: submission.id,
        message:
          error instanceof SubmissionError
            ? error.message
            : 'Could not reach the community library. Your submission is still saved on this device.',
      })
    } finally {
      setSendingId(null)
    }
  }

  /*
   * Photographs captured but never submitted.
   *
   * `capturePhoto` writes the file the moment it is taken, and until a
   * submission owns it the form is the only thing that knows it exists.
   * Walking away used to strand every one of them on the device with
   * nothing pointing at them and no screen able to list them. The ref
   * tracks what is still unowned, so leaving cleans up after itself.
   *
   * `submit` hands ownership over by clearing this ref *directly*, not
   * by clearing `photos` and trusting a re-render to copy the empty
   * array across. It cannot: `submit` batches its `setPhotos([])` with
   * the `navigate` that leaves the screen, React unmounts this form in
   * that same commit, and the queued state update is dropped without
   * ever rendering. The ref would still be holding the filenames the
   * submission now owns, and the cleanup below would delete every
   * photograph the contributor had just submitted.
   */
  const pending = useRef<string[]>([])
  pending.current = photos
  useEffect(
    () => () => {
      for (const path of pending.current) void deletePhoto(path)
    },
    [],
  )

  const { submissions } = profile
  const described = note.trim().length >= MIN_DESCRIPTION
  const canSubmit = name.trim().length > 1 && described && rights

  async function addPhoto(source: 'camera' | 'gallery') {
    if (photos.length >= MAX_PHOTOS_PER_SUBMISSION) return
    setBusy(true)
    setError(null)
    try {
      setPhotos([...photos, await capturePhoto(source)])
    } catch (err) {
      if (err instanceof PhotoError && err.cancelled) return
      setError(err instanceof PhotoError ? err.message : 'Could not add that photo.')
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto(path: string) {
    setPhotos(photos.filter((p) => p !== path))
    await deletePhoto(path)
  }

  function submit() {
    if (!canSubmit) return
    const submission: StyleSubmission = {
      id: `sub-${newEventId()}`,
      name: name.trim(),
      // Carried over, not asked: what the user already logged for this
      // style under My styles is free detail for the reviewer.
      category: seed?.category,
      hairType,
      minutes: seed?.minutes,
      note: note.trim(),
      occasions: [],
      needs: [],
      steps: [],
      photos,
      credit: credit.trim() || undefined,
      rightsConfirmed: rights,
      status: 'Queued',
      createdISO: new Date().toISOString(),
    }
    update({ submissions: [submission, ...submissions] })

    // Ownership moves to the submission here, and the ref is what
    // records that — see the comment on `pending` above. This assignment
    // is the one that matters; the `setPhotos` below is only so the form
    // reads correctly if it somehow survives the navigation.
    pending.current = []
    setPhotos([])
    setName('')
    setNote('')
    setRights(false)

    // Ten minutes of writing up a method deserves more acknowledgement
    // than a green tick in the same weight as a validation message, and
    // the thank-you page is where "a person reads this before anything
    // is published" belongs — after the work, not as a hurdle before it.
    navigate('/styles/submit/thanks', { state: { name: submission.name } })
  }

  async function withdraw(submission: StyleSubmission) {
    setConfirming(null)
    // Files first, then the record — the same order MyStyles uses. The
    // other way round strands bytes on disk with nothing pointing at them.
    await Promise.all(submission.photos.map((path) => deletePhoto(path)))
    update({ submissions: submissions.filter((s) => s.id !== submission.id) })
  }

  const canPick = photosAvailable()

  return (
    <>
      {chosen && askedHair === 'Locs' ? (
        <SectionCrumb to="/locs/styles" label="Locs World" />
      ) : (
        <SectionCrumb to="/styles" label="Hair Styles" />
      )}
      <ScreenHeader
        title="Share a style"
        subtitle={
          chosen
            ? 'Show the community how you wear it. It takes a minute.'
            : 'Every style in the library was contributed by someone who wears it. Add yours.'
        }
      />

      {chosen ? (
        <div className="mb-xl flex items-center gap-md rounded-2xl bg-inverse-surface p-lg text-inverse-on-surface">
          <Icon name="add_photo_alternate" className="shrink-0 text-3xl text-inverse-primary" />
          <div className="min-w-0">
            <p className="font-label-md text-caption uppercase tracking-widest text-inverse-primary">
              Contributing to
            </p>
            <p className="font-headline-md text-body-lg">{chosen}</p>
            <p className="font-caption text-caption text-inverse-on-surface/75">{hairType}</p>
          </div>
        </div>
      ) : (
        <>
          <Field label="Style name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Curved part afro bun"
              className={inputClass}
            />
          </Field>

          {/* Kept, unlike the other fields that went: loose-hair technique
              damages locs, so this decides who is ever shown the style. */}
          <Field label="For" hint="Which hair this style is done on.">
            <div className="flex flex-wrap gap-sm">
              {HAIR_TYPES.map((type) => (
                <Chip key={type} active={hairType === type} onClick={() => setHairType(type)}>
                  {type}
                </Chip>
              ))}
            </div>
          </Field>
        </>
      )}

      <Field label="Description" hint="What it is and how you do it, in your own words.">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={
            hairType === 'Locs'
              ? 'Locs pinned up at the sides with the middle left high. Takes me about 30 minutes with a few bobby pins.'
              : 'Two flat twists into a puff at the crown. About 20 minutes on stretched hair, with gel for the edges.'
          }
          className={inputClass}
        />
      </Field>

      <Field
        label="Photos"
        hint={`Up to ${MAX_PHOTOS_PER_SUBMISSION}. Front, back and side if you can — the back is the one people can't see on themselves.`}
      >
        {photos.length > 0 && (
          <div className="mb-md flex gap-sm overflow-x-auto pb-sm">
            {photos.map((path) => (
              <div key={path} className="relative shrink-0">
                <UserPhoto path={path} alt={name || 'Style photo'} className="h-28 w-28" />
                <button
                  type="button"
                  onClick={() => void removePhoto(path)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-inverse-surface/70 text-inverse-on-surface active:scale-90"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {canPick && photos.length < MAX_PHOTOS_PER_SUBMISSION ? (
          <div className="flex flex-wrap gap-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => void addPhoto('camera')}
              className="flex items-center gap-xs rounded-full bg-primary px-lg py-2 font-label-md text-caption text-on-primary active:scale-95 disabled:opacity-60"
            >
              <Icon name="photo_camera" className="text-[16px]" />
              Take photo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void addPhoto('gallery')}
              className="flex items-center gap-xs rounded-full border border-primary px-lg py-2 font-label-md text-caption text-primary active:scale-95 disabled:opacity-60"
            >
              <Icon name="add_photo_alternate" className="text-[16px]" />
              From gallery
            </button>
          </div>
        ) : (
          !canPick && (
            <p className="font-caption text-caption text-on-surface-variant">
              Photos need the camera, which is not available here. The rest of the submission
              still works.
            </p>
          )
        )}
      </Field>

      <Field label="Credits" hint="How you want to be named. Leave it blank to stay anonymous.">
        <input
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
          placeholder="Your name or handle"
          className={inputClass}
        />
      </Field>

      {error && (
        <p role="alert" className="mb-lg font-body-md text-caption text-error">
          {error}
        </p>
      )}

      {/* Required, and phrased as a claim the person is making rather than
          as terms they are accepting. The library has already been burnt
          once by photographs that turned out to be somebody else's. */}
      <label className="mb-xl flex cursor-pointer items-start gap-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg">
        <input
          type="checkbox"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-outline text-primary"
        />
        <span className="font-body-md text-body-md text-on-surface-variant">
          These photos are mine to share, and everyone in them agreed.
        </span>
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="mb-sm flex w-full items-center justify-center gap-sm rounded-full bg-primary py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95 disabled:opacity-50"
      >
        <Icon name="arrow_upward" />
        Submit to the community
      </button>
      {!canSubmit && (
        <p className="mb-sm text-center font-caption text-caption text-on-surface-variant">
          {name.trim().length <= 1
            ? 'It needs a name.'
            : !described
              ? 'Add a short description.'
              : 'Tick the box to confirm the photos are yours to share.'}
        </p>
      )}
      {/* One line, where the decision is made — the long version is in
          the FAQ and the privacy policy. */}
      <p className="mb-2xl text-center font-caption text-caption text-on-surface-variant">
        Saved on this phone first, then sent for a person to review before anything is added.
      </p>

      <section className="mb-2xl mt-2xl">
        <h2 className="mb-md font-label-md text-label-md uppercase tracking-widest text-primary">
          Your submissions
        </h2>
        {submissions.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Nothing submitted yet.
          </p>
        ) : (
          <ul className="space-y-md">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md"
              >
                <div className="flex items-start gap-md">
                  {s.photos[0] ? (
                    <UserPhoto path={s.photos[0]} alt={s.name} className="h-16 w-16 shrink-0" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed text-on-secondary-fixed">
                      <Icon name={s.category ? CATEGORY_ICONS[s.category] : 'image'} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-headline-md text-body-lg leading-tight text-on-surface">
                      {s.name}
                    </p>
                    <p className="font-caption text-caption text-on-surface-variant">
                      {[
                        s.category,
                        s.hairType,
                        s.steps.length > 0
                          ? `${s.steps.length} step${s.steps.length === 1 ? '' : 's'}`
                          : undefined,
                        s.photos.length > 0 ? `${s.photos.length} photo${s.photos.length === 1 ? '' : 's'}` : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <span
                      className={`mt-xs inline-block rounded-full px-3 py-1 font-caption text-caption ${
                        s.status === 'Sent'
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {s.status === 'Queued'
                        ? 'Queued on this device'
                        : 'Sent — waiting for a reviewer'}
                    </span>
                  </div>
                  {confirming !== s.id && (
                    <button
                      type="button"
                      onClick={() => setConfirming(s.id)}
                      aria-label={`Withdraw ${s.name}`}
                      className="-m-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-outline active:scale-90"
                    >
                      <Icon name="delete" />
                    </button>
                  )}
                </div>

                {/* Sending, per row.
                    Only offered while the row is `Queued` and only where
                    the build knows an address to send to — without
                    VITE_API_BASE_URL a release has no server, and a
                    button whose only outcome is an error is worse than
                    no button. The row stays exactly as it is on every
                    failure; nothing here is destructive. */}
                {s.status === 'Queued' && confirming !== s.id && (
                  <div className="mt-md">
                    {canSend ? (
                      <button
                        type="button"
                        onClick={() => void send(s)}
                        disabled={sendingId !== null}
                        className="flex items-center gap-sm rounded-full bg-primary px-lg py-2 font-label-md text-caption text-on-primary transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Icon
                          name={sendingId === s.id ? 'more_horiz' : 'arrow_upward'}
                          className={sendingId === s.id ? 'animate-pulse text-[18px]' : 'text-[18px]'}
                        />
                        {sendingId === s.id ? 'Sending…' : 'Send to the library'}
                      </button>
                    ) : (
                      <p className="font-caption text-caption text-on-surface-variant">
                        This build has no library address set, so there is nowhere to send it
                        yet. It stays here until there is.
                      </p>
                    )}

                    {sendError?.id === s.id && (
                      <p role="alert" className="mt-sm font-body-md text-caption text-error">
                        {sendError.message}
                      </p>
                    )}
                  </div>
                )}

                {confirming === s.id && (
                  <div className="mt-md rounded-xl bg-surface-container p-md">
                    <p className="mb-sm font-body-md text-caption text-on-surface-variant">
                      Withdrawing deletes {s.name}
                      {s.photos.length > 0
                        ? ` and its ${s.photos.length} photograph${s.photos.length === 1 ? '' : 's'}`
                        : ''}
                      . There is no undo.
                    </p>
                    <div className="flex flex-wrap gap-sm">
                      <button
                        type="button"
                        onClick={() => void withdraw(s)}
                        className="rounded-full bg-error px-lg py-2 font-label-md text-caption text-on-error active:scale-95"
                      >
                        Withdraw{s.photos.length > 0 ? ', photos and all' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="rounded-full bg-surface-container-high px-lg py-2 font-label-md text-caption text-on-surface active:scale-95"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-2xl text-center">
        <Link to="/styles" className="font-label-md text-label-md text-primary underline">
          Back to the library
        </Link>
      </section>
    </>
  )
}
