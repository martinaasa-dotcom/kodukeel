/**
 * A STAND-IN FOR THE v1 API, SO A NATIVE APP CAN BE BUILT BEFORE THE ROUTES
 * EXIST.
 *
 *   npm run api:mock                 # http://localhost:4010
 *   MOCK_PORT=5000 npm run api:mock
 *
 * It answers every route in `public/api/v1.schema.json`, shipped and drafted,
 * with that route's example from `lib/api/examples/`, in the same error shape
 * the real routes use: 401 `unauthenticated` for a route that needs a token
 * and was sent none, 400 `invalid` for a body its schema refuses, and 404
 * `not_found` for a path no route answers. A drafted route carries
 * `X-Kodukeel-Draft: 1`, because its shape may still change. Any bearer token
 * is accepted, since there is no account behind it.
 *
 * It holds no data and keeps nothing between requests: a grade posted to it
 * is checked against its schema and answered with the example, and the next
 * fetch of the queue is the same queue. It runs on a developer's machine and
 * nowhere else.
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

import { check, routeFor } from "./lib/jsonSchema.mjs";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const published = JSON.parse(readFileSync("public/api/v1.schema.json", "utf8"));

function error(res, status, code, message) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify({ error: { code, message } }));
}

/** Half a second of silence, so a speaker button has something to play. */
function silentWav() {
  const rate = 16000;
  const samples = rate / 2;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (req.method === "GET" && url.pathname === "/api/v1.schema.json") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(published));
    return;
  }
  const found = routeFor(published.routes, req.method ?? "GET", url.pathname);
  if (!found) return error(res, 404, "not_found", "No route answers that.");
  const { route } = found;
  if (route.auth && !/^Bearer\s+\S+/i.test(req.headers.authorization ?? "")) {
    return error(res, 401, "unauthenticated", "Sign in again to carry on.");
  }
  if (route.request) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = null;
    try {
      body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
    } catch {
      return error(res, 400, "invalid", "That request didn't come through properly.");
    }
    const problems = check(body, route.request);
    if (problems.length > 0) return error(res, 400, "invalid", problems.slice(0, 3).join("; "));
  }
  const headers = { "cache-control": "no-store", ...(route.draft ? { "x-kodukeel-draft": "1" } : {}) };
  if (route.contentType !== "application/json") {
    res.writeHead(200, { ...headers, "content-type": route.contentType });
    res.end(silentWav());
    return;
  }
  res.writeHead(200, { ...headers, "content-type": "application/json" });
  res.end(readFileSync(join("lib/api/examples", route.example)));
});

server.listen(PORT, () => {
  const count = Object.keys(published.routes).length;
  console.log(`Kodukeel API mock on http://localhost:${PORT}, answering ${count} routes. Any bearer token is accepted.`);
});
