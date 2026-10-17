#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { eventually, launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";

/**
 * A conversation said aloud, in a browser (docs/41-fifth-batch.md, VB-4).
 *
 *   node scripts/test-scene-speech.mjs   against BASE_URL, a production build with the model fetched
 *
 * What only a browser can say about a spoken conversation:
 *
 *   - a line on offer, said into Chromium's fake microphone, lights up and is
 *     sent by the countdown ring as the pick it is, and the turn carries what
 *     the dictionary repaired and never what the machine heard;
 *   - saying it fills the box without moving the caret, and the ring sends it;
 *   - a touch stops the ring and leaves the words in the box to change;
 *   - an utterance that matches no line on offer is never sent as a pick;
 *   - a café is played start to finish by voice, and the debrief says what was
 *     heard where it is not what went;
 *   - on a call, after one press, the microphone opens by itself after the
 *     other side has spoken, and a call heard and not read looks like a call;
 *   - the switch remembers that the learner said it;
 *   - "Hear them first" plays the opening lines without starting anything;
 *   - with the microphone refused, the conversation goes on by typing.
 *
 * A fixture clip, never a live voice (section 3). The first turn is Chromium's
 * own fake microphone, fed `tere.wav`; Chromium plays one file for the whole
 * browser, so the later turns of the same conversation are fed from a queue of
 * the fixture clips by a stand-in for the capture in this test's own page, the
 * same files `scripts/make-speech-fixtures.ts` made from lines the café's
 * picks already offer.
 */
const B = baseUrl();
const OWNER = "local-single-user";
const { check, absent, done } = suite("A conversation, said aloud", { floor: 28 });
const prisma = newPrismaClient(requireLocalDatabase("play a conversation by voice and read its debrief"));

const CLIPS = ["kohvi-palun", "jah-see-on-koik", "kaardiga-palun", "aitah-head-aega", "tere"];
const TURN_MS = 45_000;

async function cleanUp(sceneIds) {
  const rows = await prisma.sceneRun.findMany({ where: { ownerId: OWNER, sceneId: { in: sceneIds } }, select: { id: true } });
  const ids = rows.map((row) => row.id);
  if (ids.length > 0) await prisma.sceneGap.deleteMany({ where: { runId: { in: ids } } });
  await prisma.sceneRun.deleteMany({ where: { ownerId: OWNER, sceneId: { in: sceneIds } } });
}
const before = await prisma.setting.findMany({ where: { ownerId: OWNER, key: { in: ["sceneAnswer", "sceneVoice"] } } });
await cleanUp(["kohvikus", "helistamine"]);

/** A stand-in for capture that plays the next queued fixture clip, and Chromium's own fake microphone when the queue is empty. */
function queueCapture() {
  window.__clips = [];
  const media = navigator.mediaDevices;
  const original = media.getUserMedia.bind(media);
  media.getUserMedia = async (constraints) => {
    const next = window.__clips.shift();
    if (!next) return original(constraints);
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await (await fetch(next)).arrayBuffer());
    const out = context.createMediaStreamDestination();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    source.start(context.currentTime + 0.3);
    // Every clip ends in two seconds of silence. A turn closed before its words were played (the app began to speak, D14) hands it back for the turn that reopens.
    const spoken = performance.now() + 300 + (buffer.duration - 2) * 1000;
    for (const track of out.stream.getAudioTracks()) {
      const stop = track.stop.bind(track);
      track.stop = () => {
        if (performance.now() < spoken) window.__clips.unshift(next);
        stop();
      };
    }
    return out.stream;
  };
}

async function contextWith(browser, { mic }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: "block" });
  if (mic) await context.grantPermissions(["microphone"], { origin: B });
  await context.addInitScript(queueCapture);
  for (const name of CLIPS) {
    const body = readFileSync(`scripts/fixtures/speech/${name}.wav`);
    await context.route(`**/__clip/${name}.wav`, (route) => route.fulfill({ body, contentType: "audio/wav" }));
  }
  return context;
}

const queue = (page, name) => page.evaluate((url) => window.__clips.push(url), `/__clip/${name}.wav`);

/** Presses until the page shows it landed, because a button drawn on the server is inert until React attaches. */
async function choose(page, role, name) {
  const control = page.getByRole(role, { name });
  return eventually(async () => {
    await control.first().click().catch(() => {});
    return (await control.first().getAttribute("aria-checked")) === "true";
  }, { timeoutMs: 20_000, everyMs: 250 });
}

async function open(page, sceneId, voice) {
  await page.goto(`${B}/situations/${sceneId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 30_000 });
  await choose(page, "radio", /^Easy/i);
  if (voice) await choose(page, "radio", voice);
}

async function start(page) {
  await page.getByRole("button", { name: /Start the conversation/i }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-who="them"]').length > 0, null, { timeout: TURN_MS });
}

/** The turns sent to the route, read off the requests the page makes. */
function watchTurns(page) {
  const sent = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/scene") {
      try { sent.push(JSON.parse(request.postData() ?? "{}").turns ?? []); } catch { /* not a turn */ }
    }
  });
  return () => sent[sent.length - 1] ?? [];
}

const theirCount = (page) => page.locator('[data-who="them"]').count();
async function waitForReply(page, was) {
  await page.waitForFunction((n) => document.querySelectorAll('[data-who="them"]').length > n
    || document.querySelector("[data-recap-stats]") !== null, was, { timeout: TURN_MS });
  await settle(page);
}

/**
 * Until the floor is the learner's again: a scene that moves (the café, once
 * the drink is ordered) stands a cover between the rooms, walked through here.
 */
async function settle(page) {
  await eventually(async () => {
    if (await page.locator("[data-recap-stats]").count()) return true;
    const on = page.getByRole("button", { name: /^Keep going/i });
    if (await on.first().isVisible().catch(() => false)) {
      await on.first().click().catch(() => {});
      return false;
    }
    // "Leave" is shut for as long as a turn is in flight or the room is moving, which is the whole of it.
    const leave = page.getByRole("button", { name: /^Leave$/ });
    return (await leave.count()) > 0 && await leave.first().isEnabled({ timeout: 1_000 }).catch(() => false);
  }, { timeoutMs: 30_000, everyMs: 300 });
}

/** Presses the microphone once it is open to a press (it waits while the app is speaking, D14). */
async function pressMic(page, name) {
  const mic = page.getByRole("button", { name });
  await eventually(async () => (await mic.count()) > 0 && await mic.first().isEnabled(), { timeoutMs: 30_000 });
  await mic.first().click();
  // No download question comes first: a press fetches the model where it is
  // missing and then listens (docs/41-fifth-batch.md section 8b).
}

const browser = await launchChromium({
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--use-file-for-fake-audio-capture=scripts/fixtures/speech/tere.wav",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
try {
  const context = await contextWith(browser, { mic: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const lastTurns = watchTurns(page);

  await open(page, "kohvikus", /^Voice and text/i);
  if ((await page.getByRole("button", { name: /Hear them first/i }).count()) === 0 && !(await page.locator("[data-hear-first]").count())) {
    absent(28, "this server offers no speech (no model to serve): run npm run asr:fetch before the build");
    done();
    process.exit(process.exitCode ?? 0);
  }

  // ── Hear them first ──────────────────────────────────────────────────────
  await page.locator("button[data-hear-first]").click();
  const hearing = await page.locator("section[data-hear-first]").innerText().catch(() => "");
  check("Hear them first opens on a press and plays the first of the opening lines", /Line 1 of \d/.test(hearing) && (await page.locator("section[data-hear-first] [data-read-aloud]").count()) === 1, hearing.slice(0, 120));
  const runsBefore = await prisma.sceneRun.count({ where: { ownerId: OWNER, sceneId: "kohvikus" } });
  check("and starts nothing: no run is written for it", runsBefore === 0, `${runsBefore} runs`);

  await start(page);

  // ── A line on offer, said ────────────────────────────────────────────────
  await choose(page, "radio", /^Pick a line/i);
  check("the switch has three ways to answer", (await page.getByRole("radiogroup", { name: /How you answer/i }).getByRole("radio").count()) === 3);
  let was = await theirCount(page);
  await pressMic(page, /Say one of these/i);
  const litSeen = await page.waitForSelector('[data-pick][data-lit="true"]', { timeout: 240_000 }).then(() => true).catch(() => false);
  check("the line said into the fake microphone lights up before it is sent (D8)", litSeen);
  check("and the countdown ring runs on it (D20)", (await page.locator('[data-pick][data-lit="true"] [data-send-ring]').count()) === 1);
  await waitForReply(page, was);
  let turns = lastTurns();
  let turn = turns[turns.length - 1] ?? {};
  check("the ring sends the lit line as the pick it is", turn.picked === true && /^Tere/.test(turn.said ?? ""), JSON.stringify(turn).slice(0, 160));
  check("a spoken turn carries what the dictionary repaired, and never what the machine heard", Array.isArray(turn.spoken?.repairs) && !("heard" in (turn.spoken ?? {})), JSON.stringify(turn.spoken));

  // ── Said into the box ────────────────────────────────────────────────────
  await choose(page, "radio", /^Say it$/i);
  await queue(page, "kohvi-palun");
  was = await theirCount(page);
  await pressMic(page, /Say your answer/i);
  const box = page.getByLabel("What you say");
  const filled = await eventually(async () => /kohvi/i.test(await box.inputValue()), { timeoutMs: 30_000 });
  check("what was heard goes into the box", filled, await box.inputValue());
  const focus = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName);
  check("and the caret did not move into it", focus !== "What you say", String(focus));
  const ringed = await page.waitForSelector("button [data-send-ring]", { timeout: 30_000 }).then(() => true).catch(() => false);
  check("the ring is on the button that sends it", ringed);
  await waitForReply(page, was);
  turns = lastTurns();
  turn = turns[turns.length - 1] ?? {};
  check("the ring sends a heard turn, marked spoken and not picked", /kohvi/i.test(turn.said ?? "") && turn.spoken && !turn.picked, JSON.stringify(turn).slice(0, 160));

  // ── Matching no line ─────────────────────────────────────────────────────
  await choose(page, "radio", /^Pick a line/i);
  await queue(page, "kohvi-palun");
  was = await theirCount(page);
  const sentBefore = lastTurns().length;
  await pressMic(page, /Say one of these/i);
  const toBox = await page.waitForSelector("[data-picks] input", { timeout: 30_000 }).then(() => true).catch(() => false);
  check("an utterance that matches no line goes to the box under the lines", toBox);
  await page.waitForTimeout(3_500);
  check("and is never sent as a pick, nor sent at all, until the learner sends it",
    lastTurns().length === sentBefore && (await page.locator('[data-pick][data-lit="true"]').count()) === 0,
    `${lastTurns().length} turns sent`);
  await page.locator("[data-picks]").getByRole("button", { name: /^Say it$/ }).click();
  await waitForReply(page, was);
  turns = lastTurns();
  turn = turns[turns.length - 1] ?? {};
  check("sent from the box, it is a spoken turn and not a pick", /kohvi/i.test(turn.said ?? "") && turn.spoken && !turn.picked, JSON.stringify(turn).slice(0, 160));

  // ── The ring stopped by a touch, and the words changed ───────────────────
  await choose(page, "radio", /^Say it$/i);
  await queue(page, "jah-see-on-koik");
  was = await theirCount(page);
  await pressMic(page, /Say your answer/i);
  await page.waitForSelector("button [data-send-ring]", { timeout: 30_000 }).catch(() => {});
  await box.click();
  await page.waitForTimeout(3_200);
  check("a touch stops the ring and the words stay in the box", (await page.locator("[data-send-ring]").count()) === 0 && /see on/i.test(await box.inputValue()), await box.inputValue());
  check("and nothing was sent while they stayed", (await theirCount(page)) === was);
  await box.fill("Jah, see on kõik, aitäh.");
  await page.getByRole("button", { name: /^Say it$/ }).click();
  await waitForReply(page, was);

  // ── The rest, by voice ───────────────────────────────────────────────────
  for (const clip of ["kaardiga-palun", "aitah-head-aega"]) {
    if (await page.locator("[data-recap-stats]").count()) break;
    await queue(page, clip);
    was = await theirCount(page);
    await pressMic(page, /Say your answer/i);
    await waitForReply(page, was);
  }
  if (!(await page.locator("[data-recap-stats]").count())) {
    await queue(page, "aitah-head-aega");
    await pressMic(page, /Say your answer/i);
  }
  const debriefed = await page.waitForSelector("[data-recap-stats]", { timeout: TURN_MS }).then(() => true).catch(() => false);
  check("a café is played to the end by voice", debriefed);
  const heardPanel = await page.locator("[data-what-we-heard]").innerText().catch(() => "");
  check("the debrief says what was heard where it is not what went, and that it is not a mark", /not a mark/i.test(heardPanel) && /aitäh/i.test(heardPanel), heardPanel.slice(0, 160));
  const run = await prisma.sceneRun.findFirst({ where: { ownerId: OWNER, sceneId: "kohvikus", endedAt: { not: null } }, select: { transcript: true } });
  const records = run ? JSON.parse(run.transcript).turns ?? [] : [];
  check("the transcript marks the spoken turns for the grades and keeps no hearing", records.some((r) => Array.isArray(r.repaired)) && !run?.transcript.includes('"heard":"Tere"'), `${records.filter((r) => Array.isArray(r.repaired)).length} of ${records.length}`);

  // ── The switch remembers ─────────────────────────────────────────────────
  await open(page, "helistamine", /^Voice only/i);
  await start(page);
  check("the next conversation opens the way the last one was answered", (await page.getByRole("radio", { name: /^Say it$/i }).getAttribute("aria-checked")) === "true");

  // ── A call ───────────────────────────────────────────────────────────────
  check("a call heard and not read looks like a call: a face, a clock, and no lines to read",
    (await page.locator("[data-call]").count()) === 1 && (await page.locator("[data-call-clock]").count()) === 1
      && !(await page.locator('[role="log"]').isVisible()));
  await queue(page, "tere");
  was = await theirCount(page);
  await pressMic(page, /Say your answer/i);
  await waitForReply(page, was);
  await queue(page, "aitah-head-aega");
  const opened = await page.waitForSelector('[data-scene-mic="listening"]', { timeout: 30_000 }).then(() => true).catch(() => false);
  check("after one press, the microphone opens by itself once they have spoken", opened);
  const ended = await page.waitForSelector("[data-recap-stats]", { timeout: TURN_MS }).then(() => true).catch(() => false);
  check("and the call is had to its goodbye hands-free", ended);

  // ── Talk it through, offered once the café was finished ──────────────────
  await page.goto(`${B}/situations/kohvikus`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 30_000 });
  const finished = await prisma.sceneRun.findMany({ where: { ownerId: OWNER, sceneId: "kohvikus", endedAt: { not: null } }, select: { outcome: true } });
  const allMet = finished.some((row) => { try { const o = JSON.parse(row.outcome); return o.missed?.length === 0 && o.met?.length > 0; } catch { return false; } });
  if (allMet) {
    check("Talk it through is offered once the scene has been got through", (await page.locator("[data-talk-through]").count()) === 1);
    await choose(page, "radio", /^Easy/i);
    await page.getByRole("button", { name: /Talk it through/i }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-who="them"]').length > 0, null, { timeout: TURN_MS });
    await settle(page);
    const shape = [
      await page.getByRole("radiogroup", { name: /How you answer/i }).count(),
      await page.getByRole("button", { name: /Show me what I.m trying to do/i }).count(),
      await page.getByRole("button", { name: /Say your answer/i }).count(),
    ];
    check("talking it through hides the switch and what to do, and leads with the microphone", shape.join() === "0,1,1", `switch, goal button, microphone: ${shape.join()}`);
    if (shape.join() !== "0,1,1") await page.screenshot({ path: "/tmp/claude-0/-home-user-kodukeel/bc3098c9-e9ff-58ea-9fed-8aa7f5872a41/scratchpad/vb4/talk.png", fullPage: true });
  } else {
    absent(2, "the café run above did not meet every objective, so Talk it through is rightly not offered");
  }
  check("nothing threw", errors.length === 0, errors.slice(0, 3).join(" | "));
  await context.close();

  // ── The microphone refused ───────────────────────────────────────────────
  const refusedBrowser = await launchChromium({ args: ["--use-fake-device-for-media-stream", "--deny-permission-prompts"] });
  try {
    const refused = await refusedBrowser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await refused.newPage();
    await open(p2, "kohvikus", /^Voice and text/i);
    await start(p2);
    await choose(p2, "radio", /^Say it$/i);
    await pressMic(p2, /Say your answer/i);
    const said = await p2.waitForSelector("text=/microphone is blocked/i", { timeout: 240_000 }).then(() => true).catch(() => false);
    check("with the microphone refused, the button says so in words", said, said ? "" : (await p2.locator("[data-scene-mic]").innerText().catch(() => "no microphone drawn")).slice(0, 160));
    if (!said) await p2.screenshot({ path: "/tmp/claude-0/-home-user-kodukeel/bc3098c9-e9ff-58ea-9fed-8aa7f5872a41/scratchpad/vb4/refused.png" });
    const was2 = await theirCount(p2);
    await p2.getByLabel("What you say").fill("Tere!");
    await p2.getByRole("button", { name: /^Say it$/ }).click();
    const typed = await waitForReply(p2, was2).then(() => true).catch(() => false);
    check("and the conversation goes on by typing", typed);
    await refused.close();
  } finally {
    await refusedBrowser.close();
  }
} finally {
  await browser.close();
  // Put back what this suite changed about how this learner answers and hears.
  await prisma.setting.deleteMany({ where: { ownerId: OWNER, key: { in: ["sceneAnswer", "sceneVoice"] } } });
  if (before.length > 0) await prisma.setting.createMany({ data: before });
  await cleanUp(["kohvikus", "helistamine"]);
  await prisma.$disconnect();
}

done();
