"use client";

import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";
import { Confetti } from "@/components/Confetti";
import { Mascot } from "@/components/brand";
import { Speak } from "@/components/Speak";
import { StatTile } from "@/components/ui";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { WordLink } from "@/components/course/WordLink";
import { AnotherRound } from "@/components/round/AnotherRound";
import { WayOut } from "@/components/round/RoundExit";

/** One figure about the round just played, as a tile. */
export interface RoundFigure {
  value: ReactNode;
  label: string;
}

/**
 * One thing the round asked that did not come out right first time: the
 * Estonian as the answer was, and what it means or which form it is. Every
 * string here came off the round's own cards, so nothing is written.
 */
export interface WorthALook {
  /** The Estonian, a form or a phrase, exactly as the dictionary holds it. */
  et: string;
  /** What it means, or which form it is, in the learner's language. */
  note: string;
  /** The headword to open in the dictionary, where `et` is a form of one. */
  lemma?: string;
}

/** How many of the misses the list shows, so a bad round is not a wall. */
const SHOWN = 6;

/**
 * THE SCREEN A ROUND ENDS ON, DRAWN ONCE.
 *
 * Rounds ended two ways. Half drew a night panel with the mascot, three tiles
 * and the way on centred under them, primary last; the other half a bare
 * heading, a box of plain figures and two buttons on the left, "Another
 * round" quiet and "Back to Today" loud. A learner moving from Match to Verb
 * government met two apps saying the same thing, and the half with "Back to
 * Today" in the accent steered somebody who had just finished a drill away
 * from the second go that does the most good.
 *
 * It also says what to look at. A round knew every answer that went wrong and
 * its last screen kept that to itself, at the one moment a learner is
 * looking: "Worth another look" lists them with what each is, every word a
 * door to its entry. Nothing is graded from here; the round already did that.
 *
 * The tiles are one hue: a share right is a reading about the learner, never
 * a verdict (`scripts/invariants/a-reading-is-not-a-verdict.ts`).
 */
export function RoundDone({ title, line, figures, missed = [], again, also, celebrate = false, children }: {
  title: string;
  /** One sentence under the title, said off how the round went. */
  line?: ReactNode;
  /** Three figures, one row of tiles at every width. */
  figures: readonly [RoundFigure, RoundFigure, RoundFigure];
  /** What did not come out right first time, in the order it was asked. */
  missed?: readonly WorthALook[];
  /** The primary button's words, already translated: "Another round" when absent, no button when null. */
  again?: string | null;
  /** A second way on that belongs to this round, drawn quiet before the primary, its label translated. */
  also?: { href: string; label: string };
  /** Confetti, for a round worth a little fuss. */
  celebrate?: boolean;
  /** Anything a round adds under the figures, before the list. */
  children?: ReactNode;
}) {
  const t = useT();
  /* Once each: a word missed on two rungs, or a sentence built wrong twice,
     is one thing to look at. */
  const once = [...new Map(missed.map((m) => [`${m.et}\u0000${m.note}`, m])).values()];
  const shown = once.slice(0, SHOWN);
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:px-10 md:py-16" data-round-done="">
      {celebrate && <Confetti count={40} />}
      <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
        <Mascot size={68} mood="cheer" className="float mx-auto" />
        <h1
          className="font-display mt-5 text-2xl font-bold leading-tight tracking-tight md:text-3xl"
          style={{ color: "var(--ink)", textWrap: "balance" }}
        >
          {title}
        </h1>
        {line && (
          <p className="mx-auto mt-2 max-w-[44ch] text-base" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>
            {line}
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        {figures.map((f) => (
          <StatTile key={f.label} value={f.value} label={f.label} tone="accent" />
        ))}
      </div>

      {children}

      {shown.length > 0 && (
        <section aria-labelledby="round-done-look" className="mt-6" data-worth-a-look="">
          <h2 id="round-done-look" className="label-xs" style={{ color: "var(--ink-3)" }}>
            {t("Worth another look")}
          </h2>
          <ul
            className="mt-2 divide-y rounded-[var(--r-lg)] border"
            style={{ borderColor: "var(--rule-soft)", background: "var(--surface)" }}
          >
            {shown.map((m, i) => (
              <li
                key={`${m.et}-${i}`}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderColor: "var(--rule-soft)" }}
              >
                <span className="min-w-0 flex-1">
                  <WordLink
                    lemma={m.lemma ?? m.et}
                    className="block text-md font-semibold"
                    linkClass="underline-offset-4 hover:underline"
                    style={{ color: "var(--ink)" }}
                  >
                    {m.et}
                  </WordLink>
                  <span className="block text-sm" style={{ color: "var(--ink-2)" }}>{m.note}</span>
                </span>
                <Speak text={m.et} label={fill(t("Hear {word}"), { word: m.et })} />
              </li>
            ))}
          </ul>
          {once.length > shown.length && (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
              {fill(t("And {n} more."), { n: once.length - shown.length })}
            </p>
          )}
        </section>
      )}

      {/* A column on a phone, primary on top where a thumb starts; a row
          from `sm`, primary last where a reading eye ends. Source order is
          the row's, so the column is reversed rather than reordered. */}
      <WayOut className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <ButtonLink href="/" size="lg">{t("Back to Today")}</ButtonLink>
        {also && <ButtonLink href={also.href} size="lg">{also.label}</ButtonLink>}
        {again !== null && <AnotherRound variant="primary" size="lg">{again ?? t("Another round")}</AnotherRound>}
      </WayOut>
    </div>
  );
}
