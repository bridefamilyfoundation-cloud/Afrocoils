import { useState } from 'react'
import { IMAGERY } from '../assets/imagery'
import Icon from './Icon'
import PrototypeImage from './PrototypeImage'
import UserPhoto from './UserPhoto'
import { PhotoError, capturePhoto, deletePhoto, photosAvailable } from '../lib/photos'
import { useHairProfile } from '../lib/profile-store'

/**
 * Name and photo — the top of the profile screen.
 *
 * Neither is a property of the hair, which is why they are kept in
 * `bio` rather than in `identity`, and neither leaves the device.
 * Climate and hard water are `bio` too, but they change advice, so they
 * are edited with the scalp under "Scalp & surroundings" on the profile
 * rather than here beside the name.
 *
 * The photo follows the same rule as the style photos: the profile
 * document stores a filename and the bytes live on disk, because the
 * document is read whole on launch and rewritten on every edit. Replacing
 * a photo deletes the old file first, so the directory does not
 * accumulate orphans nothing points at.
 */

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

  return (
    <section className="mb-lg">
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

    </section>
  )
}
