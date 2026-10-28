import { Link } from 'react-router-dom'
import BioCard from '../components/BioCard'
import Icon, { type IconName } from '../components/Icon'
import { PlusStatus } from '../components/Plus'
import ScreenFallback from '../components/ScreenFallback'
import { useHairProfile } from '../lib/profile-store'
import { describeLocs, formatLocAge, resolveLocStage, retwistWeeks } from '../lib/locs'
import { todayKey } from '../lib/calendar'
import type { CarePreferences, HairIdentity, HairType } from '../lib/types'
import {
  CURL_FAMILIES,
  CURL_PATTERNS,
  DENSITIES,
  HAIR_TEXTURES,
  HAIR_TYPES,
  LOC_METHODS,
  LOC_STAGES,
  LOC_TYPES,
  POROSITY_LEVELS,
  PREFERENCE_LABELS,
  SCALP_CONDITIONS,
  curlPatternLabel,
} from '../lib/types'

/**
 * The user's determinant factors, editable in place.
 *
 * Every value here feeds the ranking on the Styles tab, the quick fixes
 * on SOS, the product filter and the calendar, so the screen doubles as
 * the explanation of why the app puts what it does in front of you —
 * hence the summary line at the top rather than burying it.
 *
 * Hair type sits above everything else because everything else depends
 * on it: the style library, the guides, the products shelf and the
 * calendar's schedule all branch on this one answer.
 */

/**
 * Curl pattern is the trait most often confused with texture, so the
 * picker says what the number and the letter each mean rather than
 * assuming a row of codes explains itself.
 */
const CURL_HINT = `The number is the shape: ${CURL_FAMILIES.map(
  (family) => `${family.digit} ${family.name.toLowerCase()}`,
).join(', ')}. The letter is how tight it is, A being the loosest.`

/** Identity fields shared by both hair types, in the order they matter. */
const SHARED_FIELDS: {
  key: keyof HairIdentity
  label: string
  icon: IconName
  options: readonly string[]
  /** Set where the value is better derived than picked. */
  via?: { to: string; cta: string }
  /** Overrides the label for one hair type, where the same trait reads differently. */
  locLabel?: string
  /** One line under the label, where the trait is routinely confused with another. */
  hint?: string
  /** How a stored value is written on the chip, where the two differ. */
  describe?: (value: string) => string
}[] = [
  {
    key: 'curlPattern',
    label: 'Curl Pattern',
    icon: 'waves',
    options: CURL_PATTERNS,
    locLabel: 'Curl Pattern (under the locs)',
    hint: CURL_HINT,
    describe: (value) => curlPatternLabel(value as (typeof CURL_PATTERNS)[number]),
  },
  {
    key: 'porosity',
    label: 'Porosity',
    icon: 'water_drop',
    options: POROSITY_LEVELS,
    via: { to: '/porosity', cta: 'Take the test' },
  },
  { key: 'density', label: 'Density', icon: 'grass', options: DENSITIES },
  {
    key: 'texture',
    label: 'Hair Texture',
    icon: 'linear_scale',
    options: HAIR_TEXTURES,
    hint: 'How thick or wide one strand is — not how curly it is, and not how much of it you have.',
  },
  { key: 'scalpCondition', label: 'Scalp', icon: 'spa', options: SCALP_CONDITIONS },
]

const HAIR_TYPE_BLURB: Record<HairType, string> = {
  'Loose Natural': 'Any curl pattern worn loose, from straight through coily.',
  Locs: 'Locs at any stage, from starter coils to rooted.',
}

export default function ProfileScreen() {
  const { profile, update, completeness, ready } = useHairProfile()
  const { identity, preferences, shelf } = profile
  const locs = identity.hairType === 'Locs'
  const stageInfo = resolveLocStage(identity)

  function setIdentity(key: keyof HairIdentity, value: string | undefined) {
    // Tapping the selected chip again clears it — otherwise a mis-tap is
    // permanent, since there is no separate "none" option in these lists.
    const next = identity[key] === value ? undefined : value
    update({ identity: { ...identity, [key]: next } })
  }

  /**
   * Hair type is the one field that is never cleared by tapping again.
   *
   * Half the app is hidden or shown by it, so an accidental double-tap
   * emptying it would silently drop the user back to a generic app with
   * no explanation of what just happened.
   */
  function setHairType(value: HairType) {
    if (identity.hairType === value) return
    update({ identity: { ...identity, hairType: value } })
  }

  function togglePreference(key: keyof CarePreferences) {
    update({ preferences: { ...preferences, [key]: !preferences[key] } })
  }

  function toggleShelf(id: string) {
    update({ shelf: shelf.map((p) => (p.id === id ? { ...p, inUse: !p.inUse } : p)) })
  }

  const summary = locs
    ? [
        describeLocs(identity),
        stageInfo.stage && `${stageInfo.stage} stage`,
        identity.porosity && `${identity.porosity} porosity`,
      ]
        .filter(Boolean)
        .join(' · ')
    : [
        identity.curlPattern && curlPatternLabel(identity.curlPattern),
        identity.porosity && `${identity.porosity} porosity`,
        identity.density && `${identity.density} density`,
      ]
        .filter(Boolean)
        .join(' · ')

  if (!ready) return <ScreenFallback />

  return (
    <>
      {/* This screen led with BioCard and no title, which left it the one
          section the app never names on the page itself. */}
      <section data-tour="profile-heading" className="mb-lg text-center">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background">
          My Hair Profile
        </h2>
      </section>

      <BioCard />

      <section className="mb-2xl text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          {summary || 'Tell us about your hair and every answer gets sharper.'}
        </p>
      </section>

      {completeness < 1 && (
        <section className="mb-2xl rounded-2xl bg-secondary-container p-lg">
          <div className="mb-sm flex items-center gap-sm">
            <Icon name="auto_awesome" className="text-on-secondary-container" />
            <h3 className="font-headline-md text-headline-md text-on-secondary-container">
              {completeness === 0 ? 'Start here' : 'Nearly there'}
            </h3>
          </div>
          <p className="mb-md font-body-md text-body-md text-on-secondary-container/90">
            These decide product weight, sectioning and how much tension your hair will
            take. Anything left blank, the app plays safe on.
          </p>
          <div
            className="mb-lg h-1.5 w-full overflow-hidden rounded-full bg-on-secondary-container/20"
            role="progressbar"
            aria-valuenow={Math.round(completeness * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Hair profile completeness"
          >
            <div
              className="h-full rounded-full bg-on-secondary-container transition-all duration-300"
              style={{ width: `${completeness * 100}%` }}
            />
          </div>

          {/* Two routes to the same fields. The quiz asks about things
              you can see on your own head; the pickers below assume you
              already know which category you are, which is exactly what
              someone opening a hair app usually does not. */}
          <div className="flex flex-wrap items-center gap-md">
            <Link
              to="/quiz"
              className="inline-flex items-center gap-sm rounded-full bg-on-secondary-container px-lg py-2 font-label-md text-label-md text-secondary-container transition-all active:scale-95"
            >
              <Icon name="science" className="text-[18px]" />
              {completeness === 0 ? 'Take the hair quiz' : 'Finish the quiz'}
            </Link>
            <span className="font-caption text-caption text-on-secondary-container/80">
              or fill anything in by hand below
            </span>
          </div>
        </section>
      )}

      {/* Complete profiles still get a way back in — hair changes, and a
          profile that can only be corrected field by field quietly goes
          stale. */}
      {completeness >= 1 && (
        <section className="mb-2xl flex items-center gap-md rounded-2xl shadow-card bg-surface-container-lowest p-lg">
          <Icon name="science" className="shrink-0 text-2xl text-primary" />
          <div className="min-w-0 flex-1">
            <h3 className="font-headline-md text-body-lg text-on-surface">
              Something changed?
            </h3>
            <p className="font-caption text-caption text-on-surface-variant">
              Colour, a big trim, or a new climate. Run the quiz again to re-do the lot.
            </p>
          </div>
          <Link
            to="/quiz"
            className="shrink-0 font-label-md text-label-md text-primary underline active:scale-95"
          >
            Retake
          </Link>
        </section>
      )}

      {/* Hair type. First, and visually heavier than the rest, because
          everything below it is conditioned on this answer. */}
      <section className="mb-2xl">
        <h3 className="mb-xs font-headline-md text-body-lg font-bold text-on-surface">
          Hair Type
        </h3>
        <p className="mb-md font-caption text-caption text-on-surface-variant">
          This one changes the whole app — which styles you see, which guides, which products,
          and what the calendar tracks.
        </p>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {HAIR_TYPES.map((type) => {
            const selected = identity.hairType === type
            return (
              <button
                key={type}
                type="button"
                aria-pressed={selected}
                onClick={() => setHairType(type)}
                className={`flex flex-col rounded-2xl p-lg text-left transition-all active:scale-[0.98] ${
                  selected
                    ? 'bg-primary text-on-primary'
                    : 'shadow-card bg-surface-container-lowest text-on-surface'
                }`}
              >
                <div className="mb-sm flex items-center gap-sm">
                  <Icon name={type === 'Locs' ? 'grass' : 'waves'} filled={selected} />
                  <span className="font-headline-md text-body-lg">{type}</span>
                </div>
                <span
                  className={`font-body-md text-caption ${
                    selected ? 'opacity-90' : 'text-on-surface-variant'
                  }`}
                >
                  {HAIR_TYPE_BLURB[type]}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Loc detail. Only rendered for locs — a loose-hair user should
          never have to scroll past questions that do not apply to them. */}
      {locs && (
        <section className="mb-2xl">
          <h3 className="mb-xs font-headline-md text-body-lg font-bold text-on-surface">
            Your Locs
          </h3>
          <p className="mb-md font-caption text-caption text-on-surface-variant">
            Method and stage decide how often you should be retwisting and what you can safely
            style — the two things loc advice most often gets wrong.
          </p>

          <div className="space-y-md">
            <ChipField
              label="Loc Type"
              icon="grass"
              options={LOC_TYPES}
              value={identity.locType}
              onSelect={(v) => setIdentity('locType', v)}
            />
            <ChipField
              label="Started With"
              icon="science"
              options={LOC_METHODS}
              value={identity.locMethod}
              onSelect={(v) => setIdentity('locMethod', v)}
            />

            <div className="rounded-xl shadow-card bg-surface-container-lowest p-lg">
              <div className="mb-md flex items-center gap-sm">
                <Icon name="calendar_month" className="text-primary" />
                <p className="flex-1 font-caption text-caption uppercase tracking-widest text-on-surface-variant">
                  Loc Anniversary
                </p>
              </div>
              <input
                type="date"
                max={todayKey()}
                value={identity.locStartISO?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  update({
                    identity: { ...identity, locStartISO: e.target.value || undefined },
                  })
                }
                aria-label="The date you started your locs"
                className="w-full rounded-lg border-outline-variant bg-surface-container-low font-body-md text-body-md text-on-surface"
              />
              {stageInfo.ageMonths !== undefined && (
                <p className="mt-sm font-caption text-caption text-on-surface-variant">
                  {formatLocAge(stageInfo.ageMonths)} in.
                </p>
              )}
            </div>

            <div className="rounded-xl shadow-card bg-surface-container-lowest p-lg">
              <div className="mb-sm flex items-center gap-sm">
                <Icon name="trending_up" className="text-primary" />
                <p className="flex-1 font-caption text-caption uppercase tracking-widest text-on-surface-variant">
                  Stage
                </p>
              </div>
              <p className="mb-md font-caption text-caption text-on-surface-variant">
                {stageInfo.stage && stageInfo.estimated
                  ? `Estimated from your start date as ${stageInfo.stage}. Stages vary by months either way — set it yourself if that is wrong.`
                  : 'How far along your locs actually are. You can see them; the estimate cannot.'}
              </p>
              <div className="flex flex-wrap gap-sm">
                {LOC_STAGES.map((stage) => {
                  const chosen = identity.locStage === stage
                  const guessed = !identity.locStage && stageInfo.stage === stage
                  return (
                    <button
                      key={stage}
                      type="button"
                      aria-pressed={chosen}
                      onClick={() => setIdentity('locStage', stage)}
                      className={`rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                        chosen
                          ? 'bg-secondary-container text-on-secondary-container'
                          : guessed
                            ? 'border border-dashed border-primary text-primary'
                            : 'bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {stage}
                    </button>
                  )
                })}
              </div>
            </div>

            <LocCadenceNote
              weeks={retwistWeeks(identity.locMethod, stageInfo.stage)}
              method={identity.locMethod}
            />
          </div>
        </section>
      )}

      <section className="mb-2xl">
        <h3 className="mb-md font-headline-md text-body-lg font-bold text-on-surface">
          Hair Profile
        </h3>
        <div className="space-y-md">
          {SHARED_FIELDS.map((field) => (
            <ChipField
              key={field.key}
              label={locs && field.locLabel ? field.locLabel : field.label}
              icon={field.icon}
              options={field.options}
              value={identity[field.key] as string | undefined}
              onSelect={(v) => setIdentity(field.key, v)}
              via={field.via}
              hint={field.hint}
              describe={field.describe}
            />
          ))}
        </div>
      </section>

      <section className="mb-2xl">
        <h3 className="mb-xs font-headline-md text-body-lg font-bold text-on-surface">
          Care Preferences
        </h3>
        <p className="mb-md font-caption text-caption text-on-surface-variant">
          The first three are enforced — a suggestion that breaks one is dropped before you
          see it.
        </p>
        <div className="flex flex-wrap gap-sm">
          {(Object.keys(PREFERENCE_LABELS) as (keyof CarePreferences)[]).map((key) => {
            const on = preferences[key]
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => togglePreference(key)}
                className={`flex items-center gap-xs rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                  on
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <Icon
                  name={on ? 'check_circle' : 'radio_button_unchecked'}
                  filled={on}
                  className="text-[16px]"
                />
                {PREFERENCE_LABELS[key]}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-2xl">
        <div className="mb-xs flex items-center justify-between">
          <h3 className="font-headline-md text-body-lg font-bold text-on-surface">
            Product Shelf
          </h3>
          <Link
            to="/products"
            className="flex items-center gap-xs font-label-md text-caption text-primary active:scale-95"
          >
            <Icon name="storefront" className="text-[16px]" />
            Browse
          </Link>
        </div>
        <p className="mb-md font-caption text-caption text-on-surface-variant">
          What you already own. The guides work with these before suggesting anything new.
        </p>
        {shelf.length === 0 ? (
          <Link
            to="/products"
            className="flex flex-col items-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container/50 p-xl text-center active:scale-[0.99]"
          >
            <Icon name="storefront" className="text-3xl text-outline" />
            <span className="font-body-md text-body-md text-on-surface-variant">
              Nothing on the shelf yet
            </span>
            <span className="font-caption text-caption text-outline">
              Mark what you own on the products screen and it lands here
            </span>
          </Link>
        ) : (
          <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-xl shadow-card bg-surface-container-lowest">
            {shelf.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  aria-pressed={product.inUse}
                  onClick={() => toggleShelf(product.id)}
                  className="flex w-full items-center gap-md p-md text-left transition-colors active:scale-[0.99]"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      product.inUse
                        ? 'bg-inverse-surface text-inverse-on-surface'
                        : 'bg-surface-container-lowest text-on-surface shadow-card'
                    }`}
                  >
                    <Icon name={product.inUse ? 'check' : 'schedule'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body-md text-body-md text-on-surface">{product.name}</p>
                    <p className="font-caption text-caption text-on-surface-variant">
                      {product.role}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PlusStatus />
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function ChipField({
  label,
  icon,
  options,
  value,
  onSelect,
  via,
  hint,
  describe,
}: {
  label: string
  icon: IconName
  options: readonly string[]
  value: string | undefined
  onSelect: (value: string) => void
  via?: { to: string; cta: string }
  hint?: string
  describe?: (value: string) => string
}) {
  return (
    <div className="rounded-xl shadow-card bg-surface-container-lowest p-lg">
      <div className="mb-md flex items-center gap-sm">
        <Icon name={icon} className="text-primary" />
        <p className="flex-1 font-caption text-caption uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        {via && (
          <Link to={via.to} className="font-label-md text-caption text-primary underline">
            {via.cta}
          </Link>
        )}
      </div>
      {hint && (
        <p className="mb-md font-body-md text-caption text-on-surface-variant">{hint}</p>
      )}
      <div className="flex flex-wrap gap-sm">
        {options.map((option) => {
          const selected = value === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(option)}
              className={`rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                selected
                  ? 'bg-inverse-surface text-inverse-on-surface'
                  : 'bg-surface-container-lowest text-on-surface shadow-card'
              }`}
            >
              {describe ? describe(option) : option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The one piece of advice this screen gives rather than collects.
 *
 * It earns its place because over-retwisting is the single most common
 * way loc wearers damage their own hairline, and the moment someone has
 * just told us their method is the moment the number means something.
 */
function LocCadenceNote({
  weeks,
  method,
}: {
  weeks: number | undefined
  method: string | undefined
}) {
  if (!method) return null

  return (
    <div className="flex items-start gap-md rounded-xl bg-tertiary-fixed p-lg">
      <Icon name="shield" className="shrink-0 text-on-tertiary-fixed" />
      <div>
        <p className="mb-xs font-label-md text-label-md text-on-tertiary-fixed">
          {weeks ? `Retwist no more often than every ${weeks} weeks` : 'Freeform: no retwist schedule'}
        </p>
        <p className="font-body-md text-caption text-on-tertiary-fixed-variant">
          {weeks
            ? 'Tension damage at the follicle does not grow back. If a loc hurts after maintenance, it was too tight.'
            : 'Freeform is a method, not neglect. Washing and separating still matter; the root is simply left alone.'}
        </p>
        <Link
          to="/guide/loc-retwist"
          className="mt-sm inline-block font-label-md text-caption text-on-tertiary-fixed underline"
        >
          Read the retwist guide
        </Link>
      </div>
    </div>
  )
}
