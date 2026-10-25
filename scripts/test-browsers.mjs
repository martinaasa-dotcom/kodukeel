#!/usr/bin/env node
/**
 * THE PATHS MOST LIKELY TO DIFFER, IN WEBKIT AND FIREFOX (docs/44-sixth-batch.md, C-2).
 *
 *   node scripts/test-browsers.mjs --engine=webkit      against BASE_URL
 *   node scripts/test-browsers.mjs --engine=firefox
 *
 * Every other browser suite here runs in Chromium, and Safari is the browser on
 * every iPhone. This is one suite run once per engine, against a production
 * build started with `ASR_BENCH=1`, VAPID keys and the speech model fetched,
 * after `scripts/demo-data.ts` has laid the deck down. It asks:
 *
 *   - every route answers with one `main`, one `h1` and nothing thrown, which is
 *     `test-first-day.mjs`'s question asked of two more engines;
 *   - a review card answered by choosing and by typing, and the grades landing
 *     in the database;
 *   - the offline outbox: a grade with the network cut, a reload, and the queue
 *     draining when the network returns;
 *   - the speech engine loading in a worker and hearing `public/asr/check.wav`
 *     through the file path, giving the words the golden file records;
 *   - the reading page and an Ogg voice message: refused in WebKit with the
 *     sentence that names Safari, or heard; opened in Firefox; and the same
 *     message on a second page ending, heard or refused in words, after at
 *     most one more download of the model;
 *   - a microphone refused, and the Speaking round still answered by typing;
 *   - the reminders panel drawn only where the browser has Web Push;
 *   - a native recording playing, and the learner's own turn played back beside
 *     a native line with both rows of bars drawn;
 *   - the sounds page spelling a name letter by letter, each letter lit in turn;
 *   - the conversation's composer at the foot of a phone's window, above the
 *     clearance the bar publishes, while a turn is typed and sent.
 *
 * NO FAKE MICROPHONE FLAG. Chromium's has no equivalent in WebKit, and Firefox's
 * fake stream is a tone. So where a screen listens, the page's own
 * `getUserMedia` is answered by a stream this suite makes out of the fixture clip
 * with Web Audio, in the page, which is a path every engine has. What is being
 * asked of the engine is everything after that: the capture worklet, the worker,
 * the WebAssembly, how the turn is held and played back.
 *
 * A difference found here is a fault in the app until it is shown to be the
 * engine, and a check an engine genuinely cannot make is waived by number with
 * the engine named (`absent`), never passed.
 */
import { readFileSync } from "node:fs";
import { engineName, eventually, launchEngine } from "./lib/browser.mjs";
import { startRound } from "./lib/briefing.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { retypeMiss } from "./lib/review.mjs";
import { appRoutes } from "./lib/routes.mjs";

const ENGINE = engineName();
const B = baseUrl();
/* The server's own host, so a fetch of its own file cut short is told apart from a fault. */
const OWN_HOST = new URL(B).host;
const OWNER = "local-single-user";
const ROUTES = appRoutes();
/*
  Floor: one per route, measured on the 106 the app has, plus the 30 checks
  after the walk. It moves when a route is added, which is the point.
*/
const { check: rawCheck, absent: rawAbsent, done } = suite(`The paths in ${ENGINE}`, { floor: 136 });
const check = (label, ok, extra = "") => rawCheck(`${ENGINE}: ${label}`, ok, extra);
const absent = (count, why) => rawAbsent(count, `${why} (${ENGINE})`);

const GOLDEN = JSON.parse(readFileSync("lib/speech/fixtures/golden.json", "utf8"));
const CHECK_CLIP = GOLDEN.clips.find((c) => c.file === "public/asr/check.wav");
const OGG = "scripts/fixtures/speech/voice-message.ogg";
const SAFARI_SENTENCE = /Safari opens them only partly/;
const NATIVE_WAV = readFileSync("public/audio/native/word-tere-hommikust.wav");

/** Words as compared: lower case, punctuation off. */
const words = (text) => text.toLocaleLowerCase("et").split(/\s+/)
  .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean);
const sameWords = (a, b) => words(a).join(" ") === words(b).join(" ");

/**
 * A microphone made out of the fixture clip, in the page.
 *
 * `getUserMedia` is answered with a `MediaStreamAudioDestinationNode`'s stream,
 * fed `public/asr/check.wav` once and silence after it, so the engine's own
 * endpointing closes the turn the way it closes a learner's. The audio context
 * is made on the first press, because a context made after the awaits that load
 * the engine has lost the press, and an engine strict about that starts it
 * suspended. `localStorage["suite.mic"] = "refuse"` makes it refuse instead, the
 * way a browser refuses once somebody has said no.
 */
function microphone() {
  const devices = navigator.mediaDevices;
  if (!devices) return;
  let context = null;
  const prime = () => {
    try {
      context ??= new AudioContext();
      void context.resume();
    } catch {
      // No Web Audio: the engine's own path will say so.
    }
  };
  addEventListener("pointerdown", prime, true);
  addEventListener("keydown", prime, true);
  const answer = async () => {
    if (localStorage.getItem("suite.mic") === "refuse") {
      throw new DOMException("Permission denied", "NotAllowedError");
    }
    prime();
    const bytes = await (await fetch("/asr/check.wav")).arrayBuffer();
    const buffer = await context.decodeAudioData(bytes);
    const out = context.createMediaStreamDestination();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    source.start(context.currentTime + 0.3);
    window.__micFed = (window.__micFed ?? 0) + 1;
    return out.stream;
  };
  /* On the prototype as well as the object. Measured in WebKit: the property
     set on `navigator.mediaDevices` was gone after the first press on the page,
     and the real `getUserMedia` answered instead, refusing. */
  devices.getUserMedia = answer;
  try {
    Object.defineProperty(Object.getPrototypeOf(devices), "getUserMedia", { value: answer, configurable: true, writable: true });
  } catch {
    // A prototype that will not take it: the property on the object stands.
  }
}

const browser = await launchEngine(ENGINE);
const errorsOf = (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(`threw: ${String(e.message ?? e)}`.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error" && /Minified React error|Hydration|hydrat/i.test(m.text())) errors.push(`logged: ${m.text()}`.slice(0, 200));
  });
  return errors;
};

/**
 * Whether this browser, on this machine, can play a recording out loud at all.
 *
 * Headless WebKit and Firefox on a Linux runner have no sound device: measured
 * here, WebKit refuses `play()` on a committed WAV with `NotSupportedError`, and
 * Firefox plays it on a clock while its media element reports
 * `OnMediaSinkAudioError`, which the app reads as the end of the clip. Neither is
 * the app, and neither is what a phone does, so the checks that need a speaker
 * are waived naming what the browser said, and never passed. Returns null where
 * a clip plays cleanly, or what went wrong.
 */
async function noSpeaker(page) {
  return page.evaluate(async () => {
    const audio = new Audio("/audio/native/word-tere.wav");
    try {
      await audio.play();
    } catch (e) {
      return `play() refused a WAV (${e?.name ?? "error"})`;
    }
    await new Promise((r) => setTimeout(r, 600));
    const said = audio.error ? `the media element reported ${audio.error.message || `error ${audio.error.code}`}` : null;
    audio.pause();
    return said;
  }).catch((e) => `could not ask (${String(e).slice(0, 80)})`);
}

/**
 * Whether Web Audio's clock runs in this browser, on this machine.
 *
 * The capture worklet and the comparison's bars both run on an `AudioContext`.
 * Measured here, headless Firefox on a Linux runner with no sound device keeps
 * every context `suspended` with its clock at nought, even after a press, while
 * WebKit's runs. A context that never starts hears nothing and draws nothing,
 * which is the machine rather than the app, so those checks are waived naming
 * what the browser said. Returns null where the clock runs.
 */
async function noAudioClock(page) {
  return page.evaluate(async () => {
    const context = new AudioContext();
    await Promise.race([context.resume(), new Promise((r) => setTimeout(r, 2000))]);
    const start = context.currentTime;
    await new Promise((r) => setTimeout(r, 600));
    const said = context.state !== "running" || context.currentTime <= start
      ? `an AudioContext stays ${context.state} with its clock at ${context.currentTime.toFixed(2)}s`
      : null;
    await context.close().catch(() => {});
    return said;
  }).catch((e) => `could not ask (${String(e).slice(0, 80)})`);
}

/** Wait for a page to be worth measuring: `main` with text in it and an `h1`. Best-effort, as in `test-first-day.mjs`. */
async function settle(page, budgetMs) {
  await page.locator("main").first().waitFor({ timeout: budgetMs }).catch(() => {});
  await eventually(async () => {
    const text = await page.locator("main").first().innerText().catch(() => "");
    return text.trim().length >= 40 && (await page.locator("h1").count()) >= 1;
  }, { timeoutMs: budgetMs, everyMs: 200 });
  await page.waitForTimeout(200);
}

try {
  // ── Every route ──────────────────────────────────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    const page = await context.newPage();
    const errors = errorsOf(page);
    for (const route of ROUTES) {
      const started = Date.now();
      /*
        Through a blank page first, and the slate wiped once it has loaded. A
        hard navigation away from a page with links on it aborts the router's
        prefetches in flight, and WebKit reports each aborted fetch to the page
        that is going away as "cannot load ... due to access control checks",
        which arrived here as an error on the next route. Nobody reaches a
        route that way, and an error the route itself throws is still caught.
      */
      await page.goto("about:blank").catch(() => {});
      await page.waitForTimeout(150);
      errors.length = 0;
      let status = 0;
      let text = "";
      let headings = 0;
      try {
        const res = await page.goto(`${B}${route}`, { waitUntil: "domcontentloaded", timeout: 40_000 });
        status = res?.status() ?? 0;
        await settle(page, 30_000);
        text = (await page.locator("main").first().innerText()).replace(/\s+/g, " ").trim();
        headings = await page.locator("h1").count();
      } catch (error) {
        check(`${route} answers`, false, `${String(error).split("\n")[0].slice(0, 100)} after ${Math.round((Date.now() - started) / 100) / 10}s`);
        continue;
      }
      /*
        A router prefetch the page itself gave up on is not an error the app
        threw. WebKit reports every fetch cut short as "cannot load ... due to
        access control checks", and two routes here cut their own prefetches
        short by moving on as they load (a module screen with no evening sends
        the learner on), measured on /course/chat and /course/learn. Anything
        else thrown still fails the route.
      */
      const thrown = errors.filter((e) => !(/[?&]_rsc=/.test(e) && /access control checks/.test(e)));
      const ok = status < 400 && text.length >= 40 && headings === 1 && thrown.length === 0;
      check(`${route} answers`, ok, ok ? "" :
        status >= 400 ? `HTTP ${status}`
          : thrown.length ? thrown[0]
            : headings !== 1 ? `${headings} h1 elements`
              : `main holds ${text.length} characters: "${text.slice(0, 60)}"`);
    }
    await context.close();
  }

  // ── A review card, chosen and typed, and the grades landing ───────────────
  const db = newPrismaClient(requireLocalDatabase("test-browsers.mjs reads the review log"));
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    const errors = errorsOf(page);
    const app = page.locator("main");
    const since = new Date();
    const graded = async () => {
      const body = (await page.textContent("body")) ?? "";
      const found = /(\d+) graded/.exec(body) ?? /Reviewed\s*(\d+)/.exec(body);
      return found ? Number(found[1]) : -1;
    };
    const press = async (locator) => locator.first().click({ timeout: 4000 }).then(() => true, () => false);
    /** What a typed card asks, as far as telling one card from another needs. */
    const promptOf = async () => ((await app.innerText().catch(() => "")).split(/Type the answer/)[0] ?? "")
      .replace(/\d+ (left|recalled|graded)/g, "").replace(/\s+/g, " ").trim().slice(-80);
    const learned = new Map();

    /** Answers the card on screen and returns the shape it was, and whether a grade was written. */
    async function answer() {
      const before = await graded();
      const meet = app.getByRole("button", { name: /Got it, ask me later/ });
      if (await meet.count()) {
        await press(meet);
        await page.waitForTimeout(400);
        return { shape: "meet", graded: false };
      }
      let shape = null;
      if (await app.getByRole("button", { name: /Show answer/ }).count()) {
        shape = "flip";
        await press(app.getByRole("button", { name: /Show answer/ }));
        await page.waitForTimeout(250);
        await press(app.getByRole("button", { name: /^Got it(?!, ask me later)/ }));
      } else if ((await page.getByText(/Pick the meaning/).count()) || (await app.locator("button.choice-btn").count()) >= 2) {
        shape = "choice";
        await page.keyboard.press("1");
        await page.waitForTimeout(300);
        const next = app.getByRole("button", { name: /Got it, next|Correct|Õige/ });
        if (await next.count()) await press(next);
      } else if (await page.locator("main input[type='text'], main input:not([type])").count()) {
        /*
          Missed the first time it comes round, which shows the answer, and
          answered right the next, so the card leaves the sitting. A sitting
          due cards fill and every miss puts back would otherwise go round its
          typed cards for ever, and the recognition cards still being learned,
          which are the ones asked by choosing, sit behind them.
        */
        shape = "typed";
        const prompt = await promptOf();
        const box = page.locator("main input[type='text'], main input:not([type])").first();
        await box.fill(learned.get(prompt) ?? "zzz");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);
        const shown = (await page.locator("main [data-answer]").first().textContent().catch(() => ""))?.trim();
        if (shown) learned.set(prompt, shown.split(" / ")[0].trim());
        await retypeMiss(page);
      }
      const next = app.getByRole("button", { name: /^Got it, next/ });
      if ((await next.count()) && (await next.first().isEnabled().catch(() => false))) await press(next);
      await eventually(async () => (await graded()) > before, { timeoutMs: 5000 });
      return { shape, graded: (await graded()) > before };
    }

    /*
      THE CARDS ASKED BY CHOOSING ARE THE ONES BEING RELEARNED, and the fixture
      leaves them ten minutes out: `demo-data.ts` grades its histories as of
      now, and a lapse puts a card on the scheduler's ten-minute step. A new
      card's first question waits behind every due card of the sitting, and a
      card still on the learn ladder is the ladder's. So the earliest relearning
      recognition card is waited for, up to a quarter of an hour, which after
      the walk above is nearly always no wait at all.
    */
    const relearning = await db.card.findFirst({
      where: { ownerId: OWNER, cardType: "RECOGNITION", state: 3, suspended: false },
      orderBy: { due: "asc" }, select: { due: true },
    });
    const wait = relearning ? relearning.due.getTime() - Date.now() : 0;
    if (wait > 0 && wait < 15 * 60_000) await page.waitForTimeout(wait + 2000);

    await page.goto(`${B}/review`, { waitUntil: "domcontentloaded" });
    await startRound(page);
    await settle(page, 30_000);
    const answered = new Map();
    for (let i = 0; i < 60 && !(answered.get("choice") && answered.get("typed")); i += 1) {
      if (/Session complete|Nothing due|caught up|No cards yet/.test((await page.textContent("body")) ?? "")) break;
      const result = await answer();
      if (!result.shape) break;
      if (result.graded) answered.set(result.shape, (answered.get(result.shape) ?? 0) + 1);
    }
    check("a review card is answered by choosing, and graded", (answered.get("choice") ?? 0) > 0, JSON.stringify(Object.fromEntries(answered)));
    check("a review card is answered by typing, and graded", (answered.get("typed") ?? 0) > 0, JSON.stringify(Object.fromEntries(answered)));
    const total = [...answered.values()].reduce((a, b) => a + b, 0);
    const landed = await eventually(async () => (await db.review.count({ where: { ownerId: OWNER, reviewedAt: { gte: since } } })) >= total, { timeoutMs: 15_000 });
    const rows = await db.review.count({ where: { ownerId: OWNER, reviewedAt: { gte: since } } });
    check("every grade landed in the review log", total > 0 && landed, `${rows} rows for ${total} grades`);
    check("the review screens threw nothing", errors.length === 0, errors.slice(0, 2).join(" | "));
    await context.close();
  }

  // ── The offline outbox ─────────────────────────────────────────────────────
  {
    const OUTBOX_CHECKS = 5;
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    const errors = errorsOf(page);
    const outbox = () => page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open("kodukeel", 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("outbox")) return resolve(0);
        const count = db.transaction("outbox", "readonly").objectStore("outbox").count();
        count.onsuccess = () => resolve(count.result);
        count.onerror = () => resolve(-1);
      };
      req.onerror = () => resolve(-1);
    })).catch(() => -1);

    await page.goto(`${B}/review`, { waitUntil: "domcontentloaded" });
    await startRound(page);
    await settle(page, 30_000);
    /* The page cache is filled by the worker serving navigations, so the reload
       below needs one that controls this page. */
    const controlled = await eventually(async () => page.evaluate(() => Boolean(navigator.serviceWorker?.controller)).catch(() => false), { timeoutMs: 20_000 })
      || await (async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        await startRound(page);
        await settle(page, 30_000);
        return eventually(async () => page.evaluate(() => Boolean(navigator.serviceWorker?.controller)).catch(() => false), { timeoutMs: 15_000 });
      })();
    const workerKind = await page.evaluate(() => ("serviceWorker" in navigator ? "present" : "missing")).catch(() => "unknown");
    if (!controlled) {
      absent(OUTBOX_CHECKS, `a service worker controlling the page, which this engine never gave (navigator.serviceWorker is ${workerKind})`);
    } else {
      /*
        A SECOND VISIT BEFORE THE PLUG IS PULLED, which is a returning learner.
        The worker keeps a page's scripts as they pass through it, and the
        first visit's scripts were fetched before it took over. Measured in
        WebKit: reloaded offline after one visit, every script failed in the
        worker ("FetchEvent.respondWith received an error"), the page never
        hydrated, and nothing was left to send the outbox when the network came
        back. After a second visit the same steps drain. Whether a real iPhone
        reaches the HTTP cache where Playwright's offline switch does not is
        the operator's iPhone check to answer (docs/44-sixth-batch.md, D12).
      */
      await page.reload({ waitUntil: "domcontentloaded" });
      await startRound(page);
      await settle(page, 30_000);
      await page.waitForTimeout(3000);
      await context.setOffline(true);
      const app = page.locator("main");
      let queued = 0;
      for (let i = 0; i < 4 && queued === 0; i += 1) {
        const meet = app.getByRole("button", { name: /Got it, ask me later/ });
        if (await meet.count()) { await meet.first().click().catch(() => {}); await page.waitForTimeout(300); continue; }
        if (await app.getByRole("button", { name: /Show answer/ }).count()) {
          await app.getByRole("button", { name: /Show answer/ }).first().click().catch(() => {});
          await page.waitForTimeout(250);
          await app.getByRole("button", { name: /^Got it(?!, ask me later)/ }).first().click().catch(() => {});
        } else if (await page.getByText(/Pick the meaning/).count()) {
          await page.keyboard.press("1");
          await page.waitForTimeout(300);
          await app.getByRole("button", { name: /Got it, next|Correct|Õige/ }).first().click({ timeout: 3000 }).catch(() => {});
        } else {
          const input = page.locator("main input[type='text'], main input:not([type])").first();
          if (!(await input.count())) break;
          await input.fill("zzz");
          await page.keyboard.press("Enter");
          await page.waitForTimeout(300);
          await retypeMiss(page);
        }
        const next = app.getByRole("button", { name: /^Got it, next/ });
        if ((await next.count()) && (await next.first().isEnabled().catch(() => false))) await next.first().click().catch(() => {});
        await eventually(async () => (await outbox()) > 0, { timeoutMs: 8000 });
        queued = await outbox();
      }
      check("a grade taken with the network cut is held on the device", queued > 0, `${queued} queued`);
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(2500);
      const body = (await page.textContent("body").catch(() => "")) ?? "";
      check("review still opens with the network gone", /left|Show answer|Pick the meaning|Got it|Start/i.test(body) && !/No cards yet/.test(body), body.replace(/\s+/g, " ").slice(0, 80));
      check("the outbox survives the reload", (await outbox()) >= queued, `${await outbox()} after, ${queued} before`);
      await context.setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event("online"))).catch(() => {});
      const drained = await eventually(async () => {
        await page.evaluate(() => window.dispatchEvent(new Event("online"))).catch(() => {});
        return (await outbox()) === 0;
      }, { timeoutMs: 30_000, everyMs: 1000 });
      check("the outbox drains once the network is back", drained, `${await outbox()} still queued`);
      /* A file the worker could not serve with the network gone is the network
         being gone, and WebKit reports each one to the page as an error: a
         chunk, a font subset or a word's recording the page first asked for
         while offline, which arrives as nothing but its URL. What is asked is
         that the app's own code threw nothing. The server's own host is read
         off the base URL rather than typed: CI serves on 127.0.0.1, where a filter
         that knew only `localhost` read two font subsets as the app's fault. */
      const own = errors.filter((e) => !/Load failed|Cannot load|respondWith received an error|access control checks|internal error/.test(e)
        && !(e.startsWith("threw: ") && /^\S+$/.test(e.slice(7)) && e.includes(`${OWN_HOST}/`)));
      check("nothing threw offline", own.length === 0, own.slice(0, 2).join(" | "));
    }
    await context.close();
  }

  // ── Web Push, offered only where the browser has it ───────────────────────
  {
    const probe = await browser.newPage();
    await probe.goto(`${B}/privacy`, { waitUntil: "domcontentloaded" });
    const configured = (await probe.locator("main").innerText().catch(() => "")).includes("push services run by Google");
    await probe.context().close();
    /*
      THE REMINDERS PANEL, IN AN ENGINE THAT RELOADS A PAGE WHICH ASKS.

      Measured here: in Playwright's WebKit build, `pushManager.getSubscription()`
      reloads the page that calls it. The panel used to call it as Settings
      loaded, so Settings reloaded, asked again and reloaded again for as long
      as it was open, and these checks were waived naming that. The panel now
      asks only where the permission is granted, which a fresh context never
      is, and marks the tab before it asks so a reload does not ask again. So
      the questions are what the panel draws, and that Settings stays put.
      Nothing here calls the push manager itself, which would be this suite
      reloading its own page.
    */
    if (!configured) {
      absent(3, "a server started with VAPID keys, so the reminders panel has something to offer");
    } else {
      const panel = async (init) => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
        if (init) await context.addInitScript(init);
        const page = await context.newPage();
        let navigations = 0;
        page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations += 1; });
        await page.goto(`${B}/settings?tab=account`, { waitUntil: "domcontentloaded" });
        await page.locator("#email").waitFor({ timeout: 20_000 }).catch(() => {});
        /* What the browser offers, asked without asking the push manager: the
           interfaces, and a worker to hold a subscription. */
        const supported = await page.evaluate(async () => {
          if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) return "no Push API";
          const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
          return reg?.pushManager ? "yes" : "no worker to hold a subscription";
        }).catch((e) => `could not ask (${String(e).slice(0, 60)})`);
        // The panel waits up to four seconds for the worker before it decides.
        await page.waitForTimeout(6000);
        const state = await page.evaluate(() => document.querySelector("[data-push-panel]")?.getAttribute("data-push-panel") ?? null);
        await context.close();
        return { supported, state, navigations };
      };
      const native = await panel(null);
      const can = native.supported === "yes";
      check(
        "the reminders panel matches what this browser can do: drawn with Web Push, absent without",
        can ? native.state === "off" || native.state === "denied" : native.state === null,
        `Web Push: ${native.supported}; panel ${native.state ?? "absent"}`,
      );
      check("Settings stays put while the reminders panel decides", native.navigations === 1,
        `${native.navigations} navigations of the page`);
      const without = await panel(() => { delete window.PushManager; });
      check("with Web Push taken away, nothing is offered", without.state === null, `panel ${without.state ?? "absent"}`);
    }
  }

  // ── The sounds page: a native recording, and a name spelled ───────────────
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    const errors = errorsOf(page);
    await page.goto(`${B}/grammar/sounds#alphabet`, { waitUntil: "domcontentloaded" });
    await settle(page, 30_000);
    await page.locator("h1").first().click().catch(() => {});
    const speaker = await noSpeaker(page);
    const key = page.locator("[data-alphabet] [data-native]").first();
    const fetched = [];
    page.on("response", (r) => { if (/\/audio\/native\//.test(r.url())) fetched.push(r.status()); });
    await key.click();
    const lit = await eventually(async () => (await key.getAttribute("data-live")) !== null, { timeoutMs: 8000, everyMs: 50 });
    if (speaker) absent(1, `a sound device for a native recording to play through: ${speaker}`);
    else check("a native recording plays where the catalog has one, and its key lights while it does", lit, `${fetched.length} recordings fetched (${fetched.join(", ")})`);

    // Every change of the lit letter, recorded in the page as it happens.
    await page.evaluate(() => {
      window.__lit = [];
      const tiles = document.querySelector("[data-spell]");
      new MutationObserver(() => {
        const live = [...document.querySelectorAll("[data-spell-tiles] button")].findIndex((b) => b.hasAttribute("data-live"));
        if (live >= 0 && window.__lit.at(-1) !== live) window.__lit.push(live);
      }).observe(tiles, { subtree: true, attributes: true, attributeFilter: ["data-live"] });
    });
    const input = page.getByLabel("A name to spell");
    await input.fill("Mari");
    await page.getByRole("button", { name: "Spell it" }).click();
    await eventually(async () => (await page.getByRole("button", { name: "Stop" }).count()) > 0, { timeoutMs: 5000, everyMs: 50 });
    const finished = await eventually(async () => (await page.getByRole("button", { name: "Spell it" }).count()) > 0, { timeoutMs: 20_000, everyMs: 100 });
    const order = await page.evaluate(() => window.__lit);
    if (speaker) absent(1, `a sound device for the spelled name to play through: ${speaker}`);
    else check("the sounds page spells a name letter by letter, each letter lit in turn",
      finished && order.join(",") === "0,1,2,3", `lit in the order ${order.join(",") || "none"}`);
    check("the sounds page threw nothing", errors.length === 0, errors.slice(0, 2).join(" | "));
    await context.close();
  }

  // ── Speech: the worker, the golden clip, a turn played back, a refusal ─────
  {
    const SPEECH_CHECKS = 11;
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: "block" });
    await context.addInitScript(microphone);
    /* The native half of the comparison is a recording rather than whatever the
       speech service answers on the day: what differs between engines is how
       the clip is decoded and drawn, and that is what this asks. */
    await context.route("**/api/tts**", (route) => route.fulfill({ status: 200, contentType: "audio/wav", body: NATIVE_WAV }));
    const page = await context.newPage();
    const errors = errorsOf(page);
    const workers = [];
    page.on("worker", (w) => workers.push(w.url()));

    const response = await page.goto(`${B}/dev/asr`, { waitUntil: "domcontentloaded" });
    const phaseOf = () => page.locator("[data-bench-phase]").getAttribute("data-bench-phase").catch(() => null);
    await eventually(async () => {
      const phase = await phaseOf();
      return Boolean(phase) && phase !== "checking";
    }, { timeoutMs: 30_000 });
    const status = await page.locator("[data-bench-status]").innerText().catch(() => "");
    if (response?.status() === 404) {
      absent(SPEECH_CHECKS, "/dev/asr, which answers 404 unless the server was started with ASR_BENCH=1");
    } else if (/no-model|it is not offered|off/.test(status) && (await phaseOf()) !== "needs-download" && (await phaseOf()) !== "ready") {
      absent(SPEECH_CHECKS, "a speech model the server can serve: run npm run asr:fetch before the build");
    } else {
      // The model arrives on the first press, which here is the live microphone.
      await page.getByRole("button", { name: "Say something" }).first().click();
      const ready = await eventually(async () => (await phaseOf()) === "ready", { timeoutMs: 300_000, everyMs: 1000 });
      const said = await page.locator("[data-bench-mic]").innerText().catch(() => "");
      check("the speech model downloads and the engine loads", ready, `${await phaseOf()}: ${said.replace(/\s+/g, " ").slice(0, 160)}`);
      check("the engine runs in a worker", workers.some((u) => /speech-worker/.test(u)), workers.join(", ") || "no worker started");
      const clock = await noAudioClock(page);
      if (clock) {
        absent(1, `a running audio clock for the capture worklet to hear a turn through: ${clock}`);
      } else {
        const heardLive = await page.locator("[data-bench-live]").waitFor({ timeout: 120_000 }).then(() => true, () => false);
        const live = heardLive ? await page.locator("[data-bench-live]").innerText() : said;
        check("a turn through the capture worklet is heard as what the clip says",
          heardLive && /Tere hommikust/i.test(live), `${await page.evaluate(() => window.__micFed ?? 0)} streams fed: ${live.replace(/\s+/g, " ").slice(0, 120)}`);
      }

      // The golden clip through the file path.
      // Bounded: with no engine loaded the button stays disabled, and the check below says so.
      await page.getByRole("button", { name: "Decode the fixture clip" }).click({ timeout: 15_000 }).catch(() => {});
      const heardFile = await page.locator("[data-bench-file]").waitFor({ timeout: 120_000 }).then(() => true, () => false);
      const transcript = heardFile ? await page.locator("[data-bench-transcript]").innerText() : "";
      check("check.wav is heard as the words the golden file records",
        heardFile && sameWords(transcript, CHECK_CLIP.expect.understood), `"${transcript}" against "${CHECK_CLIP.expect.understood}"`);

      // A line said along, then played back beside the native line.
      if (clock) {
        absent(2, `a running audio clock for a turn to be kept, drawn and played back: ${clock}`);
      } else {
        await page.getByRole("button", { name: "Say it along" }).first().click({ timeout: 15_000 }).catch(() => {});
        const compare = page.locator("[data-compare-voices]").first();
        const compared = await compare.waitFor({ timeout: 120_000 }).then(() => true, () => false);
        const you = await compare.locator('[data-row="you"] .compare-bar').count();
        const them = await eventually(async () => (await compare.locator('[data-row="them"] .compare-bar').count()) > 0, { timeoutMs: 15_000 })
          ? await compare.locator('[data-row="them"] .compare-bar').count() : 0;
        check("your own turn is kept in the tab and drawn beside the native line, both rows of bars",
          compared && you > 0 && them > 0, `${you} bars for you, ${them} for them`);
        const speaker = compared ? await noSpeaker(page) : null;
        if (compared && speaker) {
          absent(1, `a sound device for the two voices to play through: ${speaker}`);
        } else if (compared) {
          await compare.getByRole("button").first().click();
          const playedYou = await eventually(async () => (await compare.getAttribute("data-playing")) === "you", { timeoutMs: 8000, everyMs: 50 });
          const playedThem = await eventually(async () => (await compare.getAttribute("data-playing")) === "them", { timeoutMs: 20_000, everyMs: 50 });
          const ended = await eventually(async () => (await compare.getAttribute("data-playing")) === "idle", { timeoutMs: 25_000, everyMs: 100 });
          check("your turn plays back, then the native line, and both end", playedYou && playedThem && ended,
            `you ${playedYou}, them ${playedThem}, idle again ${ended}`);
        } else {
          absent(1, "a comparison to play, which the check above already reports missing");
        }
      }

      /*
        EACH PAGE BELOW IN A CONTEXT OF ITS OWN, because Playwright's WebKit
        keeps nothing in Cache Storage from one page to the next (measured: a
        five-byte entry put on one page is gone on the next, and the same steps
        in a persistent WebKit profile keep it). So the model the bench above
        loaded is not there for a second page in WebKit, and a check on a
        second page would be asking about that rather than about the screen.
        The one check that wants a second page is the one after these two, and
        it asks what the app does when the files are gone.
      */
      const fresh = async (init) => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: "block" });
        if (init) await ctx.addInitScript(init);
        const pg = await ctx.newPage();
        const caught = errorsOf(pg);
        return { ctx, pg, caught };
      };
      const openRecording = async (pg, budgetMs) => {
        await pg.goto(`${B}/read`, { waitUntil: "domcontentloaded" });
        await pg.locator("section[data-recording]").first().waitFor({ timeout: 20_000 }).catch(() => {});
        await pg.locator('input[type="file"][accept*="audio"]').setInputFiles(OGG);
        const article = pg.locator("[data-recording] article[data-reading]");
        const alert = pg.locator("section[data-recording] [role=alert]");
        await eventually(async () => (await article.count()) > 0 || (await alert.count()) > 0, { timeoutMs: budgetMs, everyMs: 500 });
        const opened = (await article.count()) > 0;
        return { opened, refusal: opened ? "" : await alert.first().innerText().catch(() => "") };
      };

      // The reading page and an Ogg voice message.
      {
        const { ctx, pg, caught } = await fresh(null);
        const { opened, refusal } = await openRecording(pg, 180_000);
        if (ENGINE === "webkit") {
          check("WebKit either hears the Ogg message or refuses it with the sentence that names Safari",
            opened || SAFARI_SENTENCE.test(refusal), opened ? "heard" : refusal.slice(0, 160) || "nothing after three minutes");
        } else {
          check(`${ENGINE === "firefox" ? "Firefox" : "this engine"} opens and hears the Ogg voice message`, opened, refusal.slice(0, 160) || "nothing after three minutes");
        }

        /*
          A SECOND PAGE, which in WebKit here is a browser that did not keep
          the files. The reader used to fetch the model, find it gone, fetch it
          again and so on, 71 MB a time, and never open the recording. It has
          one download per recording now and then says why it stopped; where
          the files are kept, the recording simply opens.
        */
        let fetches = 0;
        pg.on("request", (r) => { if (/\/asr\/model\/.*encoder/.test(r.url())) fetches += 1; });
        const second = await openRecording(pg, 300_000);
        check("a recording opened on a second page ends, heard or refused in words, after at most one more download",
          (second.opened || /didn't keep the speech files|Safari opens them only partly/.test(second.refusal)) && fetches <= 1,
          `${second.opened ? "heard" : second.refusal.slice(0, 100) || "nothing after five minutes"}; the model fetched ${fetches} time(s)`);
        errors.push(...caught);
        await ctx.close();
      }

      // The microphone refused, and the Speaking round answered by typing.
      {
        const { ctx, pg, caught } = await fresh(microphone);
        await pg.addInitScript(() => localStorage.setItem("suite.mic", "refuse"));
        await pg.goto(`${B}/review/speaking`, { waitUntil: "domcontentloaded" });
        for (let i = 0; i < 3; i += 1) if (!(await startRound(pg))) break;
        const stage = pg.locator("[data-speaking-step]");
        if (await stage.first().waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
          await pg.getByRole("button", { name: "Say it along" }).click();
          // The first press fetches the model on a fresh page, then asks for the microphone.
          await eventually(async () => /blocked for this site|No microphone/.test(await pg.locator("main").innerText()), { timeoutMs: 240_000, everyMs: 1000 });
          const said = await pg.locator("main").innerText();
          check("with the microphone refused, the round says so in words",
            /The microphone is blocked for this site|No microphone was found/.test(said), said.replace(/\s+/g, " ").slice(0, 160));
          await pg.getByRole("button", { name: /Next step/ }).click();
          await pg.getByRole("button", { name: /Next step/ }).click();
          await pg.locator("#speaking-answer").fill("qqqq");
          await pg.getByRole("button", { name: "Check", exact: true }).click();
          const typed = await stage.innerText();
          check("and the recall takes a typed answer instead", /Not this time|Right\.|Nearly/.test(typed), typed.replace(/\s+/g, " ").slice(0, 120));
        } else {
          absent(2, "a Speaking round, which dealt nothing on this deck; run scripts/demo-data.ts first");
        }
        errors.push(...caught);
        await ctx.close();
      }
      check("the speech screens threw nothing", errors.length === 0, errors.slice(0, 2).join(" | "));
    }
    await context.close();
  }

  // ── The conversation's composer, at the foot of a phone's window ──────────
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    const errors = errorsOf(page);
    await page.goto(`${B}/situations/arsti-aeg`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main h1", { timeout: 20_000 });
    const easiest = page.getByRole("radio", { name: /^Easy/i });
    await eventually(async () => {
      await easiest.click().catch(() => {});
      return (await easiest.getAttribute("aria-checked")) === "true";
    }, { timeoutMs: 20_000, everyMs: 250 });
    await page.getByRole("button", { name: /Start the conversation/i }).click();
    await page.waitForSelector('[role="log"] p', { timeout: 30_000 });

    /** Where the composer sits against the window and the clearance the bar publishes. */
    const where = () => page.evaluate(() => {
      const box = document.querySelector(".scene-thread > .dock-clear");
      if (!box) return null;
      const r = box.getBoundingClientRect();
      const clearance = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-clearance")) || 0;
      return {
        top: Math.round(r.top), bottom: Math.round(r.bottom), height: innerHeight, clearance: Math.round(clearance),
        position: getComputedStyle(box).position,
        scrollable: document.documentElement.scrollHeight > innerHeight + 4,
      };
    });
    const above = (m) => Boolean(m) && m.top >= 0 && m.bottom <= m.height - m.clearance + 1;
    const box = page.getByLabel("What you say");
    if (!(await box.isVisible().catch(() => false))) await page.getByRole("radio", { name: /Type it/i }).click().catch(() => {});
    await box.fill("Tere!");
    const typing = await where();
    check("while a turn is typed, the composer is in the window above the bar's clearance", above(typing), JSON.stringify(typing));
    const sent = [];
    for (const line of ["Tere!", "Mul on valu.", "Mul on palavik.", "Homme sobib."]) {
      const before = await page.locator('[role="log"] p').count();
      if (!(await box.isVisible().catch(() => false))) await page.getByRole("radio", { name: /Type it/i }).click().catch(() => {});
      await box.fill(line);
      await page.getByRole("button", { name: /Say it/i }).click();
      await eventually(async () => (await page.locator('[role="log"] p').count()) > before + 1, { timeoutMs: 30_000 });
      await page.waitForTimeout(500);
      sent.push(await where());
    }
    check("after every turn sent, the composer stays in the window above the clearance", sent.every(above), JSON.stringify(sent.at(-1)));
    // Scrolled back to the top of a long thread, a sticky composer stays at the foot.
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    const top = await where();
    if (top?.scrollable && top.position === "sticky") {
      const atFoot = above(top) && top.bottom >= top.height - top.clearance - 40;
      check("scrolled back up a long thread, the composer waits at the foot of the window", atFoot, JSON.stringify(top));
    } else {
      check("scrolled back up a long thread, the composer waits at the foot of the window", false,
        top ? `the thread never outgrew the window or the box is ${top.position}: ${JSON.stringify(top)}` : "no composer");
    }
    check("the conversation threw nothing", errors.length === 0, errors.slice(0, 2).join(" | "));
    await context.close();
  }
  await db.$disconnect();
} finally {
  await browser.close();
}
done();
