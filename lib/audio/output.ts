/**
 * THE SPEAKER IS AWAKE BEFORE THE WORD STARTS, AND STAYS AWAKE BETWEEN WORDS.
 *
 * Reported off the listening round: the first and the last sound of a word
 * did not play, so `kott` was heard as `ott` and `kass` as `kas`. Every link
 * of the chain before the speaker was measured and none of them was cutting
 * anything. `prepareClip` keeps every frame of the word over 155 real
 * TartuNLP clips in ten voices, with nothing above the hiss lost at either
 * edge; the stretch keeps the 120 ms lead and the 320 ms trail at every rate a
 * round plays at; and a real Chromium, recording what its own audio element
 * produced through `captureStream`, gave back every frame of the prepared
 * clip from the first burst to the last decay.
 *
 * What is left is the device, which none of that can see. Every word was a
 * brand-new `HTMLAudioElement`, so every word opened a new output stream, and
 * an output that has been quiet for a few seconds is asleep: Bluetooth
 * headphones drop the link to save power, Android puts its output into
 * standby three seconds after the last sound, and many laptops power the codec
 * down. Waking takes 100 to 400 ms, and whatever was written to the stream in
 * that window is never heard. A 120 ms lead covers a wired speaker and not the
 * rest, and a listening round, where a learner thinks for five seconds between
 * words, puts every single word on a device that has just gone back to sleep.
 * The tail goes the same way the other side round: a stream torn down while
 * its last samples are still queued in a Bluetooth codec's buffer loses them.
 *
 * So there is one output and it is kept awake. The first sound of a stretch of
 * listening starts a keep-alive on the shared `AudioContext`, a loop of noise
 * at `KEEP_ALIVE_LEVEL`, eighty decibels under full scale, which no ear hears
 * and every power manager counts as playing; every sound after that extends
 * it, and `KEEP_WARM_MS` after the last one it stops and the context is
 * suspended, so a learner who has left the round is not paying for it in
 * battery. A sound that finds the output cold is given `WAKE_MS` more silence in
 * front of the word, which is the one moment this costs anybody time, and it
 * is the moment the word would otherwise have lost its first letter.
 *
 * Noise rather than zeros because a stream of exact zeros is what a "silence"
 * detector looks for: some Bluetooth stacks and some speakers power down on a
 * digital zero regardless of a stream being open. Eighty decibels down is
 * under the -72 dBFS Chrome treats as silent for the tab's speaker icon, and
 * a little over one least significant bit of the 16-bit link, so it is not
 * rounded to zero on its way there.
 *
 * NOTHING HERE PLAYS A CLIP. `playClip` in `lib/audio/clip.ts` is still the
 * one door; this is what it, the mixer, the recordings and the feedback tones
 * ask before they make a sound. Browser only, except for `wakeDelayMs`, which
 * is the decision kept pure so it is tested rather than described.
 */

/** How much silence a cold output is given in front of the first sound sent to it. */
export const WAKE_MS = 300;
/** How long the output is kept awake after the last sound. A round's pause between words is far under it. */
export const KEEP_WARM_MS = 60_000;
/** The keep-alive's level: -80 dBFS, inaudible and still counted as playing. */
export const KEEP_ALIVE_LEVEL = 1e-4;
/** How long a resume without a gesture is given before it is read as the autoplay policy. */
const RESUME_MS = 250;

/**
 * How much head start a sound needs, given the state of the output: nothing
 * where it is running and has been kept awake, `WAKE_MS` where it is cold.
 * "Running" alone is not warm, because a context that is running with nothing
 * playing through it is exactly the state Android puts into standby.
 */
export function wakeDelayMs(state: { running: boolean; warmUntil: number; now: number }): number {
  return state.running && state.now < state.warmUntil ? 0 : WAKE_MS;
}

let context: AudioContext | null = null;
let keepAlive: AudioBufferSourceNode | null = null;
let warmUntil = 0;
let sleepTimer: ReturnType<typeof setTimeout> | null = null;
let watchingVisibility = false;

/** The one playing `AudioContext`, made on first use. Null outside a browser or where there is none. */
export function outputContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  return context;
}

function running(ctx: AudioContext): boolean {
  return (ctx.state as string) === "running";
}

function startKeepAlive(ctx: AudioContext): void {
  if (keepAlive) return;
  const length = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * KEEP_ALIVE_LEVEL;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(ctx.destination);
  source.start();
  keepAlive = source;
}

/** Stops the keep-alive and lets the output sleep. Called when the warm spell ends or the tab is hidden. */
export function sleepOutput(): void {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = null;
  warmUntil = 0;
  const source = keepAlive;
  keepAlive = null;
  try { source?.stop(); } catch { /* already stopped */ }
  // A context that is mid-mix keeps playing it: suspending only after the
  // keep-alive has gone, and only once nothing has extended the spell since.
  if (context && running(context)) void context.suspend().catch(() => undefined);
}

function extend(): void {
  warmUntil = Date.now() + KEEP_WARM_MS;
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = setTimeout(sleepOutput, KEEP_WARM_MS);
  if (!watchingVisibility && typeof document !== "undefined") {
    watchingVisibility = true;
    // A hidden tab is not being listened to, and a phone in a pocket should
    // not be holding its audio output open for a minute on our behalf.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") sleepOutput();
    });
  }
}

/**
 * Keeps the output awake for another `KEEP_WARM_MS`, without waiting. For a
 * sound that has to start now, which is a feedback tone: it cannot wait for
 * the device, but the word after it can be spared the wait.
 */
export function stayAwake(): void {
  const ctx = outputContext();
  if (!ctx || !running(ctx)) return;
  startKeepAlive(ctx);
  extend();
}

/** What `wakeOutput` found: whether audio can run at all, and how long a cold output still needs. */
export interface Woken {
  readonly running: boolean;
  /** Milliseconds of silence to put in front of the next sound; nought where the output was already awake. */
  readonly coldMs: number;
}

/**
 * Wakes the output, if it can, and says how much head start the next sound
 * needs: nought where it was already awake, `WAKE_MS` where it was cold.
 *
 * IT DOES NOT WAIT, AND THAT IS DELIBERATE. A sound played through an element
 * has to be started inside the press that asked for it, or Safari no longer
 * counts it as the learner's, so sitting out the wake here would trade a lost
 * first letter for a lost word. The head start goes into the sound instead:
 * the element plays at once with that much more silence in front of the word
 * (`withLead` in `lib/audio/wav.ts`), and the mixer schedules its voice that
 * much later on the context it has just woken.
 *
 * Never throws and never refuses: where the browser will not run audio yet,
 * which is the autoplay policy on a page nobody has touched, there is nothing
 * to wake, `running` is false, and the caller's own play meets that policy and
 * reports it as it always has.
 */
export async function wakeOutput(): Promise<Woken> {
  const ctx = outputContext();
  if (!ctx) return { running: false, coldMs: 0 };
  const coldMs = wakeDelayMs({ running: running(ctx) && keepAlive !== null, warmUntil, now: Date.now() });
  if (!running(ctx)) {
    await Promise.race([
      ctx.resume().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, RESUME_MS)),
    ]);
    if (!running(ctx)) return { running: false, coldMs: 0 };
  }
  startKeepAlive(ctx);
  extend();
  return { running: true, coldMs };
}
