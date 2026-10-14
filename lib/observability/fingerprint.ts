/**
 * WHICH ERRORS ARE THE SAME ERROR.
 *
 * `/admin/errors` lists kinds of error rather than every occurrence, and the
 * operator is emailed once per new kind a day. So two reports of one fault have
 * to land on one fingerprint even when their messages differ by an id, a count,
 * a timestamp or a quoted value. Everything that varies per occurrence is
 * replaced with a placeholder before hashing; what is left is where it
 * happened and the shape of the message.
 *
 * Pure: no database, no network.
 */

/** The message with the parts that change per occurrence taken out. */
export function messageShape(message: string): string {
  return message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>")
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, "<time>")
    .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "<text>")
    // A hash or a short id: six or more hex characters with a digit among them,
    // so an English word made of the letters a to f is left alone.
    .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{6,}\b/gi, "<hex>")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/**
 * A short, stable key for the kind of error: where it happened plus the shape
 * of its message. FNV-1a over the two, as hex. Not a security hash, and does
 * not need to be one: it only groups rows that are already the operator's.
 */
export function errorFingerprint(at: string, message: string): string {
  const input = `${at}\u0000${messageShape(message)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
