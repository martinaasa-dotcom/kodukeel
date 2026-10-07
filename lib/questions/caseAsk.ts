import { PARTS } from "@/lib/copy/values";
import { CASES } from "@/lib/estonian/cases";
import { caseFits, isLocalCase } from "@/lib/estonian/caseQuestion";
import { caseReading } from "@/lib/estonian/caseReading";
import { caseAnswer, shownForms, stemsFrom } from "@/lib/estonian/derive";
import { kindStated } from "@/lib/estonian/semantics";
import { sayLine } from "@/lib/estonian/sayIt";
import type { CaseKey } from "@/lib/estonian/types";

/**
 * ONE WORD, ONE CASE THE MODULE HAS READ, ASKED BY WHAT IT MEANS.
 *
 * Today's module deals the case sprint on evenings after a case page, and a
 * module learner's deck holds a word's meaning and its spelling and nothing
 * else: the module adds recognition and production, and the forms are asked
 * in the rounds. So the "Case Sprint" on the evening that read the inessive
 * was forty flips of `telefon` and `telephone` with no ending in it at all.
 * This is the ending, in the shape the cards already lead with: the word and
 * `Say "in the house"`, with `majas` behind the flip.
 *
 * Only where it is honest. A case the module has read and the word takes
 * (`caseFits`), a form the dictionary holds or a rule over its stored stem
 * builds (`caseAnswer`), never one spelled like the word in the question,
 * since that flip cannot be missed, and only where the reading is a phrase
 * somebody would say (`caseReading`): a word with no frame is left a word
 * card rather than asked with a phrase about nothing. The case today's page
 * was about is asked about half the time, where the word can take it.
 *
 * Pure: the dictionary rows and the scope in, an ask or nothing out.
 */

export interface CaseAskWord {
  readonly lemma: string;
  readonly translation: string;
  readonly semanticTypes: string | null;
  readonly forms: readonly { formType: string | null; morphCode: string | null; value: string }[];
}

export interface CaseAsk {
  readonly caseKey: CaseKey;
  /** `Say "in the house"`, the English line under the word. */
  readonly ask: string;
  /** Every spelling that counts as right, joined the way a card's back is. */
  readonly answer: string;
}

export function caseAskFor(
  word: CaseAskWord,
  read: readonly string[],
  tonight: string | null,
  share: number,
  random: () => number = Math.random,
): CaseAsk | null {
  const stems = stemsFrom(word.forms);
  const subject = { lemma: word.lemma, semanticTypes: word.semanticTypes, nomSg: stems.nomSg ?? null };
  const spelt = word.lemma.trim().toLocaleLowerCase("et");
  /*
    A PLACE CASE ONLY FOR A WORD THE DICTIONARY SAYS IS A BEING OR A THING.
    `caseFits` reads silence as the inside trio, which is the right default
    for a builder and is spelled out in English here: `tuttav` is taught as
    "acquaintance" and carries the Institute's code for its adjective sense,
    "familiar", so the inside trio came through and the ask was "in the
    acquaintance". A word left unclassified, or classified only as a property,
    is asked the cases that do not depend on what kind of thing it is.
  */
  const kindKnown = kindStated(word.semanticTypes);
  const open: CaseAsk[] = [];
  for (const spec of CASES) {
    if (spec.principal || !read.includes(spec.key)) continue;
    if (!caseFits(spec.key, subject)) continue;
    if (!kindKnown && isLocalCase(spec.key)) continue;
    const answer = caseAnswer(stems, spec.key);
    if (!answer) continue;
    const spellings = shownForms({ singular: answer.value, alsoRight: answer.alsoRight });
    if (spellings.some((s) => s.trim().toLocaleLowerCase("et") === spelt)) continue;
    if (!caseReading(spec.key, word.translation, subject)) continue;
    const ask = sayLine(spec.key, word.translation, subject);
    if (!ask) continue;
    open.push({ caseKey: spec.key, ask, answer: spellings.join(PARTS) });
  }
  if (open.length === 0) return null;
  const lead = tonight && random() < share ? open.find((o) => o.caseKey === tonight) : undefined;
  return lead ?? open[Math.floor(random() * open.length)] ?? null;
}
