import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LINE PICKED IN A CONVERSATION IS READ LIKE ANY OTHER AND GRADES NOTHING.
 *
 * Picking the right sentence out of three is recognition. The conversation
 * goes on the same way, so the reading has to be the ordinary one, and the
 * review log may not record a recall of a word the learner chose rather than
 * said, since `Review` is the one table that is never repaired. Asked of the
 * code at each door: the route offers the picks, both places that parse a
 * turn carry the flag, and the finish filters a picked beat's grades.
 */
export default function aPickedLineGradesNothing({ check, code }: InvariantKit) {
  check("a beat answered by picking writes no grade", () => {
    const scene = code("lib/progress/scene.ts");
    assert.match(scene, /const pickedBeats = new Set\(input\.turns\.filter\(\(turn\) => turn\.picked\)/, "the finish no longer knows which beats were picked");
    assert.match(scene, /\.filter\(\(grade\) => !pickedBeats\.has\(grade\.beatId\)\)/, "a picked beat's grade reaches the review log");
  });

  check("the flag survives the wire both ways a turn arrives", () => {
    assert.match(code("app/api/scene/route.ts"), /one\.picked === true \? \{ picked: true \} : \{\}/, "the scene route drops the picked flag");
    const actions = code("app/actions.ts");
    assert.equal((actions.match(/row\.picked === true \? \{ picked: true \} : \{\}/g) ?? []).length, 2, "an action that replays a run drops the picked flag");
  });

  check("the route offers the picks off the scene's own dictionary, and the screen sends a pick as a turn", () => {
    assert.match(code("app/api/scene/route.ts"), /picks: isOver\(scene, state\) \? \[\] : picksFor\(scene, standing \?\? current, card, marking\.lexicon\)/, "the route stopped offering picks, or offers them off something other than this run's card");
    const session = code("components/scene/SceneSession.tsx");
    assert.match(session, /onClick=\{\(\) => answer\(pick\.et, true(?:, [^}]*)?\)\}/, "a pick is no longer sent as a picked turn");
    // The switch remembers the learner's last way of answering (VB-4); with nothing remembered, A1 picks.
    assert.match(session, /useState<SceneAnswer>\(\(\) => openingAnswer\(answeredLast, openAt, speechHere\)\)/, "the switch no longer opens on the remembered answer or the band's default");
    assert.match(code("lib/ux/sceneAnswer.ts"), /level === "A1" \? "pick" : "type"/, "picking stopped being the default at A1");
  });
}
