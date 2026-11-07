import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BioCard from '../components/BioCard'
import Icon, { type IconName } from '../components/Icon'
import MembershipCard from '../components/MembershipCard'
import ScreenFallback from '../components/ScreenFallback'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'
import { useHairProfile } from '../lib/profile-store'
import { formatLocAge, resolveLocStage, retwistWeeks } from '../lib/locs'
import { todayKey } from '../lib/calendar'
import type {
  CarePreferences,
  Climate,
  HairIdentity,
  HairType,
  MemberStatus,
} from '../lib/types'
import {
  CLIMATES,
  CURL_FAMILIES,
  CURL_PATTERNS,
  DENSITIES,
  ENFORCED_PREFERENCES,
  HAIR_TEXTURES,
  HAIR_TYPES,
  LOC_METHODS,
  LOC_STAGES,
  LOC_TYPES,
  POROSITY_LEVELS,
  PREFERENCE_LABELS,
  RANKED_PREFERENCES,
  SCALP_CONDITIONS,
  curlPatternLabel,
  identityFieldsFor,
} from '../lib/types'

/**
 * My Hair Profile — answers first, editing one row at a time.
 *
 * This screen used to be every picker open at once: twenty-odd chip
 * groups, the quiz card and the full form competing for the same first
 * look, climate above hair type, and Products and Membership on the same
 * scroll. It now reads top-down as:
 *
 *   1. who you are (BioCard: photo and name),
 *   2. the at-a-glance card — what the app knows, what is missing, and
 *      the quiz as the way to fill it in,
 *   3. grouped rows, each showing its value and opening its chips on tap
 *      (one open at a time),
 *   4. two rows that are not hair facts — the product shelf and the
 *      membership — at the foot.
 *
 * Until hair type is set, the hair rows that hang off it are not shown:
 * the first question is the only one that matters, and the quiz asks it
 * anyway.
 *
 * Every row has an id that `?open=<id>` opens (Ask, Hair Care, the
 * calendar and Locs World link straight to the field they mean). The
 * fields edited here are the same `identity` fields the quiz writes —
 * keep the rows in step with `identityFieldsFor()`.
 */

/* ------------------------------------------------------------------ *
 * Copy
 * ------------------------------------------------------------------ */

const HAIR_TYPE_BLURB: Record<HairType, string> = {
  'Loose Natural': 'Type 4 coils worn loose — 4A, 4B or 4C.',
  Locs: 'Locs at any stage, from starter coils to rooted.',
}

const CLIMATE_HINT: Record<Climate, string> = {
  'Humid / tropical': 'Swelling, reversion and frizz. Sealing beats soaking.',
  'Dry / arid': 'Moisture leaves fast. Layer, then seal, and re-moisturise often.',
  'Cold / low humidity': 'Indoor heating strips moisture. Satin and heavier sealants.',
  Temperate: 'No strong seasonal pull in either direction.',
}

const MEMBER_SHORT: Record<MemberStatus, string> = {
  active: 'Active',
  'non-renewing': 'Cancelled',
  attention: 'Needs attention',
  cancelled: 'Cancelled',
  none: 'Not paid',
}

/** A trait picked from chips. `id` is the row id and the identity key. */
interface TraitField {
  id: keyof HairIdentity
  label: string
  /** Short name for the "Still to add" buttons. */
  short: string
  icon: IconName
  options: readonly string[]
  /** What the trait is, and what it changes. Always shown when open. */
  about: string
  /** Where to go when the user cannot tell which chip is theirs. */
  unsure: { to: string; label: string }
  describe?: (value: string) => string
  /** How the value reads on the closed row and the glance card. */
  summary?: (value: string) => string
}

const quizFor = (step: string) => ({ to: `/quiz?step=${step}`, label: 'Not sure? Answer one question' })

function traitFields(locs: boolean): TraitField[] {
  return [
    {
      id: 'curlPattern',
      label: locs ? 'Coil pattern (under the locs)' : 'Coil pattern',
      short: 'coil pattern',
      icon: 'waves',
      options: CURL_PATTERNS,
      about: `All Type 4 — ${CURL_FAMILIES[0].name.toLowerCase()}. The letter is how tight the coil is, A being the loosest.`,
      unsure: quizFor('curlPattern'),
      describe: (v) => curlPatternLabel(v as (typeof CURL_PATTERNS)[number]),
    },
    {
      id: 'porosity',
      label: 'Porosity',
      short: 'porosity',
      icon: 'science',
      options: POROSITY_LEVELS,
      about:
        'How readily your hair takes water in and lets it go. Drives almost every product decision.',
      unsure: { to: '/porosity', label: 'Not sure? Take the porosity test' },
      summary: (v) => `${v} porosity`,
    },
    {
      id: 'density',
      label: 'Density',
      short: 'density',
      icon: 'grass',
      options: DENSITIES,
      about:
        'How much hair is on your head, not how thick each strand is. Decides sectioning and product quantity.',
      unsure: quizFor('density'),
      summary: (v) => `${v} density`,
    },
    {
      id: 'texture',
      label: 'Strand texture',
      short: 'texture',
      icon: 'linear_scale',
      options: HAIR_TEXTURES,
      about:
        'How thick or wide one strand is — not how tightly it coils, and not how much of it you have.',
      unsure: quizFor('texture'),
      summary: (v) => `${v} strands`,
    },
  ]
}

const SCALP_FIELD: TraitField = {
  id: 'scalpCondition',
  label: 'Scalp',
  short: 'scalp',
  icon: 'spa',
  options: SCALP_CONDITIONS,
  about: 'How your scalp usually is between wash days. The product shelf and Ask read it.',
  unsure: quizFor('scalpCondition'),
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

  /**
   * Hair type is never cleared by tapping again: half the app is shown
   * or hidden by it, and a double-tap silently emptying it would drop
   * the user back into a generic app with no explanation.
   */
  function setHairType(value: HairType) {
    if (identity.hairType !== value) update({ identity: { ...identity, hairType: value } })
    window.setTimeout(() => setChosen(null), 220)
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
    if (value) known.push({ id: field.id, text: field.summary?.(value) ?? field.describe?.(value) ?? value })
  }

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
              Start with the hair quiz
            </h3>
            <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
              A few questions about what you can see on your own head. It fills in
              your hair details, and every answer can be changed later.
            </p>
            <Link
              to="/quiz"
              className="mb-md flex w-full items-center justify-center gap-sm rounded-full bg-secondary px-lg py-3 font-label-md text-label-md font-bold text-on-secondary transition-all active:scale-95"
            >
              <Icon name="auto_awesome" className="text-[18px]" />
              Take the hair quiz
            </Link>
            <p className="text-center font-caption text-caption text-on-surface-variant">
              Already know your hair? Choose your hair type below.
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
                      <button
                        type="button"
                        onClick={() => jump(item.id)}
                        className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-md py-1.5 font-label-md text-label-md text-on-surface shadow-card transition-all active:scale-95"
                      >
                        <Icon name="add" className="text-[16px]" />
                        {item.text}
                      </button>
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
              {complete ? 'Something changed? Retake the quiz' : 'Finish with the quiz'}
            </Link>
          </>
        )}
      </section>

      {/* ---- Your hair ------------------------------------------------- */}
      <RowGroup title="Your hair">
        <Row
          id="hairType"
          icon="face_3"
          label="Hair type"
          value={identity.hairType}
          open={open === 'hairType'}
          onToggle={toggle}
        >
          <p className="mb-md font-body-md text-caption text-on-surface-variant">
            This one changes the whole app — which styles you see, which guides, which
            products, and what the calendar tracks.
          </p>
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            {HAIR_TYPES.map((type) => {
              const selected = identity.hairType === type
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setHairType(type)}
                  className={`flex flex-col rounded-2xl p-md text-left transition-all active:scale-[0.98] ${
                    selected
                      ? 'bg-inverse-surface text-inverse-on-surface'
                      : 'bg-surface-container-lowest text-on-surface shadow-card'
                  }`}
                >
                  <span className="mb-xs flex items-center gap-sm">
                    <Icon name={type === 'Locs' ? 'grass' : 'waves'} filled={selected} />
                    <span className="font-headline-md text-body-lg">{type}</span>
                  </span>
                  <span
                    className={`font-body-md text-caption ${selected ? 'opacity-90' : 'text-on-surface-variant'}`}
                  >
                    {HAIR_TYPE_BLURB[type]}
                  </span>
                </button>
              )
            })}
          </div>
        </Row>

        {identity.hairType &&
          traits.map((field) => (
            <TraitRow
              key={field.id}
              field={field}
              value={identity[field.id] as string | undefined}
              open={open === field.id}
              onToggle={toggle}
              onSelect={(v) => setIdentity(field.id, v)}
            />
          ))}
      </RowGroup>

      {/* ---- Your locs: only for loc wearers --------------------------- */}
      {locs && (
        <RowGroup
          title="Your locs"
          note="Method and stage decide how often to retwist and what you can safely style."
        >
          <Row
            id="locType"
            icon="grass"
            label="Loc type"
            value={identity.locType}
            open={open === 'locType'}
            onToggle={toggle}
          >
            <Chips
              options={LOC_TYPES}
              value={identity.locType}
              onSelect={(v) => setIdentity('locType', v)}
            />
          </Row>
          <Row
            id="locMethod"
            icon="science"
            label="Started with"
            value={identity.locMethod}
            open={open === 'locMethod'}
            onToggle={toggle}
          >
            <Chips
              options={LOC_METHODS}
              value={identity.locMethod}
              onSelect={(v) => setIdentity('locMethod', v)}
            />
          </Row>
          <Row
            id="locStartISO"
            icon="calendar_month"
            label="Started on"
            value={
              identity.locStartISO && stageInfo.ageMonths !== undefined
                ? `${formatLocAge(stageInfo.ageMonths)} in`
                : identity.locStartISO?.slice(0, 10)
            }
            open={open === 'locStartISO'}
            onToggle={toggle}
          >
            <input
              type="date"
              max={todayKey()}
              value={identity.locStartISO?.slice(0, 10) ?? ''}
              onChange={(e) =>
                update({ identity: { ...identity, locStartISO: e.target.value || undefined } })
              }
              aria-label="The date you started your locs"
              className="w-full rounded-lg border-outline-variant bg-surface-container-low font-body-md text-body-md text-on-surface"
            />
          </Row>
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
          <TraitRow
            field={SCALP_FIELD}
            value={identity.scalpCondition}
            open={open === 'scalpCondition'}
            onToggle={toggle}
            onSelect={(v) => setIdentity('scalpCondition', v)}
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
            value={MEMBER_SHORT[profile.membership.status]}
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

function TraitRow({
  field,
  value,
  open,
  onToggle,
  onSelect,
}: {
  field: TraitField
  value: string | undefined
  open: boolean
  onToggle: (id: string) => void
  onSelect: (value: string) => void
}) {
  return (
    <Row
      id={field.id}
      icon={field.icon}
      label={field.label}
      value={value && (field.describe?.(value) ?? value)}
      open={open}
      onToggle={onToggle}
    >
      <p className="mb-md font-body-md text-caption text-on-surface-variant">{field.about}</p>
      <Chips options={field.options} value={value} onSelect={onSelect} describe={field.describe} />
      <Link
        to={field.unsure.to}
        className="mt-md inline-block font-label-md text-caption text-primary underline"
      >
        {field.unsure.label}
      </Link>
    </Row>
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
