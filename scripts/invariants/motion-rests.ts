import assert from "node:assert/strict";

import { MOTION_LIMIT_MS } from "../../lib/ux/rest";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * EVERYTHING THAT MOVES BY ITSELF RESTS WITHIN FIVE SECONDS (WCAG 2.2.2).
 *
 * The accessibility statement admitted 2.2.2 as partial twice: first because
 * the landing page looped, and then, once that rested, because inside the app
 * the mark, Anu, a scene's people, the situations board's lamps, Today's
 * leading card and the quest's button looped for as long as the screen was
 * open. Every one of them now plays a whole number of its own cycles, or a
 * fraction of one that stops on a frame worth stopping on, inside
 * `MOTION_LIMIT_MS` of starting, and then holds still (`lib/ux/rest.ts`).
 *
 * What keeps it true is read off every stylesheet and every inline animation
 * in `app/` and `components/`, not off a list of screens:
 *
 * - an `infinite` is a decision written down here, and only three kinds are
 *   allowed, each of which the criterion does not reach: what a hover or a
 *   press started and plays for as long as it is asked, a sign that something
 *   is loading or being answered, and the bars of a recording the learner
 *   pressed play on; a decision that no longer names a loop fails too;
 * - every other animation ends inside five seconds, counting its delay, the
 *   largest delay a class beside it can give it, and every cycle it plays;
 * - an animation whose timing is set by a variable says where that variable
 *   is held to the limit, and one whose delay is open-ended (a stagger, or a
 *   bar waiting for its place in a recording) is a short arrival;
 * - in the components, a Tailwind animation is a spinner or a skeleton, and
 *   nothing asks the browser for an endless loop but the hover that finishes
 *   its beat when the pointer leaves.
 *
 * `scripts/test-design.mjs` asks the same of rendered pages in a browser,
 * public and signed in: six and a half seconds after the page has settled,
 * nothing is still moving.
 */

type Kind = "pointer" | "loading" | "playing";

/** The only loops allowed to run for ever, by keyframe, with every selector that loops each one. */
const KEPT: Readonly<Record<string, { readonly kind: Kind; readonly selectors: readonly string[]; readonly why: string }>> = {
  "twenty-dot": { kind: "loading", selectors: [".twenty-thinking span"], why: "Twenty Questions' dots, for the half second the game takes to answer a question somebody asked" },
  "cafe-dot": { kind: "loading", selectors: [".cafe-typing > span"], why: "the landing café's typing dots, between a press and the reply" },
  "ptr-working": { kind: "loading", selectors: [".ptr-ring[data-working]"], why: "the pull-to-refresh ring while a refresh somebody pulled for is on its way" },
  "snd-bar": { kind: "playing", selectors: [".snd-bars > span"], why: "the bars beside a native recording, drawn only while one the learner pressed is playing" },
  "voice-bar": { kind: "playing", selectors: [".voice-bars-live > span"], why: "the bars standing in for a B1 line not shown yet, moving only while that line, which the learner pressed play on, is being said" },
  "mark-giddy": { kind: "pointer", selectors: [".mark-play[data-play] .mark-live .mark-giddy"], why: "the mark under a hover or a press" },
  "tilde-tip": { kind: "pointer", selectors: [".mark-play[data-play] .mark-live .mark-tip"], why: "the mark under a hover or a press" },
  "pixel-dance": { kind: "pointer", selectors: [".mark-play[data-play] .mark-live .pixel"], why: "the mark under a hover or a press" },
  "anu-wiggle": { kind: "pointer", selectors: [".anu-call[data-play] .anu-live .anu-play"], why: "Anu's button under a hover" },
  "anu-hair-flick": { kind: "pointer", selectors: [".anu-call[data-play] .anu-live .anu-hair-play"], why: "Anu's button under a hover" },
};

/**
 * Animations timed by a variable, by selector, with the file that sets it and
 * either the constant it is set from or what that file reads to stay inside.
 */
const TIMED_ELSEWHERE: Readonly<Record<string, { readonly why: string; readonly file: string; readonly constant?: string; readonly reads?: RegExp }>> = {
  ".drift": { why: "the landing card's letters, whose run `wanderRun` works out", file: "lib/ux/letterMotion.ts", reads: /\bMOTION_LIMIT_MS\b/ },
  ".send-ring-fill": { why: "the ring that empties before a spoken reply sends itself", file: "lib/speech/matchPick.ts", constant: "SEND_RING_MS" },
  ".cafe-send": { why: "the landing café's line filling before it sends itself", file: "app/(chromeless)/welcome/CafeScene.tsx", constant: "SEND_LIT_MS" },
};

/** An item on an open-ended stagger may take this long itself: an arrival, not a loop. */
const STAGGERED_RUN_S = 1.5;

/** The mark's tilde has ten columns, so `var(--c)` reaches nine. */
const LAST_COLUMN = 9;

type Anim = { file: string; selector: string; text: string; name: string | null; duration: Time; delay: Time; count: number | "var" };
type Time = { s: number } | { var: true; s: number } | { open: true };

function split(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value.replace(/\s+/g, " ")) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) { out.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const TOKEN = /(?:calc|var|cubic-bezier|steps)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)|\S+/g;

function time(token: string): Time {
  const plain = /^(-?[\d.]+)(ms|s)$/.exec(token);
  if (plain) return { s: Number(plain[1]) / (plain[2] === "ms" ? 1000 : 1) };
  const column = /^calc\(var\(--c\) \* ([\d.]+)(ms|s)\)$/.exec(token);
  if (column) return { s: (Number(column[1]) / (column[2] === "ms" ? 1000 : 1)) * LAST_COLUMN };
  const fallback = /^var\(--[\w-]+, ([\d.]+)(ms|s)\)$/.exec(token);
  if (fallback) return { var: true, s: Number(fallback[1]) / (fallback[2] === "ms" ? 1000 : 1) };
  return { open: true };
}

const isTime = (t: string) => /^-?[\d.]+m?s$/.test(t) || (/^(?:calc|var)\(/.test(t) && /\d(?:ms|s)\b|var\(--(?:at|w|i)\b|-at\b/.test(t));

export default function motionRests({ check, code, read, sourceFiles }: InvariantKit) {
  const stylesheets = [...sourceFiles("app", /\.css$/), ...sourceFiles("components", /\.css$/)];
  const anims: Anim[] = [];
  const longhands: { selector: string; prop: string; value: string }[] = [];
  const keyframes = new Set<string>();
  for (const file of stylesheets) {
    const css = read(file).replace(/\/\*[^]*?\*\//g, "");
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) keyframes.add(m[1]!);
  }
  for (const file of stylesheets) {
    const css = read(file).replace(/\/\*[^]*?\*\//g, "");
    for (const m of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
      const selector = m[1]!.replace(/\s+/g, " ").trim();
      for (const d of m[2]!.matchAll(/(?:^|[;\s])(animation(?:-delay|-duration|-iteration-count)?)\s*:\s*([^;]+)/g)) {
        if (d[1] !== "animation") { longhands.push({ selector, prop: d[1]!, value: d[2]!.trim() }); continue; }
        for (const text of split(d[2]!)) {
          const tokens = text.match(TOKEN) ?? [];
          const times = tokens.filter(isTime);
          const countToken = tokens.find((t) => /^(?:infinite|[\d.]+|var\(--[\w-]+-count[^)]*\))$/.test(t));
          anims.push({
            file, selector, text,
            name: tokens.find((t) => keyframes.has(t)) ?? null,
            duration: times[0] ? time(times[0]) : { s: 0 },
            delay: times[1] ? time(times[1]) : { s: 0 },
            count: countToken === "infinite" ? Infinity : countToken?.startsWith("var(") ? "var" : Number(countToken ?? 1),
          });
        }
      }
    }
  }
  const infinite = anims.filter((a) => a.count === Infinity);
  const finite = anims.filter((a) => a.count !== Infinity);

  check("every infinite loop in the stylesheets is a hover, a press, a wait or a recording playing, by decision", () => {
    assert.ok(anims.length >= 150, `only ${anims.length} animations found in ${stylesheets.length} stylesheets, so this check stopped reading them`);
    assert.ok(infinite.length >= 8, `only ${infinite.length} infinite animations found, so this check stopped reading them`);
    for (const a of infinite) {
      const kept = a.name ? KEPT[a.name] : undefined;
      assert.ok(kept, `${a.selector} loops ${a.name ?? a.text} for ever and nobody decided it may. Rest it inside ${MOTION_LIMIT_MS / 1000}s (lib/ux/rest.ts), or say in this file why the criterion does not reach it`);
      assert.ok(kept.selectors.includes(a.selector), `${a.name} is kept for ${kept.selectors.join(", ")}, and ${a.selector} loops it too`);
      if (kept.kind === "pointer") assert.match(a.selector, /\[data-play\]|:hover/, `${a.selector} plays ${a.name} without a pointer asking`);
    }
    for (const [name, kept] of Object.entries(KEPT)) {
      const looping = infinite.filter((a) => a.name === name).map((a) => a.selector);
      assert.deepEqual([...looping].sort(), [...kept.selectors].sort(), `this file keeps ${name} looping on ${kept.selectors.join(", ")}, and the stylesheet loops it on ${looping.join(", ") || "nothing"}`);
    }
    for (const l of longhands.filter((l) => l.prop === "animation-iteration-count")) {
      assert.match(l.value, /^1(?:\s*!important)?$/, `${l.selector} sets animation-iteration-count to ${l.value}, which this check cannot hold to the limit`);
    }
  });

  check("every other animation ends inside five seconds, counting its delay, a class's stagger and every cycle", () => {
    const limit = MOTION_LIMIT_MS / 1000;
    const classesOf = (selector: string) => new Set([...selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]!));
    // A delay given by a class of its own, `.amb-2 { animation-delay }`, applies to
    // whatever element wears it; find which classes are drawn beside one.
    const families = new Map<string, number>();
    for (const l of longhands) {
      const fam = /^\.([a-z]+-)\d+$/.exec(l.selector);
      const t = time(l.value);
      if (fam && l.prop === "animation-delay" && "s" in t) families.set(fam[1]!, Math.max(families.get(fam[1]!) ?? 0, t.s));
    }
    const component = [...sourceFiles("app"), ...sourceFiles("components")].map((f) => code(f)).join("\n");
    const besideFamily = new Map<string, number>();
    for (const [fam, most] of families) {
      for (const lit of component.matchAll(/[`"']([^`"'\n]*)[`"']/g)) {
        if (!new RegExp(`(?:^|\\s)${fam}(?:\\d|\\$\\{)`).test(lit[1]!)) continue;
        for (const cls of lit[1]!.replace(/\$\{[^}]*\}/g, "").split(/\s+/)) if (cls) besideFamily.set(cls, Math.max(besideFamily.get(cls) ?? 0, most));
      }
    }
    assert.ok(families.size >= 2, `found ${families.size} classes that only stagger a delay, so this check stopped reading them`);
    let checked = 0;
    for (const a of finite) {
      if (a.count === "var" || "var" in a.duration) {
        assert.ok(a.selector in TIMED_ELSEWHERE, `${a.selector} is timed by a variable (${a.text}) and this file does not say where it is held to the limit`);
        continue;
      }
      if (!("s" in a.duration)) { assert.fail(`${a.selector} has a duration this check cannot read: ${a.text}`); }
      const run = a.duration.s * a.count;
      const classes = classesOf(a.selector);
      let delay = "s" in a.delay ? a.delay.s : NaN;
      // A delay a variable sets is a stagger like any other this file cannot bound.
      let open = !("s" in a.delay) || "var" in a.delay;
      for (const l of longhands.filter((l) => l.prop === "animation-delay" && [...classesOf(l.selector)].some((c) => classes.has(c)))) {
        const t = time(l.value);
        if ("s" in t) delay = Math.max(Number.isNaN(delay) ? 0 : delay, t.s); else open = true;
      }
      for (const c of classes) delay = Math.max(Number.isNaN(delay) ? 0 : delay, besideFamily.get(c) ?? 0);
      if (open) {
        assert.ok(run <= STAGGERED_RUN_S + 1e-9, `${a.selector} runs ${run.toFixed(2)}s on a stagger nothing bounds (${a.text}), which is past an arrival`);
        checked += 1;
        continue;
      }
      const end = (Number.isNaN(delay) ? 0 : delay) + run;
      assert.ok(end <= limit + 1e-9, `${a.selector} moves until ${end.toFixed(2)}s (${a.text}), past the ${limit}s limit (lib/ux/rest.ts)`);
      checked += 1;
    }
    assert.ok(checked >= 140, `only ${checked} finite animations were held to the limit, so this check stopped reading them`);
    for (const l of longhands.filter((l) => l.prop === "animation-duration")) {
      const t = time(l.value.replace(/\s*!important$/, ""));
      assert.ok("s" in t && t.s <= limit, `${l.selector} sets animation-duration to ${l.value}`);
    }
    for (const [sel, held] of Object.entries(TIMED_ELSEWHERE)) {
      assert.ok(anims.some((a) => a.selector === sel), `this file says ${sel} is timed elsewhere, and no rule animates it any more`);
      const src = code(held.file);
      if (held.constant) {
        const value = new RegExp(`\\b${held.constant}\\s*=\\s*([\\d_]+)\\b`).exec(src);
        assert.ok(value, `${held.file} no longer sets ${held.constant}, which times ${sel}`);
        assert.ok(Number(value[1]!.replace(/_/g, "")) <= MOTION_LIMIT_MS, `${held.constant} times ${sel} past the limit`);
      }
      if (held.reads) assert.match(src, held.reads, `${held.file} no longer holds ${sel} to the limit`);
    }
  });

  check("in the components, nothing asks for an endless loop but a spinner, a skeleton and a hover finishing its beat", () => {
    const files = [...sourceFiles("app"), ...sourceFiles("components")];
    assert.ok(files.length >= 300, `only ${files.length} files under app/ and components/, so this check stopped reading them`);
    let utilities = 0;
    for (const file of files) {
      const src = code(file);
      assert.doesNotMatch(src, /\binfinite\b/, `${file} writes an infinite animation inline, where no stylesheet rule can rest it`);
      if (file !== "components/motion/useFinishingHover.ts") {
        assert.doesNotMatch(src, /iterations\s*:\s*(?:Infinity|Number\.POSITIVE_INFINITY)/, `${file} asks the browser for an endless animation`);
      }
      for (const m of src.matchAll(/\banimate-(\[[^\]]*\]|[\w-]+)/g)) {
        utilities += 1;
        assert.ok(["spin", "pulse", "none"].includes(m[1]!), `${file} uses animate-${m[1]}, a Tailwind loop that is neither a spinner nor a skeleton`);
      }
    }
    assert.ok(utilities >= 20, `only ${utilities} Tailwind animations found, so this check stopped reading them`);
    assert.match(code("components/motion/useFinishingHover.ts"), /isHoverLoop/, "the one endless animation in the components is no longer the hover that finishes its beat");
  });

  check("the landing cards that turn on a timer count their steps", () => {
    assert.match(code("app/(chromeless)/welcome/LandingMotion.tsx"), /stepsWithin\(TURN_MS\)/, "the hero word turns by itself past five seconds");
    assert.match(code("app/(chromeless)/welcome/LandingDemo.tsx"), /stepsWithin\(BUILD_STEP_MS\)/, "the case builder steps by itself past five seconds");
  });
}
