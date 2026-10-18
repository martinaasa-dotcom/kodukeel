/**
 * DOES THE RECOGNIZER KNOW WHEN A WORD WAS SAID BADLY?
 *
 *   npm run measure:confidence
 *   npm run measure:confidence -- --voices mari,kalev --words aitäh,palun
 *
 * A learner said `aitäh` as "eye-toy" on purpose and the card answered "Every
 * word was heard". They asked whether the app could give a confidence rating
 * instead. This is the measurement that question needs before any screen
 * draws one, because a rating that reads high for a word said badly is the
 * same false reassurance with a number on it.
 *
 * It decodes every clip exactly as a screen does: the turn prepared by
 * `prepareTurn`, decoded twice (greedy and beam) by the model the app ships,
 * reconciled with the forms list, and lit by `lightUp`. Then it reads every
 * signal a rating could be built from, per target word, and prints how well
 * each one separates a word said right from a word said wrong:
 *
 *   lit         the word lights, which is "Every word was heard" today
 *   exact       the model wrote the word exactly as spelled, diacritics and all
 *   agreed      both decodings heard it the same, and it is a real form
 *   min logp    the lowest log probability of the word's own tokens
 *
 * THREE SETS OF CLIPS, NONE OF THEM A LEARNER. Native: TartuNLP saying the word
 * right, in several voices. Slips: TartuNLP saying a misspelling of it, a vowel,
 * an umlaut or a length gone wrong, which is a native voice making the mistake
 * cleanly, the technique `docs/39-speech.md` section 3.5 used. Accent:
 * espeak-ng's English voice reading an English respelling ("eye-toy"), which
 * is the nearest thing to an English speaker this machine has, and is cruder
 * than one. A rating has to separate the first set from the other two.
 *
 * Reports and never fails. TartuNLP answers are cached under `.cache/confidence/`.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { decodeWav } from "../lib/audio/wav";
import { spokenText } from "../lib/audio/say";
import { prepareTurn } from "../lib/speech/prepare";
import { resample } from "../lib/speech/resample";
import { reconcile, core } from "../lib/speech/reconcile";
import { lineWords, lightUp } from "../lib/speech/lightUp";
import { SPEECH_SETTINGS as S } from "../lib/speech/settings";
import { ASR_MODEL, LOCAL_MODEL_BASE } from "../lib/speech/model";
import type { Decoding, RawTurn } from "../lib/speech/engine";
import { isExactForm } from "../lib/dict/forms";

const require = createRequire(import.meta.url);

const TTS = "https://api.tartunlp.ai/text-to-speech/v2";
const CACHE = join(process.cwd(), ".cache", "confidence");
mkdirSync(CACHE, { recursive: true });

const arg = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : undefined;
};

/** Each word, the slips a native voice can be asked to make, and an English respelling for the accent. */
const ITEMS: readonly { word: string; slips: readonly string[]; english: readonly string[] }[] = [
  { word: "aitäh", slips: ["aitah", "aitoi", "äitäh", "eitäh"], english: ["eye toy", "eye tah", "ay tah"] },
  { word: "palun", slips: ["paluun", "pallun", "balun", "palon"], english: ["pah loon", "pa lune", "puh loon"] },
  { word: "tere", slips: ["teere", "tärä", "tiire"], english: ["terry", "tare uh", "tear ray"] },
  { word: "õde", slips: ["ode", "öde", "ude"], english: ["oh day", "uh day", "odd uh"] },
  { word: "töö", slips: ["too", "tö", "tee"], english: ["tow", "tuh", "toe"] },
  { word: "jõgi", slips: ["jogi", "jögi", "jugi"], english: ["yo ghee", "yuh ghee", "joe ghee"] },
  { word: "üks", slips: ["uks", "iks", "öks"], english: ["ooks", "icks", "yooks"] },
  { word: "kool", slips: ["kol", "kuul", "kõõl"], english: ["coal", "cool", "kohl"] },
  { word: "söök", slips: ["sook", "sõõk", "sök"], english: ["soak", "sook", "sirk"] },
  { word: "vabandust", slips: ["vabandus", "vabantust"], english: ["va ban dust", "vah ban doost"] },
  { word: "nägemist", slips: ["negemist", "nagemist", "nägimist"], english: ["nag a mist", "neh geh mist"] },
  { word: "kuus", slips: ["kus", "kõõs", "kaus"], english: ["coos", "cuss", "koose"] },
  { word: "viis", slips: ["vis", "vüüs", "vees"], english: ["veece", "vis", "vice"] },
  { word: "hommikust", slips: ["homikust", "hammikust", "hommikost"], english: ["hommy coost", "home a cust"] },
  { word: "kolm", slips: ["kõlm", "kulm", "kolom"], english: ["colm", "kollum", "calm"] },
  { word: "leib", slips: ["leip", "laib", "lep"], english: ["labe", "lipe", "life"] },
];

const VOICES = (arg("voices") ?? "mari,tambet,kalev,liivika,vesta,albert").split(",");
const ONLY = arg("words")?.split(",");

function sha(text: string): string {
  return createHash("sha1").update(text).digest("hex");
}

/** A TartuNLP clip, 16 kHz mono, as a microphone would hand it over. */
async function tartu(text: string, voice: string): Promise<Float32Array> {
  const file = join(CACHE, `${sha(`${text}|${voice}`)}.wav`);
  if (!existsSync(file)) {
    const response = await fetch(TTS, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: spokenText(text), speaker: voice }),
    });
    if (!response.ok) throw new Error(`TartuNLP ${response.status} for ${text}`);
    writeFileSync(file, new Uint8Array(await response.arrayBuffer()));
  }
  return toMic(readFileSync(file));
}

/** espeak-ng in a given voice; no network. */
function espeak(text: string, voice: string): Float32Array {
  const bytes = execFileSync("espeak-ng", ["-v", voice, "-s", "140", "--stdout", text]);
  return toMic(bytes);
}

function toMic(bytes: Uint8Array): Float32Array {
  const pcm = decodeWav(bytes);
  // A synthesized clip is mono; take the first channel if not.
  return resample(pcm.samples, pcm.rate, S.sampleRate);
}

/* The model, loaded as the worker loads it, from the files `npm run asr:fetch` keeps. */
const sherpa = require("sherpa-onnx") as {
  createOnlineRecognizer(config: unknown): {
    createStream(): { acceptWaveform(r: number, s: Float32Array): void; inputFinished(): void; free?(): void };
    isReady(s: unknown): boolean;
    decode(s: unknown): void;
    getResult(s: unknown): { text: string; tokens: string[]; timestamps: number[]; ys_probs: number[] };
  };
};
const dir = join(process.cwd(), "public", LOCAL_MODEL_BASE, ASR_MODEL.revision);
if (!existsSync(join(dir, "encoder.int8.onnx"))) throw new Error("No model: run npm run asr:fetch first.");
function recognizer(method: string) {
  return sherpa.createOnlineRecognizer({
    featConfig: { sampleRate: S.sampleRate, featureDim: 80 },
    modelConfig: {
      transducer: { encoder: join(dir, "encoder.int8.onnx"), decoder: join(dir, "decoder.int8.onnx"), joiner: join(dir, "joiner.int8.onnx") },
      tokens: join(dir, "tokens.txt"),
      numThreads: 2,
      provider: "cpu",
      debug: 0,
    },
    decodingMethod: method,
    maxActivePaths: S.beamPaths,
    enableEndpoint: 0,
  });
}
const greedy = recognizer(S.decoding);
const beam = recognizer(S.secondDecoding);

function decode(r: ReturnType<typeof recognizer>, samples: Float32Array): Decoding {
  const stream = r.createStream();
  stream.acceptWaveform(S.sampleRate, samples);
  stream.inputFinished();
  while (r.isReady(stream)) r.decode(stream);
  const out = r.getResult(stream);
  stream.free?.();
  return { text: out.text.trim(), tokens: out.tokens, timestamps: out.timestamps, logProbs: out.ys_probs };
}

/** The lowest log probability among the tokens of each word of a decoding. */
function wordLogProbs(d: Decoding): { word: string; min: number; mean: number }[] {
  const words: { word: string; probs: number[] }[] = [];
  d.tokens.forEach((token, i) => {
    const p = d.logProbs[i] ?? 0;
    if (token.startsWith("▁") || token.startsWith(" ") || words.length === 0) words.push({ word: token.replace(/^[▁ ]/, ""), probs: [p] });
    else {
      const last = words[words.length - 1]!;
      last.word += token;
      last.probs.push(p);
    }
  });
  return words.map((w) => ({ word: w.word, min: Math.min(...w.probs), mean: w.probs.reduce((a, b) => a + b, 0) / w.probs.length }));
}

interface Row {
  readonly target: string;
  readonly set: "native" | "slip" | "accent" | "robot";
  readonly said: string;
  readonly voice: string;
  readonly heard: string;
  readonly lit: boolean;
  readonly exact: boolean;
  readonly agreed: boolean;
  readonly minLogp: number;
}

async function hear(target: string, samples: Float32Array): Promise<Omit<Row, "target" | "set" | "said" | "voice">> {
  const prepared = prepareTurn(samples);
  const raw: RawTurn = { greedy: decode(greedy, prepared), beam: decode(beam, prepared), seconds: samples.length / S.sampleRate };
  const distinct = [...new Set(raw.greedy.text.split(/\s+/).map(core).filter(Boolean))];
  const known = new Map<string, boolean>();
  for (const w of distinct) known.set(w, await isExactForm(w));
  const hearing = reconcile(raw, { known: (w) => known.get(w), expect: new Set([target]) });
  const words = lineWords(target);
  const lit = lightUp(words, hearing.understood).every(Boolean);
  const t = core(target);
  const found = hearing.words.find((w) => core(w.text) === t);
  const exact = hearing.words.some((w) => core(w.heard) === t);
  const agreed = !!found && found.agreed && found.known === true && !found.repaired;
  const probs = wordLogProbs(raw.greedy);
  // The target's own word where the model wrote it, else the weakest word heard.
  const mine = probs.find((p) => core(p.word) === t) ?? probs.reduce((a, b) => (b.min < a.min ? b : a), { word: "", min: 0, mean: 0 });
  return { heard: hearing.heard, lit, exact, agreed, minLogp: probs.length ? mine.min : -99 };
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  const items = ITEMS.filter((i) => !ONLY || ONLY.includes(i.word));
  for (const item of items) {
    for (const voice of VOICES) {
      rows.push({ target: item.word, set: "native", said: item.word, voice, ...(await hear(item.word, await tartu(item.word, voice))) });
      for (const slip of item.slips) {
        if (slip === item.word) continue;
        rows.push({ target: item.word, set: "slip", said: slip, voice, ...(await hear(item.word, await tartu(slip, voice))) });
      }
    }
    for (const english of item.english) {
      for (const voice of ["en-us", "en"]) {
        rows.push({ target: item.word, set: "accent", said: english, voice, ...(await hear(item.word, espeak(english, voice))) });
      }
    }
    rows.push({ target: item.word, set: "robot", said: item.word, voice: "espeak-et", ...(await hear(item.word, espeak(item.word, "et"))) });
    process.stderr.write(".");
  }
  process.stderr.write("\n");
  writeFileSync(join(CACHE, "rows.json"), JSON.stringify(rows, null, 1));

  const sets = ["native", "slip", "accent", "robot"] as const;
  const pct = (n: number, d: number) => (d === 0 ? "  n/a" : `${((100 * n) / d).toFixed(1).padStart(5)}%`);
  console.log("\nShare of clips each signal calls GOOD (a rating wants native high, the rest low):\n");
  console.log(`${"signal".padEnd(26)}${sets.map((s) => s.padStart(10)).join("")}`);
  const signal = (name: string, good: (r: Row) => boolean) => {
    console.log(`${name.padEnd(26)}${sets.map((s) => { const of = rows.filter((r) => r.set === s); return pct(of.filter(good).length, of.length).padStart(10); }).join("")}`);
  };
  signal("lit (today)", (r) => r.lit);
  signal("exact spelling", (r) => r.exact);
  signal("exact + agreed + known", (r) => r.exact && r.agreed);
  for (const line of [-0.25, -0.5, -1.0, -1.5]) signal(`lit, min logp > ${line}`, (r) => r.lit && r.minLogp > line);
  for (const line of [-0.5, -1.0]) signal(`exact+agreed, logp > ${line}`, (r) => r.exact && r.agreed && r.minLogp > line);
  console.log(`\nclips: ${sets.map((s) => `${s} ${rows.filter((r) => r.set === s).length}`).join(", ")}`);

  console.log("\nWhat each word said wrong was heard as, where it still lit:\n");
  for (const r of rows.filter((r) => r.set !== "native" && r.lit)) {
    console.log(`  ${r.target.padEnd(10)} said ${r.said.padEnd(12)} [${r.voice.padEnd(9)}] heard ${r.heard.padEnd(14)} exact=${r.exact ? "y" : "n"} agreed=${r.agreed ? "y" : "n"} logp=${r.minLogp.toFixed(2)}`);
  }
  console.log("\nThe accent and robot clips, whatever they were heard as:\n");
  for (const r of rows.filter((r) => r.set === "accent" || r.set === "robot")) {
    console.log(`  ${r.target.padEnd(10)} said ${r.said.padEnd(14)} [${r.voice.padEnd(9)}] heard ${r.heard || "(nothing)"}`);
  }
  console.log("\nNative clips that did not come back exact and agreed:\n");
  for (const r of rows.filter((r) => r.set === "native" && !(r.exact && r.agreed))) {
    console.log(`  ${r.target.padEnd(10)} [${r.voice.padEnd(8)}] heard ${r.heard.padEnd(14)} lit=${r.lit ? "y" : "n"} logp=${r.minLogp.toFixed(2)}`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
