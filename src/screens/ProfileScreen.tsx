import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BioCard from '../components/BioCard'
import Icon, { type IconName } from '../components/Icon'
import MembershipCard from '../components/MembershipCard'
import { memberSummary } from '../lib/membership'
import ScreenFallback from '../components/ScreenFallback'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'
import { useHairProfile } from '../lib/profile-store'
import { formatLocAge, resolveLocStage, retwistWeeks } from '../lib/locs'
import type { CarePreferences, Climate, HairCondition, HairIdentity } from '../lib/types'
import {
  CLIMATES,
  ENFORCED_PREFERENCES,
  LOC_STAGES,
  PREFERENCE_LABELS,
  RANKED_PREFERENCES,
  identityFieldsFor,
} from '../lib/types'

/**
 * My Hair Profile — answers first.
 *
 * This screen used to be every picker open at once: twenty-odd chip
 * groups, the quiz card and the full form competing for the same first
 * look, climate above hair type, and Products and Membership on the same
 * scroll. It now reads top-down as:
 *
 *   1. who you are (BioCard: photo and name),
 *   2. the at-a-glance card — what the app knows, what is missing, and
 *      Hair Discovery as the way to fill it in,
 *   3. grouped rows, each showing its value: hair answers open their
 *      section of Hair Discovery, the rest open their chips on tap (one
 *      open at a time),
 *   4. two rows that are not hair facts — the product shelf and the
 *      membership — at the foot.
 *
 * Until hair type is set, the hair rows that hang off it are not shown.
 *
 * Every row has an id that `?open=<id>` scrolls to (Ask, Hair Care, the
 * calendar and Locs World link straight to the field they mean).
 *
 * The hair answers are not edited here. Since 2026-11-18 Hair Discovery
 * (`/quiz`) is the one place they are asked: each of those rows shows
 * its answer and opens that section of Discovery, which returns here.
 * What stays editable on this screen is what Discovery does not ask —
 * the loc stage override, climate, hard water, the rules, the shelf and
 * the membership. Keep the rows in step with `identityFieldsFor()`.
 */

/* ------------------------------------------------------------------ *
 * Copy
 * ------------------------------------------------------------------ */

const CLIMATE_HINT: Record<Climate, string> = {
  'Humid / tropical': 'Swelling, reversion and frizz. Sealing beats soaking.',
  'Dry / arid': 'Moisture leaves fast. Layer, then seal, and re-moisturise often.',
  'Cold / low humidity': 'Indoor heating strips moisture. Satin and heavier sealants.',
  Temperate: 'No strong seasonal pull in either direction.',
}

/** A trait Hair Discovery asks. `id` is the row id, the identity key and the step id. */
interface TraitField {
  id: keyof HairIdentity
  label: string
  /** Short name for the "Still to add" chips. */
  short: string
  icon: IconName
  /** How the value reads on the glance card. */
  summary?: (value: string) => string
}

const CONDITION_SUMMARY: Record<HairCondition, string> = {
  Healthy: 'Hair doing well',
  Dry: 'Hair feeling dry',
  Damaged: 'Some damage',
  'Breakage-prone': 'Breaking easily',
}

function traitFields(locs: boolean): TraitField[] {
  return [
    {
      id: 'curlPattern',
      label: locs ? 'Coil pattern (under the locs)' : 'Coil pattern',
      short: 'coil pattern',
      icon: 'waves',
    },
    { id: 'porosity', label: 'Porosity', short: 'porosity', icon: 'science', summary: (v) => `${v} porosity` },
    { id: 'density', label: 'Density', short: 'density', icon: 'grass', summary: (v) => `${v} density` },
    {
      id: 'texture',
      label: 'Strand thickness',
      short: 'strand thickness',
      icon: 'linear_scale',
      summary: (v) => `${v} strands`,
    },
  ]
}

const SCALP_FIELD: TraitField = {
  id: 'scalpCondition',
  label: 'Scalp',
  short: 'scalp',
  icon: 'spa',
  summary: (v) => `${v} scalp`,
}

/* ------------------------------------------------------------------ *
 * Screen
 * ------------------------------------------------------------------ */

export default function ProfileScreen() {
  const { profile, update, completeness, ready } = useHairProfile()
  const { identity, preferences, shelf, bio } = profile
  const locs = identity.hairType === 'Locs'
  const stageInfo = resolveLocStage(identity)

  // One row open at a time. `undefined` means "nothing chosen yet", which
  // opens hair type on an empty profile; `null` means the user closed it.
  const param = useOpenParam()
  const [chosen, setChosen] = useState<string | null | undefined>(param ?? undefined)
  // Ask's sheet can link here while this screen is already mounted.
  useEffect(() => {
    if (param) setChosen(param)
  }, [param])
  const open = chosen === undefined ? (identity.hairType ? null : 'hairType') : chosen
  useScrollToOpened(param ? `profile-${param}` : null, ready)

  const toggle = (id: string) => setChosen(open === id ? null : id)

  /** From the glance card: open the row and bring it into view. */
  function jump(id: string) {
    setChosen(id)
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById(`profile-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      ),
    )
  }

  function setIdentity(key: keyof HairIdentity, value: string | undefined) {
    // Tapping the selected chip again clears it — there is no "none"
    // option, so otherwise a mis-tap is permanent. Choosing a value
    // closes the row a beat later, the way the quiz advances; clearing
    // leaves it open so the user can pick again.
    const next = identity[key] === value ? undefined : value
    update({ identity: { ...identity, [key]: next } })
    if (next !== undefined) window.setTimeout(() => setChosen(null), 220)
  }

  function setClimate(value: Climate) {
    update({ bio: { ...bio, climate: bio.climate === value ? undefined : value } })
  }

  function togglePreference(key: keyof CarePreferences) {
    update({ preferences: { ...preferences, [key]: !preferences[key] } })
  }

  function toggleShelf(id: string) {
    update({ shelf: shelf.map((p) => (p.id === id ? { ...p, inUse: !p.inUse } : p)) })
  }

  if (!ready) return <ScreenFallback />

  const traits = traitFields(locs)
  const allTraits = [...traits, SCALP_FIELD]

  /* The glance card: what is known, in the order the rows run, and what
     is still missing — both lists drawn from `identityFieldsFor()` so the
     card, the meter and the quiz agree about what "done" means. */
  const fields = identityFieldsFor(identity.hairType)
  const known: { id: string; text: string }[] = []
  if (identity.hairType) known.push({ id: 'hairType', text: identity.hairType })
  if (locs) {
    if (identity.locType) known.push({ id: 'locType', text: `${identity.locType} locs` })
    if (stageInfo.stage) known.push({ id: 'locStage', text: `${stageInfo.stage} stage` })
  }
  for (const field of allTraits) {
    const value = identity[field.id] as string | undefined
    if (value) known.push({ id: field.id, text: field.summary?.(value) ?? value })
  }
  if (profile.state.condition) {
    known.push({ id: 'hairCondition', text: CONDITION_SUMMARY[profile.state.condition] })
  }
  const coilValue = identity.curlPattern
    ? [
        identity.curlPattern,
        ...(identity.curlPatterns ?? []).filter((p) => p !== identity.curlPattern),
      ].join(' + ')
    : undefined
  const scalpValue =
    [identity.scalpCondition, identity.scalpConcerns?.join(', ')].filter(Boolean).join(' · ') ||
    undefined
  const conditionValue =
    [
      profile.state.condition,
      profile.state.concerns?.length ? `${profile.state.concerns.length} to watch` : undefined,
    ]
      .filter(Boolean)
      .join(' · ') || undefined

  const LOC_SHORT: Partial<Record<keyof HairIdentity, string>> = {
    locType: 'loc type',
    locMethod: 'how they started',
    locStartISO: 'start date',
  }
  const missing: { id: string; text: string }[] = identity.hairType
    ? fields
        .filter((f) => identity[f] === undefined)
        .map((f) => ({
          id: f,
          text: allTraits.find((t) => t.id === f)?.short ?? LOC_SHORT[f] ?? f,
        }))
    : [{ id: 'hairType', text: 'hair type' }]
  const total = fields.length + 1
  const answered = Math.round(completeness * total)
  const empty = completeness === 0
  const complete = completeness >= 1

  const neverOn = ENFORCED_PREFERENCES.filter((k) => preferences[k])
  const preferOn = RANKED_PREFERENCES.filter((k) => preferences[k])

  return (
    <>
      <section data-tour="profile-heading" className="mb-lg text-center">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background">
          My Hair Profile
        </h2>
      </section>

      <BioCard />

      {/* ---- At a glance ---------------------------------------------- */}
      <section
        aria-label="Your hair at a glance"
        className="mb-2xl rounded-2xl bg-surface-container-lowest p-lg shadow-card"
      >
        {empty ? (
          <>
            <h3 className="mb-xs font-headline-md text-body-lg font-bold text-on-surface">
              Start with Hair Discovery
            </h3>
            <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
              Simple pictures, a few questions and things to check on your own Type 4
              hair. It fills in your hair details, and every answer can be changed later.
            </p>
            <Link
              to="/quiz"
              className="mb-md flex w-full items-center justify-center gap-sm rounded-full bg-secondary px-lg py-3 font-label-md text-label-md font-bold text-on-secondary transition-all active:scale-95"
            >
              <Icon name="auto_awesome" className="text-[18px]" />
              Start Hair Discovery
            </Link>
            <p className="text-center font-caption text-caption text-on-surface-variant">
              Every answer on this page comes from Hair Discovery, and each one can be
              changed on its own.
            </p>
          </>
        ) : (
          <>
            <ul className="mb-md flex flex-wrap gap-sm" aria-label="What the app knows">
              {known.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jump(item.id)}
                    className="rounded-full bg-inverse-surface px-md py-1.5 font-label-md text-label-md text-inverse-on-surface transition-all active:scale-95"
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>

            {!complete && (
              <>
                <div
                  className="mb-xs h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
                  role="progressbar"
                  aria-valuenow={Math.round(completeness * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Hair profile completeness"
                >
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-300"
                    style={{ width: `${completeness * 100}%` }}
                  />
                </div>
                <p className="mb-md font-caption text-caption text-on-surface-variant">
                  {answered} of {total} answered. Anything left blank, the app plays safe on.
                </p>
                <p className="mb-sm font-label-md text-label-md text-on-surface">Still to add</p>
                <ul className="mb-lg flex flex-wrap gap-sm">
                  {missing.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/quiz?step=${item.id}`}
                        className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-md py-1.5 font-label-md text-label-md text-on-surface shadow-card transition-all active:scale-95"
                      >
                        <Icon name="add" className="text-[16px]" />
                        {item.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <Link
              to="/quiz"
              className="flex items-center gap-sm font-label-md text-label-md text-primary underline active:scale-95"
            >
              <Icon name="auto_awesome" className="text-[18px]" />
              {complete ? 'Something changed? Run Hair Discovery again' : 'Finish with Hair Discovery'}
            </Link>
          </>
        )}
      </section>

      {/* ---- Your hair ------------------------------------------------- */}
      <RowGroup title="Your hair">
        <AnswerRow id="hairType" icon="face_3" label="Hair type" value={identity.hairType} />
        {identity.hairType &&
          traits.map((field) => (
            <AnswerRow
              key={field.id}
              id={field.id}
              icon={field.icon}
              label={field.label}
              value={field.id === 'curlPattern' ? coilValue : (identity[field.id] as string | undefined)}
            />
          ))}
      </RowGroup>

      {/* ---- Your locs: only for loc wearers --------------------------- */}
      {locs && (
        <RowGroup
          title="Your locs"
          note="Method and stage decide how often to retwist and what you can safely style."
        >
          <AnswerRow id="locType" icon="grass" label="Loc type" value={identity.locType} />
          <AnswerRow id="locMethod" icon="science" label="Started with" value={identity.locMethod} />
          <AnswerRow
            id="locStartISO"
            icon="calendar_month"
            label="Started on"
            value={
              identity.locStartISO && stageInfo.ageMonths !== undefined
                ? `${formatLocAge(stageInfo.ageMonths)} in`
                : identity.locStartISO?.slice(0, 10)
            }
          />
          <Row
            id="locStage"
            icon="trending_up"
            label="Stage"
            value={
              identity.locStage ??
              (stageInfo.stage ? `${stageInfo.stage} (estimated)` : undefined)
            }
            open={open === 'locStage'}
            onToggle={toggle}
          >
            <p className="mb-md font-body-md text-caption text-on-surface-variant">
              {stageInfo.stage && stageInfo.estimated
                ? `Estimated from your start date as ${stageInfo.stage} (the dashed one). Stages vary by months either way — choose yours if that is wrong.`
                : 'How far along your locs actually are. You can see them; the estimate cannot.'}
            </p>
            <div className="flex flex-wrap gap-sm">
              {LOC_STAGES.map((stage) => {
                const picked = identity.locStage === stage
                const guessed = !identity.locStage && stageInfo.stage === stage
                return (
                  <button
                    key={stage}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => setIdentity('locStage', stage)}
                    className={`rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                      picked
                        ? 'bg-inverse-surface text-inverse-on-surface'
                        : guessed
                          ? 'border border-dashed border-primary text-primary'
                          : 'bg-surface-container-lowest text-on-surface shadow-card'
                    }`}
                  >
                    {stage}
                  </button>
                )
              })}
            </div>
          </Row>
          <LocCadenceNote
            weeks={retwistWeeks(identity.locMethod, stageInfo.stage)}
            method={identity.locMethod}
          />
        </RowGroup>
      )}

      {/* ---- Scalp & surroundings -------------------------------------- */}
      {identity.hairType && (
        <RowGroup
          title="Scalp & surroundings"
          note="These change which products work. None of it leaves the phone."
        >
          <AnswerRow
            id={SCALP_FIELD.id}
            icon={SCALP_FIELD.icon}
            label={SCALP_FIELD.label}
            value={scalpValue}
          />
          <Row
            id="climate"
            icon="explore"
            label="Climate"
            value={bio.climate}
            open={open === 'climate'}
            onToggle={toggle}
          >
            <Chips options={CLIMATES} value={bio.climate} onSelect={(v) => setClimate(v as Climate)} />
            {bio.climate && (
              <p className="mt-md font-body-md text-caption text-on-surface-variant">
                {CLIMATE_HINT[bio.climate]}
              </p>
            )}
          </Row>
          {/* A switch, not a row that opens: it is yes or no. Kept apart
              from climate because hard water is plumbing, not weather. */}
          <SwitchRow
            id="hardWater"
            icon="water_drop"
            label="Hard water at home"
            detail="Limescale on the kettle and taps is the usual tell. It changes clarifying advice."
            on={bio.hardWater === true}
            onToggle={() => update({ bio: { ...bio, hardWater: !bio.hardWater } })}
          />
        </RowGroup>
      )}

      {/* ---- How it is doing: state, not identity ---------------------- */}
      {identity.hairType && (
        <RowGroup
          title="How your hair is doing"
          note="This one is meant to change. Update it whenever your hair does."
        >
          <AnswerRow
            id="hairCondition"
            icon="insights"
            label="Hair condition"
            value={conditionValue}
          />
        </RowGroup>
      )}

      {/* ---- Your rules ------------------------------------------------ */}
      <RowGroup title="Your rules">
        <Row
          id="rules"
          icon="block"
          label="Strict rules"
          value={neverOn.length ? neverOn.map((k) => PREFERENCE_LABELS[k]).join(' · ') : 'None'}
          open={open === 'rules'}
          onToggle={toggle}
        >
          <p className="mb-md font-body-md text-caption text-on-surface-variant">
            Always followed. A style or suggestion that breaks one of these is removed before
            you see it.
          </p>
          <Toggles keys={ENFORCED_PREFERENCES} preferences={preferences} onToggle={togglePreference} />
        </Row>
        <Row
          id="preferences"
          icon="favorite"
          label="Preferences"
          value={preferOn.length ? preferOn.map((k) => PREFERENCE_LABELS[k]).join(' · ') : 'None'}
          open={open === 'preferences'}
          onToggle={toggle}
        >
          <p className="mb-md font-body-md text-caption text-on-surface-variant">
            These move matching styles up the list. Nothing is hidden.
          </p>
          <Toggles keys={RANKED_PREFERENCES} preferences={preferences} onToggle={togglePreference} />
        </Row>
      </RowGroup>

      {/* ---- Not hair facts, so last: the shelf and the membership ------ */}
      <RowGroup title={profile.membership ? 'Products & membership' : 'Products'}>
        <Row
          id="shelf"
          icon="storefront"
          label="My product shelf"
          value={shelf.length ? `${shelf.length} ${shelf.length === 1 ? 'product' : 'products'}` : 'Empty'}
          open={open === 'shelf'}
          onToggle={toggle}
        >
          <p className="mb-md font-body-md text-caption text-on-surface-variant">
            What you already own. The guides work with these before suggesting anything new.
            Tap one to mark it in use.
          </p>
          {shelf.length > 0 && (
            <ul className="mb-md divide-y divide-outline-variant/30 overflow-hidden rounded-xl bg-surface-container-low">
              {shelf.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    aria-pressed={product.inUse}
                    onClick={() => toggleShelf(product.id)}
                    className="flex w-full items-center gap-md p-md text-left transition-colors active:scale-[0.99]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        product.inUse
                          ? 'bg-inverse-surface text-inverse-on-surface'
                          : 'bg-surface-container-lowest text-on-surface shadow-card'
                      }`}
                    >
                      <Icon name={product.inUse ? 'check' : 'schedule'} className="text-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-body-md text-body-md text-on-surface">{product.name}</span>
                      <span className="font-caption text-caption text-on-surface-variant">{product.role}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/products"
            className="inline-flex items-center gap-xs font-label-md text-label-md text-primary underline active:scale-95"
          >
            <Icon name="storefront" className="text-[16px]" />
            {shelf.length ? 'Browse products' : 'Mark what you own on the products screen'}
          </Link>
        </Row>
        {profile.membership && (
          <Row
            id="membership"
            icon="workspace_premium"
            label="Membership"
            value={memberSummary(profile.membership)}
            open={open === 'membership'}
            onToggle={toggle}
          >
            <MembershipCard embedded />
          </Row>
        )}
      </RowGroup>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

/** A heading over one white card of rows. */
function RowGroup({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mb-xl">
      <h3 className="mb-xs px-xs font-label-md text-label-md font-bold text-on-surface">{title}</h3>
      {note && (
        <p className="mb-sm px-xs font-caption text-caption text-on-surface-variant">{note}</p>
      )}
      <div className="divide-y divide-outline-variant/30 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card">
        {children}
      </div>
    </section>
  )
}

/**
 * One fact: its label and current value on a single line, and its
 * editor underneath when open. The value is the point of the closed
 * row — a profile you can read without opening anything.
 */
function Row({
  id,
  icon,
  label,
  value,
  open,
  onToggle,
  children,
}: {
  id: string
  icon: IconName
  label: string
  value: string | undefined
  open: boolean
  onToggle: (id: string) => void
  children: ReactNode
}) {
  const panel = `profile-${id}-panel`
  return (
    <div id={`profile-${id}`} className="scroll-mt-24">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-md px-lg py-md text-left transition-colors active:bg-surface-container-low"
      >
        <Icon name={icon} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1 font-body-md text-body-md text-on-surface">{label}</span>
        <span
          className={`max-w-[50%] truncate text-right font-label-md text-label-md ${
            value ? 'text-on-surface' : 'text-secondary'
          }`}
        >
          {value ?? 'Add'}
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="shrink-0 text-outline" />
      </button>
      {open && (
        <div id={panel} className="px-lg pb-lg">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * An answer Hair Discovery owns: its value, and the way into that one
 * section of Discovery to change it. The profile stopped asking these
 * questions itself on the owner's instruction (2026-11-18): one place
 * asks, with pictures and something to check, so an answer means the
 * same thing whoever gave it. The section returns here with the row in
 * view.
 */
function AnswerRow({
  id,
  icon,
  label,
  value,
}: {
  id: string
  icon: IconName
  label: string
  value: string | undefined
}) {
  return (
    <div id={`profile-${id}`} className="scroll-mt-24">
      <Link
        to={`/quiz?step=${id}`}
        aria-label={`${label}: ${value ?? 'not answered'}. Change it in Hair Discovery`}
        className="flex w-full items-center gap-md px-lg py-md text-left transition-colors active:bg-surface-container-low"
      >
        <Icon name={icon} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1 font-body-md text-body-md text-on-surface">{label}</span>
        <span
          className={`max-w-[55%] truncate text-right font-label-md text-label-md ${
            value ? 'text-on-surface' : 'text-secondary'
          }`}
        >
          {value ?? 'Add'}
        </span>
        <Icon name="chevron_right" className="shrink-0 text-outline" />
      </Link>
    </div>
  )
}

/** Single choice. Selected is espresso, everywhere on this screen. */
function Chips({
  options,
  value,
  onSelect,
  describe,
}: {
  options: readonly string[]
  value: string | undefined
  onSelect: (value: string) => void
  describe?: (value: string) => string
}) {
  return (
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
  )
}

/** On/off preferences, drawn the same way as the chips. */
function Toggles({
  keys,
  preferences,
  onToggle,
}: {
  keys: readonly (keyof CarePreferences)[]
  preferences: CarePreferences
  onToggle: (key: keyof CarePreferences) => void
}) {
  return (
    <div className="flex flex-wrap gap-sm">
      {keys.map((key) => {
        const on = preferences[key]
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-xs rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
              on
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-lowest text-on-surface shadow-card'
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
  )
}

function SwitchRow({
  id,
  icon,
  label,
  detail,
  on,
  onToggle,
}: {
  id: string
  icon: IconName
  label: string
  detail: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div id={`profile-${id}`} className="scroll-mt-24">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className="flex w-full items-center gap-md px-lg py-md text-left transition-colors active:bg-surface-container-low"
      >
        <Icon name={icon} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block font-body-md text-body-md text-on-surface">{label}</span>
          <span className="block font-caption text-caption text-on-surface-variant">{detail}</span>
        </span>
        <span
          aria-hidden
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            on ? 'bg-inverse-surface' : 'bg-surface-container-high'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow-card transition-all ${
              on ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>
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
function LocCadenceNote({ weeks, method }: { weeks: number | undefined; method: string | undefined }) {
  if (!method) return null

  return (
    <div className="flex items-start gap-md bg-tertiary-fixed p-lg">
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
