import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { SHIPPED_ROUTES } from "../../lib/api/contract";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * ONE BODY, TWO DOORS (D2, ADR-029).
 *
 * A v1 route and the Server Action or page that does the same thing call one
 * function in `lib/`, which takes the owner as a parameter. The route resolves
 * the owner from a token and parses its body; it does nothing else. So a second
 * copy of a rule cannot arrive by the door that is easier to write: a route
 * that read the database itself, or called a helper the web never calls, is a
 * second answer to a question the web already answers, and the one nobody is
 * watching is the one that drifts.
 *
 * Five arms, because each is a different way the rule fails quietly:
 *
 * 1. No v1 route imports the database client, Prisma, or anything from `app/`.
 * 2. Every `lib/` name a v1 route imports to do its work is also named by a file
 *    the web serves (an action, a page, a component, another route), outside the
 *    door's own plumbing (`lib/api/`, the bearer check in `lib/auth/`, the mode,
 *    `lib/security/`, the shared limiter and `lib/observability/`).
 * 3. Every v1 route runs the build check, through `requireBearerUser` or, on a
 *    route that needs no token, `refuseOldBuild`.
 * 4. The contract and the routes agree: every shipped route has a file that
 *    exports its method, and every file and method under `app/api/v1/` is a
 *    shipped route.
 * 5. `lib/api/` itself holds no logic a route could hide behind: outside its
 *    tests it imports only zod, its own files and a short list of pure helpers.
 */
const DOOR = [
  /^@\/lib\/api\//,
  /^@\/lib\/auth\/bearer$/,
  /^@\/lib\/auth\/mode$/,
  /^@\/lib\/security\//,
  /^@\/lib\/usage\/sharedLimit$/,
  /^@\/lib\/observability\//,
];

const LIB_API_MAY_IMPORT = [
  /^zod$/,
  /^\.\//,
  /^@\/lib\/security\/(headers|body)$/,
  /^@\/lib\/security\/redact$/,
  /^@\/lib\/usage\/switches$/,
  /^@\/lib\/speech\/model$/,
  // The native recordings are a pure catalog (D1: the clip list is the app's
  // own and a phone reads it as it is), and GET /api/v1/recordings lists it.
  /^@\/lib\/audio\/native$/,
];

function routeFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...routeFiles(full));
    else if (/^route\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** A route file's path as the contract writes it: a `[id]` folder becomes `{id}`. */
function pathOf(file: string): string {
  return "/" + file.replace(/^app\//, "").replace(/\/route\.tsx?$/, "").replace(/\[([^\]]+)\]/g, "{$1}");
}

function importsOf(src: string): { names: string[]; from: string }[] {
  const out: { names: string[]; from: string }[] = [];
  for (const m of src.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g)) {
    if (m[1]) continue;
    const clause = m[2]!;
    const braced = /\{([\s\S]*)\}/.exec(clause)?.[1] ?? "";
    const names = braced.split(",")
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith("type "))
      .map((part) => part.split(/\s+as\s+/)[0]!.trim());
    const bare = clause.replace(/\{[\s\S]*\}/, "").replace(/,/g, " ").trim();
    if (bare && !bare.startsWith("*")) names.push(bare);
    out.push({ names, from: m[3]! });
  }
  return out;
}

export default function oneBodyTwoDoors({ check, code, APP, LIB }: InvariantKit) {
  const routes = routeFiles(join("app", "api", "v1"));

  check("a v1 route imports no database client and nothing from a page", () => {
    // One file per path, which may answer more than one method.
    const paths = new Set(SHIPPED_ROUTES.map((r) => r.path)).size;
    assert.ok(routes.length >= paths && routes.length >= 1,
      `found ${routes.length} v1 route files for ${paths} shipped paths, so this stopped looking`);
    for (const file of routes) {
      const src = code(file);
      assert.doesNotMatch(src, /from ["']@\/lib\/db["']|from ["']@prisma\/client["']|\bprisma\./, `${file} reaches the database itself; call the function the web calls instead`);
      assert.doesNotMatch(src, /from ["']@\/app\//, `${file} imports from app/, which is a page's or an action's, not a shared body`);
    }
  });

  check("every lib function a v1 route calls is one the web calls too", () => {
    /*
      Read with the web: `lib/progress/grading.ts`, which is `gradeCard`'s own
      body moved out of `app/actions.ts` so a conversation's finish could grade
      the same way from either door (N-5). What it calls the web calls, through
      the one action, and the action is held to calling it, so a moved body
      does not read as a second one.
    */
    const MOVED_WEB_BODIES: Record<string, RegExp> = {
      "lib/progress/grading.ts": /\breturn gradeFor\(ownerId,/,
    };
    for (const [body, call] of Object.entries(MOVED_WEB_BODIES)) {
      assert.match(code("app/actions.ts"), call, `app/actions.ts no longer calls ${body}, so it is not the web's body any more; take it off`);
    }
    const web = [
      ...APP.filter((f) => !f.startsWith("app/api/v1/") && /\.(ts|tsx)$/.test(f) && !/\.(test|itest)\./.test(f)),
      ...Object.keys(MOVED_WEB_BODIES),
    ].map((f) => code(f)).join("\n");
    let looked = 0;
    const alone: string[] = [];
    for (const file of routes) {
      for (const { names, from } of importsOf(code(file))) {
        if (!from.startsWith("@/lib/") || DOOR.some((door) => door.test(from))) continue;
        for (const name of names) {
          looked += 1;
          if (!new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}(?![\\w$])`).test(web)) alone.push(`${file}: ${name} from ${from}`);
        }
      }
    }
    assert.ok(looked >= 2, `only ${looked} lib names read off the v1 routes, so this stopped looking`);
    assert.deepEqual(alone, [], "a v1 route calls a lib function no web door calls, which is a second body for the same work");
  });

  check("every v1 route checks the native build before anything else", () => {
    for (const file of routes) {
      assert.match(code(file), /\brequireBearerUser\(|\brefuseOldBuild\(/, `${file} never asks whether this native build is still answered`);
    }
  });

  check("the contract names every v1 route, and every shipped route has its file", () => {
    const served = new Set<string>();
    for (const file of routes) {
      for (const m of code(file).matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE)\b/g)) {
        served.add(`${m[1]} ${pathOf(file)}`);
      }
    }
    const promised = new Set(SHIPPED_ROUTES.map((r) => `${r.method} ${r.path}`));
    assert.deepEqual([...served].filter((k) => !promised.has(k)), [], "a v1 route answers with no schema in lib/api/contract.ts");
    assert.deepEqual([...promised].filter((k) => !served.has(k)), [], "lib/api/contract.ts promises a route nothing serves");
  });

  check("lib/api holds the contract and the door, and no logic a route could hide behind", () => {
    const files = LIB.filter((f) => f.startsWith("lib/api/") && /\.ts$/.test(f) && !/\.(test|itest)\.ts$/.test(f));
    assert.ok(files.length >= 6, `only ${files.length} files under lib/api, so this stopped looking`);
    for (const file of files) {
      for (const { from } of importsOf(code(file))) {
        assert.ok(LIB_API_MAY_IMPORT.some((ok) => ok.test(from)), `${file} imports ${from}; lib/api may only hold the contract and the door`);
      }
    }
  });
}
