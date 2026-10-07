"use client";

import { Check, Copy } from "lucide-react";
import { COPY_LABEL, useCopy } from "@/components/useCopy";
import { useT } from "@/components/Locale";
import { filled } from "@/components/Filled";

/* Each step is one sentence with a slot where the link, the button's name or
   the file goes, so a translation can put it wherever its own word order wants. */
const STEPS: { line: string; link?: { href: string; label: string }; strong?: string; code?: string }[] = [
  { line: "Go to {link} and sign in. It's free and takes no card.", link: { href: "https://aistudio.google.com/apikey", label: "aistudio.google.com" } },
  { line: "Click {strong}. Copy the key it shows you.", strong: "Create API key" },
  { line: "In this project's folder, open the file called {code} and paste the key between the quotes, like the example below.", code: ".env" },
  { line: "Stop the app (Ctrl-C in the terminal) and run {code} again. Anu will be there, ready to help.", code: "npm run dev" },
];

/*
  The key and nothing else. This used to pin the model to one free name as
  well, which reads as helpful and is the opposite: setting it replaces the
  whole free chain with that single name, so the learner who follows this
  guide opts out of the fallback in the act of setting Anu up. Free models are
  rate-limited hard and retired without notice, and both were true of the one
  named here within a day of it being written.
*/
const SNIPPET = 'GEMINI_API_KEY="paste-your-key-here"';

export function SetupGuide() {
  const t = useT();
  const [copied, copy] = useCopy();

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Anu needs a free key before she can answer questions. The dictionary, your cards and the audio all work without one. A single Gemini key switches on Anu, the conversations and page scanning, and it costs nothing. Here's how, step by step:")}
      </p>

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
                strong: s.strong && <strong style={{ color: "var(--ink)" }}>{s.strong}</strong>,
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
            onClick={() => copy(SNIPPET)}
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
          aria-label={t("The line to add to .env for the tutor")}
          className="overflow-x-auto px-3 py-3 text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
{SNIPPET}
        </pre>
      </div>

      {/*
        The snippet is one line, and this used to tell the reader to change its
        second one. There has never been a second line: the model is not named
        there at all, it comes from `GROQ_MODEL` with a free default, so the
        instruction pointed at nothing and the reader who followed it would
        have been looking for a line that does not exist.
      */}
      <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
        {filled(t("For a backup, add a free Groq key as {key}, from {link}, on a line of its own in the same file. Then Anu can still answer when Gemini is busy."), {
          key: <code>GROQ_API_KEY</code>,
          link: (
            <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent-deep)" }}>
              console.groq.com
            </a>
          ),
        })}
      </p>
    </div>
  );
}
