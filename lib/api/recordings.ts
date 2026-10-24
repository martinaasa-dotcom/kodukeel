import { NATIVE_CLIPS, nativeFor, nativeUrl, utteranceKey, type NativeClip } from "@/lib/audio/native";

import type { RecordingsResponse } from "./contract";

/**
 * THE NATIVE SPEAKER'S CLIPS, AND WHICH SPELLING EACH ONE ANSWERS FOR (N-6).
 *
 * The body of `GET /api/v1/recordings`, built off the catalog the web plays
 * from (`lib/audio/native.ts`) and never a copy of it. A phone's speaker button
 * looks a text up by `key` exactly as the web's looks it up through `nativeFor`
 * (D9): `key` is set on a clip only where `nativeFor` answers that clip for its
 * own text, so a sound, a letter's name, `linna`, and a spelling that hides two
 * words (`palk`, `tall`, `kutsu`) carry none and are played by id alone, which
 * is how the web plays them too. `lib/api/recordings.test.ts` holds this to
 * `nativeFor` for every clip.
 *
 * Pure: the catalog is data, and nothing here reads a file or the network.
 */
function keyOf(clip: NativeClip): string | null {
  return nativeFor(clip.text, { slow: clip.slow === true }) === clip ? utteranceKey(clip.text) : null;
}

export function recordingsList(): RecordingsResponse {
  return {
    clips: NATIVE_CLIPS.map((clip) => ({
      id: clip.id,
      text: clip.text,
      kind: clip.kind,
      src: nativeUrl(clip.id),
      key: keyOf(clip),
      slow: clip.slow === true,
      atOwnSpeed: true,
    })),
  };
}
