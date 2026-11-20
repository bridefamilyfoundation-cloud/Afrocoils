import { Link, Navigate, useParams } from 'react-router-dom'
import HairGuideBlock from '../components/HairGuideBlock'
import Icon from '../components/Icon'
import SectionCrumb from '../components/SectionCrumb'
import {
  HAIR_EDUCATION_INTRO,
  HAIR_EDUCATION_TITLE,
  LESSON_IDS,
  OPENING_LESSON,
  lessonsFor,
} from '../content/hair-education'
import type { HairGuideChapter } from '../content/hair-guide'
import { isLocs } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'

/**
 * Hair Education: `/care/learn` lists the lessons, `/care/learn/:lesson`
 * reads one. Inside Hair Care, reached from its hub, like the Hair Guide.
 *
 * A lesson is a guide chapter (`content/hair-education.ts`), so this
 * screen writes nothing — it reorders the reading. The guide is an
 * accordion for looking something up; this is one lesson to a screen,
 * with Previous and Next, for someone learning from the beginning.
 *
 * A loc wearer gets the lessons that hold for locs, with a line saying
 * which were left out and why, never quietly — the guide's own rule.
 */

function headingsOf(lesson: HairGuideChapter): string[] {
  return lesson.sections.flatMap((s) => (s.heading ? [s.heading] : []))
}

/** "Lesson 3", or nothing for the opening, which comes before lesson one. */
function lessonLabel(lessons: HairGuideChapter[], lesson: HairGuideChapter): string | null {
  if (lesson.id === OPENING_LESSON) return null
  const numbered = lessons.filter((l) => l.id !== OPENING_LESSON)
  return `Lesson ${numbered.indexOf(lesson) + 1} of ${numbered.length}`
}

export default function HairEducationScreen() {
  const { lesson: lessonId } = useParams()
  const { profile } = useHairProfile()
  const locs = isLocs(profile.identity)
  const lessons = lessonsFor(profile.identity.hairType)
  const hidden = LESSON_IDS.length - lessons.length

  if (lessonId === undefined) {
    return <LessonList lessons={lessons} locs={locs} hidden={hidden} />
  }
  const lesson = lessons.find((l) => l.id === lessonId)
  // An unknown lesson, or one not written for this hair, goes back to
  // the list rather than drawing a page that should not be there.
  if (!lesson) return <Navigate to="/care/learn" replace />
  return <Lesson lessons={lessons} lesson={lesson} locs={locs} />
}

function LessonList({
  lessons,
  locs,
  hidden,
}: {
  lessons: HairGuideChapter[]
  locs: boolean
  hidden: number
}) {
  const opening = lessons.find((l) => l.id === OPENING_LESSON)
  const numbered = lessons.filter((l) => l.id !== OPENING_LESSON)

  return (
    <>
      <SectionCrumb to="/care" label="Hair Care" />

      <section className="mb-xl">
        <div className="mb-md flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-card">
          <Icon name="school" className="text-[28px]" />
        </div>
        <h2 className="mb-sm font-headline-lg text-headline-lg-mobile text-on-background">
          {HAIR_EDUCATION_TITLE}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">{HAIR_EDUCATION_INTRO}</p>
      </section>

      {locs && hidden > 0 && (
        <Link
          to="/locs"
          className="mb-xl flex items-start gap-sm rounded-xl bg-surface-container p-md transition-all active:scale-[0.98]"
        >
          <Icon name="grass" className="shrink-0 text-primary" />
          <span className="flex-1 font-body-md text-caption text-on-surface-variant">
            {hidden} lessons are written for loose hair — washing, layering and handling that
            would damage locs — so they are left out for you. Locs World is written for yours.
          </span>
          <Icon name="arrow_forward" className="shrink-0 text-outline" />
        </Link>
      )}

      {opening && (
        <Link
          to={`/care/learn/${opening.id}`}
          className="mb-xl flex items-center gap-md rounded-xl bg-inverse-surface p-lg text-inverse-on-surface shadow-card transition-all active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <Icon name="menu_book" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label-md text-caption uppercase tracking-[0.2em] text-inverse-on-surface/75">
              Start here
            </p>
            <h3 className="font-headline-md text-body-lg font-bold">{opening.title}</h3>
          </div>
          <Icon name="arrow_forward" className="shrink-0" />
        </Link>
      )}

      <ol className="mb-xl space-y-sm">
        {numbered.map((lesson, i) => {
          const topics = headingsOf(lesson)
          return (
            <li key={lesson.id}>
              <Link
                to={`/care/learn/${lesson.id}`}
                className="flex items-center gap-md rounded-2xl bg-surface-container-lowest p-lg shadow-card transition-all active:scale-[0.98]"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container font-headline-md text-body-md font-bold text-on-secondary-container"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-headline-md text-body-lg text-on-surface">
                    <span className="sr-only">Lesson {i + 1}: </span>
                    {lesson.title}
                  </span>
                  {topics.length > 0 && (
                    <span className="mt-xs block font-body-md text-caption text-on-surface-variant">
                      {topics.length} {topics.length === 1 ? 'topic' : 'topics'} · {topics[0]}
                    </span>
                  )}
                </span>
                <Icon name="arrow_forward" className="shrink-0 text-outline" />
              </Link>
            </li>
          )
        })}
      </ol>

      <PracticeLink locs={locs} />
    </>
  )
}

function Lesson({
  lessons,
  lesson,
  locs,
}: {
  lessons: HairGuideChapter[]
  lesson: HairGuideChapter
  locs: boolean
}) {
  const at = lessons.indexOf(lesson)
  const previous = lessons[at - 1]
  const next = lessons[at + 1]
  const label = lessonLabel(lessons, lesson)
  const topics = headingsOf(lesson)

  return (
    <>
      <SectionCrumb to="/care/learn" label={HAIR_EDUCATION_TITLE} />

      <header className="mb-lg">
        <p className="mb-xs font-label-md text-caption uppercase tracking-[0.2em] text-secondary">
          {label ?? 'Start here'}
        </p>
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background">{lesson.title}</h2>
        {label && (
          <div
            className="mt-md h-1.5 overflow-hidden rounded-full bg-surface-container-high"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-secondary"
              style={{ width: `${(at / (lessons.length - 1)) * 100}%` }}
            />
          </div>
        )}
      </header>

      {topics.length > 1 && (
        <section className="mb-lg" aria-label="In this lesson">
          <p className="mb-sm font-label-md text-caption font-bold text-on-surface">In this lesson</p>
          <ul className="flex flex-wrap gap-xs">
            {topics.map((topic) => (
              <li
                key={topic}
                className="rounded-full bg-surface-container-lowest px-md py-1 font-label-md text-caption text-on-surface-variant shadow-card"
              >
                {topic}
              </li>
            ))}
          </ul>
        </section>
      )}

      <article className="mb-xl space-y-xl rounded-2xl bg-surface-container-lowest p-lg shadow-card">
        {lesson.sections.map((section, i) => (
          <section key={section.heading ?? i} className="space-y-md">
            {section.heading && (
              <h3 className="font-headline-md text-body-lg font-bold text-on-surface">
                {section.heading}
              </h3>
            )}
            {section.blocks.map((block, j) => (
              <HairGuideBlock key={j} block={block} />
            ))}
          </section>
        ))}
      </article>

      <nav aria-label="Lessons" className="mb-xl grid grid-cols-2 gap-sm">
        {previous ? (
          <Link
            to={`/care/learn/${previous.id}`}
            className="flex flex-col gap-xs rounded-xl bg-surface-container-high p-md transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-xs font-label-md text-caption text-on-surface-variant">
              <Icon name="arrow_back" className="text-[16px]" />
              Previous
            </span>
            <span className="font-label-md text-body-md font-bold text-on-surface">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/care/learn/${next.id}`}
            className="flex flex-col items-end gap-xs rounded-xl bg-secondary p-md text-right text-on-secondary transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-xs font-label-md text-caption font-bold">
              Next
              <Icon name="arrow_forward" className="text-[16px]" />
            </span>
            <span className="font-label-md text-body-md font-bold">{next.title}</span>
          </Link>
        ) : (
          <Link
            to="/care/learn"
            className="flex flex-col items-end gap-xs rounded-xl bg-secondary p-md text-right text-on-secondary transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-xs font-label-md text-caption font-bold">
              Done
              <Icon name="check" className="text-[16px]" />
            </span>
            <span className="font-label-md text-body-md font-bold">All lessons</span>
          </Link>
        )}
      </nav>

      {!next && <PracticeLink locs={locs} />}
    </>
  )
}

/**
 * Onward from learning to doing. The practical chapters are the guide's
 * starter kit, which is loose-hair only; a loc wearer is sent to Locs
 * World instead.
 */
function PracticeLink({ locs }: { locs: boolean }) {
  return (
    <Link
      to={locs ? '/locs' : '/care/guide?open=starter-kit'}
      className="mb-2xl flex items-center gap-sm rounded-xl bg-surface-container p-md transition-all active:scale-[0.98]"
    >
      <Icon name={locs ? 'grass' : 'menu_book'} className="shrink-0 text-primary" />
      <span className="flex-1">
        <span className="block font-label-md text-body-md font-bold text-on-surface">
          Put it into practice
        </span>
        <span className="block font-body-md text-caption text-on-surface-variant">
          {locs
            ? 'Locs World covers care, stages and styles for locs.'
            : 'The starter kit, your first wash day and a routine to keep, in the Hair Guide.'}
        </span>
      </span>
      <Icon name="arrow_forward" className="shrink-0 text-outline" />
    </Link>
  )
}
