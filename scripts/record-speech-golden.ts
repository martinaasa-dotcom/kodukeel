/**
 * Records `lib/speech/fixtures/golden.json` (docs/41-fifth-batch.md, VB-3).
 *
 *   npm run asr:golden            against BASE_URL, or http://localhost:3000
 *
 * Opens the speech bench (`/dev/asr`, so a production server needs
 * `ASR_BENCH=1`) in Chromium, downloads the model there once, and decodes
 * each fixture clip through the same file path a screen uses. What the engine
 * returns is written down with what the pure layer decides from it, which is
 * what `lib/speech/golden.test.ts` holds the rules to and what the native apps
 * have to reproduce. Writes nothing when any clip fails to decode.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { SPEECH_FIXTURES } from "./make-speech-fixtures";
// @ts-expect-error - a .mjs helper with no declarations, like the suites use it.
import { launchChromium } from "./lib/browser.mjs";
import { ASR_MODEL } from "../lib/speech/model";
import { decide, type Golden, type GoldenClip } from "../lib/speech/golden";
import type { RawTurn } from "../lib/speech/engine";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "lib/speech/fixtures/golden.json";
/*
  Every clip the fixtures script makes, read off its own list rather than
  typed here: the file is the native apps' first test, and a clip the web
  hears and the file leaves out is a clip nobody checks the native engine on.
*/
const CLIPS: readonly { file: string; says: string }[] = SPEECH_FIXTURES.map((f) => ({ file: f.file, says: f.text }));

async function main(): Promise<void> {
  const browser = await launchChromium();
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/dev/asr`);
    await page.waitForFunction(() => document.querySelector("[data-bench-phase]")?.textContent !== "checking", null, { timeout: 60_000 });
    if ((await page.textContent("[data-bench-phase]")) !== "ready") {
      await page.locator("[data-mic-gallery]").waitFor();
      // The live microphone's own press asks for the download; the file path needs it too.
      await page.evaluate(() => (document.querySelector("[data-bench-status]") as HTMLElement | null)?.scrollIntoView());
      await page.getByRole("button", { name: "Say something" }).first().click();
      await page.getByRole("button", { name: /^Download/ }).click();
      await page.waitForFunction(() => document.querySelector("[data-bench-phase]")?.textContent === "ready", null, { timeout: 300_000 });
      // That press also opened the microphone, which has nothing to hear here.
      await page.getByRole("button", { name: "Stop listening" }).click().catch(() => undefined);
    }
    const clips: GoldenClip[] = [];
    for (const clip of CLIPS) {
      await page.locator('input[type="file"]').setInputFiles(clip.file);
      await page.waitForSelector("[data-bench-raw]", { state: "attached", timeout: 180_000 }).catch(async (error: unknown) => {
        // Say what the bench said rather than only that the wait ran out.
        const said = await page.locator("[role=alert]").allInnerTexts().catch(() => []);
        throw new Error(`${clip.file}: no reading came back${said.length > 0 ? `; the bench said: ${said.join(" | ")}` : ""} (${String(error).split("\n")[0]})`);
      });
      const raw = await page.locator("[data-bench-raw]").textContent();
      const turns = JSON.parse(raw ?? "[]") as RawTurn[];
      if (turns.length === 0) throw new Error(`${clip.file}: the engine heard nothing`);
      const sha256 = createHash("sha256").update(readFileSync(clip.file)).digest("hex");
      clips.push({ ...clip, sha256, turns, expect: decide(turns, clip.says) });
      console.log(`${clip.file}: ${clips.at(-1)!.expect.understood}`);
      // Clear the result so the next clip's is not read as this one's.
      await page.reload();
      await page.waitForFunction(() => document.querySelector("[data-bench-phase]")?.textContent === "ready", null, { timeout: 60_000 });
    }
    const golden: Golden = {
      engine: `web: sherpa-onnx ${JSON.parse(readFileSync("node_modules/sherpa-onnx/package.json", "utf8")).version}, single-threaded WebAssembly in a worker`,
      model: `${ASR_MODEL.repo}@${ASR_MODEL.revision}`,
      recorded: new Date().toISOString().slice(0, 10),
      clips,
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(golden, null, 2) + "\n");
    console.log(`wrote ${OUT}: ${clips.length} clips`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
