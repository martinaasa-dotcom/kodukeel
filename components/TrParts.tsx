"use client";

import { Fragment, type ReactNode } from "react";
import { useT } from "@/components/Locale";

/**
 * A translated sentence with elements standing in its slots.
 *
 * `fill` puts strings into a template, and some sentences carry an element
 * instead: an Estonian word in its own `lang` span, a link. Building such a
 * sentence out of translated pieces would fix the English word order into
 * every language, so the whole sentence is one template (`{word} is the
 * {form}.`) and the elements are put back where that language's template puts
 * its slots. A slot the template does not name is left out rather than
 * appended, and `{name}` the parts do not supply is printed as written, so a
 * missing translation reads as English rather than as a hole.
 */
export function TrParts({
  template,
  parts,
  stopped = [],
}: {
  template: string;
  parts: Readonly<Record<string, ReactNode>>;
  /**
   * Slots whose own text already ends a sentence, `Aeglasemalt, palun.` or
   * `Head aega!`. The template's full stop straight after one is dropped,
   * since a stored phrase carries its own and two in a row read as a fault.
   */
  stopped?: readonly string[];
}) {
  const t = useT();
  const pieces = t(template).split(/(\{\w+\})/);
  return (
    <>
      {pieces.map((piece, i) => {
        const name = /^\{(\w+)\}$/.exec(piece)?.[1];
        const before = /^\{(\w+)\}$/.exec(pieces[i - 1] ?? "")?.[1];
        const text = before !== undefined && stopped.includes(before) ? piece.replace(/^\./, "") : piece;
        return <Fragment key={i}>{name !== undefined && name in parts ? parts[name] : text}</Fragment>;
      })}
    </>
  );
}
