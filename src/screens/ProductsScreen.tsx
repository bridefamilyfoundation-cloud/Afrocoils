import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionCrumb from '../components/SectionCrumb'
import Icon from '../components/Icon'
import ScreenFallback from '../components/ScreenFallback'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'
import { useHairProfile } from '../lib/profile-store'
import { resolveLocStage } from '../lib/locs'
import {
  AVOID_LIST,
  CATEGORY_ICONS,
  PRODUCTS,
  PRODUCT_CATEGORIES,
  rankProducts,
  type Product,
  type ProductCategory,
  type RankedProduct,
} from '../content/products'

/**
 * The product shelf.
 *
 * A written, reviewable list of real brands, which is the only kind of
 * product advice this app will give. Nothing here was generated: a
 * plausible-sounding bottle is indistinguishable from a real one until
 * you are standing in the shop, and "confidently named a discontinued
 * formula" is the failure mode that would cost a reader money.
 *
 * There are also no product photographs here, and that is a decision
 * rather than an omission: the app has no licence to a brand's packaging
 * shots, and an invented one would be a fabricated product photo.
 * Category tiles instead.
 *
 * Nothing here is sponsored and nothing links out to a shop.
 */

type Filter = ProductCategory | 'All'

export default function ProductsScreen() {
  const { profile, update, ready } = useHairProfile()
  // `?open=<category>` lands on one shelf, `?open=avoid` on the list of
  // things to leave in the shop — how Ask points here.
  const requested = useOpenParam()
  const [active, setActive] = useState<Filter>(() =>
    PRODUCT_CATEGORIES.find((c) => c === requested) ?? 'All',
  )
  useScrollToOpened(
    requested === 'avoid'
      ? 'products-avoid'
      : PRODUCT_CATEGORIES.some((c) => c === requested)
        ? 'products-shelf'
        : null,
    ready,
  )

  const { identity, preferences, savedProducts, shelf } = profile
  const locStage = resolveLocStage(identity).stage

  const ranked = useMemo(
    () =>
      rankProducts(
        PRODUCTS,
        {
          hairType: identity.hairType,
          porosity: identity.porosity,
          density: identity.density,
          curlPattern: identity.curlPattern,
          scalpCondition: identity.scalpCondition,
          locStage: identity.hairType === 'Locs' ? locStage : undefined,
        },
        preferences,
      ),
    [identity, preferences, locStage],
  )

  const hiddenCount = PRODUCTS.length - ranked.length

  function toggleSaved(id: string) {
    update({
      savedProducts: savedProducts.includes(id)
        ? savedProducts.filter((p) => p !== id)
        : [...savedProducts, id],
    })
  }

  /**
   * "I own this" writes through to the product shelf, which is the list
   * the rest of the app reads. Saving alone does not — a wishlist read
   * as owned would have the app building routines around bottles the
   * user has never bought.
   */
  function toggleOwned(product: Product) {
    const shelfId = `product-${product.id}`
    const existing = shelf.find((p) => p.id === shelfId)
    update({
      shelf: existing
        ? shelf.filter((p) => p.id !== shelfId)
        : [
            ...shelf,
            {
              id: shelfId,
              name: `${product.brand} ${product.name}`,
              role: product.role,
              inUse: true,
            },
          ],
    })
  }

  function owns(product: Product): boolean {
    return shelf.some((p) => p.id === `product-${product.id}`)
  }

  if (!ready) return <ScreenFallback />

  const recommended = ranked.filter((r) => r.score > 0).slice(0, 4)
  const visible = active === 'All' ? ranked : ranked.filter((r) => r.product.category === active)
  const saved = ranked.filter((r) => savedProducts.includes(r.product.id))

  // Only offer categories that survived the profile filter — a loc wearer
  // has no "Gel & Definer" shelf worth tapping into.
  const categories: Filter[] = [
    'All',
    ...PRODUCT_CATEGORIES.filter((c) => ranked.some((r) => r.product.category === c)),
  ]

  return (
    <>
      <section className="mb-xl text-center">
        <SectionCrumb to="/care" label="Hair Care" />
        <h2 className="mb-sm font-headline-lg text-headline-lg-mobile text-on-background">
          Products
        </h2>
        <p className="mx-auto max-w-md font-body-md text-body-md text-on-surface-variant">
          A short, opinionated shelf for coily hair and locs — filtered to your profile, with
          nothing sponsored and nothing to buy from here.
        </p>
      </section>

      <section className="mb-2xl flex items-start gap-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md">
        <Icon name="info" className="shrink-0 text-primary" />
        <p className="font-body-md text-caption text-on-surface-variant">
          Brands reformulate without renaming the bottle. Treat the silicone and protein notes
          here as a starting point and read the ingredients list on the one in your hand.
        </p>
      </section>

      {identity.hairType ? (
        recommended.length > 0 && (
          <section className="mb-2xl">
            <h3 className="mb-xs font-label-md text-label-md uppercase tracking-widest text-primary">
              For your hair
            </h3>
            <p className="mb-md font-caption text-caption text-on-surface-variant">
              Ranked against your profile
              {hiddenCount > 0 &&
                ` · ${hiddenCount} product${hiddenCount > 1 ? 's' : ''} hidden by your hair type and care preferences`}
            </p>
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              {recommended.map((r) => (
                <ProductCard
                  key={r.product.id}
                  ranked={r}
                  saved={savedProducts.includes(r.product.id)}
                  owned={owns(r.product)}
                  onSave={() => toggleSaved(r.product.id)}
                  onOwn={() => toggleOwned(r.product)}
                  showReasons
                />
              ))}
            </div>
          </section>
        )
      ) : (
        <section className="mb-2xl rounded-2xl bg-secondary-container p-lg">
          <div className="mb-sm flex items-center gap-sm">
            <Icon name="storefront" className="text-on-secondary-container" />
            <h3 className="font-headline-md text-headline-md text-on-secondary-container">
              Half of this list is not for you
            </h3>
          </div>
          <p className="mb-md font-body-md text-body-md text-on-secondary-container/90">
            Loc products and loose-hair products barely overlap. Tell us which you have and
            this shelf halves in size and doubles in usefulness.
          </p>
          <Link
            to="/profile"
            className="inline-block rounded-full bg-on-secondary-container px-lg py-2 font-label-md text-label-md text-secondary-container active:scale-95"
          >
            Set your hair type
          </Link>
        </section>
      )}

      {saved.length > 0 && (
        <section className="mb-2xl">
          <h3 className="mb-md font-label-md text-label-md uppercase tracking-widest text-primary">
            Saved
          </h3>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {saved.map((r) => (
              <ProductCard
                key={r.product.id}
                ranked={r}
                saved
                owned={owns(r.product)}
                onSave={() => toggleSaved(r.product.id)}
                onOwn={() => toggleOwned(r.product)}
              />
            ))}
          </div>
        </section>
      )}

      <section id="products-shelf" className="mb-lg scroll-mt-24">
        <div className="flex flex-wrap gap-sm">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={active === category}
              onClick={() => setActive(category)}
              className={`rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                active === category
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-surface-container-high text-on-surface'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-2xl grid grid-cols-1 gap-md sm:grid-cols-2">
        {visible.map((r) => (
          <ProductCard
            key={r.product.id}
            ranked={r}
            saved={savedProducts.includes(r.product.id)}
            owned={owns(r.product)}
            onSave={() => toggleSaved(r.product.id)}
            onOwn={() => toggleOwned(r.product)}
          />
        ))}
      </section>

      {/* What not to buy. Kept on the same screen as what to buy, because
          the two sit on the same shelf in the shop. */}
      <section id="products-avoid" className="mb-2xl scroll-mt-24">
        <div className="mb-md flex items-center gap-sm">
          <Icon name="block" className="text-error" />
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-error">
            What to leave on the shelf
          </h3>
        </div>
        <ul className="space-y-sm">
          {AVOID_LIST.filter(
            (item) => !item.forLocs || identity.hairType !== 'Loose Natural',
          ).map((item) => (
            <li
              key={item.what}
              className="rounded-xl border border-error/20 bg-error-container/30 p-md"
            >
              <p className="mb-xs font-label-md text-label-md text-on-error-container">
                {item.what}
              </p>
              <p className="font-body-md text-caption text-on-surface-variant">{item.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-primary-container p-xl text-center text-on-primary-container">
        <h3 className="mb-md font-headline-md text-headline-md">
          Working with what you already own
        </h3>
        <p className="mb-lg font-body-md text-body-md opacity-90">
          Anything you mark as owned lands on your product shelf, and the guides point at
          what you already have before anything you would need to buy.
        </p>
        <Link
          to="/profile"
          className="inline-block rounded-full bg-on-primary-container px-2xl py-3 font-label-md text-label-md text-primary-container active:scale-95"
        >
          See your shelf
        </Link>
      </section>
    </>
  )
}

function ProductCard({
  ranked,
  saved,
  owned,
  onSave,
  onOwn,
  showReasons,
}: {
  ranked: RankedProduct
  saved: boolean
  owned: boolean
  onSave: () => void
  onOwn: () => void
  showReasons?: boolean
}) {
  const { product, reasons } = ranked

  return (
    <article className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md">
      <div className="mb-sm flex items-start gap-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
          <Icon name={CATEGORY_ICONS[product.category]} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-caption text-caption uppercase tracking-widest text-on-surface-variant">
            {product.brand}
          </p>
          <h3 className="font-headline-md text-body-lg leading-tight text-on-surface">
            {product.name}
          </h3>
        </div>

        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
          onClick={onSave}
          className="-m-1 shrink-0 p-1 active:scale-90"
        >
          <Icon
            name={saved ? 'bookmark' : 'bookmark_border'}
            filled={saved}
            className={saved ? 'text-primary' : 'text-outline'}
          />
        </button>
      </div>

      <p className="mb-sm font-body-md text-caption text-on-surface-variant">{product.note}</p>

      <div className="mb-md flex flex-wrap gap-xs">
        <span className="rounded-full bg-surface-container-high px-2 py-1 font-caption text-caption text-on-surface">
          {product.role}
        </span>
        <span className="rounded-full bg-surface-container-high px-2 py-1 font-caption text-caption text-on-surface">
          {product.price}
        </span>
        {product.siliconeFree && (
          <span className="rounded-full bg-surface-container-high px-2 py-1 font-caption text-caption text-on-surface">
            silicone-free
          </span>
        )}
        {product.containsProtein && (
          <span className="rounded-full bg-secondary-fixed px-2 py-1 font-caption text-caption text-on-secondary-fixed">
            contains protein
          </span>
        )}
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

      <button
        type="button"
        aria-pressed={owned}
        onClick={onOwn}
        className={`mt-auto flex items-center justify-center gap-xs rounded-full py-2 font-label-md text-caption transition-colors active:scale-95 ${
          owned
            ? 'bg-secondary-container text-on-secondary-container'
            : 'border border-outline-variant text-on-surface-variant'
        }`}
      >
        <Icon
          name={owned ? 'check_circle' : 'radio_button_unchecked'}
          filled={owned}
          className="text-[16px]"
        />
        {owned ? 'On your shelf' : 'I own this'}
      </button>
    </article>
  )
}
