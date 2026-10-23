import type { HairType, Occasion } from '../lib/types'
import { PREFERENCE_LABELS, TIME_BANDS } from '../lib/types'

/**
 * What Ask knows that the rest of the app does not say outright.
 *
 * Ask answers by quoting the app — guides, the Quick Hair Check, Locs
 * World, the style library, the product shelf, the FAQ. Nothing it shows
 * is composed on the phone. This file holds the three things that make
 * the quoting work and that nobody would put on a screen:
 *
 * - **Vocabulary.** How people actually describe their hair ("my hair
 *   keeps coming out", "white bits on my scalp", "dreads") mapped to the
 *   ideas the guides are written in ("shedding", "flakes", "locs"). Both
 *   the question and every passage are tagged with the same ideas, so
 *   the two meet even when they share no words. This is most of what
 *   makes Ask feel like it understood; add a phrasing here when someone
 *   asks a question it missed, and add the question to the cases in
 *   `src/lib/ask/cases.ts` so it stays answered.
 * - **How-to topics.** Questions about the app itself ("how do I set a
 *   reminder?"). Each answer restates what the documentation page says,
 *   and links to the screen and to its docs section. If a screen moves,
 *   its topic moves with it — like the docs, every sentence here is a
 *   claim about the code.
 * - **The voice.** The handful of fixed lines Ask says around a quote:
 *   a greeting, an acknowledgement, the honest "I couldn't find that".
 *   They are written, chosen by rule, and never stitched into advice.
 *
 * The answers themselves stay where they were written. Nothing about
 * hair care belongs in this file.
 */

/* ------------------------------------------------------------------ *
 * Vocabulary
 *
 * One idea per row, then every way of saying it, separated by `|`.
 * Multi-word phrases match as phrases. Spelling variants are listed
 * rather than guessed — the typo tolerance in the engine catches slips,
 * not dialects.
 * ------------------------------------------------------------------ */

export const CONCEPTS: Record<string, string> = {
  // --- What is wrong ---
  shedding:
    'shed|shedding|sheds|falling out|fall out|falls out|coming out|comes out|hair loss|losing hair|losing my hair|lose hair|hair dropping|clumps of hair|hair in the shower|hair on my pillow|hair everywhere|strands coming out',
  breakage:
    'breakage|breaking|break|breaks|broken|snapping|snaps|snap|split ends|splitting|short pieces|broken hairs|brittle ends|weak ends|weak hair',
  thinning:
    'thin|thinning|thinner|sparse|see my scalp|visible scalp|less volume|losing volume|getting thin|not full|gone|disappeared|disappearing|vanished|missing',
  edges: 'edges|edge|hairline|temples|temple|baby hairs|front of my hair|nape|kitchen|back of my head|at the back',
  bald: 'bald|baldness|bald patch|bald patches|bald spot|bald spots|patchy|alopecia|receding|receding hairline|traction alopecia|gaps in my hairline',
  dryness:
    'dry|dryness|drying|brittle|straw|crunchy|rough|parched|thirsty|dehydrated|feels dry|no moisture|lacks moisture|hard to the touch',
  moisture:
    'moisture|moisturise|moisturize|moisturising|moisturizing|moisturiser|moisturizer|hydrate|hydrating|hydration|loc method|lco|leave in|leave-in|seal|sealing|sealant|water based|spritz|refresh',
  tangles:
    'tangle|tangles|tangled|tangling|knot|knots|knotted|matting|matted|fairy knots|single strand knots|ssk|detangle|detangling|detangler|comb through|hard to comb|combing',
  frizz: 'frizz|frizzy|puffy|fluffy|halo|flyaways|fuzz|fuzzy',
  definition:
    'definition|defined|define|undefined|curl clumps|clumping|wash and go|wash n go|wash & go|twist out|twistout|braid out|braidout|bantu knot out|curls not popping|limp curls|bounce|bouncing back|springy',
  shrinkage: 'shrinkage|shrink|shrinks|shrunk|stretch|stretched|stretching|banding|blow out|length check shrinkage',
  curls: 'curl|curls|curly|coil|coils|coily|kink|kinky|kinks|zigzag|4c|4b|4a|3c|3b|type 4|type 3|afro textured|afro-textured',
  // "Oily" is left out on purpose: it stems to "oil", and "which oil
  // should I use?" is a shopping question, not a greasy-scalp one. The
  // Quick Hair Check's "oily" entries still match on the word itself.
  greasy: 'greasy|grease build|sebum|limp|weighed down|heavy hair',
  itch: 'itch|itchy|itches|itching|scratch|scratching|scratchy|scratching my head|scratch my head',
  flakes:
    'dandruff|flake|flakes|flaky|flaking|white bits|white flakes|white stuff|scaly|scales|peeling|seborrheic|seborrhoeic|dermatitis',
  scalp: 'scalp|scalps|skin on my head',
  irritation:
    'irritated|irritation|irritating|burn|burning|burns|sting|stinging|red scalp|redness|inflamed|sensitive|sensitivity|tender|tender headed|tenderheaded|sore scalp',
  bumps:
    'bump|bumps|bumpy|pimple|pimples|spots on my scalp|boil|boils|pustule|pustules|folliculitis|lumps|lump|ingrown',
  buildup:
    'buildup|build up|build-up|residue|gunk|white residue|product build up|clarify|clarifying|clarifier|chelate|chelating|coated|film|lint|sticky|waxy',
  odour: 'smell|smells|smelly|smelling|odour|odor|stink|stinks|stinky|mildew|musty|damp smell|sour smell|bad smell',
  wash: 'wash|washing|washes|wash day|washday|shampoo|shampooing|cleanse|cleansing|cleanser|co wash|cowash|co-wash|rinse|rinsing',
  condition:
    'conditioner|condition|conditioning|deep condition|deep conditioning|deep conditioner|deep treatment|mask|masque|hair mask|steam|steaming|hot oil treatment',
  protein:
    'protein|proteins|protein treatment|protein overload|too much protein|mushy|gummy|overly soft|elasticity|elastic|stretchy|limp and soft|hard and stiff|stiff|strengthening|keratin|bonding',
  porosity:
    'porosity|porous|low porosity|high porosity|medium porosity|float test|strand test|products sit on top|water runs off|absorbs water|soaks up',
  density: 'density|dense|thick hair|thin hair|how much hair|full hair',
  texture: 'texture|strand width|fine hair|coarse hair|coarse|fine strands|medium texture',
  growth:
    'how fast does|how fast will|how quickly does|grow|grows|growing|growth|grow faster|longer|length|length retention|retain|retention|retaining|not growing|stuck at the same length|stopped growing|hair growth|grow my hair|grow back',
  night:
    'night|nighttime|night time|bedtime|bed|sleep|sleeping|satin|silk|bonnet|scarf|headscarf|durag|du rag|pillowcase|pillow|pineapple|pineappling',
  heat: 'heat|blow dry|blow dryer|blowdry|hair dryer|flat iron|straightener|straighten|straightening|press|pressed|silk press|heat damage|hooded dryer|curling iron|tongs',
  chemical:
    'relaxer|relaxed|relaxing|perm|perming|texturizer|texturiser|chemical|chemicals|bleach|bleached|dye|dyed|colour|color|coloured|colored|lighten',
  protective:
    'protective|protective style|protective styles|protective styling|braids|braid|box braids|knotless|twists|twist|two strand|two-strand|cornrow|cornrows|weave|weaves|weaving|wig|wigs|crochet|faux locs|extension|extensions|attachment|attachments|brazilian wool|threading|thread|wool|install',
  tension:
    'tight|too tight|tightly|tension|traction|pulling|pulled|pulls|headache|headaches|painful braids|braids hurt|style hurts|bumps around braids|how long can i keep|how long should i keep|how long can i leave|how long should i leave|how long to keep|how many weeks|take down|take out|takedown',
  hardWater: 'hard water|limescale|lime scale|calcium|minerals|mineral|borehole|well water|shower filter|chlorine|tap water|swimming pool',
  products:
    'product|products|brand|brands|buy|buying|purchase|shop|shopping|which shampoo|best shampoo|best conditioner|best oil|best cream|recommend a product|what should i use|what to use|what can i use|shelf',
  oils: 'oil|oils|coconut oil|castor oil|jamaican black castor oil|jbco|olive oil|jojoba|argan|rosemary oil|tea tree|peppermint oil|grapeseed|avocado oil',
  butters: 'shea|shea butter|butter|butters|cream|creams|hair food|pomade|hair grease',
  gel: 'gel|gels|edge control|curl cream|definer|custard|mousse|hold|styler|styling cream',
  ingredients:
    'ingredient|ingredients|silicone|silicones|sulphate|sulphates|sulfate|sulfates|paraben|parabens|mineral oil|petroleum|petrolatum|vaseline|alcohol|label|labels|formula',
  tools: 'comb|combs|brush|brushes|wide tooth comb|denman|detangling brush|spray bottle|microfibre|microfiber|t shirt|towel|rat tail comb',
  trim: 'trim|trims|trimming|cut my hair|cut it|haircut|hair cut|dusting|big chop|chop|scissors',
  style:
    'style|styles|styling|hairstyle|hairstyles|hair style|updo|bun|buns|puff|puffs|ponytail|afro|pack|packing|packed|shuku|plait|plaits|plaiting|do my hair|wear my hair|what to do with my hair',
  quick:
    'quick|quickly|fast|easy|simple|lazy|no time|in a hurry|hurry|running late|late|rush|rushing|short on time|minute|minutes|min|mins|hour|hours|last minute',
  medical:
    'dermatologist|trichologist|doctor|medical|hospital|infection|infected|pain|painful|hurts|hurting|blood|bleeding|bleed|pus|swollen|swelling|rash|sores|sore|scab|scabs|fever|ringworm|fungal|fungus',

  avoid:
    'avoid|avoiding|stay away from|keep away from|bad for|harmful|damaging|should not use|never use|not use|leave on the shelf|not recommended|dont use|do not use',

  // --- Who it is for ---
  locs: 'loc|locs|locks|dreadlock|dreadlocks|dread|dreads|sisterlocks|sisterlock|microlocs|microloc|locd|locced|locking|loced|freeform|freeforms|starter locs',
  loose: 'loose hair|loose natural|loose natural hair|loose curls|loose coils|not locs|no locs',
  retwist:
    'retwist|retwists|retwisting|re twist|re-twist|interlock|interlocking|interlocked|palm roll|palm rolling|fuzzy roots|frizzy roots',
  startLocs:
    'start locs|start my locs|starting locs|begin locs|begin my locs|get locs|getting locs|install locs|new locs|baby locs|starter locs|starter loc',
  /** Words that lean towards locs without settling it — they rank, never filter. */
  locMaintenance: 'maintenance|maintain|new growth|regrowth|tighten|tightening|roots',
  locStages: 'budding|buds|teen locs|teenage|mature|maturing|maturation|rooted|stage|stages|phase',
  unravel: 'unravel|unravelling|unraveling|coming loose|coming undone|undoing|slipping',

  // --- The app ---
  app: 'app|afrocoils|afro coils|afrocoil|afro coil|this app|screen|page|button|tab|menu|section|setting|settings',
  profile: 'profile|my profile|hair profile|my details|personal|my info',
  quiz: 'quiz|hair quiz|what hair type|which hair type|my hair type|hair type|what type of hair|type of hair',
  calendar:
    'calendar|routine|routines|schedule|scheduling|planner|plan|log|logging|track|tracking|history|due|next wash',
  reminder: 'reminder|reminders|remind|notify|notification|notifications|alert|alerts|alarm',
  measure: 'measure|measuring|measurement|length check|length checks|inches|inch|centimetres|centimeters|cm|ruler|tape|chart|milestone|milestones|progress',
  save: 'save|saved|saving|bookmark|bookmarks|favourite|favorite|favourites|favorites',
  contribute: 'contribute|contribution|submit|submission|share|sharing|upload|post my style|add my style|add a style',
  privacy: 'privacy|private|data|my data|information|collect|collected|tracking me|track me|stored|store|account|sign in|login|log in|password|delete|deleted|erase|uninstall',
  offline: 'offline|no signal|no internet|without internet|aeroplane|airplane|flight mode|data connection|wifi|wi fi',
  update: 'update|updates|updating|new version|latest version|upgrade|download',
  tour: 'tour|walkthrough|walk through|tutorial|guide me|show me around|introduction|onboarding',
  contact: 'contact|email|support|reach|feedback|complain|complaint|report a problem|bug',
  generated: 'ai|a i|artificial intelligence|generated|chatbot|bot|robot|model|gpt|chatgpt',
  shopping:
    'should i use|should i buy|can i use|could i use|do you recommend|recommend a|recommend me|best|which brand|what brand|good brand|worth buying|where to buy|which one|what product|which product',
  recommend: 'recommend|recommended|recommendation|recommendations|suggest|suggestion|suggestions|ranked|ranking|for me|suit me|suits me|match me',
}

/**
 * Ideas that settle a question as being about locs: any of them and Ask
 * answers for locs, whatever the profile says, because that is what was
 * asked. Only unambiguous words belong here — "maintenance" is also a
 * loose-hair style category, so it ranks (`locMaintenance`) but never
 * decides.
 */
export const LOC_CONCEPTS = ['locs', 'retwist', 'startLocs']

/** Ideas that make loc content more likely without deciding the hair type. */
export const LOC_LEANING = ['locStages', 'unravel', 'locMaintenance']

/** Ideas that make a question about a style rather than a problem. */
export const STYLE_CONCEPTS = ['style', 'protective', 'quick']

/** Ideas that make a question about buying or using a product. */
export const PRODUCT_CONCEPTS = ['products', 'oils', 'butters', 'gel', 'ingredients', 'tools']

/** Ideas that make a question about the app rather than about hair. */
export const APP_CONCEPTS = [
  'app',
  'profile',
  'quiz',
  'calendar',
  'reminder',
  'measure',
  'save',
  'contribute',
  'privacy',
  'offline',
  'update',
  'tour',
  'contact',
  'generated',
  'recommend',
]

/**
 * Words that mean the person is worried, not just curious. They change
 * the opening line, never the answer.
 */
export const DISTRESS =
  'help|urgent|emergency|asap|panic|panicking|scared|worried|worry|ruined|ruin|destroyed|disaster|terrible|awful|horrible|hate|crying|desperate|freaking|stressed|stress|why is my|what is wrong|whats wrong|keeps|so much|too much|everywhere'

/**
 * Words that make a question medical before it is cosmetic. When one
 * appears, Ask leads with the line below and ranks the entries that
 * carry a caution higher — the same escalation the Quick Hair Check and
 * the documentation already make.
 */
export const RED_FLAGS =
  'bleeding|blood|bleed|pus|infection|infected|swollen|swelling|fever|rash|sores|scab|scabs|ringworm|fungal|fungus|bald patch|bald patches|bald spot|bald spots|alopecia|painful|pain|burning|burns|chemical burn|hair falling out in clumps|clumps'

/**
 * Words that say a question is about something other than hair. They
 * are never "corrected" into a hair word ("joke" is not a typo for
 * "job"), and a question with one of these and no hair idea in it gets
 * the calm off-topic line rather than the nearest guide. A question
 * that also names hair ("my curls in humid weather") is unaffected.
 */
export const OFF_TOPIC =
  'joke|jokes|funny|laugh|weather|forecast|rain|news|football|soccer|match|score|song|songs|music|movie|movies|film|series|recipe|recipes|cook|cooking|food|eat|president|politics|election|government|homework|maths|math|bitcoin|crypto|stock|stocks|money|loan|boyfriend|girlfriend|marry|marriage|religion|bible|quran|capital|country|history|science|physics|quantum|code|coding|programming|computer|phone|game|games|time|clock'

/** Word for word from the documentation's "What it is not" section. */
export const SAFETY_LINE =
  'Sudden shedding, bald patches, persistent scalp pain or anything that is getting worse is a question for a dermatologist or a trichologist.'

/* ------------------------------------------------------------------ *
 * Occasions and time
 *
 * Reuses the app's own `Occasion` union, so "something for work" means
 * what the Styles screen means by it.
 * ------------------------------------------------------------------ */

export const OCCASION_WORDS: Record<Occasion, string> = {
  'Work/Professional':
    'work|office|job|interview|professional|meeting|corporate|business|presentation|workplace|shift',
  'Formal Event':
    'wedding|weddings|party|parties|event|events|formal|church|owambe|dinner|date|date night|graduation|prom|ceremony|birthday|function|occasion|reception|gala|engagement|naming ceremony|funeral',
  'Gym/Active':
    'gym|workout|work out|exercise|exercising|swim|swimming|run|running|jog|jogging|sport|sports|training|sweat|sweaty|football|netball|dance|dancing|hiking',
  'Casual Day':
    'casual|weekend|everyday|every day|school|class|lecture|uni|university|college|hangout|hang out|errands|chill|chilling|relaxed day|home',
}

/** Anything longer is not a quick hairstyle, the same cut-off Quick Hairstyle uses. */
export const QUICK_MAX_MINUTES = TIME_BANDS[TIME_BANDS.length - 1].max

/* ------------------------------------------------------------------ *
 * How-to topics — questions about the app itself
 * ------------------------------------------------------------------ */

export interface AskTopic {
  id: string
  title: string
  /** One or two sentences, restating what the documentation says. */
  answer: string
  /** Where "Open" goes. */
  route: string
  cta: string
  /** The documentation section that says it at length, if there is one. */
  docs?: string
  /** Phrasings that point here, beyond the words in the title and answer. */
  keys: string
  hairTypes?: HairType[]
}

const [ENFORCED, RANKED] = (() => {
  const labels = Object.values(PREFERENCE_LABELS)
  return [labels.slice(0, 3), labels.slice(3)]
})()

export const TOPICS: AskTopic[] = [
  {
    id: 'quiz',
    title: 'Find out your hair type',
    answer:
      'The hair quiz asks about what you can see on your own head and fills in your profile from it. Whether you have loose natural hair or locs is the one answer that changes most of the app.',
    route: '/quiz',
    cta: 'Take the hair quiz',
    docs: 'start',
    keys: 'what is my hair type|which hair type am i|not sure what hair i have|curl type|curl pattern|what curl pattern|4c or 4b|quiz|hair test|identify my hair',
  },
  {
    id: 'set-hair-type',
    title: 'Tell the app you have locs or loose hair',
    answer:
      'Set your hair type on My Hair Profile, or take the hair quiz. Until the app knows, every list is generic; once it does, loose-hair technique is never shown to a loc wearer.',
    route: '/profile',
    cta: 'Open My Hair Profile',
    docs: 'start',
    keys: 'change my hair type|set my hair type|switch to locs|i have locs now|i took my locs out|update my profile|edit my profile|change profile',
  },
  {
    id: 'porosity-test',
    title: 'Take the porosity test',
    answer:
      'Porosity has its own short test, under Hair Care. Your result decides your product shelf and which care guides you are shown.',
    route: '/porosity',
    cta: 'Take the porosity test',
    docs: 'care',
    keys: 'porosity test|test my porosity|check my porosity|what is my porosity|find my porosity|how do i know my porosity',
  },
  {
    id: 'length-check',
    title: 'Log a length check',
    answer:
      'On Hair Growth, measure stretched, from scalp to ends, in inches or centimetres. Two checks eight weeks apart is enough to see whether you are keeping what you grow; the chart and milestones build from there.',
    route: '/growth',
    cta: 'Open Hair Growth',
    docs: 'growth',
    keys: 'log my length|record my length|measure my hair|track my growth|track my length|how long is my hair|length check|growth chart|milestones|how fast is my hair growing|am i retaining',
  },
  {
    id: 'units',
    title: 'Switch between inches and centimetres',
    answer:
      'Length checks can be shown in inches or centimetres — choose on Hair Growth. Your measurements are kept the same underneath, so switching never changes them.',
    route: '/growth',
    cta: 'Open Hair Growth',
    docs: 'growth',
    keys: 'change to cm|change to inches|use centimetres|use centimeters|metric|units|unit',
  },
  {
    id: 'routine',
    title: 'Plan your hair routine',
    answer:
      'Hair routine is the calendar. Log wash days, deep conditioning, treatments, retwists, trims and installs, set how often each should happen, and the app works out what is due next.',
    route: '/calendar',
    cta: 'Open Hair routine',
    docs: 'care',
    keys: 'wash day schedule|how often should i wash|log a wash day|when is my next wash|routine planner|hair calendar|plan my routine|keep track of wash days|regimen',
  },
  {
    id: 'reminders',
    title: 'Set a reminder',
    answer:
      'Reminders are optional and set per routine in Hair routine. Turning one on is when the app asks for permission to notify you.',
    route: '/calendar',
    cta: 'Open Hair routine',
    docs: 'care',
    keys: 'remind me|set a reminder|turn on reminders|turn off reminders|stop notifications|notifications not working|wash day reminder|retwist reminder',
  },
  {
    id: 'products-shelf',
    title: 'Product recommendations',
    answer:
      'Product recommendations is a short shelf filtered to your porosity and preferences. It is the only place in the app that names brands, it has no product photos, and nothing on it is sponsored.',
    route: '/products',
    cta: 'Open the product shelf',
    docs: 'care',
    keys: 'product recommendations|recommend products|what products should i use|which products|products for my hair|product list|sponsored',
  },
  {
    id: 'preferences',
    title: 'Care preferences',
    answer: `On My Hair Profile, ${ENFORCED.join(', ')} are enforced, so anything that breaks one is removed before you see it. ${RANKED.join(' and ')} only change the order.`,
    route: '/profile',
    cta: 'Open My Hair Profile',
    docs: 'profile',
    keys: 'heatless|no heat|silicone free|protein sensitive|low manipulation|prefer protective|preferences|preference|filter out|hide products with',
  },
  {
    id: 'recommendations',
    title: 'How recommendations work',
    answer:
      'Nothing is generated. The app filters and ranks the content it already has, on your phone, using your profile: hair type is a hard filter, enforced care preferences remove clashing styles, and your latest length check only changes the order.',
    route: '/styles/recommended',
    cta: 'See styles recommended for you',
    docs: 'ranking',
    keys: 'how are styles recommended|why was this recommended|why is this style showing|why cant i see|why is the list empty|styles for me|recommended styles|what suits me',
  },
  {
    id: 'saved',
    title: 'Save a style',
    answer:
      'Bookmark a style on its page to keep it in the Saved row at the top of the library.',
    route: '/styles',
    cta: 'Browse styles',
    docs: 'styles',
    keys: 'save a style|bookmark a style|saved styles|my favourites|find my saved|where are my saved',
  },
  {
    id: 'my-styles',
    title: 'Keep photos of styles you have worn',
    answer:
      'My styles, on Hair Growth, holds styles you have actually worn, with your own photos. Any of them can be offered to the library.',
    route: '/growth',
    cta: 'Open Hair Growth',
    docs: 'growth',
    keys: 'my styles|my own styles|add photos|my photos|photo of my hair|picture of my hair|style diary|what i wore',
  },
  {
    id: 'contribute',
    title: 'Share a style with the library',
    answer:
      'Share a style from Hair Styles, or from one of your own under My styles. Give it a name, a category, the hair type it is for, the steps and your photos, and confirm that the photos are yours to give.',
    route: '/styles/submit',
    cta: 'Share a style',
    docs: 'contribute',
    keys: 'share my style|submit a style|contribute a style|add my hairstyle|post my hairstyle|upload my style',
  },
  {
    id: 'delete-data',
    title: 'Delete your data',
    answer:
      'Your profile, photos and history are stored on this phone and nowhere else, with no account to close. Uninstalling the app deletes everything on the phone. Questions you shared with Ask are anonymous, so they cannot be traced back to you; they are deleted after twelve months, and you can stop sharing under About.',
    route: '/legal/privacy',
    cta: 'Read the privacy policy',
    docs: 'data',
    keys: 'delete my data|delete my account|erase everything|remove my information|reset the app|start again|clear my profile',
  },
  {
    id: 'offline',
    title: 'Using the app with no signal',
    answer:
      'Everything you read ships inside the app, so it all works with no signal, including in aeroplane mode. Ask answers offline too.',
    route: '/docs?open=data',
    cta: 'Read about your data',
    docs: 'data',
    keys: 'does it work offline|without data|no network|no connection|internet needed|need internet',
  },
  {
    id: 'updates',
    title: 'Updating the app',
    answer:
      'When the app opens it asks our update server whether anything newer is out, carrying nothing about you. Most updates install in place: a sheet says one is ready, you tap Update now and the app restarts into it, with nothing to reinstall. A change to the app itself comes as a new version to download instead. Nothing installs on its own, and you can switch the check off on About.',
    route: '/about',
    cta: 'Open About',
    docs: 'updates',
    keys: 'update the app|new version|latest version|is there an update|update now|update is ready|turn off updates|stop update check|apk',
  },
  {
    id: 'tour',
    title: 'Replay the welcome tour',
    answer:
      'The tour is a one-minute walk through the six sections. Replay it any time from Documentation, at the foot of the menu.',
    route: '/docs',
    cta: 'Open Documentation',
    docs: 'start',
    keys: 'replay the tour|show me the tour|how does the app work|how do i use this app|getting started|new here|first time',
  },
  {
    id: 'navigation',
    title: 'Finding your way around',
    answer:
      'The app is six sections: Hair SOS, Hair Styles, Hair Care, Hair Growth, Locs World and My Hair Profile. The tab bar holds four of them; the menu, top left, lists all six.',
    route: '/docs?open=navigation',
    cta: 'Read how to find your way',
    docs: 'navigation',
    keys: 'where is|where can i find|how do i get to|cant find|lost|menu|tabs|sections|navigate|go back',
  },
  {
    id: 'loc-stage',
    title: 'Your loc stage and retwist routine',
    answer:
      'On your profile, set your loc type and the date you started, and the app works out your loc stage and your retwist routine.',
    route: '/profile',
    cta: 'Open My Hair Profile',
    docs: 'locs',
    keys: 'what stage are my locs|loc stage|my loc age|how old are my locs|when did i start my locs|loc start date|retwist schedule|retwist routine|how often should i retwist',
    hairTypes: ['Locs'],
  },
  {
    id: 'bio',
    title: 'Your name, photo and climate',
    answer:
      'About you, on My Hair Profile, is a name, a photo and your climate. None of it leaves your phone.',
    route: '/profile',
    cta: 'Open My Hair Profile',
    docs: 'profile',
    keys: 'change my name|change my photo|profile picture|profile photo|avatar|my climate|weather|humid|humidity|cold weather|hot weather|harmattan',
  },
  {
    id: 'quick-style',
    title: 'A hairstyle for the time you have',
    answer: `Quick Hairstyle, on Hair SOS, lets you pick how long you have (${TIME_BANDS.map((b) => b.label).join(', ')}) and shows the styles that fit, ranked against your profile, shortest first.`,
    route: '/sos/quick',
    cta: 'Open Quick Hairstyle',
    docs: 'sos',
    keys: 'quick hairstyle|quick style|no time to do my hair|fast style|style in minutes|running late',
  },
  {
    id: 'hair-check',
    title: 'Start from what is wrong',
    answer:
      'Something is wrong, under Hair Care, starts from the symptom — dryness, an itchy scalp, buildup, breakage — with the Quick Hair Check and the care guides.',
    route: '/sos/problem',
    cta: 'Open the Quick Hair Check',
    docs: 'care',
    keys: 'something is wrong with my hair|hair problem|hair problems|whats wrong with my hair|diagnose|hair check|symptoms|care guides',
  },
  {
    id: 'contact',
    title: 'Contact the people who make the app',
    answer: 'Contact is the way to reach the people who make it.',
    route: '/legal/contact',
    cta: 'Contact us',
    keys: 'contact you|email you|talk to someone|talk to a person|customer service|report a bug|send feedback|who made this',
  },
  {
    id: 'terms',
    title: 'Terms of service',
    answer: 'The terms of service are at the foot of the menu, beside the privacy policy.',
    route: '/legal/terms',
    cta: 'Read the terms',
    keys: 'terms|terms of service|terms and conditions|legal|rules',
  },
]

/* ------------------------------------------------------------------ *
 * The voice
 *
 * Fixed lines, picked by rule. Varied a little so a run of questions
 * does not open the same way every time; the pick is a hash of the
 * question, so asking the same thing twice reads the same way twice.
 * ------------------------------------------------------------------ */

/*
 * `, {name}` is the one slot in these lines: the person's first name
 * when the profile has one, removed cleanly when it does not. Nothing
 * else is ever put into a line.
 */
export const LEADS = {
  answer: [
    'Here’s what to do, {name}.',
    'Got you, {name}. Here’s the answer.',
    'Here’s the straight answer, {name}.',
  ],
  worried: [
    'That sounds stressful, {name}. Here’s what to do right now.',
    'Sorry you’re dealing with that, {name}. Let’s sort it out.',
    'Let’s fix this, {name}. Here’s what to do.',
  ],
  styles: [
    'Here are styles that fit, {name}.',
    'These will work, {name}. Tap one for the steps.',
  ],
  products: ['From your shelf, filtered to your profile, {name}:'],
  howTo: ['Here’s how to do that in the app, {name}.', 'That lives here, {name}.'],
  pending: [
    'Locs World has this down as a topic still being written, so there is no written answer yet. Here’s where it will be.',
  ],
  closest: [
    'This is the part of AfroCoils that covers it, {name}.',
    'Start here, {name}. It’s where the app covers this.',
  ],
} as const

/**
 * About hair, but nothing in the app answers it. It does not guess; it
 * points at the one screen that covers most problems. The question goes
 * to the review queue like every other (with sharing on), and this is
 * the outcome a study counts first.
 */
export const NOTHING_FOUND =
  'I don’t have a written answer for that one yet — and questions like yours are how new answers get written. For now, the Quick Hair Check covers most hair problems.'

/** Where a question with no written answer goes next. */
export const NONE_DOOR = { to: '/sos/problem', label: 'Open the Quick Hair Check' } as const

/**
 * Not about hair at all. Calm, short, and straight back to hair — no
 * lecture about what Ask is.
 */
export const NOT_UNDERSTOOD =
  'Ha — that one’s outside my lane. I only know hair. So, what’s your hair saying today?'

/**
 * The foot of every answer: one quiet link to the community the app has
 * today — the tips collected on About. There is no feed, and this does
 * not pretend there is one.
 */
export const COMMUNITY = { to: '/about', label: 'Still stuck? See what the community says' } as const

/** Said under the box, every time the box is shown, while sharing is on. */
export const SHARING_LINE =
  'Questions are shared anonymously to help us write better answers. Turn this off in About.'

/** Plain notes, kept beside the answer. */
export const NOTES = {
  hiddenForLocs:
    'The closest match is written for loose hair, and on locs that technique can do real damage, so I’ve left it out.',
  hiddenForLoose: 'The closest match is written for locs, so I’ve left it out for loose hair.',
  hiddenByPreference: 'A style that clashes with your care preferences was left out.',
  noHairType:
    'Tell the app whether you have loose hair or locs and every answer will be written for your hair.',
} as const

/**
 * Small talk: matched only when the whole question is one of these and
 * nothing in it is about hair. Each reply is honest about what Ask is.
 */
export const SMALL_TALK: { match: string; reply: string }[] = [
  {
    match:
      'hi|hello|hey|hiya|yo|good morning|good afternoon|good evening|morning|evening|howdy|hi there|hello there|sup|whats up',
    reply:
      'Hi, {name}! Tell me what’s going on with your hair — like “why is my hair breaking?”, “my scalp is itchy” or “a quick style for work”.',
  },
  {
    match: 'how are you|how are you doing|you good|how is it going|hows it going',
    reply: 'Doing well, thanks for asking, {name}! What’s going on with your hair today?',
  },
  {
    match:
      'thanks|thank you|thank u|thx|ty|cheers|thanks a lot|thank you so much|appreciate it|great|perfect|nice|cool|awesome|ok thanks|okay thanks|helpful|that helps',
    reply: 'You’re welcome, {name}! Ask again whenever your hair needs something.',
  },
  {
    match: 'bye|goodbye|see you|see ya|later|good night|goodnight',
    reply: 'Bye for now — look after that hair.',
  },
  {
    match:
      'who are you|what are you|are you ai|are you an ai|are you a bot|are you a robot|are you human|are you real|are you chatgpt|is this ai|is this chatgpt|what can you do|what do you do|how do you work|help',
    reply:
      'I’m Ask. I’m not AI and I don’t make answers up: everything I show you was written by people for AfroCoils and matched to your hair profile on your phone. Your question is shared anonymously, with nothing about you, so the team can write the answers people are missing — you can turn that off in About.',
  },
]

/* ------------------------------------------------------------------ *
 * Openers — shown on an empty Ask, per hair type
 *
 * Light on purpose: someone opening Ask mid-problem is usually stressed,
 * and a smile is a better start than a form. Every one of these must
 * still land on a real answer — each is a case in lib/ask/cases.ts, and
 * the phrasing it relies on is in that answer's `asks`. Four are shown.
 * ------------------------------------------------------------------ */

export const OPENER = 'What’s your hair saying?'
export const OPENER_SUB = 'Tell me like you’d tell a friend. I’m all ears (and edges).'

export const EXAMPLES: Record<HairType | 'unknown', string[]> = {
  'Loose Natural': [
    'My hair is giving straw',
    'My edges left the group chat',
    'Shrinkage stole my length',
    'My scalp itches like it pays rent',
  ],
  Locs: [
    'My locs smell like a wet towel',
    'My locs are in their awkward phase',
    'My roots are a fuzzy mess',
    'My scalp itches like it pays rent',
  ],
  unknown: [
    'My hair is giving straw',
    'My edges left the group chat',
    'My locs smell like a wet towel',
    'My scalp itches like it pays rent',
  ],
}
