import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchClip, playHeard } from "./clip";

/**
 * A REFUSED CLIP'S BODY IS RELEASED, ON EVERY PATH THAT CAN BE REFUSED.
 *
 * Chromium does not finish a fetch whose body nobody reads, so a refusal left
 * unread is a request open for as long as the page is. On 2026-11-06 TartuNLP
 * answered 500 for hours, `/api/tts` passed that on as a 502, and `/learn/new`
 * never went quiet: `scripts/test-mobile.mjs` timed out waiting for it, on a
 * pull request that touched no audio at all. `discard` in `./clip` is the fix
 * (#991, #992); this is what stops it being undone.
 *
 * Each stubbed response carries a body whose `cancel` is counted, so the
 * assertion is about the stream the browser would hold, not about which
 * helper the module happens to call.
 */

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function refusal(status: number, cancelled: string[], name: string): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode(`{"error":"${name}"}`)); },
    cancel() { cancelled.push(name); },
  });
  return new Response(body, { status });
}

describe("a refused clip", () => {
  it("releases the synthesizer's refusal before it rejects", async () => {
    const cancelled: string[] = [];
    globalThis.fetch = vi.fn(async () => refusal(502, cancelled, "synthetic")) as typeof fetch;
    await expect(fetchClip({ text: "tere", voice: "mari" })).rejects.toThrow("502");
    expect(cancelled).toEqual(["synthetic"]);
  });

  it("releases a missing recording before it falls back, and the fallback's refusal after", async () => {
    const cancelled: string[] = [];
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls += 1;
      return calls === 1 ? refusal(404, cancelled, "recording") : refusal(502, cancelled, "synthetic");
    }) as typeof fetch;
    await expect(fetchClip({ text: "Aitäh!", voice: "mari", native: true })).rejects.toThrow("502");
    expect(calls).toBe(2);
    expect(cancelled).toEqual(["recording", "synthetic"]);
  });

  it("releases a recording asked for by id, which has nothing to fall back to", async () => {
    const cancelled: string[] = [];
    globalThis.fetch = vi.fn(async () => refusal(404, cancelled, "recording")) as typeof fetch;
    await expect(fetchClip({ text: "", nativeId: "sound-ae" })).rejects.toThrow("404");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(cancelled).toEqual(["recording"]);
  });

  it("releases a refused read-back of what the recognizer heard", async () => {
    const cancelled: string[] = [];
    globalThis.fetch = vi.fn(async () => refusal(502, cancelled, "read-back")) as typeof fetch;
    await expect(playHeard({ text: "aitäh", voice: "mari" })).rejects.toThrow("502");
    expect(cancelled).toEqual(["read-back"]);
  });
});
