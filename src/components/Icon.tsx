import CODEPOINTS, { type IconName } from './icon-names'

export type { IconName }

/**
 * Material Symbols glyph, rendered by codepoint rather than by ligature name.
 *
 * The obvious approach — printing "check_circle" and letting the font's
 * ligature table resolve it — makes the font impossible to subset: retaining
 * the letters a–z forces harfbuzz to keep nearly every ligature in the file,
 * which is why the full font is 3.8 MB. Emitting the codepoint directly means
 * the subset keeps 27 glyphs and no ligature machinery at all.
 *
 * The trade-off is that icon names must exist in icon-codepoints.json. That is
 * enforced at compile time by `IconName`, so a typo is a type error rather
 * than a blank space at runtime.
 */
export default function Icon({
  name,
  filled = false,
  className = '',
}: {
  name: IconName
  filled?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols ${filled ? 'material-symbols-filled' : ''} ${className}`}
    >
      {String.fromCodePoint(Number.parseInt(CODEPOINTS[name], 16))}
    </span>
  )
}
