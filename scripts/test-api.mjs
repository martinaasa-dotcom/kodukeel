import { readFileSync } from "node:fs";

import { baseUrl, suite } from "./lib/checks.mjs";
import { check as fits } from "./lib/jsonSchema.mjs";

/*
  THE v1 CONTRACT, ASKED OF A RUNNING SERVER (ADR-029).

  The unit tests hold the zod schemas, the examples and the baseline to each
  other; none of that says a route really answers in the shape it promises,
  with the headers it promises, behind the door it promises. So this calls
  each route over HTTP the way a client written against
  `public/api/v1.schema.json` would, and checks every answer against that
  file with the same reader the mock uses.

  HTTP only, no browser: nothing here needs a DOM.

  MODE IS DETECTED, AS `test-security.mjs` DOES. With no Supabase keys the app
  is one local learner and a v1 route answers without a token, exactly as a web
  route does; with them, a route that needs one answers 401 without it. Each
  mode checks what it can reach and waives the rest, saying which.

  Every later N item extends this file with its own routes. A route that
  writes is called against the demo deck, which is why this suite runs in the
  shard of suites that write, after the ones that want the fixture as it was.
*/

const B = baseUrl();
const published = JSON.parse(readFileSync("public/api/v1.schema.json", "utf8"));

// Floor: measured against a local-mode build, which is what the browser job runs.
const { check, absent, done } = suite("The v1 API", { floor: 84 });

async function call(method, path, { body, headers = {} } = {}) {
  const res = await fetch(`${B}${path}`, {
    method,
    redirect: "manual",
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON, said by the check that reads it */ }
  return { status: res.status, headers: res.headers, json, text };
}

/** The schema-file problems with an answer, as one line, or an empty string. */
function misfit(key, json) {
  const schema = published.routes[key]?.response;
  if (!schema) return `${key} has no response schema`;
  return fits(json, schema).slice(0, 3).join("; ");
}

function errorShaped(json) {
  return fits(json, published.errors.body).length === 0;
}

// ── Which app is this ────────────────────────────────────────────────────────

const probe = await call("GET", "/api/reminder");
const hosted = probe.status === 401 || probe.status === 307 || probe.status === 302;
console.log(`\n  Looking at a ${hosted ? "hosted" : "local-mode"} deployment (/api/reminder answered ${probe.status}).\n`);

// ── The published contract ───────────────────────────────────────────────────

const file = await call("GET", "/api/v1.schema.json");
check("the published schema is served to somebody with no session", file.status === 200 && file.json?.version === 1, `status ${file.status}`);

// ── GET /api/v1/meta ─────────────────────────────────────────────────────────

const meta = await call("GET", "/api/v1/meta");
check("meta answers with no token", meta.status === 200, `status ${meta.status}`);
check("meta fits its published schema", meta.status === 200 && misfit("GET /api/v1/meta", meta.json) === "", misfit("GET /api/v1/meta", meta.json));
check("meta is never kept", meta.headers.get("cache-control") === "no-store", meta.headers.get("cache-control") ?? "no cache-control");
check("meta says the mode this suite detected", meta.json?.mode === (hosted ? "hosted" : "local"), `meta says ${meta.json?.mode}`);
check("meta sets no cookie", meta.headers.get("set-cookie") === null);
check(
  "meta names no key: every sign-in is a yes or a no",
  meta.json !== null && Object.values(meta.json.signIn ?? {}).every((v) => typeof v === "boolean"),
);

const badBuild = await call("GET", "/api/v1/meta", { headers: { "x-kodukeel-build": "windows/3" } });
check("a build header nobody can read is refused in the error shape", badBuild.status === 400 && errorShaped(badBuild.json) && badBuild.json.error.code === "invalid", `status ${badBuild.status}`);
const goodBuild = await call("GET", "/api/v1/meta", { headers: { "x-kodukeel-build": "ios/999999" } });
check("a build above any minimum is answered", goodBuild.status === 200, `status ${goodBuild.status}`);

// ── No other site may call it ────────────────────────────────────────────────

const preflight = await fetch(`${B}/api/v1/meta`, {
  method: "OPTIONS",
  headers: { origin: "https://elsewhere.example", "access-control-request-method": "GET", "access-control-request-headers": "authorization" },
});
check("no CORS grant is ever sent, so another site's page cannot read a v1 answer", preflight.headers.get("access-control-allow-origin") === null);

// ── GET /api/v1/me ───────────────────────────────────────────────────────────

if (!hosted) {
  const me = await call("GET", "/api/v1/me");
  check("me answers the local learner on a local install", me.status === 200 && me.json?.id === "local-single-user", `status ${me.status}`);
  check("me fits its published schema", misfit("GET /api/v1/me", me.json) === "", misfit("GET /api/v1/me", me.json));
  check("me is never kept", me.headers.get("cache-control") === "no-store");
} else {
  absent(3, "a signed-in token, which a hosted deployment needs and this suite does not mint (the 401 below is checked instead)");
}

// ── N-4: the daily review, graded, and a grade taken back ────────────────────

if (!hosted) {
  const review = await call("GET", "/api/v1/review");
  check("the review sitting answers on a local install", review.status === 200, `status ${review.status}`);
  check("the review sitting fits its published schema", misfit("GET /api/v1/review", review.json) === "", misfit("GET /api/v1/review", review.json));
  check("the review sitting is never kept", review.headers.get("cache-control") === "no-store");

  const cards = review.json?.cards ?? [];
  if (cards.length >= 2) {
    const [first, second] = cards;
    const id = `api-${Date.now()}-a`;
    const grade = { id, cardId: first.id, rating: 3, durationMs: 1800, reviewedAt: Date.now() };
    const graded = await call("POST", "/api/v1/grades", { body: { grades: [grade] } });
    check("a grade is recorded and says what it left the card at",
      graded.status === 200 && graded.json?.settled?.includes(id) && graded.json?.results?.[0]?.scheduling?.reps === first.scheduling.reps + 1,
      `status ${graded.status}, ${JSON.stringify(graded.json)?.slice(0, 200)}`);
    check("the grade's answer fits its published schema", misfit("POST /api/v1/grades", graded.json) === "", misfit("POST /api/v1/grades", graded.json));

    const resent = await call("POST", "/api/v1/grades", { body: { grades: [grade] } });
    check("the same grade sent twice is recorded once and settled both times",
      resent.status === 200 && resent.json?.settled?.includes(id) && resent.json?.results?.length === 0,
      `status ${resent.status}, ${JSON.stringify(resent.json)?.slice(0, 200)}`);

    // A device clock a year out is clamped, never refused: the learner did answer.
    const old = { id: `api-${Date.now()}-b`, cardId: second.id, rating: 3, durationMs: 1500, reviewedAt: Date.now() - 400 * 86_400_000 };
    const backdated = await call("POST", "/api/v1/grades", { body: { grades: [old] } });
    const lastReview = Date.parse(backdated.json?.results?.[0]?.scheduling?.lastReview ?? "");
    check("a grade dated a year back is clamped to the last thirty days",
      backdated.status === 200 && lastReview >= Date.now() - 31 * 86_400_000,
      `status ${backdated.status}, lastReview ${backdated.json?.results?.[0]?.scheduling?.lastReview}`);

    const undone = await call("POST", "/api/v1/grades/undo", { body: { cardId: first.id, previous: first.scheduling } });
    check("a grade is taken back with the scheduling the sitting handed out", undone.status === 200 && undone.json?.undone === true, `status ${undone.status}`);
    check("the undo answer fits its published schema", misfit("POST /api/v1/grades/undo", undone.json) === "", misfit("POST /api/v1/grades/undo", undone.json));
    // And the backdated one too, so the demo deck is left as this suite found it.
    await call("POST", "/api/v1/grades/undo", { body: { cardId: second.id, previous: second.scheduling } });
  } else {
    absent(6, `two cards to grade in today's sitting, and it holds ${cards.length} (run \`npm run demo\` on this database)`);
  }

  const malformed = await call("POST", "/api/v1/grades", { body: { grades: [{ id: "short", cardId: "x", rating: 9 }] } });
  check("a malformed grade is refused in the error shape", malformed.status === 400 && errorShaped(malformed.json) && malformed.json.error.code === "invalid", `status ${malformed.status}`);
  const badUndo = await call("POST", "/api/v1/grades/undo", { body: { cardId: "no-such-card", previous: { due: "x" } } });
  check("an undo with a scheduling nobody can read is refused", badUndo.status === 400 && badUndo.json?.error?.code === "invalid", `status ${badUndo.status}`);
} else {
  absent(11, "a signed-in token, which a hosted deployment needs and this suite does not mint (the 401 below is checked instead)");
}

// ── N-7: today, the lesson, and the part checks ──────────────────────────────

if (!hosted) {
  const today = await call("GET", "/api/v1/today");
  check("today answers on a local install", today.status === 200, `status ${today.status}`);
  check("today fits its published schema", misfit("GET /api/v1/today", today.json) === "", misfit("GET /api/v1/today", today.json));

  const first = "a1-01-hello";
  const lesson = await call("GET", `/api/v1/lessons/${first}`);
  check("a lesson is served as the web's lesson screen receives it",
    lesson.status === 200 && lesson.json?.lesson?.id === first && Array.isArray(lesson.json?.practice),
    `status ${lesson.status}`);
  check("the lesson fits its published schema", misfit("GET /api/v1/lessons/{id}", lesson.json) === "", misfit("GET /api/v1/lessons/{id}", lesson.json));
  const missing = await call("GET", "/api/v1/lessons/no-such-lesson");
  check("a lesson the course does not hold is not found", missing.status === 404 && missing.json?.error?.code === "not_found", `status ${missing.status}`);

  // The last lesson of A1 is never today on the demo learner's evening, so finishing it records nothing.
  const ahead = await call("POST", "/api/v1/lessons/a1-49-invite/finish");
  check("a lesson ahead of today records nothing", ahead.status === 200 && ahead.json?.recorded === false, `status ${ahead.status}, ${ahead.text.slice(0, 120)}`);

  if (today.json?.kind === "lesson" && !today.json.finished) {
    const cardsBefore = (await call("GET", "/api/v1/review")).json?.totalCards ?? 0;
    const done = await call("POST", `/api/v1/lessons/${today.json.lessonId}/finish`);
    const cardsAfter = (await call("GET", "/api/v1/review")).json?.totalCards ?? 0;
    check("today's lesson finished is recorded, and its words are cards",
      done.status === 200 && done.json?.recorded === true && cardsAfter >= cardsBefore,
      `status ${done.status}, recorded ${done.json?.recorded}, cards ${cardsBefore} then ${cardsAfter}`);
    const after = await call("GET", "/api/v1/today");
    check("today then says the lesson is done", after.json?.kind !== "lesson" || after.json.finished === true || after.json.lessonId !== today.json.lessonId,
      JSON.stringify(after.json));
  } else {
    absent(2, `today being a lesson not yet finished, and today is ${JSON.stringify(today.json)}`);
  }

  const checkId = "check-a1.1";
  const paper = await call("GET", `/api/v1/checks/${checkId}?attempt=7`);
  check("a check's paper is served for the attempt asked", paper.status === 200 && paper.json?.attempt === 7 && paper.json?.items?.length > 0, `status ${paper.status}`);
  check("the paper fits its published schema", misfit("GET /api/v1/checks/{id}", paper.json) === "", misfit("GET /api/v1/checks/{id}", paper.json));
  if (paper.status === 200) {
    const failed = await call("POST", `/api/v1/checks/${checkId}`, { body: { attempt: 7, responses: paper.json.items.map(() => null) } });
    check("an attempt with nothing answered is marked and not passed", failed.status === 200 && failed.json?.passed === false && failed.json?.score === 0, `status ${failed.status}`);
    check("the mark fits its published schema", misfit("POST /api/v1/checks/{id}", failed.json) === "", misfit("POST /api/v1/checks/{id}", failed.json));
    const next = await call("GET", `/api/v1/checks/${checkId}?attempt=8`);
    const passed = await call("POST", `/api/v1/checks/${checkId}`, { body: { attempt: 8, responses: next.json.items.map((item) => item.answer) } });
    check("the next attempt answered right passes", passed.status === 200 && passed.json?.passed === true, `status ${passed.status}, ${passed.text.slice(0, 120)}`);
    const mismatch = await call("POST", `/api/v1/checks/${checkId}`, { body: { attempt: 8, responses: [null] } });
    check("responses that do not fit the paper are refused", mismatch.status === 400 && mismatch.json?.error?.code === "invalid", `status ${mismatch.status}`);
  } else {
    absent(4, "a check paper to sit, which the request above did not return");
  }
  /*
    Not asked here, and why: a lesson read in Russian and the refusal to skip a
    part without its check both need the learner's settings changed over HTTP,
    which is `PATCH /api/v1/me` (N-8). `lib/api/today.test.ts` holds the A2
    answer, and `lib/api/lessonText.test.ts` the translations beside a lesson.
  */
} else {
  absent(14, "a signed-in token, which a hosted deployment needs and this suite does not mint (the 401 below is checked instead)");
}

// ── Conversations (N-5) ──────────────────────────────────────────────────────

/*
  One scene from the situations list and one lesson's own role-play, each
  played to its end over the v1 doors alone and finished, the way a client
  would: every turn so far is sent with every request, the answer's `beatId`
  goes back on the next turn, and what the answer concedes is written onto the
  turn that earned it. The client keeps the conversation and the server keeps
  nothing between turns. Keyless, as this suite's server runs, so every line
  comes from the bank.
*/
async function playOverHttp(sceneId) {
  const opened = await call("POST", "/api/v1/scenes", { body: { sceneId, difficulty: "textbook", level: "A1" } });
  if (opened.status !== 200) return { opened, turnsFit: false, over: false, finished: null, help: null };
  const runId = opened.json.runId;
  const sent = [];
  const used = [];
  let last = null;
  let heard = "";
  let turnsFit = true;
  let misfitSeen = "";
  let help = null;
  const asked = [];
  for (let n = 0; n <= 40; n += 1) {
    if (n > 0) {
      const pick = last?.picks?.[0];
      sent.push({ beatId: last?.beatId ?? "", said: pick?.et ?? "Jah.", heard, ...(pick ? { picked: true } : {}) });
    }
    if (n === 1) {
      help = await call("POST", `/api/v1/scenes/${runId}/help`, { body: { turns: sent.slice(0, -1) } });
      if (help.status === 200) asked.push({ lemma: help.json.lemma, lexemeId: help.json.lexemeId });
    }
    const answered = await call("POST", `/api/v1/scenes/${runId}/turns`, { body: { turns: sent, used } });
    const wrong = answered.status === 200 ? misfit("POST /api/v1/scenes/{runId}/turns", answered.json) : `status ${answered.status}`;
    if (wrong) { turnsFit = false; misfitSeen ||= wrong; break; }
    last = answered.json;
    for (const line of last.lines) used.push(line.text);
    const spoken = last.lines.filter((l) => !["unspoken", "meanwhile", "coach"].includes(l.provenance));
    if (spoken.length > 0) heard = spoken[spoken.length - 1].text;
    const at = sent.length - 1;
    if (at >= 0 && last.conceded?.length) sent[at] = { ...sent[at], conceded: last.conceded };
    if (at >= 0 && last.alsoDone?.length) sent[at] = { ...sent[at], alsoDone: last.alsoDone };
    if (last.over) break;
  }
  const finished = await call("POST", `/api/v1/scenes/${runId}/finish`, { body: { turns: sent, walkedOut: !last?.over, asked } });
  return { opened, turnsFit, misfitSeen, over: last?.over === true, finished, help, turns: sent.length };
}

if (!hosted) {
  const scene = await playOverHttp("poodi-piima");
  check("a scene opens over v1", scene.opened.status === 200, `status ${scene.opened.status}, ${scene.opened.text.slice(0, 120)}`);
  check("the opened scene fits its published schema", misfit("POST /api/v1/scenes", scene.opened.json) === "", misfit("POST /api/v1/scenes", scene.opened.json));
  check("every turn of it fits its published schema", scene.turnsFit, scene.misfitSeen);
  check("the scene is played to its end", scene.over, `${scene.turns} turns sent and not over`);
  check("the help button hands over a word, or says the beat has none",
    scene.help !== null && ((scene.help.status === 200 && misfit("POST /api/v1/scenes/{runId}/help", scene.help.json) === "") || scene.help.status === 404),
    `status ${scene.help?.status}`);
  check("the scene is finished and its review fits the schema",
    scene.finished?.status === 200 && misfit("POST /api/v1/scenes/{runId}/finish", scene.finished.json) === "",
    `status ${scene.finished?.status}, ${misfit("POST /api/v1/scenes/{runId}/finish", scene.finished?.json)}`);

  const lesson = await playOverHttp("a1-trepil");
  check("a lesson's role-play opens over v1 by the id the web takes", lesson.opened.status === 200, `status ${lesson.opened.status}`);
  check("the lesson's role-play is played to its end, every turn in its schema", lesson.over && lesson.turnsFit, lesson.misfitSeen || `${lesson.turns} turns sent`);
  check("the lesson's role-play is finished and its review fits the schema",
    lesson.finished?.status === 200 && misfit("POST /api/v1/scenes/{runId}/finish", lesson.finished.json) === "",
    `status ${lesson.finished?.status}`);

  const stranger = await call("POST", "/api/v1/scenes/no-such-run/turns", { body: { turns: [] } });
  check("a turn on a run that is not the learner's is not found", stranger.status === 404 && stranger.json?.error?.code === "not_found", `status ${stranger.status}`);
  const unknown = await call("POST", "/api/v1/scenes", { body: { sceneId: "no-such-scene", difficulty: "textbook" } });
  check("a scene nobody wrote is not found", unknown.status === 404 && errorShaped(unknown.json), `status ${unknown.status}`);

  const chat = await call("POST", "/api/v1/chat", { body: { level: "A1" } });
  check("today's chat is offered only where a model can play it",
    (chat.status === 503 && chat.json?.error?.code === "switched_off") || (chat.status === 200 && misfit("POST /api/v1/chat", chat.json) === "") || chat.status === 404,
    `status ${chat.status}, ${chat.text.slice(0, 120)}`);
} else {
  absent(12, "a signed-in token, which a hosted deployment needs and this suite does not mint (the 401 below is checked instead)");
}

// ── N-6: words and sound ─────────────────────────────────────────────────────

/*
  The recordings are public, so they are asked in either mode. Everything else
  here needs the local learner, and writes to the demo deck only what it then
  takes back: a star is unstarred and a word put aside is brought back.
*/
const recordings = await call("GET", "/api/v1/recordings");
check("the native recordings are listed to somebody with no token", recordings.status === 200, `status ${recordings.status}`);
check("the recordings fit their published schema", misfit("GET /api/v1/recordings", recordings.json) === "", misfit("GET /api/v1/recordings", recordings.json));
const clips = recordings.json?.clips ?? [];
check(
  "every clip plays at its own speed from the app's own files",
  clips.length > 0 && clips.every((c) => c.atOwnSpeed === true && c.src.startsWith("/audio/native/")),
  `${clips.length} clips`,
);
const firstClip = clips.find((c) => c.key !== null);
const clipFile = firstClip ? await fetch(`${B}${firstClip.src}`) : null;
check("a listed clip is served where the list says", clipFile?.status === 200, `status ${clipFile?.status} for ${firstClip?.src}`);

if (!hosted) {
  const search = await call("GET", "/api/v1/dictionary?q=toas");
  check("a search answers on a local install", search.status === 200, `status ${search.status}`);
  check("the search fits its published schema", misfit("GET /api/v1/dictionary", search.json) === "", misfit("GET /api/v1/dictionary", search.json));
  check("the search is never kept", search.headers.get("cache-control") === "no-store");
  const tuba = (search.json?.hits ?? []).find((h) => h.lemma === "tuba");
  check("an inflected form finds its headword, as the dictionary page does", tuba !== undefined, JSON.stringify(search.json)?.slice(0, 200));
  const blank = await call("GET", "/api/v1/dictionary");
  check("a search with nothing typed is refused in the error shape", blank.status === 400 && errorShaped(blank.json), `status ${blank.status}`);

  if (tuba) {
    const entry = await call("GET", `/api/v1/words/${tuba.id}`);
    check("an entry is served with its forms and sentences", entry.status === 200 && entry.json?.lemma === "tuba" && entry.json?.forms?.length > 0, `status ${entry.status}`);
    check("the entry fits its published schema", misfit("GET /api/v1/words/{id}", entry.json) === "", misfit("GET /api/v1/words/{id}", entry.json));

    const star = await call("POST", "/api/v1/deck", { body: { action: "star", lexemeId: tuba.id } });
    check("a word is starred", star.status === 200 && star.json?.starred === true, `status ${star.status}`);
    check("the deck answer fits its published schema", misfit("POST /api/v1/deck", star.json) === "", misfit("POST /api/v1/deck", star.json));
    const unstar = await call("DELETE", "/api/v1/deck", { body: { action: "star", lexemeId: tuba.id } });
    check("and unstarred again", unstar.status === 200 && unstar.json?.action === "unstar" && unstar.json?.starred === false, `status ${unstar.status}`);

    const aside = await call("POST", "/api/v1/deck", { body: { action: "aside", lexemeId: tuba.id, context: "review" } });
    check("a word is put aside and the answer says until when", aside.status === 200 && aside.json?.aside?.days > 0, `status ${aside.status}, ${aside.text.slice(0, 160)}`);
    const back = await call("DELETE", "/api/v1/deck", { body: { action: "aside", lexemeId: tuba.id } });
    check("and brought back", back.status === 200 && back.json?.action === "back", `status ${back.status}`);

    const kept = await call("POST", "/api/v1/deck", { body: { action: "keep", lexemeId: tuba.id, types: ["RECOGNITION"] } });
    check("a word is kept, and the answer counts the cards it added", kept.status === 200 && Number.isInteger(kept.json?.added), `status ${kept.status}`);
  } else {
    absent(8, "the dictionary finding tuba for toas, which needs the seeded dictionary (`npm run db:seed`)");
  }
  const missingWord = await call("GET", "/api/v1/words/no-such-entry");
  check("an entry the dictionary does not hold is not found", missingWord.status === 404 && missingWord.json?.error?.code === "not_found", `status ${missingWord.status}`);
  const badDeck = await call("POST", "/api/v1/deck", { body: { action: "burn", lexemeId: "x" } });
  check("a deck action nobody wrote is refused", badDeck.status === 400 && badDeck.json?.error?.code === "invalid", `status ${badDeck.status}`);

  const forms = await call("POST", "/api/v1/speech/forms", { body: { words: ["toas", "xqzvw"] } });
  check(
    "the forms list says which heard spellings are Estonian",
    forms.status === 200 && misfit("POST /api/v1/speech/forms", forms.json) === "" && forms.json.known.includes("toas") && !forms.json.known.includes("xqzvw"),
    `status ${forms.status}, ${forms.text.slice(0, 160)}`,
  );

  /*
    Speech calls TartuNLP on a cache miss, a free service this suite does not
    control. A clip or the 503 `upstream` refusal are both honest answers; what
    may not happen is anything else.
  */
  const clip = await call("POST", "/api/v1/tts", { body: { text: "tere" } });
  check(
    "a clip is audio that is never kept, or the speech service is said to be down",
    (clip.status === 200 && clip.headers.get("content-type") === "audio/wav" && clip.headers.get("cache-control") === "no-store")
      || (clip.status === 503 && errorShaped(clip.json)),
    `status ${clip.status}, ${clip.headers.get("content-type")}`,
  );
  const noText = await call("POST", "/api/v1/tts", { body: { text: "" } });
  check("a clip with nothing to say is refused before anything is asked", noText.status === 400 && noText.json?.error?.code === "invalid", `status ${noText.status}`);

  const lessonView = await call("GET", "/api/v1/lessons/a1-01-hello");
  check(
    "a lesson names which part of its conversation the native speaker recorded",
    lessonView.status === 200 && (lessonView.json?.nativePart === null || typeof lessonView.json?.nativePart === "string"),
    `nativePart ${JSON.stringify(lessonView.json?.nativePart)}`,
  );
} else {
  absent(19, "a signed-in token, which a hosted deployment needs and this suite does not mint (the 401 below is checked instead)");
}

// ── N-10: Anu and the scanner ────────────────────────────────────────────────

/*
  NOTHING HERE BOOKS A MODEL CALL UNLESS THE MODELS ARE STUBBED. A question to
  Anu and a photograph each spend on a paid provider, so with no stub this asks
  only what is refused before the ledger is reached. To ask the rest, start the
  server with `scripts/lib/stub-models.mjs` preloaded (its header says how) and
  run this with `KODUKEEL_STUB_MODELS=1`.
*/
const stubbed = process.env.KODUKEEL_STUB_MODELS === "1";
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

if (!hosted) {
  const empty = await call("POST", "/api/v1/tutor", { body: { messages: [] } });
  check("a question with nothing in it is refused before a call is booked", empty.status === 400 && empty.json?.error?.code === "invalid", `status ${empty.status}`);
  const notAPicture = await call("POST", "/api/v1/scan", { body: { image: "not a picture" } });
  // With no model at all the scanner says so before it looks at the picture.
  check(
    "a photograph nobody can read is refused before a call is booked",
    errorShaped(notAPicture.json) && (notAPicture.status === 400 || (notAPicture.status === 503 && notAPicture.json.error.code === "switched_off")),
    `status ${notAPicture.status}`,
  );

  const saved = await call("POST", "/api/v1/scans", { body: { title: "api suite", items: [{ et: "raamat", en: "book" }] } });
  check("a ticked word list is kept, vouched for again on the server", saved.status === 200 && saved.json?.words === 1, `status ${saved.status}, ${saved.text.slice(0, 160)}`);
  check("the kept list fits its published schema", misfit("POST /api/v1/scans", saved.json) === "", misfit("POST /api/v1/scans", saved.json));
  const toDeck = saved.json?.id ? await call("POST", `/api/v1/scans/${saved.json.id}/deck`) : null;
  check("a kept list goes into the deck", toDeck?.status === 200 && misfit("POST /api/v1/scans/{id}/deck", toDeck.json) === "", `status ${toDeck?.status}`);

  if (stubbed) {
    const asked = await call("POST", "/api/v1/tutor", { body: { messages: [{ role: "user", content: "How do I say hello?" }] } });
    check("Anu answers one question, streamed as text", asked.status === 200 && asked.text.includes("stubbed answer"), `status ${asked.status}, ${asked.text.slice(0, 160)}`);
    check("the answer names the model that wrote it", Boolean(asked.headers.get("x-model-provider")) && Boolean(asked.headers.get("x-model-id")));
    check("the answer is never kept", asked.headers.get("cache-control") === "no-store");
    const read = await call("POST", "/api/v1/scan", { body: { image: PIXEL } });
    check("a photograph is read and fits its published schema", read.status === 200 && misfit("POST /api/v1/scan", read.json) === "", `status ${read.status}, ${misfit("POST /api/v1/scan", read.json)}`);
    check("the dictionary vouches for what the stub read", (read.json?.items ?? []).some((i) => i.et === "raamat" && i.lexemeId !== null), JSON.stringify(read.json)?.slice(0, 200));
  } else {
    absent(5, "a stubbed model, which this run was not given (preload scripts/lib/stub-models.mjs and set KODUKEEL_STUB_MODELS=1)");
  }
} else {
  absent(10, "a signed-in token, which a hosted deployment needs and this suite does not mint (the 401 below is checked instead)");
}

// ── Every route that needs a token refuses without one ────────────────────────

const needsToken = Object.values(published.routes).filter((r) => r.auth && !r.draft);
if (hosted) {
  for (const route of needsToken) {
    const path = route.path.replace(/\{\w+\}/g, "x");
    const res = await call(route.method, path, route.request ? { body: {} } : {});
    check(`${route.method} ${route.path} answers 401 unauthenticated with no token`, res.status === 401 && res.json?.error?.code === "unauthenticated", `status ${res.status}`);
  }
} else {
  absent(needsToken.length, "a hosted deployment, where a route refuses a request with no token (local mode has one learner and no tokens)");
}

done();
