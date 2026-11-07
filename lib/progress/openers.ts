import { prisma } from "@/lib/db";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { learnerDayClock } from "@/lib/progress/dayClock";
import type { Track } from "@/lib/estonian/openers";
import { readOpeners, type OpenerAnswer, type OpenersReading } from "@/lib/stats/openers";
import { OPENER_SLOTS, OPENER_VERBS, OPENER_WORDS, type OpenerWord } from "@/lib/estonian/openers";

/**
 * How far a learner has got on the openers, read off their own answers.
 *
 * The newest four hundred, ordered, because the reading only looks at the last
 * `WINDOW` of each stage and an uncut read of the log would grow for ever.
 */
export async function openersReadingFor(ownerId: string, maxStage?: number, track: Track = "noun"): Promise<OpenersReading> {
  const [rows, clock] = await Promise.all([
    prisma.review.findMany({
      where: { ownerId, slot: { in: [...OPENER_SLOTS] } },
      select: { slot: true, rating: true, reviewedAt: true },
      orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
      take: 400,
    }),
    learnerDayClock(ownerId),
  ]);
  const answers: OpenerAnswer[] = rows.flatMap((r) =>
    r.slot ? [{ slot: r.slot, rating: r.rating, day: clock.dayKey(r.reviewedAt) }] : []);
  return readOpeners(answers, maxStage, track);
}

/**
 * The words a round may be built on, with the four forms it needs.
 *
 * A request for each lemma in `OPENER_WORDS` against the dictionary: a word it
 * does not hold is simply absent, and a word with no stored second form is
 * dropped by the round rather than guessed at.
 */
export async function openerWords(): Promise<OpenerWord[]> {
  const rows = await prisma.lexeme.findMany({
    where: { pos: "NOUN", lemma: { in: OPENER_WORDS.map((w) => w.lemma) } },
    select: {
      id: true,
      lemma: true,
      pos: true,
      forms: {
        where: { formType: { in: ["NOM_SG", "PART_SG", "NOM_PL", "PART_PL"] } },
        select: { formType: true, value: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  const specs = new Map(OPENER_WORDS.map((w) => [`${w.lemma}|NOUN`, w]));
  return rows.flatMap((row) => {
    const spec = specs.get(`${row.lemma}|${row.pos}`);
    if (!spec) return [];
    // The first stored row of each kind: Ekilex lists the primary first.
    const first = (type: string) => row.forms.find((f) => f.formType === type)?.value ?? null;
    const part = first("PART_SG");
    if (!part) return [];
    return [{
      ...spec,
      lexemeId: row.id,
      nom: first("NOM_SG") ?? row.lemma,
      part,
      nomPl: first("NOM_PL"),
      partPl: first("PART_PL"),
    }];
  });
}

/**
 * The verbs a verb opener may be followed by, with their two infinitives, both
 * stored principal parts. A verb the dictionary does not hold, or holds without
 * its -da form, is simply absent.
 */
export async function openerVerbs(): Promise<OpenerWord[]> {
  const rows = await prisma.lexeme.findMany({
    where: { pos: "VERB", lemma: { in: OPENER_VERBS.map((v) => v.lemma) } },
    select: {
      id: true,
      lemma: true,
      pos: true,
      provenance: true,
      forms: {
        where: { formType: { in: ["INF_MA", "INF_DA"] } },
        select: { formType: true, value: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  const specs = new Map(OPENER_VERBS.map((v) => [v.lemma, v]));
  // A verb typed in by hand beside the seeded one is the same lemma twice: the dictionary's rule picks one.
  return oneEntryPerLemma(rows, OPENER_VERBS.map((v) => v.lemma)).flatMap((row) => {
    const spec = specs.get(row.lemma);
    if (!spec) return [];
    const first = (type: string) => row.forms.find((f) => f.formType === type)?.value ?? null;
    const da = first("INF_DA");
    if (!da) return [];
    return [{
      kind: "verb" as const,
      lemma: spec.lemma, en: spec.base, a: spec.to, the: spec.ing, pl: spec.ing,
      lexemeId: row.id,
      nom: first("INF_MA") ?? row.lemma,
      part: da,
      nomPl: null,
      partPl: null,
    }];
  });
}
