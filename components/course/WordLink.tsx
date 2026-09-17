"use client";

import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { useModuleFocus } from "@/components/course/moduleFocus";

/**
 * A WORD THAT OPENS ITS OWN ENTRY, OR JUST THE WORD INSIDE A MODULE.
 *
 * The dictionary is one press from a great many words in this app, and that is
 * right nearly everywhere: a word in a table of forms or in the line saying
 * what it means is worth reading about, and the entry is where you read about
 * it. Inside a step of tonight's module it is a door out of the evening, and
 * the learner who takes one lands on the dictionary with the frame gone and
 * nothing saying how to get back.
 *
 * ONE DRAWING BECAUSE THE THIRD ONE WAS FOUND THE HARD WAY. The case page's
 * table of words was fixed by hand, then Sõnad's finish card, and then CI
 * found a third: the verb table on a grammar topic, four links to
 * `/dictionary?q=aitama` on the reading step of an A2 evening. The reading
 * this box happened to open had no verb table, so nothing local could see it,
 * and it was `scripts/test-module.mjs` walking an evening and listing every
 * link that said so. Three bespoke fixes is a fourth one waiting; this is the
 * answer in one place, so a table written later inherits it.
 *
 * The word is never the thing that goes. What goes is the door.
 */
export function WordLink({ lemma, className = "", linkClass = "", style, lang = "et", children }: {
  /** The word to look up, which is what the entry is keyed on. */
  lemma: string;
  /** How the word is drawn either way: a table and a sentence set it differently. */
  className?: string;
  /**
   * What only a link may wear.
   *
   * An underline, or one that arrives on hover, is the affordance rather than
   * the styling: carried onto the span it would promise a press that is not
   * there, which is worse than the door being gone, because the learner reaches
   * for it. So the caller says which of its classes are the promise.
   */
  linkClass?: string;
  style?: React.CSSProperties;
  lang?: string;
  children: ReactNode;
}) {
  const focus = useModuleFocus();
  if (focus) return <span lang={lang} className={className} style={style}>{children}</span>;
  return (
    <Link
      href={`/dictionary?q=${encodeURIComponent(lemma)}`}
      className={`${className} ${linkClass}`.trim()}
      style={style}
      lang={lang}
    >
      {children}
    </Link>
  );
}
