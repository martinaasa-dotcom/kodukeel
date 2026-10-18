#!/usr/bin/env tsx
/**
 * Cut the native speaker's recording into the clips the app plays.
 *
 * The recording is one take, read off a script, with a pause between lines
 * and a longer one between sections (`scripts/recordings/`). Where each clip
 * starts and ends is `scripts/recordings/native-cuts.json`, worked out once by
 * silence detection and checked against the script section by section: every
 * section came back with exactly the number of lines it holds, the only
 * pieces that split being the slow takes and the longer sentences, which were
 * joined back where the script says they belong.
 *
 * Each clip then goes through the pipeline every synthetic clip goes through
 * (`lib/audio/wav.ts`): trimmed to the same lead and release, its pauses
 * capped, leveled to the same loudness, and written as 16-bit PCM. So a word
 * the person recorded and a word the synthesizer said start the same distance
 * after a press and play at the same volume, and the stretch that slows a
 * clip for a beginner works on both (`lib/audio/stretch.ts`). 22,050 Hz,
 * which is the speech service's own rate and keeps an `s` apart from a `š`.
 *
 * Needs ffmpeg on the path, which is how the FLAC is read. The output is
 * committed, so nothing at build or run time does.
 *
 *   tsx scripts/build-native-audio.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NATIVE_CLIPS } from "../lib/audio/native";
import { capPauses, encodeWav16, normaliseLoudness, trimSilence } from "../lib/audio/wav";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECORDINGS = path.join(ROOT, "scripts/recordings");
const OUT = path.join(ROOT, "public/audio/native");
const RATE = 22_050;

interface Cuts {
  readonly source: string;
  readonly clips: readonly { readonly id: string; readonly from: number; readonly to: number }[];
}

const cuts = JSON.parse(readFileSync(path.join(RECORDINGS, "native-cuts.json"), "utf8")) as Cuts;
const source = path.join(RECORDINGS, cuts.source);

const catalog = new Set(NATIVE_CLIPS.map((clip) => clip.id));
const cut = new Set(cuts.clips.map((clip) => clip.id));
const missing = [...catalog].filter((id) => !cut.has(id));
const extra = [...cut].filter((id) => !catalog.has(id));
if (missing.length > 0 || extra.length > 0) {
  console.error(`The catalog and the cut list disagree. No cut for: ${missing.join(", ") || "none"}. Not in the catalog: ${extra.join(", ") || "none"}.`);
  process.exit(1);
}

/** The stretch of the recording as mono floats at `RATE`. */
function read(from: number, to: number): Float32Array {
  const raw = execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-ss", from.toFixed(3), "-to", to.toFixed(3), "-i", source,
    "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-",
  ], { maxBuffer: 64 * 1024 * 1024 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) if (file.endsWith(".wav")) rmSync(path.join(OUT, file));

let bytes = 0;
for (const { id, from, to } of cuts.clips) {
  const pcm = normaliseLoudness(capPauses(trimSilence({ rate: RATE, samples: read(from, to) })));
  const wav = encodeWav16(pcm);
  writeFileSync(path.join(OUT, `${id}.wav`), wav);
  bytes += wav.byteLength;
}
console.log(`${cuts.clips.length} clips, ${(bytes / 1024 / 1024).toFixed(1)} MB, in ${path.relative(ROOT, OUT)}`);
