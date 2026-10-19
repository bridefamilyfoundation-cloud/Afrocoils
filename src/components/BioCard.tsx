import { useState } from 'react'
import { IMAGERY } from '../assets/imagery'
import Icon from './Icon'
import PrototypeImage from './PrototypeImage'
import UserPhoto from './UserPhoto'
import { PhotoError, capturePhoto, deletePhoto, photosAvailable } from '../lib/photos'
import { useHairProfile } from '../lib/profile-store'
import { CLIMATES, type Climate } from '../lib/types'

/**
 * Name, photo and climate — the top of the profile screen.
 *
 * None of this is a property of the hair, which is why it is kept in
 * `bio` rather than in `identity`. The split is not cosmetic: name and
 * photo never leave the device, while climate is sent with every request
 * because humidity and hard water change what actually works often
 * enough that advice given without them is advice given blind.
 *
 * The photo follows the same rule as the style photos: the profile
 * document stores a filename and the bytes live on disk, because the
 * document is read whole on launch and rewritten on every edit. Replacing
 * a photo deletes the old file first, so the directory does not
 * accumulate orphans nothing points at.
 */

const CLIMATE_HINT: Record<Climate, string> = {
  'Humid / tropical': 'Swelling, reversion and frizz. Sealing beats soaking.',
  'Dry / arid': 'Moisture leaves fast. Layer, then seal, and re-moisturise often.',
  'Cold / low humidity': 'Indoor heating strips moisture. Satin and heavier sealants.',
  Temperate: 'No strong seasonal pull in either direction.',
}

export default function BioCard() {
  const { profile, update } = useHairProfile()
  const { bio } = profile
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [editingName, setEditingName] = useState(false)

  async function pickPhoto() {
    setError(undefined)
    setBusy(true)
    try {
      const path = await capturePhoto('gallery')
      const previous = bio.photo
      update({ bio: { ...bio, photo: path } })
      // Delete after the write, not before: if the write never lands the
      // user still has the photo they had a moment ago.
      if (previous) await deletePhoto(previous)
    } catch (e) {
      if (e instanceof PhotoError && e.cancelled) return
      setError(e instanceof PhotoError ? e.message : 'Could not save that photo.')
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto() {
    const previous = bio.photo
    update({ bio: { ...bio, photo: undefined } })
    if (previous) await deletePhoto(previous)
  }

  function setClimate(value: Climate) {
    update({ bio: { ...bio, climate: bio.climate === value ? undefined : value } })
  }

  return (
    <section className="mb-2xl">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-md">
          {bio.photo ? (
            <UserPhoto
              path={bio.photo}
              alt={bio.name ? `${bio.name}'s profile photo` : 'Your profile photo'}
              rounded="rounded-full"
              className="h-24 w-24 border-4 border-primary-fixed"
            />
          ) : (
            <PrototypeImage
              slot={IMAGERY.avatar}
              rounded="rounded-full"
              className="h-24 w-24 border-4 border-primary-fixed"
            />
          )}

          {/* Hidden rather than disabled where the plugin is absent — a
              desktop browser without it cannot pick a photo at all, and
              a button that never works is worse than no button. */}
          {photosAvailable() && (
          <button
            type="button"
            onClick={pickPhoto}
            disabled={busy}
            aria-label={bio.photo ? 'Change your profile photo' : 'Add a profile photo'}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-transform active:scale-90 disabled:opacity-60"
          >
            <Icon name={busy ? 'more_horiz' : 'photo_camera'} className="text-[18px]" />
          </button>
          )}
        </div>

        {editingName ? (
          <input
            autoFocus
            type="text"
            maxLength={40}
            defaultValue={bio.name ?? ''}
            placeholder="Your name"
            aria-label="Your name"
            onBlur={(e) => {
              update({ bio: { ...bio, name: e.target.value.trim() || undefined } })
              setEditingName(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="mb-xs w-full max-w-xs rounded-xl bg-surface-container px-md py-2 text-center font-headline-lg text-headline-lg-mobile text-on-background"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="mb-xs flex items-center gap-sm active:scale-95"
          >
            <h2 className="font-headline-lg text-headline-lg-mobile text-on-background">
              {bio.name || 'Your Crown'}
            </h2>
            <Icon name="edit" className="text-[16px] text-outline" />
          </button>
        )}

        {bio.photo && (
          <button
            type="button"
            onClick={removePhoto}
            className="mb-xs font-caption text-caption text-outline underline"
          >
            Remove photo
          </button>
        )}

        {error && (
          <p className="mb-xs font-caption text-caption text-primary" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="mt-lg rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-lg">
        <div className="mb-xs flex items-center gap-sm">
          <Icon name="waves" className="text-primary" />
          <h3 className="flex-1 font-caption text-caption uppercase tracking-widest text-on-surface-variant">
            Where your hair lives
          </h3>
        </div>
        <p className="mb-md font-caption text-caption text-on-surface-variant">
          Climate and water hardness change which products work, so the shelf and the
          guides read them. Nothing on this card leaves the phone.
        </p>

        <div className="mb-md flex flex-wrap gap-sm">
          {CLIMATES.map((option) => {
            const on = bio.climate === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() => setClimate(option)}
                className={`rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                  on
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>

        {bio.climate && (
          <p className="mb-md font-body-md text-caption text-on-surface-variant">
            {CLIMATE_HINT[bio.climate]}
          </p>
        )}

        {/* Kept separate from climate rather than made a fifth option:
            hard water is plumbing, not weather, and someone in a humid
            city can have it too. Folding it in would make them choose. */}
        <button
          type="button"
          aria-pressed={bio.hardWater === true}
          onClick={() => update({ bio: { ...bio, hardWater: !bio.hardWater } })}
          className={`flex w-full items-center gap-sm rounded-xl px-md py-3 text-left font-body-md text-body-md transition-colors active:scale-[0.98] ${
            bio.hardWater
              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          <Icon
            name={bio.hardWater ? 'check_circle' : 'radio_button_unchecked'}
            filled={bio.hardWater}
            className="shrink-0 text-[18px]"
          />
          <span className="min-w-0 flex-1">
            I live in a hard water area
            <span className="block font-caption text-caption opacity-80">
              Limescale on the kettle and taps is the usual tell. It changes clarifying advice.
            </span>
          </span>
        </button>
      </div>
    </section>
  )
}
