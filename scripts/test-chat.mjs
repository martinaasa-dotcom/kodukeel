#!/usr/bin/env node
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { eventually, launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";

/**
 * TONIGHT'S CHAT, WALKED, WITH A STAND-IN FOR THE MODEL
 * (docs/41-fifth-batch.md, VB-11).
 *
 * Two halves, because the item's "done" has two halves. A deployment with no
 * model never shows the chat: asked of the server every other suite runs
 * against, which in CI and on a developer's wrapper is keyless, after an
 * evening that would otherwise offer one. And an evening ends with an offered
 * chat about its own words: asked of a server this suite starts itself, on a
 * spare port, with a provider key that is a placeholder and the scene chain's
 * one host answered inside the process by `scripts/lib/stub-model.mjs`, so
 * nothing is spent and nothing leaves the machine.
 *
 * What only a browser can say, and the unit tests cannot: that the offer sits
 * under the finished evening, that the chat opens on the evening's own words,
 * that a line saying the word for the learner never reaches the screen (the
 * stub says it on every first attempt, and the gate has to withhold it), that
 * each word typed meets its objective, that the goodbye ends it on the
 * debrief, and that the second chat opens by remembering the first.
 *
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm start
 *   node scripts/test-chat.mjs
 *
 * It ticks an evening and deletes what it wrote, and the learner's own course
 * is put back as it was found. `requireLocalDatabase` guards that.
 */
const B = baseUrl();
const PORT = Number(process.env.CHAT_SUITE_PORT ?? 3198);
const S = `http://localhost:${PORT}`;
const OWNER = "local-single-user";
const TURN_MS = 30_000;

const { check, done, absent } = suite("Today's chat", {
  /*
    Two keyless checks, five on the offer and the briefing, and per word one
    objective met and one line clean of the word, then the goodbye, the
    debrief, the grades and the memory. The evening this ticks is the first
    built out of units, B1.1 since A2 became lessons, and asks five words.
    Three more ask that a composed line can be reported (R-2a), and two that
    one of Anu's answers can, so the floor moved from 27 to 32.
  */
  floor: 32,
});

const prisma = newPrismaClient();
await requireLocalDatabase(prisma);

/** Which evening to finish, off the course itself (`scripts/lib/chatEvening.ts`). */
const evening = JSON.parse(execFileSync("npx", ["tsx", "scripts/lib/chatEvening.ts"], { encoding: "utf8" }));

/* The learner's course and chats as found, so they are put back. */
const keptSteps = await prisma.courseStep.findMany({ where: { ownerId: OWNER } });
const keptProgramme = await prisma.setting.findUnique({ where: { ownerId_key: { ownerId: OWNER, key: "programme" } } });
const chatsBefore = new Set((await prisma.sceneRun.findMany({ where: { ownerId: OWNER, sceneId: "chat" }, select: { id: true } })).map((r) => r.id));

/** Every step of every evening up to the chosen one, ticked now: that evening was finished tonight. */
async function finishEvening() {
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await prisma.setting.upsert({
    where: { ownerId_key: { ownerId: OWNER, key: "programme" } },
    create: { ownerId: OWNER, key: "programme", value: evening.programmeId },
    update: { value: evening.programmeId },
  });
  await prisma.courseStep.createMany({
    data: evening.days.flatMap((day) => day.steps.map((stepId) => ({
      ownerId: OWNER, programmeId: evening.programmeId, dayId: day.id, stepId,
    }))),
  });
  /*
    Meeting the words is what puts them in the deck, and a tick written here
    meets nothing, so the production card a chat grades is made for each of the
    evening's words the deck does not already hold, and taken off again after.
  */
  const lexemes = await prisma.lexeme.findMany({
    where: { lemma: { in: evening.words } },
    select: { id: true, lemma: true, translation: true },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  for (const lexeme of lexemes) {
    const held = await prisma.card.count({ where: { ownerId: OWNER, lexemeId: lexeme.id, cardType: "PRODUCTION" } });
    if (held > 0) continue;
    const card = await prisma.card.create({
      data: { ownerId: OWNER, lexemeId: lexeme.id, cardType: "PRODUCTION", front: lexeme.translation, back: lexeme.lemma, source: "COURSE" },
      select: { id: true },
    });
    madeCards.push(card.id);
  }
}

/** The cards this suite made, so it takes off exactly those. */
const madeCards = [];

async function putBack() {
  const mine = (await prisma.sceneRun.findMany({ where: { ownerId: OWNER, sceneId: "chat" }, select: { id: true } }))
    .map((r) => r.id).filter((id) => !chatsBefore.has(id));
  if (mine.length > 0) {
    await prisma.sceneGap.deleteMany({ where: { runId: { in: mine } } });
    await prisma.sceneRun.deleteMany({ where: { id: { in: mine } } });
  }
  if (madeCards.length > 0) await prisma.card.deleteMany({ where: { id: { in: madeCards }, ownerId: OWNER } });
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  if (keptSteps.length > 0) await prisma.courseStep.createMany({ data: keptSteps });
  if (keptProgramme) {
    await prisma.setting.upsert({
      where: { ownerId_key: { ownerId: OWNER, key: "programme" } },
      create: keptProgramme, update: { value: keptProgramme.value },
    });
  } else {
    await prisma.setting.deleteMany({ where: { ownerId: OWNER, key: "programme" } });
  }
}

await finishEvening();
const browser = await launchChromium();
let server = null;

/** Kill the server and the grandchild actually listening (see `scripts/test-error.mjs`). */
function halt(child) {
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    // Already dead, or never started.
  }
}

try {
  // ── Keyless: never shown ────────────────────────────────────────────────────
  const plain = await (await browser.newContext()).newPage();
  await plain.goto(`${B}/course`, { waitUntil: "domcontentloaded" });
  await plain.waitForSelector("main h1", { timeout: 20_000 });
  const finishedHere = /Today.s module is done/i.test(await plain.locator("main").innerText());
  const offeredHere = await plain.locator("[data-talk-it-over]").count();
  if (!finishedHere) {
    absent(2, "the evening this suite ticked did not read as finished on the shared server, so there was nothing to withhold a chat from");
  } else if (offeredHere > 0) {
    absent(2, "the shared server holds a model, so it offers the chat, which is right there and is the other half below");
  } else {
    check("a deployment with no model offers no chat under a finished evening", offeredHere === 0);
    await plain.goto(`${B}/course/chat`, { waitUntil: "domcontentloaded" });
    // A redirect thrown after the route group's loading screen has streamed is
    // carried out in the browser, so the address changes a moment after the page arrives.
    await plain.waitForURL(/\/course$/, { timeout: 15_000 }).catch(() => {});
    check("and the chat's own address goes back to the module", plain.url().endsWith("/course"), plain.url());
  }
  await plain.close();

  // ── With a model: offered, held, remembered ───────────────────────────────
  const scratch = mkdtempSync(join(tmpdir(), "kodukeel-chat-"));
  const log = join(scratch, "model.jsonl");
  writeFileSync(log, "");
  const stub = resolve("scripts/lib/stub-model.mjs");
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    detached: true,
    env: {
      ...process.env,
      GEMINI_API_KEY: "stub-key-not-a-credential",
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import ${stub}`.trim(),
      STUB_MODEL_LOG: log,
    },
    stdio: "ignore",
  });
  let up = false;
  for (let i = 0; i < 90 && !up; i++) {
    up = await fetch(`${S}/offline`).then((r) => r.ok).catch(() => false);
    if (!up) await delay(500);
  }
  if (!up) throw new Error(`no server came up on ${PORT} for the chat to be held on`);

  const page = await (await browser.newContext({ viewport: { width: 1000, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${S}/course`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 30_000 });
  const offer = page.locator("[data-talk-it-over]");
  check("a finished evening offers to talk it over", (await offer.count()) === 1);
  check("and says it is optional, the evening being done already",
    /Optional\. Today.s module is already done/.test(await offer.innerText().catch(() => "")));

  await offer.getByRole("link", { name: /Talk it over/ }).click();
  await page.waitForURL(/\/course\/chat/, { timeout: 30_000 });
  await page.waitForSelector("main h1", { timeout: 30_000 });
  const brief = await page.locator("main").innerText();
  check("the chat names itself, and who it is with",
    /Today.s chat/.test(brief) && /neighbou?r/i.test(brief), brief.slice(0, 160));
  check("it has no dial for how much goes wrong, since nothing does",
    (await page.getByRole("radiogroup", { name: /How tricky/i }).count()) === 0);

  /* Pressed until it lands: a server-rendered button is inert until React attaches (test-scene.mjs). */
  const started = await eventually(async () => {
    await page.getByRole("button", { name: /Start the chat/i }).click().catch(() => {});
    return (await page.locator('[role="log"] p').count()) > 0;
  }, { timeoutMs: 40_000, everyMs: 1_000 });
  check("and opens with the other side speaking first", started);
  check("with no lines to pick, since nobody wrote any for tonight's words",
    (await page.getByRole("radio", { name: /Pick a line/i }).count()) === 0);

  const box = page.getByLabel("What you say");
  async function say(text) {
    const before = await page.locator('[role="log"] p').count();
    await box.fill(text);
    await page.getByRole("button", { name: /^Say it$/i }).click();
    await page.waitForFunction(
      (n) => document.querySelectorAll('[role="log"] p').length > n + 1,
      before, { timeout: TURN_MS },
    ).catch(() => {});
  }
  /** The other side's lines, as said. */
  const theirLines = async () => (await page.getByRole("log").locator("[data-rung] p[lang=et]").allInnerTexts())
    .map((t) => t.toLowerCase());
  const metCount = async () => {
    const text = await page.locator("main").innerText();
    return Math.max(0, ...[...text.matchAll(/(\d+) of (\d+)/gi)].map((m) => Number(m[1])));
  };

  await say("Tere!");
  check("hello back meets the greeting", (await metCount()) >= 1);

  /*
    EACH WORD, TYPED AS THE DICTIONARY SPELLS IT. The stub's first try on every
    word beat is the word itself, which the gate's `giveaway` check has to
    withhold, so the screen may hold the word only in what the learner said.
  */
  const words = evening.words.filter((w) => !/\s/.test(w));
  let asked = 0;
  for (const word of words) {
    const lines = await theirLines();
    const goal = await page.locator("main").innerText();
    if (!/Use the word for/i.test(goal)) break;
    asked += 1;
    check(`the other side never says "${word}" for the learner`,
      !lines.some((line) => new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u").test(line)), lines.join(" | "));
    const before = await metCount();
    await say(word);
    check(`and "${word}" said back meets its objective`, (await metCount()) > before, `${before} -> ${await metCount()}`);
  }
  check("the chat asked for the evening's words, one beat each", asked >= 2, `${asked} of ${words.length}`);

  const composed = await page.getByRole("log").locator('[data-rung="composed"]').count();
  check("its questions were composed for this turn", composed >= 2, `${composed} composed`);
  /*
    R-2a: a line a model wrote can be reported from where it was read, once for
    the conversation beside the sentence naming the model, never under every
    bubble (the learner asked for the thread to carry nothing under its lines).
  */
  check("a composed line can be reported, by one control for the conversation",
    (await page.locator('[data-report-answer="SCENE_LINE"]').count()) === 1,
    `${await page.locator('[data-report-answer="SCENE_LINE"]').count()} report controls`);
  check("and none of it hangs under a bubble",
    (await page.getByRole("log").locator("[data-report-answer]").count()) === 0);

  await say("Head aega!");
  await page.waitForSelector("text=Your conversation, reviewed", { timeout: TURN_MS }).catch(() => {});
  const debrief = await page.locator("main").innerText();
  check("the goodbye ends it, on the debrief", /Your conversation, reviewed/i.test(debrief), debrief.slice(0, 120));
  check("and the transcript offers the same report once it is over",
    (await page.locator('[data-report-answer="SCENE_LINE"]').count()) === 1);
  check("and every word was used, which the ending says",
    /Every one of today.s words got used/.test(debrief), debrief.slice(0, 300));
  check("and the words used went into the reviews", /in \[?your reviews|now in your reviews/i.test(debrief));
  check("with the way out of the evening rather than another chat",
    (await page.getByRole("link", { name: /Back to Today/ }).count()) > 0
      && (await page.getByRole("button", { name: /Rehearse this conversation again/ }).count()) === 0);

  /*
    THE SECOND CHAT REMEMBERS THE FIRST, BY A MEANING AND NEVER BY THE
    LEARNER'S WORDS: the composer is told what they talked about, as a stage
    direction, on the first word beat. Read off what the stand-in was sent.
    It is the next evening's chat, about new words, because a meaning that is
    also one of tonight's words is not remembered at all (`rememberedFor`).
  */
  await prisma.courseStep.createMany({
    data: evening.nextDays.flatMap((day) => day.steps.map((stepId) => ({
      ownerId: OWNER, programmeId: evening.programmeId, dayId: day.id, stepId,
    }))),
  });
  await page.goto(`${S}/course/chat`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 30_000 });
  await eventually(async () => {
    await page.getByRole("button", { name: /Start the chat/i }).click().catch(() => {});
    return (await page.locator('[role="log"] p').count()) > 0;
  }, { timeoutMs: 40_000, everyMs: 1_000 });
  await say("Tere!");
  const sent = readFileSync(log, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const remembering = sent.filter((one) => one.kind === "compose" && /last time/.test(one.system));
  check("the next chat opens on what was talked about last time", remembering.length > 0,
    `${sent.filter((one) => one.kind === "compose").length} composed requests`);
  const recalled = remembering.map((one) => /you talked about "([^"]+)" last time/.exec(one.system)?.[1] ?? "");
  check("by its meaning, never quoting the learner's own Estonian back",
    recalled.length > 0 && recalled.every((meaning) => meaning.length > 0 && !evening.words.includes(meaning)),
    recalled.join(" | "));
  const asking = remembering.map((one) => /lets you use the word for "([^"]+)"/.exec(one.system)?.[1] ?? "");
  check("and never the word it is about to ask for, which would be the neighbor repeating themselves",
    remembering.length > 0 && remembering.every((_, i) => asking[i] !== "" && asking[i] !== recalled[i]),
    remembering.map((_, i) => `${recalled[i]} -> ${asking[i]}`).join(" | "));

  /*
    R-2a: each of Anu's answers can be reported from where it was read. This
    server holds a key, so she is offered; her answer is stood in for in the
    browser, with the model named on the reply the way the route names it, so
    nothing reaches a provider and the report carries who wrote it.
  */
  await page.route("**/api/tutor", (route) => route.fulfill({
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "x-model-provider": "Stub", "x-model-id": "stub-model" },
    body: "It is the partitive here, because the reading is not finished.",
  }));
  await page.goto(`${S}/tutor`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 30_000 });
  /* Pressed until the question leaves the box: a server-rendered button is inert until React attaches. */
  const question = page.getByLabel("Ask Anu a question");
  await eventually(async () => {
    if (await question.inputValue().catch(() => "") === "") await question.fill("Why raamatut?").catch(() => {});
    await page.getByRole("button", { name: /^Ask/ }).first().click().catch(() => {});
    return (await question.inputValue().catch(() => "x")) === "";
  }, { timeoutMs: 30_000, everyMs: 1_000 });
  const reportable = await page.waitForSelector('[data-report-answer="ANU"]', { timeout: 15_000 })
    .then(() => true, () => false);
  check("each of Anu's answers carries a way to report it", reportable);
  await page.locator('[data-report-answer="ANU"]').first().click().catch(() => {});
  const form = await page.locator("main").innerText().catch(() => "");
  check("and the report carries the answer and the model that wrote it",
    /written by Stub, stub-model: It is the partitive here/.test(form), form.slice(0, 200));
  await page.unroute("**/api/tutor");

  check("nothing on the way threw", errors.length === 0, errors.join(" | ").slice(0, 200));
} finally {
  if (server) halt(server);
  await browser.close();
  await putBack();
  await prisma.$disconnect();
}

done();
