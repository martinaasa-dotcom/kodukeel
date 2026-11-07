/**
 * HOW GOOD THE SAY IT GRADER IS, MEASURED RATHER THAN CLAIMED.
 *
 * `lib/course/lessons/againstLine.ts` reads a learner's sentence against the
 * line a card asked for. Two numbers say whether it is worth showing anybody,
 * and this prints both, as `measure:sentence-check` does for the check beside
 * it.
 *
 * The one it may never get wrong: an accepted answer called different. Every
 * model line of every lesson's Say it cards and its role-play turns, every
 * alternative the lesson wrote, and the line with its subject pronoun dropped
 * where the verb says who, each compared with the line. Anything but a synonym
 * found there is a false alarm, printed, and the count is the number to keep
 * at nought.
 *
 * The one it is built for: each line broken one way at a time, the ways a
 * learner breaks it, and whether the grader names that break.
 *
 *   tense     a verb in the past said in the present, or the present in the past
 *   person    a first-person verb said in the third person
 *   object    a noun's 2nd form for its 3rd, or the 3rd for the 2nd
 *   particle  läbi for ära, or ära for läbi, after the verb
 *   no        ei put in front of the verb
 *   dropped   a word that carries meaning left out
 *
 * And the story told back: each B1 retell line said in the teller's own person
 * should be named, and said about them should not.
 *
 *   npm run measure:grader             # the rates and every false alarm
 *   npm run measure:grader -- --missed # and every break it let through
 *
 * No key and no database: the shipped dictionary stands in for the rows and
 * the forms list on disk for which headwords a spelling belongs to, as the
 * server reads them.
 */
import { shippedDictionary } from "./lib/dictionary";
import { LESSONS } from "../lib/course/lessons";
import { lemmasOfForm, headwordsOfExactForm } from "../lib/dict/forms";
import { caseTable, verbTable, ALWAYS_READ, type CheckEntry } from "../lib/course/lessons/sentenceCheck";
import { againstLine, type Difference } from "../lib/course/lessons/againstLine";
import { lineAskFor, retellAsk } from "../lib/course/lessons/lineAsk";
import { words } from "../lib/scenes/lexicon";

async function main(): Promise<void> {
  const showMissed = process.argv.includes("--missed");
  const dict = shippedDictionary();
  const ENTRIES: CheckEntry[] = dict.map((w) => ({
    lemma: w.lemma, pos: w.pos, cefr: w.cefr, parts: w.parts, extraForms: w.extraForms, usages: [],
    government: w.government, semanticTypes: w.semanticTypes,
  }));
  const GLOSSES = new Map(dict.map((w) => [w.lemma, w.gloss] as const));
  const byLemma = new Map<string, CheckEntry[]>();
  for (const e of ENTRIES) byLemma.set(e.lemma.toLocaleLowerCase("et"), [...(byLemma.get(e.lemma.toLocaleLowerCase("et")) ?? []), e]);

  /** The rows the server would read for these texts: the headwords of every spelling, as the forms list owns them. */
  const cache = new Map<string, string[]>();
  async function entriesFor(...texts: string[]): Promise<CheckEntry[]> {
    const lemmas = new Set<string>(ALWAYS_READ);
    for (const w of new Set(texts.flatMap(words))) {
      if (!cache.has(w)) cache.set(w, [...await lemmasOfForm(w), ...await headwordsOfExactForm(w)]);
      lemmas.add(w);
      for (const l of cache.get(w)!) lemmas.add(l.toLocaleLowerCase("et"));
    }
    return [...lemmas].flatMap((l) => byLemma.get(l) ?? []);
  }

  const serious = (d: readonly Difference[]) => d.filter((x) => x.kind !== "synonym");
  let accepted = 0;
  const alarms: string[] = [];
  const tally = new Map<string, { tried: number; caught: number; missed: string[] }>();
  const record = (kind: string, caught: boolean, what: string) => {
    const t = tally.get(kind) ?? { tried: 0, caught: 0, missed: [] };
    t.tried += 1;
    if (caught) t.caught += 1; else t.missed.push(what);
    tally.set(kind, t);
  };

  for (const lesson of LESSONS) {
    const cards = [
      ...lesson.answers.map((p) => ({ which: "answers" as const, prompt: p })),
      ...(lesson.roleplay?.turns ?? []).map((p) => ({ which: "turns" as const, prompt: p })),
    ];
    for (const { which, prompt } of cards) {
      const ask = lineAskFor(lesson, which, prompt, null);
      const line = ask.lines[0]!;
      const tokens = line.match(/[\p{L}\p{M}]+/gu) ?? [];
      // ACCEPTED: the line, its alternatives, and the line with a subject pronoun dropped.
      const dropped = /^(Ma|Mina|Sa|Sina|Me|Meie|Te|Teie)\s+(\p{L})/u.test(line)
        ? line.replace(/^(\S+)\s+(\p{L})/u, (_, __, c: string) => c.toLocaleUpperCase("et")) : null;
      for (const ok of [...ask.lines, ...(dropped ? [dropped] : [])]) {
        accepted += 1;
        const d = serious(againstLine(ok, ask, await entriesFor(ok, ...ask.lines), GLOSSES).differences);
        if (d.length > 0) alarms.push(`${lesson.id}  "${ok}" vs "${line}": ${d.map((x) => x.kind).join(", ")}`);
      }
      // BROKEN, one way at a time.
      const tryBreak = async (kind: string, broken: string | null, expect: (d: readonly Difference[]) => boolean) => {
        if (!broken || broken === line) return;
        const d = againstLine(broken, ask, await entriesFor(broken, ...ask.lines), GLOSSES).differences;
        record(kind, expect(d), `${lesson.id}  "${broken}" for "${line}" -> ${d.map((x) => x.kind).join(", ") || "nothing"}`);
      };
      const swap = (at: number, to: string) => tokens.map((t, i) => (i === at ? to : t)).join(" ");
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i]!.toLocaleLowerCase("et");
        const owners = (cache.get(tok) ?? []).flatMap((l) => byLemma.get(l.toLocaleLowerCase("et")) ?? []);
        const verb = owners.find((e) => e.pos === "VERB");
        if (verb) {
          const table = verbTable(verb);
          const code = [...table].find(([, v]) => v === tok)?.[0];
          if (code?.startsWith("IndIpfSg1")) await tryBreak("tense", table.get("IndPrSg1") ? swap(i, table.get("IndPrSg1")!) : null, (d) => d.some((x) => x.kind === "form" && x.axes.includes("tense")));
          if (code?.startsWith("IndPrSg1")) await tryBreak("tense", table.get("IndIpfSg1") ? swap(i, table.get("IndIpfSg1")!) : null, (d) => d.some((x) => x.kind === "form" && x.axes.includes("tense")));
          if (code === "IndPrSg1" || code === "IndIpfSg1") {
            const third = table.get(code.replace("Sg1", "Sg3"));
            await tryBreak("person", third ? swap(i, third) : null, (d) => d.some((x) => (x.kind === "form" && x.axes.includes("person")) || x.kind === "person"));
          }
          if (code && /^Ind(Pr|Ipf)Sg/.test(code) && !tokens.some((t) => /^(ei|pole)$/i.test(t))) {
            await tryBreak("no", [...tokens.slice(0, i), "ei", ...tokens.slice(i)].join(" "), (d) => d.some((x) => x.kind === "negation"));
          }
          await tryBreak("dropped", tokens.filter((_, j) => j !== i).join(" "), (d) => d.some((x) => x.kind === "missing" || x.kind === "swap" || x.kind === "negation"));
        }
        const noun = owners.find((e) => e.pos === "NOUN");
        if (noun && !verb) {
          const table = caseTable(noun);
          const gen = table.find((f) => f.spec.key === "GENITIVE")?.singular?.toLocaleLowerCase("et");
          const part = table.find((f) => f.spec.key === "PARTITIVE")?.singular?.toLocaleLowerCase("et");
          if (gen && part && gen !== part && (tok === gen || tok === part)) {
            await tryBreak("object", swap(i, tok === gen ? part : gen), (d) => d.some((x) => x.kind === "form" || x.kind === "case"));
          }
        }
        if (tok === "läbi" || (tok === "ära" && i > 0)) {
          await tryBreak("particle", swap(i, tok === "läbi" ? "ära" : "läbi"), (d) => d.some((x) => x.kind === "swap"));
        }
      }
    }
    // THE STORY TOLD BACK: in the teller's own person it is named; about them it is not.
    for (const story of lesson.retell?.story ?? []) {
      const ask = retellAsk(lesson, story.et);
      const rows = await entriesFor(story.et);
      const own = againstLine(story.et, ask, rows, GLOSSES).differences;
      const firstPerson = /\b(ma|mina|me|meie)\b/i.test(story.et);
      if (firstPerson) record("retell, told as their own", own.some((d) => d.kind === "person" || (d.kind === "form" && d.axes.includes("person"))), `${lesson.id}  "${story.et}" -> ${own.map((x) => x.kind).join(", ") || "nothing"}`);
      void rows;
    }
  }

  console.log(`\nAccepted answers read as different: ${alarms.length} of ${accepted}`);
  for (const a of alarms) console.log(`  ${a}`);
  console.log("\nBreaks named:");
  for (const [kind, t] of [...tally].sort()) {
    console.log(`  ${kind.padEnd(28)} ${String(t.caught).padStart(4)} of ${String(t.tried).padStart(4)}  ${t.tried ? ((100 * t.caught) / t.tried).toFixed(1) : "0"}%`);
    if (showMissed) for (const m of t.missed) console.log(`      ${m}`);
  }
}

void main();
