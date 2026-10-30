"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/ui";
import { MicButton } from "@/components/speech/MicButton";
import { ReadAloud } from "@/components/speech/ReadAloud";
import { useSpeech, type Speech } from "@/components/speech/useSpeech";
import { reconcile, type Hearing } from "@/lib/speech/reconcile";
import { lineWords, lightUp, shareLit } from "@/lib/speech/lightUp";
import { readWav } from "@/lib/speech/wav";
import { ENGINE_ERRORS, type EngineError, type RawTurn } from "@/lib/speech/engine";
import type { SpeechAvailability } from "@/lib/audio/speechAvailability";

/** What `public/asr/check.wav` says, from `scripts/make-speech-fixtures.ts`. */
const CHECK_TEXT = "Tere hommikust! Kuidas läheb?";

export function Bench({ availability }: { readonly availability: SpeechAvailability }) {
  const [live, setLive] = useState<{ hearing: Hearing; raw: RawTurn } | null>(null);
  const speech = useSpeech({ endpoint: true, onHeard: (hearing, raw) => setLive({ hearing, raw }) });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-lg font-semibold">On this deployment</h2>
        <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm" data-bench-status>
          <dt style={{ color: "var(--ink-2)" }}>Model base</dt>
          <dd>{availability.modelBase ?? "none"}</dd>
          <dt style={{ color: "var(--ink-2)" }}>Not offered because</dt>
          <dd>{speech.why ?? availability.unavailable ?? "it is offered"}</dd>
          <dt style={{ color: "var(--ink-2)" }}>On this device</dt>
          <dd data-bench-phase={speech.phase}>{speech.phase}</dd>
        </dl>
      </Card>

      <FileCard speech={speech} />

      <Card>
        <h2 className="text-lg font-semibold">Say something</h2>
        <div className="mt-3" data-bench-mic>
          <MicButton speech={speech} label="Say something" shortcut size="lg" fallback="box" />
        </div>
        {live && <HearingTable hearing={live.hearing} raw={live.raw} />}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Say a line along</h2>
        <div className="mt-3">
          <ReadAloud line={CHECK_TEXT} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">The microphone in every state</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-2" data-mic-gallery>
          {GALLERY.map(([name, overrides]) => (
            <div key={name} className="flex flex-col gap-2" data-mic-state={name}>
              <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>{name}</p>
              <MicButton speech={fake(overrides)} label="Say something" fallback="box" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** The fixture clip, or a file of your own, through the same hook every screen listens with. */
function FileCard({ speech }: { readonly speech: Speech }) {
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<{ text: string; matches: boolean | null; ms: number; seconds: number; raw: RawTurn[] } | null>(null);
  const [failed, setFailed] = useState("");

  const run = async (bytes: ArrayBuffer, expected: string | null) => {
    setFailed("");
    setResult(null);
    try {
      /* A WAV is read sample for sample (`lib/speech/wav.ts`, which is pure),
         so the golden file's turns come from exactly the bytes a native app
         reads; a browser decoder would resample the fixture to its context's
         rate and back, and the turns would hold the browser's resampler. Any
         other format goes through an offline context, which asks for no device. */
      const wav = (() => {
        try {
          return readWav(new Uint8Array(bytes));
        } catch {
          return null; // Not a mono WAV this module reads: the browser's decoder takes it.
        }
      })();
      const decoded = wav
        ? { samples: wav.samples, sampleRate: wav.rate, duration: wav.samples.length / wav.rate }
        : await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(bytes).then((b) => ({ samples: b.getChannelData(0), sampleRate: b.sampleRate, duration: b.duration }));
      const samples = decoded.samples;
      const started = performance.now();
      const pieces = await speech.transcribe(samples, decoded.sampleRate, (done, total) =>
        setProgress(`${done.toFixed(1)} of ${total.toFixed(1)} s`),
      );
      const text = pieces.map((p) => reconcile(p.turn).understood).filter(Boolean).join(" ");
      setResult({
        text,
        // Every word of the clip heard, in order: the file path gives the same reading a turn does.
        matches: expected ? shareLit(lightUp(lineWords(expected), text)) === 1 : null,
        ms: Math.round(performance.now() - started),
        seconds: decoded.duration,
        raw: pieces.map((p) => p.turn),
      });
    } catch (e) {
      setFailed(String(e));
    } finally {
      setProgress("");
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">A file</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        The fixture clip says “{CHECK_TEXT}”. It is decoded through the same hook a screen uses.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={!speech.offered || speech.phase !== "ready" || progress !== ""}
          onClick={async () => {
            const response = await fetch("/asr/check.wav");
            await run(await response.arrayBuffer(), CHECK_TEXT);
          }}
        >
          Decode the fixture clip
        </Button>
        <label className="text-sm underline" style={{ color: "var(--accent-deep)" }}>
          Or choose a file
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            disabled={!speech.offered || speech.phase !== "ready"}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await run(await file.arrayBuffer(), null);
            }}
          />
        </label>
        {progress && <span className="text-sm" style={{ color: "var(--ink-2)" }}>{progress}</span>}
      </div>
      {result && (
        <div className="mt-3 text-sm" data-bench-file>
          <p lang="et" className="text-md" data-bench-transcript>{result.text || "(nothing heard)"}</p>
          {/* What the engine itself returned, read by `npm run asr:golden` (VB-3). */}
          <pre hidden data-bench-raw>{JSON.stringify(result.raw)}</pre>
          <p style={{ color: "var(--ink-2)" }}>
            {result.seconds.toFixed(2)} s of audio in {result.ms} ms
            {result.matches !== null && (result.matches ? ", and it says what the clip says." : ", and it does not match the clip.")}
          </p>
        </div>
      )}
      {failed && <p className="mt-3 text-sm" style={{ color: "var(--again-ink)" }} role="alert">{failed}</p>}
    </Card>
  );
}

function HearingTable({ hearing, raw }: { readonly hearing: Hearing; readonly raw: RawTurn }) {
  return (
    <div className="mt-4 flex flex-col gap-2 text-sm" data-bench-live>
      <p><span style={{ color: "var(--ink-2)" }}>Heard </span><span lang="et">{hearing.heard}</span></p>
      <p><span style={{ color: "var(--ink-2)" }}>Understood </span><span lang="et">{hearing.understood}</span></p>
      <p style={{ color: "var(--ink-2)" }}>Greedy “<span lang="et">{raw.greedy.text}</span>”, beam “<span lang="et">{raw.beam.text}</span>”, {hearing.seconds.toFixed(2)} s of speech.</p>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr><th className="pr-4 text-left">Word</th><th className="pr-4 text-left">Heard</th><th className="pr-4 text-left">Agreed</th><th className="pr-4 text-left">Known</th><th className="pr-4 text-left">Unsure</th><th className="text-left">Repaired</th></tr>
          </thead>
          <tbody>
            {hearing.words.map((w, i) => (
              <tr key={i}>
                <td className="pr-4" lang="et">{w.text}</td>
                <td className="pr-4" lang="et">{w.heard}</td>
                <td className="pr-4">{w.agreed ? "yes" : "no"}</td>
                <td className="pr-4">{w.known === null ? "not asked" : w.known ? "yes" : "no"}</td>
                <td className="pr-4">{w.unsure ? "yes" : "no"}</td>
                <td>{w.repaired ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** A microphone in a state the gallery wants to draw, with nothing behind it. */
function fake(overrides: Partial<Speech>): Speech {
  const nothing = async () => {};
  return {
    offered: true,
    why: null,
    phase: "ready",
    progress: { done: 0, total: 0 },
    listening: false,
    thinking: false,
    partial: "",
    level: 0,
    clipping: false,
    error: null,
    hearing: null,
    audio: null,
    appSpeaking: false,
    silent: false,
    download: nothing,
    start: nothing,
    stop: () => {},
    cancel: () => {},
    forget: nothing,
    transcribe: async () => [],
    ...overrides,
  };
}

const GALLERY: readonly (readonly [string, Partial<Speech>])[] = [
  ["Ready", {}],
  ["Not downloaded yet", { phase: "needs-download" }],
  ["Downloading", { phase: "downloading", progress: { done: 31_000_000, total: 71_000_000 } }],
  ["Getting ready", { phase: "loading" }],
  ["Listening", { listening: true, level: 0.6, partial: "tere hommikust" }],
  ["Listening, too loud", { listening: true, level: 1, clipping: true, partial: "tere" }],
  ["Reading what was said", { thinking: true }],
  ["The app is speaking", { appSpeaking: true }],
  ["Nothing was heard", { silent: true }],
  ...ENGINE_ERRORS.map((error): readonly [string, Partial<Speech>] => [`Error: ${error}`, { error: error as EngineError, phase: "error" }]),
];
