/*
  POSTING A LETTER, AND THE HEADERS THAT DECIDE WHETHER IT ARRIVES.

  One function, one provider, and the provider is the one the README already
  names: this deployment sends its sign-in links through Resend, so the address
  is already verified, the domain is already signed, and adding a second sender
  would mean a second domain reputation to keep clean for no gain.

  IT FAILS CLOSED, IN THREE PLACES AND ON PURPOSE. No API key, no send. No
  signing secret, no send, because a letter whose unsubscribe link cannot be
  verified is a letter with no way out of it. No configured sending address, no
  send, because the fallback for that is guessing at a domain and having every
  message rejected for failing its own SPF. A deployment missing any of the
  three is not broken and is not warned about on a learner's screen: it simply
  sends nothing, which is exactly what this repository ships as.

  THE HEADERS ARE NOT DECORATION. `List-Unsubscribe` with an https URL and
  `List-Unsubscribe-Post` are what let a mail client draw its own unsubscribe
  button next to the sender's name, and the large mailbox providers require
  both of anybody sending at volume. A reader who can press that button will
  press it instead of the spam button, and that difference is the whole of a
  sender's reputation. `List-Id` is what lets somebody filter these into a
  folder without filtering the sign-in links with them.

  AND IT NEVER THROWS AT THE RUN. A send that fails comes back as a failure
  with a reason, because the caller is a loop over every learner and one bad
  address must cost one letter rather than everybody's. The run logs it and
  carries on, which is the same shape `openWithFallback` takes about a model
  that will not answer.
*/

/** How long a single send may take before it is somebody else's problem. */
const SEND_TIMEOUT_MS = 10_000;

export interface Envelope {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  /** The https URL a mail client's own unsubscribe button posts to. */
  readonly oneClickUrl: string;
}

export type SendResult =
  | { readonly ok: true; readonly messageId: string | null }
  /**
   * Whether the address itself is the problem, which is the one thing the run
   * needs to act on rather than merely record: a rejected address must stop
   * being mailed, and a provider having a bad minute must not.
   */
  | { readonly ok: false; readonly reason: string; readonly badAddress: boolean };

export interface MailerConfig {
  readonly apiKey: string;
  /** `Kodukeel <hei@kodukeel.ee>`, whatever the operator verified. */
  readonly from: string;
  /** Where a reply goes. A letter nobody can answer is a letter from a machine. */
  readonly replyTo: string | null;
  /** The host, for `List-Id`. */
  readonly host: string;
}

/**
 * The configuration, or null where this deployment cannot send.
 *
 * Read here rather than at each call site, so there is one answer to "can this
 * deployment send mail" and the invariant suite has one thing to point at.
 */
export function mailerConfig(): MailerConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return null;

  let host = "kodukeel";
  try {
    host = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://kodukeel.ee").host;
  } catch {
    /* A malformed site URL costs the List-Id a nice name and nothing else. */
  }

  return {
    apiKey,
    from,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || null,
    host,
  };
}

/**
 * Whether a provider's refusal is about the address.
 *
 * Drawn narrowly and erring toward "not the address", because the cost is
 * asymmetric and far worse than it looks: a refusal read as a dead address
 * writes `emailUndeliverable` and that learner is never mailed again, so a
 * refusal that is really about *this deployment* is read once per learner the
 * run reaches and blocks every one of them, permanently, over one setting.
 *
 * The status alone cannot tell the two apart. Resend answers 400 and 422 with
 * `validation_error` for a sender it will not send from (an unverified `from`
 * domain, a malformed `from`), for a missing field, and for a malformed
 * recipient alike, and its published error table (resend.com/docs/api-reference/
 * errors, read 2026-09-25) names no error specific to the recipient. What does
 * tell them apart is the message, which names the field it refused: a bad
 * recipient reads "Invalid `to` field. ...". So an address is the problem only
 * where the status is a refusal of the request and the message names the `to`
 * field and nothing about the sender. A 403 never is: it is the key, the plan
 * or the sandbox ("You can only send testing emails to your own email
 * address"), all of them the operator's. A 5xx is theirs and a 429 is a rate
 * limit. A body that is not the shape Resend documents is not evidence.
 */
function addressIsTheProblem(status: number, detail: string): boolean {
  if (status !== 400 && status !== 422) return false;
  let message = "";
  try {
    const body = JSON.parse(detail) as { message?: unknown } | null;
    if (typeof body?.message === "string") message = body.message;
  } catch {
    return false;
  }
  if (/`?from`?\s+field|domain|sender/i.test(message)) return false;
  return /`to`|\bto\s+field\b|recipient/i.test(message);
}

export async function send(
  envelope: Envelope,
  config: MailerConfig,
  transport: typeof fetch = fetch,
): Promise<SendResult> {
  const headers: Record<string, string> = {
    /*
      Both forms, and the order matters to some clients: an https endpoint the
      client can post to, and a mailto as the fallback for the ones that only
      understand that. The angle brackets are required by RFC 2369.
    */
    "List-Unsubscribe": `<${envelope.oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "List-Id": `Kodukeel <course.${config.host}>`,
    /*
      Says this was sent by a machine on a schedule, which is what stops an
      out-of-office auto-reply bouncing back and, at some providers, what
      keeps a reply loop from forming.
    */
    "Auto-Submitted": "auto-generated",
  };

  let response: Response;
  try {
    response = await transport("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [envelope.to],
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
        subject: envelope.subject,
        html: envelope.html,
        text: envelope.text,
        headers,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    /*
      A timeout or a socket that never opened. Never an address fault: the
      provider did not get far enough to have an opinion about the recipient.
    */
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "the request did not complete",
      badAddress: false,
    };
  }

  if (!response.ok) {
    /*
      The body is read for the reason and deliberately not for anything else.
      It is quoted into a server log, never into a learner's screen, and it is
      the sort of message that carries a request id and an account name.
    */
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      reason: `${response.status} ${detail.slice(0, 200)}`.trim(),
      badAddress: addressIsTheProblem(response.status, detail),
    };
  }

  const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
  return { ok: true, messageId: typeof body?.id === "string" ? body.id : null };
}
