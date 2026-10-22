import { useEffect } from 'react'
import { getGuide } from '../content/guides'
import { STYLES } from '../content/styles'

/**
 * A distinct `document.title` per screen.
 *
 * One map rather than a call in each of twenty screens, because a title
 * is a fact about a route and keeping them together is the only way to
 * see at a glance that no two are the same. Child effects run before
 * parent effects in React, so a screen setting its own title and a
 * layout setting another would fight and the layout would win — which
 * is the other reason this is derived from the path in one place.
 *
 * It matters for three things, none of which is decoration: the browser
 * tab and the Android recents card both show it, a screen reader
 * announces it on navigation, and the web build is a real page that gets
 * shared.
 */

const SUFFIX = 'AfroCoils'

/** Static routes. Dynamic ones are resolved below from their content. */
const TITLES: Record<string, string> = {
  // One screen at three addresses, so one title. Differing titles for
  // the same page is the kind of thing that quietly goes wrong.
  '/': `${SUFFIX} — Hair SOS for type 4 hair`,
  '/home': `${SUFFIX} — Hair SOS for type 4 hair`,
  '/sos': `${SUFFIX} — Hair SOS for type 4 hair`,
  '/sos/quick': `Quick hairstyles by the time you have · ${SUFFIX}`,
  '/sos/problem': `Hair problems and care guides · ${SUFFIX}`,
  '/styles': `Hair Styles · ${SUFFIX}`,
  '/styles/recommended': `Hairstyle recommendations for your hair · ${SUFFIX}`,
  '/styles/submit': `Contribute a style · ${SUFFIX}`,
  '/styles/submit/thanks': `Thank you · ${SUFFIX}`,
  '/care': `Hair Care · ${SUFFIX}`,
  '/growth': `Hair Growth · ${SUFFIX}`,
  '/locs': `Locs World · ${SUFFIX}`,
  '/locs/styles': `Loc styles · ${SUFFIX}`,
  '/calendar': `Hair calendar · ${SUFFIX}`,
  '/profile': `My Hair Profile · ${SUFFIX}`,
  '/quiz': `Hair quiz · ${SUFFIX}`,
  '/porosity': `Porosity test · ${SUFFIX}`,
  '/products': `Products for coily hair and locs · ${SUFFIX}`,
  '/about': `About ${SUFFIX}`,
  '/faq': `Frequently asked questions · ${SUFFIX}`,
  '/docs': `How the app works · ${SUFFIX}`,
  '/ask': `Ask a question · ${SUFFIX}`,
  '/legal/privacy': `Privacy policy · ${SUFFIX}`,
  '/legal/terms': `Terms of service · ${SUFFIX}`,
  '/legal/contact': `Contact us · ${SUFFIX}`,
}

/**
 * The title for a path, including the two routes whose title is content.
 *
 * Pure and exported so it can be read and tested on its own, rather than
 * only observable by mounting a screen and inspecting the document.
 */
export function titleForPath(pathname: string): string {
  const known = TITLES[pathname]
  if (known) return known

  const guide = pathname.startsWith('/guide/')
    ? getGuide(pathname.slice('/guide/'.length))
    : undefined
  if (guide) return `${guide.title} · ${SUFFIX}`

  if (pathname.startsWith('/styles/')) {
    const style = STYLES.find((s) => s.id === pathname.slice('/styles/'.length))
    if (style) return `${style.name} · ${SUFFIX}`
  }

  // Anything left is a route that does not exist, which is a page of its
  // own and says so.
  return `Page not found · ${SUFFIX}`
}

export function useDocumentTitle(pathname: string): void {
  useEffect(() => {
    document.title = titleForPath(pathname)
  }, [pathname])
}
