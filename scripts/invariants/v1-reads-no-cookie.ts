import assert from "node:assert/strict";

import { SHIPPED_ROUTES } from "../../lib/api/contract";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A v1 ROUTE READS A BEARER TOKEN AND NEVER A COOKIE (D3, ADR-029).
 *
 * A cookie is an ambient credential: a browser sends it to this site whatever
 * page asked, which is what the forged-request gate exists to police. A v1
 * route takes `Authorization: Bearer` and nothing else, so a stolen web session
 * drives no route here and a page on another site has nothing to forge with.
 * The natural thing to write is a fallback to the cookie when the header is
 * missing, and that is the shape this exists to refuse.
 *
 * Four arms. No v1 route reaches the web's session (`requireUserId`,
 * `viewerId`, `currentLearner`, `currentIdentity`, `cookies()`, the cookie
 * client); every route the contract marks as needing a token resolves its
 * owner through `requireBearerUser`; the bearer module itself reads no cookie;
 * and every v1 answer goes through `apiJson` or `apiError`, which are the
 * two that say `no-store`, so no response can be kept by a cache in between.
 */
export default function v1ReadsNoCookie({ check, code, APP }: InvariantKit) {
  const routes = APP.filter((f) => /^app\/api\/v1\/.*\/route\.tsx?$/.test(f));

  check("no v1 route reaches the web's session or a cookie", () => {
    assert.ok(routes.length >= 2, `found only ${routes.length} v1 routes, so this stopped looking`);
    for (const file of routes) {
      const src = code(file);
      assert.doesNotMatch(src, /\b(requireUserId|viewerId|currentLearner|currentIdentity)\b/, `${file} resolves its owner from the web's cookie session`);
      assert.doesNotMatch(src, /from ["']next\/headers["']|from ["']@\/lib\/supabase\/server["']|from ["']@supabase\/ssr["']/, `${file} imports a cookie reader`);
      assert.doesNotMatch(src, /\.cookies\b|headers\.get\(\s*["']cookie["']/i, `${file} reads a cookie`);
    }
  });

  check("every v1 route that needs a token resolves its owner through requireBearerUser", () => {
    const needs = SHIPPED_ROUTES.filter((r) => r.auth);
    assert.ok(needs.length >= 1, "no shipped route needs a token, so this stopped looking");
    for (const route of needs) {
      const file = `app${route.path.replace(/\{([^}]+)\}/g, "[$1]")}/route.ts`;
      assert.ok(routes.includes(file), `${route.method} ${route.path} has no route file at ${file}`);
      assert.match(code(file), /\brequireBearerUser\(request\)/, `${file} answers ${route.method} without reading the bearer token`);
    }
  });

  check("the bearer check reads no cookie and has no fallback to one", () => {
    const bearer = code("lib/auth/bearer.ts");
    assert.match(bearer, /headers\.get\("authorization"\)/, "lib/auth/bearer.ts no longer reads the Authorization header");
    assert.doesNotMatch(bearer, /cookie/i, "lib/auth/bearer.ts mentions a cookie, which is the fallback D3 forbids");
    assert.doesNotMatch(bearer, /from ["']@supabase\/ssr["']|from ["']next\/headers["']/, "lib/auth/bearer.ts builds a cookie client");
  });

  check("every v1 answer goes through apiJson or apiError, so none can be kept", () => {
    for (const file of routes) {
      assert.doesNotMatch(code(file), /\bnew (?:Next)?Response\(|\bResponse\.json\(|\bNextResponse\b/, `${file} builds a response itself; answer through apiJson or apiError, which say no-store`);
    }
  });
}
