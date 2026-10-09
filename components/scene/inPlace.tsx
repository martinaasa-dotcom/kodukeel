import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with an element standing where its `{slot}` is.
 *
 * Word order differs between English, Russian and Ukrainian, so a sentence
 * holding a link or a run of Estonian is translated whole and the element is
 * put back where the translation put the slot, rather than built out of
 * translated halves around it.
 */
export function around(template: string, slot: string, node: ReactNode): ReactNode {
  const [before, after = ""] = template.split(`{${slot}}`);
  return <>{before}{node}{after}</>;
}

/**
 * A translated sentence whose `[bracketed words]` are a link, drawn by `link`.
 * The brackets are the one place the link sits, so a translation moves them
 * with the words they belong to.
 */
export function withLink(template: string, link: (words: string) => ReactNode): ReactNode {
  return template.split(/(\[[^\]]+\])/).map((part, at) => (
    <Fragment key={at}>{/^\[.*\]$/.test(part) ? link(part.slice(1, -1)) : part}</Fragment>
  ));
}
