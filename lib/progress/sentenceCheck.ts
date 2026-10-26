import { prisma } from "@/lib/db";
import { coldBudget, isExactForm, lemmasOfForm } from "@/lib/dict/forms";
import { VOUCHED_ROW } from "@/lib/dict/search";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { COLD_SHARDS_PER_REQUEST } from "@/lib/progress/speechForms";
import { ALWAYS_READ, checkSentence, type CheckEntry, type SentenceCheck } from "@/lib/course/lessons/sentenceCheck";

/** Distinct words read from the sentence and the sample together; a typed answer holds far fewer. */
const MAX_WORDS = 40;

/** Headwords taken per spelling. A spelling claimed by more is a common short word, and the first few are enough. */
const HEADWORDS_PER_WORD = 6;

/**
 * The dictionary a typed sentence is checked against, read for that sentence.
 *
 * `lib/course/lessons/sentenceCheck.ts` is the judgment and is pure; this is
 * the read. Every spelling in the sentence and in the sample is asked of the
 * forms list, which answers two things: whether it is a spelling of any
 * Estonian word at all (`isExactForm`), and which headwords it belongs to,
 * folded, so `aitah` brings `aitäh` along to be offered. Those headwords and
 * the few every check needs are then read from the dictionary in one query,
 * and only rows the dictionary vouches for (`VOUCHED_ROW`): a word somebody
 * typed in, or one Anu suggested, never decides what a learner is told is
 * right (ADR-005).
 *
 * The forms list is the accept side only. Nothing it holds is offered to the
 * learner as a form; every form a finding prints comes off a dictionary row.
 */
export async function checkTypedSentence(text: string, sample: string): Promise<SentenceCheck> {
  const spellings = [...new Set([text, sample].flatMap((t) => (t.match(ESTONIAN_WORD) ?? []).map((w) => w.toLowerCase())))]
    .slice(0, MAX_WORDS);
  const budget = coldBudget(COLD_SHARDS_PER_REQUEST);
  const read = await Promise.all(spellings.map(async (word) => ({
    word,
    exact: await isExactForm(word, budget),
    headwords: (await lemmasOfForm(word, budget)).slice(0, HEADWORDS_PER_WORD),
  })));
  const exact = new Set(read.filter((r) => r.exact).map((r) => r.word));

  /*
    A headword is asked for as written and with a capital, because a phrase
    the course teaches whole is stored as it is said (`Palun`), and `palun`
    has to be read as that phrase rather than as "I ask".
  */
  const lemmas = new Set<string>([...ALWAYS_READ, ...read.flatMap((r) => [r.word, ...r.headwords])]);
  const asked = [...lemmas].flatMap((l) => [l, l.charAt(0).toLocaleUpperCase("et") + l.slice(1)]);
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: asked }, ...VOUCHED_ROW },
    select: {
      lemma: true, pos: true, cefr: true, government: true, semanticTypes: true,
      forms: { select: { formType: true, value: true } },
    },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });

  const entries: CheckEntry[] = rows.map((row) => {
    const parts: Record<string, string> = {};
    const extraForms: { code: string; value: string }[] = [];
    for (const form of row.forms) {
      if (form.formType.startsWith("EKILEX:")) extraForms.push({ code: form.formType.slice("EKILEX:".length), value: form.value });
      else if (!parts[form.formType]) parts[form.formType] = form.value;
    }
    return {
      lemma: row.lemma, pos: row.pos, cefr: row.cefr, parts, extraForms, usages: [],
      government: row.government, semanticTypes: row.semanticTypes,
    };
  });

  return checkSentence(text, entries, (word) => exact.has(word), sample);
}
