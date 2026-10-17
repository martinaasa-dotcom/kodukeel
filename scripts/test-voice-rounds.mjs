/**
 * The rounds that take a spoken answer, in a browser (docs/41-fifth-batch.md,
 * VB-7, VB-8 and VB-9).
 *
 *   node scripts/test-voice-rounds.mjs      against BASE_URL, a production build
 *
 * Chromium's fake microphone is fed a fixture clip TartuNLP read, never a live
 * voice: a number read from its digits, a conjugation chant built off the
 * dictionary, and the device check's two greetings. What only a browser can say:
 *
 *   - the numbers round offers its microphone before anything is downloaded
 *     (speaking is the task there, D6), and what was heard goes into the box
 *     and is marked in digits;
 *   - once the model is on the device, the dictionary, 20 küsimust, Say what
 *     you see, the workbook and the reading page each take a spoken answer, and
 *     each puts what was heard where a typed answer goes;
 *   - the conjugation table, said as a chant, fills its rows;
 *   - before the model is chosen no round but the numbers draws a microphone,
 *     and with the microphone refused the numbers round says so in words and
 *     is answered by typing.
 *
 * The rounds a level decides (a written workbook page, a typed conjugation
 * table) are reached by holding the level at B1 for the run, the way
 * `test-workbook.mjs` does, and the rows that were there are put back after.
 * Anything this suite grades is deleted again, by id.
 *
 * Needs the model where the server can serve it (`npm run asr:fetch` before the
 * build). It is checked first and named if it is missing.
 */
import { launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { startRound } from "./lib/briefing.mjs";

const B = baseUrl();
const OWNER = "local-single-user";
const { check, absent, done } = suite("Voice rounds", { floor: 22 });

const FAKE_MIC = (clip) => [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-audio-capture=${clip}`,
];

/** Whether a control turns up within a few seconds. `isVisible` answers at once and never waits. */
const shows = (locator, timeout = 10_000) => locator.first().waitFor({ state: "visible", timeout }).then(() => true, () => false);

/** Press a microphone, downloading the model first if this device has not. */
async function pressMic(page, name) {
  await page.getByRole("button", { name }).first().click();
  const download = page.getByRole("button", { name: /^Download \d/ }).first();
  if (await shows(download, 3000)) await download.click();
}

/** The numbers round's own microphone, which is always offered: it is how a fresh device gets the model. */
async function downloadThroughNumbers(page) {
  await page.goto(`${B}/review/numbers`, { waitUntil: "domcontentloaded" });
  await startRound(page);
  if (!(await shows(page.getByRole("button", { name: "Say it out loud" })))) return false;
  await pressMic(page, "Say it out loud");
  await page.waitForFunction(
    () => document.querySelector("#number-answer")?.value.trim() || document.querySelector("[data-numbers-verdict]"),
    null, { timeout: 240_000 },
  ).catch(() => undefined);
  return true;
}

const response = await fetch(`${B}/asr/model/7edbacc1d13a4bc8fba21307753569e8334938a0/tokens.txt`).catch(() => null);
if (!response?.ok) {
  absent(22, "this server has no speech model to serve: run npm run asr:fetch before the build");
  done();
  process.exit(process.exitCode ?? 0);
}

const prisma = newPrismaClient(requireLocalDatabase("hold the level for a run and delete the reviews it writes"));
const LEVEL_KEYS = ["cefrPlacement", "cefrPlacementAt"];
const levelBefore = await prisma.setting.findMany({ where: { ownerId: OWNER, key: { in: LEVEL_KEYS } } });
const reviewsBefore = new Set((await prisma.review.findMany({ where: { ownerId: OWNER }, select: { id: true } })).map((r) => r.id));
for (const [key, value] of [["cefrPlacement", "B1"], ["cefrPlacementAt", new Date().toISOString()]]) {
  await prisma.setting.upsert({ where: { ownerId_key: { ownerId: OWNER, key } }, update: { value }, create: { ownerId: OWNER, key, value } });
}

try {
  /* ONE: a number, said, and the same clip into every round that takes a spoken answer. */
  {
    const browser = await launchChromium({ args: FAKE_MIC("scripts/fixtures/speech/number.wav") });
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.grantPermissions(["microphone"], { origin: B });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(`${B}/review/numbers`, { waitUntil: "domcontentloaded" });
      await startRound(page);
      const box = page.locator("#number-answer");
      if (!(await shows(box))) {
        absent(3, "the numbers round dealt nothing here: the fixture's deck has not met the number units");
      } else {
        const micBefore = await page.getByRole("button", { name: "Say it out loud" }).count();
        check("the numbers round offers its microphone before anything is downloaded (D6)", micBefore > 0, `${micBefore} microphones`);
        await pressMic(page, "Say it out loud");
        await page.waitForFunction(
          () => document.querySelector("#number-answer")?.value.trim() || document.querySelector("[data-numbers-verdict]"),
          null, { timeout: 240_000 },
        ).catch(() => undefined);
        const heard = await box.inputValue().catch(() => "");
        check("what was heard goes into the box", /\p{L}/u.test(heard), heard);
        if (!(await page.locator("[data-numbers-verdict]").count())) await page.getByRole("button", { name: "Check" }).click();
        const verdict = await page.locator("[data-numbers-verdict]").innerText({ timeout: 8000 }).catch(() => "");
        check("and is marked, with the feedback in digits", /\d/.test(verdict), verdict.replace(/\n/g, " | "));
      }

      // The dictionary takes the same word said, exactly as typed.
      await page.goto(`${B}/dictionary`, { waitUntil: "domcontentloaded" });
      const dictMic = page.getByRole("button", { name: "Say the word to look it up" });
      const drawn = await shows(dictMic);
      check("once the model is on the device, the dictionary draws a microphone", drawn);
      if (drawn) {
        await dictMic.first().click();
        await page.waitForURL(/[?&]q=/, { timeout: 60_000 }).catch(() => undefined);
        const q = new URL(page.url()).searchParams.get("q") ?? "";
        check("a word said into the dictionary is searched exactly as typed", q !== "", q);
        const box2 = await page.getByRole("textbox", { name: "Search the dictionary" }).inputValue().catch(() => "");
        check("and the box shows what was heard, as it would show what was typed", box2.trim() === q.trim(), `${box2} / ${q}`);
      } else {
        absent(2, "the dictionary drew no microphone, which the check above already reports");
      }

      // 20 küsimust: asked aloud, sent after the countdown.
      await page.goto(`${B}/review/twenty`, { waitUntil: "domcontentloaded" });
      await startRound(page);
      const ask = page.getByRole("button", { name: "Ask your question out loud" });
      if (await shows(ask)) {
        await ask.first().click();
        await page.waitForFunction(() => document.querySelector("#question")?.value.trim() !== "", null, { timeout: 60_000 }).catch(() => undefined);
        const question = await page.locator("#question").inputValue().catch(() => "");
        check("20 küsimust puts the question heard into the box", question.trim() !== "", question);
        const counting = await shows(page.locator("[data-send-ring]"), 2000);
        check("and counts down before asking it (D20)", counting);
        await page.waitForFunction(() => document.querySelectorAll('[aria-label="Your questions"] li').length > 0, null, { timeout: 15_000 }).catch(() => undefined);
        const asked = await page.locator('[aria-label="Your questions"] li').count();
        check("then asks it on its own, as though typed", asked > 0, `${asked} turns`);
      } else {
        check("20 küsimust draws a microphone once the model is on the device", false);
        absent(2, "20 küsimust drew no microphone, which the check above already reports");
      }

      // Say what you see: a sentence said goes into a box.
      await page.goto(`${B}/review/describe`, { waitUntil: "domcontentloaded" });
      await startRound(page);
      const sayIt = page.getByRole("button", { name: "Say a sentence" });
      if (await shows(sayIt)) {
        await sayIt.first().click();
        await page.waitForFunction(() => [...document.querySelectorAll("main ol input")].some((i) => i.value.trim() !== ""), null, { timeout: 60_000 }).catch(() => undefined);
        const filled = await page.$$eval("main ol input", (inputs) => inputs.filter((i) => i.value.trim() !== "").length);
        check("Say what you see puts a sentence said into a box", filled === 1, `${filled} boxes filled`);
      } else {
        absent(1, "Say what you see dealt no picture here");
      }

      // Töövihik, a written page: this clip lines up with no gap, so the page says so and fills nothing.
      await page.goto(`${B}/review/workbook?theme=present`, { waitUntil: "domcontentloaded" });
      await startRound(page);
      const readLine = page.getByRole("button", { name: "Read a line aloud, the gap filled" });
      if (await shows(readLine)) {
        const before = await page.$$eval("main input", (inputs) => inputs.filter((i) => i.value.trim() !== "").length);
        await readLine.first().click();
        await page.waitForFunction(() => /line up with a gap|went into line/.test(document.querySelector("main")?.textContent ?? ""), null, { timeout: 60_000 }).catch(() => undefined);
        const said = await page.locator("main").innerText();
        const after = await page.$$eval("main input", (inputs) => inputs.filter((i) => i.value.trim() !== "").length);
        check("the workbook takes a line read aloud and says where it went, or that it lined up with no gap", /line up with a gap|went into line/.test(said));
        check("and a reading that lines up with no gap fills no box", /went into line/.test(said) || after === before, `${before} then ${after}`);
      } else {
        absent(2, "the workbook dealt no written page here");
      }

      check("nothing threw", errors.length === 0, errors.slice(0, 3).join(" | "));
      await context.close();
    } finally {
      await browser.close();
    }
  }

  /* TWO: the conjugation table, said as a chant. */
  {
    const browser = await launchChromium({ args: FAKE_MIC("scripts/fixtures/speech/chant.wav") });
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.grantPermissions(["microphone"], { origin: B });
      const page = await context.newPage();
      await downloadThroughNumbers(page);
      await page.goto(`${B}/review/conjugation`, { waitUntil: "domcontentloaded" });
      await startRound(page);
      const chant = page.getByRole("button", { name: "Say the table out loud" });
      if (await shows(chant)) {
        await chant.first().click();
        await page.waitForFunction(() => {
          const text = document.querySelector("main")?.textContent ?? "";
          return /Heard \d of \d rows|which row/.test(text) || document.querySelector("main .verdict-panel");
        }, null, { timeout: 60_000 }).catch(() => undefined);
        const text = await page.locator("main").innerText();
        const rows = await page.$$eval("main input", (inputs) => inputs.filter((i) => i.value.trim() !== "").length);
        check("a chant said with its pronouns fills the table's rows", rows >= 4 || /Heard [4-6] of/.test(text), `${rows} rows filled`);
        check("and leaves the table to be checked or marks it, as typing would", /Heard \d of \d rows/.test(text) || (await page.locator("main .verdict-panel").count()) > 0);
      } else {
        check("the typed conjugation table offers the chant once the model is on the device", false);
        absent(1, "no chant was offered, which the check above already reports");
      }
      await context.close();
    } finally {
      await browser.close();
    }
  }

  /* THREE: the reading page, read aloud. */
  {
    const browser = await launchChromium({ args: FAKE_MIC("public/asr/check.wav") });
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.grantPermissions(["microphone"], { origin: B });
      const page = await context.newPage();
      await downloadThroughNumbers(page);
      await page.goto(`${B}/read`, { waitUntil: "domcontentloaded" });
      // The device check's own line: two phrase entries of the first unit.
      // Typed until the button it enables is enabled: a fill that lands before hydration is heard by nobody.
      const readIt = page.getByRole("button", { name: "Read it", exact: true });
      for (let tries = 0; tries < 30 && !(await readIt.isEnabled().catch(() => false)); tries++) {
        await page.locator("#reading").fill("Tere hommikust! Kuidas läheb?");
        if (!(await readIt.isEnabled().catch(() => false))) await page.waitForTimeout(300);
      }
      await readIt.click();
      const start = page.locator("[data-read-aloud-start]");
      if (await shows(start, 20_000)) {
        check("the reading page offers to be read aloud once the model is on the device", true);
        await start.click();
        await page.getByRole("button", { name: "Read this paragraph aloud" }).click();
        await page.waitForFunction(() => document.querySelectorAll('[data-reading-aloud] [data-lit="true"]').length >= 2, null, { timeout: 60_000 }).catch(() => undefined);
        const lit = await page.locator('[data-reading-aloud] [data-lit="true"]').count();
        check("and lights the words of a paragraph read aloud", lit >= 2, `${lit} words lit`);
      } else {
        check("the reading page offers to be read aloud once the model is on the device", false, "no Read it aloud button");
        absent(1, "the page was not offered to be read aloud");
      }
      await context.close();
    } finally {
      await browser.close();
    }
  }

  /* FOUR: before the model is chosen, and with the microphone refused. */
  {
    // Refused outright rather than left at a prompt nobody answers: a headless prompt is never answered,
    // which is a microphone that never opens and never says why, not a refusal.
    const browser = await launchChromium({ args: ["--use-fake-device-for-media-stream", "--deny-permission-prompts"] });
    try {
      // A fresh device: the model was never downloaded here.
      const fresh = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await fresh.newPage();
      await page.goto(`${B}/review/twenty`, { waitUntil: "domcontentloaded" });
      await startRound(page);
      await page.locator("#question").waitFor({ timeout: 15_000 }).catch(() => undefined);
      await page.waitForTimeout(1500);
      const twentyMic = await page.getByRole("button", { name: "Ask your question out loud" }).count();
      const footer = await page.getByText("Type your question, then press Enter").count();
      check("before the model is chosen, 20 küsimust draws no microphone and reads as it always did", twentyMic === 0 && footer > 0, `${twentyMic} microphones`);
      await page.goto(`${B}/dictionary`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const dictMic = await page.getByRole("button", { name: "Say the word to look it up" }).count();
      check("nor does the dictionary", dictMic === 0, `${dictMic} microphones`);

      // The numbers round still offers its microphone, and refused, it says so and is answered by typing.
      await page.goto(`${B}/review/numbers`, { waitUntil: "domcontentloaded" });
      await startRound(page);
      const box = page.locator("#number-answer");
      if (await shows(box)) {
        await pressMic(page, "Say it out loud");
        await page.waitForFunction(() => /blocked for this site|No microphone/.test(document.querySelector("main")?.textContent ?? ""), null, { timeout: 240_000 }).catch(() => undefined);
        const said = await page.locator("main").innerText();
        check("with the microphone refused, the numbers round says so in words", /The microphone is blocked for this site|No microphone was found/.test(said), said.replace(/\n/g, " | ").slice(0, 300));
        await box.fill("15");
        await page.getByRole("button", { name: "Check" }).click();
        const verdict = await page.locator("[data-numbers-verdict]").innerText({ timeout: 8000 }).catch(() => "");
        check("and is answered by typing, marked as before", verdict.trim() !== "", verdict.replace(/\n/g, " | "));
      } else {
        absent(2, "the numbers round dealt nothing here");
      }

      // The model is on this device now and the microphone is still refused: a round that takes speech in
      // its box says so and is played by typing, exactly as before.
      await page.goto(`${B}/review/twenty`, { waitUntil: "domcontentloaded" });
      await startRound(page);
      const ask = page.getByRole("button", { name: "Ask your question out loud" });
      if (await shows(ask)) {
        await ask.first().click();
        await page.waitForFunction(() => /blocked for this site|No microphone/.test(document.querySelector("main")?.textContent ?? ""), null, { timeout: 60_000 }).catch(() => undefined);
        check("refused, 20 küsimust says so in words", /The microphone is blocked for this site|No microphone was found/.test(await page.locator("main").innerText()));
        // One of the game's own ideas, so this file types no Estonian of its own.
        await page.getByText("Not sure what to ask?").click();
        await page.locator('details[open] button:has(span[lang="et"])').first().click();
        const typed = await page.locator("#question").inputValue().catch(() => "");
        await page.locator("#question").press("Enter");
        await page.waitForFunction(() => document.querySelectorAll('[aria-label="Your questions"] li').length > 0, null, { timeout: 15_000 }).catch(() => undefined);
        check("and a typed question is asked as it always was", typed.trim() !== "" && (await page.locator('[aria-label="Your questions"] li').count()) > 0, typed);
      } else {
        check("once the model is on the device, 20 küsimust draws its microphone even where it is refused", false);
        absent(1, "no microphone to refuse, which the check above already reports");
      }
      await fresh.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await prisma.setting.deleteMany({ where: { ownerId: OWNER, key: { in: LEVEL_KEYS } } });
  if (levelBefore.length) await prisma.setting.createMany({ data: levelBefore });
  const wrote = (await prisma.review.findMany({ where: { ownerId: OWNER }, select: { id: true } })).map((r) => r.id).filter((id) => !reviewsBefore.has(id));
  if (wrote.length) await prisma.review.deleteMany({ where: { id: { in: wrote } } });
  await prisma.$disconnect();
}

done();
