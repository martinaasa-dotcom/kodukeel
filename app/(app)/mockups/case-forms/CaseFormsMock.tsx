"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { RuleNote } from "@/components/RuleNote";
import { Speak } from "@/components/Speak";
import { Card, Page } from "@/components/ui";

/**
 * MOCKUP ONLY. Three ways to show where a case form comes from on a lesson's
 * "How it works" step. The forms come from the dictionary (page.tsx); the
 * sentences are the lesson's own lines; the English is a draft of the rewritten
 * explanations, for the operator to judge the shape rather than the wording.
 */

export interface MockRow {
  key: string;
  et: string;
  ask: string;
  askEn: string;
  suffix: string;
  principal: boolean;
  sg: string | null;
  pl: string | null;
}

type Col = "sg" | "pl";
interface Pin {
  sentence: string;
  en: string;
  row: string;
  col: Col;
  form: string;
  why: string;
}

/* The lesson's own lines (conversation and its table), each with the cell its form sits in. */
const PINS: readonly Pin[] = [
  {
    sentence: "Ma ostsin õunu.", en: "I bought some apples.", row: "PARTITIVE", col: "pl", form: "õunu",
    why: "More than one apple, so the plural column. Estonian has no word for \"the\", so the ending has to say whether you mean a set amount. You bought apples without saying which ones or how many, an open amount, so they go in the mitmuse osastav (plural, 3rd form): õunu.",
  },
  {
    sentence: "Ma pesin õunad ära.", en: "I washed the apples.", row: "NOMINATIVE", col: "pl", form: "õunad",
    why: "These are the apples on the counter, a known set, and the washing got finished (ära says so). A known set, all of it, with the job done, goes in the mitmuse nimetav (plural, 1st form): õunad. It is spelled just like the subject in \"Õunad on head\".",
  },
  {
    sentence: "Siin on ainult kolm õuna.", en: "There are only three apples here.", row: "PARTITIVE", col: "sg", form: "õuna",
    why: "After a number (except one), Estonian counts in the singular: kolm õuna, \"three apple\". The number already says how many, so the noun goes in the ainsuse osastav (singular, 3rd form): õuna.",
  },
  {
    sentence: "Sõin bussis õunu.", en: "I was eating apples on the bus.", row: "PARTITIVE", col: "pl", form: "õunu",
    why: "Tom was eating some of them, not all, and he didn't finish a set. An open amount of more than one goes in the mitmuse osastav (plural, 3rd form): õunu. Compare \"Sa sõid õunad ära?\", where ära means they're all gone, so the whole set: õunad.",
  },
];

const RULE = "With more than one thing, two questions decide the ending: is it a set amount (these, all of them), and did the job get done? Yes to both: the plural nimetav (1st form), {Ma pesin õunad ära}. Otherwise: the plural osastav (3rd form), {Ma ostsin õunu}.";
const WATCH = "English says it with \"the\" and the verb: I bought apples, I ate the apples up. Estonian says it in the ending: {Ma sõin õunad ära} means they're gone, every one.";

const TABS = [
  { v: "a", label: "A: Forms card" },
  { v: "b", label: "B: Why this form?" },
  { v: "c", label: "C: Word map" },
] as const;

export function CaseFormsMock({ rows, variant }: { rows: MockRow[]; variant: "a" | "b" | "c" }) {
  return (
    <Page title="Step 3 of 6: How it works" eyebrow="Mockup, B1 lesson 3" compact>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Options">
        {TABS.map((t) => (
          <Link
            key={t.v}
            href={`/mockups/case-forms?v=${t.v}`}
            className="rounded-full border px-4 py-2 text-base font-semibold"
            style={{
              borderColor: "var(--edge)",
              background: variant === t.v ? "var(--accent)" : "var(--surface)",
              color: variant === t.v ? "var(--on-hue)" : "var(--ink)",
            }}
            aria-current={variant === t.v ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-6">
        <Card><RuleNote summary={RULE} watchOut={WATCH} /></Card>
        {variant === "a" && <OptionA rows={rows} />}
        {variant === "b" && <OptionB rows={rows} />}
        {variant === "c" && <OptionC rows={rows} />}
      </div>
    </Page>
  );
}

/* ---------- shared table ---------- */

function caseLabel(r: MockRow) {
  return (
    <span className="flex flex-col">
      <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{r.et}</span>
      <span className="text-sm" style={{ color: "var(--ink-3)" }}>
        <span lang="et">{r.ask}</span> {r.askEn}
      </span>
    </span>
  );
}

function FormCell({ form, lit, dim, ending }: { form: string | null; lit?: boolean; dim?: boolean; ending?: string }) {
  if (!form) return <span style={{ color: "var(--ink-3)" }}>n/a</span>;
  const cut = ending && form.endsWith(ending) ? form.length - ending.length : form.length;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
      style={{
        background: lit ? "var(--accent-soft)" : "transparent",
        boxShadow: lit ? "inset 0 0 0 2px var(--accent)" : "none",
        opacity: dim ? 0.55 : 1,
      }}
    >
      <Speak text={form} size={14} />
      <span lang="et" className="font-semibold" style={{ color: lit ? "var(--accent-deep)" : "var(--ink)" }}>
        {form.slice(0, cut)}
        {cut < form.length && <span style={{ color: "var(--accent-deep)", textDecoration: "underline" }}>{form.slice(cut)}</span>}
      </span>
    </span>
  );
}

function FormsTable({ rows, lit, dimUnused, showPins }: {
  rows: MockRow[];
  lit: (r: MockRow, c: Col) => boolean;
  dimUnused?: boolean;
  showPins?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--r-lg)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}>
      <table className="w-full min-w-[320px] text-base">
        <thead>
          <tr style={{ color: "var(--ink-3)" }}>
            <th scope="col" className="label-xs px-4 py-3 text-left">Case</th>
            <th scope="col" className="label-xs px-4 py-3 text-left">ainsus (one)</th>
            <th scope="col" className="label-xs px-4 py-3 text-left">mitmus (more than one)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const used = lit(r, "sg") || lit(r, "pl");
            const pins = showPins ? PINS.filter((p) => p.row === r.key) : [];
            return (
              <tr key={r.key} className="border-t" style={{ borderColor: "var(--edge)", opacity: dimUnused && !used ? 0.5 : 1 }}>
                <th scope="row" className="px-4 py-3 text-left align-top font-normal">{caseLabel(r)}</th>
                {(["sg", "pl"] as const).map((c) => (
                  <td key={c} className="px-4 py-3 align-top">
                    <FormCell form={r[c]} lit={lit(r, c)} ending={r.principal ? undefined : r.suffix} />
                    {pins.filter((p) => p.col === c).map((p) => (
                      <span key={p.sentence} className="mt-1 block text-sm" style={{ color: "var(--ink-2)" }}>
                        <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{p.sentence}</span> {p.en}
                      </span>
                    ))}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const isPinned = (r: MockRow, c: Col) => PINS.some((p) => p.row === r.key && p.col === c);
const THREE = ["NOMINATIVE", "GENITIVE", "PARTITIVE"];

/* ---------- Option A: the three stored forms, lit, with the sentence and the why ---------- */

function OptionA({ rows }: { rows: MockRow[] }) {
  const three = rows.filter((r) => THREE.includes(r.key));
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>Where the forms come from: <span lang="et">õun</span>, apple</h2>
        <FormsTable rows={three} lit={isPinned} />
        <details className="explain-panel rounded-[var(--r-lg)] border p-4" style={{ borderColor: "var(--edge)" }}>
          <summary className="cursor-pointer font-semibold" style={{ color: "var(--accent-deep)" }}>Show all the cases of õun</summary>
          <div className="mt-3"><FormsTable rows={rows} lit={isPinned} /></div>
        </details>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>Why each form</h2>
        {PINS.slice(0, 3).map((p) => (
          <Card key={p.sentence}>
            <p className="flex items-center gap-2 text-lg">
              <Speak text={p.sentence} size={16} />
              <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{p.sentence}</span>
              <span style={{ color: "var(--ink-2)" }}>{p.en}</span>
            </p>
            <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink)" }}>{p.why}</p>
          </Card>
        ))}
      </section>
    </>
  );
}

/* ---------- Option B: tap through the questions, land on the cell ---------- */

interface Step { q: string; options: { label: string; next: Step | { row: string; col: Col } }[] }

const TREE: Step = {
  q: "Is there a number in front of it (two, three, ten)?",
  options: [
    { label: "Yes, a number", next: { row: "PARTITIVE", col: "sg" } },
    {
      label: "No",
      next: {
        q: "One apple, or more than one?",
        options: [
          { label: "One", next: { row: "GENITIVE", col: "sg" } },
          {
            label: "More than one",
            next: {
              q: "Is it a set amount: these apples, all of them?",
              options: [
                { label: "No, just some, an open amount", next: { row: "PARTITIVE", col: "pl" } },
                {
                  label: "Yes, a known set",
                  next: {
                    q: "Did the job get done, and is it a yes (not a \"didn't\")?",
                    options: [
                      { label: "Yes, done", next: { row: "NOMINATIVE", col: "pl" } },
                      { label: "No, still going, or a \"didn't\"", next: { row: "PARTITIVE", col: "pl" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
};

function OptionB({ rows }: { rows: MockRow[] }) {
  const [at, setAt] = useState(0);
  const [path, setPath] = useState<{ q: string; a: string }[]>([]);
  const [node, setNode] = useState<Step | { row: string; col: Col }>(TREE);
  const pin = PINS[at]!;
  const landed = "row" in node ? node : null;
  const right = landed && landed.row === pin.row && landed.col === pin.col;
  const reset = (i = at) => { setAt(i); setPath([]); setNode(TREE); };
  const three = rows.filter((r) => THREE.includes(r.key));
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>Why this form? Pick a line from today</h2>
        <div className="flex flex-wrap gap-2">
          {PINS.slice(0, 3).map((p, i) => (
            <button
              key={p.sentence}
              type="button"
              onClick={() => reset(i)}
              className="choice-btn rounded-full border px-4 py-2 text-base"
              style={{ borderColor: i === at ? "var(--accent)" : "var(--edge)", ["--choice-bg" as string]: i === at ? "var(--accent-soft)" : "var(--surface)" }}
              aria-pressed={i === at}
            >
              <span lang="et" className="font-semibold">{p.sentence}</span>
            </button>
          ))}
        </div>
        <Card>
          <p className="flex items-center gap-2 text-xl">
            <Speak text={pin.sentence} size={16} />
            <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{pin.sentence}</span>
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>{pin.en} Why <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>{pin.form}</span>?</p>
          <ol className="mt-4 flex flex-col gap-2">
            {path.map((s) => (
              <li key={s.q} className="text-base" style={{ color: "var(--ink-2)" }}>
                {s.q} <span className="font-semibold" style={{ color: "var(--ink)" }}>{s.a}</span>
              </li>
            ))}
          </ol>
          {!landed && "q" in node && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{node.q}</p>
              <div className="flex flex-wrap gap-2">
                {node.options.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    className="choice-btn rounded-[var(--r-sm)] border px-4 py-2 text-base"
                    style={{ borderColor: "var(--edge)", ["--choice-bg" as string]: "var(--surface)" }}
                    onClick={() => { setPath([...path, { q: node.q, a: o.label }]); setNode(o.next); }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {landed && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="flex items-center gap-2 text-lg font-semibold" style={{ color: right ? "var(--accent-deep)" : "var(--ink)" }}>
                <ArrowRight size={18} />
                {right ? `That's the cell: ${pin.form}.` : "That lands on a different cell. Look at the sentence again."}
              </p>
              {right && <p className="text-base leading-relaxed" style={{ color: "var(--ink)" }}>{pin.why}</p>}
              <button type="button" className="tap-tint inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-base" style={{ color: "var(--accent-deep)" }} onClick={() => reset()}>
                <RotateCcw size={16} /> Start again
              </button>
            </div>
          )}
        </Card>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}><span lang="et">õun</span>, apple: the cell your answers point to</h2>
        <FormsTable rows={three} lit={(r, c) => !!landed && landed.row === r.key && landed.col === c} />
      </section>
    </>
  );
}

/* ---------- Option C: the full table, with today's lines pinned to their cells ---------- */

function OptionC({ rows }: { rows: MockRow[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}><span lang="et">õun</span>, apple: every form, and where today&apos;s lines use them</h2>
      <p className="text-base" style={{ color: "var(--ink-2)" }}>The lit cells are the forms in today&apos;s conversation. Faded rows aren&apos;t used today.</p>
      <FormsTable rows={rows} lit={isPinned} dimUnused showPins />
    </section>
  );
}
