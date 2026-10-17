/**
 * DOES SAYING IT HELP? (docs/41-fifth-batch.md VB-14).
 *
 * Three readings off this deployment's own log, as text for the operator:
 * the edit rate (how much of what was heard learners changed before sending,
 * D3), recall after a spoken answer against a typed one (D4), and tonight's
 * chat (VB-11). The arithmetic is `lib/stats/speechReport.ts`; this reads the
 * rows. Every figure says what it was measured over and when, and each
 * reading says what it cannot show, because a figure quoted without that is a
 * figure somebody will over-read.
 *
 * A command rather than a screen, like `report:impact`: it reads the whole
 * deployment, and section 0 of the batch doc records each run.
 */
import { prisma } from "../lib/db";
import { SETTING_KEYS } from "../lib/settings/store";
import {
  EDIT_ALARM_SHARE, EDIT_ALARM_TURNS, editReading, percent, recallReading, spokenTurnCounts,
  type EditRow, type SpokenTurn,
} from "../lib/stats/speechReport";

function turnsOf(transcript: string): unknown[] {
  try {
    const parsed = JSON.parse(transcript) as { turns?: unknown };
    return Array.isArray(parsed.turns) ? parsed.turns : [];
  } catch {
    return [];
  }
}

function rowLine(r: EditRow): string {
  return `  ${r.key.padEnd(8)} ${String(r.turns).padStart(6)} turns, ${String(r.wordsChanged).padStart(6)} of ${String(r.wordsHeard).padStart(6)} heard words changed (${percent(r.share)})`;
}

async function main() {
  const day = new Date().toISOString().slice(0, 10);
  const [runs, languages, answers] = await Promise.all([
    prisma.sceneRun.findMany({ select: { ownerId: true, level: true, transcript: true } }),
    prisma.setting.findMany({ where: { key: SETTING_KEYS.glossLanguage }, select: { ownerId: true, value: true } }),
    prisma.review.findMany({
      select: { ownerId: true, cardId: true, reviewedAt: true, rating: true, spoken: true },
      orderBy: [{ reviewedAt: "asc" }, { id: "asc" }],
    }),
  ]);
  const languageOf = new Map(languages.map((s) => [s.ownerId, s.value]));

  const turns: SpokenTurn[] = [];
  for (const run of runs) {
    for (const turn of turnsOf(run.transcript)) {
      const counts = spokenTurnCounts(turn);
      if (counts) turns.push({ band: run.level, glossLanguage: languageOf.get(run.ownerId) ?? "en", ...counts });
    }
  }
  const edits = editReading(turns);
  const recall = recallReading(answers);
  const spokenAnswers = answers.filter((a) => a.spoken).length;

  const out: string[] = [`Kodukeel: does saying it help? Measured on ${day}, from this installation's own log.`, ""];
  if (edits.alarm) {
    out.push(
      `ATTENTION: learners changed ${percent(edits.all.share)} of heard words over ${edits.all.turns} spoken turns,`,
      `past the line of ${Math.round(EDIT_ALARM_SHARE * 100)}% over ${EDIT_ALARM_TURNS} turns. Read below, and decide whether to switch speech off (PAID_OFF=speech, D15).`,
      "",
    );
  }

  out.push("1. The edit rate: heard words learners changed before sending (D3).");
  if (edits.all.turns === 0) {
    out.push("  No spoken conversation turn carries its counts yet, so there is nothing to read.");
  } else {
    out.push(
      rowLine(edits.all),
      "  By band:", ...edits.byBand.map(rowLine),
      "  By the language glosses are read in:", ...edits.byLanguage.map(rowLine),
    );
  }
  out.push(
    "  An upper bound on misrecognition: a learner also changes their own grammar, which counts here too.",
    "",
    "2. Recall after a spoken answer (D4).",
    `  ${spokenAnswers} answers were given aloud, by ${recall.speakers} ${recall.speakers === 1 ? "learner" : "learners"}.`,
    `  After a spoken answer, the next answer to the same card was recalled ${percent(recall.spoken.share)} of the time (${recall.spoken.recalled} of ${recall.spoken.pairs}).`,
    `  After a typed answer, from the same learners: ${percent(recall.typed.share)} (${recall.typed.recalled} of ${recall.typed.pairs}).`,
    "  Observational and confounded: people choose when to speak, and an easy card is likelier to be said aloud. Not a trial.",
    "",
    "3. Tonight's chat (VB-11).",
    "  Not on this installation yet: the chat is built in VB-11, and this reading is filled in when it lands.",
  );
  console.log(out.join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
