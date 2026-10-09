import { prisma } from "@/lib/db";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { readOpeners, type OpenerAnswer, type OpenersReading } from "@/lib/stats/openers";
import { OPENER_SLOTS, OPENER_WORDS, type OpenerWord } from "@/lib/estonian/openers";

/**
 * How far a learner has got on the openers, read off their own answers.
 *
 * The newest four hundred, ordered, because the reading only looks at the last
 * `WINDOW` of each stage and an uncut read of the log would grow for ever.
 */
export async function openersReadingFor(ownerId: string, maxStage?: number): Promise<OpenersReading> {
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
  return readOpeners(answers, maxStage);
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
