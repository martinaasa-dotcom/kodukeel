import { ButtonLink } from "@/components/Button";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight } from "lucide-react";
import { lettersOf } from "@/lib/games/letters";
import { Card, SectionTitle } from "@/components/ui";
import { tr, type Locale } from "@/lib/copy/locale";

/**
 * TÄHED ON THE HOME PAGE, SHOWN RATHER THAN DESCRIBED.
 *
 * Tähed is what Today leads with on a morning the module has not yet taught
 * enough words to build a Sõnad board from (`PUZZLE_STAND_IN`), which is every
 * morning of somebody's first week. It was a title, a sentence and a button,
 * beside a Sõnad card that draws its own board, so the one game a beginner is
 * offered looked like the less inviting of the two. This is `SonadPreview`'s
 * argument for the other game: a round partway through, drawn with the
 * round's own shapes (`LettersSession.tsx`), the dashed slots of the row and
 * the round accent tiles under it, rather than a screenshot that goes stale
 * the first time the board changes and is one size in both themes.
 *
 * THE EXAMPLE IS ONE ANYBODY CAN READ OFF THE CARD. The word is `päike`, sun,
 * an A1 headword of the shipped dictionary with an ä in it, because noticing
 * that letter is what the round is for. Two letters are in place and the other
 * three wait under the row in an order that is not the word's. It is the same
 * every morning, since the point is what the game looks like and not a clue,
 * and it reveals nothing: the round deals a word the learner has met.
 *
 * Decorative and hidden from a screen reader, which is told the same thing in
 * a sentence. Nothing here is written or graded, and no Estonian is typed
 * beyond the one headword above.
 */
const EXAMPLE_WORD = "päike";
const EXAMPLE_MEANING = "sun";
const PLACED = 2;
/** The letters still to place, in an order that is not the word's. */
const WAITING = ["k", "e", "i"] as const;

export function TahedPreview({ href, why, locale = "en" }: { href: string; why: string; locale?: Locale }) {
  const t = (english: string) => tr(locale, english);
  const letters = lettersOf(EXAMPLE_WORD);
  return (
    <Card className="flex h-full flex-col">
      <SectionTitle hint={
        <Link href="/games" className="font-semibold underline-offset-4 hover:underline" style={{ color: "var(--accent-deep)" }}>
          {t("All games")}
        </Link>
      }>{t("Play a word game")}</SectionTitle>
      <div className="flex flex-1 flex-col items-center gap-5 text-center">
        <div
          aria-hidden
          data-tahed-preview
          className="flex shrink-0 flex-col items-center gap-2.5 self-center rounded-[var(--r)] p-3.5"
          style={{ background: "var(--raised)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{t(EXAMPLE_MEANING)}</p>
          <div className="flex gap-1.5" lang="et">
            {letters.map((letter, i) => {
              const shown = i < PLACED;
              return (
                <span
                  key={i}
                  className="grid h-8 w-8 place-items-center rounded-[var(--r-sm)] border text-sm font-bold"
                  style={{
                    borderColor: shown ? "var(--rule)" : "var(--ink-3)",
                    borderStyle: shown ? "solid" : "dashed",
                    background: shown ? "var(--surface)" : "transparent",
                    color: "var(--ink)",
                  }}
                >
                  {shown ? letter : ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-1.5" lang="et">
            {WAITING.map((letter) => (
              <span
                key={letter}
                className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold shadow-[var(--shadow)]"
                style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <p className="font-display text-2xl font-bold leading-tight" style={{ color: "var(--ink)" }} lang="et">
            Tähed
          </p>
          <p className="mt-1 max-w-[32ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {why}
          </p>
          <p className="sr-only">
            {t("An example round: the word for sun, two letters in place and three still to put in order.")}
          </p>
          <div className="mt-auto pt-5">
            <ButtonLink href={href} variant="primary">
              {t("Play now")} <ArrowRight size={15} aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </div>
    </Card>
  );
}
