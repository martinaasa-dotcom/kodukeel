/*
  WHAT A REVIEWER WOULD SEE, ASKED OF A DEPLOYED ADDRESS BEFORE THE EMAIL GOES.

  The operator sends the Institute of the Estonian Language and each ministry
  one link, /partners, and everything a reviewer reads from there has to be true
  on the deployment that day (docs/44-sixth-batch.md, S-7 and section 8). This
  asks it over HTTP, as a stranger with no account would, and prints a pass or a
  fail per line. It exits non-zero on any fail, so "send nothing until it
  passes" is a command rather than a hope.

    node scripts/check-show-ready.mjs https://kodukeel.ee
    node scripts/check-show-ready.mjs https://kodukeel.ee --demo https://demo.kodukeel.ee --budget-ms 1500

  It reads nothing private and carries no credentials. It is not a suite CI
  runs, because it asks a deployed address rather than the build in front of
  it (scripts/lib/suites.mjs says so).

  WHAT IT CANNOT SEE IS SAID, NOT PASSED. The dictionary is behind a sign-in on
  a hosted deployment, so a signed-out visitor cannot reach an entry there to
  read its credit. The demo is local mode and can, so the credit is asked of
  the demo (`--demo`, or the address /partners links under "Try it"); with no
  demo named it fails and says why, because a line nobody checked is not a line
  that holds. The demo's banner is asked only where a demo is named, which is
  the only state the brief asks it in.

  THE FIRST BYTE IS MEASURED FIRST, before anything else here has asked the
  deployment for a page, so it is as near to cold as a script on the outside
  can make it. It is held to `--budget-ms`, 2000 by default: N-1 records cold
  first-byte figures on a production build, and once it has, pass the figure it
  recorded for a public page plus the network between you and the host.
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { suite } from "./lib/checks.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const site = (positional[0] ?? process.env.BASE_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(site)) {
  console.log("Give the deployment's address: node scripts/check-show-ready.mjs https://kodukeel.ee [--demo URL] [--budget-ms N]");
  process.exit(2);
}
const budgetMs = Number(flag("--budget-ms") ?? 2000);
let demo = (flag("--demo") ?? process.env.DEMO_URL ?? "").replace(/\/+$/, "") || null;

/*
  The authority's Estonian name is read off lib/legal/operator.ts, which is
  what the accessibility page prints, so this cannot drift into checking for a
  name the page no longer says. A plain script cannot import TypeScript, so it
  reads the one line.
*/
const operatorSource = readFileSync(join(process.cwd(), "lib", "legal", "operator.ts"), "utf8");
const authority = /ACCESSIBILITY_AUTHORITY = \{[^}]*?localName: "([^"]+)"/.exec(operatorSource)?.[1];

const { check, absent, done } = suite("Ready to be shown", { floor: 13 });

/** A page as a stranger gets it: no cookie, no redirect followed. */
async function get(url) {
  const started = performance.now();
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "Kodukeel show-ready check" } });
    const firstByteMs = performance.now() - started;
    const body = res.status >= 300 && res.status < 400 ? "" : await res.text();
    return { status: res.status, headers: res.headers, body, firstByteMs, error: null };
  } catch (error) {
    return { status: 0, headers: new Headers(), body: "", firstByteMs: performance.now() - started, error: String(error?.cause?.code ?? error) };
  }
}

const said = (res) => (res.error ? `did not answer: ${res.error}` : `answered ${res.status}`);

console.log(`Asking ${site} what a reviewer would see.\n`);

// 1. The first byte of /partners, before anything else has warmed the deployment.
const partners = await get(`${site}/partners`);
check(
  `/partners sends its first byte within ${budgetMs} ms`,
  partners.status === 200 && partners.firstByteMs <= budgetMs,
  `${Math.round(partners.firstByteMs)} ms, ${said(partners)}`,
);

// 2. /partners itself: every section a reviewer is promised, and its operator.
const sections = ["what", "done", "course", "ekilex", "cost", "checked", "who"];
const missing = sections.filter((id) => !partners.body.includes(`id="${id}"`));
check(
  "/partners answers with its sections and names who runs it",
  partners.status === 200 && missing.length === 0 && partners.body.includes('data-operator="named"'),
  partners.status !== 200
    ? said(partners)
    : missing.length > 0 ? `missing ${missing.join(", ")}` : partners.body.includes('data-operator="named"') ? "" : "nobody named under Who runs it",
);
if (!demo) {
  const linked = /<section id="demo"[^]*?<a href="(https?:\/\/[^"]+)"/.exec(partners.body)?.[1];
  if (linked) demo = linked.replace(/\/+$/, "");
}

// 3. The operator named on /privacy.
const privacy = await get(`${site}/privacy`);
check(
  "/privacy names the operator",
  privacy.status === 200 && privacy.body.includes('data-operator="named"'),
  privacy.status !== 200 ? said(privacy) : privacy.body.includes('data-operator="unset"') ? "the page says nobody filled their name in" : "",
);

// 4. security.txt, where a researcher looks first (RFC 9116).
const security = await get(`${site}/.well-known/security.txt`);
const expires = /^Expires:\s*(.+)$/m.exec(security.body)?.[1];
check(
  "security.txt answers as plain text with a contact that has not expired",
  security.status === 200
    && /^text\/plain/.test(security.headers.get("content-type") ?? "")
    && /^Contact:\s*\S+/m.test(security.body)
    && Boolean(expires && Date.parse(expires) > Date.now()),
  security.status !== 200 ? said(security) : expires ? `expires ${expires.trim()}` : "no Expires line",
);

// 5 to 8. The pages a reviewer reads, in Estonian.
for (const path of ["/partners", "/curriculum", "/privacy", "/accessibility"]) {
  const res = await get(`${site}${path}?lang=et`);
  const estonian = /<main[^>]*\blang="et"/.test(res.body);
  check(
    `${path} answers in Estonian`,
    res.status === 200 && estonian,
    res.status !== 200 ? said(res) : estonian ? "" : "not yet: S-3 adds the Estonian, and until it lands this page answers in English",
  );
}

// 9. The course as it is: A1 as the lessons, and no A1 units.
const curriculum = await get(`${site}/curriculum`);
const lessons = (curriculum.body.match(/data-lesson="/g) ?? []).length;
const a1Units = curriculum.body.includes('data-curriculum-level="A1"');
check(
  "/curriculum names the A1 lessons and no A1 units",
  curriculum.status === 200 && lessons > 0 && !a1Units,
  curriculum.status !== 200 ? said(curriculum) : `${lessons} lessons${a1Units ? ", and A1 units as well" : ""}`,
);

// 10. What this installation asked of Ekilex, on /impact.
const impact = await get(`${site}/impact`);
check(
  "/impact carries the Ekilex figures",
  impact.status === 200 && impact.body.includes("data-ekilex-load"),
  impact.status !== 200 ? said(impact) : impact.body.includes("data-ekilex-load") ? "" : "no counts of what was asked of Ekilex",
);

// 11. A dictionary entry carrying the credit CC BY 4.0 asks for.
const entry = "/dictionary?q=tuba";
const here = await get(`${site}${entry}`);
if (here.status === 200 && here.body.includes("data-ekilex-credit")) {
  check("a dictionary entry carries the Ekilex credit", true, `${entry} on ${site}`);
} else if (demo) {
  const there = await get(`${demo}${entry}`);
  check(
    "a dictionary entry carries the Ekilex credit",
    there.status === 200 && there.body.includes("data-ekilex-credit"),
    there.status !== 200
      ? `the entry is behind a sign-in on ${site}, and the demo ${said(there)}`
      : there.body.includes("data-ekilex-credit") ? `${entry} on the demo, since ${site} asks for a sign-in` : `${entry} on the demo draws no credit`,
  );
} else {
  check(
    "a dictionary entry carries the Ekilex credit",
    false,
    here.status >= 300 && here.status < 400
      ? `not checked: an entry is behind a sign-in on ${site}, and no demo was named to read it on (--demo)`
      : `${entry} ${said(here)} with no credit`,
  );
}

// 12. The demo, where one is named, answering with its banner.
if (demo) {
  const shown = await get(`${demo}/dictionary`);
  const banner = /data-demo-banner="(\w+)"/.exec(shown.body)?.[1];
  check(
    "the demo answers with its banner",
    shown.status === 200 && banner === "shared",
    shown.status !== 200 ? `${demo} ${said(shown)}` : banner === "unsafe" ? "the banner warns that a model key is set" : banner ? "" : "no demo banner",
  );
} else {
  absent(1, "a demo address, and none is named here or on /partners");
}

// 13. The accessibility statement naming where a complaint goes.
const accessibility = await get(`${site}/accessibility`);
check(
  "the accessibility statement names the enforcement authority",
  accessibility.status === 200 && Boolean(authority) && accessibility.body.includes(authority),
  accessibility.status !== 200 ? said(accessibility) : authority ? "" : "lib/legal/operator.ts names no accessibility authority",
);

done();
