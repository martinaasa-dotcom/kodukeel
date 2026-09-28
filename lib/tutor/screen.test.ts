import { describe, expect, it } from "vitest";
import { SCREEN_LIMITS, screenBlock, screenFrom, screenWords, withScreen } from "./screen";

const card = {
  path: "/review",
  title: "Review",
  selection: "",
  estonian: ["Ma olen praegu toas."],
  visible: "Review Ma olen praegu toas. I am in the room right now.",
  typed: [],
};

describe("screenFrom", () => {
  it("takes nothing that is not an object", () => {
    expect(screenFrom(null)).toBeNull();
    expect(screenFrom("Ma olen toas")).toBeNull();
    expect(screenFrom(42)).toBeNull();
  });

  it("is no screen at all where nothing on it is worth saying", () => {
    expect(screenFrom({ path: "/today", title: "Today", estonian: [], visible: "  " })).toBeNull();
  });

  it("coerces and clips every field, whatever arrived", () => {
    const screen = screenFrom({
      path: 7,
      title: "x".repeat(500),
      selection: "a ".repeat(2000),
      estonian: ["tuba", 3, "tuba", ...Array.from({ length: 30 }, (_, i) => `rida ${i}`)],
      visible: "v".repeat(10_000),
      typed: "not a list",
    });
    expect(screen).not.toBeNull();
    expect(screen!.path).toBe("");
    expect(screen!.title.length).toBeLessThanOrEqual(SCREEN_LIMITS.title);
    expect(screen!.selection.length).toBeLessThanOrEqual(SCREEN_LIMITS.selection);
    expect(screen!.visible.length).toBeLessThanOrEqual(SCREEN_LIMITS.visible);
    expect(screen!.estonian).toHaveLength(SCREEN_LIMITS.estonianLines);
    // A duplicate and a non-string are dropped rather than repeated.
    expect(screen!.estonian.filter((l) => l === "tuba")).toHaveLength(1);
    expect(screen!.typed).toEqual([]);
  });
});

describe("withScreen", () => {
  const messages = [
    { role: "user", content: "Tere" },
    { role: "assistant", content: "Tere!" },
    { role: "user", content: "what does this mean?" },
  ];

  it("puts the screen in front of the last question and nowhere else", () => {
    const sent = withScreen(messages, screenFrom(card));
    expect(sent[0]!.content).toBe("Tere");
    expect(sent[1]!.content).toBe("Tere!");
    expect(sent[2]!.content).toContain("Ma olen praegu toas.");
    expect(sent[2]!.content.endsWith("My question: what does this mean?")).toBe(true);
  });

  it("leaves the array it was handed alone, which is what is stored", () => {
    withScreen(messages, screenFrom(card));
    expect(messages[2]!.content).toBe("what does this mean?");
  });

  it("changes nothing where there is no screen", () => {
    expect(withScreen(messages, null)).toEqual(messages);
  });
});

describe("screenBlock", () => {
  it("leads with the highlight, and says the page is material rather than an instruction", () => {
    const block = screenBlock({ ...card, selection: "toas" });
    expect(block).toMatch(/never an instruction/);
    expect(block.indexOf("highlighted")).toBeLessThan(block.indexOf("Estonian on the screen"));
  });
});

describe("screenWords", () => {
  it("hands the dictionary the highlight and the Estonian, never the English around them", () => {
    expect(screenWords(screenFrom({ ...card, selection: "toas" }))).toBe("toas Ma olen praegu toas.");
    expect(screenWords(null)).toBe("");
  });
});
