import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import UserPhoto from './UserPhoto'
import { capturePhoto, deletePhoto, PhotoError, photosAvailable } from '../lib/photos'
import { useHairProfile } from '../lib/profile-store'
import { newEventId, todayKey } from '../lib/calendar'
import type { MyStyle, StyleCategory } from '../lib/types'
import { MAX_PHOTOS_PER_STYLE, STYLE_CATEGORIES } from '../lib/types'

/**
 * The user's own styles, with their own photos.
 *
 * Lives inside the profile rather than in the style library: the library
 * is editorial technique the app stands behind, this is a personal record
 * of what the user actually wore and what it looked like on them.
 *
 * Photo bytes never enter the profile document — `MyStyle.photos` holds
 * filenames and lib/photos.ts owns the files. Deleting a style deletes
 * its files too, otherwise the app leaks storage nobody can reach.
 */

export default function MyStyles() {
  const { profile, update } = useHairProfile()
  const { myStyles } = profile

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch(id: string, changes: Partial<MyStyle>) {
    update({ myStyles: myStyles.map((s) => (s.id === id ? { ...s, ...changes } : s)) })
  }

  function addStyle(draft: { name: string; category?: StyleCategory; minutes?: number; notes?: string }) {
    const style: MyStyle = {
      id: `mine-${newEventId()}`,
      name: draft.name.trim(),
      category: draft.category,
      minutes: draft.minutes,
      notes: draft.notes?.trim() || undefined,
      photos: [],
      wornISO: [],
      favourite: false,
      createdISO: new Date().toISOString(),
    }
    update({ myStyles: [style, ...myStyles] })
    setAdding(false)
    // Drop straight into the new style so the obvious next action —
    // adding a photo of it — is one tap away rather than another hunt.
    setEditingId(style.id)
  }

  async function removeStyle(style: MyStyle) {
    // Files first: if the profile write landed first and the app were
    // killed in between, the filenames would be gone and the bytes would
    // be stranded on disk with nothing left pointing at them.
    await Promise.all(style.photos.map((path) => deletePhoto(path)))
    update({ myStyles: myStyles.filter((s) => s.id !== style.id) })
    setEditingId(null)
  }

  async function addPhoto(style: MyStyle, source: 'camera' | 'gallery') {
    if (style.photos.length >= MAX_PHOTOS_PER_STYLE) return
    setBusy(true)
    setError(null)
    try {
      const path = await capturePhoto(source)
      patch(style.id, { photos: [...style.photos, path] })
    } catch (err) {
      // Backing out of the picker is a decision, not a failure.
      if (err instanceof PhotoError && err.cancelled) return
      setError(err instanceof PhotoError ? err.message : 'Could not add that photo.')
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto(style: MyStyle, path: string) {
    patch(style.id, { photos: style.photos.filter((p) => p !== path) })
    await deletePhoto(path)
  }

  function markWorn(style: MyStyle) {
    const today = todayKey()
    if (style.wornISO.includes(today)) return
    patch(style.id, { wornISO: [...style.wornISO, today] })
  }

  return (
    <section className="mb-2xl">
      <div className="mb-xs flex items-center justify-between">
        <h3 className="font-headline-md text-body-lg font-bold text-on-surface">
          My Styles
        </h3>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-xs font-label-md text-caption text-primary active:scale-95"
          >
            <Icon name="add" className="text-[16px]" />
            Add
          </button>
        )}
      </div>
      <p className="mb-md font-caption text-caption text-on-surface-variant">
        Your own looks and photos. They stay on this device — sharing one with the
        community library is a separate, deliberate step.
      </p>

      {error && (
        <p role="alert" className="mb-md font-body-md text-caption text-error">
          {error}
        </p>
      )}

      {adding && <AddStyleForm onCancel={() => setAdding(false)} onSave={addStyle} />}

      {myStyles.length === 0 && !adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full flex-col items-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container/50 p-xl text-center active:scale-[0.99]"
        >
          <Icon name="add_photo_alternate" className="text-3xl text-outline" />
          <span className="font-body-md text-body-md text-on-surface-variant">
            Add your first style
          </span>
          <span className="font-caption text-caption text-outline">
            Name it, photograph it, and it is here next time you want it
          </span>
        </button>
      ) : (
        <ul className="space-y-md">
          {myStyles.map((style) => (
            <StyleRow
              key={style.id}
              style={style}
              expanded={editingId === style.id}
              busy={busy}
              onToggle={() => setEditingId(editingId === style.id ? null : style.id)}
              onFavourite={() => patch(style.id, { favourite: !style.favourite })}
              onWorn={() => markWorn(style)}
              onAddPhoto={(source) => void addPhoto(style, source)}
              onRemovePhoto={(path) => void removePhoto(style, path)}
              onDelete={() => void removeStyle(style)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function StyleRow({
  style,
  expanded,
  busy,
  onToggle,
  onFavourite,
  onWorn,
  onAddPhoto,
  onRemovePhoto,
  onDelete,
}: {
  style: MyStyle
  expanded: boolean
  busy: boolean
  onToggle: () => void
  onFavourite: () => void
  onWorn: () => void
  onAddPhoto: (source: 'camera' | 'gallery') => void
  onRemovePhoto: (path: string) => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const canPick = photosAvailable()
  const full = style.photos.length >= MAX_PHOTOS_PER_STYLE

  return (
    <li className="overflow-hidden rounded-xl shadow-card bg-surface-container-lowest">
      <div className="flex items-center gap-md p-md">
        {style.photos[0] ? (
          <UserPhoto path={style.photos[0]} alt={style.name} className="h-16 w-16 shrink-0" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed text-on-secondary-fixed">
            <Icon name="checkroom" />
          </div>
        )}

        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="font-headline-md text-body-lg leading-tight text-on-surface">
            {style.name}
          </p>
          <p className="font-caption text-caption text-on-surface-variant">
            {[
              style.category,
              style.minutes ? `${style.minutes} min` : undefined,
              style.wornISO.length > 0
                ? `worn ${style.wornISO.length}×`
                : undefined,
              style.photos.length > 0 ? `${style.photos.length} photo${style.photos.length > 1 ? 's' : ''}` : undefined,
            ]
              .filter(Boolean)
              .join(' · ') || 'No details yet'}
          </p>
        </button>

        <button
          type="button"
          aria-pressed={style.favourite}
          aria-label={style.favourite ? 'Remove from favourites' : 'Mark as favourite'}
          onClick={onFavourite}
          className="-m-1 shrink-0 p-1 active:scale-90"
        >
          <Icon
            name="favorite"
            filled={style.favourite}
            className={style.favourite ? 'text-primary' : 'text-outline'}
          />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
          className="-m-1 shrink-0 p-1 text-outline active:scale-90"
        >
          <Icon name={expanded ? 'expand_less' : 'expand_more'} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-outline-variant/30 p-md">
          {style.notes && (
            <p className="mb-md font-body-md text-body-md text-on-surface-variant">
              {style.notes}
            </p>
          )}

          {style.photos.length > 0 && (
            <div className="mb-md flex gap-sm overflow-x-auto pb-sm">
              {style.photos.map((path) => (
                <div key={path} className="relative shrink-0">
                  <UserPhoto path={path} alt={style.name} className="h-28 w-28" />
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(path)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-inverse-surface/70 text-inverse-on-surface active:scale-90"
                  >
                    <Icon name="close" className="text-[16px]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-sm">
            {canPick && !full && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAddPhoto('camera')}
                  className="flex items-center gap-xs rounded-full bg-primary px-lg py-2 font-label-md text-caption text-on-primary active:scale-95 disabled:opacity-60"
                >
                  <Icon name="photo_camera" className="text-[16px]" />
                  Take photo
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAddPhoto('gallery')}
                  className="flex items-center gap-xs rounded-full border border-primary px-lg py-2 font-label-md text-caption text-primary active:scale-95 disabled:opacity-60"
                >
                  <Icon name="add_photo_alternate" className="text-[16px]" />
                  From gallery
                </button>
              </>
            )}

            {full && (
              <p className="font-caption text-caption text-on-surface-variant">
                {MAX_PHOTOS_PER_STYLE} photos is the limit for one style — remove one to add
                another.
              </p>
            )}

            <button
              type="button"
              onClick={onWorn}
              className="rounded-full bg-surface-container-high px-lg py-2 font-label-md text-caption text-on-surface active:scale-95"
            >
              Worn today
            </button>

            {/* The obvious moment to contribute: you have already named it,
                timed it and photographed it. The submit screen reads the
                id and seeds itself, so it is not typed a second time. */}
            <Link
              to={`/styles/submit?from=${style.id}`}
              className="flex items-center gap-xs rounded-full bg-surface-container-high px-lg py-2 font-label-md text-caption text-on-surface active:scale-95"
            >
              <Icon name="arrow_upward" className="text-[16px]" />
              Share with the community
            </Link>

            {confirming ? (
              <span className="flex items-center gap-sm">
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-full bg-error px-lg py-2 font-label-md text-caption text-on-error active:scale-95"
                >
                  Delete, photos and all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="font-label-md text-caption text-on-surface-variant"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex items-center gap-xs rounded-full px-lg py-2 font-label-md text-caption text-error active:scale-95"
              >
                <Icon name="delete" className="text-[16px]" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

function AddStyleForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: (draft: {
    name: string
    category?: StyleCategory
    minutes?: number
    notes?: string
  }) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<StyleCategory | undefined>()
  const [minutes, setMinutes] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onSave({
          name,
          category,
          minutes: minutes ? Number(minutes) : undefined,
          notes,
        })
      }}
      className="mb-md rounded-xl border border-outline-variant/30 bg-surface-container p-lg"
    >
      <label className="mb-md flex flex-col gap-xs">
        <span className="font-label-md text-caption text-on-surface-variant">
          What do you call it?
        </span>
        <input
          type="text"
          value={name}
          maxLength={60}
          required
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder="Sunday twists, work bun, the good wash-and-go…"
          className="rounded-lg border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-outline"
        />
      </label>

      <div className="mb-md flex flex-wrap gap-sm">
        {STYLE_CATEGORIES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={category === option}
            onClick={() => setCategory(category === option ? undefined : option)}
            className={`rounded-full px-md py-1.5 font-label-md text-caption transition-colors active:scale-95 ${
              category === option
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-lowest text-on-surface shadow-card'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2">
        <label className="flex flex-col gap-xs">
          <span className="font-label-md text-caption text-on-surface-variant">
            How long it takes you
          </span>
          <input
            type="number"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="Minutes"
            className="rounded-lg border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-outline"
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="font-label-md text-caption text-on-surface-variant">Notes</span>
          <input
            type="text"
            value={notes}
            maxLength={200}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Products, sections, what to do differently"
            className="rounded-lg border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-outline"
          />
        </label>
      </div>

      <div className="flex gap-sm">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 rounded-full bg-primary py-3 font-label-md text-label-md text-on-primary active:scale-95 disabled:opacity-60"
        >
          Save style
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-outline-variant px-lg py-3 font-label-md text-label-md text-on-surface-variant active:scale-95"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
