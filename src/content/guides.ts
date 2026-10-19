import type { IconName } from '../components/Icon'
import type { HairType, LocStage } from '../lib/types'

/**
 * Long-form care guides. Content is data rather than markup so the same screen
 * renders all of them, and so it can move to a CMS or API later without
 * touching the UI.
 *
 * The three seeded here are the cards the SOS screen links to. Guidance follows
 * the rules the whole app is written to: protect the hair first, no brushing dry
 * type 4 hair, product categories rather than brands.
 */

export interface GuideStep {
  title: string
  body: string
}

export interface Guide {
  slug: string
  title: string
  badge?: string
  icon: IconName
  summary: string
  minutes: number
  /** Tailwind classes for the header band, using design tokens. */
  theme: string
  toolsAndProducts: string[]
  steps: GuideStep[]
  cautions: string[]
  /**
   * Which hair types the guide is written for. Omitted means both.
   *
   * Unlike the style library, guides default to *both* rather than to
   * loose-only: a guide is prose the reader can judge for themselves,
   * where a style is an instruction the app is effectively endorsing.
   * The loose-specific ones below are marked explicitly.
   */
  hairTypes?: HairType[]
  /** Loc stages this is aimed at, for ordering on the locs surfaces. */
  locStages?: LocStage[]
  /**
   * What the guide was written against.
   *
   * Not decoration. This content is original prose, but the claims in it
   * — how long a style can safely stay in, what counts as normal daily
   * shedding, what chelating actually does — are checkable, and a hair
   * app that cannot show its working is indistinguishable from the blogs
   * that cannot either. Where the evidence is weak, the guide says so and
   * the source says who published it.
   */
  sources?: { label: string; url: string }[]
}

export function guideHairTypes(guide: Guide): HairType[] {
  return guide.hairTypes ?? ['Loose Natural', 'Locs']
}

/** Guides relevant to a hair type, in library order. */
export function guidesFor(hairType: HairType | undefined): Guide[] {
  if (!hairType) return GUIDES
  return GUIDES.filter((guide) => guideHairTypes(guide).includes(hairType))
}

export const GUIDES: Guide[] = [
  {
    slug: 'dryness-rescue',
    title: 'Dryness Rescue',
    badge: 'Urgent Care',
    icon: 'water_drop',
    summary:
      'When your coils feel like straw, the L.O.C. method rebuilds moisture in layers rather than piling on product. Bring back the bounce in about twenty minutes.',
    minutes: 20,
    theme: 'bg-primary-fixed text-primary',
    toolsAndProducts: [
      'Spray bottle of water',
      'Leave-in conditioner (the "L")',
      'Light oil — jojoba or grapeseed (the "O")',
      'Curl cream or butter (the "C")',
      'Wide-tooth comb',
      'Satin scarf or bonnet',
    ],
    steps: [
      {
        title: 'Rehydrate first',
        body: 'Mist section by section until the hair is genuinely damp, not just misted on the surface. Dry hair cannot absorb product — water is the actual moisturiser, everything after it is there to keep the water in.',
      },
      {
        title: 'Liquid — leave-in on damp hair',
        body: 'Work a leave-in through each section with your fingers while it is still wet. Rake it through rather than raking it in; you want even coverage from root to tip.',
      },
      {
        title: 'Oil — seal the cuticle',
        body: 'A few drops of a light oil, emulsified between your palms, smoothed down the length. This slows water loss. Go light: oil on its own does not moisturise, it only seals what is already there.',
      },
      {
        title: 'Cream — lock it in',
        body: 'Finish with a curl cream or butter on the mid-lengths and ends, which are the oldest and driest parts of the strand. Skip the scalp.',
      },
      {
        title: 'Style low-tension and cover',
        body: 'Twist or band into two to four sections and let it air dry. Sleep in satin — cotton wicks out everything you just put in.',
      },
    ],
    cautions: [
      'If hair feels dry and also snaps easily, it may need protein rather than more moisture. Add a protein treatment before repeating this.',
      'Reversing the order (oil before water) seals dryness in. The sequence is the whole point.',
    ],
    // Raking product through sections and re-twisting them is loose-hair
    // technique. Locs get their own dryness guide below.
    hairTypes: ['Loose Natural'],
  },
  {
    slug: 'scalp-relief',
    title: 'Scalp Relief',
    icon: 'spa',
    summary:
      'Itch is a signal, not a personality trait. Work out whether it is buildup, dryness, or irritation before you treat it — the three want opposite things.',
    minutes: 15,
    theme: 'bg-tertiary-fixed text-on-tertiary-fixed',
    toolsAndProducts: [
      'Clarifying or gentle cleansing shampoo',
      'Soothing scalp oil — tea tree, peppermint, or rosemary, diluted',
      'Applicator bottle',
      'Microfibre towel',
    ],
    steps: [
      {
        title: 'Work out which itch it is',
        body: 'Flakes that are large, greasy and yellowish point to buildup or seborrhoeic dermatitis. Small dry white flakes with tightness point to dryness. Redness and soreness without flaking points to irritation — often from a product or too-tight styling.',
      },
      {
        title: 'If it is buildup: clarify',
        body: 'Wash with a clarifying shampoo, focusing on the scalp rather than the lengths. Use the pads of your fingers, never your nails. Once a month is plenty; more strips the scalp and starts the cycle again.',
      },
      {
        title: 'If it is dryness: cleanse gently, then oil',
        body: 'Use a mild sulphate-free cleanser, then apply a diluted scalp oil directly to the parts while the scalp is still slightly damp.',
      },
      {
        title: 'If it is irritation: stop and simplify',
        body: 'Take out tight styles. Drop back to the fewest products you can. Reintroduce one at a time over a week or two so you can identify the culprit.',
      },
      {
        title: 'Massage',
        body: 'Five minutes of fingertip massage, in circles. It lifts product, brings blood to the follicles, and is the cheapest thing on this list.',
      },
    ],
    cautions: [
      'Persistent flaking, bleeding, sores, or hair loss in patches is a dermatologist visit, not a product problem.',
      'Never use undiluted essential oils on the scalp — they burn.',
    ],
  },
  {
    slug: 'detangling-magic',
    title: 'Detangling Magic',
    icon: 'auto_awesome',
    summary:
      'Do not reach for the scissors. Almost every knot comes out with enough slip and enough patience — the two things people skip when they are in a hurry.',
    minutes: 30,
    theme: 'bg-secondary-fixed text-on-secondary-fixed',
    toolsAndProducts: [
      'Conditioner with good slip',
      'Spray bottle of water',
      'Wide-tooth comb or a detangling brush',
      'Hair clips for sectioning',
      'Patience — genuinely the active ingredient',
    ],
    steps: [
      {
        title: 'Never detangle dry',
        body: 'Dry type 4 hair snaps under a comb. Saturate with water, then layer conditioner over it until the section feels slippery rather than grippy.',
      },
      {
        title: 'Section into four or more',
        body: 'Clip away everything you are not working on. Trying to detangle a whole head at once is how single tangles become one large mat.',
      },
      {
        title: 'Fingers before tools',
        body: 'Separate the big tangles by hand first. Your fingers feel a knot before they tear it; a comb does not.',
      },
      {
        title: 'Comb from the ends upward',
        body: 'Start at the very ends and work up in short passes. Combing root-to-tip pushes every tangle down into one immovable knot at the bottom.',
      },
      {
        title: 'For a stubborn knot',
        body: 'More conditioner, then work it apart with two hands, easing the hairs sideways rather than pulling through. Most single knots give way inside a minute or two.',
      },
      {
        title: 'Twist as you go',
        body: 'Twist or braid each finished section so it cannot re-tangle while you work on the rest.',
      },
    ],
    cautions: [
      'If a knot has hair wound around itself in a hard bead — a fairy knot or a mat — cutting that single strand is the right call. Cutting is a last resort, not a first one.',
      'Detangling on wash day, with conditioner in, is far easier than mid-week. Build it into the routine rather than treating it as an emergency.',
    ],
    hairTypes: ['Loose Natural'],
  },

  /* ---------------------------------------------------------------- *
   * Locs
   * ---------------------------------------------------------------- */
  {
    slug: 'loc-starter-care',
    title: 'Starter Loc Survival',
    badge: 'First 6 months',
    icon: 'shield',
    summary:
      'The first months decide whether the locs make it. Almost everything that goes wrong at this stage comes from doing too much, too often, with too heavy a product.',
    minutes: 15,
    theme: 'bg-tertiary-fixed text-on-tertiary-fixed',
    hairTypes: ['Locs'],
    locStages: ['Starter', 'Budding'],
    toolsAndProducts: [
      'Nylon stocking cap or mesh loc sock',
      'Residue-free shampoo',
      'Light, water-based loc spray',
      'Satin bonnet or scarf',
      'Hooded dryer, or a lot of patience',
    ],
    steps: [
      {
        title: 'Wash. Genuinely, wash them',
        body: 'The advice to avoid washing new locs is the most damaging myth in the whole journey. Dirty hair does not lock faster — it locks around sebum and product, which is buildup you will be fighting for years. Wash every seven to ten days, through a stocking cap so the sections cannot slip.',
      },
      {
        title: 'Dry completely, every time',
        body: 'A loc holds water in the middle where you cannot feel it. Damp locs grow mildew, and the smell does not wash out — it has to be clarified out, or cut out. Sit under a hooded dryer, or give them the whole day in front of a fan. Never sleep on damp locs.',
      },
      {
        title: 'Retwist far less often than you want to',
        body: 'Four to six weeks minimum, and eight is better. Every retwist is tension on the same follicle in the same direction. Thin, receding roots and loc-shaped bald patches at the hairline are almost always over-maintenance, not under-maintenance.',
      },
      {
        title: 'Water-based products only',
        body: 'If the first ingredient is not water, it does not belong on a starter loc. Butters, beeswax and petroleum-based loc gels sit inside the loc, stop it tightening, and go rancid. Read the label rather than the front of the tub.',
      },
      {
        title: 'Separate, do not pick',
        body: 'Once a week, gently pull apart any locs that are starting to marry at the root. That is the only handling a starter loc needs. Picking at the body of a loc to inspect the buds undoes the matting you are waiting for.',
      },
      {
        title: 'Cover them at night',
        body: 'Satin bonnet or scarf, every single night. Cotton pillowcases pull lint into a starter loc, and lint inside a loc is permanent.',
      },
    ],
    cautions: [
      'Locs look their worst somewhere between month three and month eight. That is the budding stage doing exactly what it should. Photograph them monthly — it is the only way to see progress that is invisible day to day.',
      'A loc that hurts is too tight. Tension damage at the follicle is the one kind of loc damage that does not grow back.',
      'Anything sold as "loc wax" should be put back on the shelf. It does not rinse out, and removing it means a harsh clarify or scissors.',
    ],
  },
  {
    slug: 'loc-wash-day',
    title: 'Loc Wash Day',
    icon: 'water_drop',
    summary:
      'Washing locs is not washing loose hair with extra steps. The scalp is the target, the rinse is twice as long, and the drying matters more than the washing.',
    minutes: 60,
    theme: 'bg-primary-fixed text-primary',
    hairTypes: ['Locs'],
    toolsAndProducts: [
      'Residue-free shampoo (clarifying, no conditioning agents)',
      'Applicator bottle for diluting',
      'Stocking cap or mesh net, if your locs are starter or budding',
      'Microfibre towel',
      'Hooded dryer or a strong fan',
    ],
    steps: [
      {
        title: 'Dilute the shampoo',
        body: 'Neat shampoo poured over locs will not rinse out evenly. Mix roughly one part shampoo to three parts warm water in an applicator bottle so you can put it exactly where it belongs.',
      },
      {
        title: 'Apply to the scalp in rows',
        body: 'Part the locs in rows and run the bottle along the scalp. The length gets clean from what runs down it — deliberately scrubbing the body of a loc frizzes it and achieves nothing.',
      },
      {
        title: 'Massage with fingertips only',
        body: 'Pads, never nails. Two or three minutes of proper massage lifts more buildup than a second shampoo does.',
      },
      {
        title: 'Rinse for twice as long as you think',
        body: 'This is the step everyone shortens and the step that matters most. A loc is a sponge; shampoo left inside it dries into buildup. Rinse until the water runs completely clear, then rinse again.',
      },
      {
        title: 'Squeeze, then towel',
        body: 'Squeeze each loc from root to tip — do not wring or twist. Wrap in a microfibre towel for twenty minutes and let it pull the bulk of the water out.',
      },
      {
        title: 'Dry all the way through',
        body: 'Under a hooded dryer on medium, or a full day of air with a fan on them. Squeeze a thick loc at the root before you call it done. If it is cool and damp inside, it is not dry.',
      },
    ],
    cautions: [
      'Conditioner is optional at best and a problem at worst — conditioning agents are designed not to rinse fully out, which is the opposite of what a loc needs. If you use one, keep it to the ends and rinse hard.',
      'Do not retwist immediately after washing while the hair is soaking. Damp is fine, wet traps water at the root.',
      'A sour or musty smell means water was left inside a loc. Clarify, dry properly, and change how long you dry for.',
    ],
  },
  {
    slug: 'loc-retwist',
    title: 'Retwist Without Damage',
    badge: 'Maintenance',
    icon: 'grass',
    summary:
      'Root maintenance is where locs are most often damaged, and always in the same two ways: too tight, and too often. Neither is fixable afterwards.',
    minutes: 90,
    theme: 'bg-secondary-fixed text-on-secondary-fixed',
    hairTypes: ['Locs'],
    toolsAndProducts: [
      'Residue-free tightening gel — not wax, not butter',
      'Rat-tail comb for parting',
      'Clips',
      'Satin scarf for setting',
      'Interlocking tool, only if that is your method',
    ],
    steps: [
      {
        title: 'Wash first, retwist second',
        body: 'Retwisting over buildup seals the buildup in at the root. Clean, barely damp hair holds a twist better anyway.',
      },
      {
        title: 'Keep the parts you already have',
        body: 'Re-parting to make the grid neater takes hair from the edge of one loc and gives it to another. Over time that thins both. Follow the parts your locs have made.',
      },
      {
        title: 'A pea of gel, at the root only',
        body: 'Product on the length of the loc is buildup with extra steps. All you are doing is holding new growth in place for a few days while it sets.',
      },
      {
        title: 'Roll in the direction the loc already turns',
        body: 'Two or three palm rolls, following the existing twist. Fighting the direction of the loc unwinds it from the inside.',
      },
      {
        title: 'Interlocking: no more than every eight weeks',
        body: 'Interlocking holds far longer than palm rolling and is far harsher on the follicle. Doing it on a palm-rolling schedule is a reliable way to thin your roots out.',
      },
      {
        title: 'Set, then dry completely',
        body: 'Satin scarf for an hour or under a dryer. Then let the roots dry all the way through before bed.',
      },
    ],
    cautions: [
      'Pain, bumps along the hairline, or a headache afterwards all mean it was too tight. Loosen the ones you can and go gentler next time.',
      'Thinning at the root — a loc that has gone thin and stringy where it meets the scalp — is a warning that the loc may snap off. It can often be repaired by a loctician before that point.',
      'Freeform is a legitimate method, not neglect. If retwisting is damaging your hairline, stopping is a real option.',
    ],
  },
  {
    slug: 'loc-dryness',
    title: 'Dry, Brittle Locs',
    badge: 'Urgent Care',
    icon: 'water_drop',
    summary:
      'Locs go dry from the inside out, and the instinct — more product — usually makes it worse. Almost always the answer is water, and less of everything else.',
    minutes: 25,
    theme: 'bg-primary-fixed text-primary',
    hairTypes: ['Locs'],
    toolsAndProducts: [
      'Continuous mist spray bottle of water',
      'Light water-based loc spray or rosewater',
      'A few drops of a light oil — jojoba or grapeseed',
      'Clarifying shampoo, if it turns out to be buildup',
    ],
    steps: [
      {
        title: 'Rule out buildup first',
        body: 'Hair that will not absorb anything is usually coated, not thirsty. If water beads on the surface of the loc rather than soaking in, you need a clarify, not more moisture.',
      },
      {
        title: 'Water, properly',
        body: 'Mist until the locs are genuinely damp, not surface-wet. Squeeze the water in with your palms so it reaches the middle of the loc rather than sitting on the outside.',
      },
      {
        title: 'A light oil, sparingly',
        body: 'A few drops between the palms, smoothed over the length. Oil does not moisturise — it slows the water you just added from leaving. Heavy butter here is what caused the problem last time.',
      },
      {
        title: 'Scalp separately',
        body: 'The scalp gets its own treatment through an applicator nozzle. Do not treat the scalp by soaking the length.',
      },
      {
        title: 'Cover overnight',
        body: 'Satin bonnet. Locs left uncovered lose the water again by morning and the cycle restarts.',
      },
    ],
    cautions: [
      'Do not add moisture and then go to bed with genuinely wet locs. Damp is the target; wet is how mildew starts.',
      'Brittle locs that snap rather than bend may need protein rather than water. A protein rinse two or three times a year is enough for most locs.',
    ],
  },
  {
    slug: 'tension-and-traction',
    title: 'Tension and Traction',
    badge: 'Read this one',
    icon: 'warning',
    summary:
      'The one kind of hair loss that is entirely preventable, and the one most often caused by styles marketed as protective. Caught early it grows back. Left long enough it does not.',
    minutes: 12,
    theme: 'bg-primary-container text-on-primary-container',
    toolsAndProducts: [
      'A mirror you can see your hairline in',
      'Your phone camera, for a monthly photo',
      'Nothing else — this one is about what to stop doing',
    ],
    steps: [
      {
        title: 'Know what you are looking for',
        body: 'Traction alopecia starts at the edges: the temples, the hairline, and behind the ears — wherever a style pulls hardest. Early on you see thinning and shorter, finer hairs rather than a bald patch, and often small bumps around the follicles. The tell that comes before any of that is simpler: it hurt when it was put in.',
      },
      {
        title: 'Pain is not part of the process',
        body: 'If a style hurts, stings, or gives you a headache, it is too tight. That is not the style settling and it is not your scalp toughening up — it is tension on the follicle. Dermatologists give the same instruction: if it is painful, take it down. A style you have paid for and sat six hours in is still not worth a follicle.',
      },
      {
        title: 'Put a clock on every style',
        body: 'The American Academy of Dermatology gives braids about three months and weaves or extensions about eight weeks. The number matters less than the principle: every protective style has an expiry, and wearing one past it stops protecting and starts pulling.',
      },
      {
        title: 'Do not go straight into the next one',
        body: 'Back-to-back installs are where most damage accumulates, because the scalp never gets a stretch of time without tension. Leave real gaps between styles. This is the single change that does the most, and it is free.',
      },
      {
        title: 'Never stack tension on chemically weakened hair',
        body: 'Tension plus relaxer, or tension plus regular heat, is worse than either alone — the shaft is already weakened, so it gives before the follicle does, and then the follicle gives too. If you relax or press, keep your styles loose.',
      },
      {
        title: 'Photograph your hairline monthly',
        body: 'Same light, same angle, once a month. Hairline recession is far too slow to notice in a mirror day to day, and a photo from six months ago is the only reliable way to catch it while it is still reversible.',
      },
      {
        title: 'Know the other one, too',
        body: 'Central centrifugal cicatricial alopecia (CCCA) is different: it starts at the crown rather than the edges and spreads outward, usually from around age thirty. It is the most common scarring hair loss in Black women — estimates put it near 15% — and it is not simply caused by styling. It is a medical condition with a genetic component, and early treatment is what prevents it spreading. Thinning at the crown is a dermatologist appointment, not a product decision.',
      },
    ],
    cautions: [
      'Once a follicle scars, hair cannot regrow from it. That is what makes early action the whole game here — this is the one topic in the app where waiting to see costs something you cannot get back.',
      'Thinning at the crown, patchy loss, scalp pain, bumps or sores need a dermatologist, ideally one who treats textured hair. Nothing in this app substitutes for that.',
      'Locs are not exempt. Tight retwisting causes exactly the same traction at the root, and a heavy loc pulls on its own follicle all day.',
    ],
    sources: [
      {
        label: 'American Academy of Dermatology — Hairstyles that pull can lead to hair loss',
        url: 'https://www.aad.org/public/diseases/hair-loss/causes/hairstyles',
      },
      {
        label: 'Johns Hopkins Medicine — Hair loss in Black women',
        url: 'https://www.hopkinsmedicine.org/health/wellness-and-prevention/hair-loss-in-black-women-tips-from-an-expert',
      },
      {
        label: 'DermNet — Central centrifugal cicatricial alopecia',
        url: 'https://dermnetnz.org/topics/central-centrifugal-cicatricial-alopecia',
      },
      {
        label: 'StatPearls (NCBI) — Central centrifugal cicatricial alopecia',
        url: 'https://www.ncbi.nlm.nih.gov/books/NBK559187/',
      },
    ],
  },
  {
    slug: 'shedding-or-breakage',
    title: 'Shedding or Breakage?',
    icon: 'search',
    summary:
      'Both look like hair in your hands and both feel like disaster. They have opposite causes and opposite fixes, and one strand tells you which you are dealing with.',
    minutes: 8,
    theme: 'bg-secondary-fixed text-on-secondary-fixed',
    toolsAndProducts: [
      'A single strand from the floor',
      'Good light',
      'A plain surface to look at it against',
    ],
    steps: [
      {
        title: 'Look at the end of the strand',
        body: 'A shed hair has a small pale bulb at one end — the root, released by the follicle at the end of its natural cycle. A broken hair has no bulb. It is a fragment, frayed or blunt at both ends. This is the whole test, and it takes ten seconds.',
      },
      {
        title: 'Then look at the length',
        body: 'Shed hairs are full length, as long as the section they came from. Breakage gives you short pieces — an inch or two — that could not possibly be a whole hair from your head. A hairbrush or comb full of short fragments with no bulbs is breakage, however much it looks like loss.',
      },
      {
        title: 'If it is shedding, count before you panic',
        body: 'Fifty to a hundred hairs a day is normal, and that is the figure the AAD uses. On textured hair worn in a style for a week, seven days of normal shedding all arrives at once on wash day and looks catastrophic. It is not — it is arithmetic.',
      },
      {
        title: 'If shedding is genuinely heavy, look back three months',
        body: 'Telogen effluvium pushes an unusual number of follicles into their resting phase at once, and the shed shows up roughly three months after whatever caused it: illness, surgery, childbirth, a crash diet, severe stress. The lag is why it never seems connected to anything. It usually resolves on its own.',
      },
      {
        title: 'If it is breakage, look at what you are doing to it',
        body: 'Breakage is mechanical or chemical, so the cause is in your routine, not your body. Dry detangling, cotton pillowcases, tight styles, heat, and protein-moisture imbalance are the usual five. Work through them one at a time — changing everything at once means learning nothing.',
      },
      {
        title: 'Check where on the strand it breaks',
        body: 'Ends breaking means age and wear; the ends are the oldest part of the hair and have survived every wash you have ever done. Mid-shaft breaking points at a weak spot from heat or chemical damage. Breaking at the root is tension, and that belongs to the traction guide, not this one.',
      },
    ],
    cautions: [
      'Heavy shedding that carries on beyond six months, or comes with patches, scalp pain or visible scalp, is a dermatologist visit.',
      'Shedding is your follicles doing their job. You cannot moisturise or protein-treat your way out of it, and products that promise to stop it are selling you something.',
    ],
    sources: [
      {
        label: 'American Academy of Dermatology — Hair shedding vs hair loss',
        url: 'https://www.aad.org/public/diseases/hair-loss/insider/shedding',
      },
      {
        label: 'Cleveland Clinic — Telogen effluvium',
        url: 'https://my.clevelandclinic.org/health/diseases/24486-telogen-effluvium',
      },
    ],
  },
  {
    slug: 'protein-moisture-balance',
    title: 'Protein and Moisture',
    icon: 'science',
    summary:
      'Not a ladder with more at the top — a balance, where both failure modes feel like damage. Dry and snapping is one end. Mushy and limp is the other. Treating the wrong one makes it worse.',
    minutes: 10,
    theme: 'bg-tertiary-fixed text-on-tertiary-fixed',
    toolsAndProducts: [
      'A wet strand you are willing to sacrifice',
      'Deep conditioner (moisture)',
      'A protein or reconstructing treatment',
      'Patience — this is diagnosed over weeks, not one wash',
    ],
    steps: [
      {
        title: 'Understand what you are balancing',
        body: 'Hair is roughly 80–90% keratin protein. Protein is the structure; water is what makes it flexible. Too little protein and there is not enough structure to hold — the strand stretches and snaps. Too much and it is rigid with nothing to give — the strand snaps without stretching at all. Both end in breakage, from opposite directions.',
      },
      {
        title: 'The stretch test',
        body: 'Take a wet strand and pull it gently. Healthy hair stretches a little and springs back. Hair that stretches a long way, feels gummy, and does not return needs protein. Hair that does not stretch at all and snaps immediately needs moisture. Do this on several strands from different sections — one strand is an anecdote.',
      },
      {
        title: 'Read how it feels dry',
        body: 'Needs protein: limp, over-elastic, mushy when wet, will not hold a style, curl pattern looking looser than it used to. Needs moisture: rough, straw-like, tangles constantly, dull, brittle. The confusing part is that both are commonly described by the person experiencing them as "dry".',
      },
      {
        title: 'Move one lever, then wait',
        body: 'Change one thing and give it two or three wash days before judging. Hair responds slowly and every product in your routine contributes to both sides of this balance, so changing three things at once tells you nothing about which one worked.',
      },
      {
        title: 'Know that water alone can overdo it',
        body: 'Hair takes on 12–18% of its own weight in water and physically swells; repeated soak-and-dry cycles fatigue the cuticle. This is why very long conditioning soaks and daily wetting can leave hair weaker rather than better hydrated — the damage looks exactly like dryness, which sends people to do more of it.',
      },
      {
        title: 'Porosity changes the answer',
        body: 'High-porosity hair takes on water fast and loses it fast, so it needs more protein and more sealing. Low-porosity hair resists water going in, which also makes it much harder to over-hydrate — it needs less protein and gentle heat to get moisture in at all. Your porosity result on the profile is doing this work already.',
      },
    ],
    cautions: [
      'Protein-sensitive hair exists and reacts badly to treatments most people tolerate. If you have set that preference on your profile, anything relying on them is dropped from your style library rather than shown to you greyed out.',
      'Deep protein treatments are a monthly measure at most for most people. Weekly is how the other failure mode starts.',
      'A relaxer, colour or bleach permanently shifts you towards needing protein. It is not a phase you balance out of.',
    ],
    sources: [
      {
        label: 'Briogeo — The balancing act of moisture and protein',
        url: 'https://shop.briogeohair.com/blogs/b-spoke/the-balancing-act-of-moisture-protein-for-your-hair',
      },
      {
        label: 'Davines — What is hygral fatigue',
        url: 'https://us.davines.com/blogs/news/what-is-hygral-fatigue',
      },
    ],
  },
  {
    slug: 'hard-water',
    title: 'Hard Water',
    icon: 'water_drop',
    summary:
      'If your hair feels coated however carefully you wash it, and every product seems to stop working, the problem may be the water rather than anything you are putting on afterwards.',
    minutes: 9,
    theme: 'bg-primary-fixed text-primary',
    toolsAndProducts: [
      'Chelating shampoo — look for EDTA in the ingredients',
      'Deep conditioner, for straight after',
      'A shower filter, if you want the standing fix',
      'Bottled or filtered water for a final rinse, as a cheap test',
    ],
    steps: [
      {
        title: 'Work out whether you have it',
        body: 'Limescale on the kettle, spots on glassware, soap that will not lather. On hair it reads as: film that will not rinse away, hair that feels rough and looks dull, product that has stopped working, and more tangling than the style should cause. If you set hard water on your profile, the product shelf already accounts for it.',
      },
      {
        title: 'Understand why clarifying is not enough',
        body: 'Dissolved calcium and magnesium bind ionically to the keratin in your hair. That is a chemical bond, not a layer of grease sitting on top, which is why a clarifying shampoo aimed at product buildup does not shift it. You need something that binds the minerals more strongly than your hair does.',
      },
      {
        title: 'Use a chelating shampoo, and read the label',
        body: 'Chelating agents — EDTA is the common one — grab the mineral ions and take them away down the drain. "Clarifying" and "chelating" are marketed as if they were the same thing and are not; check for the actual ingredient rather than the word on the front.',
      },
      {
        title: 'Always deep condition immediately after',
        body: 'Chelating is aggressive by design. It strips minerals and it will strip moisture along with them, so follow it with a deep conditioner in the same session. Never chelate and then walk away.',
      },
      {
        title: 'Do it on a schedule, not on a whim',
        body: 'Once or twice a month suits most people; more if your water is very hard or you swim. Weekly chelating on coily hair is over-treatment. Log it as a clarify on your calendar so the app can tell you when it is next due.',
      },
      {
        title: 'Consider fixing it at the tap',
        body: 'A shower filter treats the cause rather than the symptom and costs less than a year of specialist products. If you cannot fit one, a final rinse from a bottle of filtered water gets you most of the benefit on wash day.',
      },
    ],
    cautions: [
      'Mineral buildup raises the cuticle and increases porosity over time, so hard water hair often reads as high porosity on a test. Re-test after a few months of chelating.',
      'Chelating shampoos strip colour. If your hair is dyed, expect fade and space treatments accordingly.',
      'Locs hold minerals in the core where you cannot see them. Use a chelating soak rather than a surface wash, and dry all the way through afterwards.',
    ],
    sources: [
      {
        label: 'Strut Health — How to clarify hair if you have hard water',
        url: 'https://www.struthealth.com/blog/how-to-clarify-hair-if-you-have-hard-water',
      },
      {
        label: 'WaterHardness.org — Hard water and hair',
        url: 'https://www.waterhardness.org/learn/hard-water-hair',
      },
    ],
  },
  {
    slug: 'wash-day',
    title: 'Wash Day, Start to Finish',
    icon: 'waves',
    summary:
      'The whole sequence in order, with the reasoning for each step. Most wash-day misery comes from doing the right things in the wrong order — detangling too late, conditioning too early, styling on hair that has already dried.',
    minutes: 90,
    theme: 'bg-secondary-fixed text-on-secondary-fixed',
    hairTypes: ['Loose Natural'],
    toolsAndProducts: [
      'Pre-poo oil or conditioner',
      'Sulphate-free shampoo',
      'Slippery rinse-out conditioner',
      'Deep conditioner',
      'Wide-tooth comb or a detangling brush',
      'Leave-in, oil and cream',
      'Four to eight sectioning clips',
      'Microfibre towel or an old T-shirt',
    ],
    steps: [
      {
        title: 'Section before anything gets wet',
        body: 'Four sections minimum, more if your hair is dense or long. Everything from here happens section by section. Washing loose, unsectioned coily hair is how you arrive at the tangle that eats your afternoon.',
      },
      {
        title: 'Pre-poo the ends',
        body: 'Oil or conditioner on dry hair, twenty minutes before you wash, concentrated on the ends. It slows how much water the shaft takes on during the wash, which limits the swell-and-shrink cycle that roughens the cuticle. Skip the scalp — you are about to clean it.',
      },
      {
        title: 'Shampoo the scalp only',
        body: 'Dilute the shampoo, apply it in rows to the scalp, and work with the pads of your fingers. The lengths get cleaned by the suds running down them on the rinse; scrubbing them directly is where you undo the last week of moisture.',
      },
      {
        title: 'Detangle with conditioner in, under running water',
        body: 'This is the step people move and it is the one that costs them. Slip is what makes detangling safe, and you have the most of it right now. Fingers first to find the knots, then a wide-tooth comb from the ends upward — never from the root down, which just gathers every tangle into one mass at the bottom.',
      },
      {
        title: 'Deep condition on clean, damp hair',
        body: 'Twenty to thirty minutes. Gentle heat — a cap, a warm towel — helps on low-porosity hair, where the cuticle needs persuading to open. Longer is not better: past about half an hour you are into the swelling that fatigues the cuticle rather than conditioning it.',
      },
      {
        title: 'Rinse cool, then squeeze — do not rub',
        body: 'A cool final rinse encourages the cuticle to lie flat. Squeeze water out with your hands, then blot with a microfibre towel or a cotton T-shirt. A terry towel roughs up every cuticle it touches, which is most of what "frizz" is.',
      },
      {
        title: 'Layer product on soaking wet hair',
        body: 'Leave-in, then oil, then cream, section by section, while the hair is genuinely wet rather than damp. You are sealing water in — if the hair has already dried there is nothing left to seal, which is why the same products work some weeks and not others.',
      },
      {
        title: 'Style once, then leave it alone',
        body: 'Twist, braid or coil into whatever you are wearing, and stop touching it. Every pass of your hands through drying hair costs you definition and adds frizz. Air dry if you have the time; if you diffuse, low heat and low speed.',
      },
    ],
    cautions: [
      'If you find yourself detangling dry hair mid-week, the problem is wash day, not that day. Move the detangling here where the slip is.',
      'Going more than two weeks without washing coily hair is not protecting it — buildup and a neglected scalp cause their own breakage.',
      'Never sleep on wet hair without covering it. Damp hair and cotton is the worst friction combination there is.',
    ],
    sources: [
      {
        label: 'Davines — What is hygral fatigue (on limiting soak time)',
        url: 'https://us.davines.com/blogs/news/what-is-hygral-fatigue',
      },
    ],
  },
  {
    slug: 'night-routine',
    title: 'The Night Routine',
    icon: 'spa',
    summary:
      'You spend a third of your life asleep, moving against your pillow. For coily hair that is the single largest source of friction in the week, and the cheapest one to remove.',
    minutes: 5,
    theme: 'bg-tertiary-fixed text-on-tertiary-fixed',
    toolsAndProducts: [
      'Satin or silk bonnet, scarf, or pillowcase',
      'A little leave-in or oil, for re-moisturising',
      'Large hair tie or scrunchie, satin if you can',
    ],
    steps: [
      {
        title: 'Get off cotton',
        body: 'Cotton does two things at once: it grips the hair and drags on the cuticle as you move, and it absorbs moisture straight out of the strand. Lab testing on fibre friction consistently puts silk and satin well below cotton — the figures quoted run from about a third to about half less friction. Treat the exact number with caution, since most of that testing is published by people selling silk, but the direction is not in dispute and the physics is straightforward.',
      },
      {
        title: 'Bonnet or pillowcase, whichever you will actually use',
        body: 'A bonnet protects only your hair; a pillowcase also covers the case where the bonnet comes off at 3am, which it will. Satin polyester is much cheaper than mulberry silk and still far better than cotton. The best one is the one you use every night — consistency beats material here by a wide margin.',
      },
      {
        title: 'Put it away in a low-tension style',
        body: 'Two to four large twists, a loose pineapple on top of the head, or a loose braid. Big sections, no tight elastics, nothing that pulls at the hairline. You are keeping it from tangling, not setting it.',
      },
      {
        title: 'Re-moisturise if the ends feel dry',
        body: 'A little leave-in or oil on the ends before you cover up, not a full re-application. Nightly heavy product is how buildup starts.',
      },
      {
        title: 'Refresh in the morning, do not restyle',
        body: 'A light mist of water, smooth the twists out with oiled fingers, and go. Full restyling every morning is manipulation your hair pays for at the ends.',
      },
    ],
    cautions: [
      'A bonnet with a tight elastic band creates its own traction, right along the hairline. If it leaves a mark, it is too tight.',
      'The clinical evidence for satin specifically is thin — the good data is laboratory friction testing, not trials measuring hair outcomes. It is cheap, harmless and mechanically sensible, which is why it is here, but do not expect it to fix breakage on its own.',
    ],
    sources: [
      {
        label: 'Mulberry Park Silks — Lab-tested silk vs cotton friction (vendor-published)',
        url: 'https://mulberryparksilks.com/blogs/mulberry/silk-pillowcases-lab-tested',
      },
      {
        label: 'Bolt Pharmacy — Do bonnets help with hair loss (evidence review)',
        url: 'https://www.boltpharmacy.co.uk/guide/do-bonnets-help-with-hair-loss',
      },
    ],
  },
  {
    slug: 'flat-twisting',
    title: 'How to Flat Twist',
    icon: 'waves',
    summary:
      'Half the style library says "flat twist the section" and then moves on. This is the motion itself: two strands, an under-cross, and picking up hair as you travel.',
    minutes: 5,
    theme: 'bg-secondary-fixed text-on-secondary-fixed',
    /*
     * A technique primer rather than a routine, and short on purpose.
     *
     * It is here because the packed-and-parted styles in
     * content/styles.ts lean on flat twisting in almost every entry and
     * none of them can afford to teach it inline. Two strands rather
     * than three is the whole difference from a cornrow, and it is the
     * detail people get wrong.
     */
    toolsAndProducts: [
      'Damp hair — a spray bottle of water',
      'Rat-tail comb for parting',
      'Optional: a little gel or edge control for grip',
    ],
    steps: [
      {
        title: 'Split a piece of hair in two',
        body: 'Take a small section at the start of the line you want to twist and divide it into two smaller pieces. Two, not three — that is the whole difference between this and a cornrow.',
      },
      {
        title: 'Cross them under',
        body: 'Slide one piece under the other, the way you would start a twist with your fingers. Keep the crossing close to the scalp so the twist lies flat rather than lifting off the head.',
      },
      {
        title: 'Add hair as you go',
        body: 'Each time you cross the pieces, pick up a little more hair from the head and feed it into the piece nearest it, so the twist grows along the line as you travel.',
      },
      {
        title: 'Repeat all the way down',
        body: 'Keep doing the same under-cross motion, working in a straight path across the head, until you reach the end of the section. Then carry on twisting the loose length, or band it.',
      },
    ],
    cautions: [
      'Flat twisting is tension applied in a line along the scalp. If it stings, or you can see the skin tenting up around the roots, it is too tight — take it out. Traction damage at the hairline is the one kind that does not reliably grow back.',
      'Work on damp hair, never soaking. Hair twisted wet takes a long time to dry inside the twist, and hair twisted bone dry snaps at the crossings.',
    ],
    // Loose hair only. A loc cannot be split into two pieces and fed with
    // more hair as you travel, which is the entire motion described above.
    hairTypes: ['Loose Natural'],
  },
]

export function getGuide(slug: string | undefined): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug)
}

/* ------------------------------------------------------------------ *
 * Search
 *
 * People arrive at this screen with a symptom, not a title. The first
 * version of this matched the query as a literal substring of the title
 * and summary, which meant the search box could not find the guide its
 * own placeholder told you to look for: type "itchy scalp" and you got
 * nothing, because Scalp Relief opens "Itch is a signal, not a
 * personality trait" and the word "itchy" appears nowhere in the app.
 *
 * So: match against the whole guide, and match words rather than
 * characters. The stemming is deliberately crude — it exists to close
 * the gap between what a person types and how the guide is written
 * ("itchy"/"itch", "flakes"/"flake", "breaking"/"break"), not to be a
 * linguistics exercise. A false positive costs one extra row in a list
 * of fourteen; a false negative is a user concluding the app has
 * nothing to say about their scalp.
 * ------------------------------------------------------------------ */

/** Everything in a guide a reader might reasonably be searching for. */
function haystack(guide: Guide): string {
  return [
    guide.title,
    guide.badge ?? '',
    guide.summary,
    ...guide.toolsAndProducts,
    ...guide.steps.flatMap((step) => [step.title, step.body]),
    ...guide.cautions,
  ]
    .join(' ')
    .toLowerCase()
}

/** Built once. The library is static, and this runs on every keystroke. */
const HAYSTACKS = new Map<string, string>(GUIDES.map((g) => [g.slug, haystack(g)]))

/** Drop a plural or an adjectival ending, leaving something comparable. */
function stem(word: string): string {
  for (const suffix of ['ing', 'es', 'ed', 's', 'y']) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length)
    }
  }
  return word
}

/**
 * Guides matching a free-text query, in library order.
 *
 * Every word has to hit something, so "itchy scalp" is narrower than
 * "itchy" rather than wider — which is what a person typing a second
 * word means by it.
 */
export function searchGuides(guides: Guide[], query: string): Guide[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)
  if (words.length === 0) return guides

  return guides.filter((guide) => {
    const text = HAYSTACKS.get(guide.slug) ?? haystack(guide)
    return words.every((word) => text.includes(word) || text.includes(stem(word)))
  })
}
