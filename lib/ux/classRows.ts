/**
 * A CLASS SOMEBODY BELONGS TO IS A PLACE THEY GO, SO IT HAS A ROW.
 *
 * Everything else in the rail is the same for everybody (`lib/ux/nav.ts`) or
 * pinned by the learner (`lib/ux/navOrder.ts`). A class is neither: it exists
 * because they joined one, and it is where the homework and the board are for
 * as long as the term runs. Reaching it through Progress and then Classes every
 * evening is two presses too many for the one screen a student in a class
 * opens most after Today.
 *
 * So a membership draws a row, and it lasts exactly as long as the membership
 * does: until the learner leaves, or until the teacher archives the class,
 * which is how a class is finished here. Nothing is stored for it (ADR-014):
 * the rows are the memberships, read on every render of the shell, so there is
 * no second list to fall out of step with the first.
 *
 * Pure: a list of classes in, rail rows out.
 */
import type { Destination } from "./nav";

/**
 * How many class rows the rail carries. A teacher with a dozen groups would
 * otherwise put back the long column the rail was cut down from, and the rest
 * are one press away on `/class`, which is the row's own home.
 */
export const MAX_CLASS_ROWS = 4;

/** One class, as the shell reads it. */
export interface RailClass {
  id: string;
  name: string;
}

/** The href a class row goes to. */
export function classHref(id: string): string {
  return `/class/${encodeURIComponent(id)}`;
}

/** The rows the learner's classes draw, in the order they were given, capped. */
export function classRows(classes: readonly RailClass[]): Destination[] {
  const seen = new Set<string>();
  const out: Destination[] = [];
  for (const c of classes) {
    if (!c.id || seen.has(c.id) || out.length >= MAX_CLASS_ROWS) continue;
    seen.add(c.id);
    out.push({
      href: classHref(c.id),
      label: c.name.trim() || "Your class",
      blurb: "Your class: homework and the board",
      icon: "School",
      tone: "sky",
      keywords: "class classroom teacher homework board",
    });
  }
  return out;
}
