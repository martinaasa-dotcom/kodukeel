"use client";

import { ArrowRight } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { LessonText } from "@/components/course/LessonText";
import { useLocale, useT } from "@/components/Locale";
import type { SoundRow } from "@/lib/course/lessons";
import { NativeWord, SoundKey } from "./Native";

/**
 * THE SOUNDS AN EVENING IS ABOUT, AS THINGS TO PRESS (lib/course/lessons/types.ts).
 *
 * This was a table: a letter, a sentence about what it sounds like, and a
 * word it is in, all three silent, on the one screen of the course whose
 * subject is how Estonian sounds. A learner read "an o said with the lips
 * spread" and had to imagine it. Each row is now the sound on a key, which
 * plays the native speaker saying it alone, and the word that carries it,
 * which plays them saying the word with the sound marked in it. The sentence
 * stays, because it is what to do with your mouth, and it is short.
 *
 * And the page that has every sound is one press away, under the last row.
 */
export function SoundRows({ rows }: { rows: readonly SoundRow[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <section aria-labelledby="lesson-sounds" data-lesson-sounds>
      <h3 id="lesson-sounds" className="sr-only">{t("The sounds")}</h3>
      <ul className="snd-rows">
        {rows.map((row) => (
          <li key={row.sound + row.word} className="snd-row">
            <SoundKey clip={row.sound} glyph={row.glyph} size="lg" />
            <span className="snd-row-body">
              <span className="snd-row-like">
                <span className="label-xs" style={{ color: "var(--ink-3)" }}><LessonText text="Sounds a bit like" locale={locale} /></span>
                <span className="text-md" style={{ color: "var(--ink)" }}><LessonText text={row.like} locale={locale} /></span>
              </span>
              <span className="snd-row-as">
                <span className="label-xs" style={{ color: "var(--ink-3)" }}><LessonText text="As in" locale={locale} /></span>
                <NativeWord clip={row.word} mark={row.mark} />
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Press a letter to hear it on its own, and a word to hear it in use. A native speaker says every one.")}{" "}
        <Link href="/grammar/sounds" className="inline-flex items-center gap-1 font-semibold underline" style={{ color: "var(--accent-deep)" }}>
          {t("Every sound of Estonian")} <ArrowRight size={13} aria-hidden />
        </Link>
      </p>
    </section>
  );
}
