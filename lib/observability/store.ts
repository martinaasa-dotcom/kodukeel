import { prisma } from "@/lib/db";
import { adminEmails } from "@/lib/auth/admin";
import { canonicalOrigin } from "@/lib/auth/canonical";
import { mailerConfig, sendToOperator } from "@/lib/mailer/transport";
import { errorFingerprint } from "./fingerprint";
import type { ErrorRecord } from "./report";

/**
 * WHERE AN ERROR GOES WHEN NOBODY SET UP A WEBHOOK: THE APP'S OWN DATABASE.
 *
 * `reportError` writes every error to the server log and, where
 * `ERROR_WEBHOOK_URL` is set, posts it on. Neither reaches a person who did not
 * go and build something to receive it, and the operator asked for this to
 * need nothing extra. So every error is also kept here, read on
 * `/admin/errors`, and the first of each new kind in a day is emailed to the
 * addresses `ADMIN_EMAILS` names, through the same Resend key the course
 * reminders use.
 *
 * What is kept is what `reportError` already made safe to post to a webhook:
 * `redact` has stripped keys, tokens and connection strings, and the learner's
 * id is deliberately dropped here, so a row is about the app rather than about
 * anybody. Rows older than `KEEP_DAYS` are deleted on the next write.
 *
 * NEVER THROWS AND NEVER REPORTS. A failure here is written to the server log
 * and nothing else: calling `reportError` from inside the thing that stores
 * reports is a loop waiting for a bad minute at the database.
 */

/** How long an error is kept. docs/25-data-retention.md names the same figure. */
export const KEEP_DAYS = 30;
/** At most this many alert emails in any 24 hours, however much breaks. */
export const ALERTS_PER_DAY = 10;
/**
 * At most this many rows of one kind of error in any 24 hours. Past it the
 * error is still in the server log; the table stops growing, because one
 * fault firing on every request is one fault, and anybody who can make a
 * request fail could otherwise write the table full.
 */
export const ROWS_PER_KIND_PER_DAY = 200;

const DAY_MS = 24 * 60 * 60 * 1000;
const MESSAGE_MAX = 1_000;
const STACK_MAX = 4_000;
const EXTRA_MAX = 2_000;

export async function storeError(record: ErrorRecord, now: Date = new Date()): Promise<void> {
  try {
    const fingerprint = errorFingerprint(record.at, record.message);
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const [seenToday, alertsToday] = await Promise.all([
      prisma.errorEvent.count({ where: { fingerprint, createdAt: { gte: dayAgo } } }),
      prisma.errorEvent.count({ where: { alerted: true, createdAt: { gte: dayAgo } } }),
    ]);
    if (seenToday >= ROWS_PER_KIND_PER_DAY) return;
    const recipients = adminEmails();
    const mail = mailerConfig();
    const alert = seenToday === 0 && alertsToday < ALERTS_PER_DAY && recipients.length > 0 && mail !== null;

    await prisma.errorEvent.create({
      data: {
        at: record.at.slice(0, 200),
        message: record.message.slice(0, MESSAGE_MAX),
        stack: record.stack ? record.stack.slice(0, STACK_MAX) : null,
        extra: record.extra === undefined ? null : JSON.stringify(record.extra).slice(0, EXTRA_MAX),
        fingerprint,
        alerted: alert,
        createdAt: now,
      },
    });
    await prisma.errorEvent.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - KEEP_DAYS * DAY_MS) } } });

    if (alert && mail) {
      await sendToOperator({ to: recipients, ...alertNote(record, now) }, mail);
    }
  } catch (error) {
    console.error(`[observability/store] an error could not be kept: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** The email about a new kind of error. Plain text, with the way to the page. */
export function alertNote(record: ErrorRecord, now: Date): { subject: string; text: string } {
  const origin = canonicalOrigin();
  const page = origin ? new URL("/admin/errors", origin).toString() : "/admin/errors";
  const stack = record.stack ? record.stack.split("\n").slice(0, 10).join("\n") : null;
  return {
    subject: `Kodukeel: a new error in ${record.at}`,
    text: [
      `Something went wrong in ${record.at} at ${now.toISOString()}.`,
      "",
      record.message,
      ...(stack ? ["", stack] : []),
      "",
      `Every error of the last ${KEEP_DAYS} days is on ${page}.`,
      `You get one email per new kind of error a day, at most ${ALERTS_PER_DAY} a day.`,
    ].join("\n"),
  };
}
