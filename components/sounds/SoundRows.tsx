"use client";

import { ArrowRight } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { LessonText } from "@/components/course/LessonText";
import { useLocale, useT } from "@/components/Locale";
import type { SoundRow } from "@/lib/course/lessons";
import { NativeWord, SoundKey } from "./Native";

/** The four letters an English keyboard has no key for, which are taught as a set. */
const OWN_LETTERS = /^[õäöü]$/u;

/**
 * THE SOUNDS AN EVENING IS ABOUT, AS THINGS TO PRESS (lib/course/lessons/types.ts).
 *
 * This was a table: a letter, a sentence about what it sounds like, and a
 * word it is in, all three silent, on the one screen of the course whose
 * subject is how Estonian sounds. Each sound is now a key that plays the
 * native speaker saying it alone, and a word that plays them saying it in use,
 * with the sound marked and the meaning under it.
 *
 * õ, ä, ö and ü are drawn as one set of four tiles, because they are learned
 * together: four letters of their own, not marks on other letters, and a
 * learner who meets two of them on the first evening and the other two a month
 * later has been taught that Estonian has two odd vowels. Anything else an
 * evening is about (a long mm, a final h) follows as ordinary rows.
 */
export function SoundRows({ rows }: { rows: readonly SoundRow[] }) {
  const t = useT();
  const locale = useLocale();
  const letters = rows.filter((r) => OWN_LETTERS.test(r.glyph));
  const others = rows.filter((r) => !OWN_LETTERS.test(r.glyph));
  return (
    <section aria-labelledby="lesson-sounds" className="flex flex-col gap-5" data-lesson-sounds>
      <h3 id="lesson-sounds" className="sr-only">{t("The sounds")}</h3>
      {letters.length > 0 && (
        <div className="flex flex-col gap-3" data-sound-letters>
          <div>
            <p className="font-display text-lg font-bold" style={{ color: "var(--ink)" }}>{t("Four letters English doesn't have")}</p>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Each is a letter with a sound of its own, not a mark on another letter.")}</p>
          </div>
          <Tiles rows={letters} />
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-3">
          {letters.length > 0 && <p className="font-display text-lg font-bold" style={{ color: "var(--ink)" }}>{t("Listen for these too")}</p>}
          <Tiles rows={others} />
        </div>
      )}
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Press a letter to hear it on its own, and a word to hear it in use. A native speaker says every one.")}{" "}
        <Link href="/grammar/sounds" className="inline-flex items-center gap-1 font-semibold underline" style={{ color: "var(--accent-deep)" }}>
          {t("Every sound of Estonian")} <ArrowRight size={13} aria-hidden />
        </Link>
      </p>
    </section>
  );
}

/** A sound as a tile: the key, what to do with your mouth, and a word that carries it. */
function Tiles({ rows }: { rows: readonly SoundRow[] }) {
  const locale = useLocale();
  return (
    <div className="snd-letters-room">
      <ul className="snd-letters">
        {rows.map((row) => (
          <li key={row.sound + row.word} className="snd-letter">
            <SoundKey clip={row.sound} glyph={row.glyph} size="lg" />
            <span className="text-sm" style={{ color: "var(--ink-2)", textWrap: "balance" }}><LessonText text={row.like} locale={locale} /></span>
            <NativeWord clip={row.word} mark={row.mark} en={row.en} />
          </li>
        ))}
      </ul>
    </div>
  );
}
