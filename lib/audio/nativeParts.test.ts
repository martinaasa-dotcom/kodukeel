import { describe, expect, it } from "vitest";
import { LESSONS } from "@/lib/course/lessons";
import { NATIVE_PARTS, nativeFor, nativePart } from "./native";

describe("the part the native speaker plays in a conversation", () => {
  it("is a man's part and nobody else's", () => {
    for (const lesson of LESSONS) {
      const part = nativePart(lesson.conversation);
      if (part) expect(NATIVE_PARTS.has(part), lesson.id).toBe(true);
    }
    expect(NATIVE_PARTS.has("Mari")).toBe(false);
    expect(NATIVE_PARTS.has("Liis")).toBe(false);
    expect(NATIVE_PARTS.has("Anna")).toBe(false);
  });

  it("is recorded line for line, so the part never changes voice halfway", () => {
    let played = 0;
    for (const lesson of LESSONS) {
      const part = nativePart(lesson.conversation);
      if (!part) continue;
      played++;
      for (const line of lesson.conversation) {
        if (line.who === part && line.et) expect(nativeFor(line.et), `${lesson.id}: ${line.et}`).not.toBeNull();
      }
    }
    // Lessons 1, 2 and 4 to 13 have every line of one man's part recorded.
    expect(played).toBeGreaterThanOrEqual(12);
  });

  it("is one part, the larger, where two men are both recorded", () => {
    const lines = [
      { who: "Jaan", et: "Tom, kas sa elad Tallinnas?" },
      { who: "Tom", et: "Ei, ma ei ela Tallinnas. Ma elan Tartus." },
      { who: "Jaan", et: "Kas sa räägid eesti keelt?" },
      { who: "Tom", et: "Natuke. Ma ei räägi veel hästi." },
      { who: "Tom", et: "Jah, muidugi!" },
    ];
    expect(nativePart(lines)).toBe("Tom");
    expect(nativePart(lines.slice(0, 2))).toBe("Jaan");
  });

  it("is nobody where a man's part has a line he did not record", () => {
    expect(nativePart([{ who: "Tom", et: "Mina olen Tom." }, { who: "Tom", et: "Ma elan Kuul." }])).toBeNull();
    expect(nativePart([{ who: "Mari", et: "See on raamat." }])).toBeNull();
  });
});
