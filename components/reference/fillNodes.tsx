import { Fragment, type ReactNode } from "react";

/**
 * A translated template with elements in its slots: `{form} is the {what}.`
 * with `{form}` an Estonian word marked up as Estonian.
 *
 * `fill` in `lib/copy/locale.ts` fills a slot with a string, which is right
 * everywhere the value is text. Where the value is an element (a word carrying
 * `lang="et"`, a link) the sentence still has to be one template, because the
 * word order is the translation's to decide: building it out of a translated
 * half, the element and another translated half is the concatenation the
 * standard forbids. No hooks, so it works in a server component and a client
 * one alike.
 */
export function fillNodes(template: string, values: Readonly<Record<string, ReactNode>>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const slot = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{slot !== undefined && slot in values ? values[slot] : part}</Fragment>;
  });
}
