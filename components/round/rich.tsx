import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with an element standing in one of its slots.
 *
 * `fill` puts a string in a `{name}` slot; this puts a node there, for the
 * sentences that carry an Estonian word in its own `<span lang="et">` or a
 * word painted in a hue. The template has been through `t()` already, so the
 * slot lands wherever the reader's language puts it rather than where English
 * did, which is the whole reason for not gluing translated halves together.
 */
export function rich(template: string, parts: Readonly<Record<string, ReactNode>>): ReactNode {
  const pieces = template.split(/(\{\w+\})/g);
  return pieces.map((piece, i) => {
    const key = /^\{(\w+)\}$/.exec(piece)?.[1];
    return <Fragment key={i}>{key !== undefined && key in parts ? parts[key] : piece}</Fragment>;
  });
}
