import { describe, expect, it } from "vitest";

import { SAYINGS } from "@/lib/estonian/sayings";
import { resolveSayings } from "./sayings";

describe("resolveSayings", () => {
  it("reads a sentence the dictionary holds from its row, with the row's id and English", () => {
    const saying = SAYINGS.find((s) => s.id === "minema-katki")!;
    const pin = saying.sentences[0];
    const rows = [{ id: "row-1", examples: JSON.stringify([{ et: pin.et, en: "It broke.", source: "EKILEX" }]) }];
    const [out] = resolveSayings([saying], rows);
    expect(out!.sentences[0]).toMatchObject({ et: pin.et, en: "It broke.", lexemeId: "row-1" });
  });

  it("reads a sentence the dictionary never kept from the checked file, with no row to hang it on", () => {
    const saying = SAYINGS.find((s) => s.id === "minema-metsa")!;
    const [out] = resolveSayings([saying], []);
    expect(out!.sentences[0]!.lexemeId).toBeNull();
    expect(out!.sentences[0]!.en).toBeTruthy();
  });

  it("drops a saying whose sentences are held nowhere", () => {
    const saying = SAYINGS.find((s) => s.id === "minema-katki")!;
    expect(resolveSayings([saying], [])).toEqual([]);
  });
});
