"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const STEPS = [
  { text: "Go to ", link: { href: "https://console.anthropic.com", label: "console.anthropic.com" }, after: " and sign in. Add a little credit: five dollars lasts about a month." },
  { text: "Open ", strong: "Settings", after: ", then API keys." },
  { text: "Click ", strong: "Create Key", after: ". Give it any name. Copy the key it shows you: you only see it once." },
  { text: "In this project's folder, open the file called ", code: ".env", after: " and paste the key between the quotes, like the example below." },
  { text: "Stop the app (Ctrl-C in the terminal) and run ", code: "npm run dev", after: " again. Anu will be waiting." },
];

/*
  The key and nothing else. It used to pin a model on a second line, which
  reads as helpful and was the opposite: with a chain of free models behind it,
  naming one replaced the whole chain, so the learner following this guide
  opted out of the fallback in the act of setting Anu up. There is no free
  chain to opt out of now, and the rule survives for a simpler reason: the
  default is the model this app is written and priced against, and a guide that
  hands somebody a second thing to get wrong is a guide with a longer failure
  list.
*/
const SNIPPET = 'ANTHROPIC_API_KEY="paste-your-key-here"';

export function SetupGuide() {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        Anu needs a key to answer questions. Everything else (the dictionary, your cards, audio)
        works without one, and keeps working when the day&rsquo;s allowance runs out. A question
        costs about a cent and a half, and the app has a daily ceiling it cannot be talked out of.
        Here is the whole thing, step by step:
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
              {s.text}
              {s.link && (
                <a href={s.link.href} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent-deep)" }}>
                  {s.link.label}
                </a>
              )}
              {s.strong && <strong style={{ color: "var(--ink)" }}>{s.strong}</strong>}
              {s.code && (
                <code className="rounded-md px-1.5 py-0.5 text-xs" style={{ background: "var(--raised)", color: "var(--ink)" }}>
                  {s.code}
                </code>
              )}
              {s.after}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-md border" style={{ borderColor: "var(--rule)" }}>
        <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--rule-soft)" }}>
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>.env</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(SNIPPET);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: copied ? "var(--good-ink)" : "var(--ink-3)" }}
          >
            {copied ? <><Check size={13} aria-hidden /> Copied</> : <><Copy size={13} aria-hidden /> Copy</>}
          </button>
        </div>
        <pre className="overflow-x-auto px-3 py-3 text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
{SNIPPET}
        </pre>
      </div>

      {/*
        One line, and this used to tell the reader to change a second one that
        has never existed. What replaces it names a real variable and says what
        it would cost, in both directions, since the reason to change it is as
        often thrift as it is sharpness.
      */}
      <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
        Anu asks Claude Sonnet. Adding{" "}
        <code>ANTHROPIC_MODEL=&quot;claude-haiku-4-5&quot;</code> on a line of its own halves what a
        question costs, and <code>claude-opus-5</code> buys a sharper answer for a few times more.
      </p>
    </div>
  );
}
