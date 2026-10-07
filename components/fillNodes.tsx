import { Fragment, type ReactNode } from "react";

/**
 * A translated template's `{name}` slots filled with elements rather than
 * strings: a date drawn by `DateText`, a figure in `<strong>`.
 *
 * `fill` in `lib/copy/locale.ts` returns a string, so a sentence with an
 * element inside it used to be cut into pieces around the element, and a
 * sentence cut into pieces cannot be translated, because Russian and
 * Ukrainian put the pieces in another order. This keeps the sentence whole and
 * puts each element where the translation put its slot. No hooks, so it works
 * in a server component and a client one alike.
 */
export function fillNodes(template: string, values: Readonly<Record<string, ReactNode>>): ReactNode {
  const parts = template.split(/(\{\w+\})/);
  return parts.map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{key !== undefined && key in values ? values[key] : part}</Fragment>;
  });
}
