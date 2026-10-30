import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LESSON STEP KEPT MOUNTED WHILE HIDDEN HOLDS NO MICROPHONE AND NO RUN OF LINES.
 *
 * Practice and Review stay mounted, hidden, once shown, so stepping away to
 * reread the table keeps their place (`kept` in LessonRunner). Say it was kept
 * the same way for a day, and a story still being read went on playing over
 * Review with its Stop button hidden, and an open microphone went on hearing
 * the room: both close only on unmount (`useLinePlayer`, `useSpeech`). So a
 * step drawn through `kept` is one whose components reach neither, and Say it
 * keeps its place outside itself instead (`SayPlace`).
 *
 * WHAT IS READ IS THE COMPONENT INSIDE THE HIDDEN DIV, AND WHAT IT DRAWS. The
 * first version took the first tag after `kept(...)`, which is always the
 * `<div hidden>`, and read Quiz whatever was inside it: a Listen step kept the
 * same way would have passed while it plays the conversation line after line.
 * Every component drawn in a kept step's markup is read now, wherever it is
 * defined (a function in the runner, or a file it imports), and so is every
 * component that one draws in turn, one level further.
 */
const HOLDERS = /\b(useSpeech|MicButton|useLinePlayer|CompareVoices|RetellIt|AgainFaster|SayAlongFade|LessonConversation|ListenFirst)\b/;
const RUNNER = "app/(app)/course/lessons/[id]/LessonRunner.tsx";

/** The markup each `kept("step")` draws: from that call to the next step's line. */
function keptSpans(runner: string): { step: string; span: string }[] {
  const out: { step: string; span: string }[] = [];
  for (const m of runner.matchAll(/\{kept\("(\w+)"\)/g)) {
    const rest = runner.slice(m.index! + m[0].length);
    const end = rest.search(/\n\s*\{(?:kept\(|step ===)|<\/section>/);
    out.push({ step: m[1]!, span: rest.slice(0, end < 0 ? rest.length : end) });
  }
  return out;
}

/** Every component a piece of markup draws, by name. */
const tagsIn = (markup: string) => [...new Set([...markup.matchAll(/<([A-Z]\w*)\b/g)].map((m) => m[1]!))];

/** The scan, over a way to read a file and to ask whether one is there, so a plant can hand it files of its own. */
function scanner(read: (file: string) => string, exists: (file: string) => boolean) {
  /** Where `name` is defined, seen from `file`: a function in that file, or the file an import names. */
  const resolve = (name: string, file: string, source: string): { file: string; source: string } | null => {
    const local = new RegExp(`(?:^|\\n)(?:export )?function ${name}\\b`).exec(source);
    if (local) {
      const body = source.slice(local.index).replace(/^\n/, "");
      const end = body.slice(1).search(/\n(?:export )?(?:function|const|interface|type) /);
      return { file: `${file}#${name}`, source: end < 0 ? body : body.slice(0, end + 1) };
    }
    const imp = new RegExp(`import\\s+\\{[^}]*\\b${name}\\b[^}]*\\}\\s+from\\s+"([^"]+)"|import\\s+${name}\\s+from\\s+"([^"]+)"`).exec(source);
    const from = imp?.[1] ?? imp?.[2];
    if (!from || !(from.startsWith("@/") || from.startsWith("."))) return null;
    const base = from.startsWith("@/") ? from.slice(2) : join(dirname(file.split("#")[0]!), from);
    for (const candidate of [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]) {
      if (exists(candidate)) return { file: candidate, source: read(candidate) };
    }
    return null;
  };

  /** What a kept step's markup reaches that holds a microphone or a run of lines, two levels down. */
  return (runnerFile: string, runner: string): string[] => {
    const offenders: string[] = [];
    for (const { step, span } of keptSpans(runner)) {
      const direct = HOLDERS.exec(span);
      if (direct) offenders.push(`the kept "${step}" step draws ${direct[1]} itself`);
      for (const name of tagsIn(span)) {
        const first = resolve(name, runnerFile, runner);
        if (!first) continue;
        const hit = HOLDERS.exec(first.source);
        if (hit) offenders.push(`the kept "${step}" step draws ${name} (${first.file}), which reaches ${hit[1]}`);
        for (const inner of tagsIn(first.source)) {
          if (inner === name) continue;
          const second = resolve(inner, first.file, first.source);
          if (!second) continue;
          const deep = HOLDERS.exec(second.source);
          if (deep) offenders.push(`the kept "${step}" step draws ${name}, which draws ${inner} (${second.file}), which reaches ${deep[1]}`);
        }
      }
    }
    return offenders;
  };
}

export default function aHiddenStepHoldsNoMicrophone({ check, code }: InvariantKit) {
  const offendersIn = scanner(code, existsSync);

  check("a lesson step kept mounted while hidden holds no microphone and no run of lines", () => {
    const runner = code(RUNNER);
    const spans = keptSpans(runner);
    assert.ok(spans.length >= 2, `only ${spans.length} kept steps found, so the haystack stopped matching`);
    // The components inside the hidden div are what is read, not the div.
    const drawn = spans.flatMap((s) => tagsIn(s.span));
    assert.ok(drawn.includes("Quiz"), `the kept steps draw ${drawn.join(", ") || "nothing"}, and Quiz is not among them, so the reading stopped finding the component inside the hidden div`);
    assert.ok(!/kept\("say"\)/.test(runner), "Say it is drawn through kept: it holds a microphone and lines, so it has to go when the learner steps away");
    const offenders = offendersIn(RUNNER, runner);
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });

  check("the hidden-step check fails on a Listen step kept inside a hidden div, and on a holder one import away", () => {
    const runner = code(RUNNER);
    // The audit's own plant: Listen, kept the way Practice is, plays the conversation line after line.
    const listen = runner.replace(
      /\{step === "listen" && (<Listen\b[^\n]*\/>)\}/,
      (_m, tag: string) => `{kept("listen") && <div hidden={step !== "listen"}>${tag}</div>}`,
    );
    assert.notEqual(listen, runner, "the plant could not find the Listen step to keep");
    assert.ok(offendersIn(RUNNER, listen).some((o) => o.includes("Listen")), "a Listen step kept inside a hidden div passed the check");
    // One import away: a kept step drawing Outer, whose file names nothing, and which draws Inner, which plays lines.
    const files: Record<string, string> = {
      "fake/Runner.tsx": `import { Outer } from "@/fake/Outer";\n{kept("practise") && <div hidden={step !== "practise"}><Outer /></div>}\n</section>`,
      "fake/Outer.tsx": `import { Inner } from "./Inner";\nexport function Outer() { return <Inner />; }`,
      "fake/Inner.tsx": `export function Inner() { const p = useLinePlayer(); return null; }`,
    };
    const planted = scanner((f) => files[f] ?? "", (f) => f in files)("fake/Runner.tsx", files["fake/Runner.tsx"]!);
    assert.ok(planted.some((o) => o.includes("Inner")), `a holder one import away passed the check: ${planted.join("; ") || "nothing found"}`);
  });
}
