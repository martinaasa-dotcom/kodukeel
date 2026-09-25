import { afterEach, describe, expect, it, vi } from "vitest";
import { writeClipboard } from "./clipboard";

afterEach(() => vi.unstubAllGlobals());

describe("writeClipboard", () => {
  it("says it copied only once the write has resolved", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await writeClipboard("GROQ_API_KEY=x")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("GROQ_API_KEY=x");
  });

  it("answers false rather than throwing where there is no clipboard, which is plain http", async () => {
    vi.stubGlobal("navigator", {});
    expect(await writeClipboard("x")).toBe(false);
  });

  it("answers false where the browser refuses the write", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new DOMException("denied")) } });
    expect(await writeClipboard("x")).toBe(false);
  });
});
