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
const { nativePart } = await import("../lib/audio/native");
const { dailyReview } = await import("../lib/progress/dailyQueue");
const { searchDictionary } = await import("../lib/progress/dictionarySearch");
const { openEntry } = await import("../lib/progress/dictionaryEntry");
const { heardSpellings } = await import("../lib/progress/speechForms");
const { recordingsList } = await import("../lib/api/recordings");
const { resolveScannedItems } = await import("../lib/dict/resolveScan");
const { summarise } = await import("../lib/scan/items");

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
  nativePart: nativePart(view.lesson.conversation),
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

// The routes' own bodies: a search, the entry it opens, and the catalog.
const searched = await searchDictionary(LOCAL_USER_ID, "toas");
write("get-dictionary.json", { hits: searched.hits.slice(0, 3), knownAs: searched.knownAs, fetched: searched.fetched });
const opened = searched.hits[0]
  ? (await openEntry(LOCAL_USER_ID, searched.hits[0].id, { countAnswer: false, dictionaryOnly: true })).entry
  : null;
if (opened) {
  // Cut to a few forms and sentences so the example stays readable.
  write("get-words-id.json", { ...opened, forms: opened.forms.slice(0, 6), examples: opened.examples.slice(0, 2) });
}
write("post-deck.json", { action: "keep", added: 3, starred: null, aside: null });
write("delete-deck.json", { action: "unstar", added: 0, starred: false, aside: null });
write("post-speech-forms.json", await (async () => {
  const answer = await heardSpellings({ words: ["tere", "toas", "hommikust", "blorp"] });
  return answer.ok ? { known: answer.known, asked: answer.asked } : { known: [], asked: [] };
})());
write("post-tts.json", { contentType: "audio/wav", note: "The body is a WAV clip, not JSON. `x-tts-cache` names which store answered." });
const recordings = recordingsList();
write("get-recordings.json", {
  // Two played by id and two found by spelling, so the example shows both.
  clips: [
    ...recordings.clips.filter((c) => c.key === null).slice(0, 2),
    ...recordings.clips.filter((c) => c.key !== null).slice(0, 2),
  ],
});

// ── Anu and the scanner ─────────────────────────────────────────────────────

write("post-tutor.json", {
  contentType: "text/plain; charset=utf-8",
  note: "The body is Anu's reply as UTF-8 text, streamed. `x-model-provider` and `x-model-id` name the model that answered.",
});
// A page read, as `readScan` hands it on: the dictionary's own rows for two words, and one it would not vouch for.
const read = await resolveScannedItems([{ et: "toas", en: "" }, { et: "kohv", en: "coffee" }, { et: "blorp", en: "" }]);
write("post-scan.json", { items: read, summary: summarise(read) });
write("post-scans.json", { id: "7c1d0e2a-5b9f-4e3a-8c6d-1f2e3a4b5c6d", words: read.length, cards: 4, created: 1 });
write("post-scans-id-deck.json", { added: 2, words: read.length });

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
