#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { eventually, launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";

/**
 * THE LESSONS, WALKED STEP BY STEP (docs/43-lessons.md §11 and §12).
 *
 * A lesson is six steps on one screen, and every B1 step up is something only a
 * browser can say works: the conversation played with its words hidden and
 * the text arriving after the questions, a sentence changed and a slip put
 * right with the verdict saying what it should have been, the key lines
 * fading as they are said, a story retold with its points lighting as they
 * come across, one answer given three times on a shrinking clock, a real text
 * written in four stages and read by the dictionary, and the finish screen
 * pointing at the conversation the lesson rehearsed. The unit tests hold the
 * lessons' content to its rules; none of them can press a button.
 *
 * Six lessons, chosen off the course by `scripts/lib/lessonPicks.ts` so this
 * cannot fall behind it: B1's first, one ending in a retold story, one ending
 * in an answer said faster, a writing lesson, a part's closing conversation,
 * and A2's first, which has none of the B1 machinery and must stay that way.
 * Everything a finished lesson writes for the local learner is taken off again
 * at the end, so the deck and the course read as they did before.
 *
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm start
 *   node scripts/test-lessons.mjs
 */
const B = baseUrl();
const OWNER = "local-single-user";

const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const { check, absent, done } = suite("The lessons, walked", {
  /*
    Per B1 lesson: the step heading, the hidden conversation and its reveal,
    the questions answered, a practice that finishes, Say it reaching its end,
    the finished screen. Plus the first lesson's "What's new" and its fade,
    the retell, the three goes, the four writing stages, the capstone, and A2
    staying as it was. Counted off a run, so a block that stops is a shortfall.
  */
  floor: 163,
});
// `--only=<role>` walks one lesson (or `spoken`, the race out loud) for working on it; it reports under the floor by design.

const picks = JSON.parse(execFileSync("npx", ["tsx", "scripts/lib/lessonPicks.ts"], { encoding: "utf8" }));
const byRole = Object.fromEntries(picks.map((p) => [p.role, p]));

const prisma = newPrismaClient();
await requireLocalDatabase(prisma);
const started = new Date();
const stepsBefore = new Set((await prisma.courseStep.findMany({ where: { ownerId: OWNER }, select: { id: true } })).map((r) => r.id));
const cardsBefore = new Set((await prisma.card.findMany({ where: { ownerId: OWNER }, select: { id: true } })).map((r) => r.id));
// A check sat below writes a pass only if it passes, which a walk answering wrongly on purpose should not; put back either way.
const passedBefore = await prisma.setting.findUnique({ where: { ownerId_key: { ownerId: OWNER, key: "checksPassed" } } });

const browser = await launchChromium();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

/*
  AXE ON EVERY STEP, NOT ONLY THE FIRST. The accessibility sweep opens a lesson
  at its address, which is always step 1: the hidden conversation, the
  practice, the fade and the writing frame are states a route never arrives
  in, so they are asked here, once per step of each lesson walked.
*/
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
async function axeHere(where) {
  /*
    A step arrives fading in, and contrast measured mid-fade is a card at half
    its ink: on a slower runner axe met a whole Listen step that way. What is
    measured is the step at rest, so the finite animations finish first.
  */
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), null, { timeout: 5000 }).catch(() => {});
  await page.addScriptTag({ content: AXE });
  const found = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
    return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`);
  });
  check(`${where}: axe finds nothing`, found.length === 0, found.slice(0, 3).join("; "));
  if (SHOTS) await shoot(where);
}

/*
  LESSON_SHOTS=<dir> photographs every step as it is reached, at 1280 in the
  light and at 390 in the dark, for reading a lesson the way a learner sees it.
  Off unless asked; it checks nothing.
*/
const SHOTS = process.env.LESSON_SHOTS ?? null;
let shot = 0;
async function shoot(where) {
  const name = `${String(++shot).padStart(3, "0")}-${where.replace(/[^\w-]+/g, "_")}`;
  await page.screenshot({ path: `${SHOTS}/${name}-1280-light.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/${name}-390-dark.png`, fullPage: true });
  await page.evaluate(() => { delete document.documentElement.dataset.theme; });
  await page.setViewportSize({ width: 1280, height: 900 });
}
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR|404/.test(m.text())) errors.push(m.text()); });

const main = () => page.locator("main");
const text = async () => (await main().innerText()).replace(/\s+/g, " ");
const stepHeading = async () => (await page.locator("#lesson-step").innerText().catch(() => "")).trim();
/** The button at the foot of the screen that moves to the next step. */
const footer = () => page.getByRole("button", { name: /^(Continue|Skip this step|Finish the lesson|Finish without it)/ }).last();

/** Answers one practice or review round to its end, whatever it asks. Returns how many questions it took. */
async function quizThrough(where, reworks = []) {
  let asked = 0;
  // One rework a round is answered right, off the line the lesson says it should become, so a right verdict is seen too.
  let answeredRight = false;
  for (let n = 0; n < 60; n++) {
    if (await page.locator('[data-lesson-quiz="done"]').count()) return asked;
    const quiz = page.locator("[data-lesson-quiz][data-quiz-kind]").first();
    if (!(await quiz.count())) return asked;
    const kind = await quiz.getAttribute("data-quiz-kind");
    asked += 1;
    if (kind === "match") {
      const left = quiz.locator('ul[aria-label="Estonian"] button');
      for (let i = 0; i < (await left.count()); i++) {
        if (await left.nth(i).isDisabled()) continue;
        await left.nth(i).click();
        const right = quiz.locator('ul[aria-label="In English"] button');
        for (let j = 0; j < (await right.count()); j++) {
          if (await right.nth(j).isDisabled()) continue;
          await right.nth(j).click();
          await page.waitForTimeout(60);
          if (await left.nth(i).isDisabled()) break;
          await left.nth(i).click();
        }
      }
    } else if (kind === "rework" && !answeredRight && reworks.length > 0) {
      const shown = (await quiz.innerText()).replace(/\s+/g, " ");
      const rework = reworks.find((r) => shown.includes(r.from));
      if (rework) {
        answeredRight = true;
        await quiz.locator("input[lang=et]").fill(rework.to);
        await quiz.getByRole("button", { name: /^Check/ }).click();
        const right = await quiz.locator(".verdict-panel.verdict-right").first().waitFor({ timeout: 4000 }).then(() => true, () => false);
        check(`${where}: a rework answered as written is marked right`, right, (await quiz.locator(".verdict-panel").innerText().catch(() => "")).slice(0, 80));
      } else {
        await quiz.locator("input[lang=et]").fill("vale");
        await quiz.getByRole("button", { name: /^Check/ }).click();
      }
    } else if (kind === "type" || kind === "rework" || kind === "fix") {
      // A wrong answer on purpose: the verdict then has to show the right one.
      await quiz.locator("input[lang=et]").fill("vale");
      await quiz.getByRole("button", { name: /^Check/ }).click();
      const verdict = quiz.locator(".verdict-panel");
      await verdict.waitFor({ timeout: 4000 }).catch(() => {});
      if (kind !== "type") {
        check(`${where}: a "${kind}" answered wrong shows the line it should be`,
          (await verdict.locator("[lang=et]").count()) > 0, (await verdict.innerText().catch(() => "")).slice(0, 80));
      }
    } else {
      await quiz.locator('[role="radio"]:not([disabled])').first().click();
    }
    const next = quiz.getByRole("button", { name: /^(Next|Done)/ });
    await next.waitFor({ timeout: 4000 }).catch(() => {});
    if (!(await next.count())) return asked;
    await next.click();
  }
  return asked;
}

/** The hidden conversation, the questions, and the text arriving after them. */
async function listenFirst(lesson) {
  const where = lesson.id;
  check(`${where}: the conversation is heard first`, (await page.locator("[data-listen-first]").count()) === 1);
  if (lesson.line) {
    check(`${where}: and its words are not on the screen yet`, !(await text()).includes(lesson.line));
  }
  const groups = await page.locator("[data-gists] > div").count();
  check(`${where}: it asks what the conversation was about`, groups === lesson.gists, `${groups} of ${lesson.gists}`);
  for (let i = 0; i < groups; i++) {
    await page.locator("[data-gists] > div").nth(i).locator('[role="radio"]').first().click();
  }
  check(`${where}: answering says how much was caught by ear`, /caught by ear/.test(await text()));
  await page.getByRole("button", { name: /^Read it/ }).click();
  if (lesson.line) {
    await eventually(async () => (await text()).includes(lesson.line), { timeoutMs: 4000 });
    check(`${where}: and then the words are there to read`, (await text()).includes(lesson.line));
  }
}

/** Say it, typed or said, through every card to its end. */
async function sayThrough(lesson, mode) {
  const where = lesson.id;
  await page.getByRole("button", { name: mode === "say" ? /^Say it$/ : /Type it instead/ }).click();
  let fade = false;
  let retold = false;
  let faster = false;
  // Whether the dictionary read a typed answer at all: null until a box is answered.
  let readTyped = null;
  for (let n = 0; n < 30; n++) {
    if (await page.locator('[data-say-it="done"]').count()) break;
    const say = page.locator("[data-say-it]").first();
    if (await say.locator("[data-fade-line]").count()) {
      if (!fade && SHOTS) await shoot(`${where} fade`);
      fade = true;
      await say.getByRole("button", { name: /^(Next|Done)/ }).click();
      continue;
    }
    if (await say.locator("[data-retell-points]").count()) {
      retold = true;
      await say.getByLabel("What you told, in Estonian").fill(lesson.retell);
      await page.waitForTimeout(200);
      const lit = await say.locator('[data-retell-points] [data-lit="true"]').count();
      if (SHOTS) await shoot(`${where} retell`);
      check(`${where}: retelling the story lights its points as they come across`, lit > 0, `${lit} lit`);
      await say.getByRole("button", { name: /^Show the story/ }).click();
      check(`${where}: and the story is there to check against`, (await say.locator("[data-retell-story]").count()) === 1);
      await say.getByRole("button", { name: /^Next/ }).click();
      continue;
    }
    if (await say.locator("[data-faster-go]").count() || await say.locator("[data-faster-goes]").count()) {
      faster = true;
      let handed = 0;
      for (let go = 0; go < 3; go++) {
        await say.getByRole("button", { name: /^Start, and type/ }).click();
        await say.getByLabel("Your answer, in Estonian").fill(lesson.faster);
        await say.getByRole("button", { name: /^Done$/ }).click();
        // The go whose Done was pressed is gone; the caret is on the next go's Start, or on Next after the last.
        const want = go < 2 ? /^Start, and type/ : /^Next/;
        if (await eventually(() => page.evaluate((w) => new RegExp(w).test(document.activeElement?.textContent?.trim() ?? ""), want.source), { timeoutMs: 3000 }).catch(() => false)) handed += 1;
      }
      check(`${where}: after each go the caret is on the way on`, handed === 3, `${handed} of 3`);
      const goes = await say.locator("[data-faster-goes] li").count();
      if (SHOTS) await shoot(`${where} faster`);
      check(`${where}: three goes at the answer are drawn side by side`, goes === 3, `${goes}`);
      check(`${where}: and one way to say it is shown after them`, (await say.locator("[data-faster-model]").count()) === 1);
      await say.getByRole("button", { name: /^Next/ }).click();
      continue;
    }
    const box = say.getByLabel(/^(Your answer|What you said), in Estonian/);
    if (await box.count()) {
      // The first answer carries a slip the dictionary knows (a person's ending after {ei}), so a finding is seen, not only a reading.
      await box.fill(readTyped === null ? "Ma ei teab." : "Ma ei tea.");
      await say.getByRole("button", { name: /^Check it/ }).click();
      // The first typed answer of the lesson waits for the dictionary's reading, which every lesson's cards get.
      if (readTyped === null) readTyped = await say.locator('[data-sentence-check="findings"]').first().waitFor({ timeout: 20_000 }).then(() => true, () => false);
      await say.getByRole("button", { name: /^(Next|Done)/ }).click();
      continue;
    }
    break;
  }
  check(`${where}: Say it reaches its end`, (await page.locator('[data-say-it="done"]').count()) === 1);
  if (readTyped !== null) {
    check(`${where}: the dictionary reads a typed answer and names its slip${lesson.write ? "" : ", on a lesson with no writing task"}`, readTyped);
  }
  return { fade, retold, faster };
}

/** The four writing stages, through to the sentences kept. */
async function writeThrough(lesson) {
  const where = lesson.id;
  check(`${where}: writing opens on the model text`, (await page.locator('[data-write-step="model"]').count()) === 1);
  await page.getByRole("button", { name: /^Fill in the frame/ }).click();
  // The pressed button is gone with its stage, so the caret goes to the stage now current rather than the page.
  const caret = await eventually(() => page.evaluate(() => document.activeElement?.getAttribute("aria-current") === "step"), { timeoutMs: 3000 }).catch(() => false);
  check(`${where}: moving on hands the caret to the stage now current`, caret === true, await page.evaluate(() => document.activeElement?.tagName ?? "none"));
  const gaps = page.locator("[data-write-frame] input");
  const n = await gaps.count();
  check(`${where}: the frame takes the key words out`, n > 0, `${n} gaps`);
  for (let i = 0; i < n; i++) await gaps.nth(i).fill("x");
  await page.getByRole("button", { name: /^Check it/ }).click();
  check(`${where}: checking the frame says how many were written back`, /written back/.test(await text()));
  if (SHOTS) await shoot(`${where} frame`);
  await page.getByRole("button", { name: /^Write your own/ }).click();
  await page.locator("[data-write-draft]").fill(lesson.write.model);
  await page.waitForTimeout(200);
  const lit = await page.locator('[data-write-uses] [data-lit="true"]').count();
  check(`${where}: the words to use tick off as they appear`, lit > 0, `${lit} ticked`);
  await page.getByRole("button", { name: /^Have it read/ }).click();
  check(`${where}: the second draft sits beside the first`, (await page.locator('[data-write-step="redraft"]').count()) === 1);
  // "Have it read" starts the reading itself; there is no second button to press first.
  check(`${where}: the reading starts without a second press`, (await page.getByRole("button", { name: /^Read my text/ }).count()) === 0);
  await page.locator("[data-write-findings]").waitFor({ timeout: 15_000 }).catch(() => {});
  check(`${where}: the dictionary reads the text, sentence by sentence`, (await page.locator("[data-write-findings]").count()) === 1);
  if (SHOTS) await shoot(`${where} read`);
  /*
    The model text read back, so every sentence is clean and a word the
    course taught can be taken out of it: ticked by default, kept on a press,
    and a card in this learner's deck afterwards.
  */
  const ticks = await page.locator('[data-write-keep] input[type="checkbox"]:checked').count();
  check(`${where}: a clean sentence is ticked to keep`, ticks > 0, `${ticks} ticked`);
  const before = await prisma.card.count({ where: { ownerId: OWNER, source: "WRITTEN" } });
  await page.getByRole("button", { name: /^Keep them/ }).click();
  await eventually(async () => (await prisma.card.count({ where: { ownerId: OWNER, source: "WRITTEN" } })) > before, { timeoutMs: 10_000 });
  const after = await prisma.card.count({ where: { ownerId: OWNER, source: "WRITTEN" } });
  check(`${where}: keeping them puts the ticked sentences in the deck`, after - before > 0 && after - before <= ticks, `${after - before} of ${ticks}`);
  await page.getByRole("button", { name: /^Done writing/ }).click();
}

/** The lesson's step on screen and React holding it, so a press is heard rather than landing on server HTML. */
async function hydrated(pg) {
  await pg.waitForFunction(() => {
    const el = document.querySelector("#lesson-step");
    return !!el && Object.keys(el).some((k) => k.startsWith("__react"));
  }, null, { timeout: 30_000 });
}

async function walk(lesson, { mode = "type" } = {}) {
  const where = lesson.id;
  await page.goto(`${B}/course/lessons/${lesson.id}`, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await eventually(async () => (await stepHeading()).startsWith("Step 1"), { timeoutMs: 10_000 });
  check(`${where}: opens on its first step`, (await stepHeading()).startsWith("Step 1"), await stepHeading());
  check(`${where}: says what is new at the level on the level's first lesson only`,
    (await page.locator("[data-level-new]").count()) === (lesson.first && lesson.level === "B1" ? 1 : 0));
  if (lesson.gists > 0) await listenFirst(lesson);
  else check(`${where}: below B1 the conversation is read from the start`, (await page.locator("[data-listen-first]").count()) === 0);
  let said = null;
  for (let n = 0; n < 12; n++) {
    if (await page.locator("[data-lesson-done]").count()) break;
    const heading = await stepHeading();
    await axeHere(`${where} ${heading.replace(/^Step \d+ of \d+: /, "")}`);
    if (/Practice/.test(heading)) {
      const asked = await quizThrough(`${where} practice`, lesson.reworks ?? []);
      check(`${where}: practice runs to its end`, (await page.locator('[data-lesson-quiz="done"]').count()) === 1, `${asked} asked`);
    } else if (/Write/.test(heading) && lesson.write) {
      await writeThrough(lesson);
      continue;
    } else if (/Say it|Conversation/.test(heading)) {
      said = await sayThrough(lesson, mode);
    } else if (/Review/.test(heading)) {
      await quizThrough(`${where} review`);
    }
    await footer().waitFor({ timeout: 8000 }).catch(() => {});
    if (!(await footer().count())) {
      const names = await main().getByRole("button").allInnerTexts();
      throw new Error(`${where}: no way on at "${heading}" (${page.url()}); the buttons are ${names.map((b) => b.trim()).join(" | ")}; the page says ${(await text()).slice(0, 300)}`);
    }
    const last = /Finish/.test((await footer().innerText().catch(() => "")));
    await footer().click();
    if (last) break;
    await page.waitForTimeout(150);
    // Once a lesson: a reload picks it up on the step it was on, not on step 1.
    if (n === 0 && lesson.role === "first") {
      const was = await stepHeading();
      await page.reload({ waitUntil: "domcontentloaded" });
      await hydrated(page);
      await eventually(async () => (await stepHeading()) === was, { timeoutMs: 6000 }).catch(() => {});
      check(`${where}: a reload keeps the step it was on`, (await stepHeading()) === was, `${await stepHeading()} after ${was}`);
    }
  }
  await page.locator("[data-lesson-done]").waitFor({ timeout: 15_000 }).catch(() => {});
  check(`${where}: ends on the finished screen`, (await page.locator("[data-lesson-done]").count()) === 1);
  if (SHOTS) await shoot(`${where} finished`);
  return said;
}

/*
  THE RACE, ANSWERED OUT LOUD, TO THE CLOCK. The typed walk above never meets
  the microphone, and the spoken go is where the race once closed on nothing:
  the timer read whether the microphone was listening from the render that
  pressed Start, when it was still opening, so a go that ran to the clock
  recorded no words at all. Chromium's fake microphone plays a committed clip
  TartuNLP read, on a loop, so the first go has something to hear for its
  whole ninety seconds. It needs the speech model this server serves, and is
  stated rather than failed where there is none.
*/
async function spokenRace(lesson) {
  const where = `${lesson.id} out loud`;
  const model = await fetch(`${B}/asr/model/7edbacc1d13a4bc8fba21307753569e8334938a0/tokens.txt`).catch(() => null);
  if (!model?.ok) {
    absent(3, "this server serves no speech model: run npm run asr:fetch before the build");
    return;
  }
  const mic = await launchChromium({ args: [
    "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
    "--use-file-for-fake-audio-capture=scripts/fixtures/speech/voice-message.wav",
  ] });
  try {
    const ctx = await mic.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.grantPermissions(["microphone"], { origin: B });
    const p = await ctx.newPage();
    await p.goto(`${B}/course/lessons/${lesson.id}`, { waitUntil: "domcontentloaded" });
    await hydrated(p);
    await p.getByRole("button", { name: /^Show the words now/ }).click();
    for (let n = 0; n < 6 && !/Say it/.test(await p.locator("#lesson-step").innerText()); n++) {
      await p.getByRole("button", { name: /^(Skip this step|Continue)/ }).last().click();
      await p.waitForTimeout(300);
    }
    await p.getByRole("button", { name: /^Say it$/ }).last().click();
    const say = p.locator("[data-say-it]").first();
    for (let i = 0; i < 60 && !(await say.locator("[data-faster-go]").count()); i++) {
      const next = say.getByRole("button", { name: /^(Next|Done)$/ });
      if (await next.count()) { await next.last().click(); await p.waitForTimeout(150); continue; }
      const box = say.getByLabel(/^(Your answer|What you said), in Estonian/);
      if (!(await box.count())) break;
      await box.fill("Ma ei tea.");
      await say.getByRole("button", { name: /^Check it/ }).click();
      await say.getByRole("button", { name: /^(Next|Done)/ }).click();
    }
    const start = say.getByRole("button", { name: /^Start, and speak/ });
    check(`${where}: the race offers the microphone`, (await start.count()) === 1);
    if (!(await start.count())) return;
    await start.click();
    // The clock waits for the microphone: a first press fetches and loads the model, which takes longer than a go.
    const listening = await say.locator('[data-faster-go] button[data-state="listening"]').first().waitFor({ timeout: 300_000 }).then(() => true, () => false);
    const clock = Number(await say.locator("[data-faster-go] .run-clock").first().innerText().catch(() => "0"));
    check(`${where}: the clock starts when the microphone opens, not when Start is pressed`, listening && clock >= 87, `${listening ? "listening" : "never listened"}, ${clock} seconds left`);
    // A go runs ninety seconds and is then decoded twice at up to real time each, so a slow runner needs minutes.
    await say.locator("[data-faster-goes]").waitFor({ timeout: 330_000 }).catch(() => {});
    const heard = Number((await say.locator("[data-faster-goes]").innerText().catch(() => "")).match(/(\d+) words,/)?.[1] ?? 0);
    check(`${where}: a go run to the clock keeps what the microphone heard`, heard > 0, `${heard} words`);
  } finally {
    await mic.close();
  }
}

try {
  if (ONLY === "spoken") await spokenRace(byRole.faster);
  else if (ONLY === "check") await checkWalk(byRole.check.id, byRole.check.part);
  else if (ONLY) await walk(byRole[ONLY]);
  else await everything();
} finally {
  // Put the local learner back as they were found, a part of the suite run alone included.
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER, createdAt: { gte: started }, id: { notIn: [...stepsBefore] } } });
  await prisma.card.deleteMany({ where: { ownerId: OWNER, createdAt: { gte: started }, id: { notIn: [...cardsBefore] } } });
  if (passedBefore) await prisma.setting.update({ where: { ownerId_key: { ownerId: OWNER, key: "checksPassed" } }, data: { value: passedBefore.value } });
  else await prisma.setting.deleteMany({ where: { ownerId: OWNER, key: "checksPassed" } });
  await browser.close();
  await prisma.$disconnect();
}
done();

async function everything() {
  const first = await walk(byRole.first, { mode: "say" });
  check("B1's first lesson fades the key lines as they are said", first?.fade === true);
  const retell = await walk(byRole.retell);
  check("a retell lesson's Say it ends on the story told back", retell?.retold === true);
  const faster = await walk(byRole.faster);
  check("a faster lesson's Say it ends on the answer said three times", faster?.faster === true);
  await walk(byRole.write);
  const capstone = await walk(byRole.capstone);
  check("a part's closing conversation asks no retell and no race", capstone?.retold === false && capstone?.faster === false);
  await walk(byRole.a2);
  await checkWalk(byRole.check.id, byRole.check.part);
  await inRussian(byRole.first);
  await spokenRace(byRole.faster);
  if (errors.length) console.log(errors.slice(0, 5).join("\n"));
  check("no console errors", errors.length === 0, `${errors.length}`);
}

/*
  A PART'S CHECK, SAT END TO END, WITH THE NETWORK DROPPED ONCE. The paper is
  marked on the server, so the first hand-in is made to fail: the screen has
  to say it did not go through and put the caret on the way to send it again,
  and the second has to arrive at a result.
*/
async function checkWalk(id, part) {
  const where = `the ${id} check`;
  // A check opens on the part it closes, so the learner stands there for the walk and is put back after.
  const key = { ownerId_key: { ownerId: OWNER, key: "programme" } };
  const before = await prisma.setting.findUnique({ where: key });
  await prisma.setting.upsert({ where: key, create: { ownerId: OWNER, key: "programme", value: part }, update: { value: part } });
  try { await sitCheck(id, where); } finally {
    if (before) await prisma.setting.update({ where: key, data: { value: before.value } });
    else await prisma.setting.delete({ where: key }).catch(() => {});
  }
}

async function sitCheck(id, where) {
  await page.goto(`${B}/course/check/${id}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-course-check]").waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Object.keys(document.querySelector("[data-course-check]") ?? {}).some((k) => k.startsWith("__react")), null, { timeout: 30_000 });
  let failedOnce = false;
  await page.route(`**/course/check/${id}**`, async (route) => {
    if (!failedOnce && route.request().method() === "POST") { failedOnce = true; await route.abort("internetdisconnected"); return; }
    await route.continue();
  });
  const asked = await quizThrough(where);
  check(`${where}: asks a whole paper`, asked >= 10, `${asked} asked`);
  const retry = page.getByRole("button", { name: /^Try sending it again/ });
  const failed = await retry.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  check(`${where}: a hand-in that did not arrive says so and offers to send it again`, failed);
  check(`${where}: and the caret is on that way to send it`, failed && await retry.evaluate((el) => el === document.activeElement));
  if (failed) await retry.click();
  const result = await page.locator("[data-check-result]").waitFor({ timeout: 15_000 }).then(() => true, () => false);
  check(`${where}: sent again, it is marked`, result, result ? "" : (await text()).slice(-240));
  check(`${where}: the result line takes the caret`, result && await page.evaluate(() => (document.activeElement?.textContent ?? "").includes(" of ")));
  await page.unroute(`**/course/check/${id}**`);
  await axeHere(`${where} result`);
}

/* A B1 lesson in Russian: its goal in Russian on the screen, and the step headings too. */
async function inRussian(lesson) {
  const where = `${lesson.id} in Russian`;
  const before = await prisma.setting.findUnique({ where: { ownerId_key: { ownerId: OWNER, key: "uiLocale" } } });
  await prisma.setting.upsert({ where: { ownerId_key: { ownerId: OWNER, key: "uiLocale" } }, create: { ownerId: OWNER, key: "uiLocale", value: "ru" }, update: { value: "ru" } });
  try {
    await page.goto(`${B}/course/lessons/${lesson.id}`, { waitUntil: "domcontentloaded" });
    await hydrated(page);
    const body = await text();
    check(`${where}: the goal is in Russian`, body.includes(lesson.goalRu.slice(0, 30)), body.slice(0, 120));
    check(`${where}: and the step heading is not English`, !/^Step \d/.test(await stepHeading()), await stepHeading());
  } finally {
    if (before) await prisma.setting.update({ where: { ownerId_key: { ownerId: OWNER, key: "uiLocale" } }, data: { value: before.value } });
    else await prisma.setting.delete({ where: { ownerId_key: { ownerId: OWNER, key: "uiLocale" } } }).catch(() => {});
  }
}

