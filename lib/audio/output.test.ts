import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEEP_ALIVE_LEVEL, KEEP_WARM_MS, WAKE_MS, wakeDelayMs } from "./output";
import { decodeWav, encodeWav16, withLead } from "./wav";

/*
  The speaker is awake before the word starts. Reported off the listening
  round as the first and last sound of a word not playing; every link before
  the device was measured intact, so what is held here is the device's half:
  a cold output is given a head start, a warm one is not, and the keep-alive
  that keeps it warm is inaudible and lets go when nobody is listening.
*/

describe("how much head start a sound needs", () => {
  it("gives a cold output time to wake before the word", () => {
    expect(wakeDelayMs({ running: false, warmUntil: 0, now: 1000 })).toBe(WAKE_MS);
    // Running with nothing kept playing through it is the state a phone puts into standby.
    expect(wakeDelayMs({ running: true, warmUntil: 0, now: 1000 })).toBe(WAKE_MS);
    expect(wakeDelayMs({ running: true, warmUntil: 900, now: 1000 })).toBe(WAKE_MS);
  });

  it("gives a warm output none, so a round of words is not slowed down", () => {
    expect(wakeDelayMs({ running: true, warmUntil: 2000, now: 1000 })).toBe(0);
  });

  it("covers the time a sleeping Bluetooth or phone output takes to come up", () => {
    // Waking takes 100 to 400 ms; the clip's own lead is 120 of it.
    expect(WAKE_MS).toBeGreaterThanOrEqual(250);
    expect(WAKE_MS).toBeLessThanOrEqual(500);
  });
});

describe("the head start goes into the clip", () => {
  it("puts exactly that much silence in front and leaves every sample of the word", () => {
    const rate = 22050;
    const word = new Float32Array(rate / 2).map((_, i) => Math.sin(i / 7) * 0.5);
    const led = withLead({ rate, samples: word }, WAKE_MS);
    const extra = Math.round((rate * WAKE_MS) / 1000);
    expect(led.samples.length).toBe(word.length + extra);
    expect(led.samples.subarray(0, extra).every((v) => v === 0)).toBe(true);
    expect(Array.from(led.samples.subarray(extra))).toEqual(Array.from(word));
    // And through the encoder the app plays it with, the word arrives intact.
    const back = decodeWav(encodeWav16(led));
    expect(back.samples.length).toBe(led.samples.length);
  });

  it("is the clip itself where there is no head start to give", () => {
    const pcm = { rate: 22050, samples: new Float32Array([0.1, 0.2]) };
    expect(withLead(pcm, 0)).toBe(pcm);
  });
});

/* A stand-in for the browser's AudioContext, enough to watch what the module asks of it. */
class FakeContext {
  static instances: FakeContext[] = [];
  state: "running" | "suspended" = "suspended";
  sampleRate = 48000;
  /** Whether the browser grants a resume: false is a page nobody has touched yet. */
  static grant = true;
  sources: Array<{ loop: boolean; started: boolean; stopped: boolean; peak: number }> = [];
  constructor() { FakeContext.instances.push(this); }
  async resume() { if (FakeContext.grant) this.state = "running"; }
  async suspend() { this.state = "suspended"; }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data, data };
  }
  get destination() { return {}; }
  createBufferSource() {
    const record = { loop: false, started: false, stopped: false, peak: 0 };
    this.sources.push(record);
    const node = {
      buffer: null as null | { data: Float32Array },
      set loop(v: boolean) { record.loop = v; },
      connect: () => node,
      start: () => {
        record.started = true;
        record.peak = Math.max(...Array.from(node.buffer?.data ?? [0]).map(Math.abs));
      },
      stop: () => { record.stopped = true; },
    };
    return node;
  }
}

describe("keeping the output awake between words", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    FakeContext.instances = [];
    FakeContext.grant = true;
    vi.stubGlobal("window", { AudioContext: FakeContext });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("wakes a cold output, starts an inaudible keep-alive, and spares the next word the wait", async () => {
    const output = await import("./output");
    const first = await output.wakeOutput();
    expect(first).toEqual({ running: true, coldMs: WAKE_MS });
    const ctx = FakeContext.instances[0]!;
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0]).toMatchObject({ loop: true, started: true, stopped: false });
    expect(ctx.sources[0]!.peak).toBeGreaterThan(0);
    expect(ctx.sources[0]!.peak).toBeLessThanOrEqual(KEEP_ALIVE_LEVEL);

    vi.advanceTimersByTime(5000);
    expect(await output.wakeOutput()).toEqual({ running: true, coldMs: 0 });
    // One keep-alive, not one per word.
    expect(ctx.sources).toHaveLength(1);
  });

  it("lets the output sleep once nobody has listened for a while, and wakes it again after", async () => {
    const output = await import("./output");
    await output.wakeOutput();
    const ctx = FakeContext.instances[0]!;
    vi.advanceTimersByTime(KEEP_WARM_MS + 10);
    expect(ctx.sources[0]!.stopped).toBe(true);
    expect(ctx.state).toBe("suspended");
    expect((await output.wakeOutput()).coldMs).toBe(WAKE_MS);
  });

  it("says it cannot run audio where the browser will not start it yet, rather than waiting", async () => {
    const output = await import("./output");
    FakeContext.grant = false;
    const blocked = output.wakeOutput();
    // A resume the browser does not grant is given a beat and then read as the autoplay policy.
    await vi.advanceTimersByTimeAsync(300);
    expect(await blocked).toEqual({ running: false, coldMs: 0 });
  });

  it("a feedback tone keeps the output awake for the word that follows it", async () => {
    const output = await import("./output");
    await output.wakeOutput();
    output.sleepOutput();
    const ctx = FakeContext.instances[0]!;
    ctx.state = "running";
    output.stayAwake();
    expect((await output.wakeOutput()).coldMs).toBe(0);
  });
});
