import { redirect } from "next/navigation";
import { glossLanguageFrom } from "@/lib/collections/glossLanguage";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { learnBatch, learnCounts } from "@/lib/progress/learn";
import { courseFormsByLemma } from "@/lib/dict/facts";
import { spellingsOf } from "@/lib/progress/lessonWords";
import { wordsThrough } from "@/lib/course";
import { courseReading, programmeFor } from "@/lib/progress/course";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { LearnSession } from "@/app/(app)/learn/new/LearnSession";

export const metadata = { title: "Today's words" };

export const dynamic = "force-dynamic";

/**
 * The Learn ladder, pointed at today's module and at nothing else.
 *
 * The one thing that separates this from `/learn/new` is the word list: a
 * planned day names its eight words, and every round after this one asks those
 * back, so the ladder has to teach those rather than whatever is oldest in the
 * deck. `learnBatch` takes the list and the rest of the round is identical,
 * which is the point: this is not a second ladder, it is the ladder with the
 * choosing already done.
 *
 * It reads rather than writes. The words are put in the deck by
 * `startCourseDay`, a Server Action behind the press on the module screen, for
 * the reason every deck write in this app is behind one: a page that topped up
 * a deck while rendering would build somebody eight words for hovering over
 * the link, and no browser suite would catch it because a suite clicks.
 */
export default async function CourseLearnPage() {
  const ownerId = await requireUserId();
  const programme = await programmeFor(ownerId);
  if (!programme) redirect("/course");

  const clock = await learnerDayClock(ownerId);
  const reading = await courseReading(ownerId, programme, clock);
  if (!reading.current) redirect("/course");

  const day = reading.current.day;

  const [settings, level, counts, courseSpellings] = await Promise.all([
    readSettings(ownerId, [SETTING_KEYS.glossLanguage]),
    courseLevelFor(ownerId),
    learnCounts(ownerId),
    /*
      Every spelling of every course word. Which of them this learner has been
      taught is `wordsThrough` below; this is a fact about the shared
      dictionary, so on a warm instance it is no query at all.
    */
    courseFormsByLemma(),
  ]);

  const words = await learnBatch(
    ownerId,
    level,
    glossLanguageFrom(settings[SETTING_KEYS.glossLanguage]),
    day.words.length,
    {
      only: day.words,
      /*
        WHAT THE MODULE HAS TAUGHT, THROUGH THE DAY THEY ARE ON.

        The gap rung cuts a sentence a lexicographer wrote, and at A1 most of
        those carry words from further up the course: the module's own first
        evening would have gapped a sentence holding five words nobody had
        shown. `wordsThrough` is what the programme has given them, which is a
        different question from what their deck holds, and the right one here:
        somebody who skipped a round still met the words.

        Standalone Learn passes nothing and is untouched, because a learner
        who went there themselves is choosing their own difficulty. This is
        the module, which chose for them.
      */
      taughtWords: spellingsOf(courseSpellings, wordsThrough(programme, day.index)),
    },
  );

  return (
    <LearnSession
      words={words}
      waiting={counts.waiting}
      started={counts.started}
      back={{ href: "/course", label: "Back to today's module" }}
    />
  );
}
