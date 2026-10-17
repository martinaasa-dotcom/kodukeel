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
import { derivedVerbForms } from "../lib/estonian/conjugate";
import { SUBJECT_PRONOUN } from "../lib/scenes/lexicon";
import { shippedDictionary } from "./lib/dictionary";

const TARTU_NLP = "https://api.tartunlp.ai/text-to-speech/v2";

/**
 * A conjugation table said as a class chants it, built off the dictionary:
 * each person's shortest nominative and the verb's present off its stored
 * first person (`derivedVerbForms`), so nothing in this file types the
 * Estonian (VB-8). Read by TartuNLP like any other line.
 */
function chantOf(verb: string): string {
  const dictionary = shippedDictionary();
  const entry = (lemma: string) => {
    const found = dictionary.find((e) => e.lemma === lemma);
    if (!found) throw new Error(`${lemma} is not in the shipped dictionary`);
    return found;
  };
  const forms = derivedVerbForms({ lemma: verb, pres1sg: entry(verb).parts.PRES_1SG });
  const codes = ["IndPrSg1", "IndPrSg2", "IndPrSg3", "IndPrPl1", "IndPrPl2", "IndPrPl3"];
  return Object.keys(SUBJECT_PRONOUN).map((lemma, i) => {
    const spellings = [lemma, ...entry(lemma).extraForms.filter((f) => f.code === "SgN" || f.code === "PlN").map((f) => f.value)];
    const short = [...spellings].sort((a, b) => a.length - b.length)[0]!;
    const form = forms.find((f) => f.morphCode === codes[i])?.value;
    if (!form) throw new Error(`${verb} has no ${codes[i]}`);
    return `${short} ${form}`;
  }).join(", ") + ".";
}

export const SPEECH_FIXTURES = [
  // The device check: two greetings, about two seconds, both phrase entries of the first unit.
  { file: "public/asr/check.wav", text: "Tere hommikust! Kuidas läheb?", voice: "mari", trail: 0 },
  { file: "scripts/fixtures/speech/tere.wav", text: "Tere!", voice: "tambet", trail: 2 },
  { file: "scripts/fixtures/speech/aitah.wav", text: "Aitäh!", voice: "mari", trail: 2 },
  { file: "scripts/fixtures/speech/kuidas-laheb.wav", text: "Kuidas läheb?", voice: "kalev", trail: 2 },
  // The numbers round (VB-7): a number read from its digits, never written out here (D10).
  { file: "scripts/fixtures/speech/number.wav", text: "15", voice: "mari", trail: 2 },
  // The conjugation chant (VB-8): one verb's present, pronouns and all, off the dictionary.
  { file: "scripts/fixtures/speech/chant.wav", text: chantOf("elama"), voice: "mari", trail: 2 },
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
