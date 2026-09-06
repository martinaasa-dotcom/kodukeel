import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeWithImage, FREE_GEMINI_MODELS, FREE_GROQ_MODELS, FREE_OPENROUTER_MODELS,
  openWithFallback, PROVIDER_KEY_ENV, providerResilience, resolveProviders,
  SCENE_GROQ_MODELS, TutorError, visionProviders,
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
function only(name: "openrouter" | "groq" | "gemini" | "anthropic" | "openai") {
  const wanted = `${name.toUpperCase()}_API_KEY`;
  for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, key === wanted ? "k" : "");
}

/*
  A chain that looks redundant and is not.

  OpenRouter contributes one link per free model, so the chain can be four long
  and still be a single account with a single balance. When that balance ran out
  on the live deployment every link answered 402 within the same second and the
  tutor went down, which is the exact failure a fallback is supposed to absorb.
  Settings now says so, and this is what keeps that warning honest.
*/
/*
  A second provider that does not need a credit card.

  The availability lesson from the live deployment was that one account is one
  point of failure however many models hang off it. The fix cannot be "add a
  paid key" for somebody running this for free, so Groq and Gemini are in the
  chain: both hand out a real free tier with no card, both speak the OpenAI
  wire format, and neither shares a balance with OpenRouter.
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

  it("sends scene composition to Groq, and to the model the eval ranked", () => {
    all();
    const chain = resolveProviders({ purpose: "scene" });
    expect(chain.map((c) => c.name)).toEqual(["groq"]);
    expect(chain[0]?.model).toBe(SCENE_GROQ_MODELS[0]);
  });

  it("sends Anu to Anthropic", () => {
    all();
    const chain = resolveProviders({ purpose: "tutor" });
    expect(chain.map((c) => c.name)).toEqual(["anthropic"]);
    expect(chain[0]?.model).toBe("claude-sonnet-5");
  });

  it("lets neither purpose reach the other's provider", () => {
    all();
    // The cost half of the split: Anthropic answering scene lines is the whole
    // conversation billed at forty times the rate it was measured at.
    expect(resolveProviders({ purpose: "scene" }).some((c) => c.name === "anthropic")).toBe(false);
    // And the quality half: Groq was ranked on fourteen-word constrained output.
    expect(resolveProviders({ purpose: "tutor" }).some((c) => c.name === "groq")).toBe(false);
  });

  it("keeps OpenRouter and Gemini out of both, however the machine is configured", () => {
    /*
      The reason this is its own case rather than a line in the one above. Those
      two are the free chain's defaults, so they are the providers most likely
      to be left set on a machine that has since moved to paid keys, and a
      purpose that quietly inherited one would look exactly like a purpose that
      was working. Being absent from the environment is not what protects this;
      being unreachable by construction is.
    */
    all();
    for (const purpose of ["tutor", "scene"] as const) {
      const names = resolveProviders({ purpose }).map((c) => c.name);
      expect(names).not.toContain("openrouter");
      expect(names).not.toContain("gemini");
      expect(names).not.toContain("openai");
    }
  });

  it("falls to scripted on its own provider's absence, independently", () => {
    /*
      ITEM FIVE OF THE SPLIT: one balance running out may not take the other
      feature down. An empty chain is what both routes read as "no model", and
      each of them has somewhere to go — Anu says she is not set up, a scene
      plays off its recorded and banked lines.
    */
    only("groq");
    expect(resolveProviders({ purpose: "scene" })).not.toHaveLength(0);
    expect(resolveProviders({ purpose: "tutor" })).toHaveLength(0);

    only("anthropic");
    expect(resolveProviders({ purpose: "tutor" })).not.toHaveLength(0);
    expect(resolveProviders({ purpose: "scene" })).toHaveLength(0);
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
    expect(names).toEqual(new Set(["openrouter", "groq", "gemini", "anthropic", "openai"]));
  });

  it("lets SCENE_MODEL name the model, and does not read GROQ_MODEL for it", () => {
    /*
      GROQ_MODEL configures the general chain. Inheriting it here would move
      scene composition off the model `eval:composers` ranked the first time
      anybody tuned the general chain for some other reason, and nothing would
      say so.
    */
    only("groq");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-120b");
    expect(resolveProviders({ purpose: "scene" }).map((c) => c.model)).toEqual([...SCENE_GROQ_MODELS]);

    vi.stubEnv("SCENE_MODEL", "some/other-model");
    expect(resolveProviders({ purpose: "scene" }).map((c) => c.model)).toEqual(["some/other-model"]);
  });

  it("prices the scene model as a paid model, because the account is paid", () => {
    /*
      THE ROW THAT WOULD SWITCH THE SPEND CAP OFF. `qwen3.8-27b` was priced at
      zero with the rest of Groq's free tier, which was true of a free account
      and is not true of this one. Left at zero it is the global cap disabled
      for the highest-volume path in the app: scene composition would have been
      unbounded and `AI_DAILY_USD_GLOBAL` would never have known.
    */
    const price = priceFor(SCENE_GROQ_MODELS[0]);
    expect(price.inputPerMTok).toBeGreaterThan(0);
    expect(price.outputPerMTok).toBeGreaterThan(0);
    // And not the punitive unknown rate, which would bind forty times too early
    // and break the feature to protect a bill that was never at risk.
    expect(price.inputPerMTok).toBeLessThan(UNKNOWN_MODEL.inputPerMTok);
  });
});

describe("the free providers that are not OpenRouter", () => {
  it("puts every free provider ahead of every paid one", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const order: string[] = [];
    for (const { name } of resolveProviders()) if (order[order.length - 1] !== name) order.push(name);
    expect(order).toEqual(["openrouter", "groq", "gemini", "anthropic", "openai"]);
  });

  it("counts a free second provider as real redundancy", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("GEMINI_API_KEY", "");
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
      (`SCENE_GROQ_MODELS`), and it stays on this list because `eval:composers`
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
    vi.stubEnv("OPENROUTER_API_KEY", "");
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

  it("does not ask Gemini for a usage frame it never agreed to accept", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    let body = "";
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      body = String(init.body);
      return sse("tere");
    });
    const chain = resolveProviders();
    await openWithFallback([chain[0]!], "system", [{ role: "user", content: "hi" }]);
    /*
      An unrecognised field is rejected outright rather than ignored, and this
      codebase has already lost a provider to exactly that: stream_options was
      added to the Anthropic call and every request 400'd. Gemini's OpenAI
      layer does not document the field, so it is not sent, and the ledger
      estimates from characters instead, which over-counts and so keeps the cap
      failing closed.
    */
    expect(body).not.toContain("stream_options");
    expect(body).toContain(FREE_GEMINI_MODELS[0]);
  });
});

describe("how many things can actually answer", () => {
  it("counts one provider as one, however many models it offers", () => {
    only("openrouter");
    const state = providerResilience();
    expect(state.providers).toEqual(["OpenRouter"]);
    expect(state.models).toBeGreaterThan(1);
    expect(state.singlePointOfFailure).toBe(true);
  });

  it("stops warning once a second provider is configured", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "");
    const state = providerResilience();
    expect(state.providers).toEqual(["OpenRouter", "Anthropic"]);
    expect(state.singlePointOfFailure).toBe(false);
  });

  it("does not call an unconfigured app a single point of failure", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    // Nothing configured is a different message, shown elsewhere.
    expect(providerResilience().singlePointOfFailure).toBe(false);
  });
});

describe("the chain", () => {
  it("is empty with no key at all, so nothing above it has to guess", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(resolveProviders()).toEqual([]);
  });

  it("puts the free provider first, so a paid key is the fallback and not the default", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const seen: string[] = [];
    for (const { name } of resolveProviders()) if (seen[seen.length - 1] !== name) seen.push(name);
    expect(seen).toEqual(["openrouter", "anthropic", "openai"]);
  });

  it("asks free models by default, because the setup a stranger follows has no credit on it", () => {
    /*
      This default was `openai/gpt-4o`, a paid model at OpenRouter's full rate,
      three lines under a comment saying the default provider is a free one. A
      new key has no credit, so the answer was a 402 and Anu was dead on
      arrival. Asserted rather than remembered, on both halves: the slug says
      free, and the ledger agrees it costs nothing.
    */
    only("openrouter");
    const models = resolveProviders().map((p) => p.model);
    expect(models).toEqual([...FREE_OPENROUTER_MODELS]);
    expect(models.length).toBeGreaterThan(1);
    for (const model of models) {
      expect(model.endsWith(":free")).toBe(true);
      expect(priceFor(model)).toEqual({ inputPerMTok: 0, outputPerMTok: 0 });
    }
  });

  it("takes a list from the environment, so a deployment with credit can point elsewhere", () => {
    only("openrouter");
    vi.stubEnv("OPENROUTER_MODEL", "openai/gpt-4o, anthropic/claude-sonnet-5 ");
    expect(resolveProviders().map((p) => p.model)).toEqual([
      "openai/gpt-4o", "anthropic/claude-sonnet-5",
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
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    // One free model, so this test is about walking between providers. The
    // walk between models of one provider is the test below it.
    vi.stubEnv("OPENROUTER_MODEL", "free/one:free");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      // The free model is out of quota, which is its ordinary state.
      if (url.includes("openrouter")) return new Response("rate limited", { status: 429 });
      return sse("Partitive.");
    });

    const chain = resolveProviders();
    const open = await openWithFallback(chain, "system", [{ role: "user", content: "why?" }]);

    expect(calls).toEqual(["openrouter.ai", "api.openai.com"]);
    // Not the head of the chain. That is the whole point: a screen naming the
    // wrong model is worse than one naming none.
    expect(open.config.name).toBe("openai");
    expect(await collect(open)).toBe("Partitive.");
  });

  it("does not walk past a rejected key, because every provider would answer the same", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("OPENROUTER_MODEL", "free/one:free");
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
    expect(calls).toEqual(["openrouter.ai"]);
  });

  it("walks past a key with no credit left, and says so in a sentence", async () => {
    /*
      A 402 is where a free key ends up, and it is not a rejected key: this
      account cannot pay, and the next one in the chain may well be able to.

      What it used to produce was the catch-all, which pasted 180 characters of
      the provider's own JSON into a line a learner reads, cut off mid-word:
      `OpenRouter returned 402. {"error":{"message":"This request requires more
      credits, or fewer max_tokens. You reques`. Found by running test-anu.mjs,
      which had never been run, against a key that had run out.
    */
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("OPENROUTER_MODEL", "paid/one");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      if (url.includes("openrouter")) {
        return new Response('{"error":{"message":"This request requires more credits"}}', { status: 402 });
      }
      return sse("Partitive.");
    });

    const open = await openWithFallback(resolveProviders(), "system", [{ role: "user", content: "why?" }]);
    expect(calls).toEqual(["openrouter.ai", "api.openai.com"]);
    expect(open.config.name).toBe("openai");
  });

  it("never puts a provider's raw body in front of a learner", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("OPENROUTER_MODEL", "free/one:free");
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
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("OPENROUTER_MODEL", "free/one:free");
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
      "openrouter.ai",
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
    only("openrouter");
    vi.stubEnv("OPENROUTER_MODEL", "gone/yesterday:free, still/here:free");
    const models: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const model = JSON.parse(String(init.body)).model as string;
      models.push(model);
      return model.startsWith("gone/")
        ? new Response("no such model", { status: 404 })
        : sse("Partitive.");
    });

    const open = await openWithFallback(resolveProviders(), "s", [{ role: "user", content: "q" }]);
    expect(models).toEqual(["gone/yesterday:free", "still/here:free"]);
    expect(open.config.model).toBe("still/here:free");
  });

  it("does not walk a missing model across to another provider", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("OPENROUTER_MODEL", "gone/yesterday:free");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      return new Response("no such model", { status: 404 });
    });

    await expect(openWithFallback(resolveProviders(), "s", [{ role: "user", content: "q" }]))
      .rejects.toMatchObject({ status: 404 });
    expect(calls).toEqual(["openrouter.ai"]);
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
    only("openrouter");
    vi.stubEnv("OPENROUTER_MODEL", "z-ai/glm-5.2:free");
    vi.stubEnv("OPENROUTER_VISION_MODEL", "");
    expect(visionProviders()[0]?.model).toBe("z-ai/glm-5.2:free");
  });

  it("takes an override, which is how a text-only default gets eyes", () => {
    only("openrouter");
    vi.stubEnv("OPENROUTER_MODEL", "z-ai/glm-5.2:free");
    vi.stubEnv("OPENROUTER_VISION_MODEL", "openai/gpt-4o");
    expect(visionProviders()[0]?.model).toBe("openai/gpt-4o");
  });

  it("asks one model once, however many links the chat chain has", () => {
    /*
      The chat chain is a link per free model at OpenRouter, so an override
      collapsing them all onto one model would otherwise ask it three times
      and read the third refusal as having exhausted the chain.
    */
    only("openrouter");
    vi.stubEnv("OPENROUTER_MODEL", "");
    vi.stubEnv("OPENROUTER_VISION_MODEL", "openai/gpt-4o");
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
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "k");
    // One OpenRouter link rather than one per free model, so the count below
    // measures the walk past a provider and not the length of that list.
    vi.stubEnv("OPENROUTER_MODEL", "openai/gpt-4o");
    vi.stubEnv("OPENROUTER_VISION_MODEL", "");

    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("openrouter")
        ? new Response("no image support", { status: 400 })
        : jsonReply([{ et: "raamat", en: "book" }]));
    vi.stubGlobal("fetch", fetchMock);

    const reply = await completeWithImage(visionProviders(), "system", "prompt", IMAGE);
    expect(reply.config.name).toBe("openai");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops at a rejected key, because no amount of retrying fixes one", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("OPENROUTER_MODEL", "openai/gpt-4o");
    vi.stubEnv("OPENROUTER_VISION_MODEL", "");

    const fetchMock = vi.fn(async () => new Response("nope", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(completeWithImage(visionProviders(), "s", "p", IMAGE)).rejects.toBeInstanceOf(TutorError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says so plainly when nothing is configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(completeWithImage([], "s", "p", IMAGE)).rejects.toThrow(/No AI provider/);
  });
});
