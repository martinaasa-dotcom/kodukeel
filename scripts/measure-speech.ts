/**
 * What the speech service does with a bare word, and what it does with a
 * finished one.
 *
 *   npm run measure:speech
 *   npm run measure:speech -- --words õde,ema,pea --voices meelis,kalev
 *   npm run measure:speech -- --hear            # with GEMINI_API_KEY
 *
 * A learner reported single words sounding "like the word is incomplete", and
 * the speed was the suspect. It is not: a recognizer gets the same words right
 * at the recording's own pace as at 0.6 and 0.5 of it, and what is wrong with a
 * word is wrong before a sample has been stretched. What is wrong is the
 * string. TartuNLP reads sentences, so a bare headword with no stop on it is a
 * fragment to its front end and comes back rendered as one.
 *
 * This is the instrument for that claim, and it needs no key: it asks the
 * service for each word twice, once as this app used to send it and once as
 * `lib/audio/say.ts` sends it now, prepares both clips exactly as the route
 * does, and prints what changed. The length of the loud body of the word is
 * the figure to read, because a longer clip could be a longer pause and a
 * longer body cannot.
 *
 * With `--hear` it also puts both clips to a recognizer, which is the stronger
 * evidence and the slower, dearer half. `scripts/measure-asr.mjs` is the
 * neighbouring instrument and says at length why a recognizer is read as a
 * comparison between two renderings of one clip rather than as a score.
 *
 * It reports and never fails. Responses are cached on disk, so a re-run costs
 * the service nothing.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { decodeWav, prepareClip, LEAD_MS, TRAIL_MS } from "../lib/audio/wav";
import { spokenText } from "../lib/audio/say";

const TTS = "https://api.tartunlp.ai/text-to-speech/v2";
const CACHE = ".speech-cache";

const arg = (name: string, fallback: string): string => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};

/** Ordinary course words, short and long, across the vowels Estonian spells alone. */
const WORDS = arg(
  "words",
  "õde,ema,isa,tuba,kass,pea,öö,sõber,päev,käsi,töö,mees,kohv,aeg,vesi,laps,raamat,linn,koer,talv",
).split(",");
/** Deep, middling and high, since a learner named a deep voice. */
const VOICES = arg("voices", "meelis,kalev,tambet,mari,peeter,albert").split(",");
const HEAR = process.argv.includes("--hear");
const MODEL = arg("model", "gemini-flash-latest");

mkdirSync(`${CACHE}/tts`, { recursive: true });
mkdirSync(`${CACHE}/heard`, { recursive: true });

async function say(text: string, voice: string): Promise<Uint8Array> {
  const file = `${CACHE}/tts/${createHash("sha1").update(`${text}|${voice}`).digest("hex")}.wav`;
  if (existsSync(file)) return new Uint8Array(readFileSync(file));
  const res = await fetch(TTS, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, speaker: voice }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`speech service ${res.status} for "${text}"`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(file, bytes);
  await new Promise((r) => setTimeout(r, 150));
  return bytes;
}

/** Milliseconds of speech, and of it, milliseconds within 20 dB of the loudest frame. */
function lengths(bytes: Uint8Array): { speech: number; body: number } {
  const pcm = decodeWav(prepareClip(bytes));
  const frame = Math.round(pcm.rate * 0.01);
  const frames = Math.floor(pcm.samples.length / frame);
  const levels: number[] = [];
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * frame; i < (f + 1) * frame; i++) {
      const v = pcm.samples[i] ?? 0;
      sum += v * v;
    }
    levels.push(Math.sqrt(sum / frame));
  }
  const loudest = Math.max(...levels, 0);
  return {
    speech: (pcm.samples.length / pcm.rate) * 1000 - LEAD_MS - TRAIL_MS,
    body: levels.filter((l) => l >= loudest * 0.1).length * 10,
  };
}

async function heard(bytes: Uint8Array): Promise<string> {
  const file = `${CACHE}/heard/${createHash("sha1").update(bytes).digest("hex")}.txt`;
  if (existsSync(file)) return readFileSync(file, "utf8");
  const body = {
    contents: [{
      parts: [
        { text: "This is one Estonian word spoken aloud. Write the word exactly as spoken, nothing else." },
        { inline_data: { mime_type: "audio/wav", data: Buffer.from(bytes).toString("base64") } },
      ],
    }],
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120_000) },
    );
    if (res.ok) {
      const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
      writeFileSync(file, text);
      return text;
    }
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  throw new Error("the recognizer would not answer");
}

const fold = (s: string) => s.toLowerCase().replace(/[^a-zõäöüšž]/gu, "");

async function main(): Promise<void> {
  if (HEAR && !process.env.GEMINI_API_KEY) {
    console.error("Set GEMINI_API_KEY to put the clips to a recognizer, or drop --hear.");
    process.exit(1);
  }
  const rows: Array<{ word: string; voice: string; bare: number; said: number; bareHeard?: string; saidHeard?: string }> = [];
  for (const voice of VOICES) {
    for (const word of WORDS) {
      const bareBytes = await say(word, voice);
      const saidBytes = await say(spokenText(word), voice);
      const row: (typeof rows)[number] = {
        word, voice,
        bare: lengths(bareBytes).body,
        said: lengths(saidBytes).body,
      };
      if (HEAR) {
        row.bareHeard = await heard(prepareClip(bareBytes));
        row.saidHeard = await heard(prepareClip(saidBytes));
      }
      rows.push(row);
    }
    process.stderr.write(`${voice} `);
  }
  process.stderr.write("\n");

  const ratios = rows.map((r) => r.said / r.bare).sort((a, b) => a - b);
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  console.log(`\n${rows.length} words over ${VOICES.length} voices.\n`);
  console.log("How long the word itself is when it is asked for as a finished sentence,");
  console.log("as a share of what the same word bare came back as:\n");
  console.log(`  mean x${mean.toFixed(3)}   median x${(ratios[Math.floor(ratios.length / 2)] as number).toFixed(3)}`);
  console.log(`  longer on ${ratios.filter((r) => r > 1.05).length}, shorter on ${ratios.filter((r) => r < 0.95).length}, unmoved on ${ratios.filter((r) => r >= 0.95 && r <= 1.05).length}`);

  const byMove = [...rows].sort((a, b) => b.said / b.bare - a.said / a.bare);
  console.log("\nWhere it moves most. Read the list rather than the mean: a word that was");
  console.log("coming back in a third of a second was coming back cut off.\n");
  for (const r of byMove.slice(0, 8)) {
    console.log(`  ${r.word.padEnd(8)} ${r.voice.padEnd(8)} ${String(r.bare).padStart(4)}ms -> ${String(r.said).padStart(4)}ms`);
  }

  if (HEAR) {
    const right = (key: "bareHeard" | "saidHeard") => rows.filter((r) => fold(r[key] ?? "") === fold(r.word)).length;
    console.log(`\nHeard correctly by ${MODEL}:`);
    console.log(`  as this app used to ask    ${right("bareHeard")}/${rows.length}`);
    console.log(`  as a finished sentence     ${right("saidHeard")}/${rows.length}`);
    const fixed = rows.filter((r) => fold(r.bareHeard ?? "") !== fold(r.word) && fold(r.saidHeard ?? "") === fold(r.word));
    const broke = rows.filter((r) => fold(r.bareHeard ?? "") === fold(r.word) && fold(r.saidHeard ?? "") !== fold(r.word));
    console.log(`\n  the stop rescued: ${fixed.map((r) => `${r.word}/${r.voice} was "${r.bareHeard}"`).join(", ") || "none"}`);
    console.log(`\n  the stop cost:    ${broke.map((r) => `${r.word}/${r.voice} became "${r.saidHeard}"`).join(", ") || "none"}`);
  }
}

void main();
