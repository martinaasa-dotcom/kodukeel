"use client";

import { useT } from "@/components/Locale";
import { fillNodes } from "@/components/TemplateNodes";
import { standardOf } from "@/lib/course/lessons/dialect";

/**
 * A REGIONAL WORD IN A LINE, SAID IN STANDARD ESTONIAN UNDER IT (C1,
 * `DIALECT_WORDS`). The dictionary knows the standard word and not the
 * regional one, so the line's underline cannot open it: this line says what
 * it stands for instead. Nothing is drawn for a line holding none.
 */
export function DialectNote({ et }: { et: string }) {
  const t = useT();
  const found = [...new Set([...et.matchAll(/\p{L}+/gu)].map((m) => m[0]))]
    .flatMap((word) => {
      const standard = standardOf(word);
      return standard ? [{ word, standard }] : [];
    });
  if (found.length === 0) return null;
  return (
    <span className="text-sm" style={{ color: "var(--ink-3)" }} data-dialect>
      {found.map(({ word, standard }, i) => (
        <span key={word}>
          {i > 0 ? " " : null}
          {fillNodes(t("{word} is {standard} in standard Estonian."), {
            word: <span lang="et" className="font-semibold" style={{ color: "var(--ink-2)" }}>{word}</span>,
            standard: <span lang="et" className="font-semibold" style={{ color: "var(--ink-2)" }}>{standard}</span>,
          })}
        </span>
      ))}
    </span>
  );
}
