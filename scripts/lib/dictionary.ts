/**
 * The dictionary a fresh install actually has, assembled the way the seed
 * assembles it, for scripts that need to reason about what the app ships.
 *
 * `prisma/seed.ts` reads six files and writes them into `Lexeme` under a
 * conflict key of `(lemma, pos)`. A script that wants to measure or audit what
 * shipped has to read the same six and dedupe the same way, or its numbers are
 * about something nobody has: `scripts/measure-scenes.ts` grew one copy of
 * that and `scripts/audit-senses.ts` wanted a second, which is how two reports
 * about one dictionary start disagreeing.
 *
 * Read-only and offline. No database, no network, no key. It is deliberately
 * not the seed's own code: the seed writes rows and computes gradation on the
 * way, and this only has to say what is in the files.
 *
 * WITH ONE EXCEPTION, WHICH IS FAITHFUL RATHER THAN A FILTER. A usage in
 * `lib/dict/refused.ts` is one somebody has read and refused, the seed does
 * not write it, and `parseExamples` would not hand it back if it did, so a
 * fresh install genuinely does not have it. An audit that counted it would be
 * reporting on a dictionary nobody has, and `npm run translate:examples`
 * would go on paying to translate a sentence no screen may draw.
 */
import { NOUNS } from "../../prisma/data/nouns";
import { VERBS } from "../../prisma/data/verbs";
import { ADJECTIVES, PHRASES } from "../../prisma/data/other";
import { ADVANCED_ADJECTIVES, ADVANCED_NOUNS, ADVANCED_VERBS } from "../../prisma/data/advanced";
import { HARVESTED } from "../../prisma/data/harvested";
import expandedRaw from "../../prisma/data/expanded.json";
import { englishFor } from "../../lib/dict/exampleEnglish";
import { classifyGradation, classifyVerbGradation, gradates } from "../../lib/estonian/gradation";
import { courseWords } from "../../lib/collections/syllabus/index";
import { isRefusedSentence } from "../../lib/dict/refused";

export interface ShippedEntry {
  readonly lemma: string;
  readonly pos: string;
  readonly cefr: string | null;
  /** The English gloss, which is `Lexeme.translation` and a production card's prompt. */
  readonly gloss: string;
  /** Principal parts by formType, exactly as the seed stores them. */
  readonly parts: Readonly<Record<string, string>>;
  /**
   * Whole forms Ekilex recorded that no rule reaches, by its own morph code.
   *
   * Beside `parts` rather than folded into it, for the reason `Form`'s unique
   * key carries the value: a case can have two, `minule` and `mulle`, and a
   * Record holds one. `formValues` is what a caller that only wants the
   * spellings should use.
   */
  readonly extraForms: readonly { code: string; value: string }[];
  /** Sentences a lexicographer recorded against this entry. */
  readonly usages: readonly string[];
  /** The case the word demands of its complement, as Ekilex words it. */
  readonly government: string | null;
  /** Ekilex's own definition of the sense. Course words only. */
  readonly note: string | null;
  /** What Ekilex calls the word. Course words only. */
  readonly ekilexPos: readonly string[];
  /**
   * The Institute's own classification of what kind of thing the word is.
   *
   * Carried rather than derived, because nothing here could derive it: it is
   * what decides whether a word is drilled on `opetajale` or on `opetajasse`,
   * and a caller that does not have it asks a person which room they are
   * inside. Null for the hand-typed lists, which predate the column.
   */
  readonly semanticTypes: string | null;
  /**
   * The gradation the file already holds, where it holds one.
   *
   * Only the expansion does: `scripts/expand-seed.ts` stores what
   * `mapEkilexDetails` worked out, and `prisma/seed.ts` computes the value for
   * every other row on the way past. `dictionaryRows` is where that second
   * half lives, so this stays a statement about the files.
   */
  readonly gradation: { readonly type: string; readonly note: string | null } | null;
  /** Which file it came from, because that decides who wins a collision. */
  readonly source: "SEED" | "HARVEST" | "EXPANSION";
}

interface ExpandedEntry {
  lemma: string;
  pos: string;
  cefr: string | null;
  translation: string;
  notes?: string | null;
  government?: string | null;
  gradation?: string | null;
  gradationNote?: string | null;
  semanticTypes?: string | null;
  examples?: { et: string; en: string | null }[];
  forms?: { formType: string; value: string }[];
}

function clean(parts: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parts)) if (v) out[k] = v;
  return out;
}

const bare = {
  note: null, ekilexPos: [] as string[], government: null as string | null,
  extraForms: [] as { code: string; value: string }[], source: "SEED" as const,
  semanticTypes: null as string | null,
  gradation: null as { type: string; note: string | null } | null,
};

/**
 * Every entry the seed would write, resolved the way the seed resolves it.
 *
 * TWO RULES, NOT ONE, AND READING IT AS ONE WAS WRONG FOR 293 WORDS. The
 * built expansion arrives under `ON CONFLICT DO NOTHING`, so an entry already
 * written keeps what it has. The course harvest does not: `prisma/seed.ts`
 * filters the hand-typed lists down to the entries the harvest does not cover
 * and says so out loud on every run, "superseding 293 hand-typed ones". So the
 * harvest **replaces** a hand-typed entry and the expansion **defers** to one,
 * and this read both as deferring.
 *
 * What that cost is invisible until you look for it, which is why it lasted:
 * both versions of a word have the same lemma and the same part of speech, so
 * every count came out right. What differs is everything else. `olema` is in
 * the hand-typed verbs and in the harvest, and the harvest's row is the one
 * with the attested sentences, the Ekilex level, the Russian and Ukrainian
 * equivalents, and the forms no rule reaches. Reading the hand-typed one meant
 * `on`, `oli` and `pole` were absent from every report and from every scene's
 * word list, and the measurement went on listing them as words the dictionary
 * could not vouch for after they had been stored.
 */
export function shippedDictionary(): ShippedEntry[] {
  const rows: ShippedEntry[] = [];

  for (const [lemma, gloss, cefr, nomSg, genSg, partSg, partPl, genPl, illSgShort] of [
    ...NOUNS, ...ADVANCED_NOUNS,
  ]) {
    rows.push({
      lemma, pos: "NOUN", cefr, gloss, usages: [], ...bare,
      parts: clean({
        NOM_SG: nomSg, GEN_SG: genSg, PART_SG: partSg,
        PART_PL: partPl, GEN_PL: genPl, ILL_SG_SHORT: illSgShort,
      }),
    });
  }

  for (const [lemma, gloss, cefr, nomSg, genSg, partSg] of [...ADJECTIVES, ...ADVANCED_ADJECTIVES]) {
    rows.push({
      lemma, pos: "ADJECTIVE", cefr, gloss, usages: [], ...bare,
      parts: clean({ NOM_SG: nomSg, GEN_SG: genSg, PART_SG: partSg }),
    });
  }

  for (const [lemma, gloss, cefr, infMa, infDa, pres1sg, past1sg, partTud] of [
    ...VERBS, ...ADVANCED_VERBS,
  ]) {
    rows.push({
      lemma, pos: "VERB", cefr, gloss, usages: [], ...bare,
      parts: clean({ INF_MA: infMa, INF_DA: infDa, PRES_1SG: pres1sg, PAST_1SG: past1sg, PART_TUD: partTud }),
    });
  }

  /*
    A course phrase is an attested line in its own right, which is why its own
    text is its only usage. `Tere!` is a thing somebody says; Ekilex has no
    headword for a greeting, so the seed carries the hand-checked ones the
    built-in dictionary already had.
  */
  for (const [lemma, gloss, cefr] of PHRASES) {
    rows.push({ lemma, pos: "PHRASE", cefr, gloss, parts: {}, usages: [lemma], ...bare });
  }

  for (const h of HARVESTED) {
    rows.push({
      lemma: h.lemma, pos: h.pos, cefr: h.cefr, gloss: h.gloss,
      parts: h.parts, extraForms: h.extraForms, government: h.government,
      usages: h.usages.filter((et) => !isRefusedSentence(et)), note: h.note, ekilexPos: h.ekilexPos, source: "HARVEST",
      semanticTypes: h.semanticTypes.length > 0 ? h.semanticTypes.join(" ") : null,
      gradation: null,
    });
  }

  for (const e of expandedRaw as ExpandedEntry[]) {
    /*
      One value per formType in `parts`, and the rest beside it, for the reason
      `Form`'s unique key carries the value: Estonian has parallel forms and a
      Record holds one. Folding the surplus into `parts` by formType silently
      dropped it, which is the same fault the course harvest had, and it is
      what made the form count here disagree with the seed's by 1,913.
    */
    const parts: Record<string, string> = {};
    const surplus: { code: string; value: string }[] = [];
    for (const f of e.forms ?? []) {
      if (!parts[f.formType]) parts[f.formType] = f.value;
      else if (parts[f.formType] !== f.value) {
        surplus.push({ code: f.formType.replace(/^EKILEX:/, ""), value: f.value });
      }
    }
    rows.push({
      lemma: e.lemma, pos: e.pos, cefr: e.cefr, gloss: e.translation, parts,
      usages: (e.examples ?? []).map((x) => x.et).filter((et) => !isRefusedSentence(et)),
      /*
        Deliberately not `e.notes`. The expansion's notes column holds an
        English sense note from Wiktionary, not an Ekilex definition, and nine
        pairs of them collide: `masin` and `pann` are both noted "car". Reading
        it as a sense key would call a frying pan a synonym for a car.
      */
      ...bare,
      // Ekilex's, like the course's: the expansion reads the same field.
      government: e.government ?? null,
      extraForms: surplus,
      semanticTypes: e.semanticTypes ?? null,
      gradation: { type: e.gradation ?? "NONE", note: e.gradationNote ?? null },
      source: "EXPANSION",
    });
  }

  const seen = new Map<string, ShippedEntry>();
  for (const row of rows) {
    const key = `${row.lemma}|${row.pos}`;
    // The harvest replaces; everything else defers to what is already there.
    if (!seen.has(key) || row.source === "HARVEST") seen.set(key, row);
  }
  return [...seen.values()];
}

/** Every spelling one entry can be written as: its principal parts and the rest. */
export function formValues(entry: ShippedEntry): string[] {
  const out = new Set<string>([entry.lemma, ...Object.values(entry.parts)]);
  for (const f of entry.extraForms) out.add(f.value);
  return [...out];
}

/**
 * One dictionary entry in the shape `Lexeme` is written in, for the audits.
 *
 * `ShippedEntry` says what is in the files. This says what the row looks like
 * once the seed has finished with it, which is what a generator reads, and the
 * difference is one computed column.
 */
export interface DictionaryRow {
  lemma: string;
  pos: string;
  cefr: string | null;
  translation: string;
  forms: { formType: string; value: string }[];
  examples: { et: string; en: string | null }[];
  government: string | null;
  gradation: string;
  gradationNote: string | null;
  semanticTypes: string | null;
}

/*
  EVERY ENTRY THE SEED WRITES, IN THE SHAPE THE CARD BUILDERS READ.

  `scripts/audit-questions.ts` and `scripts/audit-sense.ts` each opened
  `prisma/data/expanded.json` under a comment calling it "what the seed loads",
  and the seed loads that file and `prisma/data/harvested.ts`: 758 of the 1,514
  course words are in no expansion row, so half the course had never been
  through either. It is not academic. `kes` and `mis` are among them, and their
  gradation card asks the genitive as `kelle? mille?`, which are the two words
  it wants back.

  THE MERGE HAS TO BE FAITHFUL OR IT INVENTS FAULTS, and the first attempt at
  one proves it: written with `gradation: null` on the course rows it reported
  about sixty gradation faults the app does not have, because
  `lib/srs/cards.ts` breaks on `lex.gradation === "NONE"` and `null` is not
  `"NONE"`. So gradation is computed here exactly as `prisma/seed.ts` computes
  it, off the part of speech first: `gradates` decides, a verb is classified on
  its ma-infinitive and its first person and a nominal on its nominative and
  its genitive. A pronoun grades to NONE, which is why the card that started
  this cannot be reached from a seeded dictionary at all and is reached from
  the live lookup instead, where Ekilex calls every nominal `noomen` and the
  entry is created as a NOUN.

  `semanticTypes` is the other column a wrong merge would quietly drop, and it
  decides which question words a case card prints: read as absent, an animate
  noun is drilled on `opetajasse`. It is carried rather than computed, because
  nothing here could compute it.
*/
const COURSE_LEVEL = new Map(courseWords().map((w) => [`${w.lemma}|${w.pos}`, w.level]));

export function dictionaryRows(): DictionaryRow[] {
  return shippedDictionary().map((e) => {
    const g =
      e.gradation !== null ? e.gradation
      : !gradates(e.pos) ? { type: "NONE", note: null }
      : e.pos === "VERB"
        ? classifyVerbGradation(e.parts.INF_MA ?? e.lemma, e.parts.PRES_1SG ?? "")
        : classifyGradation(e.parts.NOM_SG ?? e.lemma, e.parts.GEN_SG ?? "");
    return {
      lemma: e.lemma,
      pos: e.pos,
      /*
        Ekilex's own proficiency code where it records one, and the level of
        the unit that introduces the word where it does not. Both are honest
        and the first is the authority's.

        The `B1` floor is the harvest's alone, which is where `prisma/seed.ts`
        applies it: an expansion row with no code is written with none, and
        2,090 of them have none. Applying it to everything would tell the exam
        pool that a third of the dictionary is B1.
      */
      cefr:
        e.cefr
        ?? COURSE_LEVEL.get(`${e.lemma}|${e.pos}`)
        ?? (e.source === "HARVEST" ? "B1" : null),
      translation: e.gloss,
      forms: [
        ...Object.entries(e.parts).map(([formType, value]) => ({ formType, value })),
        ...e.extraForms.map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value })),
      ],
      /*
        `englishFor`, because the seed joins it on both of its two paths and a
        row without it is a row no deployment has. The reason this said `null`
        was true about the wrong thing: no *entry* file carries an English
        column, because a translation is a fact about the sentence and lives
        in `prisma/data/example-english.json` keyed on it. So the audits were
        reading a dictionary whose every sentence was bare, which is what any
        check about what a learner is shown alongside one would have been
        measuring. 3,363 of the 3,392 gap items the placement check builds
        carry a line, and before this every one of them read as none.
      */
      examples: e.usages.map((et) => ({ et, en: englishFor(et) })),
      government: e.government,
      gradation: g.type,
      gradationNote: g.note ?? null,
      semanticTypes: e.semanticTypes,
    };
  });
}
