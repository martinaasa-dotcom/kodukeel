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
  CHAT_NEXT_AFTER_MS, EDIT_ALARM_SHARE, EDIT_ALARM_TURNS, chatReading, editReading, percent, recallReading, spokenTurnCounts,
  type ChatEveningRow, type ChatRun, type EditRow, type SpokenTurn,
} from "../lib/stats/speechReport";
import { dayById, newWordsIn, programmeById } from "../lib/course";
import { CHAT_ID, CHAT_MIN_NEW } from "../lib/scenes/specs/chat";
import { readChatPlan } from "../lib/progress/chat";

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

  /*
    TONIGHT'S CHAT (VB-11). An evening could have had one where every step a
    learner ticks was ticked and it met at least three new words; the two
    steps the log proves are left out, since they are not always written.
  */
  const [steps, chatRuns] = await Promise.all([
    prisma.courseStep.findMany({ select: { ownerId: true, programmeId: true, dayId: true, stepId: true } }),
    prisma.sceneRun.findMany({
      where: { sceneId: CHAT_ID },
      select: { ownerId: true, transcript: true, endedAt: true },
      orderBy: [{ startedAt: "asc" }, { id: "asc" }],
    }),
  ]);
  const ticked = new Map<string, Set<string>>();
  for (const step of steps) {
    const key = `${step.ownerId}|${step.programmeId}|${step.dayId}`;
    ticked.set(key, (ticked.get(key) ?? new Set<string>()).add(step.stepId));
  }
  const offered: ChatEveningRow[] = [];
  for (const [key, done] of ticked) {
    const [ownerId, programmeId, dayId] = key.split("|") as [string, string, string];
    const programme = programmeById(programmeId);
    const day = programme ? dayById(programme, dayId) : undefined;
    if (!day || newWordsIn(day) < CHAT_MIN_NEW) continue;
    if (day.steps.filter((s) => !s.derived).every((s) => done.has(s.id))) offered.push({ ownerId, dayId });
  }
  const opened: ChatEveningRow[] = [];
  const chats: ChatRun[] = [];
  for (const run of chatRuns) {
    let plan = null;
    try {
      plan = readChatPlan((JSON.parse(run.transcript) as { chat?: unknown }).chat);
    } catch {
      plan = null;
    }
    if (!plan) continue;
    opened.push({ ownerId: run.ownerId, dayId: plan.dayId });
    const programme = programmeById(plan.programmeId);
    const day = programme ? dayById(programme, plan.dayId) : undefined;
    if (run.endedAt && day) {
      chats.push({ ownerId: run.ownerId, dayId: plan.dayId, evening: day.words, asked: plan.words.map((w) => w.lemma), endedAt: run.endedAt });
    }
  }
  // `Review` has no relation to `Lexeme` on purpose, so the lemmas are read apart.
  const chatOwners = [...new Set(chats.map((c) => c.ownerId))];
  const eveningLemmas = [...new Set(chats.flatMap((c) => c.evening))];
  const lexemes = eveningLemmas.length === 0 ? [] : await prisma.lexeme.findMany({
    where: { lemma: { in: eveningLemmas } },
    select: { id: true, lemma: true },
  });
  const lemmaOf = new Map(lexemes.map((l) => [l.id, l.lemma]));
  const wordAnswers = chatOwners.length === 0 || lemmaOf.size === 0 ? [] : await prisma.review.findMany({
    where: { ownerId: { in: chatOwners }, lexemeId: { in: [...lemmaOf.keys()] } },
    select: { ownerId: true, reviewedAt: true, rating: true, lexemeId: true },
    orderBy: [{ reviewedAt: "asc" }, { id: "asc" }],
  });
  const chat = chatReading({
    offered,
    opened,
    chats,
    answers: wordAnswers.flatMap((a) => {
      const lemma = a.lexemeId ? lemmaOf.get(a.lexemeId) : undefined;
      return lemma ? [{ ownerId: a.ownerId, lemma, reviewedAt: a.reviewedAt, rating: a.rating }] : [];
    }),
  });
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
  console.log(out.join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
