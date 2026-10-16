import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { SIGNED_IN_REFERENCE, isPublicReference } from "../../lib/ux/publicReference";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE GRAMMAR REFERENCE IS READABLE SIGNED OUT, AND READS NOBODY WHILE IT IS
 * (FB-8, D7).
 *
 * Five pages under `/grammar` are let past the gate with no session, by an
 * exact predicate rather than a prefix, because three pages beside them read a
 * learner's own words and stay signed in. Three things hold that together.
 *
 * The gate and the filesystem agree: every route under `app/(app)/grammar` is
 * public exactly when it is not one of the three, and the middleware asks the
 * predicate. The sitemap and the gate agree: every path the sitemap lists is
 * one the gate lets through, so a crawler is never sent to a sign-in form.
 *
 * And the signed-out branch reads no owner id. Each of the five pages resolves
 * its reader through `viewerId`, never `requireUserId`, which throws for
 * nobody and would turn the public page into an error; every read that takes
 * an owner is asked only behind `viewer ?`; and the three example readers that
 * accept a null owner skip the deck read when they are handed one, so what a
 * stranger is shown is the dictionary's own words and nothing from anybody's
 * deck.
 */
const PAGES = [
  "app/(app)/grammar/page.tsx",
  "app/(app)/grammar/cases/page.tsx",
  "app/(app)/grammar/[caseKey]/page.tsx",
  "app/(app)/grammar/topic/[id]/page.tsx",
  "app/(app)/grammar/build-a-word/page.tsx",
];

/** Reads that take an owner and have no null branch of their own. */
const OWNER_READS = ["caseReviewsFor", "familyStandings", "localeFor", "readSettings", "courseLevelFor"];

/** Readers that take a null owner and must skip the deck when handed one. */
const NULL_SAFE = {
  caseExamples: "lib/progress/caseExamples.ts",
  caseWalk: "lib/progress/caseWalk.ts",
  verbExamples: "lib/progress/verbExamples.ts",
} as const;

export default function theGrammarReferenceIsPublic({ check, code }: InvariantKit) {
  check("the gate lets exactly the public grammar pages through, and the sitemap names nothing it refuses", () => {
    const middleware = code("middleware.ts");
    const list = middleware.slice(middleware.indexOf("const isPublicPath"), middleware.indexOf("const signedOut"));
    assert.ok(list.length > 200, "middleware.ts no longer has a public path list to read");
    assert.match(list, /\|\|\s*isPublicReference\(path\)/, "isPublicPath no longer asks isPublicReference, so the grammar reference redirects a stranger");

    // Every route the filesystem has under /grammar, by its shape.
    const routes: string[] = [];
    const walk = (dir: string, url: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const seg = entry.name.startsWith("[") ? `x${entry.name.slice(1, -1)}` : entry.name;
          walk(join(dir, entry.name), `${url}/${seg}`);
        } else if (entry.name === "page.tsx") routes.push(url);
      }
    };
    walk("app/(app)/grammar", "/grammar");
    assert.ok(routes.length >= 8, `only ${routes.length} grammar routes found, so this stopped looking`);
    for (const route of routes) {
      const first = route.split("/")[2];
      const meant = !(SIGNED_IN_REFERENCE as readonly string[]).includes(first ?? "");
      assert.equal(isPublicReference(route), meant, `${route} is ${meant ? "not public" : "public"}, and the reference says otherwise`);
    }
    for (const outside of ["/grammarx", "/grammar/topic/a/b", "/review", "/grammar/exceptions/stem"]) {
      assert.equal(isPublicReference(outside), false, `${outside} is let through by the grammar predicate`);
    }

    const sitemap = code("app/sitemap.ts");
    const literal = [...sitemap.matchAll(/path: "(\/[^"]*)"/g)].map((m) => m[1]!);
    const prefixes = [...middleware.matchAll(/path\.startsWith\("([^"]+)"\)/g)].map((m) => m[1]!);
    for (const path of literal) {
      const through = prefixes.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`)) || isPublicReference(path);
      assert.ok(through, `the sitemap lists ${path}, which the gate sends to sign-in`);
    }
    assert.ok(literal.includes("/grammar"), "the sitemap no longer lists the grammar reference");
    assert.match(sitemap, /allCaseReferences\(\)\.map/, "the sitemap lost its page per case");
    assert.match(sitemap, /TOPIC_NOTES\.map/, "the sitemap lost its page per topic");
  });

  check("a public grammar page reads no owner id signed out", () => {
    for (const file of PAGES) {
      assert.ok(existsSync(file), `${file} has moved, so this stopped looking`);
      const page = code(file);
      assert.ok(!/requireUserId|titleFor\(/.test(page), `${file} resolves an owner with requireUserId, which throws for a reader with no account`);
      assert.match(page, /const viewer = await viewerId\(\)/, `${file} does not ask viewerId who is reading`);
      assert.match(page, /<PublicReference\b/, `${file} draws no public frame for a reader with no account`);
      for (const read of OWNER_READS) {
        for (const m of page.matchAll(new RegExp(`\\b${read}\\(\\s*viewer\\b`, "g"))) {
          const before = page.slice(Math.max(0, m.index! - 40), m.index!);
          assert.match(before, /viewer \?\s*$/, `${file} calls ${read}(viewer) without asking whether there is a viewer`);
        }
        assert.ok(!new RegExp(`\\b${read}\\(\\s*(ownerId|owner)\\b`).test(page), `${file} hands ${read} an owner id the public branch does not have`);
      }
    }
    for (const [fn, file] of Object.entries(NULL_SAFE)) {
      const source = code(file);
      assert.match(source, new RegExp(`function ${fn}\\(\\s*(\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?ownerId: string \\| null`), `${fn} no longer takes a null owner`);
      if (fn !== "caseWalk") {
        assert.match(source, /ownerId === null \? \[\]/, `${file} reads a deck for a reader with no account`);
      }
    }
    // A word on the reference opens the dictionary, which needs an account: for a stranger it is the word alone.
    assert.match(code("components/course/WordLink.tsx"), /usePublicReader\(\)[\s\S]*?if \(focus \|\| publicReader\)/,
      "WordLink links a reader with no account into the dictionary");
    const layout = code("app/(app)/layout.tsx");
    assert.match(layout, /if \(!viewer\) return <>\{children\}<\/>/, "the shell no longer stands down for a reader with no account");
  });
}
