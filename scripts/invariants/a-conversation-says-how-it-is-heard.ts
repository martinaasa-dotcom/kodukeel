import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CONVERSATION SAYS HOW IT IS HEARD, AND DOES WHAT IT SAYS.
 *
 * A scene is read, heard and read, or heard alone (lib/audio/sceneVoice.ts),
 * and the choice is drawn twice: on the briefing, where it is made, and in the
 * panel the learner types into, where it is the label saying which of the three
 * this is and the way to change it. A label is only worth having while it is
 * true, so the other half is that "Text only" draws no speaker anywhere in the
 * conversation, and the hidden line in "Voice only" does not read its own words
 * out through the speaker's default label.
 */
const SESSION = "components/scene/SceneSession.tsx";

export default function aConversationSaysHowItIsHeard({ check, code }: InvariantKit) {
  check("a conversation draws its voice mode on the briefing and in the panel the learner types into", () => {
    const src = code(SESSION);
    const drawn = [...src.matchAll(/<SceneVoiceChoice\b([^>]*)\/>/g)].map((m) => m[1] ?? "");
    assert.equal(drawn.length, 2, `${SESSION} draws the voice mode ${drawn.length} times, where the briefing and the panel are two`);
    assert.equal(drawn.filter((props) => /\bcompact\b/.test(props)).length, 1, "exactly one of the two is the compact chips in the conversation");
  });

  check("in text only, no speaker is drawn for either side of a conversation", () => {
    const src = code(SESSION);
    let seen = 0;
    for (const m of src.matchAll(/<Speak\b/g)) {
      seen++;
      const before = src.slice(Math.max(0, (m.index ?? 0) - 700), m.index);
      const gated = /aloud &&\s*(?:spokenEstonian\(line\) &&\s*\(\s*)?$/.test(before)
        || /hidesLines\(voiceMode\)[\s\S]*$/.test(before) && !/\) : \(/.test(before.slice(before.lastIndexOf("hidesLines(voiceMode)")));
      assert.ok(gated, `${SESSION} draws a speaker at offset ${m.index} that the text-only mode does not take away`);
    }
    assert.ok(seen >= 3, `only ${seen} speakers found in ${SESSION}; the sweep is reading the wrong file`);
    assert.match(src, /speak=\{aloud && \{/, "the glossed line's speaker is not gated on the voice mode");
  });

  check("a line whose words are hidden is played by a speaker that does not read them out", () => {
    const src = code(SESSION);
    const branch = src.slice(src.indexOf("hidesLines(voiceMode)"));
    const speaker = /<Speak\b([\s\S]*?)\/>/.exec(branch)?.[1] ?? "";
    // A written label, or the same label put through the translator: either way not the words it hides.
    assert.match(speaker, /\blabel=(?:"[^"]+"|\{t\("[^"]+"\)\})/, "the hidden line's speaker falls back to a label built from the words it is hiding");
    assert.match(speaker, /\binsist\b/, "the hidden line's speaker waits for an autoplay setting the learner was never asked about here");
  });
}
