import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with its emphasis and its elements put back.
 *
 * The public pages are long prose with a bold phrase in the middle of a
 * sentence, a variable name in code type and a link inside a clause, and
 * building such a sentence out of separately translated pieces fixes the
 * English word order into every language. So a whole sentence is one line in
 * the tables, written with `**bold**` and `` `code` `` marks and `{name}`
 * slots, and this draws it after `tr` has chosen the language. The English
 * renders exactly as the markup it replaced.
 *
 * No hooks, so it works in a server component as well as a client one; the
 * client counterpart for a context-held language is `components/TrParts.tsx`.
 * A slot the parts do not supply is printed as written, so a missing
 * translation reads as English rather than as a hole.
 */
export function rich(text: string, parts: Readonly<Record<string, ReactNode>> = {}): ReactNode {
  const pieces = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\{\w+\})/);
  return pieces.map((piece, i) => {
    if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
      return <strong key={i}>{rich(piece.slice(2, -2), parts)}</strong>;
    }
    if (piece.startsWith("`") && piece.endsWith("`") && piece.length > 2) {
      return <code key={i}>{piece.slice(1, -1)}</code>;
    }
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    if (name !== undefined && name in parts) return <Fragment key={i}>{parts[name]}</Fragment>;
    return <Fragment key={i}>{piece}</Fragment>;
  });
}
