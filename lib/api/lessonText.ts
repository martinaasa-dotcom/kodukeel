/**
 * A LESSON'S OWN ENGLISH IN THE LEARNER'S LANGUAGE, AS A TABLE BESIDE IT.
 *
 * The web draws every English line of a lesson through `tr`, reading the
 * `lessonText` area, and leaves the line in English where nothing has been
 * translated (`components/course/LessonText.tsx`). A native app draws the same
 * lines, so `GET /api/v1/lessons/{id}` hands over the lesson as it stands and,
 * beside it, every line the same `tr` answers for in the learner's language,
 * keyed by the English it replaces. The lesson itself is never rewritten: the
 * Estonian is not in the table and the English stays where it is, so a client
 * that ignores the table draws the web's English exactly.
 *
 * Pure: the translation is handed in, so this never reads a table of its own.
 */
export function translationsOf(
  values: readonly unknown[],
  translate: (english: string) => string,
): Record<string, string> {
  const out: Record<string, string> = {};
  const seen = new Set<string>();
  const walk = (value: unknown): void => {
    if (typeof value === "string") {
      if (seen.has(value)) return;
      seen.add(value);
      const said = translate(value);
      if (said !== value) out[value] = said;
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value && typeof value === "object") {
      for (const item of Object.values(value)) walk(item);
    }
  };
  for (const value of values) walk(value);
  return out;
}
