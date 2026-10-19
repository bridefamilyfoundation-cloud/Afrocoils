import CODEPOINTS from './icon-codepoints.json'

/**
 * The set of icons the app may use, derived from the codepoint map.
 *
 * Separate from `Icon.tsx` so it can be imported without pulling in a
 * `.tsx` module. The content files (`styles.ts`, `products.ts`,
 * `guides.ts`) name an icon per entry and are read by the build scripts
 * as well as by screens, and the API's tsconfig has no `jsx` setting, so
 * resolving a type through a `.tsx` file there is a compile error. The
 * component itself still re-exports `IconName`, so every existing
 * `import { type IconName } from './Icon'` keeps working.
 */
export type IconName = keyof typeof CODEPOINTS

export default CODEPOINTS
