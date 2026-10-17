/*
  WHETHER THIS DEPLOYMENT CAN REMIND ANYBODY ON A COMPUTER, AND WITH WHAT.

  Web Push signs every request with a key pair the deployment owns (VAPID,
  RFC 8292), so the push service can tell this app's messages from anybody
  else's and a browser that subscribed to this app accepts only them. The
  private half signs, and it is a credential: `VAPID_PRIVATE_KEY` is read on
  the server and nowhere else, never carries `NEXT_PUBLIC_`, and the CI job
  that builds with marked secrets greps the bundle for it. The public half is
  what the browser is handed when it subscribes, which is what it is for, so
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is public by design. It is still read here on
  the server and handed to the one screen that needs it as a prop, so turning
  the feature on or off is a deployment's environment rather than a rebuild.

  ABSENT IS THE DEFAULT AND IT IS COMPLETE. With either key missing, or either
  one the wrong shape, this returns null and the feature is not there at all:
  no control in Settings, no recipient on /privacy, nothing in the scheduled
  run. A half-configured push channel is not offered, because a switch that
  turns on reminders which then never arrive is worse than no switch.

  Pure apart from reading the environment, which is the shape `mailerConfig`
  takes: one answer to "can this deployment push", with one thing for the
  checks to point at.
*/

export interface PushConfig {
  /** Base64url, an uncompressed P-256 point. Handed to the browser. */
  readonly publicKey: string;
  /** Base64url, the 32-byte private scalar. Server only. */
  readonly privateKey: string;
  /** A `mailto:` or `https:` address the push services can reach the operator at. */
  readonly subject: string;
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function decodedLength(value: string): number {
  return BASE64URL.test(value) ? Buffer.from(value, "base64url").length : -1;
}

/**
 * Who the push services should write to about this deployment's messages.
 *
 * RFC 8292 asks for a contact, a `mailto:` or an `https:` URL, so a service
 * seeing something wrong has somebody to tell. `VAPID_SUBJECT` where the
 * operator set one; otherwise the deployment's own address, which is a
 * contact page anybody can open; otherwise the operator's address. With none
 * of the three there is nobody to name, and the channel stays off.
 */
function subjectFrom(values: PushEnv): string | null {
  const explicit = values.subject?.trim();
  if (explicit && /^(mailto:\S+@\S+|https:\/\/\S+)$/.test(explicit)) return explicit;
  const site = values.site?.trim();
  if (site && /^https:\/\/\S+$/.test(site)) return site;
  const operator = values.operator?.trim();
  if (operator && /^\S+@\S+$/.test(operator)) return `mailto:${operator}`;
  return null;
}

/** The variables this reads, named so the pure half can be driven without an environment. */
export interface PushEnv {
  readonly publicKey?: string;
  readonly privateKey?: string;
  readonly subject?: string;
  readonly site?: string;
  readonly operator?: string;
}

/** The configuration a set of values makes, or null. */
export function pushConfigFrom(values: PushEnv): PushConfig | null {
  const publicKey = values.publicKey?.trim().replace(/=+$/, "") ?? "";
  const privateKey = values.privateKey?.trim().replace(/=+$/, "") ?? "";
  if (decodedLength(publicKey) !== 65 || decodedLength(privateKey) !== 32) return null;
  const subject = subjectFrom(values);
  if (!subject) return null;
  return { publicKey, privateKey, subject };
}

/** The configuration, or null where this deployment cannot push. */
export function pushConfig(): PushConfig | null {
  return pushConfigFrom({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
    site: process.env.NEXT_PUBLIC_SITE_URL,
    operator: process.env.OPERATOR_EMAIL,
  });
}

/** Whether reminders on a computer can be offered at all. */
export function pushConfigured(): boolean {
  return pushConfig() !== null;
}
