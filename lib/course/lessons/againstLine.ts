import { caseTable, verbTable, type CheckEntry } from "./sentenceCheck";
import { words } from "@/lib/scenes/lexicon";
import { caseFromMorphCode, numberFromMorphCode } from "@/lib/estonian/morph";
import { fold } from "@/lib/estonian/fold";
import { isNumber, isTime } from "@/lib/estonian/semantics";
import { substitutesFrom } from "@/lib/dict/synonyms";
import type { CaseKey } from "@/lib/estonian/types";

/**
 * DID THE LEARNER SAY WHAT WAS ASKED, READ AGAINST THE LINE RATHER THAN
 * AGAINST THE LANGUAGE.
 *
 * `checkSentence` asks whether a sentence is Estonian: every word a word, every
 * ending one the grammar allows. A learner asked to say "I was cleaning the
 * kitchen" typed `Ma koristan kööki`, which is perfect Estonian for "I clean
 * the kitchen", and the card painted "No mistakes found" in the color of a
 * right answer. A second typed `Ma lugesin raamatu ära` for `läbi`, and nothing
 * said the word was not the one asked for. Both reports were right, and the
 * fault is that nothing compared the sentence with the one the card wanted.
 *
 * So this lines the two up word by word, by the word each spelling belongs to
 * rather than by its letters, and says what differs, in the terms a learner can
 * act on:
 *
 * - FORM. The same word in another form: `koristan` for `koristasin` is the
 *   same verb now rather than in the past, `köögi` for `kööki` is the same
 *   noun as a whole thing done rather than still being worked on. The axes
 *   that differ are named (tense, person, case, number), never the ones that
 *   agree, and the lesson's own English for a form leads where it wrote one.
 * - NEGATION. A no the line does not have, or a line's no left out: the one
 *   extra word that turns a sentence into its opposite.
 * - SWAP. A different word where the line has one, with both meanings.
 * - SYNONYM. A different word the dictionary says means the same: right, and
 *   said so.
 * - MISSING. A word of the line with nothing standing for it, where it is a
 *   word that carries meaning. A dropped subject pronoun is not missing,
 *   since Estonian drops it whenever the verb says who.
 * - PERSON. A pronoun that changes who the sentence is about.
 *
 * WHAT IS THE LEARNER'S OWN IS LEFT ALONE. A card that says "make it true for
 * you" lets a name, a place, a number, a time, a different noun or adjective
 * stand where the line has one; what it does not let go is the verb's tense
 * and person and the small words the lesson teaches, since those are what was
 * asked. A different noun is still read for its case where both spellings
 * name exactly one, since `Ma koristasin toa` for `kööki` keeps the mistake
 * the card exists for.
 *
 * DRAWN TO MISS RATHER THAN TO FIRE, like the checks beside it. A spelling
 * that is two things (`tuba` is the plain form and the 3rd form) names no
 * case; a form the table cannot place names nothing; extra words the learner
 * added are never a fault. A finding here is a fact about two spellings the
 * dictionary holds.
 *
 * NOTHING HERE WRITES ESTONIAN (ADR-005). Every spelling a difference offers
 * is a word of the line, or a form read off a dictionary row the caller handed
 * in. The lemmas named below are requests (the negators, the subject pronouns
 * and the small words a sentence may drop), the shape `DA_ONLY_VERBS` takes.
 *
 * Pure: no React, no Prisma, no network.
 */

export type Person = "Sg1" | "Sg2" | "Sg3" | "Pl1" | "Pl2" | "Pl3";
export type Tense = "now" | "past" | "would" | "not" | "command";

/** What one spelling is, as far as the dictionary settles it. */
export interface SlotRead {
  readonly tense?: Tense;
  readonly person?: Person;
  readonly case?: CaseKey;
  readonly plural?: boolean;
}

export type Axis = "tense" | "person" | "case" | "number";

export type Difference =
  /**
   * The same word in another form. `right` is the line's spelling, or on a
   * story told back the form the dictionary holds for that person, null where
   * it holds none; `meant` the lesson's English for it, where it wrote one.
   */
  | {
      readonly kind: "form"; readonly word: string; readonly right: string | null; readonly lemma: string;
      readonly axes: readonly Axis[]; readonly yours: SlotRead; readonly theirs: SlotRead;
      readonly meant: string | null; readonly yoursMeant: string | null;
    }
  /** `youSaidNo`: the learner's has a no the line does not. `no` is the negator to use or drop. */
  | { readonly kind: "negation"; readonly youSaidNo: boolean; readonly no: string }
  /** A different word. Meanings are the lesson's or the dictionary's first sense, null where neither holds one. */
  | { readonly kind: "swap"; readonly word: string; readonly right: string; readonly meant: string | null; readonly yoursMeant: string | null }
  /** A different word that means the same: right, and said so. */
  | { readonly kind: "synonym"; readonly word: string; readonly right: string }
  /** A word of the line with nothing standing for it. */
  | { readonly kind: "missing"; readonly right: string; readonly meant: string | null }
  /** A different noun, the learner's own detail, in another case. `right` is their noun in the line's case, where the dictionary holds it. */
  | { readonly kind: "case"; readonly word: string; readonly right: string | null; readonly yours: CaseKey; readonly theirs: CaseKey; readonly model: string }
  /** A pronoun that changes who it is about. */
  | { readonly kind: "person"; readonly word: string; readonly right: string; readonly yours: Person; readonly theirs: Person };

export interface AgainstLine {
  readonly differences: readonly Difference[];
  /** Which of the accepted lines it was read against: the model, or one of its alternatives. */
  readonly against: string;
}

/** What the comparison needs to know about the card. */
export interface LineAsk {
  /** The line, and every other way of saying it that counts. The first is the model. */
  readonly lines: readonly string[];
  /** The card asks the learner to make it true for them, so their own details are right. */
  readonly ownDetails: boolean;
  /** The lesson's own English for a spelling, by lowercase spelling: `koristasin` is "I cleaned, I was cleaning". */
  readonly meanings?: ReadonlyMap<string, string>;
  /** Words the lesson teaches, by lowercase spelling, which are never the learner's own detail. */
  readonly taught?: ReadonlySet<string>;
  /**
   * A story told back about somebody else (the retell): the line is in the
   * first person and the retelling in the third, so `ma` stands as `ta` and a
   * first-person verb is read as the third, singular or plural.
   */
  readonly aboutThem?: boolean;
}

/** The English gloss of every entry in hand, by lemma: the dictionary's own, never written here. */
export type Glosses = ReadonlyMap<string, string>;

/* ---------------------------------------------------------------- reading */

interface Reading { readonly lemma: string; readonly pos: string; readonly slot: SlotRead; readonly codes: readonly string[] }

const PERSONS: readonly Person[] = ["Sg1", "Sg2", "Sg3", "Pl1", "Pl2", "Pl3"];

/** A verb code read as tense and person. Null for the forms a sentence's main verb is not. */
function verbSlot(code: string): SlotRead | null {
  const person = PERSONS.find((p) => code.endsWith(p));
  if (code.startsWith("IndPr") && person) return { tense: "now", person };
  if (code.startsWith("IndIpf") && person) return { tense: "past", person };
  if (code.startsWith("KndPr")) return { tense: "would", ...(person ? { person } : {}) };
  if (code === "IndPrPs_" || code === "PtsPtPs") return { tense: "not" };
  if (code.startsWith("ImpPr")) return { tense: "command", ...(person ? { person } : {}) };
  return null;
}

/** Every spelling of every entry in hand, to what it is. */
function indexOf(entries: readonly CheckEntry[]): Map<string, Reading[]> {
  const index = new Map<string, Reading[]>();
  const add = (spelling: string | undefined, reading: Reading) => {
    if (!spelling) return;
    const key = spelling.toLocaleLowerCase("et");
    const list = index.get(key) ?? [];
    if (!list.some((r) => r.lemma === reading.lemma && sameSlot(r.slot, reading.slot))) list.push(reading);
    index.set(key, list);
  };
  for (const entry of entries) {
    if (/\s/.test(entry.lemma)) continue;
    const base = { lemma: entry.lemma.toLocaleLowerCase("et"), pos: entry.pos };
    if (entry.pos === "VERB") {
      for (const [code, value] of verbTable(entry)) {
        const slot = verbSlot(code);
        if (slot) add(value, { ...base, slot, codes: [code] });
      }
      add(entry.lemma, { ...base, slot: {}, codes: ["Sup"] });
      continue;
    }
    const table = caseTable(entry);
    for (const form of table) {
      for (const s of form.accepted) add(s, { ...base, slot: { case: form.spec.key, plural: false }, codes: [] });
      if (form.plural) add(form.plural, { ...base, slot: { case: form.spec.key, plural: true }, codes: [] });
    }
    if (table.length === 0) {
      // A pronoun, or a word with no stem to build from: whatever Ekilex stored, by its own code.
      for (const form of entry.extraForms ?? []) {
        const grammCase = caseFromMorphCode(form.code);
        add(form.value, { ...base, slot: grammCase ? { case: grammCase, plural: numberFromMorphCode(form.code) === "PLURAL" } : {}, codes: [form.code] });
      }
      add(entry.lemma, { ...base, slot: {}, codes: [] });
    }
    add(entry.parts.NOM_SG ?? entry.lemma, { ...base, slot: entry.parts.GEN_SG ? { case: "NOMINATIVE", plural: false } : {}, codes: [] });
  }
  return index;
}

function sameSlot(a: SlotRead, b: SlotRead): boolean {
  return a.tense === b.tense && a.person === b.person && a.case === b.case && (a.plural ?? false) === (b.plural ?? false);
}

/** Every distinct thing a spelling may be, for one lemma. */
function slotsOf(readings: readonly Reading[], lemma: string): SlotRead[] {
  const distinct: SlotRead[] = [];
  for (const r of readings) if (r.lemma === lemma && !distinct.some((d) => sameSlot(d, r.slot))) distinct.push(r.slot);
  return distinct;
}

/** The one thing a spelling is, for one lemma; null where it is more than one thing. */
function onlySlot(readings: readonly Reading[], lemma: string): SlotRead | null {
  const distinct = slotsOf(readings, lemma);
  return distinct.length === 1 ? distinct[0]! : null;
}

/**
 * The cases a word beside a verb is likeliest to be in, first: the object's
 * three, then the rest in the order a course meets them. Only a tie-break,
 * for a spelling that is two cases at once (`kööki` is the 3rd form and the
 * short "into"), once the two spellings are known to share no reading at all.
 */
const CASE_FIRST: readonly CaseKey[] = ["NOMINATIVE", "GENITIVE", "PARTITIVE", "INESSIVE", "ILLATIVE", "ELATIVE", "ADESSIVE", "ALLATIVE", "ABLATIVE", "COMITATIVE", "TRANSLATIVE", "ESSIVE", "TERMINATIVE", "ABESSIVE"];
const caseRank = (s: SlotRead) => (s.case ? CASE_FIRST.indexOf(s.case) : -1);

/* ------------------------------------------------------------- the rules */

/** The words that make a clause say no. `ära` is left out: after a verb it means the job is done. */
const NEGATORS: ReadonlySet<string> = new Set(["ei", "pole", "ega"]);

/** Subject pronouns, which Estonian drops whenever the verb already says who. Lemma requests. */
const SUBJECTS: Readonly<Record<string, Person>> = {
  ma: "Sg1", mina: "Sg1", sa: "Sg2", sina: "Sg2", ta: "Sg3", tema: "Sg3",
  me: "Pl1", meie: "Pl1", te: "Pl2", teie: "Pl2", nad: "Pl3", nemad: "Pl3",
};

/** A small word a sentence may leave out without changing what it says. */
const DROPPABLE: ReadonlySet<string> = new Set(["ju", "küll", "nüüd", "siis", "ka", "aga", "ja", "no", "noh"]);

/** The pronoun a story told in the first person is told back with. */
const RETOLD: Readonly<Record<string, readonly string[]>> = { ma: ["ta", "tema"], mina: ["ta", "tema"], me: ["nad", "nemad"], meie: ["nad", "nemad"] };

/** A first-person verb, told back: the third person, singular or plural, of the same tense. */
function retoldPersons(person: Person | undefined): readonly Person[] {
  if (person === "Sg1") return ["Sg3"];
  if (person === "Pl1") return ["Sg3", "Pl3"];
  return person ? [person] : [];
}

/** The first sense of a gloss, for a short reminder of what a word means. */
function firstSense(gloss: string | undefined): string | null {
  const first = gloss?.split(/[,;]/)[0]?.replace(/\([^)]*\)/g, "").trim();
  return first ? first : null;
}

/** Which axes two readings of one word differ on. */
function axesBetween(a: SlotRead, b: SlotRead): Axis[] {
  const out: Axis[] = [];
  if (a.tense !== b.tense) out.push("tense");
  if (a.person !== b.person && a.person !== undefined && b.person !== undefined) out.push("person");
  if (a.case !== b.case) out.push("case");
  if ((a.plural ?? false) !== (b.plural ?? false) && a.case !== undefined && b.case !== undefined) out.push("number");
  return out;
}

/* ------------------------------------------------------------ comparing */

interface Token { readonly word: string; readonly at: number; readonly capital: boolean }

function tokens(text: string): Token[] {
  const raw = text.match(/[\p{L}\p{M}\d]+(?:[-'’][\p{L}\p{M}]+)*/gu) ?? [];
  return raw.map((w, at) => ({ word: w.toLocaleLowerCase("et"), at, capital: at > 0 && /^\p{Lu}/u.test(w) }));
}

/**
 * Compare one typed sentence with the line the card asked for.
 *
 * Read against whichever accepted line it is closest to, so an alternative
 * the lesson wrote is never the thing the learner is told they missed.
 */
export function againstLine(typed: string, ask: LineAsk, entries: readonly CheckEntry[], glosses: Glosses = new Map()): AgainstLine {
  const index = indexOf(entries);
  const subs = substitutesFrom(entries.filter((e) => glosses.has(e.lemma)).map((e) => ({ lemma: e.lemma.toLocaleLowerCase("et"), pos: e.pos, gloss: glosses.get(e.lemma)! })));
  const byLemma = new Map(entries.map((e) => [e.lemma.toLocaleLowerCase("et"), e] as const));
  const typedNorm = words(typed).join(" ");
  let best: AgainstLine | null = null;
  for (const line of ask.lines) {
    if (words(line).join(" ") === typedNorm) return { differences: [], against: line };
    const diff = compareOne(typed, line, ask, index, subs, byLemma, glosses);
    if (!best || weight(diff) < weight(best.differences)) best = { differences: diff, against: line };
  }
  return best ?? { differences: [], against: ask.lines[0] ?? "" };
}

/** How far a reading is from right: a synonym costs nothing. */
function weight(diffs: readonly Difference[]): number {
  return diffs.filter((d) => d.kind !== "synonym").length;
}

function compareOne(
  typed: string, line: string, ask: LineAsk,
  index: Map<string, Reading[]>, subs: Map<string, string[]>, byLemma: Map<string, CheckEntry>, glosses: Glosses,
): Difference[] {
  const out: Difference[] = [];
  let mine = tokens(typed);
  let theirs = tokens(line);
  const readings = (w: string) => index.get(w) ?? [];
  const lemmasOf = (w: string) => new Set(readings(w).map((r) => r.lemma));
  const meaningOf = (w: string, lemma?: string) => ask.meanings?.get(w)
    ?? firstSense(glosses.get(lemma ?? "") ?? glosses.get([...lemmasOf(w)][0] ?? "") ?? glosses.get(w));

  // THE NO, first, since one word of it turns the sentence round and it pairs with nothing.
  const negMine = mine.filter((t) => NEGATORS.has(t.word));
  const negTheirs = theirs.filter((t) => NEGATORS.has(t.word));
  if (negMine.length > 0 && negTheirs.length === 0) out.push({ kind: "negation", youSaidNo: true, no: negMine[0]!.word });
  if (negTheirs.length > 0 && negMine.length === 0) out.push({ kind: "negation", youSaidNo: false, no: negTheirs[0]!.word });
  mine = mine.filter((t) => !NEGATORS.has(t.word));
  theirs = theirs.filter((t) => !NEGATORS.has(t.word));

  const usedMine = new Set<number>();
  const usedTheirs = new Set<number>();
  const pair = (test: (m: Token, t: Token) => boolean, then?: (m: Token, t: Token) => void) => {
    for (const t of theirs) {
      if (usedTheirs.has(t.at)) continue;
      const m = mine.find((x) => !usedMine.has(x.at) && test(x, t));
      if (!m) continue;
      usedMine.add(m.at);
      usedTheirs.add(t.at);
      then?.(m, t);
    }
  };

  // A STORY TOLD BACK: the line's I is the teller's he or she.
  const retoldPronoun = (m: Token, t: Token) => ask.aboutThem === true && (RETOLD[t.word] ?? []).includes(m.word);
  const shared = (m: Token, t: Token) => [...lemmasOf(m.word)].find((l) => lemmasOf(t.word).has(l));

  // 1. The same spelling, or a story's pronoun told back. Then the same spelling under its marks, which is the spelling check's.
  const firstPerson = (w: string) => SUBJECTS[w] === "Sg1" || SUBJECTS[w] === "Pl1" || readings(w).some((r) => r.slot.person === "Sg1" || r.slot.person === "Pl1");
  pair((m, t) => (m.word === t.word && !(ask.aboutThem && firstPerson(t.word))) || retoldPronoun(m, t));
  pair((m, t) => fold(m.word) === fold(t.word) && shared(m, t) !== undefined && !(ask.aboutThem && firstPerson(t.word)));

  // 2. The same word in another form. A story told back reads the line's I as he, she or they.
  pair((m, t) => shared(m, t) !== undefined && !(SUBJECTS[m.word] && SUBJECTS[t.word]), (m, t) => {
    const lemma = shared(m, t)!;
    const mineSlots = slotsOf(readings(m.word), lemma);
    const lineSlots = slotsOf(readings(t.word), lemma);
    if (mineSlots.length === 0 || lineSlots.length === 0) return;
    // Two spellings that can be the same thing are, unless a story is told back in the teller's person.
    if (!ask.aboutThem && mineSlots.some((a) => lineSlots.some((b) => sameSlot(a, b)))) return;
    const yours = [...mineSlots].sort((a, b) => caseRank(a) - caseRank(b))[0]!;
    const line = [...lineSlots].sort((a, b) => caseRank(a) - caseRank(b))[0]!;
    const retold = ask.aboutThem === true && (line.person === "Sg1" || line.person === "Pl1");
    const persons = retold ? retoldPersons(line.person) : line.person ? [line.person] : [];
    const theirs: SlotRead = retold ? { ...line, person: persons[0] } : line;
    const axes: Axis[] = axesBetween(yours, line).filter((a) => a !== "person");
    if (yours.person && persons.length > 0 && !persons.includes(yours.person)) axes.unshift("person");
    if (axes.length === 0) return;
    // Told back, the line's own spelling is the teller's; the form to say is the third person, where the dictionary holds it.
    const right = retold ? personOf(byLemma.get(lemma), theirs) : t.word;
    out.push({
      kind: "form", word: m.word, right, lemma, axes, yours, theirs,
      meant: retold ? null : ask.meanings?.get(t.word) ?? null, yoursMeant: ask.meanings?.get(m.word) ?? null,
    });
  });

  // 3. A pronoun for another pronoun is who the sentence is about.
  pair((m, t) => SUBJECTS[m.word] !== undefined && SUBJECTS[t.word] !== undefined, (m, t) => {
    const want = ask.aboutThem && RETOLD[t.word] ? "Sg3" : SUBJECTS[t.word]!;
    if (SUBJECTS[m.word] === want || (ask.aboutThem && (RETOLD[t.word] ?? []).includes(m.word))) return;
    const right = ask.aboutThem && RETOLD[t.word] ? RETOLD[t.word]![0]! : t.word;
    out.push({ kind: "person", word: m.word, right, yours: SUBJECTS[m.word]!, theirs: want });
  });

  // 4. A word the dictionary says means the same.
  pair((m, t) => [...lemmasOf(t.word)].some((l) => (subs.get(l) ?? []).some((s) => lemmasOf(m.word).has(s))), (m, t) => {
    out.push({ kind: "synonym", word: m.word, right: t.word });
  });

  // 5. What is left of the line, paired in order with what is left of the answer, word kind with word kind.
  const kind = (w: string) => readings(w)[0]?.pos ?? (/^\d/.test(w) ? "NUMBER" : "OTHER");
  const restMine = mine.filter((m) => !usedMine.has(m.at));
  for (const t of theirs.filter((x) => !usedTheirs.has(x.at))) {
    const tLemma = readings(t.word)[0]?.lemma;
    const own = ask.ownDetails && ownDetail(t, byLemma.get(tLemma ?? ""), ask);
    const partnerAt = restMine.findIndex((m) => !usedMine.has(m.at) && (kind(m.word) === kind(t.word) || own));
    if (partnerAt >= 0) {
      const m = restMine[partnerAt]!;
      usedMine.add(m.at);
      if (own) {
        const caseDiff = ownCase(m, t, readings, byLemma);
        if (caseDiff) out.push(caseDiff);
        continue;
      }
      out.push({ kind: "swap", word: m.word, right: t.word, meant: meaningOf(t.word, tLemma), yoursMeant: meaningOf(m.word) });
      continue;
    }
    if (droppable(t.word, mine, readings)) continue;
    // A detail of the learner's own, or of a story they told back in fewer words, is theirs to leave out.
    if (own || ask.aboutThem) continue;
    out.push({ kind: "missing", right: t.word, meant: meaningOf(t.word, tLemma) });
  }
  return out;
}

/** A verb in a tense and person, where the dictionary holds it: the form a story told back needs. */
function personOf(entry: CheckEntry | undefined, slot: SlotRead): string | null {
  if (!entry || entry.pos !== "VERB" || !slot.tense || !slot.person) return null;
  const family = slot.tense === "now" ? "IndPr" : slot.tense === "past" ? "IndIpf" : slot.tense === "would" ? "KndPr" : null;
  if (!family) return null;
  return verbTable(entry).get(`${family}${slot.person}`) ?? null;
}

/** A word of the line the learner may change to make it true for them. */
function ownDetail(t: Token, entry: CheckEntry | undefined, ask: LineAsk): boolean {
  if (/^\d/.test(t.word) || t.capital) return true;
  if (!entry) return false;
  if (isNumber(entry.semanticTypes) || isTime(entry.semanticTypes)) return true;
  if (entry.pos === "NOUN" || entry.pos === "ADJECTIVE") return true;
  return !ask.taught?.has(t.word) && entry.pos === "PHRASE";
}

/** A word the learner may leave out: a subject the verb already says, or a small word that changes nothing. */
function droppable(word: string, mine: readonly Token[], readings: (w: string) => Reading[]): boolean {
  if (DROPPABLE.has(word)) return true;
  const person = SUBJECTS[word];
  if (!person) return false;
  return mine.some((m) => readings(m.word).some((r) => r.slot.person === person));
}

/** A different noun of the learner's own, read for the case the line puts its noun in. */
function ownCase(m: Token, t: Token, readings: (w: string) => Reading[], byLemma: Map<string, CheckEntry>): Difference | null {
  const theirsRead = readings(t.word);
  const mineRead = readings(m.word);
  const tLemma = theirsRead[0]?.lemma;
  const mLemma = mineRead[0]?.lemma;
  if (!tLemma || !mLemma) return null;
  const wanted = onlySlot(theirsRead, tLemma);
  const yours = onlySlot(mineRead, mLemma);
  if (!wanted?.case || !yours?.case || wanted.case === yours.case) return null;
  // Only where the learner's own spelling cannot also be the wanted case: `tuba` is the plain form and the 3rd form.
  if (mineRead.some((r) => r.lemma === mLemma && r.slot.case === wanted.case)) return null;
  const entry = byLemma.get(mLemma);
  const table = entry ? caseTable(entry) : [];
  const form = table.find((f) => f.spec.key === wanted.case);
  const right = (wanted.plural ? form?.plural : form?.singular) ?? null;
  return { kind: "case", word: m.word, right: right?.toLocaleLowerCase("et") ?? null, yours: yours.case, theirs: wanted.case, model: t.word };
}

/* -------------------------------------------------------------- verdict */

/**
 * The four steps a sentence can be in, never a score:
 *
 * - `right`   says what was asked, in Estonian with nothing found wrong;
 * - `asked`   understood, but not what the line asked (a form, a word, a no);
 * - `slip`    says it, with a grammar slip the dictionary found;
 * - `unclear` hard to understand: most of its words are not words.
 */
export type Grade = "right" | "asked" | "slip" | "unclear";

export function gradeOf(differences: readonly Difference[], findings: readonly { readonly kind: string }[], wordCount: number): Grade {
  const spelling = findings.filter((f) => f.kind === "spelling").length;
  if (wordCount > 0 && spelling * 2 > wordCount) return "unclear";
  if (differences.some((d) => d.kind !== "synonym")) return "asked";
  if (findings.length > 0) return "slip";
  return "right";
}

/* -------------------------------------------------------------- a story */

/**
 * Which line of a story a sentence told back is about: the one sharing most
 * words with it, by the word each spelling belongs to. Null where it shares
 * none, since a sentence about nothing in the story is read for its Estonian
 * alone rather than held to a line it was never trying to say.
 */
export function nearestLine(typed: string, lines: readonly string[], entries: readonly CheckEntry[]): number | null {
  const index = indexOf(entries);
  const lemmas = (text: string) => new Set(tokens(text).flatMap((t) => {
    if (SUBJECTS[t.word] || NEGATORS.has(t.word) || DROPPABLE.has(t.word)) return [];
    const found = (index.get(t.word) ?? []).map((r) => r.lemma);
    return found.length > 0 ? found : [t.word];
  }));
  const mine = lemmas(typed);
  let best: number | null = null;
  let most = 0;
  lines.forEach((line, i) => {
    const shared = [...lemmas(line)].filter((l) => mine.has(l)).length;
    if (shared > most) { most = shared; best = i; }
  });
  return best;
}

/**
 * A text told back, as the sentences it is read in: at a stop, a question or
 * an exclamation mark, and at a line break. Spoken goes arrive joined with a
 * stop, so each go is a sentence.
 */
export function toldSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/u).map((s) => s.trim()).filter((s) => tokens(s).length > 0);
}
