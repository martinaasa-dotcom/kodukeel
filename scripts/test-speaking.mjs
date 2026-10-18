/**
 * Saying it, in a browser (docs/41-fifth-batch.md, VB-5 and VB-6).
 *
 *   node scripts/test-speaking.mjs      against BASE_URL, a production build with the model fetched
 *
 * `test-speech.mjs` asks whether the engine hears a clip at all. This asks the
 * screens built on it, with Chromium's fake microphone fed a fixture clip and
 * never a live voice:
 *
 *   - the Speaking round loads nothing of the engine before a press, offers the
 *     microphone on every step because speaking is the task there (D6), and says
 *     how many words of the line were heard;
 *   - the recall step takes what was heard into the box, says so, and a miss
 *     writes nothing and says that it writes nothing;
 *   - hands-free starts, says what it does about the screen, and stops;
 *   - meeting a word on the Learn ladder offers "Your turn";
 *   - with the model on the device and the network cut, an answer said aloud in
 *     the flash round goes into the outbox carrying `spoken` (ADR-015);
 *   - with the microphone refused, every step still takes a typed answer, at a
 *     phone's width.
 *
 * Needs the model where the server can serve it (`npm run asr:fetch` before the
 * build). Without it the suite says so rather than reading it as the app failing.
 */
import { existsSync, readdirSync } from "node:fs";

import { eventually, launchChromium } from "./lib/browser.mjs";
import { startRound } from "./lib/briefing.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";

const B = baseUrl();
const { check, absent, done } = suite("Saying it", { floor: 25 });

const FAKE_MIC = (clip) => [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-audio-capture=${clip}`,
];

/**
 * Presses a download offer if one is up. None should be: the model is fetched
 * without a question (docs/41-fifth-batch.md section 8b), and the round's first
 * check says so. Kept so a regression reads as that check failing rather than
 * as every check behind it waiting on a prompt.
 */
async function acceptDownload(page) {
  const prompt = page.getByRole("group", { name: "Download for speaking" }).first();
  if (await prompt.isVisible({ timeout: 2000 }).catch(() => false)) {
    const asked = await prompt.innerText().catch(() => "");
    await prompt.getByRole("button", { name: /^Download/ }).click();
    return asked;
  }
  return null;
}

/** Every grade waiting in the offline outbox, read straight out of IndexedDB. */
async function outbox(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const open = indexedDB.open("kodukeel");
    open.onerror = () => resolve([]);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains("outbox")) { resolve([]); return; }
      const all = db.transaction("outbox", "readonly").objectStore("outbox").getAll();
      all.onsuccess = () => resolve(all.result ?? []);
      all.onerror = () => resolve([]);
    };
  }));
}

/** Presses through every briefing screen in front of a round (the ladder has two). */
async function startAll(page) {
  for (let i = 0; i < 3; i += 1) {
    if (!(await startRound(page))) break;
  }
}

/** Whether a model is where the build could have served it (`npm run asr:fetch`). */
function modelServed() {
  return existsSync("public/asr/model") && readdirSync("public/asr/model").length > 0;
}

if (!modelServed()) {
  absent(25, "this server has no speech model to serve: run npm run asr:fetch before the build");
  done();
  process.exit(process.exitCode ?? 0);
}

const browser = await launchChromium({ args: FAKE_MIC("scripts/fixtures/speech/tere.wav") });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(["microphone"], { origin: B });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const engine = [];
  page.on("request", (r) => { if (/\/asr\/(runtime|model)/.test(r.url())) engine.push(r.url()); });

  // The Speaking round.
  await page.goto(`${B}/review/speaking`, { waitUntil: "domcontentloaded" });
  await startAll(page);
  const stage = page.locator("[data-speaking-step]");
  const opened = await stage.first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
  if (!opened) {
    const said = (await page.locator("main").innerText().catch(() => "")).slice(0, 120);
    absent(17, `the Speaking round dealt nothing on this deck (${said}); seed and run scripts/demo-data.ts`);
  } else {
    check("the round opens on saying it along", (await stage.getAttribute("data-speaking-step")) === "along");
    check("nothing of the engine loads before a press", engine.length === 0, engine.join(", "));
    const along = page.getByRole("button", { name: "Say it along" });
    check("the microphone is offered before anything is downloaded (speaking is the task, D6)", await along.isVisible());

    await along.click();
    const asked = await acceptDownload(page);
    check("the first press asks no question: it fetches the model and listens (docs/41 section 8b)", asked === null, (asked ?? "").slice(0, 100));
    const counted = await page.waitForFunction(
      () => /words were heard|Every word was heard|That's the word|heard as the word this time/.test(document.querySelector("[data-speaking-step]")?.textContent ?? ""),
      null,
      { timeout: 240_000 },
    ).then(() => true, () => false);
    const status = await page.locator("[data-speaking-step] [role=status]").first().innerText().catch(() => "");
    check("the line says how many of its words were heard", counted, status);
    check("what was heard can be heard back while online", (await page.locator("[data-hear-heard]").count()) > 0);

    await page.getByRole("button", { name: /Next step/ }).click();
    check("saying it back hides the words", /The words are hidden until you have said them/.test(await stage.innerText()));
    await page.getByRole("button", { name: /Next step/ }).click();
    check("the third step asks from the meaning", (await stage.getAttribute("data-speaking-step")) === "meaning");

    // Answered aloud: what was heard goes into the box, or it was the word and is graded.
    await page.getByRole("button", { name: "Answer out loud" }).click();
    const heard = await page.waitForFunction(() => {
      const box = document.querySelector("#speaking-answer");
      const text = document.querySelector("[data-speaking-step]")?.textContent ?? "";
      return (box && box.value.trim().length > 0) || /Heard, and right/.test(text);
    }, null, { timeout: 60_000 }).then(() => true, () => false);
    const after = await stage.innerText();
    check(
      "a spoken answer fills the box and says it can be changed, or is graded as heard",
      heard && (/This is what was heard\. Change anything/.test(after) || /Heard, and right/.test(after)),
      after.replace(/\s+/g, " ").slice(0, 160),
    );
    if (/This is what was heard/.test(after)) {
      await page.locator("#speaking-answer").fill("qqqq");
      await page.getByRole("button", { name: "Check", exact: true }).click();
      const missed = await stage.innerText();
      check("a missed recall says nothing is written down for it", /Nothing is written down for a miss here/.test(missed), missed.replace(/\s+/g, " ").slice(0, 160));
    } else {
      absent(1, "the clip happened to be the word asked for, so there was no miss to make on this item");
    }
    await page.getByRole("button", { name: /Next line/ }).click();
    check("the next line starts again with them", (await stage.getAttribute("data-speaking-step")) === "along");

    await page.locator("[data-hands-free]").click();
    const panel = page.locator("[data-hands-free-pause]");
    const freeText = await panel.innerText({ timeout: 10_000 }).catch(() => "");
    const whole = await page.locator("main").innerText();
    check("hands-free says it can be paused anywhere", /Tap anywhere here to (pause|carry on)/.test(freeText), freeText);
    check(
      "hands-free says what happens to the screen",
      /The screen stays on|would not keep the screen on/.test(whole),
    );
    // Space is the pause, for a keyboard and a headset's own button alike; and the pause holds.
    await page.keyboard.press("Space");
    const pausedText = await panel.innerText().catch(() => "");
    const stepWhenPaused = await stage.getAttribute("data-speaking-step");
    await page.waitForTimeout(3500);
    check(
      "Space pauses hands-free, and a paused round stays on its step",
      /Paused/.test(pausedText) && (await stage.getAttribute("data-speaking-step")) === stepWhenPaused,
      pausedText,
    );
    await page.getByRole("button", { name: "Stop hands-free" }).click();
    check("hands-free stops on a press", (await panel.count()) === 0);

    // "Show me" is not a miss, and the screen does not say it was.
    await page.getByRole("button", { name: /Next step/ }).click();
    await page.getByRole("button", { name: /Next step/ }).click();
    await page.getByRole("button", { name: "Show me" }).click();
    const shownText = await stage.innerText();
    check("asking to be shown says nothing is written down, and does not call it a miss",
      /Here it is\. Nothing is written down for this one/.test(shownText) && !/Not this time/.test(shownText),
      shownText.replace(/\s+/g, " ").slice(0, 160));
    check("and there is no empty answer box left behind it", (await page.locator("#speaking-answer").count()) === 0);
  }

  /*
    Meeting a word on the Learn ladder. The fixture's ladder opens on five words
    already met, which are past the meet rung, so they are put aside the way a
    learner would ("Too complicated", then "Put it aside") until a fresh word
    comes up to be met, and brought back from My words afterwards, so the deck
    is left as it was found for every suite after this one.
  */
  await page.goto(`${B}/learn/new`, { waitUntil: "domcontentloaded" });
  const yourTurn = page.getByRole("button", { name: "Say it yourself" });
  let putAside = 0;
  let reopened = false;
  for (let i = 0; i < 12 && !(await yourTurn.count()); i += 1) {
    await startAll(page);
    const ready = page.getByRole("button", { name: /^(Ready|Show me)/ });
    if (await ready.isVisible({ timeout: 3000 }).catch(() => false)) { await ready.click(); await page.waitForTimeout(500); continue; }
    const aside = page.getByRole("button", { name: /^Ask about putting .* aside/ });
    if (!(await aside.first().waitFor({ timeout: 8000 }).then(() => true, () => false))) {
      // A round of words all put aside ends; the next one opens on fresh words.
      if (putAside === 0 || reopened) break;
      reopened = true;
      await page.goto(`${B}/learn/new`, { waitUntil: "domcontentloaded" });
      continue;
    }
    await aside.first().click();
    await page.getByRole("button", { name: "Put it aside" }).click();
    await page.getByText(/Put aside for now/).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
    putAside += 1;
  }
  if (await yourTurn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    check("meeting a word offers Your turn", true);
    await yourTurn.first().click();
    const outcome = await page.waitForFunction(
      () => /Heard\. That's the word|wasn't heard as the word this time/.test(document.querySelector("main")?.textContent ?? ""),
      null,
      { timeout: 60_000 },
    ).then(() => true, () => false);
    check("and says in words whether the word was heard", outcome);
  } else {
    absent(2, `the ladder offered no word to meet after putting ${putAside} aside (${(await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 120)})`);
  }
  if (putAside > 0) {
    await page.goto(`${B}/words/mastery`, { waitUntil: "load" });
    const back = page.getByRole("button", { name: /^Bring .+ back$/ });
    await back.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    /* A press that lands before the page has hydrated reaches no handler, so
       each one is pressed until its row goes rather than once. */
    for (let tries = 0; tries < putAside * 4 && (await back.count()) > 0; tries += 1) {
      const before = await back.count();
      await back.first().click();
      await eventually(async () => (await back.count()) < before, { timeoutMs: 3000 });
    }
    check("every word put aside to reach the meet rung is brought back", (await back.count()) === 0, `${await back.count()} still aside`);
  } else {
    absent(1, "nothing was put aside to reach the meet rung, so there was nothing to bring back");
  }

  // The flash round, offline, answered aloud.
  await page.goto(`${B}/review/flashcards`, { waitUntil: "domcontentloaded" });
  await startAll(page);
  const mic = page.getByRole("button", { name: "Answer out loud" });
  if (await mic.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
    check("with the model on the device, the answer box offers the microphone (D6)", true);
    await context.setOffline(true);
    try {
      const before = (await outbox(page)).length;
      await mic.first().click();
      await page.waitForFunction(() => {
        const box = document.querySelector("#answer");
        return (box && box.value.trim().length > 0) || document.querySelector("main [class*='verdict']");
      }, null, { timeout: 60_000 }).catch(() => undefined);
      const checkIt = page.getByRole("button", { name: /Check it/ });
      if (await checkIt.isEnabled().catch(() => false)) await checkIt.click();
      await page.waitForTimeout(1500);
      const waiting = await outbox(page);
      const spoken = waiting.filter((g) => g.spoken === true);
      check(
        "offline, an answer said aloud goes into the outbox carrying spoken",
        waiting.length > before && spoken.length > 0,
        `${waiting.length - before} queued, ${spoken.length} spoken`,
      );
    } finally {
      await context.setOffline(false);
    }
  } else {
    absent(2, "the flash round dealt a shape with no answer box to speak into on this deck");
  }

  check("nothing threw", errors.length === 0, errors.slice(0, 3).join(" | "));
  await context.close();
} finally {
  await browser.close();
}

// The microphone refused, at a phone's width: every step still takes a typed answer.
const refusedBrowser = await launchChromium({ args: ["--use-fake-device-for-media-stream"] });
try {
  const refused = await refusedBrowser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true });
  /*
    Refused the way a browser refuses once somebody has said no: the request
    rejects with NotAllowedError. Headless Chromium left with no answer neither
    grants nor refuses, it holds the request, which is not a state a person is
    ever in, so the refusal is stated rather than waited for.
  */
  await refused.addInitScript(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
    }
  });
  const page = await refused.newPage();
  await page.goto(`${B}/review/speaking`, { waitUntil: "domcontentloaded" });
  await startAll(page);
  const stage = page.locator("[data-speaking-step]");
  if (await stage.first().waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
    await page.getByRole("button", { name: "Say it along" }).click();
    await acceptDownload(page);
    await page.waitForFunction(
      () => /blocked for this site|No microphone/.test(document.querySelector("main")?.textContent ?? ""),
      null,
      { timeout: 240_000 },
    ).catch(() => undefined);
    check(
      "with the microphone refused, the round says so in words",
      /The microphone is blocked for this site|No microphone was found/.test(await page.locator("main").innerText()),
    );
    await page.getByRole("button", { name: /Next step/ }).click();
    await page.getByRole("button", { name: /Next step/ }).click();
    await page.locator("#speaking-answer").fill("qqqq");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    const typed = await stage.innerText();
    check("and the recall takes a typed answer instead", /Not this time|Right\.|Nearly/.test(typed), typed.replace(/\s+/g, " ").slice(0, 120));
  } else {
    absent(2, "the Speaking round dealt nothing on this deck");
  }
  await refused.close();
} finally {
  await refusedBrowser.close();
}

done();
