import type { CSSProperties, ReactNode } from "react";
import type { ShownMeaning } from "@/lib/collections/glossLanguage";

/**
 * ONE DRAWING OF A WORD'S MEANING, WHEREVER A MEANING IS SHOWN AS ONE.
 *
 * What a meaning line holds is decided by `meaningShown` in
 * lib/collections/glossLanguage.ts: the Institute's equivalent in the
 * learner's language leading, the English under it in the secondary ink, and
 * the second equivalent small after the first where they asked for it. This
 * is the one place that becomes markup, for the reason `WordIntro` is one
 * component: a copy per round is a round where the English quietly went
 * missing, or the `lang` did.
 *
 * `lang` is on every run, because a screen reader that reads Ukrainian with
 * English phonology reads nonsense, and a card's Estonian is already marked.
 *
 * Two shapes. Stacked is a card, a choice or a tile: the English on a line of
 * its own beneath. Inline is a row in a list, where a second line would double
 * the height of every row, so the English follows in the secondary ink.
 * `lead` styles the leading run and is the caller's, since a card's answer and
 * a list row are not the same size; everything else is the scale's own steps.
 */
export function Meaning({
  meaning, inline = false, className, leadClassName, leadStyle, englishClassName, children,
}: {
  meaning: ShownMeaning;
  inline?: boolean;
  className?: string;
  leadClassName?: string;
  leadStyle?: CSSProperties;
  englishClassName?: string;
  /** Drawn in place of the lead's own text, for a caller that sizes it (`FitText`). */
  children?: ReactNode;
}) {
  const also = meaning.also ? (
    <span lang={meaning.also.lang} className="ml-2 text-sm font-normal" style={{ color: "var(--ink-3)" }}>
      {meaning.also.text}
    </span>
  ) : null;
  if (inline) {
    return (
      <span className={className}>
        <span lang={meaning.lead.lang} className={leadClassName} style={leadStyle}>{children ?? meaning.lead.text}</span>
        {also}
        {meaning.english !== null && (
          <span lang="en" className={`ml-2 ${englishClassName ?? "text-sm"}`} style={{ color: "var(--ink-3)" }}>
            {meaning.english}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={`flex min-w-0 flex-col ${className ?? ""}`}>
      <span className="min-w-0">
        <span lang={meaning.lead.lang} className={leadClassName} style={leadStyle}>{children ?? meaning.lead.text}</span>
        {also}
      </span>
      {meaning.english !== null && (
        <span lang="en" className={englishClassName ?? "text-sm font-normal"} style={{ color: "var(--ink-2)" }}>
          {meaning.english}
        </span>
      )}
    </span>
  );
}
