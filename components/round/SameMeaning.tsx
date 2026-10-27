"use client";

import { EstonianSentence } from "@/components/EstonianSentence";
import { VERDICT_CLASS } from "@/lib/ux/verdict";
import { useLocale, useT } from "@/components/Locale";

/** One side of the contrast, as the review page assembles it out of the dictionary. */
export interface SameMeaningWord {
  lexemeId: string | null;
  lemma: string;
  gloss: string;
  sentence: { et: string; en: string | null; form: string | null } | null;
  /** Which "you" it uses, where the glosses alone cannot say how the two differ. */
  note: { spelling: string; register: "informal" | "polite" } | null;
}

/** One gloss against another, ignoring case and the closing mark. */
const plain = (gloss: string) => gloss.trim().replace(/[?!.]+$/, "").toLowerCase();

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
  const t = useT();
  const locale = useLocale();
  const [yesBefore, yesAfter] = t("Yes, {word} works too.").split("{word}");
  /*
    "Here is how they differ" is a promise, so it is made only where the panel
    can keep it: the glosses differ, or the words say which "you" each one is.
    Two identical glosses and nothing else to say is said as that, rather than
    printing the same English twice under a sentence promising a difference.
  */
  const explained = plain(typed.gloss) !== plain(own.gloss) || (!!typed.note && !!own.note);
  const [afterBefore, afterAfter] = (explained
    ? t("We were after {word}. Both get you understood, and here is how they differ:")
    : t("We were after {word}. The dictionary gives both the same meaning, so either gets you understood.")
  ).split("{word}");
  const noteLine = (note: NonNullable<SameMeaningWord["note"]>) => {
    const [before, after] = (note.register === "informal"
      ? t("{word} is the “you” for one person you know: a friend, family, a child.")
      : t("{word} is the polite “you”, for a stranger or somebody at a counter, and the one for more than one person.")
    ).split("{word}");
    return <>{before}<span lang="et" className="font-semibold">{note.spelling}</span>{after}</>;
  };
  return (
    <div className="w-full text-left" data-same-meaning lang={locale}>
      <p className={`pop-in ${VERDICT_CLASS.right} verdict-panel`} role="status">
        {yesBefore}<span lang="et" className="font-semibold">{typed.lemma}</span>{yesAfter}
      </p>
      <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
        {afterBefore}<span lang="et" className="font-semibold">{own.lemma}</span>{afterAfter}
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
            {word.note && typed.note && own.note && (
              <p className="mt-1 text-sm" style={{ color: "var(--ink)" }} data-difference={word.note.register}>
                {noteLine(word.note)}
              </p>
            )}
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
