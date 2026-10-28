/**
 * Locs World — the loc reference, at `/locs`.
 *
 * Its own section deliberately, not a chapter of Hair Care. Locs are not
 * a style worn on loose hair, they are a different thing to own, and
 * filing them under general care is how a loc wearer ends up reading
 * loose-hair technique that would damage their hair.
 *
 * **Two states, and the difference is visible on purpose.** A section is
 * either written (`blocks` carrying real signs, solutions and
 * ingredients — chapter 11's problems, chapter 12's labels, chapter 13's
 * routines) or an `outline: true` list of the topics a written guide
 * will cover. Outline sections render as topic chips rather than as
 * advice, because a bullet reading "How locs form" is a heading somebody
 * still has to write, not an answer, and dressing it up as one would
 * make the app claim it knows something it does not.
 *
 * That is the same bargain the image slots take: a placeholder renders so
 * the layout is final before the photography is. Fill a section in by
 * dropping the prose into `blocks` and deleting its `outline` flag —
 * nothing else has to change.
 *
 * Every section is now written. The figures in them are the app's own,
 * so they cannot drift: wash cadence and retwist spacing agree with
 * `answers.ts`, stage months with `STAGE_ONSET_MONTHS` in `lib/locs.ts`,
 * and the growth rate with `AVG_GROWTH_IN_PER_MONTH` in `lib/growth.ts`.
 * Change one and change the other in the same commit.
 *
 * Nothing here is generated, and nothing here diagnoses. Chapter 16 is
 * the escalation path, and it is content rather than a footnote: locs
 * fail at the root and the scalp, and both of those are a professional's
 * job long before they are a product's.
 */

export type LocBlock = {
  /** 'Signs', 'Solutions', 'Look for'. Absent where the list needs no label. */
  label?: string
  items: string[]
  /** A sequence rather than a set — Wash, then Moisturise, then Dry. */
  ordered?: boolean
  /**
   * Things to avoid rather than things to do. Drawn with a struck-through
   * marker: a tick beside "petroleum-heavy products" reads as an
   * instruction to use them, which is the opposite of the advice.
   */
  tone?: 'avoid'
}

export type LocSection = {
  heading: string
  note?: string
  /** True while `items` are the topics a guide will cover, not the guide. */
  outline?: boolean
  blocks: LocBlock[]
}

export type LocChapter = {
  id: string
  title: string
  sections: LocSection[]
}

export const LOC_CARE: LocChapter[] = [
  {
    id: 'basics',
    title: 'Loc basics',
    sections: [
      {
        heading: 'What are locs?',
        blocks: [
          {
            label: 'What locs are',
            items: [
              'Locs are sections of hair left to matt together into ropes that hold their own shape.',
              'Once a loc has formed it cannot be combed back out. It is cut, or picked apart over many hours.',
            ],
          },
          {
            label: 'How locs form',
            items: [
              'Everyone sheds hair every day. On loose hair those strands are combed away; in a loc they stay inside and tangle with the hair around them.',
              'Over months the knotting tightens from the inside out until the section holds together on its own.',
            ],
          },
          {
            label: 'How locs grow',
            items: [
              'Hair grows from the scalp at the same rate it always did. Locs do not change that.',
              'New growth comes in loose at the root and joins the loc through retwisting or interlocking, or on its own if the locs are freeform.',
            ],
          },
          {
            label: 'Locs vs loose natural hair',
            items: [
              'Loose hair is detangled, combed and styled. Locs are never detangled.',
              'Locs hold water and product inside the loc, so rinsing and drying matter far more than they do on loose hair.',
              'That is why loose-hair technique does not transfer: combing through conditioner, heavy butters and finger detangling all work against a loc.',
            ],
          },
          {
            label: 'Common misconceptions',
            tone: 'avoid',
            items: [
              'That locs are unwashed hair. They need washing like any other hair.',
              'That locs need wax or beeswax to form. Wax only gets trapped inside.',
              'That locs mean no maintenance. They mean different maintenance.',
            ],
          },
        ],
      },
      {
        heading: 'Are locs right for you?',
        blocks: [
          {
            label: 'Lifestyle',
            items: [
              'Locs are little work day to day: wash every one to two weeks, dry completely, and cover them at night.',
              'Wash day takes longer than on loose hair, because drying does.',
            ],
          },
          {
            label: 'Hair type and texture',
            items: [
              'Tightly coiled hair locks fastest.',
              'Looser curl patterns can loc, but take longer and may need interlocking to hold at the root.',
            ],
          },
          {
            label: 'Maintenance commitment',
            items: [
              'Retwisted or interlocked locs need their roots done every six to eight weeks or so, by you or a loctician.',
              'Freeform locs skip that, but still need washing, drying and separating.',
            ],
          },
          {
            label: 'Time and patience',
            items: [
              'The first year is the hard part. Frizz, unravelling and uneven locs in the early months are normal, not a sign it is not working.',
              'Length often seems to go backwards in the first year, because locs shrink as they tighten.',
            ],
          },
          {
            label: 'Professional and personal considerations',
            items: [
              'Locs are close to permanent. Taking them out usually means cutting them, so decide with that in mind.',
              'If your school or workplace has rules about hair, know where you stand before you start.',
            ],
          },
        ],
      },
      {
        heading: 'Types of locs',
        blocks: [
          {
            items: [
              'Traditional locs',
              'Sisterlocks',
              'Microlocs',
              'Freeform locs',
              'Semi-freeform locs',
              'Interlocked locs',
              'Palm-rolled locs',
            ],
          },
        ],
      },
      {
        heading: 'Loc terminology',
        blocks: [
          {
            items: [
              'Starter locs: newly started locs, roughly the first three months. Still soft, and still looking like the coils, twists or braids they began as.',
              'Roots: the part of the loc nearest the scalp, where new growth joins it.',
              'New growth: loose hair at the root that has not joined the loc yet.',
              'Budding: the stage, from around month three, when small knots form inside each loc and it starts to swell and frizz.',
              'Maturation: the months-long process of a loc tightening from the inside out until it holds its own shape.',
              'Retwist: root maintenance that rolls or twists new growth into the loc, usually with a little gel.',
              'Interlocking: root maintenance that pulls the end of the loc through its own root, like a stitch. It holds longer than a retwist.',
              'Loc repair: reinforcing a weak, thinning or broken loc. Usually a loctician’s job.',
              'Loc extensions: ready-made locs attached to your own for length.',
              'Combining locs: joining two locs into one, to save a weak loc or to change size.',
              'Locs thinning: a loc losing thickness, most often at the root, from tension, too much maintenance or weight.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'starting',
    title: 'Starting your locs',
    sections: [
      {
        heading: 'Before you start',
        blocks: [
          {
            label: 'Choosing a loc method',
            items: [
              'Decide on size first. It fixes how many locs you will have for life and how long maintenance takes.',
              'Then choose a method: comb coils, two-strand twists, braids, interlocking or freeform. Shorter hair suits comb coils; longer hair suits twists or braids.',
            ],
          },
          {
            label: 'Preparing your hair',
            items: [
              'Trim off relaxed or heat-straightened ends. They will not lock and will hang loose at the tip.',
              'Stop using heavy butters, waxes and silicone products for a couple of weeks beforehand.',
            ],
          },
          {
            label: 'Starting with clean hair',
            items: [
              'Clarify just before your install and make sure the hair is completely dry before it is sectioned.',
              'Whatever is on your hair on install day goes inside the loc for good.',
            ],
          },
          {
            label: 'Choosing a professional loctician',
            items: [
              'Look at their work on hair like yours, including photos of the same clients months later.',
              'Ask how they part, how tightly they twist and what they put on the hair. A good loctician does not promise fast locking.',
              'An install that hurts, or bumps on the scalp afterwards, means too much tension. Say so.',
            ],
          },
          {
            label: 'What to expect during the first few months',
            items: [
              'Unravelling, frizz and locs that look uneven. This is what starter locs do.',
              'Wash every seven to ten days, through a stocking cap, from the start.',
              'Photograph your locs monthly. It is the only way to see progress you cannot see day to day.',
            ],
          },
        ],
      },
      {
        heading: 'Starter locs',
        blocks: [
          {
            label: 'Washing starter locs',
            items: [
              'Wash every seven to ten days, through a stocking cap or mesh so the sections cannot slip.',
              'Press the shampoo into the scalp and squeeze it down the locs. Do not scrub.',
            ],
          },
          {
            label: 'Keeping starter locs clean',
            items: [
              'Between washes, wipe along the parts with a cotton pad and a little diluted shampoo to lift sweat and oil.',
            ],
          },
          {
            label: 'Moisturising starter locs',
            items: [
              'A light water-based spray every few days is enough.',
              'No heavy butters or waxes. Anything heavy now gets locked inside.',
            ],
          },
          {
            label: 'Sleeping with starter locs',
            items: [
              'A satin bonnet, scarf or pillowcase every night. Cotton pulls at new locs and leaves lint in them.',
            ],
          },
          {
            label: 'Preventing unravelling',
            items: [
              'Keep your hands out of them. Every touch loosens a loc that has not locked yet.',
              'Palm roll any that slip, once they are dry after washing.',
            ],
          },
          {
            label: 'When to retwist',
            items: [
              'Hold out for six to eight weeks. The starter stage is when retwisting too often does the most harm.',
            ],
          },
          {
            label: 'What not to do',
            tone: 'avoid',
            items: [
              'Skipping washes to help them lock',
              'Retwisting every couple of weeks',
              'Wax, beeswax or heavy butter',
              'Re-parting to neaten the grid',
              'Sleeping on them damp',
            ],
          },
        ],
      },
      {
        heading: 'The loc journey',
        note: 'Four stages, and what changes at each one. The months are a rough guide: texture, method and how much you handle your locs all move them.',
        blocks: [
          {
            label: 'Stage 1 — Starter locs',
            items: [
              'Roughly the first three months. Your locs still look like the coils, twists or braids they started as.',
              'Wash every seven to ten days through a stocking cap. Washing does not stop them locking.',
              'Some unravelling is normal. Palm roll the locs that slip.',
              'Frizz at this stage is the hair beginning to knot, not a mistake.',
            ],
          },
          {
            label: 'Stage 2 — Budding',
            items: [
              'From around month three, small knots form inside each loc. You can feel them as lumps when you squeeze.',
              'The texture changes from smooth coils to fuzzy and puffy.',
              'Locs swell and look thicker as they matt from the inside. Retwisting the frizz away only slows this down.',
            ],
          },
          {
            label: 'Stage 3 — Teenage locs',
            items: [
              'From around month six. Frizz carries on, and locs stick up or out in different directions.',
              'Locs shrink as they tighten, so length can seem to go backwards.',
              'Some locs mature faster than others. The unevenness settles with time.',
              'The texture keeps changing, from soft to firmer.',
            ],
          },
          {
            label: 'Stage 4 — Mature locs',
            items: [
              'From around fifteen months, locs are dense, hold their shape and hang with their own weight.',
              'Maintenance can stretch to eight weeks or more between retwists. Some people stop altogether.',
              'Mature locs hold more water, so give them longer to dry and keep moisture light.',
              'They are strong enough for most styles, but tension on the roots still adds up.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'washing',
    title: 'Washing and cleansing',
    sections: [
      {
        heading: 'How to wash locs',
        blocks: [
          {
            label: 'How often to wash',
            items: ['Every one to two weeks. Starter locs every seven to ten days.'],
          },
          {
            label: 'Wash day',
            ordered: true,
            items: [
              'Wet your locs properly: several minutes under the water, squeezing them so it reaches the core. A loc sheds water at first.',
              'Shampoo the scalp. Put diluted shampoo in an applicator bottle, run it along the parts and massage with your fingertips, not your nails.',
              'Clean the length by squeezing the lather down each loc. Rubbing causes frizz and lint.',
              'Rinse for twice as long as you think, squeezing each loc until the water runs clear. Shampoo left inside is buildup.',
              'Squeeze out the water, then dry your locs completely, roots and centre included.',
            ],
          },
        ],
      },
      {
        heading: 'Washing different types of locs',
        blocks: [
          {
            label: 'Starter locs',
            items: [
              'Every seven to ten days, through a stocking cap. Squeeze, do not scrub, and palm roll any that slip once dry.',
            ],
          },
          {
            label: 'Microlocs',
            items: [
              'There are a lot of them and they are fine, so dilute your shampoo well; it works through them more easily and rinses out faster.',
              'Wear a stocking cap for the first few washes after an install or a maintenance session.',
            ],
          },
          {
            label: 'Mature locs',
            items: [
              'Mature locs can go a little longer between washes, but they hold more water. Give them longer to dry, and clarify monthly.',
            ],
          },
          {
            label: 'Freeform locs',
            items: [
              'Wash as often as any other locs.',
              'Once dry, gently pull apart locs that are starting to join at the root, unless you want them to combine.',
            ],
          },
        ],
      },
      {
        heading: 'Product buildup',
        blocks: [
          {
            label: 'What causes buildup',
            items: [
              'Heavy butters, waxes and creams',
              'Shampoo and conditioner that was not rinsed out',
              'Minerals from hard water',
              'Lint from towels, clothes and bedding',
            ],
          },
          {
            label: 'How to recognise buildup',
            items: [
              'White or grey specks, or a coating, inside the loc',
              'Locs that feel heavy, stiff or sticky',
              'Water that beads on the loc instead of soaking in',
              'A smell that comes back soon after washing',
            ],
          },
          {
            label: 'How to prevent buildup',
            items: [
              'Use less product, and keep to light, water-based ones',
              'Rinse for twice as long as you think',
              'Cover your locs at night',
            ],
          },
          {
            label: 'Clarifying locs',
            items: [
              'A clarifying shampoo once a month, rinsed for twice as long and dried all the way through, is what keeps locs light.',
              'Buildup that a clarify does not shift, or that you can see deep in the loc, is a loctician’s job.',
            ],
          },
        ],
      },
      {
        heading: 'Drying locs',
        blocks: [
          {
            label: 'Why locs must dry properly',
            items: [
              'A loc that stays damp in the middle grows mildew, and that smell does not wash out.',
            ],
          },
          {
            label: 'Air drying',
            items: [
              'Fine in a warm, dry room, but give it hours.',
              'Squeeze a thick loc at the root. If it feels cool and damp inside, it is not dry.',
            ],
          },
          {
            label: 'Towel drying',
            items: [
              'Squeeze, do not rub. A microfibre towel or a cotton T-shirt leaves less lint than a terry towel.',
            ],
          },
          {
            label: 'Blow-drying',
            items: [
              'Low or medium heat with a diffuser, kept moving, aimed at the roots and the thickest locs.',
              'For long or thick locs, a hooded dryer is the easiest way to dry them through.',
            ],
          },
          {
            label: 'Preventing mildew and unpleasant odour',
            tone: 'avoid',
            items: [
              'Sleeping on damp locs',
              'Tying locs up or covering them while wet',
              'Washing late at night with no time left to dry',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'scalp',
    title: 'Scalp care',
    sections: [
      {
        heading: 'A healthy loc scalp',
        blocks: [
          {
            label: 'Keeping the scalp clean',
            items: [
              'Wash every one to two weeks. Between washes, wipe along the parts with a cotton pad and diluted shampoo.',
            ],
          },
          {
            label: 'Scalp moisturising',
            items: [
              'If your scalp feels tight, a few drops of light oil along the parts, or a water-based scalp spray. A scalp does not need oiling every day.',
            ],
          },
          {
            label: 'Scalp massage',
            items: [
              'A minute or two with your fingertips on wash day loosens flakes and buildup. Keep it gentle around the roots.',
            ],
          },
          {
            label: 'Managing oil production',
            items: ['An oily scalp needs washing more often, not more product on top.'],
          },
          {
            label: 'Avoiding excessive product',
            items: [
              'Whatever goes on the scalp drains into the base of the loc. Use less than you think, through an applicator nozzle.',
            ],
          },
        ],
      },
      {
        heading: 'Common scalp problems',
        note: 'Each one: the signs, the likely causes, what to do, what to look for on a label, and when to see someone.',
        blocks: [
          {
            label: 'Itchy scalp',
            items: [
              'Signs: itching between washes, often worse after a new product.',
              'Possible causes: too long between washes, buildup or sweat at the roots, a reaction to a product, a dry scalp, or dandruff.',
              'What to do: wash and rinse well, and stop anything you started using recently.',
              'Look for: gentle cleansers, and anti-dandruff ingredients if there is flaking too.',
              'See a professional if: it lasts more than a few weeks, or comes with sores, bleeding or hair loss.',
            ],
          },
          {
            label: 'Dandruff',
            items: [
              'Signs: oily, yellowish or white flakes that come back between washes, often with itching.',
              'Possible causes: usually a flare of seborrhoeic dermatitis, linked to a yeast that lives on everyone’s scalp.',
              'What to do: an anti-dandruff shampoo on the scalp, left on for the time the label says, then rinsed long and dried fully.',
              'Look for: zinc pyrithione, ketoconazole or salicylic acid.',
              'See a professional if: a month of medicated shampoo has not helped, or patches are red, raised or spreading.',
            ],
          },
          {
            label: 'Dry scalp',
            items: [
              'Signs: fine, small white flakes and a tight feeling. Drier and smaller than dandruff, and slower to come back.',
              'Possible causes: harsh cleansers, very hot water, a dry climate, or clarifying too often.',
              'What to do: a gentler cleanser, lukewarm water, and a few drops of light oil along the parts.',
              'Look for: aloe vera, glycerin, panthenol.',
              'See a professional if: it cracks, bleeds or will not settle.',
            ],
          },
          {
            label: 'Oily scalp',
            items: [
              'Signs: a shiny scalp, and roots that feel greasy within a few days of washing.',
              'Possible causes: your own oil, sweat, and heavy products on the scalp.',
              'What to do: wash more often, wipe along the parts between washes, and keep oils off the scalp.',
              'Look for: gentle clarifying cleansers and light, oil-free scalp products.',
              'See a professional if: it comes with flaking, redness or itching that does not ease.',
            ],
          },
          {
            label: 'Scalp buildup',
            items: [
              'Signs: grey or white paste at the roots, flakes that smear rather than fall, itching.',
              'Possible causes: product, oil and sweat that were not rinsed out.',
              'What to do: clarify, apply shampoo along the parts with a nozzle, and rinse for twice as long.',
              'Look for: clarifying shampoos and salicylic acid.',
              'See a professional if: it is thick, crusted or bleeding. That may be a scalp condition, not buildup.',
            ],
          },
          {
            label: 'Irritation',
            items: [
              'Signs: burning, stinging, redness or tenderness at the roots.',
              'Possible causes: a reaction to a product or its fragrance, or tension from a tight retwist, style or new install.',
              'What to do: rinse the product out and stop using it, and loosen anything pulling on the roots.',
              'Look for: fragrance-free products with short ingredient lists, and patch-test anything new.',
              'See a professional if: there is swelling or blistering, or it has not settled a few days after you stopped the product.',
            ],
          },
          {
            label: 'Folliculitis',
            items: [
              'Signs: small red or pus-filled bumps around the hair follicles, tender or itchy.',
              'Possible causes: inflamed or infected follicles, often from tension, sweat, or heavy products sitting on the scalp.',
              'What to do: loosen any tension, keep the scalp clean and dry, and do not pick or squeeze the bumps.',
              'Look for: nothing. No hair product treats an infection.',
              'See a professional: a doctor or dermatologist, soon if the bumps spread, hurt, or come with a fever.',
            ],
          },
          {
            label: 'Scalp odour',
            items: [
              'Signs: a smell from the scalp or roots that comes back soon after washing.',
              'Possible causes: locs that are not drying through, sweat, buildup, or sometimes a scalp infection.',
              'What to do: wash, rinse long, dry completely, and clarify monthly.',
              'Look for: a clarifying shampoo.',
              'See a professional if: the smell stays even though your locs dry fully, or comes with pain, discharge or sores.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'moisture',
    title: 'Moisture and hydration',
    sections: [
      {
        heading: 'Understanding moisture',
        blocks: [
          {
            label: 'Why locs need moisture',
            items: [
              'Locs are hair, and hair needs water to stay flexible. Dry locs go brittle and snap, the ends first.',
              'Water is what moisturises. Oil only slows it leaving.',
            ],
          },
          {
            label: 'How often to moisturise',
            items: [
              'A light water-based spray and a few drops of oil every few days. More often in dry weather, less in humid.',
            ],
          },
          {
            label: 'Signs of dry locs',
            items: ['Rough, hard or brittle to the touch', 'Ends that break off', 'Frizz that will not settle'],
          },
          {
            label: 'Signs of over-moisturising',
            items: [
              'Locs that feel limp or mushy',
              'Locs that never quite dry',
              'A musty smell',
              'Product residue',
            ],
          },
        ],
      },
      {
        heading: 'Moisturising locs',
        blocks: [
          {
            items: [
              'Water-based moisturisers',
              'Loc sprays',
              'Lightweight oils',
              'Scalp moisturising',
              'Avoiding heavy products',
            ],
          },
        ],
      },
      {
        heading: 'What to look for',
        blocks: [
          {
            label: 'Look for',
            items: [
              'Aloe vera',
              'Glycerin',
              'Panthenol',
              'Rose water',
              'Jojoba oil',
              'Argan oil',
              'Grapeseed oil',
            ],
          },
          {
            label: 'Be careful with',
            tone: 'avoid',
            items: [
              'Heavy waxes',
              'Petroleum-heavy products',
              'Excessive butter',
              'Heavy oils',
              'Products that leave visible residue',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'retwisting',
    title: 'Retwisting and maintenance',
    sections: [
      {
        heading: 'Retwisting',
        blocks: [
          {
            label: 'What a retwist is',
            items: [
              'Rolling or twisting the new growth at the root into the loc, usually with a pea of residue-free gel, so the loc stays neat at its base.',
            ],
          },
          {
            label: 'When to retwist',
            items: [
              'After a wash, on barely damp hair, once there is enough new growth to hold a twist.',
            ],
          },
          {
            label: 'How often to retwist',
            items: [
              'Every four to six weeks at the most, and eight is better. Mature locs can go longer, and freeform locs are never retwisted.',
            ],
          },
          {
            label: 'Retwisting too frequently',
            items: [
              'Every retwist puts tension on the same follicle in the same direction. Too many thin the roots and pull at the hairline.',
            ],
          },
          {
            label: 'Retwisting too tightly',
            items: [
              'Pain, small bumps at the root, or the scalp pulled up in a point around a loc all mean it is too tight. Ask for it looser, or redo it yourself.',
            ],
          },
          {
            label: 'Retwist vs interlocking',
            items: [
              'A retwist is gentler, but loosens with washing and sweat.',
              'Interlocking lasts longer and holds better on looser textures and microlocs, but done too often it thins the roots.',
            ],
          },
        ],
      },
      {
        heading: 'Healthy retwisting',
        blocks: [
          {
            items: [
              'Protect the roots',
              'Avoid excessive tension',
              'Maintain healthy edges',
              'Choose your loctician carefully',
            ],
          },
        ],
      },
      {
        heading: 'Interlocking',
        blocks: [
          {
            label: 'What interlocking is',
            items: [
              'The end of the loc is pulled through its own root, with a tool or fingers, one stitch at a time, taking the new growth into the loc.',
            ],
          },
          {
            label: 'Who may benefit from it',
            items: [
              'Microlocs and Sisterlocks, looser curl patterns a retwist will not hold, and people who swim or sweat a lot.',
            ],
          },
          {
            label: 'Advantages',
            items: [
              'It holds through washing and sweat, keeps the root neat, and leaves longer gaps between sessions.',
            ],
          },
          {
            label: 'Potential risks',
            tone: 'avoid',
            items: [
              'Interlocking too often, which thins and weakens the roots',
              'Interlocking too close to the scalp',
              'Changing the direction of the stitch each time, which leaves holes and weak points in the loc',
            ],
          },
          {
            label: 'Proper maintenance',
            items: [
              'No more often than every eight weeks, following the same pattern every time, by someone who knows your locs.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'roots',
    title: 'Loc and root health',
    sections: [
      {
        heading: 'Healthy roots',
        blocks: [
          {
            label: 'Strong roots',
            items: [
              'A healthy root is about as thick as the loc above it and holds firm when the loc is lifted.',
            ],
          },
          {
            label: 'New growth',
            items: [
              'Fuzzy new growth at the root is normal and healthy. It does not need retwisting the moment it shows.',
            ],
          },
          {
            label: 'Normal shedding',
            items: [
              'Shed hair stays inside the loc rather than falling out, so you will see less of it than you did with loose hair. A little loose hair at the root after washing is normal.',
            ],
          },
          {
            label: 'Root maintenance',
            items: [
              'Dry the roots completely, keep tension low, follow the parts you already have, and leave enough time between retwists.',
            ],
          },
        ],
      },
      {
        heading: 'Weak roots',
        blocks: [
          {
            label: 'Signs',
            items: [
              'Loc becoming thinner at the root',
              'Excessive movement',
              'Hair breaking around the root',
            ],
          },
          {
            label: 'Solutions',
            items: [
              'Reduce tension',
              'Avoid heavy styling',
              'Give the roots a break',
              'Seek professional loc repair when necessary',
            ],
          },
        ],
      },
      {
        heading: 'Thinning locs',
        blocks: [
          {
            label: 'Causes',
            items: [
              'Tension at the root: tight retwists, tight styles, heavy locs',
              'Retwisting or interlocking too often',
              'The weight of very long locs',
              'If many locs thin at once, the cause may be your health rather than your locs. See a dermatologist.',
            ],
          },
          {
            label: 'Signs',
            items: [
              'A loc narrower at the root than further down',
              'A loc that wobbles or hangs by a few strands',
              'More scalp showing around its base',
            ],
          },
          {
            label: 'Prevention',
            items: [
              'Leave more time between maintenance sessions',
              'Choose loose, low styles',
              'Trim very long, heavy locs',
              'Stop retwisting the thin ones',
            ],
          },
          {
            label: 'Repair options',
            items: [
              'A loctician can reinforce a thin root or combine the loc with its neighbour. Catch it early: a loc that has snapped off is much harder to save.',
            ],
          },
        ],
      },
      {
        heading: 'Thinning edges',
        blocks: [
          {
            label: 'Causes',
            items: [
              'Repeated pulling on the hairline. Kept up for long enough, the hair stops growing back.',
            ],
          },
          {
            label: 'Tight styling',
            items: [
              'High buns, tight updos, and styles that pull the front locs back.',
            ],
          },
          {
            label: 'Frequent retwisting',
            items: [
              'The locs at the edges are usually retwisted most often and most tightly, because they show the most.',
            ],
          },
          {
            label: 'Traction',
            items: [
              'Watch for small bumps along the hairline, soreness after styling, and the hairline moving back.',
              'Ease off at the first sign. If your edges keep receding once the tension has stopped, see a dermatologist.',
            ],
          },
        ],
      },
      {
        heading: 'Loc repair',
        blocks: [
          {
            label: 'Combining locs',
            items: ['Two thin or weak locs joined into one, best done by a loctician so the parts stay neat.'],
          },
          {
            label: 'Root repair',
            items: ['Loose hair is worked into a thin root with a fine tool to rebuild it.'],
          },
          {
            label: 'Weak loc reinforcement',
            items: [
              'A weak spot further down the loc can be reinforced the same way, or the loc combined with its neighbour.',
            ],
          },
          {
            label: 'When professional repair is necessary',
            items: [
              'A loc hanging by a few strands, a loc that has broken off, or several thinning at once.',
              'Working a crochet hook into a weak root yourself can make it worse.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'length',
    title: 'Length and growth',
    sections: [
      {
        heading: 'Understanding loc growth',
        blocks: [
          {
            label: 'How locs grow',
            items: [
              'Afro-textured hair grows about a third of an inch a month on average, loc’d or loose. Locs do not change the rate.',
            ],
          },
          {
            label: 'Hair growth vs length retention',
            items: [
              'Growth is what comes out of the scalp. Retention is what you keep.',
              'Locs keep their shed hair, so they retain well, but ends can still dry out and break.',
            ],
          },
          {
            label: 'Shrinkage',
            items: ['A loc shortens as it tightens. In the first year, locs can lose length even while the hair grows.'],
          },
          {
            label: 'Why locs may appear to grow slowly',
            items: [
              'Most of the first year’s growth goes into tightening the loc, not into length. Length shows from the second year.',
            ],
          },
        ],
      },
      {
        heading: 'Length retention',
        blocks: [
          {
            items: [
              'Protect the ends',
              'Prevent breakage',
              'Reduce manipulation',
              'Keep maintenance healthy',
            ],
          },
        ],
      },
      {
        heading: 'Loc ends',
        blocks: [
          {
            label: 'Dry ends',
            items: ['The ends are the oldest hair. Finish moisturising with a drop of light oil on them.'],
          },
          {
            label: 'Thin ends',
            items: ['A loc that tapers at the tip is normal, unless the tip is snapping off.'],
          },
          {
            label: 'Weak ends',
            items: ['Soft or unravelling ends. Palm roll them and cover them at night.'],
          },
          {
            label: 'Split ends',
            items: ['A loc end that frays or splits into several pieces.'],
          },
          {
            label: 'Repairing or trimming damaged ends',
            items: [
              'Trimming a frayed or weak end is often better than nursing it. A loctician can reshape the tip.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'styling',
    title: 'Loc styling',
    sections: [
      {
        heading: 'Safe loc styling',
        note: 'The Loc Lookbook shows eighteen of these front, back and side.',
        blocks: [
          {
            label: 'Everyday styles',
            items: ['Worn down, a low ponytail tied with a soft band, or half up.'],
          },
          {
            label: 'Work styles',
            items: ['A low bun, a side sweep, or two low buns.'],
          },
          {
            label: 'Protective styles',
            items: ['Pinned updos that tuck the ends away, especially in cold or windy weather.'],
          },
          {
            label: 'Special occasion styles',
            items: ['Updos, and curls set on rods or pipe cleaners on clean, dry locs.'],
          },
          {
            label: 'Short loc styles',
            items: [
              'Pinned crowns, twisted sections and headwraps. Do not force short locs into an updo they cannot reach.',
            ],
          },
          {
            label: 'Long loc styles',
            items: [
              'Long locs are heavy. Spread the weight with low buns, and give the roots a break between high styles.',
            ],
          },
        ],
      },
      {
        heading: 'Styling safely',
        blocks: [
          {
            items: [
              'Avoid excessive tension',
              'Protect the hairline',
              'Avoid heavy accessories',
              'Avoid styles that pull on the roots',
            ],
          },
        ],
      },
      {
        heading: 'Styling frequency',
        blocks: [
          {
            label: 'How long to keep styles',
            items: [
              'A few days for a pinned or tied style. Take it down before wash day.',
            ],
          },
          {
            label: 'Giving locs breaks between styles',
            items: ['Alternate high and low styles, and wear your locs down for a few days between updos.'],
          },
          {
            label: 'Sleeping with styled locs',
            items: [
              'Loosen or take down high styles before bed, and cover them with a satin bonnet or scarf.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'accessories',
    title: 'Loc accessories',
    sections: [
      {
        heading: 'Safe accessories',
        blocks: [
          {
            items: [
              'Satin bonnets',
              'Satin scarves',
              'Satin pillowcases',
              'Loc-friendly hair ties',
              'Lightweight accessories',
            ],
          },
        ],
      },
      {
        heading: 'Things to consider',
        blocks: [{ items: ['Weight', 'Tension', 'Friction', 'Product buildup'] }],
      },
    ],
  },
  {
    id: 'problems',
    title: 'Loc problems',
    sections: [
      {
        heading: 'Dry locs',
        blocks: [
          {
            label: 'Signs',
            items: ['Rough texture', 'Brittle locs', 'Excessive frizz'],
          },
          {
            label: 'Solutions',
            items: [
              'Hydrate regularly',
              'Use lightweight moisturising products',
              'Avoid excessive heat',
            ],
          },
        ],
      },
      {
        heading: 'Itchy locs',
        blocks: [
          { label: 'Signs', items: ['Constant itching', 'Flaking', 'Irritation'] },
          {
            label: 'Solutions',
            items: [
              'Clean the scalp',
              'Identify irritating products',
              'Use appropriate scalp treatments',
            ],
          },
        ],
      },
      {
        heading: 'Buildup',
        blocks: [
          {
            label: 'Signs',
            items: [
              'White or coloured residue',
              'Heavy locs',
              'Unusual smell',
              'Sticky texture',
            ],
          },
          {
            label: 'Solutions',
            items: ['Clarify', 'Reduce heavy products', 'Rinse thoroughly'],
          },
        ],
      },
      {
        heading: 'Loc breakage',
        blocks: [
          {
            label: 'Signs',
            items: ['Locs snapping', 'Thinning sections', 'Weak ends'],
          },
          {
            label: 'Solutions',
            items: [
              'Reduce manipulation',
              'Avoid tight styling',
              'Improve conditioning and moisture',
              'Seek professional repair when needed',
            ],
          },
        ],
      },
      {
        heading: 'Thinning locs',
        blocks: [
          {
            label: 'Signs',
            items: ['Loc becoming smaller', 'Thin roots', 'Visible weak sections'],
          },
          {
            label: 'Solutions',
            items: [
              'Reduce tension',
              'Avoid frequent retwisting',
              'Consider professional loc repair',
            ],
          },
        ],
      },
      {
        heading: 'Loc odour',
        blocks: [
          {
            label: 'Signs',
            items: ['Unpleasant smell', 'Locs remain damp', 'Odour returns quickly'],
          },
          {
            label: 'Solutions',
            items: [
              'Wash properly',
              'Dry completely',
              'Avoid excessive product',
              'Check for scalp problems',
            ],
          },
        ],
      },
      {
        heading: 'Unravelling',
        blocks: [
          { label: 'Signs', items: ['Locs becoming loose', 'Hair separating'] },
          {
            label: 'Solutions',
            items: [
              'Follow the appropriate maintenance method',
              'Avoid excessive manipulation',
              'Allow starter locs time to mature',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'products',
    title: 'Products and ingredients',
    sections: [
      {
        heading: 'Cleansers',
        note: 'What to look for on the label, rather than a list of brands.',
        blocks: [
          {
            label: 'Look for',
            items: [
              'Gentle cleansing agents',
              'Clarifying ingredients when needed',
              'Anti-dandruff ingredients when appropriate',
            ],
          },
        ],
      },
      {
        heading: 'Moisturisers',
        blocks: [
          {
            label: 'Look for',
            items: ['Aloe vera', 'Glycerin', 'Panthenol', 'Lightweight oils'],
          },
        ],
      },
      {
        heading: 'Scalp care',
        blocks: [
          {
            label: 'Look for',
            items: [
              'Niacinamide',
              'Salicylic acid',
              'Ketoconazole, in an appropriate medicated product',
              'Zinc pyrithione where available and appropriate',
            ],
          },
        ],
      },
      {
        heading: 'Styling',
        blocks: [
          {
            label: 'Look for',
            items: [
              'Lightweight formulas',
              'Minimal residue',
              'Water-based products where appropriate',
            ],
          },
        ],
      },
      {
        heading: 'Go easy on',
        blocks: [
          {
            tone: 'avoid',
            items: [
              'Heavy waxes',
              'Thick butters',
              'Petroleum-heavy products',
              'Excessive oils',
              'Products that leave persistent residue',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'routines',
    title: 'Loc routines',
    sections: [
      {
        heading: 'Starter loc routine',
        blocks: [
          { items: ['Wash', 'Moisturise', 'Dry', 'Protect'], ordered: true },
        ],
      },
      {
        heading: 'Mature loc routine',
        blocks: [
          {
            items: [
              'Cleanse',
              'Condition if appropriate',
              'Moisturise',
              'Maintain',
              'Protect',
            ],
            ordered: true,
          },
        ],
      },
      {
        heading: 'Weekly',
        blocks: [
          {
            items: [
              'Scalp check',
              'Moisturise if needed',
              'Check roots',
              'Check edges',
              'Check for buildup',
            ],
          },
        ],
      },
      {
        heading: 'Monthly',
        blocks: [
          {
            items: [
              'Thorough wash',
              'Scalp assessment',
              'Check loc strength',
              'Assess buildup',
              'Assess roots and edges',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'myths',
    title: 'Loc myths',
    sections: [
      {
        heading: 'Common questions',
        blocks: [
          {
            items: [
              'Can you wash locs? Yes, and you should, every one to two weeks. Not washing is the most damaging myth on the loc journey.',
              'Do locs need oil? A little, on the scalp and the ends. Water is what moisturises; heavy oil builds up.',
              'Does dirty hair make locs grow faster? No. Locs form around shed hair. Dirt and product just get trapped with it, for years.',
              'Can you have healthy locs without retwisting? Yes. Freeform locs are never retwisted. Retwisting keeps the root neat; it does not make locs healthier.',
              'Can locs grow faster? Not really. Your body sets the growth rate. What you can change is how much length you keep.',
              'Can locs be undone? Starter locs comb out fairly easily. Mature locs can be picked out with patience and plenty of conditioner, but it takes many hours and costs some hair. Most people cut them.',
              'Can you dye locs? Yes. Lightening is the risky part: bleach weakens the loc from the inside, where it is hard to rinse out. A colourist who has worked on locs is worth paying for.',
              'Can you swim with locs? Yes. Wet them with clean water first, wear a cap, and wash and dry them fully the same day.',
              'Can you sleep with wet locs? No. That is how mildew starts, and the smell does not wash out.',
              'Do locs damage your hair? Not by themselves. Tension, too much maintenance and weight do.',
              'Can locs be repaired? Usually, if it is caught early. A loctician can reinforce a weak loc or combine it with a neighbour.',
              'How often should locs be retwisted? Every four to six weeks at the most, and eight is better. Freeform locs, never.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Loc lifestyle',
    sections: [
      {
        heading: 'Sleeping with locs',
        blocks: [
          {
            label: 'Satin protection',
            items: [
              'A satin or silk bonnet, scarf or pillowcase every night. Long locs fit a loc sock or a long tube bonnet.',
            ],
          },
          {
            label: 'Preventing friction',
            items: ['Cotton pulls fibres from your locs and leaves lint in them. Satin lets them slide.'],
          },
          {
            label: 'Protecting styles',
            items: ['Loosen updos before bed, gather long locs loosely on top, and never sleep on damp locs.'],
          },
        ],
      },
      {
        heading: 'Swimming',
        blocks: [
          {
            label: 'Before swimming',
            items: [
              'Soak your locs in clean tap water first, so they take up less pool or sea water.',
            ],
          },
          {
            label: 'Protecting locs from chlorine and salt water',
            items: ['A large swim cap keeps most of the water out. Rinse straight after you get out.'],
          },
          {
            label: 'Washing after swimming',
            items: [
              'Wash the same day, rinse long, and dry completely. Locs hold pool water for hours.',
            ],
          },
        ],
      },
      {
        heading: 'Exercise',
        blocks: [
          {
            label: 'Sweat and scalp care',
            items: ['Sweat sits at the roots. Wipe along the parts with a cotton pad after a heavy workout.'],
          },
          {
            label: 'Washing after heavy sweating',
            items: [
              'You do not need a full wash after every workout. If you rinse the scalp, dry the roots completely afterwards.',
            ],
          },
          {
            label: 'Preventing buildup',
            items: [
              'Sweat and product together build up faster. Use less product on training days, and clarify monthly.',
            ],
          },
        ],
      },
      {
        heading: 'Heat and sun',
        blocks: [
          {
            label: 'Protecting locs',
            items: ['Cover your locs with a scarf or hat in strong sun. Sun dries and fades the ends.'],
          },
          {
            label: 'Preventing excessive dryness',
            items: ['Mist with a water-based spray more often in hot, dry weather.'],
          },
          {
            label: 'Heat styling safely',
            items: [
              'Locs rarely need direct heat. Dry them on low with a diffuser, skip flat irons and curling tongs, and use rods for curls.',
            ],
          },
        ],
      },
      {
        heading: 'Colouring locs',
        blocks: [
          {
            label: 'Risks of bleaching',
            items: [
              'Bleach weakens hair, and in a loc the weakened hair is inside, where you cannot see it or rinse it easily. Lightened locs are more likely to thin and break.',
            ],
          },
          {
            label: 'Dyeing mature locs',
            items: [
              'Wait until your locs are mature, use a colourist who has coloured locs before, and rinse far longer than you would loose hair.',
            ],
          },
          {
            label: 'Maintaining coloured locs',
            items: ['A gentle, colour-safe shampoo, and cover in strong sun.'],
          },
          {
            label: 'Preventing dryness and breakage',
            items: [
              'Moisturise more often than before, and do not lighten the same hair twice.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'professional',
    title: 'Professional help',
    sections: [
      {
        heading: 'When to see a loctician',
        blocks: [
          {
            items: [
              'Thinning locs',
              'Weak roots',
              'Loc breakage',
              'Loc repair',
              'Combining locs',
              'Major buildup',
            ],
          },
        ],
      },
      {
        heading: 'When to see a dermatologist',
        blocks: [
          {
            items: [
              'Sudden hair loss',
              'Bald patches',
              'Persistent scalp itching',
              'Painful bumps',
              'Severe inflammation',
              'Scarring',
              'Persistent dandruff',
              'Unexplained thinning',
            ],
          },
        ],
      },
    ],
  },
]

/** How many sections are still topic lists, for the note at the top of the screen. */
export function outlineCount(): number {
  return LOC_CARE.reduce(
    (n, chapter) => n + chapter.sections.filter((s) => s.outline).length,
    0,
  )
}
