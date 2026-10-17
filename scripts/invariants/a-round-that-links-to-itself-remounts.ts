import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LINK TO THE PAGE YOU ARE ON DOES NOTHING, SO NO SCREEN MAY OFFER ONE BARE.
 *
 * Väljendid ended on "Another set", a link to `/review/sayings?set=n`, and the
 * press changed the address and left the finished screen where it was. It was
 * not one screen: sixteen rounds ended on "Another round" or "Play again" as a
 * link to their own path, and in a browser not one of them started a new
 * round. A soft navigation to the same route keeps every client component
 * whose place in the tree holds still, so a round that keeps its state in one
 * goes on being the round that ended (`lib/ux/again.ts`).
 *
 * Three arms, each made to fail on the real fault first.
 *
 * 1. No client component under `app/` links, by `href` or by `router.push` or
 *    `router.replace`, to its own route, unless it is named below with the
 *    reason it is safe. The way to another round is `AnotherRound`, which
 *    types no path. The exemptions are checked for staleness in both
 *    directions, and the two rounds among them have to be keyed by their page.
 * 2. A page whose round offers `AnotherRound` draws that round through
 *    `BeforeYouStart` or `FreshRound`, or the new address mounts nothing new.
 * 3. `BeforeYouStart` draws its children through `FreshRound`, and
 *    `FreshRound` keys them on the parameter `againHref` changes.
 */
const EXEMPT: Record<string, string> = {
  "app/(app)/review/openers/OpenersSession.tsx":
    "names its stage in the address and its page keys the session on stage and round",
  "app/(app)/review/twenty/TwentySession.tsx":
    "names the next thing in the address and its page keys the session on it",
  "app/(app)/dictionary/DictionaryClient.tsx":
    "a search: the entry is drawn from props and the box follows `?q=` during render",
  "app/(app)/class/ClassForms.tsx":
    "leaving and archiving are drawn on a class's own page and go back to the list, then refresh",
  "app/(app)/calendar/CalendarWeek.tsx":
    "the week is drawn from props; the only state is the add form's own draft",
};

/** The URL path a file under `app/` is served at, route groups dropped. */
function routeOf(file: string): string {
  const dir = file.replace(/\/[^/]+$/, "").replace(/^app/, "");
  return dir.split("/").filter((s) => s && !/^\(.*\)$/.test(s)).map((s) => `/${s}`).join("");
}

function linksToSelf(src: string, route: string): boolean {
  if (!route || /\[/.test(route)) return false;
  const path = route.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const target = `["'\`]${path}(?:[?"'\`]|\\$\\{)`;
  return new RegExp(`href=\\{?${target}`).test(src)
    || new RegExp(`router\\.(?:push|replace)\\(\\s*${target}`).test(src);
}

export default function aRoundThatLinksToItselfRemounts({ check, ALL, code }: InvariantKit) {
  const client = ALL.filter((f) => f.startsWith("app/") && f.endsWith(".tsx") && /^\s*["']use client["']/.test(code(f)));

  check("no client screen links to its own page bare: another round goes through AnotherRound", () => {
    const self = client.filter((f) => linksToSelf(code(f), routeOf(f)));
    const unexplained = self.filter((f) => !(f in EXEMPT));
    const stale = Object.keys(EXEMPT).filter((f) => !self.includes(f));
    assert.ok(client.length >= 60, `read ${client.length} client components, expected at least 60`);
    assert.deepEqual(unexplained, [], `${unexplained.join(", ")} link to their own page; use AnotherRound, or name the file with the reason it is safe`);
    assert.deepEqual(stale, [], `${stale.join(", ")} are exempt but no longer link to their own page; take them off the list`);
  });

  check("an exempt round that links to its own page is keyed by that page", () => {
    const faults: string[] = [];
    for (const file of Object.keys(EXEMPT).filter((f) => /Session\.tsx$/.test(f))) {
      const name = file.split("/").pop()!.replace(/\.tsx$/, "");
      const page = file.replace(/[^/]+$/, "page.tsx");
      const render = existsSync(page) ? code(page).match(new RegExp(`<${name}\\b[^>]*>`, "s"))?.[0] ?? "" : "";
      if (!/\bkey=/.test(render)) faults.push(`${page}: <${name}> carries no key`);
    }
    assert.deepEqual(faults, []);
  });

  check("a round that offers AnotherRound is drawn through BeforeYouStart or FreshRound", () => {
    // RoundDone draws AnotherRound for the rounds that end on it.
    const offering = client.filter((f) => /<(?:AnotherRound|RoundDone)\b/.test(code(f)));
    const faults = offering.filter((f) => {
      const page = f.replace(/[^/]+$/, "page.tsx");
      return !existsSync(page) || !/<(?:BeforeYouStart|FreshRound)\b/.test(code(page));
    });
    assert.ok(offering.length >= 16, `found ${offering.length} rounds offering AnotherRound, expected at least 16`);
    assert.deepEqual(faults, []);
  });

  check("BeforeYouStart keys its round on the parameter another round changes", () => {
    const briefing = code("components/round/Briefing.tsx");
    assert.match(briefing, /return <FreshRound>\{children\}<\/FreshRound>/);
    const fresh = code("components/round/FreshRound.tsx");
    assert.match(fresh, /get\(ROUND_PARAM\)/);
    assert.match(fresh, /<Fragment key=\{round\}>/);
    assert.match(code("components/round/AnotherRound.tsx"), /againHref\(/);
  });
}
