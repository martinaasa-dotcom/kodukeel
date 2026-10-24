import { readFileSync } from "node:fs";

import { baseUrl, suite } from "./lib/checks.mjs";
import { check as fits } from "./lib/jsonSchema.mjs";

/*
  THE v1 CONTRACT, ASKED OF A RUNNING SERVER (ADR-029).

  The unit tests hold the zod schemas, the examples and the baseline to each
  other; none of that says a route really answers in the shape it promises,
  with the headers it promises, behind the door it promises. So this calls
  each route over HTTP the way a client written against
  `public/api/v1.schema.json` would, and checks every answer against that
  file with the same reader the mock uses.

  HTTP only, no browser: nothing here needs a DOM.

  MODE IS DETECTED, AS `test-security.mjs` DOES. With no Supabase keys the app
  is one local learner and a v1 route answers without a token, exactly as a web
  route does; with them, a route that needs one answers 401 without it. Each
  mode checks what it can reach and waives the rest, saying which.

  Every later N item extends this file with its own routes. A route that
  writes is called against the demo deck, which is why this suite runs in the
  shard of suites that write, after the ones that want the fixture as it was.
*/

const B = baseUrl();
const published = JSON.parse(readFileSync("public/api/v1.schema.json", "utf8"));

// Floor: measured against a local-mode build, which is what the browser job runs.
const { check, absent, done } = suite("The v1 API", { floor: 13 });

async function call(method, path, { body, headers = {} } = {}) {
  const res = await fetch(`${B}${path}`, {
    method,
    redirect: "manual",
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON, said by the check that reads it */ }
  return { status: res.status, headers: res.headers, json, text };
}

/** The schema-file problems with an answer, as one line, or an empty string. */
function misfit(key, json) {
  const schema = published.routes[key]?.response;
  if (!schema) return `${key} has no response schema`;
  return fits(json, schema).slice(0, 3).join("; ");
}

function errorShaped(json) {
  return fits(json, published.errors.body).length === 0;
}

// ── Which app is this ────────────────────────────────────────────────────────

const probe = await call("GET", "/api/reminder");
const hosted = probe.status === 401 || probe.status === 307 || probe.status === 302;
console.log(`\n  Looking at a ${hosted ? "hosted" : "local-mode"} deployment (/api/reminder answered ${probe.status}).\n`);

// ── The published contract ───────────────────────────────────────────────────

const file = await call("GET", "/api/v1.schema.json");
check("the published schema is served to somebody with no session", file.status === 200 && file.json?.version === 1, `status ${file.status}`);

// ── GET /api/v1/meta ─────────────────────────────────────────────────────────

const meta = await call("GET", "/api/v1/meta");
check("meta answers with no token", meta.status === 200, `status ${meta.status}`);
check("meta fits its published schema", meta.status === 200 && misfit("GET /api/v1/meta", meta.json) === "", misfit("GET /api/v1/meta", meta.json));
check("meta is never kept", meta.headers.get("cache-control") === "no-store", meta.headers.get("cache-control") ?? "no cache-control");
check("meta says the mode this suite detected", meta.json?.mode === (hosted ? "hosted" : "local"), `meta says ${meta.json?.mode}`);
check("meta sets no cookie", meta.headers.get("set-cookie") === null);
check(
  "meta names no key: every sign-in is a yes or a no",
  meta.json !== null && Object.values(meta.json.signIn ?? {}).every((v) => typeof v === "boolean"),
);

const badBuild = await call("GET", "/api/v1/meta", { headers: { "x-kodukeel-build": "windows/3" } });
check("a build header nobody can read is refused in the error shape", badBuild.status === 400 && errorShaped(badBuild.json) && badBuild.json.error.code === "invalid", `status ${badBuild.status}`);
const goodBuild = await call("GET", "/api/v1/meta", { headers: { "x-kodukeel-build": "ios/999999" } });
check("a build above any minimum is answered", goodBuild.status === 200, `status ${goodBuild.status}`);

// ── No other site may call it ────────────────────────────────────────────────

const preflight = await fetch(`${B}/api/v1/meta`, {
  method: "OPTIONS",
  headers: { origin: "https://elsewhere.example", "access-control-request-method": "GET", "access-control-request-headers": "authorization" },
});
check("no CORS grant is ever sent, so another site's page cannot read a v1 answer", preflight.headers.get("access-control-allow-origin") === null);

// ── GET /api/v1/me ───────────────────────────────────────────────────────────

if (!hosted) {
  const me = await call("GET", "/api/v1/me");
  check("me answers the local learner on a local install", me.status === 200 && me.json?.id === "local-single-user", `status ${me.status}`);
  check("me fits its published schema", misfit("GET /api/v1/me", me.json) === "", misfit("GET /api/v1/me", me.json));
  check("me is never kept", me.headers.get("cache-control") === "no-store");
} else {
  absent(3, "a signed-in token, which a hosted deployment needs and this suite does not mint (the 401 below is checked instead)");
}

// ── Every route that needs a token refuses without one ────────────────────────

const needsToken = Object.values(published.routes).filter((r) => r.auth && !r.draft);
if (hosted) {
  for (const route of needsToken) {
    const path = route.path.replace(/\{\w+\}/g, "x");
    const res = await call(route.method, path, route.request ? { body: {} } : {});
    check(`${route.method} ${route.path} answers 401 unauthenticated with no token`, res.status === 401 && res.json?.error?.code === "unauthenticated", `status ${res.status}`);
  }
} else {
  absent(needsToken.length, "a hosted deployment, where a route refuses a request with no token (local mode has one learner and no tokens)");
}

done();
