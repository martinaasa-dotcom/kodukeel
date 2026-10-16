/**
 * The short recordings the speech tests are played, made once from TartuNLP.
 *
 *   npm run asr:fixtures
 *
 * A test never hears a live voice (docs/41-fifth-batch.md, section 3): the
 * browser suites feed Chromium's fake microphone from these files, the golden
 * file of VB-3 is the engine's reading of them, and the device check decodes
 * the first one on every load. Each is a line the app already holds, a phrase
 * entry or a line a scene's picks already offer, said by one of TartuNLP's
 * voices and written as 16 kHz 16-bit mono, so nothing here is new Estonian and
 * no file is larger than it needs to be. TartuNLP is credited with the model
 * (lib/legal/credits.ts).
 *
 * Re-run only to add a clip: the files are committed, and the hashes in
 * `lib/speech/fixtures/golden.json` were read off these exact bytes.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { readWav, writeWav } from "../lib/speech/wav";
import { resample } from "../lib/speech/resample";

const TARTU_NLP = "https://api.tartunlp.ai/text-to-speech/v2";

export const SPEECH_FIXTURES = [
  // The device check: two greetings, about two seconds, both phrase entries of the first unit.
  { file: "public/asr/check.wav", text: "Tere hommikust! Kuidas läheb?", voice: "mari", trail: 0 },
  { file: "scripts/fixtures/speech/tere.wav", text: "Tere!", voice: "tambet", trail: 2 },
  { file: "scripts/fixtures/speech/aitah.wav", text: "Aitäh!", voice: "mari", trail: 2 },
  { file: "scripts/fixtures/speech/kuidas-laheb.wav", text: "Kuidas läheb?", voice: "kalev", trail: 2 },
] as const;

async function make(text: string, voice: string): Promise<Float32Array> {
  const response = await fetch(TARTU_NLP, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, speaker: voice }),
  });
  if (!response.ok) throw new Error(`TartuNLP answered ${response.status} for ${text}`);
  const { samples, rate } = readWav(new Uint8Array(await response.arrayBuffer()));
  return resample(samples, rate, 16_000);
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  for (const fixture of SPEECH_FIXTURES) {
    if (existsSync(fixture.file) && !force) {
      console.log(`kept ${fixture.file}`);
      continue;
    }
    const speech = await make(fixture.text, fixture.voice);
    // A fake microphone loops its file, so silence after the words lets a turn end on its own.
    const samples = new Float32Array(speech.length + fixture.trail * 16_000);
    samples.set(speech, 0);
    mkdirSync(dirname(fixture.file), { recursive: true });
    writeFileSync(fixture.file, writeWav({ samples, rate: 16_000 }));
    console.log(`wrote ${fixture.file} (${(samples.length / 16_000).toFixed(2)} s): ${fixture.text}`);
  }
}

if (process.argv[1]?.endsWith("make-speech-fixtures.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
