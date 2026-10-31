import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A SAY IT CARD KEEPS WHAT THE LEARNER DID IN IT ACROSS STEPPING AWAY.
 *
 * Say it unmounts when another step is current, because that is what closes
 * its microphone (`a-hidden-step-holds-no-microphone.ts`). What it had reached
 * is kept by the runner (`SayPlace`), and for a round that meant the card and
 * nothing in it: a retelling typed into the box, the goes of "Again, faster",
 * the fade's round and a question's typed answer were gone after a press on
 * "1. Listen" and back (round-3 audit, M1). Each card is handed what it had
 * done and reports it as it changes (`useKeep`); `sayItKept.test.ts` renders
 * the three B1 cards from a kept state, and this holds the wiring that test
 * cannot reach, since SayIt itself imports the server actions.
 */
const SAY_IT = "app/(app)/course/lessons/[id]/SayIt.tsx";

const CARDS = [
  { component: "SayAlongFade", file: "components/course/SayAlongFade.tsx", field: "fade" },
  { component: "RetellIt", file: "components/course/RetellIt.tsx", field: "retell" },
  { component: "AgainFaster", file: "components/course/AgainFaster.tsx", field: "faster" },
] as const;

/** The opening tag of `name` in `source`, up to its `/>`. */
const tagOf = (source: string, name: string) => new RegExp(`<${name}\\b[\\s\\S]*?\\/>`).exec(source)?.[0] ?? null;

export default function aSayItCardKeepsWhatItDid({ check, code }: InvariantKit) {
  check("a Say it card keeps what the learner did in it across stepping away", () => {
    const sayIt = code(SAY_IT);
    const problems: string[] = [];
    assert.match(sayIt, /onPlace\(\{[^}]*\bkept\b[^}]*\}\)/, "SayIt hands the runner its place without what its cards did (`kept`)");
    assert.match(sayIt, /useState<CardsKept>\(place\?\.kept/, "SayIt does not start from the cards' kept state the runner handed back");
    for (const { component, file, field } of CARDS) {
      const tag = tagOf(sayIt, component);
      if (!tag) { problems.push(`SayIt no longer draws ${component}`); continue; }
      if (!new RegExp(`kept=\\{kept\\.${field}\\}`).test(tag)) problems.push(`SayIt draws ${component} without its kept state`);
      if (!/onKeep=\{/.test(tag)) problems.push(`SayIt draws ${component} with nowhere to report what it did`);
      const card = code(file);
      if (!/useKeep\(/.test(card)) problems.push(`${file} does not report what it did (useKeep)`);
      if (!/useState\([^)]*kept\?\./.test(card)) problems.push(`${file} does not start from what it had kept`);
    }
    const answer = tagOf(sayIt, "AnswerCard");
    if (!answer || !/typed=\{kept\.answers/.test(answer) || !/onType=\{/.test(answer)) problems.push("SayIt draws a question card without the text typed into it before");
    if (!/useState\(typed\)/.test(sayIt)) problems.push("a question card does not start from the text it had kept");
    assert.deepEqual(problems, [], problems.join("\n"));
  });
}
