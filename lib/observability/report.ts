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

export interface ErrorContext {
  /** Where it happened, e.g. "api/tutor" or "action/gradeCard". */
  at: string;
  /** Opaque user id. Never an email — those are personal data, an id is not. */
  ownerId?: string | undefined;
  /** Anything else worth knowing. Values are redacted before they are written. */
  extra?: Record<string, unknown> | undefined;
}

/** Keys whose values never belong in a log, however they got into the context. */
const SENSITIVE = /(key|token|secret|password|authorization|cookie|email|dsn)/i;

/**
 * Something that looks like a credential regardless of the key it arrived under.
 *
 * These are the shapes `scripts/check-secrets.mjs` refuses to let reach a
 * browser, and `report.test.ts` holds the two lists together by name: it reads
 * that script's patterns and fails on one this has no sample for. Typed
 * separately, the two had drifted by eight: Groq and Gemini first, then a
 * Supabase secret key, a Supabase access token, a Resend key, an AWS key, a
 * GitHub token and a private key block, every one of them something the build
 * would not ship and the error log would have posted to a webhook whole.
 */
const SECRET_SHAPE = new RegExp(
  [
    String.raw`-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|$)`,
    String.raw`\bsk-[A-Za-z0-9_-]{16,}`,
    String.raw`\bgsk_[A-Za-z0-9]{20,}`,
    String.raw`\bAIza[0-9A-Za-z_-]{35}`,
    String.raw`\bAKIA[0-9A-Z]{16}\b`,
    String.raw`\bsb_secret_[A-Za-z0-9_-]{16,}`,
    String.raw`\bsbp_[A-Za-z0-9]{32,}`,
    String.raw`\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}`,
    String.raw`\bgithub_pat_[A-Za-z0-9_]{50,}`,
    String.raw`\bre_[A-Za-z0-9]{16,}\b`,
    String.raw`EKILEX_API_KEY["'\x60\s]*[:=]\s*["'\x60]?[^"'\x60\s]{8,}`,
    String.raw`\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}`,
    String.raw`postgres(?:ql)?:\/\/[^\s]+:[^\s@]+@`,
  ].join("|"),
  "g",
);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[deep]";
  if (typeof value === "string") {
    const scrubbed = value.replace(SECRET_SHAPE, "[redacted]");
    return scrubbed.length > 500 ? `${scrubbed.slice(0, 500)}…` : scrubbed;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * An error's message, fit to hand back to a browser.
 *
 * `restoreBackup` and `deleteMyAccount` both end in "and nothing was changed"
 * followed by whatever the database said, which is right: those are the two
 * operations where somebody is owed a reason. What the database says can carry
 * the deployment's own connection string, host and user — Prisma quotes the
 * datasource in an initialization failure, and a restore runs a two-minute
 * transaction, which is exactly the window a connection drops in.
 *
 * `redact` above already knows a DSN is a credential, because the log has to
 * be safe to send to an error webhook. A message going to a signed-in
 * learner's screen is at least as public as that. So it is the same function,
 * and the shape it scrubs is the shape CI greps the client bundle for.
 *
 * Shorter than the log's 500, because this is a sentence on a screen rather
 * than a field in a record.
 */
export function safeMessage(error: unknown, limit = 200): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const scrubbed = String(redact(raw));
  const oneLine = scrubbed.replace(/\s+/g, " ").trim();
  return oneLine.length > limit ? `${oneLine.slice(0, limit)}…` : oneLine;
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
