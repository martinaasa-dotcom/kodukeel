/**
 * The two things a machine may decide about a piece of writing.
 *
 * How long it is, and whether it used the words the task named. That is the
 * whole of what `lib/exam/score.ts` settles about a message or a composition,
 * because nothing else can be settled without a model deciding whether somebody's
 * Estonian is correct, and no model decides a mark here (ADR-022).
 *
 * SPLIT OUT OF THE MARKER SO THE EXAM SCREEN CAN SHOW IT LIVE. The screen ticks
 * each required word off as it is used and fills a length meter as the answer
 * grows, and both have to agree with the marking exactly: a chip that lit up on
 * a rule of its own would be promising a mark the server was not going to give.
 * It lives here rather than being exported from the marker because the sitting
 * screen may not import the marker at all, which is the invariant that stops a
 * client marking its own paper, and one convenience import is exactly how a rule
 * like that gets softened.
 *
 * Pure: no React, no Prisma, no clock, no provider. The two modules it leans
 * on are pure for the same reason, which is what lets the marker and the
 * screen agree on which spellings count without either of them reaching a database.
 */
import { buildCaseTable, stemsFromParts } from "@/lib/estonian/derive";
import { gapForms } from "@/lib/estonian/gapForms";
import { tidyForm } from "@/lib/estonian/whichCase";

/** Splits a written answer the way the marking counts it. */
export function wordsOf(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** A word the task named, with the forms the dictionary holds for it. */
export interface RequiredWord {
  readonly lemma: string;
  readonly pos: string;
  /** Stored principal parts plus anything retrieved from Ekilex. */
  readonly forms: readonly { formType: string; value: string }[];
}

/**
 * Every spelling that counts as this word being used.
 *
 * The lemma, everything the dictionary stores for it, and the forms a rule can
 * build off those: the ten regular cases from the genitive stem for a nominal,
 * and the present, negative, conditional and imperative from the stored first
 * person for a verb (ADR-005 amendment 1). Nothing is written here; every
 * character comes out of the entry or off a suffix the app already derives
 * with everywhere else.
 *
 * THIS IS `gapForms`, AND IT USED TO BE A SECOND ANSWER TO THE SAME QUESTION.
 * It took the same inputs and made the same two calls, and it had already
 * drifted twice. It read `parts.PRES_1SG` where `gapForms` asks `pres1sgFrom`,
 * which also reads the shape a live Ekilex fetch writes (`IndPrSg1`), so a verb
 * enriched from Ekilex with no seeded principal part derived nothing at all
 * and a candidate who wrote `helistab` was marked as not having used
 * `helistama`. And it took each case's shown forms where `gapForms` walks
 * `caseAnswer(...).accepted`, so a spelling the dictionary accepts and does not
 * lead with was refused. Both errors point the same way, at a right answer
 * marked wrong, which is the fault this file's header is about pointed the
 * other way, on a mock state examination.
 *
 * The flattening stays this module's, because what the marker compares is a
 * word out of somebody's prose: `tidyForm` is the same fold `whichCase` reads
 * a spelling through, rather than a fourth copy of it.
 */
export function acceptedUses(word: RequiredWord): Set<string> {
  const out = new Set<string>();
  const add = (spelling: string | null | undefined) => {
    const cleaned = tidyForm(spelling ?? "");
    if (cleaned) out.add(cleaned);
  };
  for (const spelling of gapForms(word).keys()) add(spelling);
  /*
    AND THE PLURAL CASES, WHICH `gapForms` DOES NOT WALK.

    `gapForms` answers what a gap-fill may hide, and it walks the singular:
    the plural obliques are a suffix on the stored genitive plural, so no
    entry stores them and the case table is the only thing that reaches
    them. This function used to add them and the move onto `gapForms`
    dropped them, so a candidate who wrote `raamatutes` was marked as not
    having used `raamat`. That is the fault this module's header is about,
    marking a right answer wrong on a mock state examination, and it is a
    word a candidate is far likelier to write in a paragraph than to meet
    in a gap. A verb has no case table and `gapForms` already carries its
    persons.
  */
  if (word.pos !== "VERB") {
    const parts: Record<string, string> = {};
    for (const form of word.forms) parts[form.formType] = form.value;
    for (const derived of buildCaseTable(stemsFromParts(parts))) add(derived.plural);
  }
  return out;
}

/**
 * Whether a written answer used one of the words it was asked to use.
 *
 * A TRUNCATED LEMMA IS NOT A STEM, AND THIS WAS MARKING A REAL PAPER.
 *
 * The rule was a prefix match on the lemma minus its last letter, floored at
 * three characters, on the argument that Estonian inflects and `raamatust` is
 * `raamat` used. It is, and so was `kirjutan` for `kiri`, `arvan` for `arv`,
 * `aeglane` for `aeg` and `abikaasa` for `abi`. Measured over the shipped
 * dictionary, 1,529 of its 5,363 headwords have a needle that reaches a
 * different headword, so on nearly a third of the words this task can name, a
 * candidate could be credited for a word they never wrote. A mock exam that
 * marks generously tells somebody they are ready for the state examination
 * when they are not, which is the one thing it exists not to do.
 *
 * No prefix rule can tell `kirja` from `kirjutan`, because the difference is
 * not in the first letters. What can is the word's own forms, which the
 * dictionary already holds and the paper now carries, and which is the
 * standard this app applies wherever it decides whether a written word is a
 * word it knows.
 */
export function usesRequiredWord(word: RequiredWord, text: string): boolean {
  const accepted = acceptedUses(word);
  if (accepted.size === 0) return false;

  const written = wordsOf(text).map(tidyForm).filter(Boolean);
  if (written.some((one) => accepted.has(one))) return true;

  /*
    AND A PHRASE IS SEVERAL WORDS, WHICH THIS COULD NOT SEE.

    `tidyForm` strips everything that is not a letter, spaces included, so a
    required word whose lemma is a phrase arrives in `accepted` as one
    spaceless string: `Kas sa räägid inglise keelt?` is stored as
    `kassaräägidinglisekeelt`. The comparison above is against single
    whitespace-delimited tokens, and no token can ever equal that. So a
    candidate told to use a phrase, who then used it perfectly, was credited
    with nothing: the chip never ticked while they wrote, and the server
    marked it unused when they handed in.

    The course teaches twenty of these in its first unit, `Tere hommikust!`,
    `Aitäh!`, `Kuidas läheb?`, `Ma ei saa aru`, and they are `PHRASE` entries
    with no forms, so the whole of what counts as using one is the phrase
    itself. A mock exam that marks a right answer wrong is the fault this
    file's own header is about, pointed the other way.

    Joining consecutive tokens is all it takes, because `tidyForm` has already
    removed the spaces from both sides: the window `kas sa räägid inglise
    keelt` tidies and joins to exactly the string `accepted` holds. Bounded by
    the longest phrase the word actually carries, so an ordinary one-word
    entry does no extra work at all.
  */
  const span = longestSpan(word);
  if (span < 2) return false;
  for (let size = 2; size <= span; size += 1) {
    for (let at = 0; at + size <= written.length; at += 1) {
      if (accepted.has(written.slice(at, at + size).join(""))) return true;
    }
  }
  return false;
}

/** How many words the longest spelling of this entry is written in. */
function longestSpan(word: RequiredWord): number {
  let span = wordsOf(word.lemma).length;
  for (const form of word.forms) span = Math.max(span, wordsOf(form.value).length);
  return span;
}
