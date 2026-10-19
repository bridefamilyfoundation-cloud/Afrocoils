import { Link } from 'react-router-dom'
import { styleCover } from '../assets/imagery'
import { CATEGORY_ICONS, type RankedStyle } from '../content/styles'
import Icon from './Icon'
import PrototypeImage from './PrototypeImage'

/**
 * One entry in a style list, with its save control.
 *
 * Shared by the library on `/styles` and the recommendations on
 * `/styles/recommended`, which is the whole reason it lives here rather
 * than inside either screen: the two lists have to look like the same
 * shelf seen two ways, not like two shelves.
 *
 * The card is an index entry, not the style. It used to expand in place
 * to reveal the method, which meant the four camera angles had nowhere
 * to go and a two-column grid reflowed under the user's thumb every time
 * one was opened. The whole entry lives at `/styles/:id`, and this links
 * to it.
 *
 * The link is a stretched overlay rather than a wrapper. Saving is the
 * common action on this grid and has to be a real target — the button
 * was 24px square, half the 48dp minimum, because it was shrinking
 * itself to sit inside an anchor without breaking it. Nesting a
 * `<button>` inside an `<a>` is also not a thing HTML allows, and it
 * cost a preventDefault/stopPropagation pair on every tap to paper over.
 *
 * Drawn as the reference mockup's product tile: the photograph on top,
 * the name and time under it, and saving as a round orange button where
 * the mockup has its basket. Narrow enough for two to a row on a phone,
 * which is why the note is clamped rather than shown in full — the whole
 * of it is on `/styles/:id`.
 */
export default function StyleCard({
  ranked,
  saved,
  onToggle,
  showReasons,
}: {
  ranked: RankedStyle
  saved: boolean
  onToggle: () => void
  /** Show what in the profile matched. On by default where it is the point. */
  showReasons?: boolean
}) {
  const { style, reasons } = ranked

  return (
    <div className="relative flex flex-col rounded-2xl bg-surface-container-lowest p-sm shadow-card transition-all active:scale-[0.98]">
      <Link
        to={`/styles/${style.id}`}
        aria-label={`${style.name} — every view and the method`}
        className="absolute inset-0 z-0 rounded-2xl"
      />

      <PrototypeImage
        slot={styleCover(style.id, style.name)}
        seed={style.id}
        icon={CATEGORY_ICONS[style.category]}
        ratio={[4, 5]}
        rounded="rounded-xl"
        className="aspect-[4/5] w-full object-top"
      />

      <div className="flex flex-1 flex-col px-xs pt-sm">
        <h3 className="line-clamp-2 font-label-md text-label-md font-bold text-on-surface">
          {style.name}
        </h3>
        <p className="mt-xs line-clamp-2 font-body-md text-caption text-on-surface-variant">
          {style.note}
        </p>

        {showReasons && reasons.length > 0 && (
          <div className="mt-sm flex flex-wrap gap-xs">
            {reasons.slice(0, 2).map((reason) => (
              <span
                key={reason}
                className="rounded-full bg-tertiary-fixed px-2 py-0.5 font-caption text-caption text-on-tertiary-fixed"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-xs pt-sm">
          <p className="pb-1 font-label-md text-body-md font-bold text-on-surface">
            {style.minutes} min
            <span className="block font-caption text-caption font-normal text-on-surface-variant">
              {style.difficulty}
            </span>
          </p>
          {/* A 48px target around a 36px disc, so the visible button can
              match the mockup without shrinking what a thumb has to hit. */}
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? `Remove ${style.name} from saved` : `Save ${style.name}`}
            onClick={onToggle}
            className="relative z-10 -m-1.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                saved ? 'bg-secondary text-on-secondary' : 'bg-secondary-fixed text-on-secondary-fixed'
              }`}
            >
              <Icon
                name={saved ? 'bookmark' : 'bookmark_border'}
                filled={saved}
                className="text-[20px]"
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
