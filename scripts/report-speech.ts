/**
 * DOES SAYING IT HELP? (docs/41-fifth-batch.md VB-14).
 *
 * Three readings off this deployment's own log, as text for the operator:
 * the edit rate (how much of what was heard learners changed before sending,
 * D3), recall after a spoken answer against a typed one (D4), and today's
 * chat (VB-11). The arithmetic is `lib/stats/speechReport.ts`; the reading
 * of the rows is `lib/progress/speechReport.ts`, which the admin page at
 * /admin/speech reads too (docs/44-sixth-batch.md C-3), so the two cannot
 * disagree. Every figure says what it was measured over and when, and each
 * reading says what it cannot show, because a figure quoted without that is a
 * figure somebody will over-read.
 *
 * A command as well as a screen, like `report:impact`: it reads the whole
 * deployment, and section 0 of the batch doc records each run.
 */
import { prisma } from "../lib/db";
import { speechReport, type SpeechReport } from "../lib/progress/speechReport";
import {
  CHAT_NEXT_AFTER_MS, EDIT_ALARM_SHARE, EDIT_ALARM_TURNS, percent, type EditRow,
} from "../lib/stats/speechReport";
import { CHAT_MIN_NEW } from "../lib/scenes/specs/chat";

function rowLine(r: EditRow): string {
  return `  ${r.key.padEnd(8)} ${String(r.turns).padStart(6)} turns, ${String(r.wordsChanged).padStart(6)} of ${String(r.wordsHeard).padStart(6)} heard words changed (${percent(r.share)})`;
}

/**
 * The text this command prints, unchanged by the move: the same three
 * readings in the same words. The two readings the admin page adds are not in
 * it, so the operator's runs recorded in the batch docs stay comparable.
 */
function speechReportLines(report: SpeechReport): string[] {
  const { edits, recall, chat, spokenAnswers } = report;
  const out: string[] = [`Kodukeel: does saying it help? Measured on ${report.measuredOn}, from this installation's own log.`, ""];
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
    "  An answer is spoken where what was marked is what was heard; one the learner changed first is counted as typed.",
    "  Observational and confounded: people choose when to speak, and an easy card is likelier to be said aloud. Not a trial.",
    "",
    "3. Tonight's chat (VB-11).",
    `  ${chat.offered} finished ${chat.offered === 1 ? "evening" : "evenings"} met at least ${CHAT_MIN_NEW} new words, the most that could have offered a chat`
      + " (an upper bound: this report cannot tell whether a model was configured that night).",
    `  A chat was opened for ${chat.took} of them and finished for ${chat.finished}.`,
    chat.chatWords.pairs === 0
      ? "  No word a chat asked for has come back for review yet, so there is nothing to compare."
      : `  At the next answer at least ${Math.round(CHAT_NEXT_AFTER_MS / 60_000)} minutes after the chat, the words it asked for were recalled`
        + ` ${percent(chat.chatWords.share)} of the time (${chat.chatWords.recalled} of ${chat.chatWords.pairs}),`
        + ` and the same evenings' other words ${percent(chat.otherWords.share)} (${chat.otherWords.recalled} of ${chat.otherWords.pairs}).`,
    "  Observational: a chat asks the words it can, which are not a random half of the evening. Not a trial.",
  );
  return out;
}


async function main() {
  console.log(speechReportLines(await speechReport()).join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
