import assert from "node:assert/strict";

import {
  GRADER_MODELS,
  SCENE_FALLBACK_MODEL,
  SCENE_MODELS,
  TUTOR_FALLBACK_MODEL,
  TUTOR_MODEL,
  VISION_MODEL,
} from "../../lib/tutor/provider";
import type { InvariantKit } from "../lib/invariantKit";

export default function envExampleRoutesToPins({ check, read }: InvariantKit) {
  check(".env.example and the README route each job to the models the code pins it to", () => {
    /*
      The routing table in `.env.example` is what an operator reads to learn
      which provider answers Anu, a scene, a scan and a grader, and it said Anu
      answers on Groq with a `TUTOR_MODEL` override, two facts that had both
      stopped being true: she leads on Gemini with Groq behind her, and no
      variable moves either link. An operator who funded Groq alone on the
      strength of it would have bought the backup rather than the tutor. So each
      row has to name every model its purpose is pinned to, read off the
      constants rather than typed here, so a change to a pin fails until the row
      says so too.
    */
    const text = read(".env.example");
    const between = (from: string, to: string): string => {
      const start = text.indexOf(from);
      assert.ok(start >= 0, `.env.example has no "${from}" row in its routing table`);
      const end = text.indexOf(to, start + from.length);
      return text.slice(start, end < 0 ? undefined : end);
    };
    const rows: [string, string, readonly string[]][] = [
      ["Anu", between("Anu (/api/tutor)", "Scene lines"), [TUTOR_MODEL, TUTOR_FALLBACK_MODEL]],
      ["Scene lines", between("Scene lines (/api/scene)", "Scanning ("), [...SCENE_MODELS, SCENE_FALLBACK_MODEL]],
      ["Scanning", between("Scanning (/api/scan)", "The graders"), [VISION_MODEL]],
      ["The graders", between("The graders and the", "\n#\n"), GRADER_MODELS.map((c) => c.model)],
    ];
    const wrong = rows.flatMap(([label, row, models]) =>
      models.filter((m) => !row.includes(m)).map((m) => `${label} does not name ${m}`));
    assert.ok(wrong.length === 0, `.env.example's routing table has drifted from the pins: ${wrong.join("; ")}`);
    /*
      The README's own setup section says the same thing in prose to somebody
      installing for the first time, and it had told them the Groq key "is Anu"
      and that conversations fall to Groq's gpt-oss-120b. So it names the same
      pins: Anu's lead, and every link a conversation composes on.
    */
    const readme = read("README.md");
    const setup = readme.slice(readme.indexOf("## Turning on Anu"), readme.indexOf("## Deploying it"));
    assert.ok(setup.length > 500, "README.md has no setup section between the two headings this reads");
    const paragraph = (opening: string): string => {
      const start = setup.indexOf(opening);
      assert.ok(start >= 0, `README.md's setup section no longer has a paragraph opening "${opening}"`);
      const end = setup.indexOf("\n\n", start);
      return setup.slice(start, end < 0 ? undefined : end);
    };
    const anu = paragraph("That is all three.");
    const scenes = paragraph("**Conversations are pinned to");
    const unnamed = [
      ...[TUTOR_MODEL, TUTOR_FALLBACK_MODEL].filter((m) => !anu.includes(m)).map((m) => `the Anu paragraph does not name ${m}`),
      ...[...SCENE_MODELS, SCENE_FALLBACK_MODEL].filter((m) => !scenes.includes(m)).map((m) => `the conversations paragraph does not name ${m}`),
    ];
    assert.ok(unnamed.length === 0, `README.md has drifted from the pins: ${unnamed.join("; ")}`);
  });
}
