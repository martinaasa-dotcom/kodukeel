import { nameOf } from "@/lib/ux/roundNames";

/**
 * A step's title, with a round's Estonian name marked as Estonian.
 *
 * A step that opens a round is called by the round's agreed name, Estonian
 * first and the English in parentheses (`activityTitle`, `stepText`), and it
 * arrives here as one string, worded on the server. Where the string opens on
 * the name of the round the step goes to, that half is set with `lang="et"`
 * so a screen reader says it with Estonian sounds, as the tile does. Any other
 * title comes back exactly as it was.
 *
 * No hooks, so the rail and the module list draw it the same way.
 */
export function StepTitle({ title, to }: { title: string; to: string }) {
  const name = nameOf(to.split(/[?#]/)[0] ?? to);
  if (!name || !title.startsWith(`${name.et} (`)) return <>{title}</>;
  return (
    <>
      <span lang="et">{name.et}</span>
      {title.slice(name.et.length)}
    </>
  );
}
