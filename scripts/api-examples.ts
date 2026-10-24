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
const { LESSONS, ledgersBefore, practiceFor, reviewFor } = await import("../lib/course/lessons");
const { PROGRAMMES, programmeAfter, programmeById } = await import("../lib/course");
const { courseChecks, checkPaper } = await import("../lib/course/checks");
const { CHECK_PASS, markCheck } = await import("../lib/course/lessons/practice");
const { NATIVE_CLIPS, nativeFor, nativeUrl } = await import("../lib/audio/native");
const { reviewQueue } = await import("../app/(app)/review/queue");
const { withChoices } = await import("../app/(app)/review/cards");
const { meaningPrefsFrom } = await import("../lib/collections/glossLanguage");

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
const queue = await reviewQueue(LOCAL_USER_ID, null, now);
const cards = await withChoices(queue.cards.slice(0, 2), meaningPrefsFrom(undefined, undefined), LOCAL_USER_ID, null);
write("get-review.json", {
  builtAt: now.toISOString(),
  cards,
  totalCards: await prisma.card.count({ where: { ownerId: LOCAL_USER_ID } }),
  mode: "type",
  nextDue: null,
  waitingOnCourse: false,
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
const before = ledgersBefore(LESSONS).get(lesson.id)!;
const after = LESSONS[1];
const ofLevel = LESSONS.filter((l) => l.level === lesson.level);
write("get-today.json", { kind: "lesson", lessonId: lesson.id, finished: false });
write("get-lessons-id.json", {
  lesson,
  practice: practiceFor(lesson, before),
  review: reviewFor(lesson, before),
  next: after && after.level === lesson.level ? { id: after.id, title: after.title } : null,
  scene: null,
  place: { at: ofLevel.indexOf(lesson) + 1, of: ofLevel.length },
  name: null,
  due: queue.due.length,
  check: null,
  locale: "en",
  translations: {},
});
write("post-lessons-id-finish.json", { recorded: true });

const check = courseChecks(PROGRAMMES)[0]!;
const paper = checkPaper(check, 1);
const part = programmeById(check.programmeId)!;
const next = programmeAfter(part);
write("get-checks-id.json", {
  checkId: check.id,
  attempt: 1,
  final: check.final,
  items: paper,
  needed: Math.ceil(paper.length * CHECK_PASS),
  alreadyPassed: false,
  next: next ? { id: next.id, label: next.id.toUpperCase() } : null,
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

const scene = { runId: "4f0c9a52-7d0e-4c43-8a0b-2f1d3c4b5a69", briefing: { sceneId: "poodi-piima" }, plays: null, composed: false };
write("post-scenes.json", scene);
write("post-chat.json", scene);
const greeting = lesson.conversation[0]!;
write("post-scenes-runid-turns.json", {
  lines: [{ who: "them", text: greeting.et ?? "", lang: "et", provenance: "scripted" }],
  objectives: [{ goal: "Say hello.", done: true }],
  finished: false,
  composedBy: null,
  modelDown: false,
});
write("post-scenes-runid-help.json", { hint: "Say hello back.", lines: [] });
write("post-scenes-runid-finish.json", { recap: { headline: "Every turn was understood." } });

await prisma.$disconnect();
}

void main();
