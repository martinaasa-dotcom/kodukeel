import { readFileSync } from "node:fs";
import path from "node:path";
import { fold } from "../../lib/estonian/fold";
import { possibleStems } from "../../lib/dict/search";
import { possibleFirstPersons } from "../../lib/estonian/conjugate";
import { glossAnswers, glossWords, MAX_QUESTION_WORDS, questionWords, type WordFacts } from "../../lib/tutor/words";
import { HARVESTED } from "../../prisma/data/harvested";

/**
 * The words in a question, as the shipped dictionary holds them.
 *
 * `lib/progress/tutorWords.ts` does this against the deployment's database;
 * a harness has none, so it reads the course harvest and
 * `prisma/data/expanded.json`, which is what the seed loads, the harvest
 * first because the seed writes it first and the expansion never overwrites, and resolves a token the way `candidatesFor` and
 * `matchEstonianForm` do between them: an exact lemma, a stored form, a
 * regular case on a genitive stem, or a person on a stored first person,
 * diacritics folded. The block it builds goes through `wordsNote` exactly
 * as the route's does, so what the harness measures is the block the app
 * sends, over the dictionary the app ships.
 */
interface Entry {
  lemma: string; pos: string; translation: string; government: string | null; gradationNote: string | null;
  forms: { formType: string; value: string }[];
}

let index: { byForm: Map<string, Entry[]>; byStem: Map<string, Entry[]>; byFirst: Map<string, Entry[]>; entries: Entry[] } | null = null;

function load() {
  if (index) return index;
  const file = path.join(process.cwd(), "prisma", "data", "expanded.json");
  const harvest: Entry[] = HARVESTED.map((w) => ({
    lemma: w.lemma, pos: w.pos, translation: w.gloss, government: w.government, gradationNote: null,
    forms: [
      ...Object.entries(w.parts).map(([formType, value]) => ({ formType, value })),
      ...w.extraForms.map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value })),
    ],
  }));
  const entries = [...harvest, ...(JSON.parse(readFileSync(file, "utf8")) as Entry[])];
  const byForm = new Map<string, Entry[]>();
  const byStem = new Map<string, Entry[]>();
  const byFirst = new Map<string, Entry[]>();
  const put = (map: Map<string, Entry[]>, key: string, e: Entry) => {
    const k = fold(key.toLowerCase());
    const list = map.get(k);
    if (list) { if (!list.includes(e)) list.push(e); } else map.set(k, [e]);
  };
  for (const e of entries) {
    put(byForm, e.lemma, e);
    for (const f of e.forms) {
      put(byForm, f.value, e);
      if (f.formType === "GEN_SG" || f.formType === "GEN_PL") put(byStem, f.value, e);
      if (f.formType === "PRES_1SG") put(byFirst, f.value, e);
    }
  }
  index = { byForm, byStem, byFirst, entries };
  return index;
}

function resolve(token: string): Entry | null {
  const { byForm, byStem, byFirst } = load();
  const folded = fold(token.toLowerCase());
  const exact = byForm.get(folded);
  if (exact?.length) return exact[0]!;
  for (const stem of possibleStems(folded)) {
    const hit = byStem.get(stem);
    if (hit?.length) return hit[0]!;
  }
  for (const first of possibleFirstPersons(folded)) {
    const hit = byFirst.get(first);
    if (hit?.length) return hit[0]!;
  }
  return null;
}

/** The same shape `wordsInQuestion` returns, off the shipped file. */
export function shippedWordsInQuestion(messages: readonly { role: string; content: string }[]): WordFacts[] {
  const out: WordFacts[] = [];
  const tokens = questionWords(messages);
  for (const token of tokens) {
    const e = resolve(token);
    if (!e) continue;
    const have = out.find((w) => w.lemma === e.lemma && w.pos === e.pos);
    if (have) { have.asked!.push(token); continue; }
    if (out.length >= MAX_QUESTION_WORDS) break;
    out.push({ lemma: e.lemma, pos: e.pos, translation: e.translation, government: e.government, gradationNote: e.gradationNote, forms: e.forms, asked: [token] });
  }
  // The same gloss resolution `wordsInQuestion` makes, graded entries first.
  const { entries } = load();
  for (const word of glossWords(tokens, out)) {
    const e = entries.find((one) => one.translation && glossAnswers(one.translation, word));
    if (!e || out.some((w) => w.lemma === e.lemma && w.pos === e.pos)) continue;
    out.push({ lemma: e.lemma, pos: e.pos, translation: e.translation, government: e.government, gradationNote: e.gradationNote, forms: e.forms, asked: [] });
  }
  return out;
}
