/**
 * A STAND-IN FOR THE SCENE COMPOSER, FOR A BROWSER SUITE (docs/41-fifth-batch.md, VB-11).
 *
 * Tonight's chat is never offered without a model, so a suite that wants to
 * see it has to give the server one, and a suite may not spend money or depend
 * on a provider having a good minute. This is loaded into a server the suite
 * starts itself (`node --import`), and it answers the one host the scene chain
 * talks to, Google's, from inside the process: nothing leaves the machine.
 *
 * WHAT IT SAYS IS NEVER WRITTEN HERE. Its lines are phrase entries the shipped
 * dictionary already holds (`prisma/data/other.ts`), and the word a chat beat
 * is about, said back as a question on the first attempt so the suite can see
 * the gate's `giveaway` check refuse it: a line saying the word for the learner
 * may never reach the screen. Everything it is asked goes to `STUB_MODEL_LOG`,
 * one JSON line per request, so the suite can read what the composer was told.
 *
 * Every other host is passed straight through to the real `fetch`.
 */
import { appendFileSync } from "node:fs";

const realFetch = globalThis.fetch;
const LOG = process.env.STUB_MODEL_LOG ?? "";

/** Questions the dictionary holds as phrase entries, asked in turn. */
const ASKS = ["Kuidas läheb?", "Mis kell on?", "Kas ma võin küsida?", "Kui palju see maksab?"];
let asked = 0;

function note(entry) {
  if (!LOG) return;
  try {
    appendFileSync(LOG, `${JSON.stringify(entry)}\n`);
  } catch {
    // A log that cannot be written is a suite that reads nothing, which it reports.
  }
}

/** The line the composer would have written for this request. */
function lineFor(system) {
  const move = /Your move: (\w+)\./.exec(system)?.[1] ?? "";
  const elicit = /The word they should get to use is "([^"]+)"/.exec(system)?.[1] ?? null;
  const retry = /Your last line did not get through/.test(system);
  if (move === "greet") return "Tere!";
  if (move === "close") return "Head aega!";
  if (move === "ask") {
    // First attempt on a chat beat: the word itself, which the gate must withhold.
    if (elicit && !retry) return `${elicit.charAt(0).toUpperCase()}${elicit.slice(1)}?`;
    const line = ASKS[asked % ASKS.length];
    asked += 1;
    return line;
  }
  return "Selge.";
}

function sse(text) {
  const frames = [
    { choices: [{ delta: { content: text } }] },
    { choices: [], usage: { prompt_tokens: 400, completion_tokens: 8, total_tokens: 408 } },
  ];
  const body = frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

globalThis.fetch = async function stubbed(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith("https://generativelanguage.googleapis.com/")) return realFetch(input, init);

  // No entry is ever held, so the composer answers through the plain transport.
  if (url.includes("/cachedContents")) {
    if ((init?.method ?? "GET").toUpperCase() === "GET") {
      return new Response(JSON.stringify({ cachedContents: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: { message: "stubbed: nothing is held" } }), { status: 400 });
  }

  const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}");
  const system = body.messages?.find((m) => m.role === "system")?.content ?? "";
  if (body.stream) {
    const line = lineFor(system);
    note({ kind: "compose", system, line, messages: (body.messages ?? []).filter((m) => m.role !== "system") });
    return sse(line);
  }
  // A JSON call on the grader's chain: the judge says no, the consistency check says yes, and a note is nothing.
  note({ kind: "json", system: system.slice(0, 200) });
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ done: false, ok: true }) } }],
    usage: { prompt_tokens: 200, completion_tokens: 6, total_tokens: 206 },
  }), { status: 200, headers: { "content-type": "application/json" } });
};
