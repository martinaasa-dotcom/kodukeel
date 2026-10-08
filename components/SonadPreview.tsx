import { ButtonLink } from "@/components/Button";
import { ArrowRight } from "lucide-react";
import { scoreGuess, SONAD_GUESSES, SONAD_LENGTH } from "@/lib/games/sonad";
import { EMPTY, HUE, RING, SPOKEN } from "@/components/sonad/look";
import { Card, SectionTitle } from "@/components/ui";
import { fill, tr, type Locale } from "@/lib/copy/locale";

/**
 * SÕNAD ON THE HOME PAGE, SHOWN RATHER THAN DESCRIBED.
 *
 * The brief for Today's game of the day was to make Sõnad something somebody
 * wants to press, and the most persuasive thing a word game can say about
 * itself is a board partway to being solved. So the card carries a small one,
 * three rows and a win, drawn with the board's own circles, hues and rings
 * (`components/sonad/look.ts`) and marked by the board's own `scoreGuess`.
 * That is deliberate over a screenshot: a picture of the game goes stale the
 * first time the board changes and is a fixed size in both themes, where this
 * is the real thing at a small scale.
 *
 * THE EXAMPLE IS ONE ANYBODY CAN READ OFF THE CARD. The answer is `lennuk`,
 * plane, and the two guesses before it are ordinary words the dictionary holds,
 * chosen so all three marks appear: `leping` puts the L and the E in place and
 * has the N elsewhere, `kohvik` finds the K both elsewhere and in place. It is
 * never today's word, so nothing is given away, and it is the same every
 * morning because the point is what the game looks like and not a clue.
 *
 * Decorative and hidden from a screen reader, which is told the same thing in
 * a sentence instead, since 18 circles read out one at a time is not a preview.
 * Nothing here is written or graded, and no Estonian is typed beyond the three
 * words above, each a headword of the shipped dictionary.
 */
const EXAMPLE_ANSWER = "lennuk";
const EXAMPLE_GUESSES = ["leping", "kohvik", "lennuk"] as const;

export function SonadPreview({ href, why, locale = "en" }: { href: string; why: string; locale?: Locale }) {
  const t = (english: string) => tr(locale, english);
  return (
    <Card className="flex h-full flex-col">
      <SectionTitle hint={t("a new word every day")}>{t("Today’s game")}</SectionTitle>
      <div className="flex flex-1 flex-col gap-5">
        <div
          aria-hidden
          data-sonad-preview
          className="flex shrink-0 flex-col items-center gap-1.5 self-center rounded-[var(--r)] p-3.5"
          style={{ background: "var(--raised)" }}
        >
          {EXAMPLE_GUESSES.map((guess) => {
            const marks = scoreGuess(guess, EXAMPLE_ANSWER);
            return (
              <div key={guess} className="flex gap-1.5" lang="et">
                {[...guess].slice(0, SONAD_LENGTH).map((letter, i) => {
                  const mark = marks[i]!;
                  const hue = HUE[mark];
                  return (
                    <span
                      key={i}
                      className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold uppercase"
                      style={{
                        background: hue.bg,
                        color: hue.ink,
                        boxShadow: RING[mark] === "0" ? "none" : `inset 0 0 0 ${RING[mark]} ${hue.ring}`,
                      }}
                    >
                      {letter}
                    </span>
                  );
                })}
              </div>
            );
          })}
          <div className="flex gap-1.5">
            {Array.from({ length: SONAD_LENGTH }, (_, i) => (
              <span
                key={i}
                className="h-8 w-8 rounded-full"
                style={{ boxShadow: `inset 0 0 0 2px ${EMPTY.ring}` }}
              />
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold leading-tight" style={{ color: "var(--ink)" }} lang="et">
            Sõnad
          </p>
          <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {why}
          </p>
          <p className="sr-only">
            {fill(t("An example board: three guesses, each circle marked {here}, {elsewhere} or {absent}."), {
              here: t(SPOKEN.here), elsewhere: t(SPOKEN.elsewhere), absent: t(SPOKEN.absent),
            })}
          </p>
          <div className="mt-4">
            <ButtonLink href={href} variant="primary">
              {t("Play Sõnad")} <ArrowRight size={15} aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
        {fill(t("Six letters, {tries} tries, a clue if you get stuck."), { tries: SONAD_GUESSES })}
      </p>
    </Card>
  );
}
