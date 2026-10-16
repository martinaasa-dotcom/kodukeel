/**
 * CAN A SPEECH RECOGNIZER BE TRUSTED TO TELL AN ESTONIAN LEARNER HOW THEY DID?
 *
 *   npm run measure:asr -- --corpus                         build the clips (TartuNLP, no key)
 *   npm run measure:asr -- --backend groq --model whisper-large-v3
 *   npm run measure:asr -- --backend gemini --model gemini-3.5-transcribe --budget 0.5
 *   python3 scripts/asr-local.py --model TalTechNLP/whisper-large-v3-turbo-et-verbatim-2604
 *   npm run measure:asr -- --report                         every recognizer heard so far, side by side
 *
 * ADR-018 says speaking practice compares and never scores. That was first an
 * availability claim and then, on 2026-08-29, a measured one: Groq's
 * whisper-large-v3 misread clean native Estonian at a 14.6 percent word error
 * rate, on exactly the distinctions a learner is weakest at. This is the same
 * question asked of everything that can be reached, cloud and open weights,
 * on one set of clips, so the only difference between two rows is the
 * recognizer.
 *
 * TWO TESTS, BECAUSE A WORD ERROR RATE IS NOT THE QUESTION A LEARNER ASKS.
 *
 *   SENTENCES. Attested sentences from the built dictionary, the same
 *   selection the first run used, spoken by two of TartuNLP's voices (one
 *   female, one male) so a result is not a fact about one voice. Clean,
 *   native, correctly stressed and silent behind: easier than any learner.
 *
 *   CONTRASTS. Single words from the shipped dictionary that differ only in
 *   consonant length (`linna` / `lina`) or only in a lenis/fortis stop
 *   (`kabi` / `kapi`). Each is asked as its own clip, as `lib/audio/say.ts`
 *   sends it. This is the test pronunciation feedback would actually stand
 *   on: a recognizer that hears `linna` as `lina` would tell a learner who
 *   said it perfectly that they had said the wrong word, and the learner
 *   cannot tell the machine's mistake from their own.
 *
 * THE BAR. A transcript could be shown beside a learner's attempt, with its
 * caveat stated, at a word error rate of 5 percent or less on these clean
 * sentences. Scoring a contrast would need far more: a recognizer that is
 * wrong about one contrast in ten on a native voice is wrong about the
 * learner one time in ten when they were right. The script prints both.
 *
 * Everything is cached under `.cache/asr/`, so a re-run asks nobody anything
 * twice. A refusal is not a result: a model whose clips were mostly refused
 * says so and is not ranked, which is the lesson the first version of this
 * learned by printing 2 percent over three survivors.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prepareClip } from "../lib/audio/wav";
import { spokenText } from "../lib/audio/say";
import { shippedDictionary, formValues } from "./lib/dictionary";
import { installMeter } from "./lib/meter";

// What this run spends, capped and said on exit (`scripts/lib/meter.ts`); replay off, because it counts a rate over samples, and a sample replayed is not a second sample.
installMeter({ replay: false });

const TTS = "https://api.tartunlp.ai/text-to-speech/v2";
const ROOT = join(process.cwd(), ".cache", "asr");
const CLIPS = join(ROOT, "clips");

const arg0 = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : undefined;
};
/**
 * Which voice said the clips. The recognizer comparison is on TartuNLP's, the
 * voices the app plays; a second set is the same sentences in another speech
 * engine, heard by one recognizer, which turns the harness round to ask how
 * intelligible each synthesizer is. `--tts gemini:<model>` builds one.
 */
const SET = arg0("set") ?? (arg0("tts") ? arg0("tts")!.replace(/[^\w.-]+/g, "_") : "tartunlp");
const HEARD = join(ROOT, SET === "tartunlp" ? "heard" : `heard-${SET}`);
const CORPUS = join(ROOT, SET === "tartunlp" ? "corpus.json" : `corpus-${SET}.json`);

const arg = (name: string, fallback?: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

/** The two voices every sentence is said in: one female, one male. */
const SENTENCE_VOICES = ["mari", "tambet"] as const;
/** The voice the contrast words are said in. */
const WORD_VOICE = "mari";
const SENTENCES = Number(arg("sentences", "40"));
const LENGTH_PAIRS = Number(arg("length-pairs", "24"));
const VOICING_PAIRS = Number(arg("voicing-pairs", "16"));

export interface Clip {
  readonly id: string;
  readonly kind: "sentence" | "word";
  /** What was said, as written. */
  readonly text: string;
  readonly voice: string;
  readonly file: string;
  /** For a word: the other half of its pair, and which contrast it tests. */
  readonly partner?: string;
  readonly contrast?: "length" | "voicing";
}

// ---------------------------------------------------------------- the corpus

/** The first run's own selection, so its 14.6 percent and these numbers are about the same sentences. */
function sentenceTexts(): string[] {
  const entries = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8")) as Array<{ examples?: Array<{ et?: string }> }>;
  const out: string[] = [];
  for (const entry of entries) {
    for (const example of entry.examples ?? []) {
      const text = (example.et ?? "").trim();
      const count = text.split(/\s+/).filter(Boolean).length;
      if (count >= 4 && text.length <= 60 && !out.includes(text)) out.push(text);
    }
  }
  return out.slice(0, SENTENCES);
}

const DEVOICE: Record<string, string> = { b: "p", d: "t", g: "k" };

/** Two spellings that differ by one stop and nothing else, `kabi` against `kapi`. */
function voicingKey(word: string): string | null {
  let swaps = 0;
  let out = "";
  for (const ch of word) {
    const hard = DEVOICE[ch];
    if (hard) {
      swaps++;
      out += hard;
    } else out += ch;
  }
  return swaps === 1 ? out : null;
}

/** Every spelling an A1 to B1 entry can be written as, single words of three to eight letters. */
function everydaySpellings(): string[] {
  const out = new Set<string>();
  for (const entry of shippedDictionary()) {
    if (!entry.cefr || !["A1", "A2", "B1"].includes(entry.cefr)) continue;
    for (const v of formValues(entry)) {
      const w = v.toLowerCase();
      if (/^[a-zõäöüšž]{3,8}$/u.test(w)) out.add(w);
    }
  }
  return [...out].sort();
}

/** A deterministic spread through a sorted list, so the pairs are not all from the letter a. */
function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const step = items.length / n;
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)]!);
}

function contrastPairs(): Array<{ a: string; b: string; contrast: "length" | "voicing" }> {
  const words = everydaySpellings();
  const byLength = new Map<string, string[]>();
  const byVoicing = new Map<string, string[]>();
  for (const w of words) {
    const lk = w.replace(/(.)\1/gu, "$1");
    (byLength.get(lk) ?? byLength.set(lk, []).get(lk)!).push(w);
    const vk = voicingKey(w);
    if (vk && words.includes(vk)) (byVoicing.get(vk) ?? byVoicing.set(vk, [vk]).get(vk)!).push(w);
  }
  const length = [...byLength.values()].filter((g) => g.length >= 2).map((g) => ({ a: g[0]!, b: g[1]!, contrast: "length" as const }));
  const voicing = [...byVoicing.values()].map((g) => ({ a: g[0]!, b: g[1]!, contrast: "voicing" as const }));
  return [...spread(length, LENGTH_PAIRS), ...spread(voicing, VOICING_PAIRS)];
}

async function speak(text: string, voice: string): Promise<string> {
  const name = createHash("sha256").update(`${text}|${voice}`).digest("hex").slice(0, 24);
  const file = join(CLIPS, `${name}.wav`);
  if (existsSync(file)) return file;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(TTS, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "audio/wav" },
      body: JSON.stringify({ text: spokenText(text), speaker: voice }),
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null);
    if (res?.ok) {
      writeFileSync(file, prepareClip(new Uint8Array(await res.arrayBuffer())));
      await new Promise((r) => setTimeout(r, 150));
      return file;
    }
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  throw new Error(`the speech service would not say "${text}" in ${voice}`);
}

/** Gemini's prebuilt voices standing in for TartuNLP's female and male one. */
const GEMINI_VOICE: Record<string, string> = { mari: "Kore", tambet: "Charon" };

/** A WAV header round raw 16-bit PCM, which is what older Gemini speech models return. */
function wavFromL16(pcm: Buffer, rate: number): Uint8Array {
  const out = Buffer.alloc(44 + pcm.length);
  out.write("RIFF", 0); out.writeUInt32LE(36 + pcm.length, 4); out.write("WAVE", 8);
  out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write("data", 36); out.writeUInt32LE(pcm.length, 40); pcm.copy(out, 44);
  return new Uint8Array(out);
}

async function speakGemini(model: string, text: string, voice: string): Promise<string> {
  const name = createHash("sha256").update(`${model}|${text}|${voice}`).digest("hex").slice(0, 24);
  const file = join(CLIPS, `${name}.wav`);
  if (existsSync(file)) return file;
  const body = {
    contents: [{ parts: [{ text: spokenText(text) }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { languageCode: "et-EE", voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE[voice] ?? "Kore" } } },
    },
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120_000) },
    ).catch(() => null);
    if (res?.ok) {
      const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }> };
      const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (part) {
        const raw = Buffer.from(part.data, "base64");
        const rate = Number(/rate=(\d+)/.exec(part.mimeType)?.[1] ?? 24000);
        const wav = /wav/i.test(part.mimeType) ? new Uint8Array(raw) : wavFromL16(raw, rate);
        writeFileSync(file, prepareClip(wav));
        return file;
      }
    }
    if (res && res.status === 402) break;
    await new Promise((r) => setTimeout(r, 4000 * 2 ** attempt));
  }
  throw new Error(`${model} would not say "${text}"`);
}

/** The TartuNLP corpus said again by another engine, clip for clip. */
async function buildTtsSet(engine: string): Promise<void> {
  const [kind, named] = engine.split(":");
  if (kind !== "gemini" || !named) {
    console.error("--tts takes gemini:<model>. Open-weights engines are spoken by scripts/asr-local.py --speak.");
    process.exit(1);
  }
  const model: string = named;
  const only = arg0("kind");
  const base = (JSON.parse(readFileSync(join(ROOT, "corpus.json"), "utf8")) as Clip[]).filter((c) => !only || c.kind === only);
  const clips: Clip[] = [];
  const limit = Number(arg0("concurrency") ?? "2");
  let next = 0;
  async function worker(): Promise<void> {
    while (next < base.length) {
      const c = base[next++]!;
      try {
        clips.push({ ...c, voice: c.voice, file: await speakGemini(model, c.text, c.voice) });
        process.stderr.write(".");
      } catch {
        process.stderr.write("?");
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  const order = new Map(base.map((c, i) => [c.id, i]));
  clips.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  writeFileSync(CORPUS, JSON.stringify(clips));
  console.log(`\n${clips.length}/${base.length} clips said by ${model}.`);
}

async function buildCorpus(): Promise<void> {
  mkdirSync(CLIPS, { recursive: true });
  const clips: Clip[] = [];
  for (const [i, text] of sentenceTexts().entries()) {
    for (const voice of SENTENCE_VOICES) {
      clips.push({ id: `s${i}-${voice}`, kind: "sentence", text, voice, file: await speak(text, voice) });
    }
    process.stderr.write(".");
  }
  for (const [i, pair] of contrastPairs().entries()) {
    for (const [side, word, partner] of [["a", pair.a, pair.b], ["b", pair.b, pair.a]] as const) {
      clips.push({
        id: `w${i}${side}`, kind: "word", text: word, voice: WORD_VOICE,
        file: await speak(word, WORD_VOICE), partner, contrast: pair.contrast,
      });
    }
    process.stderr.write("+");
  }
  writeFileSync(CORPUS, JSON.stringify(clips));
  const words = clips.filter((c) => c.kind === "word");
  console.log(`\n${clips.length} clips: ${clips.length - words.length} sentences, ${words.length} contrast words.`);
  for (const w of words.filter((_, i) => i % 2 === 0)) console.log(`  ${w.contrast?.padEnd(7)} ${w.text} / ${w.partner}`);
}

function corpus(): Clip[] {
  if (!existsSync(CORPUS)) {
    console.error("No corpus yet. Run with --corpus first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(CORPUS, "utf8")) as Clip[];
}

// ---------------------------------------------------------------- the recognizers

type Heard = { text: string; ms: number } | { error: string };

function heardFile(backend: string, model: string): string {
  return join(HEARD, `${backend}__${model.replace(/[^\w.-]+/g, "_")}.json`);
}

async function hearGroq(model: string, wav: Buffer): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "speech.wav");
  form.append("model", model);
  form.append("language", "et");
  form.append("response_format", "json");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`ASR ${res.status}`);
  return (((await res.json()) as { text?: string }).text ?? "").trim();
}

/**
 * A general multimodal model, asked to transcribe.
 *
 * The instruction is bare on purpose. Asking it to correct or tidy anything
 * would measure how well it guesses at Estonian rather than how well it heard,
 * and guessing is the failure this exists to catch.
 *
 * No temperature is sent, which is the repository's rule for every harness and
 * what Google asks of the Gemini 3 family. A first pass at temperature 0 is
 * kept under `.cache/asr/heard-temp0/` and is not the same number: on
 * 2026-10-15 the default was worse for every model measured both ways, 3.6
 * against 4.4 percent on `gemini-3.8-flash` and 9.9 against 15.1 on
 * `gemini-3.1-flash-lite`, so the report says which a row was.
 *
 * A dedicated transcription model (`gemini-3.5-transcribe`) takes no prompt and
 * answers in an `audioTranscription` part rather than a text one. Asked bare it
 * guesses the language and heard "Mis su aadress on?" as Finnish, so it is told
 * the language the way it accepts one, which is the same hint Whisper is given.
 */
async function hearGemini(model: string, wav: Buffer, kind: Clip["kind"]): Promise<string> {
  const transcriber = /transcribe/.test(model);
  const ask = kind === "word"
    ? "This is one Estonian word spoken aloud. Write the word exactly as spoken, nothing else."
    : "Transcribe this Estonian audio exactly as spoken. Output only the transcription.";
  const audio = { inline_data: { mime_type: "audio/wav", data: wav.toString("base64") } };
  const body = transcriber
    ? { contents: [{ parts: [audio] }], generationConfig: { audioTranscriptionConfig: { languageCodes: ["et"] } } }
    : { contents: [{ parts: [{ text: ask }, audio] }] };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(180_000) },
  );
  if (!res.ok) throw new Error(`ASR ${res.status} ${(await res.text()).slice(0, 160).replace(/\s+/g, " ")}`);
  type Part = { text?: string; thought?: boolean; audioTranscription?: { text?: string } };
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Part[] } }> };
  return (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.audioTranscription?.text ?? p.text ?? "")
    .join("")
    .trim();
}

async function hearAll(backend: string, model: string): Promise<void> {
  if (backend !== "groq" && backend !== "gemini") {
    console.error(`Unknown backend "${backend}". Cloud: groq, gemini. Open weights: scripts/asr-local.py.`);
    process.exit(1);
  }
  const hear = (wav: Buffer, kind: Clip["kind"]) =>
    backend === "groq" ? hearGroq(model, wav) : hearGemini(model, wav, kind);
  mkdirSync(HEARD, { recursive: true });
  const file = heardFile(backend, model);
  const done: Record<string, Heard> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const todo = corpus().filter((c) => !done[c.id] || "error" in done[c.id]!);
  const concurrency = Number(arg("concurrency", backend === "groq" ? "2" : "4"));
  const pace = Number(arg("pace", "0"));
  let next = 0;
  async function worker(): Promise<void> {
    while (next < todo.length) {
      const clip = todo[next++]!;
      const wav = readFileSync(clip.file);
      let result: Heard = { error: "never asked" };
      for (let attempt = 0; attempt < 5; attempt++) {
        const started = Date.now();
        try {
          result = { text: await hear(wav, clip.kind), ms: Date.now() - started };
          break;
        } catch (error) {
          const message = String((error as Error).message);
          result = { error: message };
          // 429 and 5xx clear on their own and say nothing about accuracy; anything else is an answer.
          if (!/\b(429|5\d\d)\b|timeout|fetch failed/i.test(message)) break;
          await new Promise((r) => setTimeout(r, 4000 * 2 ** attempt));
        }
      }
      done[clip.id] = result;
      process.stderr.write("error" in result ? "?" : ".");
      // A preview model's quota is a handful of requests a minute; waiting is faster than being refused.
      if (pace > 0) await new Promise((r) => setTimeout(r, pace));
      writeFileSync(file, JSON.stringify(done));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  process.stderr.write("\n");
}

// ---------------------------------------------------------------- the scoring

/** Words, lower-cased, with punctuation that never carries meaning taken off. */
export function words(text: string): string[] {
  return text
    .normalize("NFC")
    .toLocaleLowerCase("et")
    .replace(/[.,!?;:()"'«»„“”‚‘’\-–—…]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Levenshtein over words: the standard word error rate, insertions included. */
export function wordErrors(said: string, heard: string): { distance: number; length: number } {
  return editDistance(words(said), words(heard));
}

/**
 * Levenshtein over letters with the spaces taken out. A word error rate counts
 * `ministri abina` heard as `ministriabina` as two wrong words, which is a fact
 * about where Estonian writes a compound and not about what was heard; the
 * letter rate is the sound half alone, and the two are printed side by side.
 */
export function letterErrors(said: string, heard: string): { distance: number; length: number } {
  return editDistance([...words(said).join("")], [...words(heard).join("")]);
}

function editDistance(a: string[], b: string[]): { distance: number; length: number } {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = a[i - 1] === b[j - 1]
        ? d[i - 1]![j - 1]!
        : 1 + Math.min(d[i - 1]![j - 1]!, d[i - 1]![j]!, d[i]![j - 1]!);
    }
  }
  return { distance: d[a.length]![b.length]!, length: a.length };
}

interface Row {
  name: string;
  measured: number;
  total: number;
  wer: number;
  ler: number;
  werBy: Record<string, number>;
  exact: number;
  sentences: number;
  wordsRight: number;
  wordsHeard: number;
  lengthRight: string;
  voicingRight: string;
  swapped: number;
  ms: number;
  wrong: Array<{ said: string; heard: string }>;
}

function score(name: string, heard: Record<string, Heard>, clips: Clip[]): Row {
  const got = (c: Clip) => { const h = heard[c.id]; return h && "text" in h ? h : null; };
  const sentences = clips.filter((c) => c.kind === "sentence");
  const wordsAsked = clips.filter((c) => c.kind === "word");
  let errs = 0, len = 0, exact = 0, ms = 0, timed = 0, lerrs = 0, llen = 0;
  const by: Record<string, [number, number]> = {};
  const wrong: Row["wrong"] = [];
  for (const c of sentences) {
    const h = got(c);
    if (!h) continue;
    /*
      A sentence holding a digit is left out of the rates: "kell 18" heard as
      "kell kaheksateist" is right, and no comparison of strings can say so.
    */
    if (/\d/.test(c.text)) continue;
    const { distance, length } = wordErrors(c.text, h.text);
    errs += distance; len += length;
    const letters = letterErrors(c.text, h.text);
    lerrs += letters.distance; llen += letters.length;
    const v = (by[c.voice] ??= [0, 0]); v[0] += distance; v[1] += length;
    if (distance === 0) exact++;
    else wrong.push({ said: c.text, heard: h.text });
    ms += h.ms; timed++;
  }
  const one = (s: string) => words(s).join(" ");
  const tally = { length: [0, 0], voicing: [0, 0] } as Record<string, [number, number]>;
  let swapped = 0, wordsHeard = 0, wordsRight = 0;
  for (const c of wordsAsked) {
    const h = got(c);
    if (!h) continue;
    wordsHeard++;
    const t = tally[c.contrast!]!;
    t[1]++;
    if (one(h.text) === c.text) { t[0]++; wordsRight++; }
    else if (one(h.text) === c.partner) swapped++;
  }
  const measured = clips.filter((c) => got(c)).length;
  return {
    name, measured, total: clips.length,
    wer: len ? (errs / len) * 100 : NaN,
    ler: llen ? (lerrs / llen) * 100 : NaN,
    werBy: Object.fromEntries(Object.entries(by).map(([k, [e, l]]) => [k, l ? (e / l) * 100 : NaN])),
    exact, sentences: sentences.filter((c) => got(c) && !/\d/.test(c.text)).length,
    wordsRight, wordsHeard,
    lengthRight: `${tally.length![0]}/${tally.length![1]}`,
    voicingRight: `${tally.voicing![0]}/${tally.voicing![1]}`,
    swapped,
    ms: timed ? ms / timed : NaN,
    wrong,
  };
}

function report(): void {
  const clips = corpus();
  if (!existsSync(HEARD)) {
    console.log("Nothing heard yet.");
    return;
  }
  /*
    The first Gemini pass sent temperature 0 and is kept rather than bought
    again: a model heard only at temperature 0 is listed with that beside it.
  */
  const dirs: Array<[string, string]> = [[HEARD, ""]];
  const temp0 = `${HEARD}-temp0`;
  if (existsSync(temp0)) dirs.push([temp0, " (temp 0)"]);
  const rows = dirs.flatMap(([dir, note]) => readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) =>
    score(f.replace(/\.json$/, "").replace("__", " ") + note, JSON.parse(readFileSync(join(dir, f), "utf8")), clips)));
  const floor = Math.ceil(clips.length * (2 / 3));
  const ranked = rows.filter((r) => r.measured >= floor).sort((a, b) => a.wer - b.wer);
  const short = rows.filter((r) => r.measured < floor);

  const s = clips.filter((c) => c.kind === "sentence");
  const voices = [...new Set(s.map((c) => c.voice))];
  console.log(`Set "${SET}": ${s.length} sentence clips in ${voices.join(" and ")}, ` +
    `${clips.length - s.length} contrast words. Clean native synthetic audio throughout.\n`);
  const head = ["recognizer", "clips", "WER", "letters", ...voices, "exact", "contrast words", "length", "voicing", "partner", "s/clip"];
  const table = ranked.map((r) => [
    r.name, `${r.measured}/${r.total}`, `${r.wer.toFixed(1)}%`, `${r.ler.toFixed(1)}%`, ...voices.map((v) => `${(r.werBy[v] ?? NaN).toFixed(1)}%`),
    `${r.exact}/${r.sentences}`, `${r.wordsRight}/${r.wordsHeard}`, r.lengthRight, r.voicingRight,
    String(r.swapped), (r.ms / 1000).toFixed(1),
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...table.map((t) => t[i]!.length)));
  const line = (cells: string[]) => "  " + cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]!) : c.padStart(widths[i]!))).join("  ");
  console.log(line(head));
  for (const t of table) console.log(line(t));
  console.log("\n  partner: a contrast word heard as the other half of its pair, which is the");
  console.log("  verdict pronunciation feedback would hand a learner who said it right.");
  if (short.length) {
    console.log("\n  Not ranked, too few clips answered to be a sample:");
    for (const r of short) console.log(`    ${r.name}: ${r.measured}/${r.total}`);
  }
  const best = ranked[0];
  if (best) {
    console.log(`\n  What ${best.name} got wrong, sentences:`);
    for (const w of best.wrong.slice(0, Number(arg("show", "10")))) console.log(`    said  ${w.said}\n    heard ${w.heard}\n`);
    console.log(best.wer <= 5
      ? "  The best is under 5 percent on clean sentences: a transcript could be shown, with its caveat."
      : "  None is under 5 percent on clean sentences: too high to put in front of a learner as evidence.");
  }
  if (flag("json")) writeFileSync(join(ROOT, "report.json"), JSON.stringify(rows));
}

// ---------------------------------------------------------------- main

async function main(): Promise<void> {
  if (flag("corpus")) return buildCorpus();
  if (arg("tts")) return buildTtsSet(arg("tts")!);
  if (flag("report")) return report();
  const backend = arg("backend", "groq")!;
  const model = arg("model", backend === "groq" ? "whisper-large-v3" : "gemini-3.5-transcribe")!;
  const key = backend === "groq" ? "GROQ_API_KEY" : "GEMINI_API_KEY";
  if (!process.env[key]) {
    console.error(`Set ${key} to measure ${backend}.`);
    process.exit(1);
  }
  await hearAll(backend, model);
  report();
}

void main();
