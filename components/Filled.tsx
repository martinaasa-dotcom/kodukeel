import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with an element inside it: a link, a word of
 * Estonian, a number set in its own ink.
 *
 * `fill` in lib/copy/locale.ts puts strings into a template; a sentence on a
 * screen often carries a node instead, and building it as three translated
 * fragments around the node is the one thing a translation cannot survive,
 * since Russian and Ukrainian put the link somewhere else in the sentence. So
 * the whole sentence is one line in the table with `{name}` where the node
 * goes, and this splits it there. A slot the values do not name is left as it
 * was written, which is how a missing key shows itself rather than vanishing.
 *
 * No hook and no directive, so a server component can call it as readily as a
 * client one.
 */
export function filled(template: string, values: Readonly<Record<string, ReactNode>>): ReactNode {
  const parts = template.split(/(\{\w+\})/g);
  return parts.map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    if (key && key in values) return <Fragment key={i}>{values[key]}</Fragment>;
    return part;
  });
}
