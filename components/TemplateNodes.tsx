import { Fragment, type ReactNode } from "react";

/**
 * A translated template with elements in its slots rather than strings.
 *
 * `fill` in `lib/copy/locale.ts` puts text into a `{name}` slot, which is what
 * nearly every line needs. A few lines carry an element in the middle of the
 * sentence, an Estonian title marked `lang="et"` or a `<code>` naming a
 * variable, and building those by concatenating translated pieces is the one
 * thing the translation rules forbid, since word order differs between the
 * languages. So the whole sentence is translated as one template and the
 * element goes into its slot here. No directive: it is a plain function, and
 * a server page and a client component both call it.
 */
export function fillNodes(template: string, values: Readonly<Record<string, ReactNode>>): ReactNode {
  const parts = template.split(/\{(\w+)\}/);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Fragment key={i}>{part in values ? values[part] : `{${part}}`}</Fragment>
      : part === "" ? null : <Fragment key={i}>{part}</Fragment>,
  );
}
