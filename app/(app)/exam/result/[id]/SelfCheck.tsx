"use client";

import { useId, useState } from "react";

/**
 * Questions to read one's own text back against, ticked by the reader.
 *
 * Nothing here is marked, stored or sent anywhere: a tick is the learner
 * telling themselves they looked, and it is gone on the next visit. The lines
 * are `SELF_CHECK` in `lib/exam/selfCheck.ts`, which holds no Estonian.
 */
export function SelfCheck({ items }: { items: readonly string[] }) {
  const id = useId();
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const toggle = (i: number) =>
    setDone((was) => {
      const next = new Set(was);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <fieldset className="mt-3 rounded-[var(--r)] border px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
      <legend className="label-xs px-1" style={{ color: "var(--ink-3)" }}>
        Read it back yourself · {done.size} of {items.length}
      </legend>
      <ul className="flex flex-col gap-1">
        {items.map((line, i) => (
          <li key={line}>
            <label htmlFor={`${id}-${i}`} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              <input
                id={`${id}-${i}`}
                type="checkbox"
                checked={done.has(i)}
                onChange={() => toggle(i)}
                className="mt-1 h-4 w-4 shrink-0"
                style={{ accentColor: "var(--accent)" }}
              />
              <span>{line}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
