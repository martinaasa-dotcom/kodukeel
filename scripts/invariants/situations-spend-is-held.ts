import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * WHAT A CONVERSATION COSTS IS DECIDED IN THREE PLACES, AND EACH IS HELD HERE.
 *
 * On 2026-10-02 the Gemini bill was traced to faults that were each silent and
 * each invisible to every test until then: a model past its daily quota was
 * still asked first, and had a cache entry written for it before every
 * refusal; each server instance and each harness process wrote its own copy of
 * the same prompt into Google's cache; and the harnesses spent on the same key
 * with nothing capping or counting them. `docs/21-situations.md` §77 has the
 * figures. A fourth, asking the model only on the turns the bank could not
 * answer, was made and then taken out on 2026-10-03, because the ledger put
 * the whole app at pennies and the turns it saved were the ones where the
 * other side reacts to what the learner said (§77). A fix that a later edit
 * can quietly undo is a fix for one release.
 */
export default function situationsSpendIsHeld({ check, code, ALL }: InvariantKit) {
  check("a model that has said not until later gets no call and no cache entry", () => {
    const cache = code("lib/tutor/geminiCache.ts");
    const guard = cache.indexOf("if (isExhausted(config))");
    const entry = cache.indexOf("await entryFor(config, system)");
    assert.ok(guard > 0 && entry > guard, "geminiCachedReply has to refuse an exhausted model before it makes or finds an entry for it");
    assert.ok((cache.match(/noteRefusal\(/g) ?? []).length >= 2, "a 429 on the cached path is no longer believed for as long as it said");
    const provider = code("lib/tutor/provider.ts");
    assert.ok(/const answering = liveLinks\(chain\)/.test(provider), "openWithFallback walks into a model that is out of quota");
    assert.ok(/status === 429 \|\| error\.status === 402\)\) throw error/.test(provider),
      "a cached-path quota refusal falls to the plain transport on the same link, which is a second refused request");
    assert.ok(code("lib/tutor/grader.ts").includes("liveLinks(chain)"), "the judge and the graders walk into a model that is out of quota");
    assert.ok(code("app/api/scene/route.ts").includes("sceneProviders({ answering: true }).length > 0"),
      "the scene route books a call where every scene model is out, rather than answering from the bank");
  });

  check("a cache entry is tagged with its prompt and adopted before another is written", () => {
    const cache = code("lib/tutor/geminiCache.ts");
    assert.ok(/displayName:\s*cacheTag\(config\.model, system\)/.test(cache),
      "an entry is made without the tag another instance finds it by, so every instance writes its own");
    const adopt = cache.indexOf("await adopt(config, system)");
    const create = cache.indexOf("await create(config, system)");
    assert.ok(adopt > 0 && create > adopt, "a miss writes an entry before asking whether another instance already holds one");
    assert.ok(/singleFlight\(`gemini-cache:/.test(cache), "two turns missing at once each write their own entry");
    /* And a harness's recorded answer is asked for before anything is made, so a replayed turn writes no entry. */
    const recalled = cache.indexOf("record?.get(replayKey)");
    assert.ok(recalled > 0 && recalled < cache.indexOf("await entryFor(config, system)"),
      "a replayed harness turn is looked up only after its cache entry has been paid for");
  });

  check("a replay record is a harness's alone, and no route or module of the app sets one", () => {
    const setters = [...ALL, ...readdirSync("scripts/lib").map((f) => `scripts/lib/${f}`).filter((f) => f.endsWith(".ts"))]
      .filter((f) => /\bsetReplayRecord\(/.test(code(f)) && f !== "lib/tutor/geminiCache.ts" && !/\.test\.ts$/.test(f));
    assert.deepEqual(setters, ["scripts/lib/meter.ts"], `a replay record is set outside the harness meter: ${setters.join(", ")}`);
  });

  check("every script that reaches a paid model installs the meter", () => {
    const reaches = /from "\.\.?\/(?:\.\.\/)?(?:lib\/tutor\/(?:provider|grader|geminiCache|translate)|lib\/sceneDraft)"|generativelanguage\.googleapis\.com|api\.groq\.com|api\.anthropic\.com/;
    const scripts = readdirSync("scripts").filter((f) => /\.ts$/.test(f) && !f.startsWith("_") && f !== "test-invariants.ts");
    const spenders = scripts.filter((f) => reaches.test(code(`scripts/${f}`)));
    assert.ok(spenders.length >= 12, `found only ${spenders.length} scripts that reach a model; the pattern stopped matching`);
    const bare = spenders.filter((f) => !/\binstallMeter\(\{ replay: (?:true|false) \}\)/.test(code(`scripts/${f}`)));
    assert.deepEqual(bare, [], `these reach a paid model with nothing counting or capping what they spend: ${bare.join(", ")}`);
  });

  /*
    A harness buys nothing unless somebody named a number, and every run on a
    machine shares one day. The month's ledger put the app's own learners at
    $0.27 against a key that ran out of ten thousand requests in a day, so the
    default is what decides the bill, and a default of a dollar a run was
    thirteen dollars on the day a session ran thirteen rounds.
  */
  check("a harness buys nothing without a stated budget, and its runs share a day's ceiling", () => {
    const meter = code("scripts/lib/meter.ts");
    assert.ok(/export const DEFAULT_BUDGET_USD = 0;/.test(meter), "a harness run spends by default again; the default budget has to be nothing");
    const day = /export const DEFAULT_DAY_BUDGET_USD = (\d+(?:\.\d+)?);/.exec(meter);
    assert.ok(day && Number(day[1]) > 0 && Number(day[1]) <= 5, "the day ceiling is missing, or set past five dollars");
    const over = /const over = \(\)[^]*?\n  \};/.exec(meter)?.[0] ?? "";
    assert.ok(/spentTodayMicros\(\)/.test(over) && /budgetMicros/.test(over),
      "a call is no longer checked against both the run's budget and the machine's day");
    assert.ok(/appendFileSync\(dayFile/.test(meter), "a paid call is no longer written to the shared day log, so runs stop adding up");
    const critic = code("scripts/critic-scenes.ts");
    assert.ok(!/DEFAULT_BUDGET_USD \*/.test(critic), "the critic scales the default budget up again, so a round with no --budget spends");
  });
}
