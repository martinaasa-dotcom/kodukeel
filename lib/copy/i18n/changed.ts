/**
 * WHICH TRANSLATED LINES ARE NEW OR DIFFERENT SINCE AN EARLIER TABLE.
 *
 * Both tables are the generated files' `lines` (`lib/copy/i18n/generated/`),
 * keyed on `lineKey` of the English. A key the earlier table did not hold is
 * new; a key it held with another value is changed; a key it held and the
 * current one does not is gone, and is not listed, because a line nobody shows
 * any more is not one a reviewer has to read. A line whose English changed has
 * a new key, so it appears as new, which is right: it is a new line to read.
 *
 * Pure, so the git call that fetches the earlier table stays in the script.
 */
export interface ChangedLines {
  added: string[];
  changed: string[];
}

export function changedLines(
  before: Readonly<Record<string, string>>,
  now: Readonly<Record<string, string>>,
): ChangedLines {
  const added: string[] = [];
  const changed: string[] = [];
  for (const [key, value] of Object.entries(now)) {
    if (!Object.hasOwn(before, key)) added.push(key);
    else if (before[key] !== value) changed.push(key);
  }
  return { added, changed };
}
