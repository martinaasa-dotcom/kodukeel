"use client";

import { Check, Copy } from "lucide-react";
import { COPY_LABEL, useCopy } from "@/components/useCopy";
import { Explain } from "@/components/Explain";
import { useT } from "@/components/Locale";
import { filled } from "@/components/Filled";

/* One sentence a step, with a slot for each name in it, so a translation can
   put the link or the tab wherever its own word order wants it. */
const STEPS: { line: string; link?: { href: string; label: string }; strong?: string; strong2?: string; code?: string }[] = [
  { line: "Go to {link} and register. It's free and needs no card.", link: { href: "https://ekilex.ee", label: "ekilex.ee" } },
  { line: "Once signed in, open your {strong}, then the {strong2} tab.", strong: "profile", strong2: "API" },
  { line: "Ask for a reader key, and copy it once it arrives." },
  { line: "In this project's folder, open the file called {code} and paste the key between the quotes, like the example below.", code: ".env" },
  { line: "Stop the app (Ctrl-C in the terminal) and run {code} again.", code: "npm run dev" },
];

/**
 * What turns on with a key, in the order it actually matters: search first,
 * because it is the thing every other feature is built on top of.
 */
const UNLOCKS = [
  "Search covers all of Estonian, not just the built-in words, with every form checked, the stem changes, which case a verb takes, and each word's level.",
  "You get real example sentences too. Gap-fill cards, dictation and the sentence builder all need them, and the built-in words have hardly any.",
  "The mock exam's reading and listening parts use real sentences instead of falling back to single words.",
  "The grammar tables for the inside and outside cases show a real form instead of a blank.",
];

export function EkilexSetupGuide() {
  const t = useT();
  const [copied, copy] = useCopy();
  // Empty on purpose, matching .env.example: the value is never rendered
  // whole, since the assignment shape "EKILEX_API_KEY=<8+ chars>" is exactly
  // what CI's credential scan watches for on this key. Ekilex keys carry no
  // prefix the way a Groq or Anthropic key does, so the scan cannot
  // tell a real one from a placeholder by its shape alone.
  const snippet = 'EKILEX_API_KEY=""';

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Search, cards and audio all work without a key. A free reader key from the Institute of the Estonian Language gets you the rest:")}
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {UNLOCKS.map((u) => (
          <li key={u} className="flex gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
            <Check size={14} aria-hidden className="mt-1 shrink-0" style={{ color: "var(--accent-deep)" }} />
            <span>{t(u)}</span>
          </li>
        ))}
      </ul>

      <ol className="mt-4 flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--ink-2)" }}>
            <span
              className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
            >
              {i + 1}
            </span>
            <span>
              {filled(t(s.line), {
                link: s.link && (
                  <a href={s.link.href} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent-deep)" }}>
                    {s.link.label}
                  </a>
                ),
                strong: s.strong && <strong style={{ color: "var(--ink)" }}>{t(s.strong)}</strong>,
                strong2: s.strong2 && <strong style={{ color: "var(--ink)" }}>{s.strong2}</strong>,
                code: s.code && (
                  <code className="rounded-md px-1.5 py-0.5 text-xs" style={{ background: "var(--raised)", color: "var(--ink)" }}>
                    {s.code}
                  </code>
                ),
              })}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-md border" style={{ borderColor: "var(--rule)" }}>
        <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--rule-soft)" }}>
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>.env</span>
          <button
            type="button"
            onClick={() => copy(snippet)}
            className="tap-tint flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs"
            style={{ color: copied === "copied" ? "var(--good-ink)" : "var(--ink-3)" }}
          >
            {copied === "copied" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
            <span aria-live="polite">{t(copied === "idle" ? "Copy" : COPY_LABEL[copied])}</span>
          </button>
        </div>
        {/*
          A BOX THAT SCROLLS IS A BOX A KEYBOARD HAS TO BE ABLE TO REACH.

          The line is longer than the card at 360, so this scrolls sideways,
          and a pointer is the only thing that could move it: nothing inside is
          focusable, so tabbing went straight past and the half of the line off
          the right edge could not be read at all without a mouse. axe calls it
          `scrollable-region-focusable` and it was the one failure left in the
          sweep. `tabIndex` puts it in the tab order and the label says what
          the reader has landed on, since a focus stop announced as nothing is
          its own small fault.

          The name says which key, and it has to: both setup guides draw this
          box on the same Settings page, and two regions sharing one name is
          `landmark-unique`, which is the failure the first version of this
          traded the first one for.
        */}
        <pre
          tabIndex={0}
          role="region"
          aria-label={t("The line to add to .env for the dictionary")}
          className="overflow-x-auto px-3 py-3 text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
{snippet}
        </pre>
      </div>

      <Explain label={t("What happens to the words you already have")}>
        {/*
          NOT "already in your deck": `ImportPanel` prints that phrase as its own
          result when a paste adds nothing new, on this same page, and
          `scripts/e2e.mjs` waits for it to know the import finished. A second
          copy of it here is on screen from the first paint, so the wait
          returned at once, the driver typed into the box while the import was
          still in flight, and the panel's own `setText("")` wiped what it had
          typed. The check could not have failed either, which is the worse
          half: it would have passed with the importer saying nothing at all.
        */}
        {t("Every word you already have picks up its real forms the next time you open it, so you don't need to add anything again. If Ekilex has nothing on a word, we wait a day before asking again.")}
      </Explain>
    </div>
  );
}
