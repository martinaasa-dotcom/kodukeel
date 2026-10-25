import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Whether a request's `Authorization: Bearer <token>` is the deployment secret
 * a scheduled or monitoring route is guarded by: `CRON_SECRET` for the
 * letters, `METRICS_TOKEN` and `RESEARCH_TOKEN` for the two aggregates.
 *
 * Three routes each had their own copy of this and they had drifted: one
 * compared byte by byte, two through `timingSafeEqual`, and all three compared
 * lengths first, which tells a caller how long the secret is. Both sides are
 * hashed to the same length here, so the comparison takes the same time
 * whatever was sent.
 *
 * A secret shorter than `MIN_SECRET_LENGTH` is read as no secret, which every
 * caller answers with a 404: a short value typed into a dashboard is a door a
 * script can walk through, and refusing it is how the operator finds out.
 * `EMAIL_TOKEN_SECRET` has held the same floor since it was written.
 */
export const MIN_SECRET_LENGTH = 16;

export function usableSecret(raw: string | undefined): string | null {
  const secret = raw?.trim() ?? "";
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

export function bearerMatches(header: string | null | undefined, raw: string | undefined): boolean {
  const secret = usableSecret(raw);
  if (!secret) return false;
  const match = /^Bearer\s+(.+)$/.exec((header ?? "").trim());
  if (!match) return false;
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(match[1]!.trim()), digest(secret));
}
