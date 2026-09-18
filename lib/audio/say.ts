/**
 * WHAT THIS APP ASKS THE SPEECH SERVICE TO READ, WHICH IS NOT QUITE THE STRING
 * ON THE CARD.
 *
 * A learner reported that single words "sound off, like the word is
 * incomplete", and named one: `õde` in a deep voice, heard as "öd". The speed
 * was the suspect and the speed is not the cause. Measured through the app's
 * own pipeline, twelve words in four voices transcribed by a recognizer at
 * five rates, the same words come back right at the recording's own pace as at
 * 0.6 and 0.5 of it: 19, 22, 19, 20 and 20 of 48 at 1, 0.85, 0.72, 0.6 and
 * 0.5. Whatever is wrong with `õde` is wrong before a single sample has been
 * stretched. The stretch only gives a learner longer to hear it.
 *
 * WHAT IS WRONG IS THE STRING, AND IT IS THE FULL STOP. TartuNLP reads
 * sentences: its front end works out where an utterance ends and gives it the
 * shape of something finished. A bare token with no stop on it is not a
 * finished utterance, and the model renders it as a fragment. Measured over
 * twenty words in six voices, against the same word sent with a full stop: the
 * speech is 1.14 times as long with the stop and the loud body of the word
 * itself 1.13 times as long, over five percent longer on 64 of 120. A word
 * `isa` that came back in 271 ms comes back in 561; `pea` in 321 ms comes back
 * in 762. That is the "incomplete" in the report, and it is the whole of what
 * this module does.
 *
 * AND A LISTENER AGREES, WHICH IS THE HALF THAT SETTLED IT. A length is not a
 * verdict: a longer word could be a worse one. So both clips were put to the
 * stronger of the two recognizers this project has measured, twenty words in
 * four voices, at the recording's own pace, and the bare word came back right
 * 41 times in 80 against the finished word's 61. `öö` in a deep voice was
 * heard as "e", `töö` as "dõ", `raamat` as "draama" and `koer` as "koe", every
 * one of them a word cut short, and every one of them gone with the stop.
 * `npm run measure:speech` is the instrument, and `--hear` is that second
 * half. Read the list it prints rather than the mean.
 *
 * A CAPITAL AT THE FRONT DOES NOTHING AND IS THEREFORE NOT DONE. It was the
 * obvious other half and it was measured first: over the same 120 word and
 * voice pairs, `Õde` is byte-for-byte the length of `õde`, on every one of
 * them, and the vowel it produces is no further from the vowel of `öde` than
 * the bare word's is (0.897 against 0.906 over six words in eight voices,
 * which is a coin toss). A change that measures as nothing is a change nobody
 * can later tell the reason for, so only the stop is made.
 *
 * ADR-005 IS UNTOUCHED, BECAUSE A STOP IS NOT A FORM. Nothing here changes a
 * letter of anybody's Estonian: it appends one punctuation mark, the result
 * reaches the speech service and nothing else, and it is never stored, never
 * shown, never a card answer and never a form the dictionary vouches for. An
 * invariant holds it to adding that one character and holds the route to
 * asking through it.
 *
 * Pure. A string in, a string out.
 */

/**
 * What already ends an utterance.
 *
 * A question keeps its question mark and `Aitäh!` keeps its exclamation,
 * because what is being added is the *end of a sentence* rather than a full
 * stop in particular, and putting a stop after a question mark would be
 * writing a sentence nobody writes.
 */
const ENDS_A_SENTENCE = /[.!?\u2026]$/u;

/**
 * A MARK THAT CANNOT FINISH AN UTTERANCE IS TAKEN OFF, NOT WRITTEN AFTER.
 *
 * Appending to whatever arrived was the first version of this and it was wrong
 * at both ends of one rule. A text ending in a comma came out as `Tere,.`,
 * which is not punctuation anybody writes and is text this app hands to
 * somebody else's service; the cloze round speaks a passage the learner pasted
 * in themselves, so a trailing comma is an ordinary Monday rather than a
 * hypothetical. And a colon and a semicolon were on the list of marks that
 * already finish a sentence, on the reasoning that the model then has
 * somewhere to stop. It does not: `Ta ütles:` is the definition of a fragment,
 * which is the one thing this module exists to stop sending, so calling it
 * finished left the fault standing on the shape that has it worst. Both are
 * the same repair, which is to take the mark off and finish the text properly.
 *
 * Written as escapes rather than as the characters themselves, which is
 * `DASH_SEPARATED`'s rule one directory over: an en dash and an em dash are
 * banned on sight in this repository's copy, so a rule that has to *read* one
 * names it rather than printing it.
 */
const CANNOT_FINISH = /[\s,;:\u2010-\u2015-]+$/u;

/**
 * A closing quote or bracket sits *after* the punctuation, so `(vt ka.)` has
 * ended and `raamat"` has not.
 *
 * ESTONIAN CLOSES A QUOTATION WITH U+201C, THE GLYPH ENGLISH OPENS WITH.
 * Estonian writes `„nii“`, so the mark this has to read past at the end of a
 * quoted sentence is the one an English keyboard calls an opening quote, and
 * the first version of this list carried only the English closing one. It put
 * a stop after a sentence that had already ended: `Ta ütles: „Tere.“` came out
 * as `Ta ütles: „Tere.“.` One string in the 18,262 the shipped dictionary can
 * be asked to speak ends that way today, which is the wrong reason to leave it:
 * `docs/20-contributed-sentences.md` is a channel for sentences a native
 * speaker writes, and a native speaker writes `„...“`.
 */
const TRAILING_MARKS = /[\u00bb\u201c\u201d\u2019"')\]]+$/u;

/**
 * The text as the speech service should receive it: finished, so it is read as
 * something said rather than as a fragment.
 *
 * Deliberately narrow. Text that already ends like a sentence comes back
 * unchanged, which is most of what this app speaks aloud, since an attested
 * Ekilex sentence carries its own punctuation and `Tere hommikust!` carries
 * its own. What it is for is the other half: six thousand dictionary headwords
 * and every form of them, each of which reaches the service as one bare token.
 *
 * It moves punctuation and never a letter, which `say.test.ts` asserts over
 * every shape it is given rather than trusting the reading of these two
 * expressions.
 */
export function spokenText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const finished = trimmed.replace(CANNOT_FINISH, "");
  // Nothing but punctuation is left exactly as it came: there is no utterance
  // to finish, and the route has already refused an empty string above this.
  if (!finished) return trimmed;
  return ENDS_A_SENTENCE.test(finished.replace(TRAILING_MARKS, "")) ? finished : `${finished}.`;
}
