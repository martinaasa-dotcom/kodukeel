import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANTHROPIC_THINKING, DEFAULT_ANTHROPIC_MODEL, REPLY_TOKENS,
  completeWithImage, openWithFallback, PROVIDER_KEY_ENV, providerResilience,
  resolveProviders, TutorError, visionProviders,
} from "@/lib/tutor/provider";
import { priceFor } from "@/lib/usage/pricing";

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

  The list is two names now rather than five, and the three that went are the
  free providers withdrawn on 2026-09-05. The reason to keep reading the
  exported list rather than typing the two here has not changed: the fault this
  was written for was a copy of the list drifting from the chain, and that
  works in both directions.
*/
beforeEach(() => {
  for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, "");
  // Not a provider key, so `PROVIDER_KEY_ENV` does not clear it, and a machine
  // with it set would otherwise measure its own pin rather than the default.
  vi.stubEnv("ANTHROPIC_MODEL", "");
  vi.stubEnv("OPENAI_MODEL", "");
  vi.stubEnv("ANTHROPIC_VISION_MODEL", "");
  vi.stubEnv("OPENAI_VISION_MODEL", "");
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

/** The same, in Anthropic's frame shape. */
function anthropicSse(text: string): Response {
  const body = `data: ${JSON.stringify({
    type: "content_block_delta",
    delta: { type: "text_delta", text },
  })}\n\n`;
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
function only(name: "anthropic" | "openai") {
  const wanted = `${name.toUpperCase()}_API_KEY`;
  for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, key === wanted ? "k" : "");
}

/*
  ONE PAID PROVIDER, AND NO FREE ONES (2026-09-05).

  OpenRouter, Groq and Gemini were the default chain and the argument for them
  was that a stranger could set this up without a card. What they did in
  practice was run out of daily quota, throttle per minute, and in Gemini's case
  answer 200 with an empty `content` because the reasoning field had spent the
  whole output budget. These are the cases that keep the withdrawal honest: the
  branches are gone, the keys are off `PROVIDER_KEY_ENV`, and nothing in the
  chain reads them.
*/
describe("the free providers that were withdrawn", () => {
  it("puts no provider in the chain for a key it no longer reads", () => {
    for (const key of ["OPENROUTER_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY"]) {
      vi.stubEnv(key, "k");
    }
    // Every one of those used to add a link, several of them.
    expect(resolveProviders()).toEqual([]);
  });

  it("keeps those names out of the list the credential canary is built from", () => {
    expect([...PROVIDER_KEY_ENV]).toEqual(["ANTHROPIC_API_KEY", "OPENAI_API_KEY"]);
  });
});

describe("how many things can actually answer", () => {
  it("counts one provider as one", () => {
    only("anthropic");
    const state = providerResilience();
    expect(state.providers).toEqual(["Anthropic"]);
    expect(state.models).toBe(1);
    expect(state.singlePointOfFailure).toBe(true);
  });

  it("stops warning once a second provider is configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const state = providerResilience();
    expect(state.providers).toEqual(["Anthropic", "OpenAI"]);
    expect(state.singlePointOfFailure).toBe(false);
  });

  it("does not call an unconfigured app a single point of failure", () => {
    // Nothing configured is a different message, shown elsewhere.
    expect(providerResilience().singlePointOfFailure).toBe(false);
  });
});

describe("the chain", () => {
  /*
    THE KEYLESS CASE, WHICH IS THE DEFAULT ONE.

    An empty chain is not an error state and never was: every caller checks the
    length and runs its scripted path instead, so a deployment with no key is a
    complete app with the AI features absent rather than a broken one. It is
    asserted here because the withdrawal of three providers is exactly the
    change that could have turned "no key" into "no branch matched, throw".
  */
  it("is empty with no key at all, so nothing above it has to guess", () => {
    expect(resolveProviders()).toEqual([]);
  });

  it("still returns an array rather than throwing when nothing is configured", () => {
    expect(() => resolveProviders()).not.toThrow();
    expect(Array.isArray(resolveProviders())).toBe(true);
  });

  it("refuses an empty chain at the point of asking, with a status a caller can read", async () => {
    // 503 rather than a thrown string: the scene route and the tutor route
    // both check the length first, and this is the backstop under that.
    await expect(openWithFallback([], "system", [{ role: "user", content: "why?" }]))
      .rejects.toMatchObject({ status: 503 });
  });

  it("is a chain of one when only one key is set, which is what it has always been", () => {
    only("anthropic");
    expect(resolveProviders().map((p) => p.name)).toEqual(["anthropic"]);
  });

  it("asks Sonnet by default, and prices it", () => {
    /*
      The default is named rather than inferred, and the ledger has to agree it
      costs something: an unpriced model meets `UNKNOWN_MODEL` and would ration
      every learner at the dearest rate in the table.
    */
    only("anthropic");
    expect(resolveProviders().map((p) => p.model)).toEqual([DEFAULT_ANTHROPIC_MODEL]);
    expect(DEFAULT_ANTHROPIC_MODEL).toBe("claude-sonnet-5");
    expect(priceFor(DEFAULT_ANTHROPIC_MODEL)).toEqual({ inputPerMTok: 2, outputPerMTok: 10 });
  });

  it("takes the model from the environment, so a deployment can point elsewhere", () => {
    only("anthropic");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5");
    expect(resolveProviders().map((p) => p.model)).toEqual(["claude-haiku-4-5"]);
  });

  it("puts Anthropic first, because that is the one this app is written against", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    expect(resolveProviders().map((p) => p.name)).toEqual(["anthropic", "openai"]);
  });
});

/*
  What the Anthropic request carries, and why two of these fields are here.

  Sonnet 5 runs adaptive thinking by default and thinking tokens come out of
  `max_tokens`, so a short reply can be truncated or empty with nothing in this
  file noticing: `readStream` counts an empty string as an answer. That is the
  Gemini bug wearing different clothes, and both halves of the fix are asserted
  rather than described.
*/
describe("what Anthropic is actually asked", () => {
  async function bodyOfOneCall(): Promise<Record<string, unknown>> {
    only("anthropic");
    let body = "";
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      body = String(init.body);
      return anthropicSse("Osastav.");
    });
    await openWithFallback(resolveProviders(), "system", [{ role: "user", content: "why?" }]);
    return JSON.parse(body) as Record<string, unknown>;
  }

  it("turns thinking off, because a thinking pass eats the reply's budget", async () => {
    expect((await bodyOfOneCall()).thinking).toEqual(ANTHROPIC_THINKING);
    expect(ANTHROPIC_THINKING).toEqual({ type: "disabled" });
  });

  it("leaves room for the reply even if a future model thinks anyway", async () => {
    expect((await bodyOfOneCall()).max_tokens).toBe(REPLY_TOKENS);
    // 1200 was the number sized when nothing in the chain thought.
    expect(REPLY_TOKENS).toBeGreaterThan(1200);
  });

  it("does not send the OpenAI-shaped usage field, which Anthropic rejects outright", async () => {
    expect((await bodyOfOneCall()).stream_options).toBeUndefined();
  });

  it("reads Anthropic's frame shape as well as the OpenAI one", async () => {
    only("anthropic");
    vi.stubGlobal("fetch", async () => anthropicSse("Osastav."));
    const open = await openWithFallback(resolveProviders(), "system", [
      { role: "user", content: "why?" },
    ]);
    let out = "";
    for await (const chunk of open.chunks) out += chunk;
    expect(out).toBe("Osastav.");
  });
});

describe("falling back", () => {
  async function collect(open: { chunks: AsyncGenerator<string> }): Promise<string> {
    let out = "";
    for await (const chunk of open.chunks) out += chunk;
    return out;
  }

  it("walks past a throttled provider and says who actually answered", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      if (url.includes("anthropic")) return new Response("rate limited", { status: 429 });
      return sse("Partitive.");
    });

    const open = await openWithFallback(resolveProviders(), "system", [
      { role: "user", content: "why?" },
    ]);

    expect(calls).toEqual(["api.anthropic.com", "api.openai.com"]);
    // Not the head of the chain. That is the whole point: a screen naming the
    // wrong model is worse than one naming none.
    expect(open.config.name).toBe("openai");
    expect(await collect(open)).toBe("Partitive.");
  });

  it("does not walk past a rejected key, because every provider would answer the same", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
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
    expect(calls).toEqual(["api.anthropic.com"]);
  });

  /*
    WHAT A DEPLETED ACCOUNT ACTUALLY LOOKS LIKE.

    Anthropic answers an account with no money in three different shapes, and
    only one of them used to be recognised. 402 is the billing error. 400 is
    what a spend limit the operator set returns. 429 is what a usage tier's
    monthly spend cap returns, and that one has no `retry-after` and keeps
    failing until access resumes, so waiting is the wrong advice for it.

    All three have always been safe: nothing loops, nothing is billed, and the
    caller degrades to its scripted path. What was wrong was the sentence, and
    on two of the three the operator was told the provider was having a moment.
  */
  describe("running out of credit", () => {
    const shapes = [
      { status: 402, body: '{"error":{"type":"billing_error","message":"credit balance is too low"}}' },
      { status: 400, body: '{"error":{"type":"invalid_request_error","message":"You have reached your spend limit"}}' },
      { status: 429, body: '{"error":{"type":"rate_limit_error","message":"monthly spend cap reached"}}' },
    ];

    for (const { status, body } of shapes) {
      it(`reports a ${status} about money as a billing problem, not a bad minute`, async () => {
        only("anthropic");
        vi.stubGlobal("fetch", async () => new Response(body, { status }));
        const failed = await openWithFallback(resolveProviders(), "s", [{ role: "user", content: "q" }])
          .then(() => null, (error: TutorError) => error);
        expect(failed).toBeInstanceOf(TutorError);
        // 402 whatever the wire said, so one branch above answers all three.
        expect(failed!.status).toBe(402);
        expect(failed!.message).toMatch(/credit|spend limit/i);
        // And still nothing of the provider's own format on a screen.
        expect(failed!.message).not.toMatch(/[{}<>]|error"/);
      });
    }

    it("does not read an ordinary rate limit as a money problem", async () => {
      only("anthropic");
      vi.stubGlobal("fetch", async () => new Response("slow down", { status: 429 }));
      vi.useFakeTimers();
      try {
        const failing = openWithFallback(resolveProviders(), "s", [{ role: "user", content: "q" }]);
        const settled = expect(failing).rejects.toMatchObject({ status: 429 });
        await vi.runAllTimersAsync();
        await settled;
      } finally {
        vi.useRealTimers();
      }
    });

    it("walks past a key with no credit left, because the next one has its own balance", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "k");
      vi.stubEnv("OPENAI_API_KEY", "k");
      const calls: string[] = [];
      vi.stubGlobal("fetch", async (url: string) => {
        calls.push(new URL(url).host);
        if (url.includes("anthropic")) {
          return new Response('{"error":{"message":"credit balance is too low"}}', { status: 400 });
        }
        return sse("Partitive.");
      });

      const open = await openWithFallback(resolveProviders(), "system", [
        { role: "user", content: "why?" },
      ]);
      expect(calls).toEqual(["api.anthropic.com", "api.openai.com"]);
      expect(open.config.name).toBe("openai");
    });
  });

  it("never puts a provider's raw body in front of a learner", async () => {
    only("anthropic");
    const bodies = [
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
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
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
      "api.anthropic.com",
      "api.openai.com",
      "api.openai.com",
      "api.openai.com",
    ]);
  });

  it("does not walk a missing model across to another provider", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      return new Response("no such model", { status: 404 });
    });

    await expect(openWithFallback(resolveProviders(), "s", [{ role: "user", content: "q" }]))
      .rejects.toMatchObject({ status: 404 });
    expect(calls).toEqual(["api.anthropic.com"]);
  });
});

/*
  Reading a photograph.

  The chain is the same one, with one difference that matters to whoever pays
  the bill: it uses the model the deployment already configured unless it is
  told otherwise, so turning on the camera cannot quietly move a deployment
  onto a dearer model it did not choose.
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
    only("anthropic");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5");
    expect(visionProviders()[0]?.model).toBe("claude-haiku-4-5");
  });

  it("takes an override, which is how a text-only default gets eyes", () => {
    only("anthropic");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5");
    vi.stubEnv("ANTHROPIC_VISION_MODEL", "claude-opus-5");
    expect(visionProviders()[0]?.model).toBe("claude-opus-5");
  });

  it("asks one model once, however the chat chain is shaped", () => {
    /*
      A no-op while every provider contributes one link, and it is what stopped
      an override asking one model the same question three times back when
      OpenRouter contributed a link per free model.
    */
    only("anthropic");
    vi.stubEnv("ANTHROPIC_VISION_MODEL", "claude-opus-5");
    expect(visionProviders()).toHaveLength(1);
  });

  it("reports the tokens the provider actually charged", async () => {
    only("openai");
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
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");

    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("anthropic")
        ? new Response("no image support", { status: 400 })
        : jsonReply([{ et: "raamat", en: "book" }]));
    vi.stubGlobal("fetch", fetchMock);

    const reply = await completeWithImage(visionProviders(), "system", "prompt", IMAGE);
    expect(reply.config.name).toBe("openai");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops at a rejected key, because no amount of retrying fixes one", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("OPENAI_API_KEY", "k");

    const fetchMock = vi.fn(async () => new Response("nope", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(completeWithImage(visionProviders(), "s", "p", IMAGE)).rejects.toBeInstanceOf(TutorError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says so plainly when nothing is configured", async () => {
    await expect(completeWithImage([], "s", "p", IMAGE)).rejects.toThrow(/No AI provider/);
  });
});
