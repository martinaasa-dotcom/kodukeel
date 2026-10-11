import type { ReactNode } from "react";
import { FitText } from "@/components/FitText";

/**
 * MOCKUP ONLY: two minimal shapes for Today's module card, photographed from the
 * running app with `npm run shoot`. Words and one button, nothing else. The fan
 * of steps is gone, the letters (components/HeroLetters.tsx) stay around it.
 *
 *  - "row":   the words on the left, the button on the right, one band.
 *  - "stack": the words and the button centred in one short column.
 */
export function HeroMinimal({
  variant, eyebrow, title, titleLang, text, action,
}: {
  variant: "row" | "stack";
  eyebrow: ReactNode;
  title: string;
  titleLang?: string;
  text: ReactNode;
  action: ReactNode;
}) {
  const row = variant === "row";
  return (
    <section
      data-hero-minimal={variant}
      className={`night rounded-[var(--r-xl)] border ${
        row
          ? "flex flex-col gap-5 px-6 py-6 md:flex-row md:items-center md:justify-between md:gap-12 md:px-10 md:py-7"
          : "flex flex-col items-center gap-0 px-6 py-7 text-center md:px-10 md:py-8"
      }`}
    >
      <div className={row ? "min-w-0 flex-1" : "flex min-w-0 max-w-[40rem] flex-col items-center"}>
        <p className="label-xs" style={{ color: "var(--butter-ink)", textWrap: "balance" }}>{eyebrow}</p>
        <FitText
          as="h2"
          text={title}
          lang={titleLang}
          className="font-display mt-2 font-bold leading-tight [--fit-max:var(--text-2xl)] md:[--fit-max:var(--text-3xl)]"
          style={{ color: "var(--ink)", textWrap: "balance" }}
        />
        <p className={`text-md mt-2 leading-relaxed ${row ? "max-w-[46ch]" : ""}`} style={{ color: "var(--ink-2)", textWrap: "balance" }}>
          {text}
        </p>
      </div>
      <div className={row ? "shrink-0" : "mt-5"}>{action}</div>
    </section>
  );
}
