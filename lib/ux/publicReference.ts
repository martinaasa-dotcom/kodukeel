/**
 * WHICH OF THE GRAMMAR REFERENCE A STRANGER MAY READ (docs/39, FB-8).
 *
 * Somebody searching "Estonian cases" or "seesütlev" should land on the app's
 * own reference and be able to read it with no account. Five pages are that
 * reference: the hub, the list of endings, one ending, one grammar topic, and
 * the build-a-word walk. Three pages under the same address stay signed in,
 * because they read the learner's own words more deeply: the exceptions area,
 * the look-alike words and the page for Ukrainian speakers.
 *
 * WHY THIS IS NOT ONE MORE `path.startsWith` IN THE MIDDLEWARE. Every other
 * public path is a prefix, and `/grammar` as a prefix would hand the three
 * signed-in pages to anybody too. So this is exact: `/grammar`, one segment
 * under it that is not one of the three, or `/grammar/topic/<id>`. A page the
 * reference does not have still answers 404 from the page itself.
 *
 * Signed in, nothing about these pages changes (D7): the learner's own words
 * lead, as they always did. Signed out, they show the dictionary's own example
 * words and nothing from anybody's deck.
 *
 * Pure: no React, no Next, no Prisma.
 */

/** The grammar pages that stay behind the sign-in, by their first segment under `/grammar`. */
export const SIGNED_IN_REFERENCE = ["exceptions", "twins", "ukrainian"] as const;

export function isPublicReference(path: string): boolean {
  const p = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (p === "/grammar") return true;
  const match = /^\/grammar\/([^/]+)(?:\/([^/]+))?$/.exec(p);
  if (!match) return false;
  const [, first, second] = match as unknown as [string, string, string | undefined];
  if ((SIGNED_IN_REFERENCE as readonly string[]).includes(first)) return false;
  if (second !== undefined) return first === "topic";
  return first !== "topic";
}
