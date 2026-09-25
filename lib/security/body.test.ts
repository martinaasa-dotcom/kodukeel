import { describe, expect, it } from "vitest";
import { readCapped } from "./body";

function streamed(parts: string[], headers: Record<string, string> = {}): Request {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
  return new Request("https://x.example/hook", { method: "POST", body, headers, duplex: "half" } as RequestInit);
}

describe("readCapped", () => {
  it("reads a body under the ceiling whole, multibyte letters included", async () => {
    expect(await readCapped(streamed(["tere ", "õde"]), 64)).toBe("tere õde");
  });

  it("refuses a declared length over the ceiling without reading it", async () => {
    const request = new Request("https://x.example/hook", {
      method: "POST", body: "x".repeat(10), headers: { "content-length": "999999" },
    });
    expect(await readCapped(request, 64)).toBeNull();
  });

  it("refuses a chunked body that grows past the ceiling, whatever it declared", async () => {
    expect(await readCapped(streamed(["a".repeat(40), "b".repeat(40)]), 64)).toBeNull();
  });

  it("reads a body with none as empty", async () => {
    expect(await readCapped(new Request("https://x.example/hook", { method: "POST" }), 64)).toBe("");
  });
});
