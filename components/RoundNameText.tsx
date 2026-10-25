import type { RoundName } from "@/lib/ux/roundNames";

/**
 * A round's name in running text: the Estonian, marked Estonian so a screen
 * reader says it with Estonian sounds, then the English in parentheses in the
 * reader's language. The same words as `inlineName` in `lib/ux/roundNames.ts`,
 * which is the string form for a tab title or a label that cannot carry markup.
 *
 * No hooks, so a server page and a client round draw it the same way.
 */
export function RoundNameText({ name, translate }: { name: RoundName; translate: (english: string) => string }) {
  return (
    <>
      <span lang="et">{name.et}</span> ({translate(name.en)})
    </>
  );
}
