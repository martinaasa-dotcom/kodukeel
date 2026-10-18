"use client";

import { useT } from "@/components/Locale";
import { fillNodes } from "@/components/fillNodes";
import type { LineClarity, LineWord } from "@/lib/speech/lightUp";

/**
 * WHAT A WORD WAS HEARD AS, WHERE THAT WAS NOT HOW IT IS SPELLED.
 *
 * The one thing the recognizer hands back that says anything about a sound
 * (`clarityOf` in `lib/speech/lightUp.ts`): a word that lit because it folds
 * to the line's word, `uks` for `üks`, `kus` for `kuus`. It says what was
 * heard, the way the copy rules ask ("we heard kala"), and never that a sound
 * was wrong, because the machine may be the one that misheard; the button
 * beside it plays both voices so the learner can decide. At most three, in
 * line order: a line with more than that has a longer story than a list.
 */
export function HeardAs({ line, clarity }: { readonly line: readonly LineWord[]; readonly clarity: LineClarity }) {
  const t = useT();
  const pairs: { word: string; heard: string }[] = [];
  line.forEach((word, i) => {
    const heard = clarity.heardAs[i];
    if (clarity.clarity[i] === "close" && heard) pairs.push({ word: word.text, heard });
  });
  pairs.splice(3);
  if (pairs.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5 text-sm" style={{ color: "var(--ink-2)" }} data-heard-as>
      {pairs.map((p, i) => (
        <p key={`${i}-${p.word}`}>
          {fillNodes(t("We heard {heard} for {word}."), {
            heard: <span lang="et" className="heard-unsure font-semibold" style={{ color: "var(--ink)" }}>{p.heard}</span>,
            word: <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{bare(p.word)}</span>,
          })}
        </p>
      ))}
    </div>
  );
}

/** The word without the punctuation the line carries round it: "Aitäh!" is said as `Aitäh`. */
function bare(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}
