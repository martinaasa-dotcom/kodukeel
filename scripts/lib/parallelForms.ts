/**
 * THE PARALLEL PLURAL PARTITIVES THE LESSONS USE, WORKED OUT FROM THE DATA.
 *
 * Estonian has two right plural partitives for many words: `mune` and
 * `munasid`, `õunu` and `õunasid`, `koeri` and `koerasid`. The harvest stores
 * one of them, the short one a course teaches first (`PART_PL`), and a
 * learner who writes the other is right. The marker runs in the browser and
 * may not read the dictionary, so `scripts/build-parallel-forms.ts` writes
 * the pairs it needs into `lib/course/lessons/parallelForms.ts`, and
 * `lib/course/lessons/parallelForms.test.ts` works them out again from the
 * same data and fails where the table has fallen behind it.
 *
 * NOTHING HERE WRITES A FORM ON ITS OWN SAY. A candidate is the genitive
 * singular with `-sid` or `-id` after it (`muna` + `sid`), which is where the
 * long plural partitive is built; it is kept only where the forms list
 * (Ekilex's own inflection tables and Vabamorf with guessing off,
 * `prisma/data/forms/`) files that very spelling under that very headword.
 * The rule proposes and the dictionary decides, which is ADR-005 amendment 1:
 * a spelling no source holds is never in the table.
 *
 * AND A PERSON DECIDES WHICH ONES THE MARKER MAY READ AS ONE, because a
 * spelling can be two words. `teid` is the plural partitive of `tee` and is
 * also "you", which is what every lesson means by it, so reading `teesid` as
 * `teid` would mark a road right where the line says you. Every candidate a
 * lesson's words reach is in `PARALLEL_REVIEW` with a reason, kept or
 * refused, and a kept one records the lesson text it was read against: a
 * new sentence holding it fails the test until somebody has read that one
 * too. Only the words the lessons use are in the table, so it stays small.
 */
import type { HarvestedWord } from "../../prisma/data/harvested";

/** One plural partitive and its parallel spelling. */
export interface ParallelCandidate {
  readonly lemma: string;
  /** The spelling the harvest stores, which is what the marker reads both as. */
  readonly stored: string;
  /** The other one, which the forms list files under the same headword. */
  readonly parallel: string;
}

/** Every candidate whose stored or parallel spelling one of `used` is, the forms list consulted through `headwordsOf`. */
export async function parallelCandidates(
  harvested: readonly HarvestedWord[],
  used: ReadonlySet<string>,
  headwordsOf: (spelling: string) => Promise<readonly string[]>,
): Promise<ParallelCandidate[]> {
  const out: ParallelCandidate[] = [];
  for (const word of harvested) {
    const stored = word.parts.PART_PL;
    const stem = word.parts.GEN_SG;
    if (!stored || !stem || (word.pos !== "NOUN" && word.pos !== "ADJECTIVE")) continue;
    for (const parallel of [`${stem}sid`, `${stem}id`]) {
      if (parallel === stored || (!used.has(stored) && !used.has(parallel))) continue;
      if (!(await headwordsOf(parallel)).includes(word.lemma)) continue;
      out.push({ lemma: word.lemma, stored, parallel });
    }
  }
  return out.sort((a, b) => a.stored.localeCompare(b.stored, "et") || a.parallel.localeCompare(b.parallel, "et"));
}

/** The table the marker reads: each kept parallel spelling, mapped to the spelling stored. */
export function parallelTable(candidates: readonly ParallelCandidate[], review: Readonly<Record<string, ParallelDecision>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of candidates) if (review[c.stored]?.keep) out[c.parallel] = c.stored;
  return out;
}

/** What a person decided about one stored spelling's parallel, and why. */
export interface ParallelDecision {
  readonly keep: boolean;
  readonly why: string;
  /** For a kept one, every lesson text holding the stored or the parallel spelling, as it was read. */
  readonly read?: readonly string[];
}

/**
 * The decisions, keyed on the stored spelling. Read against every lesson text
 * that holds the word (`npx tsx scripts/build-parallel-forms.ts` prints them).
 */
export const PARALLEL_REVIEW: Readonly<Record<string, ParallelDecision>> = {
  busse: {
    keep: true, why: "Buses, some of them, in every lesson that says it.",
    read: ["Busse? Jaan, mina olen rongijaamas!", "Siin pole ühtegi kella. Siin on ainult busse."],
  },
  kingi: { keep: false, why: "In the lessons it is the command of kinkima, give it as a present (a2-10), never the shoes." },
  koeri: {
    keep: true, why: "The dogs, as the object, in every lesson that says it.",
    read: ["Ei, ma armastan koeri.", "Kas sa kardad koeri?", "Ma kardan koeri", "Ma kardan koeri.", "Seal jalutavad inimesed igal õhtul oma koeri.", "koeri"],
  },
  kolleege: {
    keep: true, why: "The colleagues, as the object of a negative.",
    read: ["Ma ei ole päris nõus. Kuigi kodus on mugav, on mul seal igav, sest ma ei näe kolleege."],
  },
  lilli: {
    keep: true, why: "Flowers, as the object.",
    read: ["Ma ei kuulnud. Aga Peeter on viimasel ajal väga rõõmus. Ja eile ostis ta lilli!", "Osta lilli! Lilled on alati hea kingitus."],
  },
  makse: {
    keep: true, why: "Taxes after enne and pärast, in every lesson that says it. The payment noun spelled the same is taught nowhere.",
    read: ["enne makse", "Kontole tuleb palk pärast makse.", "Lepingus on ju palk enne makse.", "Lepingus on ju palk enne makse. Kontole tuleb see, mis pärast makse alles jääb.", "Lepingus on palk enne makse.", "makse või maksusid", "palk enne makse", "Palk enne makse on suurem.", "palk pärast makse", "Palk pärast makse on väiksem.", "Pärast makse on palk väiksem."],
  },
  marju: {
    keep: true, why: "Berries, after on in a question about the forest.",
    read: ["Kas seal on ka marju?", "Kas seal on marju?", "marju"],
  },
  mune: {
    keep: true, why: "Eggs, as the object, in every lesson that says it.",
    read: ["Ei ostnud mune.", "Ei, ma ei ostnud mune.", "Ei, mune ma ei ostnud. Need olid otsas.", "Ma ei ostnud mune.", "mune", "Mune ma ei ostnud.", "Osta mune!", "Tubli! Aga mune ostsid ka?"],
  },
  otsi: { keep: false, why: "In the lessons it is otsima after ei (a2-50a), look for, never the ends." },
  teid: { keep: false, why: "In the lessons it is the pronoun, you (b1-47), never the roads." },
  vabu: {
    keep: true, why: "Free, before the parking spaces it describes.",
    read: [
      "Kui me õhtul koju jõuame, ei ole maja juures vabu parkimiskohti.",
      "Me kolisime siia mõni kuu tagasi koos naise ja kahe lapsega. Mul on autot iga päev vaja, sest ma viin hommikul lapsed lasteaeda ja õhtul käime poes. Tööle sõidan ma bussiga, aga lasteaeda on bussiga väga pikk sõit. Ja õhtul ei ole maja juures vabu parkimiskohti.",
    ],
  },
  õunu: {
    keep: true, why: "Apples, as the object, in every lesson that says it.",
    read: ["Aga bussis sõi ta õunu.", "kilo õunu", "Ma ostsin õunu", "Ma ostsin õunu.", "Ma pesin õunu juba ära.", "Ma sõin õunu.", "Noh, need olid nii head. Sõin bussis õunu.", "Ta sõi natuke õunu.", "Ta sõi õunu.", "Tema sõi õunu.", "Tom läks tagasi turule ja ostis veel õunu.", "Tom ostis turult terve kilo õunu.", "Tom, kas sa ostsid õunu?", "õunu"],
  },
};

/** Every distinct lesson text holding `spelling` as a word, in the order `localeCompare` puts them. */
export function textsHolding(texts: readonly string[], spelling: string): string[] {
  const holds = (t: string) => [...t.matchAll(/\p{L}+/gu)].some((m) => m[0].toLocaleLowerCase("et") === spelling);
  return [...new Set(texts.filter(holds))].sort((a, b) => a.localeCompare(b, "et"));
}

/** Whether two lists of lesson texts hold the same texts, in whatever order. */
export function sameTexts(a: readonly string[], b: readonly string[]): boolean {
  const key = (xs: readonly string[]) => JSON.stringify([...new Set(xs)].sort());
  return key(a) === key(b);
}

/** The table as the generated module's source. */
export function tableSource(table: Readonly<Record<string, string>>): string {
  const rows = Object.entries(table).sort(([a], [b]) => a.localeCompare(b, "et")).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  return [
    "/**",
    " * GENERATED by scripts/build-parallel-forms.ts. Do not edit by hand.",
    " *",
    " * Each plural partitive a lesson uses that has a parallel spelling the forms",
    " * list files under the same headword, mapped to the spelling the harvest",
    " * stores, so the marker reads `munasid` as `mune` (`spokenWords` in",
    " * `sameSentence.ts`). Only the words the lessons use, and only those a person",
    " * has read in every lesson that says them (`PARALLEL_REVIEW` in",
    " * `scripts/lib/parallelForms.ts`); `parallelForms.test.ts` fails where this",
    " * has fallen behind the data.",
    " */",
    "export const PARALLEL_FORMS: Readonly<Record<string, string>> = {",
    ...rows,
    "};",
    "",
  ].join("\n");
}
