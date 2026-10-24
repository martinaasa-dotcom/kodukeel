import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { notificationFor } from "@/lib/push/notification";
import type { Letter } from "@/lib/email/letter";
import { NATIVE_SCREENS, ROUTES, resolveLink } from "./routes";

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...files(path));
    else if (/\.tsx?$/.test(name) && !/\.(test|itest)\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

/**
 * Every web page the app has, as its own folders spell it: `app/(app)/course/lessons/[id]/page.tsx`
 * is `/course/lessons/[id]`, with the route groups dropped.
 */
function pageRoutes(): string[] {
  return files("app")
    .filter((f) => /\/page\.tsx$/.test(f))
    .map((f) => f.replace(/^app/, "").replace(/\/page\.tsx$/, "").replace(/\/\([^/]+\)/g, "") || "/");
}

/** A sample path for a pattern: each named segment filled with a stand-in. */
function sample(route: string): string {
  return route.replace(/\[\.\.\.\w+\]/g, "a/b").replace(/\[\w+\]/g, "x");
}

/**
 * Every link a letter builds, read off the source: each `${...origin}/path`
 * with what follows the origin, the interpolations in the path filled with a
 * stand-in. Read from the files rather than from built letters, so a letter
 * added with a new link is found whatever inputs it needs.
 */
function letterLinks(): { path: string; file: string }[] {
  const sources = [...files("lib/email"), "lib/progress/mailout.ts"];
  const out: { path: string; file: string }[] = [];
  for (const file of sources) {
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/\$\{[\w.]*origin\}(\/[^`\s"']*)/gi)) {
      const path = m[1]!.replace(/\$\{[^}]*\}/g, "x");
      out.push({ path, file });
    }
  }
  return out;
}

describe("one table of links", () => {
  it("decides every page the web has", () => {
    const routes = pageRoutes();
    expect(routes.length).toBeGreaterThan(90);
    const undecided = routes.filter((r) => resolveLink(sample(r)) === null);
    expect(undecided).toEqual([]);
  });

  it("decides every link a letter builds", () => {
    const links = letterLinks();
    expect(links.length).toBeGreaterThanOrEqual(15);
    const undecided = links.filter((l) => resolveLink(l.path) === null).map((l) => `${l.file}: ${l.path}`);
    expect(undecided).toEqual([]);
  });

  it("decides the path a notification carries, the fallback included", () => {
    const origin = "https://kodukeel.ee";
    const letter = (href: string) => ({
      kind: "tonight", subject: "Today's module", preheader: "Five new words",
      blocks: [{ t: "button", label: "Open", href }],
    }) as unknown as Letter;
    for (const href of [`${origin}/course`, `${origin}/review/match`, "https://elsewhere.example/x"]) {
      const { url } = notificationFor(letter(href), origin);
      expect(resolveLink(url), url).not.toBeNull();
    }
    expect(notificationFor(letter("https://elsewhere.example/x"), origin).url).toBe("/");
  });

  it("opens the screens a native app has, and sends the rest to the browser", () => {
    expect(resolveLink("/course")?.home).toBe("today");
    expect(resolveLink("/learn")?.home).toBe("today");
    expect(resolveLink("/course/lessons/l1-3")).toMatchObject({ home: "lesson", params: { id: "l1-3" } });
    expect(resolveLink("/review")?.home).toBe("review");
    expect(resolveLink("/review/match")?.home).toBe("browser");
    expect(resolveLink("/situations/kohvikus")).toMatchObject({ home: "conversation", params: { id: "kohvikus" } });
    expect(resolveLink("/situations")?.home).toBe("browser");
    expect(resolveLink("/dictionary")?.home).toBe("dictionary");
    expect(resolveLink("/dictionary?q=lumi")).toMatchObject({ home: "entry", query: { q: "lumi" } });
    expect(resolveLink("/dictionary?q=p%C3%B5hi#forms")).toMatchObject({ home: "entry", query: { q: "põhi" } });
    expect(resolveLink("/progress")?.home).toBe("progress");
    expect(resolveLink("/progress/readiness")?.home).toBe("browser");
    expect(resolveLink("/settings?tab=account#email")).toMatchObject({ home: "settings", query: { tab: "account" } });
    expect(resolveLink("/auth/callback?code=abc")?.home).toBe("sign-in");
    expect(resolveLink("/learn/kodu")?.home).toBe("browser");
    expect(resolveLink("/")?.home).toBe("browser");
  });

  it("has no row that takes everything, and refuses what is not a path here", () => {
    expect(resolveLink("/no-such-place")).toBeNull();
    expect(resolveLink("//elsewhere.example/x")).toBeNull();
    expect(resolveLink("https://kodukeel.ee/course")).toBeNull();
    expect(ROUTES.some((r) => r.pattern === "/[...rest]")).toBe(false);
  });

  it("names every native screen in at least one row", () => {
    const named = new Set(ROUTES.flatMap((r) => [r.home, r.withQuery?.home]));
    for (const screen of NATIVE_SCREENS) expect(named.has(screen), screen).toBe(true);
  });
});
