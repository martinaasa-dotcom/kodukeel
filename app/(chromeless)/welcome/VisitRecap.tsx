"use client";

import { useVisit } from "./visit";

/**
 * The close, said to the person who did something on the way down.
 *
 * Nothing renders for a visitor who built nothing and ordered nothing, so the
 * panel reads exactly as it did. For one who did, the forms they built are
 * set out as the Estonian they are, which is the one moment on this page
 * where the visitor's own work is the thing on screen: that is the reason to
 * press the button under it, and it is truer than any claim the page makes.
 * Held in memory for the tab only (`./visit`); nothing is sent anywhere.
 */
export function VisitRecap() {
  const { built, ordered } = useVisit();
  if (built.length === 0 && !ordered) return null;
  const shown = built.slice(-8);
  return (
    <div className="visit-recap mx-auto mt-8 max-w-2xl rounded-[var(--r-lg)] px-5 py-4" aria-live="polite">
      <p className="text-md font-semibold" style={{ color: "var(--ink)" }}>
        {built.length > 0 && ordered
          ? `You built ${built.length === 1 ? "a form" : `${built.length} forms`} and ordered ${ordered} in Estonian, on a landing page.`
          : built.length > 0
            ? `You built ${built.length === 1 ? "a form" : `${built.length} forms`} of Estonian on a landing page.`
            : `You ordered ${ordered} in Estonian, on a landing page.`}
      </p>
      {shown.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {shown.map((form) => (
            <li key={form} lang="et" className="visit-chip rounded-full px-3 py-1 text-base font-bold">{form}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        Imagine fifteen minutes of that every evening.
      </p>
    </div>
  );
}
