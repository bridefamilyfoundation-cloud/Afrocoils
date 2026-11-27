/**
 * The six carousels: one per section of the app, six slides each.
 *
 * Nothing here is new copy. Every `head` and `body` is quoted from one
 * of three places, named beside it:
 *   membership — src/content/membership.ts, the owner's description of the section
 *   screen     — words visible on the captured screen the slide shows
 *   tour       — the section's step in src/lib/tour.ts
 * and every picture is a crop of a capture: `y` and `h` are in the
 * screen's own CSS px (412 wide), read from captures/marks.json.
 *
 * Shot presets, on the 1080x1350 canvas:
 *   cover  a wide crop under the title        bottom  a wide crop above the caption
 *   card   a wide crop under the caption      side    the whole phone beside the caption
 *   phone  a phone under the caption
 */
const cover = (img, y, h = 220) => ({ img, y, h, kind: 'card', w: 936, x: 72, top: 700 })
const card = (img, y, h = 315) => ({ img, y, h, kind: 'card', w: 936, x: 72, top: 470 })
const bottom = (img, y, h = 330) => ({ img, y, h, kind: 'card', w: 936, x: 72, top: 72 })
const phone = (img, y, h = 555) => ({ img, y, h, kind: 'phone', w: 520, x: 268, top: 470 })
const side = (img, y, h = 1080) => ({ img, y, h, kind: 'phone', w: 408, x: 600, top: 96 })
const END = { layout: 'end' }

const CAROUSELS = [
  {
    slug: 'hair-sos',
    title: 'Hair SOS',
    slides: [
      // membership
      { layout: 'cover', theme: 'orange', head: 'Hair SOS', body: 'The front page: quick styles by the time you have, and the way into Hair Care.', shots: [{ ...cover('sos', 462, 180), top: 770 }] },
      // screen
      { layout: 'top', head: 'What’s your emergency?', body: 'Quick styles and real care, for the moment your hair can’t wait.', shots: [{ ...phone('sos', 400, 420), top: 540 }] },
      // screen
      { layout: 'bottom', theme: 'orange', head: 'Two ways in', body: 'Everything behind them is written down and on this phone, so it works with no signal.', shots: [bottom('sos', 950, 270)] },
      // screen (/sos/quick)
      { layout: 'side', head: 'Quick Hairstyle', body: 'How long have you got? The list is ranked against your hair profile, shortest first.', shots: [side('quick', 96)] },
      // screen (the Hair Care door, and the screen it opens)
      { layout: 'side', theme: 'peach', head: 'Hair Care', body: 'Know your hair, build a routine, and find the products and styles that suit it.', shots: [side('care', 80)] },
      END,
    ],
  },
  {
    slug: 'hair-styles',
    title: 'Hair Styles',
    slides: [
      // membership
      { layout: 'cover', theme: 'cream', head: 'Hair Styles', body: 'The style library with step-by-step methods, and picks for your hair.', shots: [cover('styles', 96, 178)] },
      // screen
      { layout: 'top', head: 'Hair Styles', body: 'The full technique library — every contributed look, browsable by category and occasion.', shots: [phone('styles', 96)] },
      // screen (/styles/recommended)
      { layout: 'bottom', theme: 'chocolate', head: 'Hairstyle Recommendations', body: 'Built from your hair profile. Every criterion below is something you told the app.', shots: [bottom('recommended', 262)] },
      // screen (/styles/recommended, the "How your hair is doing" row)
      { layout: 'top', head: 'It ranks, never excludes', body: 'Breakage, damage, split ends or length that will not stay lift protective and low-manipulation styles; tangling lifts low-manipulation ones.', shots: [{ ...card('recommended', 606, 262), top: 560 }] },
      // screen heading, tour sentence. The crop stops above the style
      // cards: their pictures are generated, and never a slide's subject.
      { layout: 'top', theme: 'peach', head: 'All styles', body: 'The full library, by category and occasion.', shots: [card('styles', 500, 205)] },
      END,
    ],
  },
  {
    slug: 'hair-care',
    title: 'Hair Care',
    slides: [
      // membership
      { layout: 'cover', theme: 'peach', head: 'Hair Care', body: 'The AfroCoils Hair Guide and its lessons, porosity, a care calendar with reminders, the product shelf, and help when something is wrong.', shots: [cover('care', 205, 215)] },
      // screen (/care/guide)
      { layout: 'top', head: 'The AfroCoils Hair Guide', body: 'Understand your hair. Care for your hair. Style your hair.', shots: [phone('guide', 96)] },
      // screen (the Hair Education card, and the screen it opens)
      { layout: 'side', theme: 'light', head: 'Hair Education', body: 'What 4C hair is and why it behaves the way it does, in short lessons, one at a time.', shots: [side('learn', 96)] },
      // screen
      { layout: 'bottom', theme: 'espresso', head: 'A · Know your hair', body: 'How readily your hair takes water in and lets it go. Drives almost every product decision.', shots: [bottom('care', 526)] },
      // screen
      { layout: 'top', head: 'E · Something is wrong', body: 'Dryness, an itchy scalp, buildup, breakage. Opens Hair Problem: start from the symptom and read what it usually is.', shots: [phone('care', 1296, 570)] },
      END,
    ],
  },
  {
    slug: 'hair-growth',
    title: 'Hair Growth',
    slides: [
      // membership
      { layout: 'cover', theme: 'chocolate', head: 'Hair Growth', body: 'Length checks, how much you are keeping, and when you reach each milestone.', shots: [cover('growth', 516, 166)] },
      // screen heading, tour sentence
      { layout: 'top', head: 'Length over time', body: 'Log a length check every month and see what you are keeping, not just what you grow.', shots: [phone('growth', 516, 510)] },
      // screen
      { layout: 'bottom', theme: 'orange', head: 'Retention matters more than growth', body: 'What is in your hair, what is due, and what you are actually keeping.', shots: [{ ...bottom('growth', 1036, 224), top: 150 }] },
      // screen
      { layout: 'side', head: 'Milestones', body: 'Landmarks are approximate — where “shoulder length” falls depends on your torso, not on a number.', shots: [side('growth', 1270)] },
      // screen heading, tour sentence
      { layout: 'top', theme: 'peach', head: 'My Styles', body: 'Your own worn styles and photos live here too.', shots: [card('growth', 2455, 210)] },
      END,
    ],
  },
  {
    slug: 'locs-world',
    title: 'Locs World',
    slides: [
      // membership
      { layout: 'cover', theme: 'espresso', head: 'Locs World', body: 'Every chapter on starting and caring for locs, and the loc lookbook.', shots: [cover('locs', 1120, 222)] },
      // screen
      { layout: 'top', head: 'Loose or Loc’d?', body: 'Your journey, your care.', shots: [phone('locs', 84, 560)] },
      // tour
      { layout: 'side', theme: 'espresso', head: 'Locs World', body: 'Starting, maintaining and caring for locs, plus a lookbook of loc styles.', shots: [side('locs', 1085)] },
      // tour
      { layout: 'bottom', theme: 'light', head: 'Kept apart from loose-hair care on purpose', body: 'Much loose-hair technique damages locs.', shots: [bottom('locs', 352, 336)] },
      // screen (/locs/styles)
      { layout: 'top', theme: 'peach', head: 'The Loc Lookbook', body: '18 looks, from the first coils to a wedding updo — each one front, back and side.', shots: [phone('locstyles', 84, 520)] },
      END,
    ],
  },
  {
    slug: 'my-hair-profile',
    title: 'My Hair Profile',
    slides: [
      // membership
      { layout: 'cover', theme: 'light', head: 'My Hair Profile', body: 'Hair Discovery, and everything above fitted to your hair.', shots: [cover('profile', 322, 226)] },
      // screen heading, tour sentence
      { layout: 'top', head: 'My Hair Profile', body: 'Tap any hair answer to change it in Hair Discovery.', shots: [phone('profile', 300, 555)] },
      // screen (/quiz)
      { layout: 'side', theme: 'peach', head: 'Let’s Get to Know Your Hair!', body: 'For each part of your hair you will see what it means, then try a simple test at home to find out yours.', shots: [side('quiz', 96)] },
      // screen
      { layout: 'bottom', theme: 'espresso', head: 'Scalp & surroundings', body: 'These change which products work. None of it leaves the phone.', shots: [bottom('profile', 920, 275)] },
      // screen
      { layout: 'top', head: 'How your hair is doing', body: 'This one is meant to change. Update it whenever your hair does.', shots: [card('profile', 1200, 300)] },
      END,
    ],
  },
]
