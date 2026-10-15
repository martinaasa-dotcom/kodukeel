import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A1 IS WORDS AND A LITTLE GRAMMAR, AND NOBODY THERE IS ASKED TO COMPOSE.
 *
 * Reported off one flash card: "Write a sentence with 'don't go'" over `minema`,
 * a full sentence from nothing on the most irregular verb in the language, in
 * the negative. The `build` shape was the last one a word opened, so a beginner
 * reached it by being right. Asked of the code, because every one of these is
 * a door the fault walked through.
 */
export default function aBeginnerNeverWritesASentence({ check, code }: InvariantKit) {
  check("the flash round's pool drops `build` for a beginner, in both branches", () => {
    const flash = code("lib/games/flash.ts");
    assert.match(flash, /if \(!beginner\) out\.push\("build"\)/, "a beginner is offered `build` beside a recorded sentence");
    assert.match(flash, /return beginner \? \["inflect"\] : \["inflect", "build"\]/, "a beginner is offered `build` where no sentence is recorded");
    assert.match(flash, /mayWriteOwnSentence\(level: Level\)[^}]*maySortWords\(level\)/s, "the boundary stopped being the one ordering words draws");
  });

  check("a beginner is asked a verb in the present and nothing harder", () => {
    const flash = code("lib/games/flash.ts");
    assert.match(flash, /startsWith\("IndPrSg"\) \|\| slot\.slot\.startsWith\("IndPrPl"\)/, "the beginner's verb slots are no longer the present persons");
  });

  check("the flash page reads the level and hands the beginner flag to both the slots and the task", () => {
    const page = code("app/(app)/review/flashcards/page.tsx");
    assert.match(page, /scope \? scope\.programme\.level : await courseLevelFor\(ownerId\)/, "the page stopped reading the level the module or the app holds");
    assert.match(page, /!beginner \|\| beginnerSlot\(source, s\)/, "the page stopped filtering a beginner's slots");
    assert.match(page, /step: word\.verdict\.correct, beginner/, "the page stopped telling flashTask the learner is a beginner");
  });
}
