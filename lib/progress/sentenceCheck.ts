import { prisma } from "@/lib/db";
import { coldBudget, couldBeCompound, headwordsOfExactForm, isExactForm, lemmasOfForm, spellingsNear } from "@/lib/dict/forms";
import { VOUCHED_ROW } from "@/lib/dict/search";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { COLD_SHARDS_PER_REQUEST } from "@/lib/progress/speechForms";
import { ALWAYS_READ, checkSentence, type CheckEntry, type SentenceCheck } from "@/lib/course/lessons/sentenceCheck";

/** Distinct words read from the sentence and the sample together; a typed answer holds far fewer. */
const MAX_WORDS = 40;

/** Headwords taken per spelling. A spelling claimed by more is a common short word, and the first few are enough. */
const HEADWORDS_PER_WORD = 6;

/** Headwords read for the words one slip from a spelling that is no word, so the one meant can be offered off its row. */
const HEADWORDS_NEAR = 12;

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
  const said = [...new Set([text, sample].flatMap((t) => (t.match(ESTONIAN_WORD) ?? []).map((w) => w.toLowerCase())))];
  // A clitic `-gi` or `-ki` is read off the word under it, so that word is asked too.
  const spellings = [...new Set([...said, ...said.flatMap((w) => (/[gk]i$/.test(w) && w.length > 4 ? [w.slice(0, -2)] : []))])]
    .slice(0, MAX_WORDS);
  const budget = coldBudget(COLD_SHARDS_PER_REQUEST);
  const compoundBudget = coldBudget(COLD_SHARDS_PER_REQUEST);
  const read = await Promise.all(spellings.map(async (word) => ({
    word,
    exact: await isExactForm(word, budget),
    headwords: (await lemmasOfForm(word, budget)).slice(0, HEADWORDS_PER_WORD),
    // The shard is already held from the line above. Where the budget left it unread the answer is
    // empty, and an empty answer is read below as "not asked" rather than as "no other word".
    owners: await headwordsOfExactForm(word, budget),
  })));
  const exact = new Set(read.filter((r) => r.exact).map((r) => r.word));
  /*
    A spelling that is no word is a slip, and the word meant is one slip
    away: the headwords of the spellings that close are read too, so the
    check can offer the form off their dictionary rows. The forms list only
    says which words to read; it never supplies the form offered.
  */
  const slips = read.filter((r) => !r.exact && !exact.has(r.word.slice(0, -2)));
  const around = await Promise.all(slips.map((r) => spellingsNear(r.word, budget)));
  const near = around.map((spellings) => [...new Set(spellings.flatMap((n) => n.lemmas))].slice(0, HEADWORDS_NEAR));
  const nearBy = new Map(slips.map((r, i) => [r.word, around[i]!] as const));
  // A slip with a word close to it may instead be a compound nobody listed; one the budget could not settle counts as one.
  const compound = new Set<string>();
  await Promise.all(slips.map(async (r, i) => {
    if (near[i]!.length > 0 && (await couldBeCompound(r.word, compoundBudget)) !== false) compound.add(r.word);
  }));
  const claims = new Map(read.flatMap((r) => (r.owners.length > 0 ? [[r.word, r.owners] as const] : [])));

  /*
    A headword is asked for as written and with a capital, because a phrase
    the course teaches whole is stored as it is said (`Palun`), and `palun`
    has to be read as that phrase rather than as "I ask".
  */
  const lemmas = new Set<string>([...ALWAYS_READ, ...read.flatMap((r) => [r.word, ...r.headwords]), ...near.flat()]);
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

  return checkSentence(text, entries, (word) => exact.has(word), sample, {
    claims: (word) => claims.get(word),
    compound: (word) => compound.has(word),
    near: (word) => nearBy.get(word),
  });
}
