import assert from "node:assert/strict";

import { MOTION_LIMIT_MS } from "../../lib/ux/rest";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * EVERY LOOP A PUBLIC PAGE DRAWS RESTS WITHIN FIVE SECONDS (WCAG 2.2.2).
 *
 * The accessibility statement admitted 2.2.2 as partial because the landing
 * page's glow, its mascot and Anu looped for as long as the page was open, and
 * the mark in every public page's header did the same. They rest now, under
 * `.motion-rests` in `app/globals.css`, and the two cards that turn on a timer
 * count their steps (`lib/ux/rest.ts`). What keeps it true is that an
 * `infinite` cannot arrive unnoticed: every one in the stylesheets is a
 * decision written down here, either rested on the public pages by a rule
 * whose cycles fit the limit, or kept to the app, or started by a pointer, or
 * shown only while something is being waited for, and a list entry that no
 * longer names a loop fails as well as a loop the list does not name.
 *
 * `scripts/test-design.mjs` asks the same of the rendered public pages in a
 * browser: six and a half seconds after the page has settled, nothing is still
 * moving there.
 */

/** Loops a public page draws, each held still by a `.motion-rests` rule. */
const RESTED = [
  "night-drift", "float", "cafe-steam",
  "mark-sway", "pixel-type", "pixel-hop", "pixel-think",
  "anu-breathe", "anu-hair", "anu-blink", "anu-glance", "anu-bounce", "anu-hair-hop", "anu-glow",
  "anu-ponder", "anu-hair-think", "anu-talk",
] as const;

/**
 * Loops no public page draws, or draws only while somebody asks for them, with
 * the class that hangs them, which the public pages' files may not use.
 */
const ELSEWHERE: Readonly<Record<string, { readonly kind: "app" | "pointer" | "waiting"; readonly why: string }>> = {
  "quest-pulse": { kind: "app", why: "the daily quest's button, inside the app" },
  "twenty-dot": { kind: "waiting", why: "the dots while Twenty Questions or a joke is being answered, after a press" },
  "amb-queue": { kind: "app", why: "a scene's room, inside the app" },
  "stick-bob": { kind: "app", why: "a scene's people, inside the app" },
  "stick-nod": { kind: "app", why: "a scene's people, inside the app" },
  "stick-legs": { kind: "app", why: "a scene's people, inside the app" },
  "stick-arc": { kind: "app", why: "a scene's speaker, inside the app" },
  "stick-steam": { kind: "app", why: "a scene's cup, inside the app" },
  "grad-sweep": { kind: "app", why: "a gradient pan no public page draws any more" },
  "stage-lamps": { kind: "app", why: "the situations board, inside the app" },
  "ptr-working": { kind: "waiting", why: "the pull-to-refresh ring while a refresh is on its way" },
  "compare-breathe": { kind: "waiting", why: "the voices side by side while one is playing, after a press" },
  "call-speaking": { kind: "waiting", why: "the other side speaking in a call, inside the app" },
  "snd-bar": { kind: "waiting", why: "the bars while a recording plays, after a press" },
  "hero-fan-breathe": { kind: "app", why: "Today's leading card, inside the app" },
  "cafe-dot": { kind: "waiting", why: "the landing café's typing dots, for the moment between a press and the reply" },
  "mark-giddy": { kind: "pointer", why: "the mark under a hover or a press" },
  "tilde-tip": { kind: "pointer", why: "the mark under a hover or a press" },
  "pixel-dance": { kind: "pointer", why: "the mark under a hover or a press" },
  "anu-wiggle": { kind: "pointer", why: "Anu's button under a hover" },
  "anu-hair-flick": { kind: "pointer", why: "Anu's button under a hover" },
};

/** The files that draw the public pages, as far as reading their source can tell. */
const PUBLIC_FILES = [
  "components/Legal.tsx",
  "components/LandingAnu.tsx",
  "components/grammar/PublicReference.tsx",
  "app/(chromeless)/sign-in/page.tsx",
];

const CSS = ["app/globals.css", "app/hero-fan.css"];

/** Split on the commas between animations, never on one inside a function's parentheses. */
function animationsIn(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) { out.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** Seconds a time token stands for; a column's stagger is read at the tilde's last column, nine. */
function seconds(token: string): number {
  const stagger = /^calc\(var\(--c\) \* ([\d.]+)s\)$/.exec(token);
  if (stagger) return Number(stagger[1]) * 9;
  const m = /^([\d.]+)(ms|s)$/.exec(token);
  assert.ok(m, `"${token}" is not a time this check can read`);
  return Number(m[1]) / (m[2] === "ms" ? 1000 : 1);
}

export default function publicMotionRests({ check, code, read, sourceFiles }: InvariantKit) {
  const rules: { selector: string; animation: string; file: string }[] = [];
  const keyframes = new Set<string>();
  for (const file of CSS) {
    const css = read(file).replace(/\/\*[^]*?\*\//g, "");
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) keyframes.add(m[1]!);
    for (const m of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
      const selector = m[1]!.replace(/\s+/g, " ").trim();
      for (const d of m[2]!.matchAll(/(?:^|[;\s])animation\s*:\s*([^;]+)/g)) {
        for (const animation of animationsIn(d[1]!)) rules.push({ selector, animation, file });
      }
    }
  }
  const nameOf = (animation: string) => animation.split(/\s+/).find((t) => keyframes.has(t)) ?? null;
  const infinite = rules.filter((r) => /\binfinite\b/.test(r.animation));

  check("every infinite loop in the stylesheets is rested on the public pages or kept off them, by decision", () => {
    assert.ok(infinite.length >= 30, `only ${infinite.length} infinite animations found, so this check stopped reading the stylesheets`);
    const decided = new Set<string>([...RESTED, ...Object.keys(ELSEWHERE)]);
    const undecided = [...new Set(infinite.map((r) => nameOf(r.animation) ?? r.animation).filter((n) => !decided.has(n)))];
    assert.deepEqual(undecided, [], `an infinite animation nobody decided about: ${undecided.join(", ")}. Rest it under .motion-rests or say in this file why no public page draws it`);
    const looping = new Set(infinite.map((r) => nameOf(r.animation)));
    const stale = [...decided].filter((n) => !looping.has(n));
    assert.deepEqual(stale, [], `this file decides about ${stale.join(", ")}, which no longer loops`);
  });

  check("every loop a public page draws has a .motion-rests rule that ends inside five seconds", () => {
    const limit = MOTION_LIMIT_MS / 1000;
    // Every selector that loops one of them has its own resting twin, so a
    // second element looping the same keyframes cannot hide behind the first.
    const selectors = new Set(rules.map((r) => r.selector));
    for (const r of infinite) {
      if (!(RESTED as readonly string[]).includes(nameOf(r.animation) ?? "")) continue;
      const twin = r.selector.startsWith(":root[data-awake] ")
        ? r.selector.replace(":root[data-awake] ", ":root[data-awake] .motion-rests ")
        : `.motion-rests ${r.selector}`;
      assert.ok(selectors.has(twin), `${r.selector} loops on a public page and nothing rests it (no "${twin}")`);
    }
    for (const name of RESTED) {
      const resting = rules.filter((r) => r.selector.includes(".motion-rests") && nameOf(r.animation) === name);
      assert.ok(resting.length > 0, `${name} loops on a public page and no .motion-rests rule rests it`);
      for (const r of resting) {
        assert.doesNotMatch(r.animation, /\binfinite\b/, `${r.selector} still loops for ever`);
        const parts = r.animation.match(/calc\(var\(--c\) \* [\d.]+s\)|\S+/g) ?? [];
        const times = parts.filter((p) => /^(?:[\d.]+m?s|calc\()/.test(p));
        const count = Number(parts.find((p) => /^\d+$/.test(p)) ?? 1);
        assert.equal(times.length, 2, `${r.selector} does not say both its duration and its delay`);
        const end = seconds(times[1]!) + seconds(times[0]!) * count;
        assert.ok(end <= limit + 1e-9, `${r.selector} moves for ${end.toFixed(2)}s, past the ${limit}s limit`);
      }
    }
  });

  check("a loop kept off the public pages is drawn by none of their files, and a pointer's loop waits for the pointer", () => {
    const publicFiles = [...PUBLIC_FILES, ...sourceFiles("app/(chromeless)/welcome")];
    const publicCode = publicFiles.map((f) => code(f)).join("\n");
    for (const r of infinite) {
      const name = nameOf(r.animation);
      if (!name || !(name in ELSEWHERE)) continue;
      const { kind } = ELSEWHERE[name]!;
      if (kind === "pointer") {
        assert.match(r.selector, /\[data-play\]|:hover/, `${r.selector} plays ${name} without a pointer asking`);
        continue;
      }
      if (kind !== "app") continue;
      const classes = [...r.selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]!);
      // Drawn where every class its selector asks for is used; `.word-in.grad-sweep` needs both.
      const drawn = classes.length > 0 && classes.every((c) => new RegExp(`["'\\s]${c}["'\\s]`).test(publicCode));
      assert.ok(!drawn, `${name} is kept to the app, and a public page's files use ${classes.join(", ")}`);
    }
  });

  check("the landing page, every public header and sign-in carry .motion-rests, and the timed cards count their steps", () => {
    assert.match(code("app/(chromeless)/welcome/page.tsx"), /className="landing motion-rests /, "the landing page no longer rests its loops");
    assert.match(code("components/Legal.tsx"), /<header className="motion-rests /, "the public pages' header no longer rests the mark");
    assert.match(code("app/(chromeless)/sign-in/page.tsx"), /className="night motion-rests /, "sign-in no longer rests its loops");
    assert.match(code("app/(chromeless)/welcome/LandingMotion.tsx"), /stepsWithin\(TURN_MS\)/, "the hero word turns by itself past five seconds");
    assert.match(code("app/(chromeless)/welcome/LandingDemo.tsx"), /stepsWithin\(BUILD_STEP_MS\)/, "the case builder steps by itself past five seconds");
  });
}
