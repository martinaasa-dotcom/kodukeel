"use client";

import { useState } from "react";
import { Map as MapIcon, Lightbulb } from "lucide-react";
import { Button } from "@/components/Button";
import { Chip, KeyCap } from "@/components/ui";
import { CaseQuestion } from "@/components/CaseQuestion";
import { OPTION_CLASS, optionState } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH } from "@/lib/ux/advanceKey";

type Move = "rest" | "leave" | "arrive";
type Scene = "table" | "room";

/* Static sample data. Every form below is in the dictionary today (laud, tuba); in
   the real round they come from `caseAnswer`, never from this file. */
const DATA: Record<Scene, {
  word: string; gloss: string; set: string;
  forms: Record<Move, { form: string; key: "ADESSIVE" | "ABLATIVE" | "ALLATIVE" | "INESSIVE" | "ELATIVE" | "ILLATIVE"; q: string; plain: string; end: string }>;
  ask: Record<Move, string>;
}> = {
  table: {
    word: "laud", gloss: "table", set: "On top",
    forms: {
      rest:   { form: "laual",  key: "ADESSIVE", q: "millel? kus?",    plain: "sitting on the table", end: "-l" },
      leave:  { form: "laualt", key: "ABLATIVE", q: "millelt? kust?",  plain: "coming off the table", end: "-lt" },
      arrive: { form: "lauale", key: "ALLATIVE", q: "millele? kuhu?",  plain: "going onto the table", end: "-le" },
    },
    ask: { rest: "Where is the book?", leave: "Where is the book coming from?", arrive: "Where is the book going?" },
  },
  room: {
    word: "tuba", gloss: "room", set: "Inside",
    forms: {
      rest:   { form: "toas",  key: "INESSIVE", q: "milles? kus?",    plain: "being in the room",   end: "-s" },
      leave:  { form: "toast", key: "ELATIVE",  q: "millest? kust?",  plain: "coming out of the room", end: "-st" },
      arrive: { form: "tuppa", key: "ILLATIVE", q: "millesse? kuhu?", plain: "going into the room", end: "-sse, or a stored short form" },
    },
    ask: { rest: "Where is the book?", leave: "Where is the book coming from?", arrive: "Where is the book going?" },
  },
};

const ORDER: Move[] = ["rest", "leave", "arrive"];

function Picture({ scene, move }: { scene: Scene; move: Move }) {
  const ink = "var(--ink-3)";
  const arrow = "var(--accent-deep)";
  const book = (x: number, y: number) => (
    <g transform={`translate(${x} ${y - 12})`} fill="var(--accent-soft)" stroke="var(--accent-deep)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M-20 -11 Q-10 -16 0 -9 Q10 -16 20 -11 V12 Q10 7 0 14 Q-10 7 -20 12 Z" />
      <path d="M0 -9 V14" fill="none" />
    </g>
  );
  return (
    <svg viewBox="0 0 360 210" role="img" className="h-auto w-full"
      aria-label={`${DATA[scene].ask[move]} ${scene === "table" ? "A table with a book" : "A room with a book"}`}>
      <defs>
        <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1 1 L9 5 L1 9" fill="none" stroke={arrow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <line x1="20" y1="180" x2="340" y2="180" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      {scene === "table" ? (
        <g fill="var(--raised)" stroke={ink} strokeWidth="2.5" strokeLinejoin="round">
          <rect x="120" y="116" width="120" height="12" rx="4" />
          <rect x="132" y="128" width="10" height="52" rx="2" />
          <rect x="218" y="128" width="10" height="52" rx="2" />
        </g>
      ) : (
        <g fill="var(--raised)" stroke={ink} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M120 180 V92 L180 52 L240 92 V180" />
          <path d="M170 180 V138 a10 10 0 0 1 20 0 V180" fill="var(--ground, transparent)" />
        </g>
      )}
      {scene === "table" && move === "rest" && book(180, 110)}
      {scene === "table" && move === "leave" && (<>
        {book(290, 70)}
        <path d="M200 106 C 230 60, 250 56, 268 66" fill="none" stroke={arrow} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" markerEnd="url(#head)" />
      </>)}
      {scene === "table" && move === "arrive" && (<>
        {book(70, 70)}
        <path d="M96 66 C 120 50, 150 52, 168 92" fill="none" stroke={arrow} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" markerEnd="url(#head)" />
      </>)}
      {scene === "room" && move === "rest" && book(180, 120)}
      {scene === "room" && move === "leave" && (<>
        {book(300, 160)}
        <path d="M200 140 C 230 150, 250 150, 272 152" fill="none" stroke={arrow} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" markerEnd="url(#head)" />
      </>)}
      {scene === "room" && move === "arrive" && (<>
        {book(50, 160)}
        <path d="M78 152 C 110 150, 130 148, 160 146" fill="none" stroke={arrow} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" markerEnd="url(#head)" />
      </>)}
    </svg>
  );
}

export function MapMockup({ scene, initial }: { scene: Scene; initial: "ask" | "right" | "wrong" }) {
  const d = DATA[scene];
  const move: Move = "arrive";
  const answerIdx = ORDER.indexOf(move);
  const [picked, setPicked] = useState<number | null>(initial === "right" ? answerIdx : initial === "wrong" ? 0 : null);
  const answered = picked !== null;
  const right = picked === answerIdx;
  // Options are shuffled in the real round; fixed here so the shots are readable.
  const options = ORDER.map((m) => d.forms[m].form);

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Map</h1>

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
          <MapIcon size={15} aria-hidden /> 3 of 8
        </span>
        <span className="flex items-center gap-3">
          <Chip>{d.set}</Chip>
          <Chip tone="good">2 right</Chip>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
        <div className="h-full rounded-full" style={{ width: "37.5%", background: "var(--accent)" }} />
      </div>

      <div className="mt-6 rounded-[var(--r-xl)] border px-4 pb-3 pt-4" style={{ background: "var(--surface)", borderColor: "var(--rule)" }}>
        <Picture scene={scene} move={move} />
        <p className="mt-1 text-center text-sm" style={{ color: "var(--ink-3)" }}>
          <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{d.word}</span>, {d.gloss}
        </p>
      </div>

      <p className="mt-6 text-center text-xl font-semibold" style={{ color: "var(--accent-deep)" }}>{d.ask[move]}</p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {options.map((option, i) => {
          const chose = picked === i;
          return (
            <button key={option} type="button" disabled={answered} onClick={() => setPicked(i)}
              className={`choice-btn ${answered ? OPTION_CLASS[optionState(i === answerIdx, chose)] : ""} flex min-h-[3.75rem] items-center gap-3 rounded-[var(--r-lg)] border px-4 text-left`}>
              <KeyCap>{i + 1}</KeyCap>
              <span lang="et" className="flex-1 text-lg font-semibold">{option}</span>
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="mt-4 flex justify-center">
          <button type="button" className="tap-tint inline-flex items-center gap-2 rounded-[var(--r-lg)] px-3 py-2 text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
            <Lightbulb size={15} aria-hidden /> Hint
          </button>
        </div>
      )}

      {answered && (
        <section className="mt-5" aria-label="The set">
          <p role="status" className="text-center text-base" style={{ color: "var(--ink)" }}>
            {right ? "Yes. " : `Not that one. ${d.forms[ORDER[picked!] as Move]?.form ?? ""} is ${d.forms[ORDER[picked!] as Move]?.plain}. `}
            <span lang="et" className="font-semibold">{d.forms[move].form}</span> is {d.forms[move].plain}.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {ORDER.map((m) => {
              const f = d.forms[m];
              const on = m === move;
              return (
                <div key={m} className="rounded-[var(--r-lg)] border px-3 py-3 text-center"
                  style={{ background: on ? "var(--accent-soft)" : "var(--surface)", borderColor: on ? "var(--accent)" : "var(--rule)" }}>
                  <p lang="et" className="text-lg font-bold" style={{ color: on ? "var(--accent-deep)" : "var(--ink)" }}>{f.end.split(",")[0]}</p>
                  <p lang="et" className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{f.form}</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}><CaseQuestion question={f.q.split(" ")[1]} inline /></p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex justify-center">
            <Button variant="primary" size="lg">Continue <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap></Button>
          </div>
        </section>
      )}
    </div>
  );
}
