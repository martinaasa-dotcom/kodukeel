"use client";

import { useVisit } from "./visit";
import { countOf, fill } from "@/lib/copy/locale";
import { useLocale, useT } from "@/components/Locale";

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
  const t = useT();
  const locale = useLocale();
  if (built.length === 0 && !ordered) return null;
  const shown = built.slice(-8);
  // One form is "a form" in English and a counted noun in the other two.
  const forms = built.length === 1 ? t("a form") : countOf(locale, built.length, "form");
  // The drink is stored in English and said in the case "ordered" takes.
  const drink = ordered ? t(ordered, "ordered") : "";
  return (
    <div className="visit-recap mx-auto mt-8 max-w-2xl rounded-[var(--r-lg)] px-5 py-4" aria-live="polite">
      <p className="text-md font-semibold" style={{ color: "var(--ink)" }}>
        {built.length > 0 && ordered
          ? fill(t("You built {forms} and ordered {drink} in Estonian, before you’ve even signed up."), { forms, drink })
          : built.length > 0
            ? fill(t("You built {forms} of Estonian, before you’ve even signed up."), { forms })
            : fill(t("You ordered {drink} in Estonian, before you’ve even signed up."), { drink })}
      </p>
      {shown.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {shown.map((form) => (
            <li key={form} lang="et" className="visit-chip rounded-full px-3 py-1 text-base font-bold">{form}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Now imagine fifteen minutes of that every evening.")}
      </p>
    </div>
  );
}
