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

/** Headwords read per spelling that owns it exactly, the homographs a rule must see before it corrects anything. */
const OWNERS_PER_WORD = 10;

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
  return (await checkTypedSentences([text], sample, MAX_WORDS))[0]!;
}

/** Distinct words read for a written text and its model; the learner's own are always read, and the model fills what is left. */
const MAX_TEXT_WORDS = 220;

/** The most headwords one reading asks the dictionary for, each asked twice (as written and with a capital). */
const MAX_LEMMAS = 1_500;

/**
 * SEVERAL SENTENCES OF ONE TEXT, READ IN ONE PASS.
 *
 * A writing step reads a draft of up to two dozen sentences, and each read on
 * its own asked the forms list and the dictionary for the model text again
 * and ran its own queries: two dozen at once on a pooled connection is the
 * press that stalls everybody else's page. The spellings of every sentence and
 * of the sample are gathered and read once, and each sentence is judged
 * against that one read, which is the same judgment (`checkSentence`) with the
 * same rows in hand.
 */
export async function checkTypedSentences(texts: readonly string[], sample: string, cap = MAX_TEXT_WORDS): Promise<SentenceCheck[]> {
  if (texts.length === 0) return [];
  /*
    The sentences' own words first, so the cap never drops a word somebody
    wrote for one the model holds; and a clitic `-gi` or `-ki` is read off
    the word under it, so that word is asked straight after its own, where
    the cap cannot reach it before the model's words.
  */
  const spellingsOf = (ts: readonly string[]) => [...new Set(ts
    .flatMap((t) => (t.match(ESTONIAN_WORD) ?? []).map((w) => w.toLowerCase()))
    .flatMap((w) => (/[gk]i$/.test(w) && w.length > 4 ? [w, w.slice(0, -2)] : [w])))];
  // Every word the learner wrote is read, since an unread one comes back as a slip they cannot tick past; the cap is on the model's.
  const own = spellingsOf(texts);
  const held = new Set(own);
  const spellings = [...own, ...spellingsOf([sample]).filter((w) => !held.has(w)).slice(0, Math.max(0, cap - own.length))];
  /*
    A cold instance reads a bounded number of shards per request, and that
    bound was set for one sentence of up to MAX_WORDS words. A whole draft
    shared one sentence's budget, so most of its words went unread and a
    correct sentence came back with findings it could not be ticked past.
    The budget grows with the words asked, at the rate one sentence has.
  */
  const shards = COLD_SHARDS_PER_REQUEST * Math.max(1, Math.ceil(spellings.length / MAX_WORDS));
  const budget = coldBudget(shards);
  const compoundBudget = coldBudget(shards);
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
  /*
    The band of every headword one slip away, so a tie between two spellings
    goes to the word a learner meets first. One light query, and it orders
    which of them are read in full, so the likely word is never sliced off.
  */
  const nearLemmas = [...new Set(around.flat().flatMap((n) => n.lemmas))];
  const banded = nearLemmas.length === 0 ? [] : await prisma.lexeme.findMany({
    where: { lemma: { in: [...nearLemmas, ...nearLemmas.map((l) => l.charAt(0).toLocaleUpperCase("et") + l.slice(1))] }, ...VOUCHED_ROW },
    select: { lemma: true, cefr: true },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  // Every headword asked reads null until a row says otherwise; a row under a capital answers for the lower-case headword.
  const bands = new Map<string, string | null>(nearLemmas.map((l) => [l, null]));
  const rank = (b: string | null | undefined) => (b ? ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(b) : 9);
  for (const row of banded) {
    const key = bands.has(row.lemma) ? row.lemma : row.lemma.toLowerCase();
    if (bands.has(key) && rank(row.cefr) < rank(bands.get(key))) bands.set(key, row.cefr);
  }
  const near = around.map((spellings) => [...new Set(spellings.flatMap((n) => n.lemmas))]
    .sort((a, b) => rank(bands.get(a)) - rank(bands.get(b))).slice(0, HEADWORDS_NEAR));
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
  // Every headword that owns a spelling exactly is read too, so a homograph the check must not correct is in hand.
  /*
    BOUNDED, IN THE ORDER THE JUDGMENT NEEDS THEM. A long draft is a few
    hundred distinct words and each brings its headwords, the owners of its
    spelling and the words a slip away, so the set grew without a ceiling into
    a query of thousands of parameters, twice a draft. What every word needs
    goes first (the spelling and its own headwords), then the homographs, then
    the suggestions, and the cap only ever drops from the end: a short text is
    read exactly as before.
  */
  const lemmas = new Set<string>(ALWAYS_READ);
  const take = (more: readonly string[]) => { for (const l of more) if (lemmas.size < MAX_LEMMAS) lemmas.add(l); };
  take(read.flatMap((r) => [r.word, ...r.headwords]));
  take(read.flatMap((r) => r.owners.slice(0, OWNERS_PER_WORD)));
  take(near.flat());
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

  return texts.map((text) => checkSentence(text, entries, (word) => exact.has(word), sample, {
    claims: (word) => claims.get(word),
    compound: (word) => compound.has(word),
    near: (word) => nearBy.get(word),
    band: (lemma) => bands.get(lemma),
  }));
}
