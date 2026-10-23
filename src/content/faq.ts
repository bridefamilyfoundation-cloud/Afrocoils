/**
 * The questions people actually ask, rendered at `/faq` and searched by
 * Ask.
 *
 * Data rather than JSX so both read the same words: an answer Ask
 * quotes and the answer on the FAQ page cannot drift apart if there is
 * only one of it. Links are segments, not markup, so the page can draw
 * them inline and Ask can read the sentence around them as plain text.
 *
 * Every answer here has to stay true to the code. Three of them are
 * claims the app makes elsewhere — on About, in the privacy policy and
 * on the recommendations screen — so if one changes, they all change
 * together. An FAQ that quietly goes stale is worse than no FAQ: it is
 * the page people quote back at you.
 */

export type FaqSegment = string | { to: string; label: string } | { em: string }

export interface Faq {
  /** Stable, so `/faq?open=<id>` survives the list being reordered. */
  id: string
  q: string
  a: FaqSegment[]
  /** Other ways of asking it, for Ask. Never shown. */
  keys?: string
}

export const FAQS: Faq[] = [
  {
    id: 'data',
    q: 'Where is my data kept?',
    keys: 'where is my data stored|where is my information|who can see my data|is my data safe|do you collect data|do you sell my data|is my profile private|are my questions saved|do you read my questions|turn off sharing',
    a: [
      'Your hair profile, length history, calendar, photos and saved styles are kept on this phone, in one document, and nowhere else — there is no account, no sign-in and no server holding any of it. Uninstalling the app deletes it. Two things do leave the phone. The questions you type into Ask are sent anonymously — just the words and what Ask answered, with nothing from your profile and no identifier — so we can see what people ask and write the answers that are missing; they are kept for up to twelve months, and you can switch sharing off under About. And a style you deliberately contribute, covered in the last question. Both are in the ',
      { to: '/legal/privacy', label: 'privacy policy' },
      '. The app also asks our update server whether a newer version or update is out — a request that carries nothing about you, and that you can switch off under About.',
    ],
  },
  {
    id: 'ai',
    q: 'Is any of this AI-generated?',
    keys: 'is this ai|are the answers generated|are the pictures real|were the photos generated|who wrote this|is ask a chatbot',
    a: [
      'The words are not. Every guide, style and step was written by a person and ships inside the app. The style pictures are: each is an illustration generated before release to show the written style front, back and side, and nothing is generated on your phone. There is no chatbot, no generated advice and no model call behind any screen, which is also why the rescue flow works with the phone in aeroplane mode — usually where a hair emergency happens. What the app does is filter and rank content it already has against the profile you filled in. ',
      { to: '/ask', label: 'Ask' },
      ', the button at the bottom right of every screen, works the same way: it finds the answer people have written for your question, adds the lines written for your kind of hair, and points you to where you fix it, all on your phone. It never writes an answer of its own. Your question is shared anonymously so the team can write the answers people are missing — by people, not by a model — and you can switch that off under About.',
    ],
  },
  {
    id: 'loc-styles',
    q: 'Why are there no loc styles in the library?',
    keys: 'no styles for locs|styles page is empty|empty style library|where are the loc styles',
    a: [
      'Because nobody has contributed one yet. Every entry was written up by the person who wore it, and the app will not pad the shelf with loose-hair technique to hide the gap — on locs most of it does damage, since a loc is meant to be matted and cannot be detangled or re-set. Loc wearers do get the full care guides, which are written separately for them. If you wear locs, the shelf is waiting for ',
      { to: '/styles/submit', label: 'the first contribution' },
      '.',
    ],
  },
  {
    id: 'porosity-ranking',
    q: 'I set my porosity — why did the recommendations not change?',
    keys: 'recommendations did not change|porosity not working|why does porosity not matter',
    a: [
      'Because no style in the library declares a porosity yet, so there is nothing for yours to match against. The ranking today uses hair type (which excludes outright), the length band derived from your last length check, and your care preferences — and the ',
      { to: '/styles/recommended', label: 'recommendations screen' },
      ' says so rather than implying otherwise. Porosity is not wasted: it decides your product shelf and which care guides you are shown.',
    ],
  },
  {
    id: 'contribute',
    q: 'What happens when I contribute a style?',
    keys: 'is my style published|who sees my submission|withdraw my style|queued|sent',
    a: [
      'It is saved on your device first and marked ',
      { em: 'Queued' },
      ', then sent. If the send fails it stays queued and goes later, so a bad connection never costs you the write-up. Nothing is published automatically: every submission waits for a person to read it, because it carries your claim that the photographs are yours to give. You can withdraw one at any time, and doing so deletes its photos from the device too.',
    ],
  },
]

/** The answer as one plain string, for searching and quoting. */
export function faqText(faq: Faq): string {
  return faq.a
    .map((segment) =>
      typeof segment === 'string' ? segment : 'label' in segment ? segment.label : segment.em,
    )
    .join('')
}
