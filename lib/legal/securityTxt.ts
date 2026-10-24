/**
 * `/.well-known/security.txt`, RFC 9116: WHERE A VULNERABILITY IN THIS
 * DEPLOYMENT IS REPORTED.
 *
 * A security reviewer looks here first, and a scanner reads it to decide
 * whether a deployment has anybody behind it. It is built from the same
 * identity the policy pages print (`resolveOperator`), so the address a
 * researcher writes to and the one on `/privacy` are one address, and a fork
 * that names nobody answers 404 rather than publishing somebody else's mailbox
 * as the place to report its faults.
 *
 * The two fields the RFC requires are `Contact` and `Expires`. `Expires` is a
 * year from the build rather than from the request: a file that always claimed
 * to be fresh would tell a reader nothing about whether anybody had looked at
 * it, and every deploy rebuilds it from the operator's current details anyway.
 * `Policy` points at `/trust`, which links `SECURITY.md`'s response times, and
 * `Canonical` names the one address the file is served from. Both need the
 * deployment's canonical origin, so a deployment that has not said where it
 * lives leaves them out rather than reading the `Host` a caller sent.
 *
 * Pure: the operator, the origin and the build time are handed in.
 */

import type { Operator } from "./operator";

/** How long the file says it can be trusted for, from the build. RFC 9116 asks for less than a year. */
export const SECURITY_TXT_LIFETIME_DAYS = 364;

export const SECURITY_TXT_PATH = "/.well-known/security.txt";

export function securityTxt(operator: Operator, origin: URL | null, builtAt: Date): string | null {
  if (!operator.identified || !operator.email) return null;
  const expires = new Date(builtAt.getTime() + SECURITY_TXT_LIFETIME_DAYS * 86_400_000);
  const lines = [
    `# How to report a security problem in this deployment of Kodukeel, run by ${operator.name}.`,
    `Contact: mailto:${operator.email}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en, et",
  ];
  if (origin) {
    lines.push(`Policy: ${new URL("/trust#security", origin).toString()}`);
    lines.push(`Canonical: ${new URL(SECURITY_TXT_PATH, origin).toString()}`);
  }
  return `${lines.join("\n")}\n`;
}
