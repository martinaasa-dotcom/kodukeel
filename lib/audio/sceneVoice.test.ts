import { describe, expect, it } from "vitest";
import { hidesLines, SCENE_VOICES, sceneVoiceFrom, sceneVoiceLabel, speaksAloud } from "./sceneVoice";

describe("sceneVoiceFrom", () => {
  it("keeps a stored mode whatever the support setting says", () => {
    expect(sceneVoiceFrom("text", "listen")).toBe("text");
    expect(sceneVoiceFrom("voice", "cold")).toBe("voice");
    expect(sceneVoiceFrom("listen", "guided")).toBe("listen");
  });

  it("reads a missing or unknown row off the support setting", () => {
    expect(sceneVoiceFrom(null, "guided")).toBe("voice");
    expect(sceneVoiceFrom(undefined, "listen")).toBe("listen");
    expect(sceneVoiceFrom("loud", "cold")).toBe("listen");
    expect(sceneVoiceFrom(42, "guided")).toBe("voice");
  });
});

describe("what a mode means", () => {
  it("speaks in both voice modes and never in text", () => {
    expect(speaksAloud("text")).toBe(false);
    expect(speaksAloud("voice")).toBe(true);
    expect(speaksAloud("listen")).toBe(true);
  });

  it("hides the words only when listening", () => {
    expect(hidesLines("text")).toBe(false);
    expect(hidesLines("voice")).toBe(false);
    expect(hidesLines("listen")).toBe(true);
  });

  it("names every mode, once each", () => {
    expect(SCENE_VOICES.map((one) => one.id)).toEqual(["text", "voice", "listen"]);
    for (const one of SCENE_VOICES) expect(sceneVoiceLabel(one.id)).toBe(one.label);
    expect(new Set(SCENE_VOICES.map((one) => one.label)).size).toBe(SCENE_VOICES.length);
  });
});
