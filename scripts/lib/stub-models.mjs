/*
  A STUBBED MODEL, FOR A SERVER UNDER TEST.

  `scripts/test-api.mjs` asks Anu one question and reads one photograph over
  HTTP, and neither may reach a paid model: the budget for a test run is
  nothing. Preload this into the server, with a dummy Groq key so the chain
  holds one link to aim at, and every call to Groq is answered here instead:

    KODUKEEL_STUB_MODELS=1 GROQ_API_KEY=stub \
      NODE_OPTIONS="--import ./scripts/lib/stub-models.mjs" npm run start

  and run the suite with `KODUKEEL_STUB_MODELS=1` as well, which is how it knows
  to ask. Without both it asks nothing that books a call, and says so.

  It answers only Groq's host and only while `KODUKEEL_STUB_MODELS=1`, so an
  accidental preload on a real deployment changes nothing. A streamed question
  gets `STUB_ANSWER` as Server-Sent Events, the shape every OpenAI-compatible
  provider streams; a question with a picture in it gets `STUB_PAGE`, two words
  the shipped dictionary holds, as the JSON the scanner asks for.
*/

export const STUB_ANSWER = "Tere is how you say hello. (stubbed answer)";
export const STUB_PAGE = { words: [{ et: "raamat", en: "book" }, { et: "tuba", en: "room" }] };

const STUBBED_HOST = "https://api.groq.com/";

if (process.env.KODUKEEL_STUB_MODELS === "1" && typeof globalThis.fetch === "function") {
  const real = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(STUBBED_HOST)) return real(input, init);

    let body = {};
    try { body = JSON.parse(typeof init?.body === "string" ? init.body : "{}"); } catch { /* answered as a question */ }
    const hasPicture = JSON.stringify(body.messages ?? []).includes("image_url");
    const usage = { prompt_tokens: 40, completion_tokens: 12, total_tokens: 52 };

    if (body.stream) {
      const frames = [
        { choices: [{ delta: { content: STUB_ANSWER } }] },
        { choices: [{ delta: {}, finish_reason: "stop" }], usage },
      ].map((f) => `data: ${JSON.stringify(f)}\n\n`).join("") + "data: [DONE]\n\n";
      return new Response(frames, { status: 200, headers: { "content-type": "text/event-stream" } });
    }
    const content = hasPicture ? JSON.stringify(STUB_PAGE) : STUB_ANSWER;
    return Response.json({ choices: [{ message: { content }, finish_reason: "stop" }], usage });
  };
  console.log("  Models are stubbed: every call to Groq is answered by scripts/lib/stub-models.mjs.");
}
