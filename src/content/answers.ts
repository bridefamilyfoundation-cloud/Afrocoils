import type {
  CarePreferences,
  Climate,
  HairTexture,
  HairType,
  LocStage,
  PorosityLevel,
  ScalpCondition,
} from '../lib/types'

/**
 * The answer bank: the questions people actually ask, answered directly.
 *
 * The guides are thorough and the Quick Hair Check is a list of symptoms;
 * neither is written as a reply to someone asking "why is my hair always
 * dry?". These are. Each entry is a question, the other ways people ask
 * it, a direct answer, what to do in order, and the screen where it gets
 * done — so every answer ends in an action, not a shrug.
 *
 * Rules, the same bargain as every other content file:
 *
 * - **Written by a person, shipped as written.** Ask quotes these word
 *   for word. It never stitches two together or fills a blank with
 *   advice; a question nothing here answers is a missing entry, and the
 *   fix is to write one.
 * - **Agrees with the guides.** Every claim here is one a guide or
 *   Locs World already makes at length. If a guide changes, the entry
 *   that summarises it changes in the same commit.
 * - **`forYou` is chosen, not composed.** Each one is a whole sentence
 *   written for one kind of hair — low porosity, starter locs, a dry
 *   climate — and Ask shows it only when the profile says that is the
 *   hair asking. Nothing is interpolated into it.
 * - **Hair type is a hard filter.** An entry with no `hairTypes` is for
 *   both. Anything turning on detangling, combing, raking or a curl
 *   pattern is loose-only; anything about the inside of a loc is
 *   locs-only.
 * - **A `caution` is content.** Shown in full beside the answer, never
 *   trimmed to tidy a card.
 * - **No brands.** Categories and ingredients only — `products.ts` is
 *   the one file that names a brand.
 */

/** Which hair a `forYou` line was written for. Every field given must match. */
export interface ForYouWhen {
  hairType?: HairType
  porosity?: PorosityLevel
  scalpCondition?: ScalpCondition
  texture?: HairTexture
  locStage?: LocStage
  climate?: Climate
  hardWater?: boolean
  preference?: keyof CarePreferences
}

export interface ForYou {
  when: ForYouWhen
  text: string
}

export interface KnowledgeEntry {
  id: string
  /** The question, as someone would ask it. Shown as the card title. */
  question: string
  /** Other ways of asking it, `|`-separated. Never shown. */
  asks: string
  /** The direct answer. Written to stand on its own. */
  answer: string
  /** What to do, in order. */
  steps?: string[]
  /** Lines for one kind of hair, shown when the profile matches. */
  forYou?: ForYou[]
  caution?: string
  hairTypes?: HairType[]
  /** Where the solution is done in the app. */
  next: { to: string; label: string }
}

const LOOSE: HairType[] = ['Loose Natural']
const LOCS: HairType[] = ['Locs']

const DERMATOLOGIST =
  'Sudden shedding, bald patches, scalp pain, sores, bleeding or anything getting worse is a dermatologist or trichologist visit, ideally one who treats textured hair. No product fixes those.'

export const KNOWLEDGE: KnowledgeEntry[] = [
  /* ---------------------------------------------------------------- *
   * Moisture and dryness
   * ---------------------------------------------------------------- */
  {
    id: 'always-dry',
    question: 'Why is my hair always dry?',
    asks: 'my hair is giving straw|hair feels like straw|my hair is thirsty|my hair is always dry|hair dry no matter what|dry a day after wash day|dry the day after washing|how do i keep my hair moisturised|how to moisturise natural hair|hair feels dry the next day|dry hair fix|moisture does not last|my hair drinks product',
    answer:
      'Water is the only thing that moisturises hair. Everything else is there to keep the water in. Dryness that comes back the next day almost always means product went on hair that was already dry, or nothing sealed the water in afterwards.',
    steps: [
      'Put product on soaking wet hair, section by section, never on dry hair.',
      'Layer it: leave-in, then a light oil, then a cream on the ends.',
      'Twist or band it and let it dry without touching it.',
      'Sleep on satin every night, because cotton pulls the moisture straight back out.',
      'Midweek, mist the ends with water and seal with a little oil. Don’t do a full re-application.',
    ],
    forYou: [
      {
        when: { porosity: 'Low' },
        text: 'Your hair is low porosity, so water struggles to get in. Use warm water, light products and gentle heat (a warm towel or a cap) while you deep condition. If product sits on top, you’re using too much.',
      },
      {
        when: { porosity: 'High' },
        text: 'Your hair is high porosity, so it takes water in fast and loses it fast. Seal properly with a cream after the oil, and add a protein treatment once a month.',
      },
      {
        when: { climate: 'Dry / arid' },
        text: 'In a dry climate the air pulls water out of your hair all day. A midweek mist-and-seal and a satin-lined hat outdoors make the biggest difference.',
      },
      {
        when: { climate: 'Cold / low humidity' },
        text: 'Cold air and indoor heating are both dry, so keep your ends tucked away in low-manipulation styles through the cold months.',
      },
    ],
    caution:
      'If your hair feels dry and also snaps the moment you stretch it, it may need protein rather than more moisture. Do the stretch test before adding more product.',
    hairTypes: LOOSE,
    next: { to: '/guide/dryness-rescue', label: 'Start Dryness Rescue' },
  },
  {
    id: 'loc-or-lco',
    question: 'Should I use the LOC or the LCO method?',
    asks: 'loc or lco|lco or loc|which goes first oil or cream|oil or cream first|cream or oil first|liquid oil cream|liquid cream oil|which order do i put products|what order products|leave in oil cream order|layering products',
    answer:
      'Both start with water and a leave-in. The difference is whether the oil goes before or after the cream. LOC (oil then cream) seals harder and suits hair that loses moisture fast. LCO (cream then oil) is lighter and suits hair that gets weighed down.',
    steps: [
      'Always start on soaking wet hair. The water is the moisture.',
      'L: a leave-in, worked through each section.',
      'Then oil and cream, in the order that suits your porosity.',
      'Try one order for two or three wash days before you judge it.',
    ],
    forYou: [
      {
        when: { porosity: 'Low' },
        text: 'For your low porosity hair, start with LCO and use very little oil. Heavy sealing on hair that already resists water just leaves product sitting on top.',
      },
      {
        when: { porosity: 'Medium' },
        text: 'Your medium porosity hair can usually take either order. Use LOC in dry weather and LCO when your hair feels weighed down.',
      },
      {
        when: { porosity: 'High' },
        text: 'For your high porosity hair, use LOC. The cream on the outside does the heavy sealing your hair needs to keep water in.',
      },
      {
        when: { texture: 'Fine' },
        text: 'Your strands are fine, so keep every layer light. Fine hair goes limp under butters long before it goes dry.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/guide/dryness-rescue', label: 'See the method step by step' },
  },
  {
    id: 'oil-moisturise',
    question: 'Does oil moisturise my hair?',
    asks: 'does oil moisturise|is oil a moisturiser|oil my hair every day|oiling my scalp|does coconut oil moisturise|should i oil my hair|hair oil dry',
    answer:
      'No. Oil seals in moisture that’s already there. Oil on dry hair just coats the dryness. Put water on first, then a little oil to slow the water leaving.',
    steps: [
      'Water or a water-based leave-in first, always.',
      'A few drops of a light oil rubbed between your palms, then smoothed down the length.',
      'Oil the scalp only if it’s dry, and only lightly. Oiling a healthy scalp every day feeds buildup.',
    ],
    forYou: [
      {
        when: { hairType: 'Locs' },
        text: 'On locs, use a few drops of a light oil like jojoba or grapeseed, never butter. Heavy oils sit inside the loc, collect lint and go rancid.',
      },
      {
        when: { porosity: 'Low' },
        text: 'Your hair is low porosity, so choose the lightest oils (jojoba, grapeseed, argan). Heavier oils sit on top of low porosity hair.',
      },
    ],
    next: { to: '/products', label: 'See oils for your hair' },
  },

  /* ---------------------------------------------------------------- *
   * Porosity
   * ---------------------------------------------------------------- */
  {
    id: 'porosity',
    question: 'What is porosity, and why does it matter?',
    asks: 'what is porosity|what does porosity mean|porosity explained|why does porosity matter|low vs high porosity|what porosity is my hair',
    answer:
      'Porosity is how easily water gets into your hair and how long it stays. Low porosity hair resists water and holds it once it’s in. High porosity hair drinks water fast and loses it fast. It decides how heavy your products should be, whether you need heat to deep condition, and how much protein your hair wants.',
    steps: [
      'Take the porosity test under Hair Care. It takes about two minutes.',
      'Your result is saved to your profile and filters your product shelf.',
      'Re-test after a few months if you colour, relax or have hard water. All three shift porosity.',
    ],
    forYou: [
      {
        when: { porosity: 'Low' },
        text: 'Your profile says low porosity: light, water-based products, warm water, gentle heat to deep condition, and go easy on protein.',
      },
      {
        when: { porosity: 'Medium' },
        text: 'Your profile says medium porosity, the easiest hair to keep balanced. Most products work, and moisture lasts if you seal it.',
      },
      {
        when: { porosity: 'High' },
        text: 'Your profile says high porosity: richer creams, a proper seal, a monthly protein treatment and a cool final rinse.',
      },
    ],
    next: { to: '/porosity', label: 'Take the porosity test' },
  },
  {
    id: 'low-porosity',
    question: 'How do I look after low porosity hair?',
    asks: 'low porosity hair care|low porosity routine|products sit on my hair|products just sit on top|hair takes ages to get wet|water runs off my hair|low porosity tips',
    answer:
      'Low porosity hair has a tight, flat cuticle. Water and product struggle to get in, and too much just sits on top as buildup. The answer is less product, lighter product, and a little warmth to help it in.',
    steps: [
      'Wash with warm water so the hair actually soaks through.',
      'Deep condition under a warm towel or a heat cap for twenty to thirty minutes.',
      'Choose light, water-based leave-ins and light oils, and use less than you think.',
      'Clarify once a month. Low porosity hair builds up faster than any other.',
      'Go easy on protein. Your hair rarely needs much of it.',
    ],
    hairTypes: LOOSE,
    next: { to: '/products', label: 'See your filtered shelf' },
  },
  {
    id: 'high-porosity',
    question: 'How do I look after high porosity hair?',
    asks: 'high porosity hair care|high porosity routine|hair dries too fast|moisture disappears|hair soaks up product|high porosity tips',
    answer:
      'High porosity hair has gaps in its cuticle, from genetics, heat, colour or wear. It takes water in quickly and lets it straight back out. You need to seal hard and fill the gaps with protein.',
    steps: [
      'Use richer creams and butters on the ends, after the oil (the LOC order).',
      'Do a protein treatment about once a month to patch the cuticle.',
      'Finish wash day with a cool rinse so the cuticle lies flat.',
      'Keep heat to a minimum. Every pass opens the cuticle further.',
    ],
    forYou: [
      {
        when: { preference: 'proteinSensitive' },
        text: 'You’ve marked your hair protein-sensitive. Use a gentle protein like a light rinse rather than a reconstructor, and do a strand test first.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/guide/protein-moisture-balance', label: 'Balance protein and moisture' },
  },
  {
    id: 'protein-or-moisture',
    question: 'Does my hair need protein or moisture?',
    asks: 'protein or moisture|do i need protein|how do i know if i need protein|stretch test|hair feels mushy|hair feels gummy|hair snaps when i stretch|moisture overload|hygral fatigue',
    answer:
      'Do the stretch test. Gently pull a wet strand. If it stretches a long way, feels gummy and doesn’t spring back, it needs protein. If it barely stretches and snaps straight away, it needs moisture. If it stretches a little and springs back, you’re balanced.',
    steps: [
      'Test several strands from different parts of your head, not just one.',
      'Change one thing only: a protein treatment, or a moisture deep condition.',
      'Give it two or three wash days before you judge.',
      'Keep deep protein treatments to once a month at most.',
    ],
    forYou: [
      {
        when: { preference: 'proteinSensitive' },
        text: 'You’ve marked your hair protein-sensitive, so lean towards moisture. Only reach for protein when the stretch test clearly says so.',
      },
      {
        when: { porosity: 'High' },
        text: 'High porosity hair like yours usually needs a little more protein than most, roughly monthly.',
      },
      {
        when: { porosity: 'Low' },
        text: 'Low porosity hair like yours rarely needs much protein. Too much shows up quickly as stiff, straw-like hair.',
      },
    ],
    next: { to: '/guide/protein-moisture-balance', label: 'Read Protein and Moisture' },
  },
  {
    id: 'deep-condition',
    question: 'How often should I deep condition?',
    asks: 'how often deep condition|deep conditioning frequency|how long to leave deep conditioner|deep condition overnight|hair mask how often|should i deep condition every wash',
    answer:
      'Every wash day, for twenty to thirty minutes, on clean damp hair. Longer isn’t better. Past about half an hour the hair swells and weakens rather than conditions, so don’t leave it in overnight.',
    steps: [
      'Shampoo the scalp first, so the conditioner goes onto clean hair.',
      'Apply section by section, working it down to the ends.',
      'Cover it, and add gentle heat if your hair is low porosity.',
      'Rinse with cool water and squeeze. Don’t rub.',
    ],
    forYou: [
      {
        when: { porosity: 'Low' },
        text: 'Your hair is low porosity, so the heat matters: a warm towel or a thermal cap is what gets the conditioner in at all.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/guide/wash-day', label: 'Open Wash Day' },
  },

  /* ---------------------------------------------------------------- *
   * Washing
   * ---------------------------------------------------------------- */
  {
    id: 'wash-how-often',
    question: 'How often should I wash my natural hair?',
    asks: 'how often should i wash my hair|how often to wash natural hair|how many times a week wash|wash hair every day|is it bad to wash often|how long can i go without washing',
    answer:
      'Every seven to ten days suits most coily hair. Go no longer than two weeks: buildup and a neglected scalp cause their own breakage. Washing every day is too much, because the repeated soak-and-dry weakens the strand.',
    steps: [
      'Pick a wash day and log it in Hair routine so the app tells you when the next one is due.',
      'Shampoo the scalp only. The lengths get clean from the rinse.',
      'Detangle with conditioner in, then deep condition.',
      'Between washes, refresh with a water mist rather than a full wash.',
    ],
    forYou: [
      {
        when: { scalpCondition: 'Oily' },
        text: 'Your scalp runs oily, so washing every five to seven days, at the shorter end, keeps it comfortable without stripping your lengths.',
      },
      {
        when: { scalpCondition: 'Dry' },
        text: 'Your scalp runs dry, so use a gentle sulphate-free cleanser and stay towards ten days rather than seven.',
      },
      {
        when: { scalpCondition: 'Flaky' },
        text: 'Your scalp is flaky, and flakes usually do better with more regular washing, not less. Don’t stretch past a week.',
      },
      {
        when: { preference: 'lowManipulation' },
        text: 'You prefer low manipulation, so wash in twists or braids. You’ll clean your scalp without undoing and re-detangling your whole head.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/calendar', label: 'Set your wash day' },
  },
  {
    id: 'clarify',
    question: 'How often should I clarify my hair?',
    asks: 'how often clarify|clarifying shampoo how often|should i clarify|what is clarifying|clarify or chelate|deep cleanse|reset my hair',
    answer:
      'About once a month. More than that strips your hair and scalp and starts the dryness cycle again. If your products have stopped working and your hair feels coated, it’s time to clarify. If you have hard water, you need a chelating shampoo, not just a clarifying one.',
    steps: [
      'Use a clarifying shampoo on the scalp, with your fingertips, never your nails.',
      'Follow with a deep conditioner straight away.',
      'Log it in Hair routine so you don’t clarify again too soon.',
    ],
    forYou: [
      {
        when: { hardWater: true },
        text: 'You have hard water, so use a chelating shampoo (look for EDTA in the ingredients) once or twice a month, and always deep condition straight after.',
      },
      {
        when: { porosity: 'Low' },
        text: 'Low porosity hair like yours builds up fastest of all, so don’t skip the monthly clarify.',
      },
      {
        when: { hairType: 'Locs' },
        text: 'Locs hold buildup in the core, where you can’t see it. A monthly clarify, rinsed for twice as long and dried all the way through, is what keeps them light.',
      },
    ],
    next: { to: '/guide/hard-water', label: 'Read Hard Water' },
  },
  {
    id: 'hard-water',
    question: 'Is my water damaging my hair?',
    asks: 'is my water damaging my hair|hard water hair|hair feels coated|products stopped working|limescale|borehole water hair|shower filter|tap water ruining my hair',
    answer:
      'It can. If you see limescale on your kettle, your soap won’t lather, and your hair feels coated however carefully you wash it, the minerals in your water are bonding to your hair. A normal clarifying shampoo won’t shift them. You need a chelating one.',
    steps: [
      'Use a chelating shampoo with EDTA once or twice a month.',
      'Deep condition straight after, every time.',
      'If you can, fit a shower filter. It fixes the cause, not the symptom.',
      'Otherwise, a final rinse with filtered water on wash day gets you most of the way.',
      'Mark hard water on your profile so your shelf accounts for it.',
    ],
    forYou: [
      {
        when: { hardWater: true },
        text: 'Your profile already says hard water, so your product shelf is filtered for it. Expect your porosity test to read higher until you’ve chelated for a few months.',
      },
    ],
    next: { to: '/guide/hard-water', label: 'Read Hard Water' },
  },

  /* ---------------------------------------------------------------- *
   * Breakage, shedding, growth
   * ---------------------------------------------------------------- */
  {
    id: 'breaking',
    question: 'Why does my hair keep breaking?',
    asks: 'why does my hair keep breaking|my hair keeps breaking|how to stop breakage|stop my hair breaking|ends breaking off|hair snapping|short pieces of hair everywhere',
    answer:
      'Breakage comes from what is being done to your hair, not from your body, which means you can fix it. The usual five causes are dry detangling, cotton pillowcases, tight styles, heat, and protein and moisture out of balance. Work through them one at a time.',
    steps: [
      'Check a fallen strand: no white bulb at the end means breakage, not shedding.',
      'Only detangle wet, with conditioner in, from the ends up.',
      'Sleep on satin, starting tonight.',
      'Take down anything that pulls, and rest your hair between styles.',
      'Do the stretch test to see whether you need protein or moisture.',
    ],
    forYou: [
      {
        when: { porosity: 'High' },
        text: 'Your hair is high porosity, so a missing monthly protein treatment is a likely cause. Start there.',
      },
      {
        when: { texture: 'Fine' },
        text: 'Fine strands like yours break under tension and heat sooner than coarse ones. Loosen your styles before anything else.',
      },
      {
        when: { preference: 'heatlessOnly' },
        text: 'You’re already heatless, which rules out the most common cause of mid-shaft breakage. Look at detangling and tension first.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/guide/shedding-or-breakage', label: 'Find out which it is' },
  },
  {
    id: 'shedding',
    question: 'Why is my hair falling out?',
    asks: 'why is my hair falling out|hair falling out a lot|so much hair in the shower|losing a lot of hair|is my hair shedding too much|how much shedding is normal|hair coming out in my comb',
    answer:
      'Losing fifty to a hundred hairs a day is normal. On textured hair worn in a style all week, it all comes out at once on wash day and looks alarming. A shed hair has a small white bulb at the root end. If yours do and they’re full length, that’s shedding. If shedding is genuinely heavy, think back three months: illness, childbirth, a crash diet or severe stress often show up then and settle on their own.',
    steps: [
      'Check a strand for the white bulb. Short pieces with no bulb are breakage, which is a different fix.',
      'Count across a normal day before you decide it’s too much.',
      'Look back about three months for an illness, a birth or major stress.',
      'Photograph your scalp in the same light monthly so you can see real change.',
    ],
    caution: DERMATOLOGIST,
    next: { to: '/guide/shedding-or-breakage', label: 'Read Shedding or Breakage?' },
  },
  {
    id: 'postpartum',
    question: 'My hair is falling out after giving birth',
    asks: 'postpartum shedding|postpartum hair loss|shedding after having a baby|hair falling out after baby|after pregnancy hair loss|hair loss after childbirth|breastfeeding hair loss',
    answer:
      'This is very common. During pregnancy you hold on to hair you would normally shed, and about three months after the birth it all lets go at once. It looks dramatic, but it usually settles on its own within the year.',
    steps: [
      'Use loose styles. Tension on shedding hair adds breakage on top of it.',
      'Be extra gentle around your edges, where postpartum shedding shows most.',
      'Log a length check now so you can see the regrowth later.',
    ],
    caution:
      'If it carries on beyond six months, comes in patches, or comes with tiredness or other symptoms, see a doctor. Postpartum thyroid and iron changes are worth ruling out.',
    next: { to: '/guide/shedding-or-breakage', label: 'Read Shedding or Breakage?' },
  },
  {
    id: 'not-growing',
    question: 'Why isn’t my hair growing?',
    asks: 'why isnt my hair growing|my hair is not growing|hair stuck at same length|hair wont grow past|how to grow my hair longer|grow hair faster|length retention|how fast does hair grow|how fast does natural hair grow|natural hair growth rate|what makes hair grow faster',
    answer:
      'It is growing, at about a third of an inch a month — a little slower than the half-inch usually quoted, which was measured on straight hair. The real question is whether you’re keeping it. Coily hair breaks at the ends as fast as it grows at the roots, so the length looks stuck. Nothing you put on your hair makes the follicle grow faster. What protects the ends is what gets you length.',
    steps: [
      'Measure stretched, root to tip, and log it on Hair Growth.',
      'Protect the ends: satin every night, ends tucked in low-manipulation styles.',
      'Detangle only when wet and slippery.',
      'Trim split ends before they travel up the strand.',
      'Measure monthly, the same way each time. After about four months the app can show whether you’re keeping what you grow.',
    ],
    forYou: [
      {
        when: { preference: 'lowManipulation' },
        text: 'You prefer low manipulation, and that’s the single biggest length-retention habit. Keep your ends tucked and you’re most of the way there.',
      },
      {
        when: { hairType: 'Locs' },
        text: 'Locs shrink as they mature, so a loc can be growing steadily while looking shorter for its first year or two. Measure anyway: it’s the only honest record.',
      },
    ],
    next: { to: '/growth', label: 'Log a length check' },
  },
  {
    id: 'trim',
    question: 'How often should I trim my hair?',
    asks: 'how often should i trim|when should i trim|do i need a trim|split ends trim|dusting|should i cut my ends|trim to grow',
    answer:
      'Trim when your ends tell you to, not by the calendar. That means split ends, knots that keep coming back, or ends that won’t hold a twist. For most people that’s every three to four months. A small dusting of the damaged ends keeps the splits from climbing up the strand, which saves you a bigger cut later.',
    steps: [
      'Trim on stretched or twisted hair so you can see the ends clearly.',
      'Take off only what is split or knotted, often just a quarter of an inch.',
      'Use proper hair scissors. Kitchen scissors fray the ends you just cut.',
      'Log it in Hair routine so the next one is due when it should be.',
    ],
    hairTypes: LOOSE,
    next: { to: '/calendar', label: 'Log a trim' },
  },

  /* ---------------------------------------------------------------- *
   * Tangles, knots, shrinkage, frizz
   * ---------------------------------------------------------------- */
  {
    id: 'detangle',
    question: 'How do I detangle without losing so much hair?',
    asks: 'how do i detangle|detangling tips|detangle 4c hair|losing hair when detangling|detangling hurts|best way to detangle|my hair is matted',
    answer:
      'Never detangle dry. Put water in first, then conditioner, until the hair feels slippery. Work in sections, use your fingers before any comb, and always start at the ends and work up. Most of the hair you lose detangling is breakage from rushing, not shedding.',
    steps: [
      'Split your hair into four or more sections and clip the rest away.',
      'Soak each section, then add conditioner until it slips.',
      'Pull the big tangles apart with your fingers.',
      'Then a wide-tooth comb, from the ends upward, in short strokes.',
      'Twist each finished section so it can’t tangle again.',
    ],
    forYou: [
      {
        when: { preference: 'lowManipulation' },
        text: 'Since you prefer low manipulation, finger-detangle only and save the comb for wash day.',
      },
      {
        when: { texture: 'Fine' },
        text: 'Fine strands like yours snap under a comb more easily. Fingers do most of the work for you.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/guide/detangling-magic', label: 'Open Detangling Magic' },
  },
  {
    id: 'ssk',
    question: 'How do I stop single strand knots?',
    asks: 'how to stop single strand knots|fairy knots|ssk|knots on the ends|tiny knots in my hair|why do i get knots|knots keep coming back',
    answer:
      'Single strand knots form when a curl coils back on itself and dries that way. You can’t stop every one, but stretched, moisturised ends get far fewer. A knot that has set hard can’t be undone. Snip just above it, because left in place it catches and breaks the strands around it.',
    steps: [
      'Wear stretched styles more often: twists, braids, banding.',
      'Keep the ends moisturised and sealed.',
      'Sleep on satin so the ends don’t rub and coil.',
      'Snip hard knots individually rather than cutting a whole section.',
    ],
    hairTypes: LOOSE,
    next: { to: '/guide/detangling-magic', label: 'Open Detangling Magic' },
  },
  {
    id: 'shrinkage',
    question: 'How do I stop shrinkage?',
    asks: 'shrinkage stole my length|shrinkage took my length|how to stop shrinkage|reduce shrinkage|my hair shrinks|stretch my hair|stretch without heat|banding|african threading|my hair looks so short',
    answer:
      'Shrinkage is a sign of healthy, elastic hair. Hair that doesn’t shrink is often damaged. You can’t stop it, but you can stretch it without heat when you want length on show.',
    steps: [
      'Band or thread damp hair and let it dry stretched.',
      'Wear twist-outs and braid-outs, which dry already stretched.',
      'Put it up in a loose pineapple at night to keep the stretch.',
      'Measure stretched, so shrinkage doesn’t hide your real growth.',
    ],
    forYou: [
      {
        when: { preference: 'heatlessOnly' },
        text: 'Every method here is heatless, which suits your preference. African threading gives the most stretch of the lot.',
      },
      {
        when: { climate: 'Humid / tropical' },
        text: 'Humidity pulls stretched hair back up fast. Seal with a cream or light gel on the ends to make your stretch last.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/styles', label: 'Browse stretched styles' },
  },
  {
    id: 'frizz',
    question: 'Why is my hair so frizzy?',
    asks: 'why is my hair so frizzy|how to stop frizz|frizzy hair fix|my twist out is frizzy|hair puffs up|humidity frizz|frizz halo',
    answer:
      'Frizz is a raised cuticle taking moisture from the air. Most of it is made on wash day: a rough towel, touching hair while it dries, or styling hair that has already started drying.',
    steps: [
      'Blot with a microfibre towel or a cotton T-shirt, never terry cloth.',
      'Style on soaking wet hair, then leave it alone until it’s dry.',
      'Finish with a cool rinse so the cuticle lies flat.',
      'Sleep on satin and refresh with a mist, not by restyling.',
    ],
    forYou: [
      {
        when: { climate: 'Humid / tropical' },
        text: 'In your humid climate, seal with a cream or a light gel on top. It’s the barrier that stops the air swelling your hair.',
      },
      {
        when: { porosity: 'High' },
        text: 'High porosity hair like yours frizzes most because the cuticle is already raised. A good seal and a monthly protein treatment calm it.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/sos/problem?open=hair-frizzy', label: 'Open the frizz check' },
  },
  {
    id: 'definition',
    question: 'How do I make my twist-out or wash-and-go last?',
    asks: 'make my twist out last|twist out not lasting|wash and go not lasting|curls not defined|how to get definition|curl definition|refresh my curls|day two hair',
    answer:
      'Definition is set while the hair is wet and lost by touching it while it dries. Style on soaking wet hair, let it dry completely, and only then take it down, with oiled fingers.',
    steps: [
      'Apply your styler section by section on soaking wet hair.',
      'Let it dry completely. Damp twists unravel into frizz.',
      'Take it down with oiled fingertips and separate gently.',
      'At night, pineapple or re-twist in large sections under satin.',
      'In the morning, mist lightly and leave it. Don’t restyle.',
    ],
    forYou: [
      {
        when: { climate: 'Humid / tropical' },
        text: 'In a humid climate, a gel or custard on top of your cream holds definition far longer than cream alone.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/sos/problem?open=curls-losing-definition', label: 'Open the definition check' },
  },

  /* ---------------------------------------------------------------- *
   * Scalp
   * ---------------------------------------------------------------- */
  {
    id: 'itchy-scalp',
    question: 'Why is my scalp itchy?',
    asks: 'my scalp itches like it pays rent|my scalp will not stop itching|why is my scalp itchy|itchy scalp fix|how to stop itchy scalp|scalp itching under braids|scalp itch remedy|scratching my scalp',
    answer:
      'There are three kinds of itch, and they need opposite things. Large, greasy, yellowish flakes mean buildup or seborrhoeic dermatitis. Small, dry, white flakes with tightness mean dryness. Redness and soreness without flakes means irritation, usually from a product or a style that’s too tight.',
    steps: [
      'Look closely at the flakes, or the lack of them, to work out which itch it is.',
      'For buildup, clarify the scalp with your fingertips.',
      'For dryness, use a gentle cleanser, then a diluted scalp oil on the parts.',
      'For irritation, take tight styles down and drop back to your fewest products.',
      'Massage your scalp for five minutes, with your fingertips, never your nails.',
    ],
    forYou: [
      {
        when: { scalpCondition: 'Flaky' },
        text: 'Your profile says flaky scalp. If the flakes are large and greasy, an anti-dandruff ingredient like zinc pyrithione or ketoconazole is the right tool.',
      },
      {
        when: { scalpCondition: 'Sensitive' },
        text: 'Your scalp is sensitive, so suspect your products first. Strip back to one cleanser and add things back one at a time over two weeks.',
      },
      {
        when: { hardWater: true },
        text: 'You have hard water, and mineral film on the scalp itches. A monthly chelating wash may be all it takes.',
      },
      {
        when: { hairType: 'Locs' },
        text: 'With locs, treat your scalp through an applicator nozzle along the parts, rinse for twice as long, and dry your roots completely.',
      },
    ],
    caution:
      'Persistent flaking, bleeding, sores, or hair loss in patches is a dermatologist visit, not a product problem. Never use undiluted essential oils on the scalp. They burn.',
    next: { to: '/guide/scalp-relief', label: 'Open Scalp Relief' },
  },
  {
    id: 'dandruff',
    question: 'How do I get rid of dandruff?',
    asks: 'how do i get rid of dandruff|dandruff treatment|flaky scalp fix|white flakes in my hair|seborrheic dermatitis|anti dandruff shampoo natural hair',
    answer:
      'Real dandruff (larger, greasy flakes that keep coming back) is driven by a yeast on the scalp, so it needs an anti-dandruff ingredient, not more oil. Oiling dandruff feeds it. Small dry white flakes are a dry scalp, which is a different fix.',
    steps: [
      'Wash with a shampoo containing zinc pyrithione, ketoconazole or salicylic acid.',
      'Leave it on your scalp for three to five minutes before rinsing.',
      'Follow with conditioner on the lengths only, because these shampoos dry hair out.',
      'Wash at least weekly while the flakes are active.',
      'Stop heavy oils and butters on the scalp until it clears.',
    ],
    forYou: [
      {
        when: { hairType: 'Locs' },
        text: 'With locs, dilute the anti-dandruff shampoo in an applicator bottle, work it along the parts, and rinse until the water runs completely clear.',
      },
    ],
    caution:
      'If the flakes don’t ease within a month of treatment, or come with redness, sores or hair loss, see a dermatologist.',
    next: { to: '/sos/problem?open=scalp-flaky', label: 'Open the flaky scalp check' },
  },

  /* ---------------------------------------------------------------- *
   * Edges, tension, protective styles
   * ---------------------------------------------------------------- */
  {
    id: 'edges',
    question: 'How do I grow my edges back?',
    asks: 'my edges left the group chat|my edges left|my edges are gone|my edges disappeared|how do i grow my edges back|grow back edges|edges thinning|edges gone|regrow hairline|my edges are thin|edges falling out|save my edges',
    answer:
      'Caught early, edges usually grow back once the pulling stops. The most common cause is traction: tight styles, heavy extensions, slicked-back ponytails and tight bonnet elastics. Removing the tension does far more than any oil or serum.',
    steps: [
      'Take down anything that pulls at your hairline, today.',
      'Wear styles that leave the edges loose, and leave real breaks between installs.',
      'Brush or gel your edges flat less often, and gently.',
      'Check your bonnet. If the elastic leaves a mark, it’s too tight.',
      'Photograph your hairline monthly in the same light to see the regrowth.',
    ],
    forYou: [
      {
        when: { hairType: 'Locs' },
        text: 'With locs, look at your retwisting. Tight or frequent retwists at the hairline, and heavy locs at the edges, cause exactly the same traction.',
      },
    ],
    caution:
      'Once a follicle scars, hair can’t grow back from it, so don’t wait. Shiny, smooth skin where the hairline was, or thinning at the crown, needs a dermatologist.',
    next: { to: '/guide/tension-and-traction', label: 'Read Tension and Traction' },
  },
  {
    id: 'braids-too-tight',
    question: 'My braids are too tight. What should I do?',
    asks: 'my braids are too tight|braids hurt|new braids pain|bumps after braiding|tight braids headache|how to loosen braids|braids pulling my edges',
    answer:
      'Take out the ones that hurt, starting with the hairline. Pain is not the style settling. It’s tension on the follicle, and that is how traction hair loss starts. A style you paid for is still not worth losing hair over.',
    steps: [
      'Undo the braids along your edges and anywhere you see bumps or tenting skin.',
      'Don’t sleep on them tight in the meantime, and don’t take painkillers to get through it.',
      'Re-do those sections loosely, or leave them out.',
      'Next time, tell the braider before they start that your edges stay loose.',
    ],
    caution:
      'Bumps that fill with pus, spreading redness or a scalp that stays sore after the braids are out need a doctor.',
    hairTypes: LOOSE,
    next: { to: '/guide/tension-and-traction', label: 'Read Tension and Traction' },
  },
  {
    id: 'protective-how-long',
    question: 'How long can I keep a protective style in?',
    asks: 'how long can i keep braids in|how long to leave braids|how long should i keep my wig|how long can i keep a weave|how many weeks braids|when to take down braids|how long cornrows',
    answer:
      'The American Academy of Dermatology gives braids about three months, and weaves or extensions about eight weeks. The principle matters more than the number: every protective style has an expiry, and past it the style stops protecting and starts pulling and matting.',
    steps: [
      'Log the install in Hair routine so the take-down date isn’t a guess.',
      'Wash your scalp every one to two weeks while it’s in.',
      'Take it down sooner if it itches constantly, hurts, or the roots have matted.',
      'Rest your hair for at least a week or two before the next install.',
    ],
    forYou: [
      {
        when: { preference: 'protectiveBias' },
        text: 'You prefer protective styles, so the gap between installs is the most important habit. Back-to-back installs are where most edge damage happens.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/calendar', label: 'Log your install' },
  },

  /* ---------------------------------------------------------------- *
   * Night, heat, chemicals, lifestyle
   * ---------------------------------------------------------------- */
  {
    id: 'sleep',
    question: 'What should I wear to bed to protect my hair?',
    asks: 'what should i wear to bed|bonnet or pillowcase|satin or silk|how to protect hair at night|sleeping with natural hair|durag or bonnet|night time hair routine',
    answer:
      'Satin or silk, every night: a bonnet, a scarf, a satin pillowcase, or all three. Cotton grips your hair and soaks the moisture out of it. Satin polyester is cheap and does the job. The best one is the one you actually wear every night.',
    steps: [
      'Put your hair up in large twists, a loose pineapple or a loose braid.',
      'If the ends feel dry, add a little leave-in or oil to them first.',
      'Cover it with satin, and use a satin pillowcase as backup for when the bonnet comes off.',
      'In the morning, mist and smooth. Don’t restyle.',
    ],
    forYou: [
      {
        when: { hairType: 'Locs' },
        text: 'For your locs, a satin bonnet or loc sock keeps lint out, and lint inside a loc is permanent. Never go to bed on damp locs.',
      },
      {
        when: { locStage: 'Starter' },
        text: 'Starter locs unravel and catch lint more than any other stage, so cover them every single night, without exception.',
      },
    ],
    caution: 'A bonnet with a tight elastic pulls on your hairline all night. If it leaves a mark, it’s too tight.',
    next: { to: '/guide/night-routine', label: 'Open The Night Routine' },
  },
  {
    id: 'heat',
    question: 'Is heat bad for my natural hair?',
    asks: 'is heat bad for my hair|silk press damage|can i blow dry natural hair|heat damage|flat iron natural hair|how often can i use heat|my curls wont go back',
    answer:
      'Heat isn’t forbidden, but each pass changes the hair a little, and too much too often leaves curls that won’t revert. That’s permanent heat damage, and the only fix is growing it out. Used rarely, low and protected, most hair handles it.',
    steps: [
      'Only use heat on clean, completely detangled hair.',
      'Always use a heat protectant.',
      'Use the lowest temperature that works, and one pass per section.',
      'Space heat styles weeks apart, not days.',
      'Deep condition before and after.',
    ],
    forYou: [
      {
        when: { preference: 'heatlessOnly' },
        text: 'You’ve chosen heatless only, so the app already hides heat styles from you. Banding and threading stretch your hair without heat.',
      },
      {
        when: { texture: 'Fine' },
        text: 'Your strands are fine, so they need a lower temperature than coarse hair. Start low and only go up if you have to.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/profile', label: 'Set your heat preference' },
  },
  {
    id: 'transition',
    question: 'How do I transition from relaxed to natural?',
    asks: 'how do i transition|transitioning hair|stop relaxing my hair|go natural|relaxed to natural|line of demarcation|big chop or transition|should i big chop',
    answer:
      'There are two routes: the big chop (cut off the relaxed ends in one go) or transitioning (grow out and trim gradually). Either works. While you transition, the point where your natural hair meets the relaxed hair is fragile and breaks easily, so be gentle there.',
    steps: [
      'Choose your route. Transitioning keeps length, the big chop ends the fragile stage at once.',
      'Detangle only when wet and slippery, with extra care at the demarcation line.',
      'Use braid-outs, twist-outs and protective styles to blend the two textures without heat.',
      'Add protein: relaxed ends need more than natural hair does.',
      'Trim a little of the relaxed ends every couple of months.',
    ],
    forYou: [
      {
        when: { preference: 'heatlessOnly' },
        text: 'Staying heatless while you transition is the right call. Heat on the demarcation line is where most transitioners lose length.',
      },
    ],
    hairTypes: LOOSE,
    next: { to: '/quiz', label: 'Set up your hair profile' },
  },
  {
    id: 'swimming',
    question: 'Can I swim with natural hair?',
    asks: 'can i swim with natural hair|swimming natural hair|chlorine natural hair|pool hair care|beach hair|salt water hair|swimming cap',
    answer:
      'Yes. Hair that’s already full of clean water absorbs less chlorine or salt water, so soak it before you get in, protect it, and rinse it straight after.',
    steps: [
      'Wet your hair with clean water and add a leave-in before you swim.',
      'Wear a swim cap over braids or twists.',
      'Rinse with clean water as soon as you’re out, and wash the same day if you can.',
      'If you swim often, add a monthly chelating wash to clear the chlorine and minerals.',
    ],
    hairTypes: LOOSE,
    next: { to: '/guide/hard-water', label: 'Read about chelating' },
  },
  {
    id: 'workout',
    question: 'How do I look after my hair if I work out?',
    asks: 'how do i look after my hair if i work out|gym hair|sweat in my hair|working out natural hair|hair after the gym|exercise and hair|sweaty scalp',
    answer:
      'Sweat itself won’t harm your hair, but dried sweat and buildup on the scalp will itch. Keep your hair off your face in a low-tension style, let your scalp breathe, and rinse it more often than you wash the lengths.',
    steps: [
      'Wear a loose bun, puff or twists, with no tight elastic at the edges.',
      'After a sweaty session, rinse or co-wash the scalp. The lengths can wait until wash day.',
      'Dry your roots properly before covering your hair.',
      'Choose a style from the library tagged Gym/Active.',
    ],
    forYou: [
      {
        when: { hairType: 'Locs' },
        text: 'With locs, rinse the scalp with diluted shampoo, rinse long, and dry the roots completely. Damp roots under a hat are how locs start to smell.',
      },
    ],
    next: { to: '/styles', label: 'Find a gym-friendly style' },
  },
  {
    id: 'dry-weather',
    question: 'How do I protect my hair in harmattan or dry weather?',
    asks: 'how do i protect my hair in harmattan|harmattan hair|dry season hair|dry weather hair care|winter hair care|cold weather hair|hair dry in winter|dusty weather hair',
    answer:
      'Dry, dusty air pulls water out of your hair all day, so the season calls for more sealing and more cover. Keep your ends tucked away, moisturise and seal more often, and cover your hair outdoors.',
    steps: [
      'Mist and seal the ends every two or three days, not just on wash day.',
      'Move from a lighter cream to a richer one for the season.',
      'Wear protective or tucked styles so the ends aren’t exposed.',
      'Cover up outdoors with a satin-lined hat or scarf against the dust.',
      'Wash on schedule, because dust and sweat build up on the scalp.',
    ],
    forYou: [
      {
        when: { climate: 'Dry / arid' },
        text: 'Your profile says dry climate, so this is your all-year routine, not just a seasonal one.',
      },
      {
        when: { climate: 'Cold / low humidity' },
        text: 'In your cold climate, indoor heating dries hair as much as the weather outside. Sleep on satin and keep your ends tucked through winter.',
      },
      {
        when: { hairType: 'Locs' },
        text: 'For locs, use a light water-based spray and a few drops of oil every few days. Leave heavy butters out even in dry weather. They only collect dust.',
      },
    ],
    next: { to: '/profile', label: 'Set your climate' },
  },
  {
    id: 'rosemary-oil',
    question: 'Does rosemary oil make hair grow?',
    asks: 'does rosemary oil work|rosemary oil|growth oil|hair growth serum|does castor oil grow hair|jamaican black castor oil',
    answer:
      'No oil makes your follicles grow hair faster than they already do. Rosemary oil is popular and pleasant for scalp massage, and the massage itself helps circulation. But length comes from keeping your ends, not from what goes on your scalp. If you use rosemary, or any essential oil, always dilute it.',
    steps: [
      'Mix a few drops into a carrier oil such as jojoba. Never put it on neat.',
      'Patch test on your skin before putting it on your scalp.',
      'Massage in with your fingertips for five minutes, a few times a week.',
      'Track your length on Hair Growth so you can see what’s actually working.',
    ],
    caution: 'Never use undiluted essential oils on the scalp. They burn. For thinning or patches, see a dermatologist.',
    next: { to: '/growth', label: 'Track your growth' },
  },
  {
    id: 'starter-kit',
    question: 'What products do I actually need?',
    asks: 'what products do i need|basic hair products|starter kit natural hair|beginner products|minimum products|too many products|product junkie|what should i buy first',
    answer:
      'Fewer than you think. A cleanser, a conditioner, a leave-in, one oil, one cream, a wide-tooth comb and something satin will cover almost every wash day. Every product you add is another one to suspect when something goes wrong.',
    steps: [
      'Sulphate-free cleanser, plus one clarifying shampoo for monthly use.',
      'A conditioner with good slip, which can double as your deep conditioner.',
      'A leave-in, a light oil and a cream.',
      'A wide-tooth comb and a microfibre towel or cotton T-shirt.',
      'A satin bonnet or pillowcase.',
    ],
    forYou: [
      {
        when: { hairType: 'Locs' },
        text: 'For locs, the kit is shorter: a residue-free shampoo, a light water-based spray, a few drops of light oil, a residue-free gel for the roots and a satin bonnet. No butters, no wax.',
      },
      {
        when: { preference: 'siliconeFree' },
        text: 'You’ve chosen silicone-free, and your shelf already filters those out.',
      },
    ],
    next: { to: '/products', label: 'See your product shelf' },
  },

  /* ---------------------------------------------------------------- *
   * Locs
   * ---------------------------------------------------------------- */
  {
    id: 'start-locs',
    question: 'How do I start locs?',
    asks: 'how do i start locs|starting locs|start my locs|which loc method|comb coils or twists|how to start dreadlocks|getting locs for the first time|best way to start locs',
    answer:
      'Decide on size first, because it fixes how many locs you’ll have for life and how long maintenance takes. Then choose a method: comb coils, two-strand twists, braids, interlocking or freeform. Shorter hair suits comb coils, longer hair suits twists or braids. Whatever you choose, the first six months are about patience and doing less.',
    steps: [
      'Choose the size. Larger locs are lower maintenance, smaller ones give more styling options.',
      'Choose the method that suits your length and how often you want to retwist.',
      'Start on clean, buildup-free hair.',
      'Set your loc start date on your profile so the app can track your stage.',
    ],
    caution: 'Your locs should never hurt as they’re put in. A loc installed too tight damages the follicle from day one.',
    next: { to: '/locs?open=starting', label: 'Open Starting your locs' },
  },
  {
    id: 'wash-starter-locs',
    question: 'Can I wash my starter locs?',
    asks: 'can i wash starter locs|washing new locs|how soon can i wash my locs|will washing unravel my locs|wash baby locs|first wash after starting locs',
    answer:
      'Yes, and you should. The idea that you shouldn’t wash new locs is the most damaging myth on the whole loc journey. Dirty hair doesn’t lock faster. It locks around oil and product, and that buildup stays with you for years. Wash every seven to ten days, through a stocking cap so the sections can’t slip.',
    steps: [
      'Put a nylon stocking cap or mesh loc sock over your locs.',
      'Use diluted residue-free shampoo along the scalp, then massage with your fingertips.',
      'Rinse until the water runs clear, then rinse again.',
      'Dry completely, under a hooded dryer or a full day in front of a fan.',
    ],
    forYou: [
      {
        when: { locStage: 'Starter' },
        text: 'You’re in the starter stage, so some unravelling is normal and fixable. Washing is still the right call: palm roll any that slip once they’re dry.',
      },
    ],
    hairTypes: LOCS,
    next: { to: '/guide/loc-starter-care', label: 'Open Starter Loc Survival' },
  },
  {
    id: 'wash-locs',
    question: 'How often should I wash my locs?',
    asks: 'how often should i wash my locs|wash locs frequency|how to wash locs|washing mature locs|loc wash day|locs shampoo',
    answer:
      'Every one to two weeks. The scalp is what you’re cleaning, the rinse should take twice as long as you think, and drying matters more than washing. A loc is a sponge, and anything left inside it turns into buildup or mildew.',
    steps: [
      'Dilute residue-free shampoo about one part to three parts warm water.',
      'Apply it along the scalp in rows and massage with your fingertips.',
      'Rinse until the water runs clear, then rinse again.',
      'Squeeze each loc from root to tip. Don’t wring them.',
      'Dry all the way through before bed.',
    ],
    forYou: [
      {
        when: { locStage: 'Starter' },
        text: 'At the starter stage, wash every seven to ten days through a stocking cap.',
      },
      {
        when: { locStage: 'Mature' },
        text: 'Mature locs can go a little longer between washes, but they hold more water. Give them longer to dry.',
      },
      {
        when: { locStage: 'Rooted' },
        text: 'Rooted locs are heavy and slow to dry, so a hooded dryer pays for itself. Never tie them up damp.',
      },
    ],
    hairTypes: LOCS,
    next: { to: '/guide/loc-wash-day', label: 'Open Loc Wash Day' },
  },
  {
    id: 'retwist-often',
    question: 'How often should I retwist my locs?',
    asks: 'my roots are a fuzzy mess|fuzzy roots|messy roots|how often should i retwist|retwist frequency|how often retwist locs|is retwisting every two weeks bad|retwist schedule|when to retwist|over retwisting',
    answer:
      'Every four to six weeks at the most, and eight is better. Every retwist puts tension on the same follicle in the same direction. Thin roots and loc-shaped gaps at the hairline almost always come from too much maintenance, not too little.',
    steps: [
      'Wash first, then retwist on barely damp hair.',
      'Follow the parts your locs already have. Don’t re-part to neaten the grid.',
      'Use a pea of residue-free gel at the root only.',
      'Roll two or three times in the direction the loc already turns.',
      'Let the roots dry completely before bed.',
    ],
    forYou: [
      {
        when: { locStage: 'Starter' },
        text: 'You’re at the starter stage, which is when retwisting too often does the most harm. Hold out for six to eight weeks.',
      },
      {
        when: { locStage: 'Mature' },
        text: 'Your locs are mature and hold their shape, so you can stretch to eight weeks or more. Some people stop retwisting altogether.',
      },
    ],
    caution:
      'If you interlock, keep it to no more than every eight weeks. Interlocking on a palm-rolling schedule reliably thins the roots.',
    hairTypes: LOCS,
    next: { to: '/guide/loc-retwist', label: 'Open Retwist Without Damage' },
  },
  {
    id: 'loc-smell',
    question: 'Why do my locs smell?',
    asks: 'my locs smell like a wet towel|locs smell like wet towel|why do my locs smell|locs smell musty|mildew locs|loc odour|locs smell after washing|locs stink|damp smell locs',
    answer:
      'Almost always it’s water left inside the loc. Locs that stay damp in the middle grow mildew, and that smell doesn’t wash out. It has to be cleared out with a clarify, and then you need to change how you dry.',
    steps: [
      'Clarify, and rinse for twice as long as feels necessary.',
      'Squeeze, then wrap in a microfibre towel for twenty minutes.',
      'Dry under a hooded dryer, or give them a full day with a fan.',
      'Squeeze a thick loc at the root. If it feels cool and damp inside, it isn’t dry.',
      'Never sleep on damp locs or tie them up wet.',
    ],
    forYou: [
      {
        when: { climate: 'Humid / tropical' },
        text: 'In your humid climate, locs dry slowly, so a hooded dryer or a fan is a necessity, not a luxury.',
      },
    ],
    caution: 'If the smell comes back within days of a proper clarify and dry, or your scalp is sore, have a loctician or a doctor check your scalp.',
    hairTypes: LOCS,
    next: { to: '/guide/loc-wash-day', label: 'Fix how you dry' },
  },
  {
    id: 'loc-buildup',
    question: 'How do I get lint and buildup out of my locs?',
    asks: 'how do i get lint out of my locs|lint in locs|buildup in locs|white stuff in my locs|residue in locs|deep clean locs|clean my locs',
    answer:
      'Surface buildup comes out with a proper clarify. Lint that’s been matted into the loc is mostly there for good, so the real fix is stopping more getting in. Heavy products and cotton are where both come from.',
    steps: [
      'Clarify with a residue-free shampoo and rinse until the water runs clear.',
      'Stop using butters, waxes and heavy creams on the length.',
      'Sleep in a satin bonnet and dry with microfibre, not a fluffy towel.',
      'Pick out surface lint gently once the locs are dry.',
    ],
    caution: 'Deep, embedded buildup or lint is a job for a loctician. Picking at the core of a loc weakens it.',
    hairTypes: LOCS,
    next: { to: '/locs?open=problems', label: 'Open Loc problems' },
  },
  {
    id: 'dry-locs',
    question: 'My locs feel dry. What do I do?',
    asks: 'my locs are dry|dry locs fix|how to moisturise locs|brittle locs|locs feel hard|moisturise dreadlocks',
    answer:
      'Locs dry out from the inside, and reaching for more product usually makes it worse. Start by ruling out buildup: if water beads on the loc instead of soaking in, the loc is coated, not thirsty. Otherwise the answer is water, and less of everything else.',
    steps: [
      'Check for beading. If water sits on top, clarify first.',
      'Mist until the locs are damp, then squeeze the water in with your palms.',
      'Seal with a few drops of a light oil. No butters.',
      'Treat your scalp separately, through an applicator nozzle.',
      'Cover overnight with satin.',
    ],
    forYou: [
      {
        when: { climate: 'Dry / arid' },
        text: 'In your dry climate, mist every two or three days rather than only on wash day.',
      },
    ],
    caution: 'Locs that snap rather than bend may need protein rather than water. A protein rinse two or three times a year is enough for most locs.',
    hairTypes: LOCS,
    next: { to: '/guide/loc-dryness', label: 'Open Dry, Brittle Locs' },
  },
  {
    id: 'loc-thinning',
    question: 'My locs are thinning at the root',
    asks: 'my locs are thinning at the root|thin roots locs|loc breaking at root|weak locs|one of my locs is about to fall off|one loc is thinning|loc about to fall off|loc hanging by a thread|loc snapping off|loc falling off|locs getting thinner',
    answer:
      'A loc that has gone thin and stringy where it meets your scalp is at risk of snapping off. Tension is almost always the cause: retwisting too tight or too often, re-parting, or the weight of long locs. Stop the tension now, and get it looked at while it can still be repaired.',
    steps: [
      'Pause retwisting the thin locs.',
      'Wear loose styles, with no updos pulling on those roots.',
      'Support long, heavy locs rather than letting them hang from thin roots.',
      'See a loctician about repairing the weak points before they break.',
    ],
    caution: 'Thinning spreading across your scalp, or at the crown, is a dermatologist visit as well as a loctician one.',
    hairTypes: LOCS,
    next: { to: '/locs?open=roots', label: 'Open Loc and root health' },
  },
  {
    id: 'loc-unravel',
    question: 'Why are my locs unravelling?',
    asks: 'why are my locs unravelling|locs coming undone|starter locs unravelling|locs falling apart|locs loosening|my twists are unravelling',
    answer:
      'In starter and budding locs it’s normal. The hair hasn’t matted yet, and washing and sleeping loosen it. It isn’t a reason to stop washing. Protect the locs while they mature and palm roll the ones that slip.',
    steps: [
      'Wash through a stocking cap so the sections can’t slip.',
      'Once they’re dry, palm roll any that loosened.',
      'Cover them every night with satin.',
      'Stop using conditioner, which keeps hair slippery and stops it locking.',
      'Give it time. Most locs settle within the first few months.',
    ],
    forYou: [
      {
        when: { locStage: 'Starter' },
        text: 'You’re at the starter stage, exactly when this happens most. It isn’t failure.',
      },
    ],
    hairTypes: LOCS,
    next: { to: '/guide/loc-starter-care', label: 'Open Starter Loc Survival' },
  },
  {
    id: 'loc-avoid',
    question: 'What should I never put on my locs?',
    asks: 'what should i never put on my locs|what to avoid on locs|is beeswax bad|loc wax|heavy products locs|petroleum on locs|conditioner on locs',
    answer:
      'Waxes (including beeswax), petroleum-based gels, heavy butters, and conditioner on the length. They don’t rinse out of a loc. They sit in the core, attract lint, stop the loc tightening and can go rancid. Getting them out means a harsh clarify or the scissors.',
    steps: [
      'Read the ingredients on the back, not the claims on the front.',
      'For moisture, the first ingredient should be water.',
      'Use a residue-free gel at the root only, a pea at a time.',
      'Use a few drops of light oil at most on the length.',
    ],
    hairTypes: LOCS,
    next: { to: '/products?open=avoid', label: 'See what to leave on the shelf' },
  },
  {
    id: 'loc-ugly-stage',
    question: 'Why do my locs look so messy?',
    asks: 'my locs are in their awkward phase|awkward phase locs|awkward stage|why do my locs look messy|locs look frizzy|ugly stage locs|budding stage|locs look bad|loc frizz|when will my locs look neat',
    answer:
      'Somewhere between month three and month eight, locs look their worst. That’s the budding stage doing exactly what it should: the hair is matting from the inside, and the frizz is part of it. Retwisting it away only slows it down.',
    steps: [
      'Photograph your locs monthly. It’s the only way to see progress you can’t see day to day.',
      'Keep your retwisting schedule. Don’t retwist the frizz away.',
      'Wear a headwrap or a loc style that you love on the days it bothers you.',
      'Check your profile for your loc stage. It updates from your start date.',
    ],
    forYou: [
      {
        when: { locStage: 'Budding' },
        text: 'Your profile has you in the budding stage, which is the messy part. It passes.',
      },
    ],
    hairTypes: LOCS,
    next: { to: '/locs/styles', label: 'Find a loc style for now' },
  },
  {
    id: 'loctician',
    question: 'When should I see a loctician?',
    asks: 'when should i see a loctician|do i need a loctician|loctician or diy|loc repair|combining locs|fixing a broken loc',
    answer:
      'When something needs repairing rather than maintaining: a loc thinning at the root, a loc that has broken, locs that need combining or separating, embedded buildup, or an install you want to get right from day one. Routine washing and retwisting you can do yourself.',
    steps: [
      'Bring photos of how your locs have changed over the last few months.',
      'Tell them your retwist history and the products you use.',
      'Ask them not to re-part your locs or retwist them tighter than before.',
    ],
    caution: 'A sore, bleeding or patchy scalp under your locs is a dermatologist visit, not a loctician one.',
    hairTypes: LOCS,
    next: { to: '/locs?open=professional', label: 'Open Professional care' },
  },

  /* ---------------------------------------------------------------- *
   * Community and help
   * ---------------------------------------------------------------- */
  {
    id: 'community',
    question: 'How do I connect with the AfroCoils community?',
    asks: 'how do i connect with the community|afrocoils community|join the community|other naturals|talk to other people|community tips|share my hair journey|community feed',
    answer:
      'The style library is the community’s work: every style in it was contributed by someone who wears it, and you can add yours. Tips other users have collected are on About. A feed for posts and conversations needs a server and moderation first, so rather than fill it with invented people, that space is being held.',
    steps: [
      'Share a style you wear, with your photos, from Hair Styles.',
      'Read the community’s collected tips on About.',
      'Tell the team what you would like the community to have.',
    ],
    next: { to: '/styles/submit', label: 'Share your style' },
  },
  {
    id: 'real-person',
    question: 'Can I talk to a real hair expert?',
    asks: 'can i talk to a real person|talk to an expert|hair consultant|book a consultation|speak to someone|is there a stylist i can ask|human help',
    answer:
      'There’s no stylist on call inside the app. Everything here was written by people who wear and look after this hair, and Contact reaches the team who make it. For anything medical, such as shedding in patches, scalp pain or sores, the right expert is a dermatologist or trichologist.',
    steps: [
      'Write to the team through Contact with what you came looking for.',
      'For a hands-on problem, a loctician or a natural hair stylist can see what the app can’t.',
      'For anything painful, patchy or getting worse, book a dermatologist.',
    ],
    next: { to: '/legal/contact', label: 'Contact the team' },
  },
]
