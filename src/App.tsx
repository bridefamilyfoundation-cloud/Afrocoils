import { Suspense, lazy } from 'react'
import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ScreenFallback from './components/ScreenFallback'
import Tour from './components/Tour'

/**
 * Screens are lazy-loaded so the first paint only ships the shell plus the
 * landing route, rather than every screen in the app. Vite emits one chunk per
 * screen; navigation fetches them on demand (and they are already on-device in
 * the APK, so there is no network cost there).
 *
 * HashRouter, not BrowserRouter: Capacitor serves the bundle over a custom
 * scheme with no server to rewrite deep-link paths, so history routing 404s on
 * reload. Hash routing behaves identically in the browser and the APK.
 */
const EmergencyScreen = lazy(() => import('./screens/EmergencyScreen'))
const QuickStyleScreen = lazy(() => import('./screens/QuickStyleScreen'))
const HairProblemScreen = lazy(() => import('./screens/HairProblemScreen'))
const LocCareScreen = lazy(() => import('./screens/LocCareScreen'))
const LocStylesScreen = lazy(() => import('./screens/LocStylesScreen'))
const HairCareScreen = lazy(() => import('./screens/HairCareScreen'))
const StylesScreen = lazy(() => import('./screens/StylesScreen'))
const StyleRecommendationsScreen = lazy(() => import('./screens/StyleRecommendationsScreen'))
const ThankYouScreen = lazy(() => import('./screens/ThankYouScreen'))
const FaqScreen = lazy(() => import('./screens/FaqScreen'))
const DocsScreen = lazy(() => import('./screens/DocsScreen'))
const NotFoundScreen = lazy(() => import('./screens/NotFoundScreen'))
const StyleDetailScreen = lazy(() => import('./screens/StyleDetailScreen'))
const SubmitStyleScreen = lazy(() => import('./screens/SubmitStyleScreen'))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'))
const GrowthScreen = lazy(() => import('./screens/GrowthScreen'))
const CalendarScreen = lazy(() => import('./screens/CalendarScreen'))
const ProductsScreen = lazy(() => import('./screens/ProductsScreen'))
const GuideScreen = lazy(() => import('./screens/GuideScreen'))
const PorosityScreen = lazy(() => import('./screens/PorosityScreen'))
const AboutScreen = lazy(() => import('./screens/AboutScreen'))
const LegalScreen = lazy(() => import('./screens/LegalScreen'))
const QuizScreen = lazy(() => import('./screens/QuizScreen'))
const AskScreen = lazy(() => import('./screens/AskScreen'))

export default function App() {
  return (
    <Router>
      {/* Outside Suspense, so a lazy screen loading between steps does
          not unmount the tour that navigated to it. */}
      <Tour />
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          {/* Tab-level screens: shared app bar, footer and bottom nav. */}
          <Route element={<AppLayout />}>
            {/* The rescue flow: a triage screen and the three doors it
                opens. `/` is the front page rather than this, so every
                link inside the app points here — the front page is for
                launching, not for navigating back to. */}
            {/* Hair SOS answers to three addresses and is the same
                screen at each: `/` is what a launch opens on, `/home` is
                what anyone typing the obvious URL expects, `/sos` is what
                the tab and every in-app link point at. It used to be two
                screens — a wordless cover outside AppLayout, then the
                triage — which spent a tap per launch and left the drawer
                with a "Home" that was none of the sections. Rendered at
                all three rather than redirected, so the address someone
                typed is the address they keep. */}
            <Route path="/" element={<EmergencyScreen />} />
            <Route path="/home" element={<EmergencyScreen />} />
            <Route path="/sos" element={<EmergencyScreen />} />
            <Route path="/sos/quick" element={<QuickStyleScreen />} />
            {/* Hair Care is its own section at /care. It was briefly a
                block on the Growth tab, which made one long page out of
                two jobs. Both older addresses still resolve. */}
            <Route path="/sos/care" element={<Navigate to="/care" replace />} />
            <Route path="/sos/problem" element={<HairProblemScreen />} />
            <Route path="/styles" element={<StylesScreen />} />
            {/* Before the :id route so the literals win, though the
                router would rank a static segment higher on its own. */}
            <Route path="/styles/submit" element={<SubmitStyleScreen />} />
            <Route path="/styles/submit/thanks" element={<ThankYouScreen />} />
            <Route path="/styles/recommended" element={<StyleRecommendationsScreen />} />
            <Route path="/styles/:id" element={<StyleDetailScreen />} />
            <Route path="/products" element={<ProductsScreen />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/care" element={<HairCareScreen />} />
            <Route path="/growth" element={<GrowthScreen />} />
            {/* Locs World is a section of its own, not a chapter of Hair
                Care: locs are a different thing to own, and filing them
                under general care is how a loc wearer ends up reading
                loose-hair technique. Drawer entry, no bottom-nav tab —
                four tabs is still the structure. */}
            <Route path="/locs" element={<LocCareScreen />} />
            <Route path="/locs/styles" element={<LocStylesScreen />} />

            {/* Pushed content routes keep the chrome so the user can still
                reach the tabs from a guide.

                None of these are in the drawer or the tab bar any more.
                Each one belongs to a section and is reached from it: the
                calendar and the product shelf above, guides, the
                porosity test and the quiz here. They keep their own
                routes so a link can still be shared and the back button
                still behaves. */}
            <Route path="/guide/:slug" element={<GuideScreen />} />
            <Route path="/porosity" element={<PorosityScreen />} />
            <Route path="/quiz" element={<QuizScreen />} />
            <Route path="/about" element={<AboutScreen />} />
            <Route path="/faq" element={<FaqScreen />} />
            {/* The whole app explained on one page, beside the FAQ under About.
                The welcome tour replays from here. */}
            <Route path="/docs" element={<DocsScreen />} />
            {/* Community tips folded into About; kept so old links resolve. */}
            <Route path="/community" element={<Navigate to="/about" replace />} />
            <Route path="/legal/:slug" element={<LegalScreen />} />
            {/* Ask: a question box over the app's own content, opened from
                the app bar on every screen. A way into the six sections,
                not a seventh, so it has no drawer entry and no tab. */}
            <Route path="/ask" element={<AskScreen />} />
          </Route>

          {/* Older links and saved shortcuts. */}
          <Route path="/welcome" element={<Navigate to="/" replace />} />
          {/* The assistant and the try-on visualiser were removed. Both
              are caught by the catch-all below rather than named here:
              they were never shareable links, only tabs and buttons
              inside the app, and all of those are gone with them. */}

          {/* A page, not a silent bounce to the front page: losing the
              address you typed and never being told it was wrong makes a
              mistyped link indistinguishable from a working one. It keeps
              the chrome, so the way out is the tab bar. */}
          <Route element={<AppLayout />}>
            <Route path="*" element={<NotFoundScreen />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  )
}
