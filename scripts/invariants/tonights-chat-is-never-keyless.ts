import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * TONIGHT'S CHAT IS NEVER OFFERED KEYLESS, AND THE SERVER CHOOSES ITS WORDS
 * (docs/41-fifth-batch.md VB-11, ADR-025 amendment 4).
 *
 * A chat has no lines in the bank, because its beats are built at run time out
 * of the evening's words, so on a deployment with no model it would be the
 * other side saying nothing at all. Every door asks `chatOffered`, which is the
 * scene chain having a link, so `PAID_OFF=scenes` closes it too. And the
 * evening is worked out on the server from the learner's own ticks: the action
 * takes a level and nothing that names a day, or a hand-made request could
 * open a chat about words nobody has taught them. Asked of the code at each
 * door, and of the one function that says what "offered" means.
 */
export default function tonightsChatIsNeverKeyless({ check, code }: InvariantKit) {
  check("offered means the scene chain has a link, and nothing else", () => {
    const chat = code("lib/progress/chat.ts");
    assert.match(chat, /export function chatOffered\(\): boolean \{\s*return sceneProviders\(\)\.length > 0;\s*\}/, "a chat is offered on something other than the scene chain having a link");
    // Never after a lesson, which ends on its own Say it (docs/43-lessons.md, phase P3).
    assert.match(chat, /export function chatFits\([^)]*\): boolean \{\s*return chatOffered\(\) && !day\.lesson && newWordsIn\(day\) >= CHAT_MIN_NEW;/, "the module offers a chat without asking whether a model is there, or after a lesson");
  });

  check("every door asks before it does anything", () => {
    const actions = code("app/actions.ts");
    const begin = /export async function beginChat\(level\?: unknown\) \{([\s\S]*?)\n\}/.exec(actions)?.[1] ?? "";
    assert.ok(begin.length > 0, "beginChat is gone, or takes something other than a level");
    assert.match(begin, /if \(!chatOffered\(\)\) return/, "beginChat opens a run without asking whether a model is there");
    assert.ok(begin.indexOf("chatOffered()") < begin.indexOf("beginRun("), "beginChat asks about the model only after opening the run");
    assert.match(begin, /const evening = await chatDay\(ownerId\);/, "beginChat no longer works the evening out on the server");
    assert.match(code("app/(app)/course/chat/page.tsx"), /if \(!\(await chatAffordable\(ownerId\)\)\) redirect\("\/course"\);/, "the chat page draws without a model, or on a day whose allowance is spent");
    // Affordable is offered AND allowed: a spent day falls to a stage direction on every turn.
    assert.match(code("lib/progress/chat.ts"), /return chatOffered\(\) && \(await wouldAuthorise\(ownerId, "SCENE"\)\);/, "a chat is called affordable without asking the model or the allowance");
    assert.match(begin, /if \(!\(await wouldAuthorise\(ownerId, "SCENE"\)\)\)/, "beginChat opens a run on a day whose allowance is spent");
    assert.match(code("app/(app)/course/page.tsx"), /const talkOver = chatEvening !== null && chatFits\(chatEvening\) && \(await chatAffordable\(ownerId\)\)\s*&& !\(await chattedAbout\(ownerId, chatEvening\.id\)\)\s*&& \(await planChat\(ownerId, programme, chatEvening\)\) !== null;/, "the module offers the chat on something other than chatFits, the day's allowance, a chat not yet had and a plan that opens");
  });

  check("a chat beat's word reaches the gate's giveaway and the composer's brief", () => {
    assert.match(code("lib/scenes/retrieval.ts"), /if \(beat\.elicits\) for \(const form of lexicon\.byLemma\.get\(beat\.elicits\) \?\? \[\]\) out\.add\(form\);/, "the gate's giveaway check cannot see the word a chat beat asks for, so the other side may say it");
    assert.match(code("lib/progress/sceneTurn.ts"), /\.\.\.\(beat\.elicits \? \{ elicit: beat\.elicits \} : \{\}\)/, "the composer is no longer told which word the learner should get to use");
    /*
      And no topic on such a beat: the learner's own last words were the topic,
      so every question the neighbour composed after "Tere." was withheld as off
      the point (docs/41-fifth-batch.md, section 0, 2026-10-17).
    */
    assert.match(code("lib/progress/sceneTurn.ts"), /topic: beat\.elicits \? new Set<string>\(\) : /, "a chat beat's composed line is held to the learner's last words as a topic again");
  });
}
