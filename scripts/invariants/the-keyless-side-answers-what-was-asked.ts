import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * WITH NO MODEL, THE OTHER SIDE ANSWERS WHAT WAS ASKED AND NOTHING ELSE.
 *
 * Three rules the keyless critic drove, held here because each is one line
 * that would read as harmless to whoever next tidies it.
 *
 * "I DON'T KNOW" ANSWERS A QUESTION ASKING FOR INFORMATION, AND NOTHING ELSE.
 *
 * With no model behind a run, `Ei tea.` was said to every question the scene
 * could not answer, and most of them were yes-or-no questions it does not
 * answer at all: a shop assistant asked whether they sell ice cream, a
 * neighbor asked how long they have lived there. The keyless critic counted it
 * in 47 of 60 conversations. `shrug` takes the whole question now and asks
 * `shrugFits` before it says anything, so a caller holding only the lexicon
 * does not compile, and these hold the rule itself in place: `kas` opens a
 * yes-or-no question and may not join the words that ask for information,
 * and a question naming the person asked is about them.
 *
 * THE PRICE IS SAID WHERE THE QUESTION ASKS IT. A money word anywhere in the
 * turn answered "it cost 21 euros, can I have my money back?" with the price,
 * and released a price held back for a later beat. `priceAsked` reads the
 * question clause, and every place that asks whether the price was asked asks
 * it.
 *
 * A QUESTION ON THE WAY OUT IS ANSWERED AND THE GOODBYE WAITS. The net said
 * the answer and `Head aega!` in one breath, which the critic counted as the
 * commonest premature end; and never two goodbyes in one breath.
 *
 * AND NOTHING IS MET FROM A DISTANCE THAT THE OTHER SIDE HAS NOT YET SAID. A
 * beat that explains, refuses or corrects waits for its own line, or the
 * pharmacist never says how to take the medicine.
 */
export default function theKeylessSideAnswersWhatWasAsked({ check, code }: InvariantKit) {
  check("the keyless shrug asks whether it answers the question before it is said", () => {
    const aside = code("lib/scenes/aside.ts");
    assert.match(aside, /export function shrug\(input: AsideInput\)/, "the shrug takes the lexicon again rather than the question it answers");
    assert.match(aside, /export function shrug\(input: AsideInput\)[^{]*\{\s*if \(!shrugFits\(input\)\) return null;/,
      "the shrug no longer asks shrugFits first, so `Ei tea.` answers a yes-or-no question again");
    const information = /const INFORMATION = \[([^\]]*)\]/.exec(aside);
    assert.ok(information, "the list of question words that ask for information was not found; the pattern stopped matching");
    for (const polar of ["kas", "kui", "palju"]) {
      assert.ok(!information[1]!.includes(`"${polar}"`), `\`${polar}\` joined the words that ask for information, so the shrug answers what it does not answer`);
    }
    assert.match(aside, /if \(spoken\.some\(\(word\) => you\.has\(word\) \|\| addressed\.has\(word\)\)\) return false;/,
      "a question about the person asked is shrugged at again");
  });

  check("the keyless price answer and the held-back price both ask whether the question asks the price", () => {
    const aside = code("lib/scenes/aside.ts");
    assert.match(aside, /const priceQuestion = input\.said !== undefined \? priceAsked\(input\.said, lexicon\)/,
      "asideFor reads a money word anywhere in the turn again rather than the question clause");
    assert.match(aside, /priceOffCard\(card, lexicon, priceQuestion, input\.already\)/,
      "the figure is read from the whole turn again, so a price the learner stated is taken for one they are checking");
    // The reply is assembled once, for the route and every harness (`lib/progress/sceneTurn.ts`).
    for (const file of ["lib/progress/sceneTurn.ts"]) {
      assert.match(code(file), /money: askedNow !== null && priceAsked\(last\?\.said \?\? "", context\.lexicon\) !== null/,
        `${file} releases a held-back price on a money word anywhere in the turn`);
    }
  });

  check("a question on the way out is answered and the goodbye waits, and never two goodbyes in one breath", () => {
    const reply = code("lib/scenes/reply.ts");
    assert.match(reply, /if \(beat\.move === "close" && aside\) return out;/,
      "the closing beat says the goodbye straight after answering a question again");
    assert.match(reply, /&& !\(last !== undefined && isFarewell\(last, answered\)\)/,
      "two goodbyes in different words can be said in one breath again");
  });

  check("a beat that explains, refuses or corrects is never met from a distance before its line is said", () => {
    const scene = code("lib/progress/scene.ts");
    assert.match(scene, /const SAYS_FIRST: ReadonlySet<BeatSpec\["move"\]> = new Set\(\["instruct", "refuse", "correct"\]\)/,
      "the moves whose line has to be heard first are no longer the three that say something");
    assert.match(scene, /if \(SAYS_FIRST\.has\(other\.move\) && at > state\.beat\) continue;/,
      "the look-ahead credits a beat the other side has not yet said again");
  });
}
