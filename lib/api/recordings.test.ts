import { describe, expect, it } from "vitest";

import { NATIVE_CLIPS, nativeFor, nativeUrl, utteranceKey } from "@/lib/audio/native";

import { RecordingsResponse } from "./contract";
import { recordingsList } from "./recordings";

/*
  A PHONE FINDS A RECORDING BY SPELLING EXACTLY WHERE THE WEB DOES.

  The web's speaker button asks `nativeFor`; a phone reads `key` off this list.
  So the list is held to `nativeFor` for every clip in the catalog, in both
  directions: a clip carries a key only where `nativeFor` answers that clip for
  its own text, and a client looking a text up the way the contract describes
  finds what `nativeFor` finds, slow takes included.
*/
const list = recordingsList();

/** What a phone does with the list: fold the text, take the slow take where asked and there is one. */
function lookUp(text: string, slow: boolean): string | null {
  const key = utteranceKey(text);
  if (!key) return null;
  const keyed = list.clips.filter((c) => c.key === key);
  if (slow) {
    const taken = keyed.find((c) => c.slow);
    if (taken) return taken.id;
  }
  return keyed.find((c) => !c.slow)?.id ?? null;
}

describe("the recordings list", () => {
  it("fits its published schema and holds every clip in the catalog once", () => {
    expect(RecordingsResponse.safeParse(list).success).toBe(true);
    expect(list.clips.map((c) => c.id)).toEqual(NATIVE_CLIPS.map((c) => c.id));
    expect(list.clips.length).toBeGreaterThan(100);
  });

  it("gives a clip a key exactly where nativeFor answers that clip for its own text", () => {
    let keyed = 0;
    for (const clip of NATIVE_CLIPS) {
      const listed = list.clips.find((c) => c.id === clip.id)!;
      const answers = nativeFor(clip.text, { slow: clip.slow === true }) === clip;
      expect(listed.key !== null, clip.id).toBe(answers);
      if (answers) {
        keyed += 1;
        expect(listed.key).toBe(utteranceKey(clip.text));
      }
      expect(listed.src).toBe(nativeUrl(clip.id));
      expect(listed.atOwnSpeed).toBe(true);
    }
    expect(keyed).toBeGreaterThan(50);
  });

  it("finds by spelling what nativeFor finds, for every text in the catalog, at speed and slowly", () => {
    let asked = 0;
    for (const clip of NATIVE_CLIPS) {
      for (const slow of [false, true]) {
        expect(lookUp(clip.text, slow), `${clip.id} slow=${slow}`).toBe(nativeFor(clip.text, { slow })?.id ?? null);
        asked += 1;
      }
    }
    expect(asked).toBe(NATIVE_CLIPS.length * 2);
  });

  it("keeps a sound, a letter's name, linna and a spelling that hides two words out of the lookup", () => {
    const keyOf = (id: string) => list.clips.find((c) => c.id === id)?.key;
    for (const id of ["sound-a", "sound-ou", "letter-ou", "letter-x", "length-linna", "soft-palk", "soft-palk-plain", "soft-tall", "soft-kutsu"]) {
      expect(list.clips.some((c) => c.id === id), id).toBe(true);
      expect(keyOf(id), id).toBeNull();
    }
    expect(list.clips.filter((c) => c.kind === "sound" || c.kind === "letter").every((c) => c.key === null)).toBe(true);
  });
});
