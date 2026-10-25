/**
 * Error reporting, without a vendor.
 *
 * The requirement is modest and specific: when something breaks for someone who
 * is not the author, that fact should reach a log with enough context to act on,
 * and it should never itself leak a learner's data or a key. Structured JSON on
 * stderr satisfies that on every host worth deploying to (Vercel, Fly, a plain
 * container), and an optional webhook forwards it somewhere with alerting if a
 * deployment wants that.
 *
 * Deliberately not a Sentry dependency: adding one would put a third-party
 * script in front of a tool whose privacy page promises no third-party
 * trackers.
 */

import { redact, safeMessage } from "@/lib/security/redact";

export { redact, safeMessage };

export interface ErrorContext {
  /** Where it happened, e.g. "api/tutor" or "action/gradeCard". */
  at: string;
  /** Opaque user id. Never an email — those are personal data, an id is not. */
  ownerId?: string | undefined;
  /** Anything else worth knowing. Values are redacted before they are written. */
  extra?: Record<string, unknown> | undefined;
}


export interface ErrorRecord {
  level: "error";
  at: string;
  message: string;
  stack?: string | undefined;
  ownerId?: string | undefined;
  extra?: unknown;
  ts: string;
}

/** Builds the record. Separated from the writing so it can be tested. */
export function buildRecord(error: unknown, context: ErrorContext): ErrorRecord {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    level: "error",
    at: context.at,
    message: String(redact(err.message)),
    stack: err.stack ? String(redact(err.stack)) : undefined,
    ownerId: context.ownerId,
    extra: context.extra ? redact(context.extra) : undefined,
    ts: new Date().toISOString(),
  };
}

/**
 * Reports an error. Never throws and never rejects — a reporter that can break
 * the request it is reporting on is worse than no reporter.
 */
export function reportError(error: unknown, context: ErrorContext): void {
  let record: ErrorRecord;
  try {
    record = buildRecord(error, context);
  } catch {
    return;
  }

  try {
    console.error(JSON.stringify(record));
  } catch {
    console.error(`[${context.at}] error could not be serialized`);
  }

  /*
    Kept in the app's own database too (`./store`), for a deployment that runs
    in Next's Node server. `NEXT_RUNTIME` is set by Next and by nothing else,
    so a unit test, a script and the Edge middleware never open a database
    from here, and the import is dynamic so this module stays free of Prisma
    for everything that imports it. The write is handed to `after()` where
    there is a request to hold it open, because the platform suspends a
    function once its response is sent and a promise nobody is holding may
    never finish; outside a request, `after` throws and the write simply runs.
  */
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const keep = import("./store")
      .then(({ storeError }) => storeError(record))
      .catch(() => {
        // The store logs its own failures; a module that will not load is one more.
      });
    void import("next/server")
      .then(({ after }) => {
        try {
          after(keep);
        } catch {
          // Not inside a request: nothing to hold open, and `keep` runs anyway.
        }
      })
      .catch(() => {});
  }

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;
  void fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(record),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    // A reporting channel that is down must not become a second incident.
  });
}
