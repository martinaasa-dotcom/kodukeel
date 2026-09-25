import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TUTOR_FALLBACK_MODEL,
  billedOutput, completeWithImage, FREE_GEMINI_MODELS, FREE_GROQ_MODELS, GRADER_MODELS,
  openWithFallback, PROVIDER_KEY_ENV, providerResilience, resolveProviders,
  SCENE_FALLBACK_MODEL, SCENE_MODELS, sceneProviders, TUTOR_MODEL, TutorError,
  visionProviders, VISION_MODEL,
} from "@/lib/tutor/provider";
import { priceFor, UNKNOWN_MODEL } from "@/lib/usage/pricing";

/*
  EVERY CASE STARTS ON A MACHINE WITH NO KEYS, WHATEVER MACHINE IT IS ON.

  A test here describes a chain, so it has to state the whole environment the
  chain is read from. It did not: each case stubbed the keys it cared about
  and inherited the rest from whoever was running it. CI carries no provider
  keys, so it passed; a developer machine with `GROQ_API_KEY` exported failed
  thirteen of these, and the failures read as chain bugs rather than as the
  suite reporting its own host.

  Clearing `PROVIDER_KEY_ENV` here fixes both halves at once. A case that
  names a key still names it, and a case that forgets one now inherits an
  empty string rather than somebody's real credential, which is also the only
  version of this file that is safe to run with a `.env` loaded.
*/
beforeEach(() => {
  for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** A server-sent event stream carrying one OpenAI-shaped text delta. */
function sse(text: string): Response {
  const body = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
  return new Response(body, { status: 200 });
}

/** A server-sent event stream carrying whatever frames a case needs, in order. */
function sseFrames(...frames: unknown[]): Response {
  const body = frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join("");
  return new Response(body, { status: 200 });
}

/**
 * Exactly one provider configured, whichever the case is about.
 *
 * Driven off `PROVIDER_KEY_ENV`, which is exported by the module that reads
 * those keys, rather than a list retyped here. That is the whole fix and not a
 * tidying: the fault was a list in this file falling behind the chain, so a
 * second copy of the list living here is the same fault waiting to happen. A
 * provider added to `resolveProviders` is now three lines from the list that
 * has to name it.
 *
 * Two sessions fixed this within the hour and the other one kept its list in
 * this file. Its sentence is worth keeping though, because it is the rule:
 * a test whose answer depends on the machine is not a test.
 */
function only(name: "groq" | "gemini" | "anthropic" | "openai") {
  const wanted = `${name.toUpperCase()}_API_KEY`;
  for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, key === wanted ? "k" : "");
}

/*
  A chain that looks redundant and is not.

  Groq contributes one link per free model, so the chain can be three long and
  still be a single account with a single allowance. When one account's balance
  ran out on the live deployment every link behind it answered 402 within the
  same second and the tutor went down, which is the exact failure a fallback is
  supposed to absorb. Settings now says so, and this is what keeps that warning
  honest.
*/
/*
  A second provider that does not need a credit card.

  The availability lesson from the live deployment was that one account is one
  point of failure however many models hang off it. The fix cannot be "add a
  paid key" for somebody running this for free, so Groq and Gemini are both in
  the chain: both hand out a real free tier with no card, both speak the OpenAI
  wire format, and neither shares a balance with the other.
*/
/*
  THE SPLIT, AND THE ONE THING THAT WOULD UNDO IT SILENTLY.

  Routing by purpose is only worth anything if a purpose's chain cannot pick up
  a provider that was configured for the other job. Nothing would fail if it
  did: the answer still arrives, the header still names whoever wrote it, and
  the only symptom is Anu's question answered by a model chosen for fourteen-word
  sentences, or every scene line billed at Sonnet's rate against a $5 balance.

  So the cases below set *every* key rather than only the one they are about.
  That is the opposite of `only()` next door and it is deliberate: `only()` asks
  what a chain does with one provider, and the question here is what it does
  when four others are sitting right there. A purpose that read the general
  chain would pass a test that stubbed one key and fail this.
*/
describe("a chain built for a purpose", () => {
  /** Every provider configured at once, which is the state the split is for. */
  function all() {
    for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, "k");
  }

  it("sends scene composition to Gemini, and to the model the eval ranked", () => {
    all();
    const chain = resolveProviders({ purpose: "scene" });
    // Gemini leads, on the model `eval:thinking` ranked over twenty-four beats.
    // Groq is a fixed second link behind it, covered by its own cases below;
    // what sits behind both is the bounded last resort.
    expect(chain[0]?.name).toBe("gemini");
    expect(chain[0]?.model).toBe(SCENE_MODELS[0]);
  });

  it("sends Anu to the model the wide eval ranked, with Groq behind it on the model she ran on before", () => {
    all();
    const chain = resolveProviders({ purpose: "tutor" });
    expect(chain.map((c) => c.name)).toEqual(["gemini", "groq"]);
    expect(chain[0]?.model).toBe(TUTOR_MODEL);
    expect(chain[1]?.model).toBe(TUTOR_FALLBACK_MODEL);
    // Pinned: no variable moves either link.
    vi.stubEnv("TUTOR_MODEL", "some/other-model");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.5-flash");
    expect(resolveProviders({ purpose: "tutor" }).map((c) => c.model)).toEqual([TUTOR_MODEL, TUTOR_FALLBACK_MODEL]);
  });

  it("sends the graders to the two models that never failed to return a verdict, cheapest first", () => {
    /*
      `npm run eval:grader`, 2026-09-12: `gemini-3.1-flash-lite` and
      `openai/gpt-oss-120b` were the only candidates at 36 of 36 verdicts,
      and the first at about half the price. Both are pinned; nothing in the
      environment moves them, and each link needs only its own key.
    */
    all();
    vi.stubEnv("GEMINI_MODEL", "gemini-3.5-flash");
    vi.stubEnv("GROQ_MODEL", "qwen/qwen3.8-27b");
    const chain = resolveProviders({ purpose: "grader", allowFallback: false });
    expect(chain.map((c) => `${c.name}:${c.model}`)).toEqual([
      "gemini:gemini-3.1-flash-lite", "groq:openai/gpt-oss-120b",
    ]);
    expect(chain).toEqual(GRADER_MODELS);

    only("groq");
    expect(resolveProviders({ purpose: "grader" }).map((c) => c.model)).toEqual(["openai/gpt-oss-120b"]);
    only("gemini");
    expect(resolveProviders({ purpose: "grader" }).map((c) => c.model)).toEqual(["gemini-3.1-flash-lite"]);
  });

  it("lets neither purpose take the other's provider as its primary", () => {
    /*
      This used to assert that neither could reach the other at all, which was
      true while there was no fallback anywhere. There is one now, bounded by
      its own daily budget, so the claim that survives is the one that was doing
      the work: a purpose's *first* choice is its own provider, and Anu has no
      Groq behind her at any budget.
    */
    all();
    expect(resolveProviders({ purpose: "scene" })[0]?.name).toBe("gemini");
    expect(resolveProviders({ purpose: "tutor" })[0]?.name).toBe("gemini");
    // Anu has no bounded Anthropic tail at any budget: Groq is her one fixed backup.
    expect(resolveProviders({ purpose: "tutor" }).some((c) => c.name === "anthropic")).toBe(false);
  });

  it("gives a purpose only the provider it names, and never the general chain", () => {
    /*
      THIS USED TO NAME THE VENDORS AND THAT WAS THE WRONG SHAPE FOR IT.

      It read "keeps the free providers out of both", on the argument that
      those are the free chain's defaults, so they are the providers most
      likely to be left set on a machine that has since moved to paid keys, and
      a purpose that quietly inherited one would look exactly like a purpose
      that was working.

      The argument is right and it is an argument about *inheriting*, not about
      a vendor. Measured over twenty-four beats, Gemini writes the best Estonian
      of anything tested for a scene line and the scanner reads 144 of 144
      diacritics with it, so a rule phrased as "this vendor is unreachable by
      construction" now protects the app from the thing it wants.

      What survives is the claim that was doing the work: a purpose reaches
      exactly the providers it names, and nothing arrives because it happened
      to be configured. `resolveProviders()` with no purpose is a long chain;
      a purpose is its own fixed links plus its bounded fallback. Tutor names
      two links, Gemini then Groq, both fixed and with no bounded last resort
      at any budget; scene names the same two, both fixed rather than
      bounded, plus the one bounded last resort.
    */
    all();
    const general = resolveProviders().map((c) => c.name);
    expect(general.length).toBeGreaterThan(3);

    const tutorNamed = resolveProviders({ purpose: "tutor", allowFallback: false }).map((c) => c.name);
    expect(tutorNamed).toEqual(["gemini", "groq"]);
    const tutorWithFallback = resolveProviders({ purpose: "tutor", allowFallback: true });
    expect(tutorWithFallback).toHaveLength(2);

    const sceneNamed = resolveProviders({ purpose: "scene", allowFallback: false }).map((c) => c.name);
    // Two Gemini links, one per entry of `SCENE_MODELS`, then the Groq link.
    expect(sceneNamed).toEqual(["gemini", "gemini", "groq"]);
    const sceneWithFallback = resolveProviders({ purpose: "scene", allowFallback: true });
    expect(sceneWithFallback.map((c) => c.name)).toEqual(["gemini", "gemini", "groq", "anthropic"]);
  });

  it("falls to scripted on its own provider's absence, independently", () => {
    /*
      ITEM FIVE OF THE SPLIT: one balance running out may not take the other
      feature down. An empty chain is what both routes read as "no model", and
      each of them has somewhere to go — Anu says she is not set up, a scene
      plays off its recorded and banked lines.
    */
    only("gemini");
    expect(resolveProviders({ purpose: "scene" })).not.toHaveLength(0);
    // A Gemini-only deployment has a tutor on the primary and nothing behind it.
    expect(resolveProviders({ purpose: "tutor" }).map((c) => c.name)).toEqual(["gemini"]);

    only("groq");
    expect(resolveProviders({ purpose: "tutor" })).not.toHaveLength(0);
    /*
      A scene on a Groq-only deployment composes on Groq directly now, since
      `SCENE_FALLBACK_MODEL` is a fixed link rather than the bounded last
      resort: it does not depend on `allowFallback` and never touches the
      Anthropic budget. That is why a one-key install still works at all.
    */
    const groqOnlyScene = resolveProviders({ purpose: "scene", allowFallback: false });
    expect(groqOnlyScene.map((c) => c.name)).toEqual(["groq"]);
    expect(groqOnlyScene[0]?.model).toBe(SCENE_FALLBACK_MODEL);
  });

  it("puts Anthropic behind a purpose's own providers, once, as a last resort", () => {
    all();
    const scene = resolveProviders({ purpose: "scene", allowFallback: true });
    expect(scene.map((c) => c.name)).toEqual(["gemini", "gemini", "groq", "anthropic"]);
    // Gemini still leads, on both of its models in order, Groq is the fixed
    // link behind them, and the bounded fallback sits behind all three rather
    // than instead of any of them.
    expect(scene.slice(0, SCENE_MODELS.length).map((c) => c.model)).toEqual([...SCENE_MODELS]);
    expect(scene[SCENE_MODELS.length]?.model).toBe(SCENE_FALLBACK_MODEL);
  });

  it("drops the fallback the moment the day's fallback budget is spent", () => {
    /*
      What the ledger's `fallbackAllowed` buys. Past the budget the chain is
      the purpose's own providers again -- Gemini and its fixed Groq backup,
      neither of which is the thing being gated -- so a Gemini that is not
      answering falls to Groq rather than to the bounded Anthropic tail, and
      only a Groq that is not answering either sends the ladder to its
      recorded and banked lines, which is where a keyless deployment already
      lives.
    */
    all();
    const scene = resolveProviders({ purpose: "scene", allowFallback: false });
    expect(scene.map((c) => c.name)).toEqual(["gemini", "gemini", "groq"]);
    // The general chain's dear tail is a fallback too, and goes the same way.
    expect(resolveProviders({ allowFallback: false }).some((c) => c.name === "anthropic")).toBe(false);
    expect(resolveProviders({ allowFallback: false }).some((c) => c.name === "openai")).toBe(false);
  });

  it("never gives Anu a fallback, however much budget there is", () => {
    /*
      AND WHICH PROVIDER IS HER PRIMARY IS NOT WHAT THIS CASE IS ABOUT.

      It used to read "Anthropic is her primary, so the only thing behind it
      would be Groq", and cited what an older measurement found a free Groq
      model doing with her questions: the tuba : toa gradation called "b becomes
      v" where the dictionary says b : ∅, "Mul meeldib" for "Mulle meeldib", and
      the invented lemmas `lähema` and `kotta`. That is still the reason she has
      no fallback, and it was never a reason about a vendor: an answer that is
      wrong in a way the learner cannot see is worse than no answer, whoever
      wrote it, so there is nothing worth falling to.

      `npm run eval:anu` now asks thirty-seven questions through the route's
      own transport, and her chain is the two links that eval measured,
      `gemini-3.1-flash-lite` and then `openai/gpt-oss-120b` behind it. The
      rule underneath is unchanged: only measured models, and nothing behind
      them.
    */
    all();
    expect(resolveProviders({ purpose: "tutor", allowFallback: true }).map((c) => c.name))
      .toEqual(["gemini", "groq"]);
  });

  it("defaults to allowing the fallback, so a caller that has not asked is unchanged", () => {
    all();
    expect(resolveProviders({ purpose: "scene" }).map((c) => c.name)).toEqual(["gemini", "gemini", "groq", "anthropic"]);
  });

  it("keeps the scene chain isolated, and lets no override put another provider in front", () => {
    /*
      Two sessions built this chain: one added a per-provider `*_SCENE_MODEL`
      override that moved a named provider to the front, the other the purpose
      chain that stops a scene spending the balance Anu runs on. The override
      went when the operator pinned the model, since a second variable that can
      move conversations is the door the `SCENE_MODEL` fault came through, one
      name over. What this asserts is what is left: Gemini on the pinned model
      leads, Groq on its own pinned model is the fixed second link, Anthropic
      sits behind both only as the gated last resort, and naming another
      model for any of the three changes nothing.
    */
    all();
    expect(sceneProviders().map((c) => c.name)).toEqual(["gemini", "gemini", "groq", "anthropic"]);
    expect(sceneProviders({ allowFallback: false }).map((c) => c.name)).toEqual(["gemini", "gemini", "groq"]);

    vi.stubEnv("GROQ_SCENE_MODEL", "some/scene-model");
    vi.stubEnv("ANTHROPIC_SCENE_MODEL", "claude-sonnet-5");
    expect(sceneProviders({ allowFallback: false }).map((c) => c.name)).toEqual(["gemini", "gemini", "groq"]);
    expect(sceneProviders()[0]).toMatchObject({ name: "gemini", model: SCENE_MODELS[0] });
    // And the pinned Groq model does not move either, whatever `GROQ_SCENE_MODEL` says.
    expect(sceneProviders().find((c) => c.name === "groq")).toMatchObject({ model: SCENE_FALLBACK_MODEL });
  });

  it("gives a deployment with no keys an empty chain for both, as it always did", () => {
    expect(resolveProviders({ purpose: "tutor" })).toEqual([]);
    expect(resolveProviders({ purpose: "scene" })).toEqual([]);
    expect(resolveProviders()).toEqual([]);
  });

  it("leaves the general chain alone, because twenty callers still read it", () => {
    all();
    // `providerResilience`, the Settings panel, the recipients list and every
    // "is a model configured at all" read take this one, and none of them is
    // choosing where to send anything.
    const names = new Set(resolveProviders().map((c) => c.name));
    expect(names).toEqual(new Set(["groq", "gemini", "anthropic", "openai"]));
  });

  it("composes scenes on the pinned model whatever the environment says", () => {
    /*
      THE PRODUCTION FAULT, VERBATIM. Scenes ran on Groq and `SCENE_MODEL` was
      `qwen/qwen3.8-27b`; the chain moved to Gemini, went on reading the same
      variable, and Google answered 404 on every composed turn for a week. The
      ladder fell to the bank, the route answered 200, and the learner reported
      a conversation that could not leave its script. The operator's answer was
      to pin it: scenes always compose on `SCENE_MODELS`, and neither the old
      variable nor the general chain's model nor a per-provider override can
      move them.
    */
    only("gemini");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.5-flash");
    vi.stubEnv("SCENE_MODEL", "qwen/qwen3.8-27b");
    vi.stubEnv("GEMINI_SCENE_MODEL", "gemini-3.5-flash-lite");
    expect(resolveProviders({ purpose: "scene" }).map((c) => c.model)).toEqual([...SCENE_MODELS]);
    expect(sceneProviders().map((c) => c.model)).toEqual([...SCENE_MODELS]);
    expect(SCENE_MODELS).toEqual(["gemini-3.8-flash", "gemini-3.1-flash-lite"]);
  });

  it("prices the scene model as a paid model, because the account is paid", () => {
    /*
      THE ROW THAT WOULD SWITCH THE SPEND CAP OFF. `qwen3.8-27b` was priced at
      zero with the rest of Groq's free tier, which was true of a free account
      and is not true of this one. Left at zero it is the global cap disabled
      for the highest-volume path in the app: scene composition would have been
      unbounded and `AI_DAILY_USD_GLOBAL` would never have known.
    */
    for (const model of SCENE_MODELS) {
      const price = priceFor(model);
      expect(price.inputPerMTok).toBeGreaterThan(0);
      expect(price.outputPerMTok).toBeGreaterThan(0);
      // And not the punitive unknown rate, which would bind forty times too early
      // and break the feature to protect a bill that was never at risk.
      expect(price.inputPerMTok).toBeLessThan(UNKNOWN_MODEL.inputPerMTok);
    }
  });
});

describe("the free providers", () => {
  it("leads with Groq, then Gemini's free tier, then the dear ones", () => {
    /*
      THIS ASKED FOR "EVERY FREE PROVIDER AHEAD OF EVERY PAID ONE", which was
      the policy when the only way to run this without a card was a gateway's
      free models.

      Groq at $0.29/$0.59 per MTok is a fortieth of the dearest link here, and a
      free model is rate-limited hard upstream by design, so preferring one over
      Groq buys a 429 to save a hundredth of a cent: it spends the learner's
      wait to save the operator nothing. The paid tail is still last, which is
      the half of the old rule that was doing real work.
    */
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const order: string[] = [];
    for (const { name } of resolveProviders()) if (order[order.length - 1] !== name) order.push(name);
    expect(order).toEqual(["groq", "gemini", "anthropic", "openai"]);
  });

  it("leads with Groq on the two keys this app is actually run with", () => {
    /*
      The install the ordering is for: no free alternative behind either of
      them, so what the order decides is which of two paid providers the
      grader, the translation and the scanner reach first. Groq is the cheap
      one by a factor of forty, and Anthropic's balance is what Anu depends on.
    */
    for (const key of PROVIDER_KEY_ENV) {
      vi.stubEnv(key, key === "GROQ_API_KEY" || key === "ANTHROPIC_API_KEY" ? "k" : "");
    }
    const order: string[] = [];
    for (const { name } of resolveProviders()) if (order[order.length - 1] !== name) order.push(name);
    expect(order).toEqual(["groq", "anthropic"]);
  });

  it("counts a free second provider as real redundancy", () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    // The whole point: no card, and the warning goes away because it should.
    expect(providerResilience().singlePointOfFailure).toBe(false);
  });

  it("offers more than one model per free provider, so a retired name is survivable", () => {
    // A model that no longer exists is walkable within a provider and fatal if
    // it is that provider's only link.
    expect(FREE_GROQ_MODELS.length).toBeGreaterThan(1);
    expect(FREE_GEMINI_MODELS.length).toBeGreaterThan(1);
  });

  it("never charges the unknown rate for a model on one of these lists", async () => {
    /*
      THIS ASKED FOR ZERO AND CAN NO LONGER, WHICH IS THE POINT OF THE ROW IT
      BROKE ON.

      The claim it was written for is that a listed model must not meet
      `UNKNOWN_MODEL`, because the dearest rate in the table charged against a
      handful of genuinely free calls reads as several dollars and switches the
      tutor off for everybody. That claim is unchanged and is what is asserted
      below.

      What changed is that "on the free list" stopped implying "costs nothing".
      `qwen/qwen3.8-27b` is the scene composer's model on a paid Groq plan
      (`SCENE_MODELS`), and it stays on this list because `eval:composers`
      reads it to decide what to rank and a free-tier deployment's general chain
      still wants the link. Its price row is the real one now: pricing a paid
      model at zero is the global spend cap switched off for the busiest path in
      the app, which is the larger of the two failures by a distance.

      So the assertion is the bound rather than the number. A model that is
      actually free still measures zero and is covered by that bound.
    */
    const { priceFor, UNKNOWN_MODEL } = await import("@/lib/usage/pricing");
    for (const model of [...FREE_GROQ_MODELS, ...FREE_GEMINI_MODELS]) {
      const price = priceFor(model);
      expect(price.inputPerMTok, `${model} is priced at the unknown rate`)
        .toBeLessThan(UNKNOWN_MODEL.inputPerMTok);
      expect(price.outputPerMTok, `${model} is priced at the unknown rate`)
        .toBeLessThan(UNKNOWN_MODEL.outputPerMTok);
    }
  });

  it("still charges the dearest rate for a model nobody listed", async () => {
    const { priceFor, UNKNOWN_MODEL } = await import("@/lib/usage/pricing");
    // Pinning some other model on an upgraded account must keep failing closed.
    expect(priceFor("groq/some-paid-model-we-never-heard-of")).toEqual(UNKNOWN_MODEL);
  });

  it("sends each provider to its own endpoint with its own key", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    const calls: { url: string; auth: string; body: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({
        url: String(url),
        auth: String((init.headers as Record<string, string>).authorization),
        body: String(init.body),
      });
      return sse("tere");
    });
    const chain = resolveProviders();
    await openWithFallback([chain[0]!], "system", [{ role: "user", content: "hi" }]);
    expect(calls[0]?.url).toContain("api.groq.com");
    expect(calls[0]?.auth).toBe("Bearer groq-key");
  });

  it("asks Gemini for the usage frame it now sends, and reads the thinking off its total", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    let body = "";
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      body = String(init.body);
      /*
        The shape Google's OpenAI layer streamed on 2026-09-14: a usage object
        on every chunk, a `completion_tokens` that is the line alone, and a
        `total_tokens` that is the prompt, the line and the thinking the model
        did before it. The thinking is billed as output and appears nowhere
        else, so a reader taking `completion_tokens` books a nineteen-token
        line and pays for 1,166.
      */
      return sseFrames(
        { choices: [{ delta: { content: "tere" } }], usage: { prompt_tokens: 2017, completion_tokens: 4, total_tokens: 2500 } },
        { choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 2017, completion_tokens: 19, total_tokens: 3183 } },
      );
    });
    const chain = resolveProviders();
    const seen: { input: number; output: number }[] = [];
    const open = await openWithFallback(
      [chain[0]!], "system", [{ role: "user", content: "hi" }],
      (usage) => seen.push({ input: usage.inputTokens, output: usage.outputTokens }),
    );
    for await (const _ of open.chunks) { /* drain */ }
    /*
      `stream_options` used to be withheld from Gemini because its OpenAI layer
      did not document the field and an unknown field there is a 400; it
      accepts it now, and without the frame the ledger estimated every
      streamed Gemini call from characters, which can never see the thinking.
    */
    expect(body).toContain("stream_options");
    expect(body).toContain(FREE_GEMINI_MODELS[0]);
    expect(seen).toEqual([{ input: 2017, output: 1166 }]);
  });

  it("tells a scene link on Gemini not to think, and no other link", async () => {
    /*
      `gemini-3.8-flash` thinks by default and the thinking is most of a scene
      line's bill (`ProviderConfig.reasoning`); `npm run eval:thinking` put
      thinking on and off at 24 of 24 beats each. The tutor and grader chains
      carry no such field, because a Groq reasoning model refuses "none" and
      Anu's answers were measured with the model thinking: "low" was measured
      too and left unused, at 4 of 30 facts missed against 2 (the field's own
      comment has the figures).
    */
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    const scene = resolveProviders({ purpose: "scene", allowFallback: false });
    expect(scene.filter((c) => c.name === "gemini").map((c) => c.reasoning)).toEqual(["none", "none"]);
    expect(scene.filter((c) => c.name !== "gemini").every((c) => c.reasoning === undefined)).toBe(true);
    // Anu's Gemini link is measured thinking off; her Groq link and the graders carry nothing.
    expect(resolveProviders({ purpose: "tutor" }).map((c) => c.reasoning)).toEqual(["none", undefined]);
    expect(resolveProviders({ purpose: "grader" }).every((c) => c.reasoning === undefined)).toBe(true);

    let body = "";
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      body = String(init.body);
      return sse("tere");
    });
    await openWithFallback([scene[0]!], "system", [{ role: "user", content: "hi" }]);
    expect(JSON.parse(body).reasoning_effort).toBe("none");

    body = "";
    await openWithFallback([resolveProviders({ purpose: "tutor" })[1]!], "system", [{ role: "user", content: "hi" }]);
    expect(body).not.toContain("reasoning_effort");
  });

  it("reads billed output as the larger of the completion count and the hidden total", () => {
    expect(billedOutput({ prompt_tokens: 2017, completion_tokens: 19, total_tokens: 3183 })).toBe(1166);
    // Groq and OpenAI: reasoning is inside `completion_tokens` and the total adds up.
    expect(billedOutput({ prompt_tokens: 100, completion_tokens: 380, total_tokens: 480 })).toBe(380);
    expect(billedOutput({ prompt_tokens: 100, completion_tokens: 40 })).toBe(40);
    expect(billedOutput({ prompt_tokens: 100, total_tokens: 140 })).toBe(40);
    expect(billedOutput({})).toBeUndefined();
  });

  it("bills a scanned page for the thinking Gemini hides from its completion count", async () => {
    /*
      The scanner is the one non-streamed OpenAI-compatible read and it took
      `completion_tokens` as the whole of the output, which is the fault
      `billedOutput` was written for on the chat path. `VISION_MODEL` is a
      Gemini link and carries no `reasoning: "none"`, so whatever it thinks
      arrives only in `total_tokens`, and the ledger booked the page at the
      length of its JSON.
    */
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({
      choices: [{ message: { content: "{\"words\":[]}" } }],
      usage: { prompt_tokens: 1000, completion_tokens: 30, total_tokens: 1900 },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const reply = await completeWithImage(
      [{ name: "gemini", model: "gemini-3.1-flash-lite", label: "Google Gemini" }],
      "system", "read it", { mediaType: "image/png", base64: "AAAA" },
    );
    expect(reply.usage).toMatchObject({ inputTokens: 1000, outputTokens: 900, measured: true });
  });
});

describe("how many things can actually answer", () => {
  it("counts one provider as one, however many models it offers", () => {
    only("groq");
    const state = providerResilience();
    expect(state.providers).toEqual(["Groq"]);
    expect(state.models).toBeGreaterThan(1);
    expect(state.singlePointOfFailure).toBe(true);
  });

  it("stops warning once a second provider is configured", () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "");
    const state = providerResilience();
    expect(state.providers).toEqual(["Groq", "Anthropic"]);
    expect(state.singlePointOfFailure).toBe(false);
  });

  it("does not call an unconfigured app a single point of failure", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    // Nothing configured is a different message, shown elsewhere.
    expect(providerResilience().singlePointOfFailure).toBe(false);
  });
});

describe("the chain", () => {
  it("is empty with no key at all, so nothing above it has to guess", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(resolveProviders()).toEqual([]);
  });

  it("puts the free provider first, so a paid key is the fallback and not the default", () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const seen: string[] = [];
    for (const { name } of resolveProviders()) if (seen[seen.length - 1] !== name) seen.push(name);
    expect(seen).toEqual(["groq", "anthropic", "openai"]);
  });

  it("asks the free list by default, because the setup a stranger follows has no credit on it", () => {
    /*
      A new key has no credit, so a paid default would answer 402 and Anu would
      be dead on arrival. Asserted rather than remembered: the models are the
      free list, there is more than one, and the ledger prices none of them at
      the unknown rate.
    */
    only("groq");
    const models = resolveProviders().map((p) => p.model);
    expect(models).toEqual([...FREE_GROQ_MODELS]);
    expect(models.length).toBeGreaterThan(1);
    for (const model of models) {
      expect(priceFor(model)).not.toEqual(UNKNOWN_MODEL);
    }
  });

  it("takes a list from the environment, so a deployment with credit can point elsewhere", () => {
    only("groq");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-120b, llama-3.3-70b-versatile ");
    expect(resolveProviders().map((p) => p.model)).toEqual([
      "openai/gpt-oss-120b", "llama-3.3-70b-versatile",
    ]);
  });

  it("is a chain of one when only one key is set, which is what it has always been", () => {
    only("anthropic");
    expect(resolveProviders().map((p) => p.name)).toEqual(["anthropic"]);
  });
});

describe("falling back", () => {
  async function collect(open: { chunks: AsyncGenerator<string> }): Promise<string> {
    let out = "";
    for await (const chunk of open.chunks) out += chunk;
    return out;
  }

  it("walks past a throttled provider and says who actually answered", async () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    // One free model, so this test is about walking between providers. The
    // walk between models of one provider is the test below it.
    vi.stubEnv("GROQ_MODEL", "free/one");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      // The free model is out of quota, which is its ordinary state.
      if (url.includes("groq.com")) return new Response("rate limited", { status: 429 });
      return sse("Partitive.");
    });

    const chain = resolveProviders();
    const open = await openWithFallback(chain, "system", [{ role: "user", content: "why?" }]);

    expect(calls).toEqual(["api.groq.com", "api.openai.com"]);
    // Not the head of the chain. That is the whole point: a screen naming the
    // wrong model is worse than one naming none.
    expect(open.config.name).toBe("openai");
    expect(await collect(open)).toBe("Partitive.");
  });

  it("does not walk past a rejected key, because every provider would answer the same", async () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("GROQ_MODEL", "free/one");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      return new Response("bad key", { status: 401 });
    });

    await expect(
      openWithFallback(resolveProviders(), "system", [{ role: "user", content: "why?" }]),
    ).rejects.toThrow(TutorError);
    // One clear message beats a slower one that tried everything first.
    expect(calls).toEqual(["api.groq.com"]);
  });

  it("walks past a key with no credit left, and says so in a sentence", async () => {
    /*
      A 402 is where a free key ends up, and it is not a rejected key: this
      account cannot pay, and the next one in the chain may well be able to.

      What it used to produce was the catch-all, which pasted 180 characters of
      the provider's own JSON into a line a learner reads, cut off mid-word:
      `<provider> returned 402. {"error":{"message":"This request requires more
      credits, or fewer max_tokens. You reques`. Found by running test-anu.mjs,
      which had never been run, against a key that had run out.
    */
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("GROQ_MODEL", "paid/one");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      if (url.includes("groq.com")) {
        return new Response('{"error":{"message":"This request requires more credits"}}', { status: 402 });
      }
      return sse("Partitive.");
    });

    const open = await openWithFallback(resolveProviders(), "system", [{ role: "user", content: "why?" }]);
    expect(calls).toEqual(["api.groq.com", "api.openai.com"]);
    expect(open.config.name).toBe("openai");
  });

  it("never puts a provider's raw body in front of a learner", async () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("GROQ_MODEL", "free/one");
    const bodies = [
      { status: 402, body: '{"error":{"message":"This request requires more credits"}}' },
      { status: 400, body: '{"error":{"message":"messages[0].content: expected string"}}' },
      { status: 500, body: "<html><body>upstream is having a moment</body></html>" },
    ];
    for (const { status, body } of bodies) {
      vi.stubGlobal("fetch", async () => new Response(body, { status }));
      const failed = await openWithFallback(resolveProviders(), "s", [{ role: "user", content: "q" }])
        .then(() => null, (error: Error) => error);
      expect(failed).toBeInstanceOf(TutorError);
      // Nothing of the provider's own format reaches the sentence.
      expect(failed!.message).not.toMatch(/[{}<>]|error"|max_tokens/);
      expect(failed!.message.length).toBeLessThan(220);
    }
  });

  it("waits on a 429 only when there is nowhere else to ask", async () => {
    /*
      The retry loop and the chain want opposite things from a 429, and the
      chain is right whenever it has somewhere to go: sitting through 4.5
      seconds of backoff against a provider that has already said no, and
      then falling back anyway, is four and a half seconds of a learner
      watching nothing happen. So the first link asks once and moves on; the
      last link, which has nowhere to move to, is the one that waits.
    */
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("GROQ_MODEL", "free/one");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      return new Response("rate limited", { status: 429 });
    });

    vi.useFakeTimers();
    try {
      const failing = openWithFallback(resolveProviders(), "system", [
        { role: "user", content: "why?" },
      ]);
      const settled = expect(failing).rejects.toMatchObject({ status: 429 });
      await vi.runAllTimersAsync();
      await settled;
    } finally {
      vi.useRealTimers();
    }

    expect(calls).toEqual([
      "api.groq.com",
      "api.openai.com",
      "api.openai.com",
      "api.openai.com",
    ]);
  });

  it("walks past a free model that has been retired, but only to its own provider", async () => {
    /*
      A free model exists at somebody else's expense, so it is withdrawn the
      moment it stops being worth paying for, and a slug in a constant here
      goes stale on its own. Across providers a 404 stays fatal, for the
      reason above: the model name is wrong, and it is wrong everywhere.
    */
    only("groq");
    vi.stubEnv("GROQ_MODEL", "gone/yesterday, still/here");
    const models: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const model = JSON.parse(String(init.body)).model as string;
      models.push(model);
      return model.startsWith("gone/")
        ? new Response("no such model", { status: 404 })
        : sse("Partitive.");
    });

    const open = await openWithFallback(resolveProviders(), "s", [{ role: "user", content: "q" }]);
    expect(models).toEqual(["gone/yesterday", "still/here"]);
    expect(open.config.model).toBe("still/here");
  });

  it("does not walk a missing model across to another provider", async () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("GROQ_MODEL", "gone/yesterday");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      return new Response("no such model", { status: 404 });
    });

    await expect(openWithFallback(resolveProviders(), "s", [{ role: "user", content: "q" }]))
      .rejects.toMatchObject({ status: 404 });
    expect(calls).toEqual(["api.groq.com"]);
  });

  it("refuses an empty chain rather than pretending it asked", async () => {
    await expect(openWithFallback([], "system", [{ role: "user", content: "why?" }]))
      .rejects.toMatchObject({ status: 503 });
  });

  it("reads Anthropic's frame shape as well as the OpenAI one", async () => {
    only("anthropic");
    vi.stubGlobal("fetch", async () =>
      new Response(
        `data: ${JSON.stringify({
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Osastav." },
        })}\n\n`,
        { status: 200 },
      ),
    );
    const open = await openWithFallback(resolveProviders(), "system", [
      { role: "user", content: "why?" },
    ]);
    expect(await collect(open)).toBe("Osastav.");
  });
});

/*
  Reading a photograph.

  The chain is the same one, with one difference that matters to whoever pays
  the bill: it uses the model the deployment already configured unless it is
  told otherwise, so turning on the camera cannot quietly move a free-model
  deployment onto a paid one.
*/
const IMAGE = { mediaType: "image/jpeg", base64: "AAAA" };

function jsonReply(words: { et: string; en: string }[], usage?: object): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ words }) } }],
      ...(usage ? { usage } : {}),
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("the chain that looks at pictures", () => {
  it("uses whatever model the deployment configured", () => {
    only("groq");
    vi.stubEnv("GROQ_MODEL", "text-only/model");
    vi.stubEnv("GROQ_VISION_MODEL", "");
    expect(visionProviders()[0]?.model).toBe("text-only/model");
  });

  it("takes an override, which is how a text-only default gets eyes", () => {
    only("groq");
    vi.stubEnv("GROQ_MODEL", "text-only/model");
    vi.stubEnv("GROQ_VISION_MODEL", "sees/pictures");
    expect(visionProviders()[0]?.model).toBe("sees/pictures");
  });

  it("asks one model once, however many links the chat chain has", () => {
    /*
      The chat chain is a link per free model at Groq, so an override
      collapsing them all onto one model would otherwise ask it three times
      and read the third refusal as having exhausted the chain.
    */
    only("groq");
    vi.stubEnv("GROQ_MODEL", "");
    vi.stubEnv("GROQ_VISION_MODEL", "sees/pictures");
    expect(resolveProviders().length).toBeGreaterThan(1);
    expect(visionProviders()).toHaveLength(1);
  });

  it("reports the tokens the provider actually charged", async () => {
    only("openai");
    vi.stubEnv("OPENAI_VISION_MODEL", "");
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonReply([{ et: "tuba", en: "room" }], { prompt_tokens: 2100, completion_tokens: 40 })));

    const seen: { input: number; output: number }[] = [];
    const reply = await completeWithImage(
      visionProviders(), "system", "prompt", IMAGE,
      (usage) => seen.push({ input: usage.inputTokens, output: usage.outputTokens }),
    );

    expect(reply.text).toContain("tuba");
    expect(seen).toEqual([{ input: 2100, output: 40 }]);
  });

  it("walks past a model that cannot see, unlike the chat path", async () => {
    /*
      A 400 stops `openWithFallback`, because a malformed request would be
      refused by everybody. Whether a model accepts an image is a fact about
      that one model, so here the next provider is worth asking.
    */
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "k");
    // One Groq link rather than one per free model, so the count below
    // measures the walk past a provider and not the length of that list.
    vi.stubEnv("GROQ_MODEL", "text-only/model");
    vi.stubEnv("GROQ_VISION_MODEL", "");

    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("groq.com")
        ? new Response("no image support", { status: 400 })
        : jsonReply([{ et: "raamat", en: "book" }]));
    vi.stubGlobal("fetch", fetchMock);

    const reply = await completeWithImage(visionProviders(), "system", "prompt", IMAGE);
    expect(reply.config.name).toBe("openai");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops at a rejected key, because no amount of retrying fixes one", async () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("GROQ_MODEL", "text-only/model");
    vi.stubEnv("GROQ_VISION_MODEL", "");

    const fetchMock = vi.fn(async () => new Response("nope", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(completeWithImage(visionProviders(), "s", "p", IMAGE)).rejects.toBeInstanceOf(TutorError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says so plainly when nothing is configured", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(completeWithImage([], "s", "p", IMAGE)).rejects.toThrow(/No AI provider/);
  });
});

/*
  THE ONE PROVIDER IN THE CHAIN THAT THINKS BEFORE IT ANSWERS.

  `REPLY_TOKENS` is sized for a reply, and Anthropic's own troubleshooting page
  says thinking tokens count toward `max_tokens` and that a turn which runs out
  in the reasoning field comes back with "a truncated or missing text block".
  Sonnet 5 is listed there as "Adaptive only, Default: On", so leaving the field
  out is not the same as switching it off, and the default model on this path is
  `claude-sonnet-5`.

  Asserted on the outgoing request rather than on the arguments, for the reason
  the routing test above gives about itself: the fault is invisible in what the
  caller passed and only the body says what was actually asked for. Both call
  sites, because the scanner builds its own request and a fix on one of them is
  the bug still shipping on the other.
*/
describe("Anthropic is asked not to think", () => {
  it("sends thinking disabled on the chat path", async () => {
    only("anthropic");
    let body = "";
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      body = String(init.body);
      return sse("tere");
    });
    const chain = resolveProviders();
    await openWithFallback([chain[0]!], "system", [{ role: "user", content: "hi" }]);
    expect(JSON.parse(body).thinking).toEqual({ type: "disabled" });
  });
});

/*
  A REPLY THAT HIT ITS OWN CEILING SAYS SO, NOT ONLY WHAT IT COST.

  `TUTOR_REPLY_TOKENS` makes running out rare; it does not make it impossible,
  and a caller reading the finished text alone cannot tell "the model stopped
  because it was done" apart from "the model stopped because the ceiling made
  it stop", which is a real prefix of an answer wearing the clothes of a whole
  one. `usage.truncated` is that distinction, read off the one frame each shape
  carries it on: Anthropic's `message_delta.delta.stop_reason` and the
  OpenAI-shaped `choices[0].finish_reason`, both `"length"`/`"max_tokens"` in
  that one case and something else (usually `"stop"`) in every other.

  Driven through `openWithFallback` and drained to the end, because the flag
  is set inside `readStream`'s own `finally`, which only runs once the
  generator has been consumed to completion, exactly as the tutor route
  consumes it.
*/
describe("a reply that hit its own ceiling says so, not only what it cost", () => {
  async function drain(open: { chunks: AsyncGenerator<string> }) {
    let out = "";
    for await (const chunk of open.chunks) out += chunk;
    return out;
  }

  it("reads finish_reason: length off an OpenAI-shaped stream", async () => {
    only("groq");
    vi.stubGlobal("fetch", async () => sseFrames(
      { choices: [{ delta: { content: "Osastav on" } }] },
      { choices: [{ delta: {}, finish_reason: "length" }] },
    ));
    const seen: (boolean | undefined)[] = [];
    const open = await openWithFallback(
      resolveProviders(), "system", [{ role: "user", content: "hi" }],
      (usage) => seen.push(usage.truncated),
    );
    await drain(open);
    expect(seen).toEqual([true]);
  });

  it("does not flag an ordinary finish", async () => {
    only("groq");
    vi.stubGlobal("fetch", async () => sseFrames(
      { choices: [{ delta: { content: "Tere!" } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ));
    const seen: (boolean | undefined)[] = [];
    const open = await openWithFallback(
      resolveProviders(), "system", [{ role: "user", content: "hi" }],
      (usage) => seen.push(usage.truncated),
    );
    await drain(open);
    expect(seen).toEqual([undefined]);
  });

  it("reads stop_reason: max_tokens off Anthropic's own shape", async () => {
    only("anthropic");
    vi.stubGlobal("fetch", async () => sseFrames(
      { type: "message_start", message: { usage: { input_tokens: 10 } } },
      { type: "content_block_delta", delta: { type: "text_delta", text: "Osastav on" } },
      { type: "message_delta", delta: { stop_reason: "max_tokens" }, usage: { output_tokens: 5 } },
    ));
    const seen: (boolean | undefined)[] = [];
    const open = await openWithFallback(
      resolveProviders(), "system", [{ role: "user", content: "hi" }],
      (usage) => seen.push(usage.truncated),
    );
    await drain(open);
    expect(seen).toEqual([true]);
  });
});

/**
 * WHERE EACH HOP ACTUALLY GOES, DRIVEN RATHER THAN READ OFF THE CHAIN.
 *
 * Everything above asks what `resolveProviders` returns, which is the right
 * question about composition and says nothing about where a request lands.
 * That gap is real and was once a fault: the grader's `callForJson` chose its
 * endpoint with "OpenRouter, or else OpenAI" and posted Groq and Gemini calls
 * to `api.openai.com`. That fault lived in `callForJson` rather than here, and
 * it is guarded where it lived, in `lib/tutor/grader.test.ts`. These drive
 * `openWithFallback`, which read the right table all along, so they could not
 * have failed against it: they hold the streaming path to the same property,
 * so a later edit to it cannot reopen the gap on this side.
 *
 * So each purpose is walked the whole way down with a stubbed `fetch`, every
 * link answering 503, and what is asserted is the host, the key and the model
 * of each hop in order. 503 rather than 429 deliberately: both are walkable and
 * only 429 is retried, so a 429 here would spend four and a half seconds of
 * backoff on the last link to measure nothing.
 */
describe("what the chain actually sends, hop by hop", () => {
  /** Every outgoing request, in order, as the host and model it went to. */
  function hops(): { seen: string[] } {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const headers = (init.headers ?? {}) as Record<string, string>;
      const key = headers.authorization?.replace("Bearer ", "") ?? headers["x-api-key"] ?? "(none)";
      const body = JSON.parse(String(init.body)) as { model?: string };
      seen.push(`${new URL(String(url)).host} ${key} ${body.model}`);
      return new Response("upstream having a bad minute", { status: 503 });
    });
    return { seen };
  }

  /** Every key set, so a purpose reaching another's provider shows up. */
  function allKeys() {
    for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, `${key}-val`);
  }

  async function walked(run: () => Promise<unknown>): Promise<string[]> {
    const { seen } = hops();
    // The whole chain refuses, which is what makes it walk the whole chain.
    await expect(run()).rejects.toThrow();
    return seen;
  }

  it("sends Anu to Gemini and then Groq, each with its own key", async () => {
    allKeys();
    expect(await walked(() => openWithFallback(
      resolveProviders({ purpose: "tutor" }), "sys", [{ role: "user", content: "hi" }],
    ))).toEqual([
      `generativelanguage.googleapis.com GEMINI_API_KEY-val ${TUTOR_MODEL}`,
      `api.groq.com GROQ_API_KEY-val ${TUTOR_FALLBACK_MODEL}`,
    ]);
  });

  it("sends a scene down both Gemini models, then Groq, then the bounded tail", async () => {
    allKeys();
    expect(await walked(() => openWithFallback(
      sceneProviders(), "sys", [{ role: "user", content: "hi" }],
    ))).toEqual([
      `generativelanguage.googleapis.com GEMINI_API_KEY-val ${SCENE_MODELS[0]}`,
      `generativelanguage.googleapis.com GEMINI_API_KEY-val ${SCENE_MODELS[1]}`,
      `api.groq.com GROQ_API_KEY-val ${SCENE_FALLBACK_MODEL}`,
      "api.anthropic.com ANTHROPIC_API_KEY-val claude-sonnet-5",
    ]);
  });

  it("keeps Groq behind Gemini for a scene once the fallback budget is spent", async () => {
    allKeys();
    /*
      `SCENE_FALLBACK_MODEL` answers on every budget, unlike the Anthropic tail:
      it is a fixed second link rather than the bounded last resort, because it
      spends nothing Anu runs on. A Gemini-only install falls to the bank
      instead, which is where a keyless deployment has always played.
    */
    expect(await walked(() => openWithFallback(
      sceneProviders({ allowFallback: false }), "sys", [{ role: "user", content: "hi" }],
    ))).toEqual([
      `generativelanguage.googleapis.com GEMINI_API_KEY-val ${SCENE_MODELS[0]}`,
      `generativelanguage.googleapis.com GEMINI_API_KEY-val ${SCENE_MODELS[1]}`,
      `api.groq.com GROQ_API_KEY-val ${SCENE_FALLBACK_MODEL}`,
    ]);
  });

  it("posts a grader chain to Gemini and Groq rather than to OpenAI", async () => {
    allKeys();
    const walk = await walked(() => openWithFallback(
      resolveProviders({ purpose: "grader" }), "sys", [{ role: "user", content: "hi" }],
    ));
    expect(walk).toEqual([
      `generativelanguage.googleapis.com GEMINI_API_KEY-val ${GRADER_MODELS[0]!.model}`,
      `api.groq.com GROQ_API_KEY-val ${GRADER_MODELS[1]!.model}`,
      "api.anthropic.com ANTHROPIC_API_KEY-val claude-sonnet-5",
    ]);
    // The shape of the `callForJson` fault, held on this path too.
    expect(walk.some((hop) => hop.startsWith("api.openai.com"))).toBe(false);
    expect(walk.some((hop) => hop.includes("OPENAI_API_KEY"))).toBe(false);
  });

  it("gives the scanner the measured reader first and the rest of the chain behind it", async () => {
    allKeys();
    const walk = await walked(() => completeWithImage(
      visionProviders(), "sys", "read this", { mediaType: "image/png", base64: "AA" },
    ));
    expect(walk[0]).toBe(`generativelanguage.googleapis.com GEMINI_API_KEY-val ${VISION_MODEL}`);
    // One entry per model, never the same model asked three times over.
    expect(new Set(walk).size).toBe(walk.length);
    // Each hop carries its own provider's key and nobody else's.
    for (const hop of walk) {
      const [host, key] = hop.split(" ");
      const expected = {
        "api.groq.com": "GROQ_API_KEY-val",
        "generativelanguage.googleapis.com": "GEMINI_API_KEY-val",
        "api.anthropic.com": "ANTHROPIC_API_KEY-val",
        "api.openai.com": "OPENAI_API_KEY-val",
      }[host!];
      expect(key).toBe(expected);
    }
  });

  it("asks nobody at all for Anu when only the dear key is set", async () => {
    /*
      Her purpose refuses the fallback outright, so an Anthropic-only install
      has no tutor rather than a tutor answered by the model `eval:anu`
      measured getting her grammar wrong. Driven rather than read, because the
      claim is that no request leaves.
    */
    only("anthropic");
    const { seen } = hops();
    await expect(openWithFallback(
      resolveProviders({ purpose: "tutor" }), "sys", [{ role: "user", content: "hi" }],
    )).rejects.toThrow();
    expect(seen).toEqual([]);
  });
});
