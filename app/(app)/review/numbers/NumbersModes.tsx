"use client";

import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { useT } from "@/components/Locale";

/**
 * The Numbers round's two modes, side by side above it: saying a number, and
 * the endings a number takes in a sentence. One round with two halves rather
 * than two rounds, which is how the operator asked for it, so the practice
 * menu keeps one tile and this is where the second half is found. Not drawn
 * inside a module step, where the step is a room with one way on.
 */
export function NumbersModes({ active }: { active: "say" | "endings" }) {
  const t = useT();
  const modes = [
    { id: "say", href: "/review/numbers", label: t("Say the number") },
    { id: "endings", href: "/review/numbers?mode=endings", label: t("Number endings") },
  ] as const;
  return (
    <nav aria-label={t("Numbers modes")} className="mx-auto flex max-w-2xl justify-center px-5 pt-6 md:px-10">
      <div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--rule)", background: "var(--raised)" }}>
        {modes.map((m) => {
          const on = m.id === active;
          return (
            <Link
              key={m.id}
              href={m.href}
              aria-current={on ? "page" : undefined}
              className={`tap-tint inline-flex min-h-[40px] items-center rounded-full px-4 text-sm font-semibold`}
              style={on
                ? { background: "var(--surface)", color: "var(--accent-deep)", boxShadow: "var(--depth)" }
                : { color: "var(--ink-2)" }}
            >
              {m.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
