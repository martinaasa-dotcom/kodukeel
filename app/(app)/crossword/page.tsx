import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { crosswordFor } from "@/lib/progress/crossword";
import { taughtAtDayStart } from "@/lib/progress/moduleScope";
import { Empty, Page } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { CrosswordSession } from "./CrosswordSession";
import { BeforeYouStart } from "@/components/round/Briefing";

export async function generateMetadata() {
  return titleFor("Ristsõna");
}

export const dynamic = "force-dynamic";

/**
 * RISTSÕNA: THE DAILY CROSSWORD, ENGLISH CLUES AND ESTONIAN ANSWERS.
 *
 * Named in Estonian for the reason Sõnad is, and the English name is kept
 * beside it rather than dropped: the lead says "a crossword" in the first two
 * words, so nobody has to know the word before they can decide whether to
 * press. That is the shape every grammar screen here takes with a case, the
 * name a class uses leading and the one an English reference grammar uses as
 * the cross-reference.
 *
 * One direction and one direction only, because it is the one that teaches:
 * you know what you mean and you are looking for the word, which is where a
 * learner is every time they open their mouth. A grid the other way round is a
 * reading exercise with extra steps.
 *
 * `lib/games/crossword.ts` compiles it and says what of a crossword is anybody
 * else's, which is the name and the grids and not the format;
 * `lib/progress/crossword.ts` decides which words, from the learner's own band.
 */
export default async function CrosswordPage() {
  const ownerId = await requireUserId();
  const [level, clock, locale] = await Promise.all([courseLevelFor(ownerId), learnerDayClock(ownerId), localeFor(ownerId)]);
  const day = clock.dayKey(new Date());
  // Memoised: `crosswordFor` asks the same question of the same day.
  const [puzzle, taught] = await Promise.all([crosswordFor(ownerId, day, level), taughtAtDayStart(ownerId, day)]);

  return (
    <BeforeYouStart id="crossword" ready={puzzle !== null}>
      <Page
        compact
        title="Ristsõna"
        lead={tr(locale, "Clues in English, answers in Estonian, and a fresh grid every morning.")}
      >
        {puzzle ? (
          <CrosswordSession puzzle={puzzle} day={day} />
        ) : (
          taught ? (
            <Empty
              title={tr(locale, "Not enough words yet")}
              body={tr(locale, "Today's grid is built from your evenings' words, and there aren't enough to cross yet.")}
              action={<ButtonLink href="/course">{tr(locale, "Today’s evening")}</ButtonLink>}
            />
          ) : (
            <Empty
              title={tr(locale, "No grid for today")}
              body={tr(locale, "We couldn't fit enough words at your level into a grid today. Try again tomorrow.")}
              action={<ButtonLink href="/dictionary">{tr(locale, "Look something up")}</ButtonLink>}
            />
          )
        )}
      </Page>
    </BeforeYouStart>
  );
}
