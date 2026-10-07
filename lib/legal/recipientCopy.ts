import { fill, tr, type Locale } from "@/lib/copy/locale";
import type { Recipient } from "./recipients";

/**
 * A recipient as /privacy and /trust print it, in the page's language.
 *
 * The list is generated from the deployment (`resolveRecipients`) in English,
 * and stays generated: this only reads each line back through the tables, so a
 * Russian reader sees the same services the English one does, from the same
 * configuration, with no second list to drift. A product name the tables do
 * not hold (Groq, Anthropic) prints as it is, which is right for a name. The
 * error endpoint carries the host it was configured with, so its line is a
 * template with that host put back.
 */
const ENDPOINT = /^The error reporting endpoint at (.+)$/;

export function recipientIn(r: Recipient, locale: Locale): { name: string; what: string } {
  if (locale === "en") return { name: r.name, what: r.what };
  const endpoint = ENDPOINT.exec(r.name);
  return {
    name: endpoint ? fill(tr(locale, "The error reporting endpoint at {host}"), { host: endpoint[1]! }) : tr(locale, r.name),
    what: tr(locale, r.what),
  };
}
