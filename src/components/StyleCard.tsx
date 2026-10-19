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
    <div className="relative rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md transition-all active:scale-[0.98]">
      <Link
        to={`/styles/${style.id}`}
        aria-label={`${style.name} — every view and the method`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <div className="flex gap-md">
        <PrototypeImage
          slot={styleCover(style.id, style.name)}
          seed={style.id}
          icon={CATEGORY_ICONS[style.category]}
          ratio={[1, 1]}
          className="h-24 w-24 shrink-0 object-top"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-xs flex items-start gap-sm">
            <h3 className="flex-1 pt-2 font-headline-md text-body-lg text-on-surface">
              {style.name}
            </h3>
            <button
              type="button"
              aria-pressed={saved}
              aria-label={saved ? `Remove ${style.name} from saved` : `Save ${style.name}`}
              onClick={onToggle}
              className="relative z-10 -m-2 -mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
            >
              <Icon
                name={saved ? 'bookmark' : 'bookmark_border'}
                filled={saved}
                className={saved ? 'text-primary' : 'text-outline'}
              />
            </button>
          </div>
          <p className="mb-sm font-body-md text-caption text-on-surface-variant">{style.note}</p>
          <div className="flex flex-wrap gap-xs">
            <span className="flex items-center gap-xs rounded-full bg-surface-container-high px-2 py-1 font-caption text-caption text-on-surface">
              <Icon name="schedule" className="text-[14px]" />
              {style.minutes} min
            </span>
            <span className="rounded-full bg-surface-container-high px-2 py-1 font-caption text-caption text-on-surface">
              {style.difficulty}
            </span>
            {showReasons &&
              reasons.slice(0, 2).map((reason) => (
                <span
                  key={reason}
                  className="rounded-full bg-tertiary-fixed px-2 py-1 font-caption text-caption text-on-tertiary-fixed"
                >
                  {reason}
                </span>
              ))}
          </div>
        </div>
      </div>

      <p className="mt-md flex items-center justify-center gap-xs font-label-md text-caption text-primary">
        Every view and the method
        <Icon name="chevron_right" className="text-[16px]" />
      </p>
    </div>
  )
}
