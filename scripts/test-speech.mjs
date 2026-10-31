/**
 * Speaking, in a browser (docs/41-fifth-batch.md, VB-1 and VB-2).
 *
 *   node scripts/test-speech.mjs      against BASE_URL, a production build with ASR_BENCH=1
 *
 * What only a browser can say about hearing Estonian on the device:
 *
 *   - nothing loads before a press, and the first press asks nothing: it fetches the
 *     model and listens (the operator's call, section 8b);
 *   - a learner who never presses has the model anyway, fetched in the background,
 *     but only on Wi-Fi or a computer that says nothing: a phone on mobile data, or
 *     one that cannot say, fetches nothing until a press or "Download now" (D10 of
 *     docs/44-sixth-batch.md), which Settings draws only where it was held back;
 *   - Chromium's fake microphone, fed a fixture clip and never a live voice, is heard
 *     as what the clip says, and what was heard is announced in a live region (D12);
 *   - a file decoded through the same hook gives the same words;
 *   - with the network cut after one load, the model and the runtime still answer;
 *   - Settings says the model is on the device, and offers no button to fetch or delete it;
 *   - with the microphone refused, the button says so in words and nothing dead-ends;
 *   - the microphone is drawn in every state with a name a screen reader can say.
 *
 * Needs the model where the server can serve it (`npm run asr:fetch` before the
 * build) and the bench switched on (`ASR_BENCH=1`). Each is checked first and
 * named if it is missing, rather than read as the app failing.
 */
import { launchChromium } from "./lib/browser.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";

const B = baseUrl();
const { check, absent, done } = suite("Speaking", { floor: 24 });

const FAKE_MIC = (clip) => [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-audio-capture=${clip}`,
];

async function phase(page) {
  await page.waitForFunction(() => {
    const at = document.querySelector("[data-bench-phase]")?.textContent;
    return at && at !== "checking";
  }, null, { timeout: 60_000 });
  return page.textContent("[data-bench-phase]");
}

const browser = await launchChromium({ args: FAKE_MIC("scripts/fixtures/speech/tere.wav") });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(["microphone"], { origin: B });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const scripts = [];
  page.on("request", (r) => { if (/\/asr\/(runtime|model)/.test(r.url())) scripts.push(r.url()); });

  const response = await page.goto(`${B}/dev/asr`, { waitUntil: "domcontentloaded" });
  if (response?.status() === 404) {
    absent(23, "/dev/asr answered 404: start the server with ASR_BENCH=1 to reach the speech bench");
    done();
    process.exit(process.exitCode ?? 0);
  }
  const first = await phase(page);
  if (first === null || /no-model|off/.test(await page.textContent("[data-bench-status]") ?? "") && first !== "needs-download" && first !== "ready") {
    absent(23, "this server has no speech model to serve: run npm run asr:fetch before the build");
    done();
    process.exit(process.exitCode ?? 0);
  }
  check("nothing of the engine loads before a press", scripts.length === 0, scripts.join(", "));
  check("a fresh device has not downloaded the model", first === "needs-download", first ?? "");

  // The first press asks nothing: it fetches the model, then listens.
  await page.getByRole("button", { name: "Say something" }).first().click();
  await page.waitForTimeout(500);
  const prompts = await page.getByRole("group", { name: "Download for speaking" }).count();
  check("the first press asks no question before the download", prompts === 0, `${prompts} prompts`);
  await page.waitForSelector("[data-bench-live]", { timeout: 240_000 });
  check("and the model arrives on that press", scripts.some((u) => u.includes("/asr/model")), `${scripts.length} engine requests`);
  const live = await page.innerText("[data-bench-live]");
  check("the fake microphone is heard as what the clip says", /Understood\s+Tere/i.test(live), live.split("\n").slice(0, 2).join(" | "));
  const announced = await page.locator('[role="status"][aria-live="polite"]').allInnerTexts();
  check("what was heard is announced in a live region", announced.some((t) => /Heard: Tere/i.test(t)), announced.join(" / "));

  await page.getByRole("button", { name: "Decode the fixture clip" }).click();
  await page.waitForSelector("[data-bench-file]", { timeout: 60_000 });
  const file = await page.innerText("[data-bench-file]");
  check("a file through the same hook gives the same words", /Tere hommikust[.,!]?\s+kuidas läheb/i.test(file) && /says what the clip says/.test(file), file.replace(/\n/g, " | "));

  // The gallery: every state has a name and words.
  const states = page.locator("[data-mic-state]");
  const count = await states.count();
  check("the microphone is drawn in every state it has", count >= 15, `${count} states`);
  const unnamed = await page.$$eval("[data-mic-state] button.speech-mic", (buttons) => buttons.filter((b) => !b.getAttribute("aria-label")).length);
  check("every microphone has a name a screen reader can say", unnamed === 0, `${unnamed} without`);
  // Counted as well as read: a gallery that drew no error cell at all would pass "none is wordless".
  // The reason is its own live region, filled a frame after it mounts so it is read on arrival.
  const errorCells = await page.locator("[data-mic-state^='Error']").count();
  const wordless = await page.$$eval("[data-mic-state^='Error']", (cells) => cells.filter((c) => !/[a-z]{4}/.test(c.querySelector("p[role=status]")?.textContent ?? "")).length);
  check("every error is said in words", errorCells >= 9 && wordless === 0, `${errorCells} error states, ${wordless} without a sentence`);
  const silentLine = await page.locator("[data-mic-state='Nothing was heard']").innerText().catch(() => "");
  check("a turn that closed with nothing said says so", /Nothing was heard/.test(silentLine), silentLine.slice(0, 80));
  const disabled = await page.locator("[data-mic-state='The app is speaking'] button.speech-mic").isDisabled();
  check("the microphone is closed while the app speaks (D14)", disabled);

  // Settings reads the cache rather than a stored flag, and deletes it.
  await page.goto(`${B}/settings?tab=sound#speaking`, { waitUntil: "domcontentloaded" });
  const status = page.locator("#speaking [data-speaking-status]");
  await status.first().waitFor({ timeout: 30_000 });
  // The section looks at the cache when it mounts; read it once it has answered.
  await page.waitForFunction(() => !/Checking/.test(document.querySelector("#speaking [data-speaking-status]")?.textContent ?? "Checking"), null, { timeout: 15_000 }).catch(() => undefined);
  const downloaded = await status.first().innerText();
  check("Settings says the model is on this device", /Downloaded on this device \(\d+\sMB\)/.test(downloaded), downloaded);

  // Offline after one load: the bench's page, the runtime and the model all answer from the device.
  await page.goto(`${B}/dev/asr`, { waitUntil: "load" });
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.waitForTimeout(1500);
  await page.goto(`${B}/dev/asr`, { waitUntil: "load" });
  /* The runtime is kept offline only once a fetch of it has gone through the
     service worker, which writes the copy without being awaited, and the first
     press above happened before the worker controlled the page. Cutting the
     network straight after `load` raced that write: on a slow runner the
     offline reload found no worker script, and the bench said "the speech
     worker stopped" while the suite waited three minutes. So the runtime is
     fetched through the controlling worker here and the cache is read until
     every file is in it, and the check is asked of a device that has it. */
  const kept = await page.evaluate(async (files) => {
    await navigator.serviceWorker?.ready;
    const deadline = Date.now() + 60_000;
    while (!navigator.serviceWorker?.controller && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    await Promise.all(files.map((f) => fetch(f).then((r) => r.arrayBuffer()).catch(() => undefined)));
    let missing = files;
    while (Date.now() < deadline) {
      const names = (await caches.keys()).filter((n) => n.startsWith("kodukeel-asr-"));
      const held = new Set();
      for (const name of names) for (const req of await (await caches.open(name)).keys()) held.add(new URL(req.url).pathname);
      missing = files.filter((f) => !held.has(f));
      if (missing.length === 0) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    return missing;
  }, ["/asr/runtime/speech-worker.js", "/asr/runtime/sherpa-onnx.js", "/asr/runtime/sherpa-onnx-asr.js", "/asr/runtime/sherpa-onnx.wasm", "/asr/check.wav"]);
  if (kept.length > 0) console.log(`note: the speech cache was still missing ${kept.join(", ")} before going offline`);
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    const offline = await phase(page);
    await page.getByRole("button", { name: "Decode the fixture clip" }).click();
    // The model is loaded again after the reload (its hashes checked, the device check run), which
    // is most of this wait; a failure says what the bench said rather than only that time ran out.
    await page.waitForSelector("[data-bench-file]", { timeout: 180_000 }).catch(async (error) => {
      const said = await page.locator("[role=alert]").allInnerTexts().catch(() => []);
      throw new Error(`no reading came back offline${said.length > 0 ? `; the bench said: ${said.join(" | ")}` : ""} (${String(error).split("\n")[0]})`);
    });
    const heardOffline = await page.innerText("[data-bench-file]");
    check("with the network cut, the model still hears the clip", offline === "ready" && /Tere hommikust/i.test(heardOffline), `${offline}: ${heardOffline.slice(0, 80)}`);
  } catch (error) {
    /* The model loads again after the offline reload, and that load times the
       device check. On a runner so busy that it decodes slower than real time
       twice over, the app answers "too slow", which is the app being right
       about the machine rather than offline failing: said as that, and lifted
       on any machine faster than real time. Anything else is a failure. */
    const said = String(error);
    if (/\d\.\d+ of real time/.test(said)) absent(1, `this machine ran the device check slower than real time (${/\d\.\d+ of real time/.exec(said)[0]}), so the model is refused here before offline can be asked`);
    else check("with the network cut, the model still hears the clip", false, said.slice(0, 200));
  } finally {
    await context.setOffline(false);
  }

  await page.goto(`${B}/settings?tab=sound#speaking`, { waitUntil: "domcontentloaded" });
  const buttons = await page.locator("#speaking").getByRole("button", { name: /Download|Delete the download/ }).count();
  check("Settings offers no button to fetch or delete the model once it is here", buttons === 0, `${buttons} buttons`);

  check("nothing threw", errors.length === 0, errors.slice(0, 3).join(" | "));
  await context.close();

  // Nobody presses anything: the signed-in shell fetches the model in the
  // background. A test browser is skipped by `SpeechPrefetch` so the other
  // suites do not each download 71 MB, so this page says it is not one.
  const quiet = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    await quiet.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
    const p3 = await quiet.newPage();
    await p3.goto(`${B}/settings?tab=sound#speaking`, { waitUntil: "domcontentloaded" });
    await p3.waitForFunction(() => /Downloaded on this device/.test(document.querySelector("#speaking [data-speaking-status]")?.textContent ?? ""), null, { timeout: 240_000 }).catch(() => undefined);
    const quietly = await p3.locator("#speaking [data-speaking-status]").first().innerText().catch(() => "");
    check("a learner who never presses has the model, fetched in the background", /Downloaded on this device/.test(quietly), quietly);
  } finally {
    await quiet.close();
  }

  /*
    The connection decides the background download (D10). Each case is a fresh
    context that says it is not a test browser, with `navigator.connection`
    stubbed by an init script before any page script runs: Wi-Fi fetches,
    mobile data fetches nothing, and a phone with no Network Information at
    all (every iPhone) fetches nothing either. A model request is aborted the
    moment it is seen, since the question is whether it went out, and the
    background download fails quietly back to waiting.
  */
  const connectionCase = async ({ type, mobile }) => {
    const ctx = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    await ctx.addInitScript((t) => {
      Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
      if (t === null) {
        Object.defineProperty(Navigator.prototype, "connection", { get: () => undefined, configurable: true });
        return;
      }
      const c = new EventTarget();
      Object.defineProperty(c, "type", { get: () => t });
      Object.defineProperty(c, "saveData", { get: () => false });
      Object.defineProperty(Navigator.prototype, "connection", { get: () => c, configurable: true });
    }, type);
    const requested = [];
    await ctx.route(/\/asr\/model\//, (route) => {
      requested.push(route.request().url());
      return route.abort();
    });
    const p = await ctx.newPage();
    await p.goto(`${B}/settings?tab=sound#speaking`, { waitUntil: "domcontentloaded" });
    await p.locator("#speaking [data-speaking-status]").first().waitFor({ timeout: 30_000 });
    // Three seconds after load plus an idle moment is when the background download starts.
    await p.waitForTimeout(9_000);
    const held = await p.locator("#speaking [data-speaking-held]").count();
    const line = await p.locator("#speaking [data-speaking-status]").first().innerText().catch(() => "");
    return { ctx, p, requested, held, line };
  };

  const onWifi = await connectionCase({ type: "wifi", mobile: true });
  try {
    check("a phone on Wi-Fi fetches the model in the background", onWifi.requested.length > 0, `${onWifi.requested.length} model requests`);
    check("and Settings offers no Download now there", onWifi.held === 0, onWifi.line.slice(0, 120));
  } finally {
    await onWifi.ctx.close();
  }
  const onData = await connectionCase({ type: "cellular", mobile: true });
  try {
    check("a phone on mobile data fetches nothing on its own", onData.requested.length === 0, `${onData.requested.length} model requests`);
    const button = onData.p.locator("#speaking").getByRole("button", { name: /Download now \(\d+\sMB\)/ });
    check("Settings says the download waits for Wi-Fi or a press, with Download now and its size",
      onData.held === 1 && /Wi-Fi or the first time you press a microphone/.test(onData.line) && (await button.count()) === 1,
      onData.line.slice(0, 160));
    await button.first().click().catch(() => undefined);
    await onData.p.waitForTimeout(2_000);
    check("pressing Download now fetches it", onData.requested.length > 0, `${onData.requested.length} model requests`);
  } finally {
    await onData.ctx.close();
  }
  const cannotSay = await connectionCase({ type: null, mobile: true });
  try {
    check("a phone that cannot say its connection fetches nothing on its own", cannotSay.requested.length === 0, `${cannotSay.requested.length} model requests`);
    check("and Settings draws the held-back line there too", cannotSay.held === 1, cannotSay.line.slice(0, 160));
  } finally {
    await cannotSay.ctx.close();
  }

  // The microphone refused: the button says so, and the page carries on.
  // `--deny-permission-prompts` answers the prompt with Block, which is what a
  // learner pressing it does; without it headless Chromium leaves the prompt
  // pending for ever. Read off the live microphone alone (`data-bench-mic`),
  // since the gallery below draws the refused sentence on every run.
  const refused = await (await launchChromium({ args: ["--use-fake-device-for-media-stream", "--deny-permission-prompts"] })).newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const p2 = await refused.newPage();
    await p2.goto(`${B}/dev/asr`, { waitUntil: "domcontentloaded" });
    await phase(p2);
    await p2.getByRole("button", { name: "Say something" }).first().click();
    await p2.waitForFunction(() => /blocked for this site|No microphone/.test(document.querySelector("[data-bench-mic]")?.textContent ?? ""), null, { timeout: 240_000 }).catch(() => undefined);
    const said = await p2.locator("[data-bench-mic]").innerText();
    check("with the microphone refused, the button says so in words", /The microphone is blocked for this site|No microphone was found/.test(said), said.slice(0, 160));
  } finally {
    await refused.browser()?.close();
  }
} finally {
  await browser.close();
}
done();
