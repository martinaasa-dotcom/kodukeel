/**
 * THE SPEECH FIGURES, READ OFF THE WHOLE DEPLOYMENT (docs/44-sixth-batch.md C-3).
 *
 * The queries `npm run report:speech` ran inside the script, moved here so the
 * script and the admin page (`app/(app)/admin/speech/page.tsx`) read one body
 * (D2). The arithmetic is still `lib/stats/speechReport.ts` and
 * `lib/stats/spoken.ts`; this reads the rows. `speechReportLines` is the
 * report, read by both, so the two cannot describe one deployment two ways;
 * the script keeps its own wording of it, exactly as it printed before.
 *
 * The page adds two readings the script never printed, both off rows it
 * already read: conversation turns answered by ear (a line only heard, and
 * met), and the median words in a spoken turn by month, which Progress shows
 * each learner for themselves. Nothing here changes a threshold or a reading
 * (D14): it reads the figures and names nobody.
 */
import { prisma } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/settings/store";
import {
  chatReading, editReading, recallReading, spokenTurnCounts,
  type ChatEveningRow, type ChatReading, type ChatRun, type EditReading, type RecallReading, type SpokenTurn,
} from "@/lib/stats/speechReport";
import { heardTurnsByLevel, spokenLengthByMonth, spokenTurnsOf, type MonthOfTurns, type SpokenTurnRow } from "@/lib/stats/spoken";
import { dayById, newWordsIn, programmeById } from "@/lib/course";
import { CHAT_ID, CHAT_MIN_NEW } from "@/lib/scenes/specs/chat";
import { readChatPlan } from "@/lib/progress/chat";

export interface SpeechReport {
  /** `YYYY-MM-DD`, the day the figures were read. */
  readonly measuredOn: string;
  readonly edits: EditReading;
  readonly recall: RecallReading;
  /** Answers on a card given aloud. */
  readonly spokenAnswers: number;
  readonly chat: ChatReading;
  /** Conversation turns said aloud, from finished and unfinished runs alike. */
  readonly spokenTurns: number;
  /** Spoken turns that answered a line only heard and met it, by the band the run was at. */
  readonly byEar: readonly { readonly level: string; readonly turns: number }[];
  /** Median words in a spoken turn, by UTC month; empty under two months with enough turns. */
  readonly lengthByMonth: readonly MonthOfTurns[];
}

function turnsOf(transcript: string): unknown[] {
  try {
    const parsed = JSON.parse(transcript) as { turns?: unknown };
    return Array.isArray(parsed.turns) ? parsed.turns : [];
  } catch {
    return [];
  }
}

export async function speechReport(now = new Date()): Promise<SpeechReport> {
  const measuredOn = now.toISOString().slice(0, 10);
  const [runs, languages, answers] = await Promise.all([
    prisma.sceneRun.findMany({ select: { ownerId: true, level: true, transcript: true, startedAt: true } }),
    prisma.setting.findMany({ where: { key: SETTING_KEYS.glossLanguage }, select: { ownerId: true, value: true } }),
    prisma.review.findMany({
      select: { ownerId: true, cardId: true, reviewedAt: true, rating: true, spoken: true },
      orderBy: [{ reviewedAt: "asc" }, { id: "asc" }],
    }),
  ]);
  const languageOf = new Map(languages.map((s) => [s.ownerId, s.value]));

  const turns: SpokenTurn[] = [];
  const spokenRows: SpokenTurnRow[] = [];
  for (const run of runs) {
    for (const turn of turnsOf(run.transcript)) {
      const counts = spokenTurnCounts(turn);
      if (counts) turns.push({ band: run.level, glossLanguage: languageOf.get(run.ownerId) ?? "en", ...counts });
    }
    spokenRows.push(...spokenTurnsOf(run.transcript, run.startedAt, run.level));
  }
  const edits = editReading(turns);

  /*
    TODAY'S CHAT (VB-11). An evening could have had one where every step a
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

  return {
    measuredOn,
    edits,
    recall: recallReading(answers),
    spokenAnswers: answers.filter((a) => a.spoken).length,
    chat,
    spokenTurns: spokenRows.length,
    byEar: [...heardTurnsByLevel(spokenRows)]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([level, turns]) => ({ level, turns })),
    // UTC months: this reads the whole deployment, which has no one zone.
    lengthByMonth: spokenLengthByMonth(spokenRows, (at) => at.toISOString().slice(0, 7)),
  };
}
