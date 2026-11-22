/**
 * What AfroCoils is, who it is for, its mission and who makes it: the
 * owner's copy, word for word (2026-10-30). Type 4 hair first, locs supported as one
 * journey within it rather than the focus.
 *
 * Here rather than inside the About screen because the landing site
 * shows the same introduction above Meet the Founder, and reads it from
 * this file so the page and the app cannot drift apart.
 */
export const ABOUT_INTRO: { id: 'what' | 'who' | 'mission' | 'makers'; heading: string; body: string[] }[] = [
  {
    id: 'what',
    heading: 'What is AfroCoils?',
    body: [
      'AfroCoils is your everyday hair companion, created specifically for women with Type 4 natural hair.',
      'We help you understand your hair better, discover hairstyles that suit your hair type and condition, and build a hair-care routine that works for you.',
      'From personalised hairstyle recommendations to simple hair-care guidance, AfroCoils is designed to make caring for and styling your natural hair easier, more convenient, and less overwhelming.',
      'Whether you’re looking for a quick hairstyle, trying to address a hair-care concern, or simply learning what works best for your hair, AfroCoils is here to guide you.',
    ],
  },
  {
    id: 'who',
    heading: 'Who is AfroCoils for?',
    body: [
      'AfroCoils is designed for women with Type 4 natural hair, including 4A, 4B and 4C textures, who want to understand their hair, care for it, and explore suitable styling options.',
      'Whether you wear your hair loose or in locs, AfroCoils aims to provide guidance and recommendations suited to your hair journey.',
    ],
  },
  {
    id: 'mission',
    heading: 'Our mission',
    body: [
      'Our mission is to make natural hair care simpler, more accessible, and more personalised, helping women feel more confident in understanding, caring for, and styling their hair.',
    ],
  },
  // The last thing before Meet the Founder, on both surfaces (asked for
  // 2026-11-22): who makes it, then who she is.
  {
    id: 'makers',
    heading: 'Who makes AfroCoils',
    body: [
      'AfroCoils is a product of Crown Space Limited.',
      'AfroCoils is an independent product brand under Crown Space Limited, with its own name and its own purpose: caring for Type 4 natural hair.',
    ],
  },
]
