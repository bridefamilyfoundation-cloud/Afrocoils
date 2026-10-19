import { useMemo, useState } from 'react'
import Icon from './Icon'
import { hairCheckFor } from '../content/hair-check'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'
import { useHairProfile } from '../lib/profile-store'

/**
 * Quick Hair Check, the symptom-first section of Hair Problem.
 *
 * Twenty-four concerns under four headings someone completes out loud —
 * "my hair is… falling out", "my scalp is… flaky". Nothing here asks a
 * question the user has to interpret: the label *is* the symptom, and
 * the panel behind it says what it is, what it looks like, what to do,
 * and what to read on a label.
 *
 * One panel open at a time, like the FAQ. With twenty-four rows,
 * independent toggles turn the screen into a wall the moment somebody
 * opens three of them, and nothing here is meant to be compared
 * side-by-side — you have the symptom you have.
 *
 * The content, the hair-type filter and the medical cautions all live in
 * content/hair-check.ts. This file only draws them.
 *
 * `?open=<concern id>` opens one panel and scrolls to it — Ask lands
 * here that way. An id the hair-type filter has removed simply opens
 * nothing.
 */
export default function QuickHairCheck() {
  const { profile } = useHairProfile()
  const groups = useMemo(
    () => hairCheckFor(profile.identity.hairType),
    [profile.identity.hairType],
  )

  const requested = useOpenParam()
  const shown =
    requested && groups.some((g) => g.concerns.some((c) => c.id === requested)) ? requested : null
  const [open, setOpen] = useState<string | null>(shown)
  useScrollToOpened(shown ? `check-row-${shown}` : null)

  return (
    <section className="mb-2xl">
      <h3 className="mb-sm font-headline-md text-body-lg font-bold text-on-surface">
        Quick hair check
      </h3>
      <p className="mb-xs font-headline-md text-body-lg text-on-surface">
        Not sure what your hair needs?
      </p>
      <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
        Tell us what you&rsquo;re experiencing and we&rsquo;ll help you understand your hair
        concern, what may be causing it, what you can do, and what ingredients to look for.
      </p>

      {groups.map((group) => (
        <div key={group.id} className="mb-lg">
          <h4 className="mb-sm font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
            {group.heading}
          </h4>

          <div className="space-y-sm">
            {group.concerns.map((concern) => {
              const isOpen = open === concern.id
              return (
                <article
                  key={concern.id}
                  id={`check-row-${concern.id}`}
                  className="scroll-mt-24 overflow-hidden rounded-xl shadow-card bg-surface-container-lowest"
                >
                  <h5>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`check-${concern.id}`}
                      onClick={() => setOpen(isOpen ? null : concern.id)}
                      className="flex w-full items-center gap-md p-lg text-left transition-colors active:scale-[0.99]"
                    >
                      <span className="flex-1 font-headline-md text-body-lg text-on-surface">
                        {concern.label}
                      </span>
                      <Icon
                        name={isOpen ? 'expand_less' : 'expand_more'}
                        className="shrink-0 text-outline"
                      />
                    </button>
                  </h5>

                  <div id={`check-${concern.id}`} hidden={!isOpen} className="px-lg pb-lg">
                    <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
                      {concern.problem}
                    </p>

                    <h6 className="mb-sm font-label-md text-caption uppercase tracking-widest text-primary">
                      Signs
                    </h6>
                    <ul className="mb-lg space-y-xs">
                      {concern.signs.map((sign) => (
                        <li
                          key={sign}
                          className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant"
                        >
                          {/* leading matched to the text's line box, so the
                              bullet sits on the first line when one wraps. */}
                          <Icon
                            name="radio_button_unchecked"
                            className="shrink-0 text-[14px] leading-6 text-outline"
                          />
                          <span>{sign}</span>
                        </li>
                      ))}
                    </ul>

                    <h6 className="mb-sm font-label-md text-caption uppercase tracking-widest text-primary">
                      What you can do
                    </h6>
                    <ul className="mb-lg space-y-xs">
                      {concern.solutions.map((solution) => (
                        <li
                          key={solution}
                          className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant"
                        >
                          <Icon
                            name="check"
                            className="shrink-0 text-[16px] leading-6 text-primary"
                          />
                          <span>{solution}</span>
                        </li>
                      ))}
                    </ul>

                    {concern.ingredients && (
                      <>
                        <h6 className="mb-sm font-label-md text-caption uppercase tracking-widest text-primary">
                          Look for in products
                        </h6>
                        {/* Ingredients, never brands — the label, not the
                            shelf. content/products.ts is the one file that
                            names a brand and it stays that way. */}
                        <ul className="flex flex-wrap gap-xs">
                          {concern.ingredients.map((ingredient) => (
                            <li
                              key={ingredient}
                              className="rounded-full bg-surface-container-high px-md py-1 font-body-md text-caption text-on-surface"
                            >
                              {ingredient}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {/* Hair loss, bald patches, a receding hairline and
                        scalp bumps are medical before they are cosmetic.
                        The caution is the content, not a disclaimer bolted
                        on — it is why some entries carry no shopping list
                        at all. */}
                    {concern.caution && (
                      <p
                        className={`flex items-start gap-sm rounded-xl bg-error-container p-md font-body-md text-caption text-on-error-container ${
                          concern.ingredients ? 'mt-md' : ''
                        }`}
                      >
                        <Icon name="info" className="shrink-0 text-[16px] leading-4" />
                        <span>{concern.caution}</span>
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
