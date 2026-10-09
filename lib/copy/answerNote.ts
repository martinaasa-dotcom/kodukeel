import { fill, tr, type Locale } from "./locale";

/**
 * A marked answer's note, in the reader's language.
 *
 * `checkAnswer` (lib/estonian/answer.ts) and the flash round's `markFlash`
 * (lib/games/flash.ts) write their notes in English, and a
 * dozen screens, the examination and the level check among them, read that
 * note as it is. So the rounds read it through this rather than the marker
 * growing a language parameter every caller would have to thread: the note is
 * one of a handful of fixed sentences with a form or two in it, so it is recognised
 * here and said again from the table, keyed on the English template.
 *
 * Nothing Estonian is written. The form in a note is the dictionary's, carried
 * across as it is; the dropped letters are the sentence's own.
 */
export function answerNote(note: string, locale: Locale): string {
  if (locale === "en" || !note) return note;

  const fixed = [
    "Nothing typed.",
    "Almost. Check the letters with dots and tildes.",
    "Right form. Now build a whole sentence around it.",
  ];
  if (fixed.includes(note)) return tr(locale, note);

  const almost = /^Almost, it's (.+)\.$/.exec(note);
  if (almost) {
    // "õ, not o and ä, not a": the letters are the sentence's, only "not" and "and" are ours.
    const letters = almost[1]!.split(" and ").map((pair) => {
      const [right, wrong] = pair.split(", not ");
      return wrong === undefined ? pair : fill(tr(locale, "{right}, not {wrong}"), { right: right!, wrong });
    });
    return fill(tr(locale, "Almost, it's {letters}."), { letters: letters.join(` ${tr(locale, "and")} `) });
  }

  const templates: readonly [RegExp, string][] = [
    [/^That's another form of the word\. This one wanted “(.+)”\.?$/, "That's another form of the word. This one wanted {form}."],
    [/^Right word, in another form\. This one wanted “(.+)”\.?$/, "Right word, in another form. This one wanted {form}."],
    [/^So close\. The word is “(.+)”\.?$/, "So close. The word is {form}."],
    [/^Not quite, it's “(.+)”\.?$/, "Not quite, it's {form}."],
  ];
  // The flash round's own notes (lib/games/flash.ts), naming the form that was written.
  const wrote = /^You wrote (.+), which is the (.+)\. This one wants the (.+)\.$/.exec(note);
  if (wrote) {
    return fill(tr(locale, "You wrote {form}, which is the {got}. This one wants the {wanted}."), {
      form: wrote[1]!, got: wrote[2]!, wanted: wrote[3]!,
    });
  }
  const other = /^That's the (.+)\. This one wants the (.+)\.$/.exec(note);
  if (other) return fill(tr(locale, "That's the {got}. This one wants the {wanted}."), { got: other[1]!, wanted: other[2]! });
  const missing = /^We can't find (.+) anywhere in your sentence\.$/.exec(note);
  if (missing) return fill(tr(locale, "We can't find {word} anywhere in your sentence."), { word: missing[1]! });
  for (const [pattern, template] of templates) {
    const hit = pattern.exec(note);
    if (hit) return fill(tr(locale, template), { form: hit[1]! });
  }
  return note;
}
