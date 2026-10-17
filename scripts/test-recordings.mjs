#!/usr/bin/env node
/**
 * Something real to listen to, the things around you, and the café out loud
 * (docs/41-fifth-batch.md, VB-12, VB-13 and VB-15), in a browser.
 *
 *   node scripts/test-recordings.mjs      against BASE_URL, a production build
 *
 * What only a browser can say:
 *
 *   - the reading page says the three-minute cap before a file is chosen, asks
 *     for the download with its size, decodes an Ogg voice message and hears it
 *     on the device, and the transcript matches what was said within the
 *     measured error;
 *   - no request carrying audio leaves the page, and the one request that does
 *     is the glossing call with the transcript's text in it (D16);
 *   - a line plays back from the recording, a file that is not sound is said to
 *     be one, a recording opened offline still reads with the dictionary asked
 *     for once the connection is back, a long one can be stopped, and one
 *     dragged onto the page opens;
 *   - the scanner's "things around me" takes a webcam photo with the model
 *     stubbed (as `scripts/test-scan.mjs` stubs it), offers the dictionary's own
 *     words with the others to choose between, makes cards under the scan
 *     source, and "Say them" grades nothing;
 *   - the landing café states the download's size before anything loads, plays
 *     by voice from a fixture clip, and still sends the server a pick's id and
 *     never the words; and with the microphone refused, picking still works.
 *
 * The speech model has to be where the server can serve it (`npm run asr:fetch`
 * before the build); without it every check here is waived by name.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchChromium, eventually } from "./lib/browser.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";

const B = baseUrl();
const OWNER = "local-single-user";
const { check, absent, done } = suite("Recordings, things and the café out loud", { floor: 45 });

const FIXTURE = "scripts/fixtures/speech/voice-message.ogg";
const SAID = "Ta on klassis rõõmus ja õpib hästi. Vead on väikesed. Palun lugege temaga kodus iga päev.";
const FAKE_MIC = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  "--use-file-for-fake-audio-capture=scripts/fixtures/speech/tere.wav",
];

/** Words as compared: lower case, punctuation off. */
const words = (text) => text.toLocaleLowerCase("et").replace(/\(heard least surely\)/g, " ").split(/\s+/)
  .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean);

/** Word error rate: edits over the reference's length. */
function wordErrorRate(reference, hypothesis) {
  const r = words(reference);
  const h = words(hypothesis);
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...new Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    }
  }
  return d[r.length][h.length] / Math.max(1, r.length);
}

/** A 16-bit mono WAV: the fixture's own samples, repeated with a pause between, for a long recording. */
function longWav(seconds) {
  const wav = readFileSync("scripts/fixtures/speech/voice-message.wav");
  const rate = wav.readUInt32LE(24);
  const data = wav.subarray(44);
  const gap = Buffer.alloc(Math.round(rate * 0.8) * 2);
  const parts = [];
  let length = 0;
  while (length / 2 / rate < seconds) {
    parts.push(data, gap);
    length += data.length + gap.length;
  }
  const body = Buffer.concat(parts);
  const head = Buffer.from(wav.subarray(0, 44));
  head.writeUInt32LE(36 + body.length, 4);
  head.writeUInt32LE(body.length, 40);
  const dir = mkdtempSync(join(tmpdir(), "kodukeel-recording-"));
  const path = join(dir, "long-message.wav");
  writeFileSync(path, Buffer.concat([head, body]));
  return path;
}

const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/**
 * axe over the screen as it stands, in the light theme and then the dark one:
 * the transcript and the things list are states no route arrives in, so the
 * sweep in `a11y-check.mjs` never sees them.
 */
async function axeBothThemes(page) {
  await page.addScriptTag({ content: AXE });
  const found = [];
  for (const theme of ["light", "dark"]) {
    const lines = await page.evaluate(async (dark) => {
      if (dark) document.documentElement.dataset.theme = "dark";
      else delete document.documentElement.dataset.theme;
      await new Promise((r) => setTimeout(r, 300));
      const run = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
      return run.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`);
    }, theme === "dark");
    found.push(...lines.map((l) => `${theme}: ${l}`));
  }
  await page.evaluate(() => { delete document.documentElement.dataset.theme; });
  return found;
}

/** One pixel of PNG, which the scanner's shrink can decode like any photo. */
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");


const browser = await launchChromium({ args: FAKE_MIC });
const startedAt = new Date();
let prisma = null;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(["microphone", "camera"], { origin: B });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // ---- VB-12: the reading page.
  await page.goto(`${B}/read`, { waitUntil: "domcontentloaded" });
  const panel = page.locator("section[data-recording]");
  const offered = await panel.first().waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
  if (!offered) {
    absent(45, "no speech model this server can serve: run npm run asr:fetch before the build");
    done();
  }
  const intro = await panel.first().innerText();
  check("the three-minute cap is said before a file is chosen", /up to 3 minutes/.test(intro), intro.slice(0, 160));
  check("and that the sound never leaves the device", /never leaves it/.test(intro));

  // The one request a page makes of its own on a fresh account is telling the
  // server the browser's zone (`TimeZoneSync`), which carries no sound and no
  // transcript; it is set aside by its exact body rather than by its timing.
  const zone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const zoneSync = JSON.stringify([zone]);
  const sent = [];
  page.on("request", (r) => {
    if (r.method() === "GET") {
      if (/\/api\/tts/.test(r.url())) sent.push({ url: r.url(), body: Buffer.alloc(0), tts: true });
      return;
    }
    sent.push({ url: r.url(), body: r.postDataBuffer() ?? Buffer.alloc(0), action: Boolean(r.headers()["next-action"]) });
  });

  await page.locator('input[type="file"][accept*="audio"]').setInputFiles(FIXTURE);
  const ask = page.getByRole("group", { name: "Download for speaking" });
  const asked = await ask.innerText({ timeout: 20_000 }).catch(() => "");
  check("a fresh device is asked for the download, with its size", /\d+ MB/.test(asked) && /stays on this device/.test(asked), asked.slice(0, 140));
  await ask.getByRole("button", { name: /^Download/ }).click();

  const article = page.locator("[data-recording] article[data-reading]");
  const heardIt = await article.waitFor({ timeout: 240_000 }).then(() => true).catch(() => false);
  check("the voice message is heard on the device and read back", heardIt);
  const lineText = heardIt ? (await page.locator(".recording-line p[lang=et]").allInnerTexts()).join(" ") : "";
  const wer = wordErrorRate(SAID, lineText);
  check("what was heard matches what was said within the measured error", wer <= 0.25, `${Math.round(wer * 100)}% of words wrong: ${lineText}`);
  const note = heardIt ? await page.locator("[data-recording] p").first().innerText() : "";
  check("the transcript says it is the machine's hearing, the wavy rule, and the measured error", /machine heard/.test(note) && /wavy underline/.test(note) && /one word in 12/.test(note), note);
  const linked = heardIt ? await page.locator(".recording-line p[lang=et] button").count() : 0;
  check("the dictionary is under the words", linked > 0, `${linked} words open an entry`);
  check("no speaker of the app's own voice is offered for a stranger's words", (await page.locator(".recording-line").getByRole("button", { name: "Hear the sentence" }).count()) === 0);
  const transcriptAxe = heardIt ? await axeBothThemes(page) : ["no transcript"];
  check("axe finds nothing on the transcript, light or dark", transcriptAxe.length === 0, transcriptAxe.join(" | "));

  const audio = sent.filter((r) => r.tts || /^(RIFF|OggS|ID3)/.test(r.body.subarray(0, 4).toString("latin1")) || r.body.length > 60_000);
  check("no request carrying audio leaves the page, and none goes to the speech service", audio.length === 0, audio.map((r) => r.url).join(", "));
  const ownPosts = () => sent.filter((r) => !r.tts && r.body.toString("utf8") !== zoneSync);
  const posts = ownPosts();
  check("the one request is the glossing call, with the transcript's text in it",
    posts.length === 1 && posts[0].action && /klassis/.test(posts[0].body.toString("utf8")),
    posts.map((r) => `${r.url} ${r.body.length}B`).join(", "));

  // A line played back from the recording, at the learner's pace.
  if (heardIt) {
    const first = page.locator(".recording-line").first();
    await first.getByRole("button", { name: /^Play from \d+:\d\d, at your pace/ }).click();
    const playing = await eventually(async () => (await first.getAttribute("data-playing")) === "true", { timeoutMs: 8_000 });
    check("a line plays from the recording itself", playing);
    const ended = await eventually(async () => (await first.getAttribute("data-playing")) === "false", { timeoutMs: 30_000 });
    check("and stops when it has been said", ended);
    check("playing it sent nothing anywhere", ownPosts().length === 1 && !sent.some((r) => r.tts));
  } else {
    absent(3, "a transcript to play a line of");
  }

  // Not a sound file, and a broken Ogg message, each said in words.
  await page.getByRole("button", { name: "Open another recording" }).click().catch(() => undefined);
  const picker = page.locator('input[type="file"][accept*="audio"]');
  await picker.setInputFiles({ name: "letter.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  const notSound = await page.locator("section[data-recording] [role=alert]").innerText().catch(() => "");
  check("a file that is not sound is said to be one", /isn.t a sound file/.test(notSound), notSound);
  await picker.setInputFiles({ name: "PTT-20261017.opus", mimeType: "audio/ogg", buffer: Buffer.from("OggS not really an ogg file at all") });
  const broken = await eventually(async () => /Ogg voice message/.test(await page.locator("section[data-recording] [role=alert]").innerText().catch(() => "")), { timeoutMs: 15_000 });
  check("an Ogg message the browser cannot open says so, naming Safari, rather than failing silently", broken);

  // Offline: the hearing works, the dictionary is asked for once the connection is back.
  await context.setOffline(true);
  await picker.setInputFiles("scripts/fixtures/speech/voice-message.wav");
  const plain = await page.getByText("The dictionary needs a connection").waitFor({ timeout: 120_000 }).then(() => true).catch(() => false);
  check("offline, the recording is still heard and shown, and says the dictionary needs a connection", plain);
  await context.setOffline(false);
  if (plain) {
    await page.getByRole("button", { name: "Look the words up" }).click();
    const back = await eventually(async () => (await page.locator(".recording-line p[lang=et] button").count()) > 0, { timeoutMs: 20_000 });
    check("and the dictionary is under the words once the connection is back", back);
  } else {
    absent(1, "the offline transcript to look up");
  }

  // A long one, stopped partway, at a phone's width.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("button", { name: "Open another recording" }).click().catch(() => undefined);
  await picker.setInputFiles(longWav(200));
  const stop = page.getByRole("button", { name: "Stop here" });
  const stoppable = await stop.waitFor({ timeout: 60_000 }).then(() => true).catch(() => false);
  check("a long recording can be stopped while it is heard", stoppable);
  await eventually(async () => /[1-9]\d* of \d+ pieces/.test(await page.locator("section[data-recording]").innerText().catch(() => "")), { timeoutMs: 60_000 });
  await stop.click().catch(() => undefined);
  const stoppedText = await page.locator("[data-recording]").last().innerText({ timeout: 60_000 }).catch(() => "");
  await page.getByText("You stopped it partway").waitFor({ timeout: 60_000 }).catch(() => undefined);
  const after = await page.locator("main").innerText();
  check("stopping keeps what was heard so far, and says it is the beginning", /You stopped it partway/.test(after) && (await page.locator(".recording-line").count()) > 0, stoppedText.slice(0, 80));
  check("a recording over three minutes says only the first three were heard", /Only the first 3 minutes/.test(after));
  const contained = await page.evaluate(() => {
    const root = document.scrollingElement;
    const box = document.querySelector("[data-recording] article")?.getBoundingClientRect();
    const overflowing = [...document.querySelectorAll(".recording-line")].filter((l) => {
      const r = l.getBoundingClientRect();
      return box && (r.left < box.left - 1 || r.right > box.right + 1);
    }).length;
    return { wide: root.scrollWidth > root.clientWidth + 1, overflowing };
  });
  check("a long transcript stays inside its box at 360 px", !contained.wide && contained.overflowing === 0, JSON.stringify(contained));
  await page.setViewportSize({ width: 1280, height: 900 });

  // Dragged onto the page, which is how a desktop shares a voice message (D25).
  await page.getByRole("button", { name: "Open another recording" }).click().catch(() => undefined);
  const bytes = [...readFileSync("scripts/fixtures/speech/voice-message.wav")];
  const overlay = await page.evaluate(async (data) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(data)], "voice.wav", { type: "audio/wav" }));
    window.dispatchEvent(new DragEvent("dragenter", { dataTransfer: transfer, bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    const shown = Boolean(document.querySelector(".recording-drop"));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }));
    return shown;
  }, bytes);
  check("a file dragged over the page shows where to drop it", overlay);
  const dropped = await article.waitFor({ timeout: 120_000 }).then(() => true).catch(() => false);
  check("and a dropped recording is opened and heard", dropped);

  // ---- VB-13: things around me, with the model stubbed.
  prisma = newPrismaClient(requireLocalDatabase("save a page of things and take its cards away again"));
  const pick = async (lemma) => prisma.lexeme.findFirst({ where: { lemma, provenance: "SEED" }, select: { id: true, lemma: true, translation: true, pos: true, cefr: true } });
  const [aken, tool, esimees] = [await pick("aken"), await pick("tool"), await prisma.lexeme.findFirst({ where: { lemma: "esimees" }, select: { id: true, lemma: true, translation: true, pos: true, cefr: true } })];
  if (!aken || !tool || !esimees) {
    absent(11, "the seeded words aken, tool and esimees: npm run db:seed");
  } else {
    const entry = (l) => ({ lexemeId: l.id, lemma: l.lemma, translation: l.translation, pos: l.pos, cefr: l.cefr });
    let asked = null;
    await page.route("**/api/scan", async (route) => {
      asked = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json", "x-model-provider": "Stub", "x-model-id": "stub-vision" },
        body: JSON.stringify({
          things: [
            { english: "window", picture: "🪟", entries: [entry(aken)] },
            { english: "chair", picture: null, entries: [entry(tool), entry(esimees)] },
            { english: "kodukeeltestgadget", picture: null, entries: [] },
          ],
        }),
      });
    });
    await page.goto(`${B}/scan`, { waitUntil: "domcontentloaded" });
    const things = page.getByRole("radio", { name: "Things around me" });
    if (!(await things.count())) {
      absent(11, "a provider key on the server, so the scanner offers a camera (any string: the route is stubbed)");
    } else {
      await things.click();
      await page.getByRole("button", { name: "Use the webcam" }).click();
      const take = page.getByRole("button", { name: "Take the photo" });
      const live = await eventually(async () => take.isEnabled(), { timeoutMs: 20_000 });
      check("on a computer the webcam is offered and opens", live);
      await take.click();
      await page.locator("[data-things]").waitFor({ timeout: 20_000 });
      check("the photo is sent as a things request, and the model is asked for nothing else", asked?.mode === "things" && /^data:image\/jpeg/.test(asked?.image ?? ""));
      const list = await page.locator("[data-things]").innerText();
      check("the dictionary's own Estonian is offered for each thing it vouches for", /aken/.test(list) && /tool/.test(list));
      check("a thing the dictionary has no entry for is shown in English, with nothing to tick", /kodukeeltestgadget/.test(list) && /Not in the dictionary/.test(list) && (await page.locator('[data-things] input[type="checkbox"]').count()) === 2);
      const thingsAxe = await axeBothThemes(page);
      check("axe finds nothing on the things list, light or dark", thingsAxe.length === 0, thingsAxe.join(" | "));
      const other = page.getByRole("button", { name: /^Use esimees/ });
      check("where a name could be two words, the other is on the screen to choose", (await other.count()) === 1);
      await other.click();
      check("and choosing it puts it in the row", /esimees/.test(await page.locator("[data-things] li").nth(1).innerText()));
      await page.getByRole("button", { name: /^Make 2 flashcards/ }).click();
      await page.getByText("is saved.").waitFor({ timeout: 20_000 });
      const cards = await prisma.card.findMany({ where: { ownerId: OWNER, lexemeId: { in: [aken.id, esimees.id] }, source: "SCAN", createdAt: { gte: startedAt } }, select: { lexemeId: true } });
      const scan = await prisma.scan.findFirst({ where: { ownerId: OWNER, createdAt: { gte: startedAt } }, orderBy: { createdAt: "desc" }, select: { id: true, items: true } });
      const saved = JSON.stringify(scan?.items ?? "");
      check("the ticked words become cards under the scan source, the chosen entry and not the first", cards.some((c) => c.lexemeId === esimees.id) && !saved.includes(tool.id) && saved.includes(esimees.id), `${cards.length} cards`);

      await page.getByRole("button", { name: "Say them" }).click();
      const say = page.locator("[data-say-them]");
      const lineShown = /aken/.test(await say.innerText()) && /esimees/.test(await say.innerText());
      await say.getByRole("button", { name: "Say them" }).click();
      const heard = await eventually(async () => /words were heard|Every word was heard/.test(await say.innerText()), { timeoutMs: 120_000 });
      check("Say them reads the ticked words along, once", lineShown && heard, (await say.innerText()).slice(0, 120));
      const graded = await prisma.review.count({ where: { ownerId: OWNER, lexemeId: { in: [aken.id, esimees.id] }, reviewedAt: { gte: startedAt } } });
      check("and grades nothing", graded === 0, `${graded} reviews`);
      // A picture chosen from a file goes the same way as the webcam's.
      await page.getByRole("button", { name: "Another photo" }).click();
      asked = null;
      await page.locator('input[type="file"][accept="image/*"]').last().setInputFiles({ name: "kitchen.png", mimeType: "image/png", buffer: PIXEL });
      const fromFile = await page.locator("[data-things]").waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
      check("a picture chosen from a file is shrunk on the device and read the same way", fromFile && /^data:image\/jpeg/.test(asked?.image ?? ""));
      if (scan) await prisma.scan.delete({ where: { id: scan.id } });
      await prisma.card.deleteMany({ where: { ownerId: OWNER, lexemeId: { in: [aken.id, esimees.id] }, source: "SCAN", createdAt: { gte: startedAt } } });
    }
    await page.unroute("**/api/scan");
  }

  // ---- VB-15: the café, by voice, on a device that already holds the model.
  const demo = [];
  const scripts = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/demo-scene")) demo.push(r.postData() ?? "");
    if (r.resourceType() === "script") scripts.push(r.url());
  });
  await page.goto(`${B}/welcome`, { waitUntil: "domcontentloaded" });
  await page.locator("#talk").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Walk up to the counter" }).click();
  await page.getByRole("group", { name: "What you say" }).waitFor({ timeout: 20_000 });
  const before = scripts.length;
  await page.getByRole("button", { name: "Say it instead" }).click();
  const voiceLoaded = await eventually(async () => (await page.locator("[data-cafe-voice]").count()) > 0, { timeoutMs: 20_000 });
  check("the voice loads on the press, as a script the page did not arrive with", voiceLoaded && scripts.length > before, `${scripts.length - before} scripts after the press`);
  const lit = await page.locator("[data-lit]").waitFor({ timeout: 120_000 }).then(() => true).catch(() => false);
  const status = lit ? await page.locator("[data-cafe-voice]").innerText().catch(() => "") : "";
  check("while the heard line is lit, the café says what it heard and that the line is lit", /Heard .*Tere.*that line is lit/.test(status), status);
  const said = await eventually(async () => (await page.locator('.cafe-line[data-who="you"]').count()) > 0, { timeoutMs: 120_000 });
  const youSaid = said ? await page.locator('.cafe-line[data-who="you"]').first().innerText() : "";
  check("the fixture clip is heard, matched to its line, lit and said", said && /Tere!/.test(youSaid), youSaid);
  const turns = demo.filter((body) => /"turns":\[\{/.test(body));
  check("the café still receives a pick's id and never the words", turns.length > 0 && turns.every((b) => !/Tere/.test(b)), turns.slice(0, 1).join(""));
  check("nothing threw on any of it", errors.length === 0, errors.join(" | "));
  await context.close();

  // A fresh device: the size first, nothing fetched until it is answered, and picking still works.
  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cafe = await fresh.newPage();
  const fetched = [];
  cafe.on("request", (r) => { if (/\/asr\//.test(r.url())) fetched.push(r.url()); });
  await cafe.goto(`${B}/welcome`, { waitUntil: "domcontentloaded" });
  await cafe.locator("#talk").scrollIntoViewIfNeeded();
  check("the landing page fetches nothing of the engine on arrival", fetched.length === 0, fetched.join(", "));
  await cafe.getByRole("button", { name: "Walk up to the counter" }).click();
  await cafe.getByRole("group", { name: "What you say" }).waitFor({ timeout: 20_000 });
  await cafe.getByRole("button", { name: "Say it instead" }).click();
  const prompt = cafe.getByRole("group", { name: "Download for speaking" });
  const sized = await prompt.innerText({ timeout: 20_000 }).catch(() => "");
  check("the café states the download's size before anything downloads", /\d+ MB/.test(sized) && !fetched.some((u) => u.includes("/asr/model")), sized.slice(0, 120));
  await prompt.getByRole("button", { name: "Not now" }).click();
  await cafe.getByRole("group", { name: "What you say" }).getByRole("button").first().click();
  const went = await eventually(async () => (await cafe.locator('.cafe-line[data-who="you"]').count()) > 0, { timeoutMs: 15_000 });
  check("declining it leaves the café exactly as it was: a pick still goes", went);
  await fresh.close();
} finally {
  await browser.close();
  await prisma?.$disconnect();
}

// With the microphone refused. A headless browser left to its own prompt
// leaves the request pending for ever rather than refusing it, which is not
// what a person who presses "Block" does. So the browser answers the way that
// press makes it answer: `getUserMedia` rejects with NotAllowedError.
const refusing = await launchChromium({ args: ["--use-fake-device-for-media-stream"] });
try {
  const context = await refusing.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  const page = await context.newPage();
  await page.goto(`${B}/welcome`, { waitUntil: "domcontentloaded" });
  await page.locator("#talk").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Walk up to the counter" }).click();
  await page.getByRole("group", { name: "What you say" }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Say it instead" }).click();
  await page.getByRole("group", { name: "Download for speaking" }).getByRole("button", { name: /^Download/ }).click();
  const told = await eventually(async () => /blocked for this site/.test(await page.locator("[data-cafe-voice]").innerText().catch(() => "")), { timeoutMs: 120_000 });
  check("with the microphone refused, the café says so in words", told);
  await page.getByRole("group", { name: "What you say" }).getByRole("button").first().click();
  const went = await eventually(async () => (await page.locator('.cafe-line[data-who="you"]').count()) > 0, { timeoutMs: 15_000 });
  check("and picking a line still goes", went);
} finally {
  await refusing.close();
}

done();
