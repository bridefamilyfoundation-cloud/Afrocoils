import type { HairType } from '../types'

/**
 * Real questions, and where Ask should send them.
 *
 * `npm run ask:eval` runs every one through the engine and fails if the
 * expected record is not the answer (`top`) or not on the answer card at
 * all (the answer, the styles it lists, and "also in the app"). It is
 * how a change to the vocabulary or the weights is checked: tune for one
 * question and this tells you which three others you broke.
 *
 * `expect` lists record ids, any of which counts; a trailing `*` matches
 * by prefix. When Ask misses a question someone actually asked, add it
 * here before fixing it.
 */
export interface AskCase {
  q: string
  hair?: HairType
  expect?: string[]
  /** The expected record must be the answer itself, not just on the card. */
  top?: boolean
  /** This record must not appear anywhere on the card. */
  never?: string[]
  none?: boolean
  chat?: boolean
}

const L: HairType = 'Loose Natural'
const X: HairType = 'Locs'

export const CASES: AskCase[] = [
  // --- Shedding, breakage, thinning ---
  { q: 'why is my hair falling out', hair: L, expect: ['answer:shedding', 'concern:hair-falling-out', 'guide:shedding-or-breakage'], top: true },
  { q: 'my hair keeps coming out in the shower', hair: L, expect: ['answer:shedding', 'concern:hair-falling-out', 'guide:shedding-or-breakage'], top: true },
  { q: 'is it shedding or breakage', hair: L, expect: ['guide:shedding-or-breakage'], top: true },
  { q: 'how much shedding is normal', expect: ['guide:shedding-or-breakage', 'concern:hair-falling-out'] },
  { q: 'my ends keep snapping', hair: L, expect: ['answer:breaking', 'concern:hair-breaking', 'concern:curls-breaking', 'guide:shedding-or-breakage'], top: true },
  { q: 'split ends everywhere', hair: L, expect: ['concern:hair-breaking', 'concern:curls-breaking'] },
  { q: 'hair is getting thinner', hair: L, expect: ['concern:hair-thinning'], top: true },
  { q: 'i can see my scalp', hair: L, expect: ['concern:hair-thinning', 'concern:hair-falling-out'] },
  { q: 'my edges are thinning', expect: ['concern:edges-thinning'], top: true },
  { q: 'receding hairline', expect: ['concern:edges-receding'], top: true },
  { q: 'I have a bald patch', expect: ['concern:edges-bald-patches'], top: true },
  { q: 'my braids are too tight and my edges hurt', hair: L, expect: ['guide:tension-and-traction', 'concern:edges-breaking', 'concern:edges-thinning'] },
  { q: 'traction alopecia', expect: ['guide:tension-and-traction', 'concern:edges-receding', 'concern:edges-bald-patches'] },
  { q: 'my hair is not growing', hair: L, expect: ['concern:hair-not-retaining', 'topic:length-check'] },
  { q: 'how do i retain length', hair: L, expect: ['concern:hair-not-retaining'] },
  { q: 'how to grow my hair longer', hair: L, expect: ['concern:hair-not-retaining', 'topic:length-check'] },

  // --- Dryness, moisture, protein ---
  { q: 'my hair is so dry', hair: L, expect: ['answer:always-dry', 'concern:hair-dry', 'guide:dryness-rescue', 'concern:curls-extremely-dry'], top: true },
  { q: 'hair feels like straw', hair: L, expect: ['guide:dryness-rescue', 'concern:hair-dry', 'concern:curls-extremely-dry'] },
  { q: 'how do I moisturise 4c hair', hair: L, expect: ['guide:dryness-rescue', 'concern:hair-dry', 'concern:curls-extremely-dry'] },
  { q: 'LOC method', hair: L, expect: ['guide:dryness-rescue'] },
  { q: 'my hair feels hard and stiff', hair: L, expect: ['concern:hair-hard', 'guide:protein-moisture-balance'], top: true },
  { q: 'protein overload', hair: L, expect: ['answer:protein-or-moisture', 'guide:protein-moisture-balance', 'concern:hair-hard'], top: true },
  { q: 'mushy hair after washing', hair: L, expect: ['guide:protein-moisture-balance'] },
  { q: 'should i do a protein treatment', hair: L, expect: ['guide:protein-moisture-balance'] },

  // --- Tangles, frizz, curls ---
  { q: 'how do i detangle without breaking my hair', hair: L, expect: ['answer:detangle', 'guide:detangling-magic', 'concern:hair-tangling'], top: true },
  { q: 'too many knots', hair: L, expect: ['answer:ssk', 'concern:hair-tangling', 'guide:detangling-magic'], top: true },
  { q: 'single strand knots', hair: L, expect: ['concern:hair-tangling', 'guide:detangling-magic'] },
  { q: 'my hair is so frizzy', hair: L, expect: ['answer:frizz', 'concern:hair-frizzy'], top: true },
  { q: 'my curls have lost their definition', hair: L, expect: ['concern:curls-losing-definition'], top: true },
  { q: 'curls not bouncing back', hair: L, expect: ['concern:curls-not-bouncing-back'], top: true },
  { q: 'greasy hair', hair: L, expect: ['concern:hair-greasy'], top: true },

  // --- Scalp ---
  { q: 'my scalp is itchy', hair: L, expect: ['concern:scalp-itchy', 'guide:scalp-relief'], top: true },
  { q: 'itchy scalp', expect: ['concern:scalp-itchy', 'guide:scalp-relief'], top: true },
  { q: 'dandruff', hair: L, expect: ['concern:scalp-flaky', 'guide:scalp-relief'], top: true },
  { q: 'white flakes on my scalp', hair: L, expect: ['concern:scalp-flaky', 'guide:scalp-relief'], top: true },
  { q: 'my scalp is burning', expect: ['concern:scalp-irritated', 'concern:scalp-sensitive'], top: true },
  { q: 'bumps on my scalp', expect: ['concern:scalp-bumpy'], top: true },
  { q: 'oily scalp', expect: ['concern:scalp-oily'], top: true },
  { q: 'my scalp is dry and tight', hair: L, expect: ['concern:scalp-dry'], top: true },
  { q: 'tender headed', expect: ['concern:scalp-sensitive', 'concern:scalp-irritated'] },

  // --- Wash, buildup, water, night, heat ---
  { q: 'how do i wash my hair', hair: L, expect: ['answer:wash-how-often', 'guide:wash-day'], top: true },
  { q: 'wash day routine', hair: L, expect: ['guide:wash-day', 'topic:routine'] },
  { q: 'how often should I wash', hair: L, expect: ['guide:wash-day', 'topic:routine'] },
  { q: 'product buildup', hair: L, expect: ['guide:hard-water', 'guide:wash-day', 'guide:scalp-relief', 'concern:*'] },
  { q: 'hard water', expect: ['answer:hard-water', 'guide:hard-water'], top: true },
  { q: 'do i need a shower filter', expect: ['guide:hard-water'] },
  { q: 'what should I sleep in', hair: L, expect: ['answer:sleep', 'guide:night-routine'], top: true },
  { q: 'satin bonnet or silk pillowcase', expect: ['guide:night-routine'], top: true },
  { q: 'night routine', expect: ['guide:night-routine'], top: true },
  { q: 'is heat bad for my hair', hair: L, expect: ['answer:heat', 'concern:*', 'guide:*', 'topic:preferences'] },
  { q: 'how to flat twist', hair: L, expect: ['guide:flat-twisting'], top: true },

  // --- Locs ---
  { q: 'how often should I retwist', hair: X, expect: ['answer:retwist-often', 'guide:loc-retwist', 'topic:loc-stage', 'loc:retwisting:*'], top: true },
  { q: 'retwist without damage', hair: X, expect: ['guide:loc-retwist'], top: true },
  { q: 'my locs smell', hair: X, expect: ['answer:loc-smell', 'loc:problems:5'], top: true },
  { q: 'my locs smell after washing', hair: X, expect: ['answer:loc-smell', 'loc:problems:5', 'loc:washing:3'], top: true },
  { q: 'my locs feel dry and brittle', hair: X, expect: ['answer:dry-locs', 'guide:loc-dryness', 'loc:problems:0'], top: true },
  { q: 'how do I wash my locs', hair: X, expect: ['answer:wash-locs', 'guide:loc-wash-day'], top: true },
  { q: 'how do I wash my locs', hair: L, expect: ['answer:wash-locs', 'guide:loc-wash-day'], top: true, never: ['guide:wash-day'] },
  { q: 'starter locs', hair: X, expect: ['guide:loc-starter-care', 'loc:starting:1', 'loc-style:starter-locs'] },
  { q: 'how do I look after starter locs', hair: X, expect: ['guide:loc-starter-care'], top: true },
  { q: 'my locs are unravelling', hair: X, expect: ['answer:loc-unravel', 'loc:problems:6'], top: true },
  { q: 'my locs are thinning at the root', hair: X, expect: ['loc:problems:4', 'loc:roots:*'] },
  { q: 'white residue in my locs', hair: X, expect: ['answer:loc-buildup', 'loc:problems:2', 'loc:washing:2'], top: true },
  { q: 'loc breakage', hair: X, expect: ['loc:problems:3'], top: true },
  { q: 'itchy scalp with locs', hair: X, expect: ['answer:itchy-scalp', 'loc:problems:1', 'concern:scalp-itchy', 'guide:scalp-relief'], top: true },
  { q: 'what should I avoid putting on my locs', hair: X, expect: ['loc:products:4', 'avoid:*'] },
  { q: 'is beeswax bad for locs', hair: X, expect: ['answer:loc-avoid', 'avoid:*', 'loc:products:4'], top: true },
  { q: 'when should I see a loctician', hair: X, expect: ['answer:loctician', 'loc:professional:0'], top: true },
  { q: 'types of locs', expect: ['loc:basics:2'], top: true },
  { q: 'sisterlocks', expect: ['loc-style:*', 'loc:basics:2'] },
  { q: 'how do locs form', expect: ['loc:basics:0'], top: true },
  { q: 'how do I detangle my locs', hair: X, never: ['guide:detangling-magic', 'concern:hair-tangling'] },
  { q: 'detangling', hair: X, never: ['guide:detangling-magic', 'concern:hair-tangling'] },
  { q: 'show me loc styles', hair: X, expect: ['loc-style:*'], top: true },
  { q: 'loc updo', hair: X, expect: ['loc-style:*'], top: true },
  { q: 'interlocking', hair: X, expect: ['loc:retwisting:2', 'guide:loc-retwist'] },
  { q: 'swimming with locs', hair: X, expect: ['loc:lifestyle:1'], top: true },
  { q: 'can I dye my locs', hair: X, expect: ['loc:lifestyle:4'] },
  { q: 'how should I sleep with locs', hair: X, expect: ['loc:lifestyle:0', 'guide:night-routine'] },

  // --- Styles ---
  { q: 'a quick style for work', hair: L, expect: ['style:*'], top: true },
  { q: 'I have 10 minutes, what can I do with my hair', hair: L, expect: ['style:*'], top: true },
  { q: 'hairstyle for a wedding', hair: L, expect: ['style:*'], top: true },
  { q: 'something for the gym', hair: L, expect: ['style:*'], top: true },
  { q: 'afro bun', hair: L, expect: ['style:curved-part-afro-bun', 'style:afro-donut-bun', 'style:*'], top: true },
  { q: 'shuku', hair: L, expect: ['style:shuku-flat-twist-front'], top: true },
  { q: 'protective styles', hair: L, expect: ['style:*'] },
  { q: 'easy hairstyles for school', hair: L, expect: ['style:*'], top: true },
  { q: 'hairstyle for church on sunday', hair: L, expect: ['style:*'] },
  { q: 'styles for me', hair: L, expect: ['topic:recommendations', 'style:*'] },
  { q: 'a quick style', hair: X, never: ['style:*'] },

  // --- Products ---
  { q: 'which oil should I use', hair: L, expect: ['shelf:Oil'], top: true },
  { q: 'best shampoo for my hair', hair: L, expect: ['shelf:Cleanser'], top: true },
  { q: 'recommend a leave in conditioner', hair: L, expect: ['shelf:Leave-In', 'shelf:Conditioner'], top: true },
  { q: 'products for locs', hair: X, expect: ['shelf:Loc Care', 'topic:products-shelf', 'loc:products:*'] },
  { q: 'is petroleum jelly bad', expect: ['avoid:*'], top: true },
  { q: 'are silicones bad', hair: L, expect: ['topic:preferences', 'avoid:*', 'shelf:*', 'guide:*', 'concern:*'] },
  { q: 'what towel should i use', expect: ['avoid:*', 'guide:*'] },
  { q: 'what ingredients help hair loss', expect: ['concern:hair-falling-out'] },

  // --- The app ---
  { q: 'what is my hair type', expect: ['topic:quiz'], top: true },
  { q: 'how do I set a reminder', expect: ['topic:reminders'], top: true },
  { q: 'how do i track my length', expect: ['topic:length-check'], top: true },
  { q: 'change to centimetres', expect: ['topic:units'], top: true },
  { q: 'what is porosity', hair: L, expect: ['topic:porosity-test', 'guide:protein-moisture-balance', 'faq:porosity-ranking'] },
  { q: 'how do I find my porosity', expect: ['topic:porosity-test'], top: true },
  { q: 'where is my data stored', expect: ['faq:data'], top: true },
  { q: 'how do I delete my data', expect: ['topic:delete-data'], top: true },
  { q: 'does the app work offline', expect: ['topic:offline'], top: true },
  { q: 'is this AI', chat: true },
  { q: 'are the style pictures generated', expect: ['faq:ai'], top: true },
  { q: 'how do i update the app', expect: ['topic:updates'], top: true },
  { q: 'replay the tour', expect: ['topic:tour'], top: true },
  { q: 'how do I share my style', expect: ['topic:contribute', 'faq:contribute'], top: true },
  { q: 'save a style', expect: ['topic:saved'], top: true },
  { q: 'why are there no loc styles', expect: ['faq:loc-styles'], top: true },
  { q: 'what stage are my locs', hair: X, expect: ['topic:loc-stage'], top: true },
  { q: 'change my profile picture', expect: ['topic:bio'], top: true },
  { q: 'contact support', expect: ['topic:contact'], top: true },
  { q: 'how are styles recommended', expect: ['topic:recommendations'], top: true },

  // --- Typos ---
  { q: 'my hiar is breakng', hair: L, expect: ['answer:breaking', 'concern:hair-breaking', 'concern:curls-breaking'], top: true },
  { q: 'dandruf', hair: L, expect: ['concern:scalp-flaky'], top: true },
  { q: 'detanglig', hair: L, expect: ['answer:detangle', 'guide:detangling-magic', 'concern:hair-tangling'], top: true },
  { q: 'retwsit', hair: X, expect: ['answer:retwist-often', 'guide:loc-retwist'], top: true },

  // --- Phrasings added after tuning, to check it generalises ---
  { q: 'there is hair all over my pillow every morning', hair: L, expect: ['concern:hair-falling-out', 'guide:shedding-or-breakage', 'guide:night-routine'] },
  { q: 'my 4c hair is always dry no matter what i do', hair: L, expect: ['answer:always-dry', 'concern:hair-dry', 'concern:curls-extremely-dry', 'guide:dryness-rescue'], top: true },
  { q: 'help my hair is breaking off at the back', hair: L, expect: ['concern:hair-breaking', 'concern:curls-breaking', 'concern:edges-breaking'], top: true },
  { q: 'scratching my head all day', hair: L, expect: ['concern:scalp-itchy', 'guide:scalp-relief'], top: true },
  { q: 'my baby hairs are gone', expect: ['concern:edges-thinning', 'concern:edges-breaking', 'concern:edges-receding'], top: true },
  { q: 'what do i do about frizz', hair: L, expect: ['answer:frizz', 'concern:hair-frizzy'], top: true },
  { q: 'curls look limp and stringy', hair: L, expect: ['concern:curls-losing-definition', 'concern:hair-greasy', 'concern:curls-not-bouncing-back'] },
  { q: 'how do I clarify my hair', hair: L, expect: ['guide:hard-water', 'guide:wash-day', 'guide:scalp-relief', 'concern:*'] },
  { q: 'should I sleep with a scarf', hair: L, expect: ['answer:sleep', 'guide:night-routine'], top: true },
  { q: 'my box braids are giving me a headache', hair: L, expect: ['answer:braids-too-tight', 'guide:tension-and-traction'], top: true },
  { q: 'how long can I keep braids in', hair: L, expect: ['answer:protective-how-long', 'guide:tension-and-traction'] },
  { q: 'my locs stink', hair: X, expect: ['answer:loc-smell', 'loc:problems:5'], top: true },
  { q: 'my dreads are coming undone', hair: X, expect: ['answer:loc-unravel', 'loc:problems:6'], top: true },
  { q: 'how do i start dreadlocks', expect: ['answer:start-locs', 'loc:starting:*', 'guide:loc-starter-care', 'loc-style:*'] },
  { q: 'can I wash my starter locs', hair: X, expect: ['guide:loc-starter-care', 'guide:loc-wash-day'] },
  { q: 'lint in my locs', hair: X, expect: ['loc:problems:2', 'loc:washing:2', 'avoid:*'] },
  { q: 'my roots are fuzzy', hair: X, expect: ['guide:loc-retwist', 'loc:retwisting:*', 'loc:roots:*'] },
  { q: 'style ideas for an interview', hair: L, expect: ['style:*'], top: true },
  { q: 'running late what can I do with my hair', hair: L, expect: ['style:*'], top: true },
  { q: 'what can I do in half an hour', hair: L, expect: ['style:*'], top: true },
  { q: 'best leave in for low porosity', hair: L, expect: ['shelf:Leave-In', 'shelf:*'], top: true },
  { q: 'is coconut oil good for my hair', hair: L, expect: ['shelf:Oil', 'product:*', 'guide:*', 'concern:*'] },
  { q: 'mineral oil', expect: ['avoid:*', 'shelf:*', 'concern:*', 'guide:*'] },
  { q: 'where do i log a wash day', expect: ['topic:routine'], top: true },
  { q: 'turn off notifications', expect: ['topic:reminders'], top: true },
  { q: 'how do i change from loose hair to locs in the app', expect: ['topic:set-hair-type'], top: true },
  { q: 'do you sell my data', expect: ['faq:data'], top: true },
  { q: 'i need a dermatologist', expect: ['loc:professional:1', 'concern:*'] },
  { q: 'my scalp is bleeding', expect: ['concern:*', 'loc:professional:1'] },
  { q: 'what is the meaning of life', none: true },

  // --- The answer bank (content/answers.ts), asked the way people ask ---
  { q: 'why does my hair feel dry a day after wash day', hair: L, expect: ['answer:always-dry'], top: true },
  { q: 'which goes first oil or cream', hair: L, expect: ['answer:loc-or-lco'], top: true },
  { q: 'is coconut oil a moisturiser', expect: ['answer:oil-moisturise'], top: true },
  { q: 'what does low porosity mean', hair: L, expect: ['answer:porosity', 'answer:low-porosity'], top: true },
  { q: 'products just sit on top of my hair', hair: L, expect: ['answer:low-porosity'], top: true },
  { q: 'my hair dries out so fast', hair: L, expect: ['answer:high-porosity', 'answer:always-dry'], top: true },
  { q: 'how do I know if I need protein', hair: L, expect: ['answer:protein-or-moisture'], top: true },
  { q: 'can i leave deep conditioner overnight', hair: L, expect: ['answer:deep-condition'], top: true },
  { q: 'how many times a week should I wash my hair', hair: L, expect: ['answer:wash-how-often'], top: true },
  { q: 'should i clarify my hair', expect: ['answer:clarify'], top: true },
  { q: 'my hair is stuck at the same length', hair: L, expect: ['answer:not-growing', 'concern:hair-not-retaining'], top: true },
  { q: 'how fast does natural hair grow', hair: L, expect: ['answer:not-growing'], top: true },
  { q: 'when should i trim my ends', hair: L, expect: ['answer:trim'], top: true },
  { q: 'my curls shrink so much', hair: L, expect: ['answer:shrinkage'], top: true },
  { q: 'my twist out doesnt last', hair: L, expect: ['answer:definition'], top: true },
  { q: 'how do i get rid of dandruff', hair: L, expect: ['answer:dandruff', 'concern:scalp-flaky'], top: true },
  { q: 'how do i grow my edges back', expect: ['answer:edges'], top: true },
  { q: 'hair falling out after giving birth', expect: ['answer:postpartum'], top: true },
  { q: 'should i big chop or transition', hair: L, expect: ['answer:transition'], top: true },
  { q: 'can i swim in the pool with my natural hair', hair: L, expect: ['answer:swimming'], top: true },
  { q: 'my scalp sweats at the gym', expect: ['answer:workout', 'concern:*'] },
  { q: 'harmattan is drying my hair', expect: ['answer:dry-weather'], top: true },
  { q: 'does rosemary oil really work', expect: ['answer:rosemary-oil'], top: true },
  { q: 'what products do I need as a beginner', expect: ['answer:starter-kit'], top: true },
  { q: 'which method should I use to start my locs', expect: ['answer:start-locs'], top: true },
  { q: 'will washing my starter locs make them unravel', hair: X, expect: ['answer:wash-starter-locs', 'answer:loc-unravel'], top: true },
  { q: 'is it bad to retwist every two weeks', hair: X, expect: ['answer:retwist-often'], top: true },
  { q: 'my locs smell musty', hair: X, expect: ['answer:loc-smell'], top: true },
  { q: 'how do i get lint out of my locs', hair: X, expect: ['answer:loc-buildup'], top: true },
  { q: 'my locs look messy and frizzy', hair: X, expect: ['answer:loc-ugly-stage'], top: true },
  { q: 'one of my locs is about to fall off', hair: X, expect: ['answer:loc-thinning'], top: true },
  { q: 'how do i join the community', expect: ['answer:community'], top: true },
  { q: 'can i speak to a real hair expert', expect: ['answer:real-person'], top: true },
  { q: 'how do I detangle my hair', hair: X, never: ['answer:detangle'] },
  { q: 'how often should I retwist', hair: L, never: ['answer:detangle'] },
  { q: 'my curls wont go back after a silk press', hair: L, expect: ['answer:heat'], top: true },

  // --- Small talk and nothing ---
  { q: 'hello', chat: true },
  { q: 'thank you', chat: true },
  { q: 'are you a bot', chat: true },
  { q: 'what is the capital of france', none: true },
  { q: 'asdfgh', none: true },
  { q: 'who won the football', none: true },
]
