/**
 * Writes one real answer for every v1 route into `lib/api/examples/`, out of
 * the demo history (`npm run db:seed && npm run demo`) and the shipped course.
 *
 *   npm run api:examples
 *
 * The examples are what `scripts/api-mock.mjs` answers with and what a native
 * developer builds a screen against before a route exists, so each one is made
 * by the function the route itself calls wherever that function exists, and
 * `lib/api/contract.test.ts` holds every file to its route's schema. A route
 * whose body is not built yet gets a small answer in its draft shape, put
 * together from the same dictionary and course rows, never from Estonian
 * written here (ADR-005).
 *
 * Local only: it reads the database `DATABASE_URL` names, which the guard
 * holds to this machine.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { requireLocalDatabase } from "./lib/local-db.mjs";

requireLocalDatabase("write the API examples");

async function main() {
const { prisma } = await import("../lib/db");
const { LOCAL_USER_ID } = await import("../lib/auth/mode");
const { buildMeta } = await import("../lib/api/meta");
const { LESSONS } = await import("../lib/course/lessons");
const { PROGRAMMES } = await import("../lib/course");
const { courseChecks } = await import("../lib/course/checks");
const { markCheck } = await import("../lib/course/lessons/practice");
const { lessonView } = await import("../lib/progress/lessonView");
const { checkView } = await import("../lib/progress/lessons");
const { translationsOf } = await import("../lib/api/lessonText");
const { tr } = await import("../lib/copy/locale");
const { NATIVE_CLIPS, nativeFor, nativeUrl } = await import("../lib/audio/native");
const { dailyReview } = await import("../lib/progress/dailyQueue");

const DIR = "lib/api/examples";
mkdirSync(DIR, { recursive: true });
const write = (file: string, value: unknown) => {
  writeFileSync(join(DIR, file), `${JSON.stringify(value, null, 2)}\n`);
  console.log(`Wrote ${file}.`);
};

// ── Shipped and built from the real function ────────────────────────────────

write("get-meta.json", buildMeta({
  env: { NEXT_PUBLIC_GOOGLE_CLIENT_ID: "example", NATIVE_MIN_BUILD_IOS: "12" },
  speech: { modelBase: "/asr/model", unavailable: null },
  sso: false,
  hosted: true,
}));

// ── The review ──────────────────────────────────────────────────────────────

const now = new Date();
// The route's own body, cut to two cards so the example stays readable.
const sitting = await dailyReview(LOCAL_USER_ID, null, now);
const cards = sitting.cards.slice(0, 2);
write("get-review.json", {
  builtAt: now.toISOString(),
  cards,
  totalCards: sitting.totalCards,
  mode: sitting.mode,
  nextDue: sitting.nextDue ? { at: sitting.nextDue.at.toISOString(), line: sitting.nextDue.line } : null,
  waitingOnCourse: sitting.waitingOnCourse,
});
const graded = cards[0];
write("post-grades.json", {
  settled: ["b6f1c0de-0001-4c4e-9a11-1a2b3c4d5e6f"],
  results: graded
    ? [{ id: "b6f1c0de-0001-4c4e-9a11-1a2b3c4d5e6f", cardId: graded.id, scheduling: graded.scheduling }]
    : [],
});
write("post-grades-undo.json", { undone: true });

// ── Today's lesson and the checks ───────────────────────────────────────────

const lesson = LESSONS[0]!;
write("get-today.json", { kind: "lesson", lessonId: lesson.id, finished: false });
// The route's own body, read in Russian so the example shows the table beside the lesson.
const view = (await lessonView(LOCAL_USER_ID, lesson.id, now))!;
write("get-lessons-id.json", {
  ...view,
  locale: "ru",
  translations: translationsOf([view.lesson, view.practice, view.review, view.next], (english) => tr("ru", english)),
});
write("post-lessons-id-finish.json", { recorded: true });

const check = courseChecks(PROGRAMMES)[0]!;
const sat = (await checkView(LOCAL_USER_ID, check.id, 1))!;
const paper = sat.paper;
write("get-checks-id.json", {
  checkId: sat.check.id,
  attempt: sat.attempt,
  final: sat.check.final,
  items: paper,
  needed: sat.needed,
  alreadyPassed: sat.alreadyPassed,
  next: sat.next ? { id: sat.next.id, label: sat.next.id.toUpperCase() } : null,
});
const marked = markCheck(paper, paper.map((item) => item.answer));
write("post-checks-id.json", { score: marked.score, total: marked.total, passed: marked.passed, marks: marked.marks });

// ── Who is asking, and the account ──────────────────────────────────────────

const me = { id: LOCAL_USER_ID, name: "you", email: null, locale: "en" };
write("get-me.json", me);
write("patch-me.json", me);
write("delete-me.json", { deleted: true, identityErased: true });
write("get-export.json", { format: "kodukeel-backup", exportedAt: now.toISOString(), cards: [], reviews: [] });

// ── Words and sound ─────────────────────────────────────────────────────────

const word = await prisma.lexeme.findFirst({
  where: { lemma: "tuba", pos: "NOUN" },
  select: { id: true, lemma: true, pos: true, translation: true, cefr: true, government: true, forms: { select: { formType: true, value: true }, orderBy: [{ formType: "asc" }, { value: "asc" }] } },
});
if (word) {
  const hit = { lexemeId: word.id, lemma: word.lemma, pos: word.pos, gloss: word.translation, cefr: word.cefr };
  write("get-dictionary.json", { hits: [hit], formOf: [] });
  write("get-words-id.json", {
    ...hit,
    forms: word.forms.slice(0, 4).map((f) => ({ slot: f.formType, value: f.value, origin: "stored" })),
    sentences: [],
    government: word.government,
    equivalents: { ru: null, uk: null },
    inDeck: false,
    starred: false,
  });
  write("post-deck.json", { added: 2, starred: false, aside: false });
  write("post-speech-forms.json", { estonian: [word.lemma] });
}
write("get-tts.json", { contentType: "audio/wav", note: "The body is a WAV clip, not JSON." });
write("get-recordings.json", {
  clips: NATIVE_CLIPS.slice(0, 3).map((clip) => ({
    id: clip.id,
    src: nativeUrl(clip.id),
    key: nativeFor(clip.text)?.id === clip.id ? clip.text : null,
    atOwnSpeed: true,
  })),
});

// ── Conversations ───────────────────────────────────────────────────────────

/*
  One conversation played keyless through the functions the routes call: opened,
  its opening line, one turn picked off what the other side offered, a word
  asked for, and finished. The run is the local learner's and is deleted again,
  so the demo history is as it was. Today's chat needs a model, which this
  script never has, so its example is the same briefing with `composed` true,
  which is the one field a chat always answers differently.
*/
{
  const { beginSceneFor, finishSceneFor, sceneHelpFor } = await import("../lib/progress/sceneRuns");
  const { sceneTurnFor } = await import("../lib/progress/sceneRequest");
  const later = (task: () => unknown) => { void Promise.resolve().then(task).catch(() => {}); };
  const opened = await beginSceneFor(LOCAL_USER_ID, "kohvikus", "textbook", "A1");
  if (!opened.ok) throw new Error(`the example scene did not open: ${opened.error}`);
  const { ok: _opened, ...briefing } = opened;
  write("post-scenes.json", briefing);
  write("post-chat.json", { ...briefing, composed: true });
  const first = await sceneTurnFor(LOCAL_USER_ID, { runId: opened.runId, turns: [], used: [] }, later);
  if (!first.ok) throw new Error(`the example scene did not answer: ${first.message}`);
  const firstBody = first.body as { beatId: string | null; picks: { et: string }[]; lines: { text: string }[] };
  const sent = [{ beatId: firstBody.beatId ?? "", said: firstBody.picks[0]?.et ?? "", helped: false, heard: firstBody.lines[0]?.text ?? "" }];
  const second = await sceneTurnFor(LOCAL_USER_ID, { runId: opened.runId, turns: sent, used: firstBody.lines.map((l) => l.text) }, later);
  if (!second.ok) throw new Error(`the example scene did not answer: ${second.message}`);
  write("post-scenes-runid-turns.json", second.body);
  const help = await sceneHelpFor(LOCAL_USER_ID, opened.runId, sent);
  if (help.ok) {
    const { ok: _help, ...word } = help;
    write("post-scenes-runid-help.json", word);
  }
  const finished = await finishSceneFor(LOCAL_USER_ID, { runId: opened.runId, turns: sent, walkedOut: true, asked: [] });
  if (!finished.ok) throw new Error(`the example scene did not finish: ${finished.error}`);
  const { ok: _finished, ...debrief } = finished;
  write("post-scenes-runid-finish.json", debrief);
  await prisma.sceneGap.deleteMany({ where: { runId: opened.runId } });
  await prisma.sceneRun.deleteMany({ where: { id: opened.runId } });
}

await prisma.$disconnect();
}

void main();
