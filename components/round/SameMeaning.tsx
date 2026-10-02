"use client";

import { EstonianSentence } from "@/components/EstonianSentence";
import { VERDICT_CLASS } from "@/lib/ux/verdict";

/** One side of the contrast, as the review page assembles it out of the dictionary. */
export interface SameMeaningWord {
  lexemeId: string | null;
  lemma: string;
  gloss: string;
  sentence: { et: string; en: string | null; form: string | null } | null;
}

/**
 * "YES, THAT WORKS", AND THEN HOW THE TWO WORDS DIFFER.
 *
 * Drawn where a production card would have said "Not quite": the learner typed
 * a real word that means what the prompt says, so the verdict is a right one
 * and the rest of the panel is a short lesson rather than a correction. Every
 * word of Estonian on it came out of the dictionary: the two glosses, which is
 * where the course writes the difference ("(something)" against "(doing)"),
 * and a recorded sentence of each. The English around them is the only thing
 * written here (ADR-005, and `lib/questions/neighbours.ts` for the rule).
 *
 * Their word goes first, because it is theirs and it was right; the card's
 * own word second, as the one this card is teaching.
 */
export function SameMeaning({
  typed, own, canTranslate,
}: {
  typed: SameMeaningWord;
  own: SameMeaningWord;
  canTranslate: boolean;
}) {
  return (
    <div className="w-full text-left" data-same-meaning>
      <p className={`pop-in ${VERDICT_CLASS.right} verdict-panel`} role="status">
        Yes, <span lang="et" className="font-semibold">{typed.lemma}</span> works. It means that too.
      </p>
      <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
        This card was after <span lang="et" className="font-semibold">{own.lemma}</span>. Both are fine,
        and here is how they differ:
      </p>
      <ul className="mt-3 grid gap-3">
        {[typed, own].map((word) => (
          <li
            key={word.lemma}
            className="rounded-[var(--r)] border px-4 py-3"
            style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
          >
            <p className="text-md">
              <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>{word.lemma}</span>
              <span style={{ color: "var(--ink-2)" }}>: {word.gloss}</span>
            </p>
            {word.sentence && (
              <div className="mt-2 text-sm">
                <EstonianSentence
                  et={word.sentence.et}
                  en={word.sentence.en}
                  form={word.sentence.form}
                  lexemeId={word.lexemeId}
                  canTranslate={canTranslate}
                  ask="never"
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
