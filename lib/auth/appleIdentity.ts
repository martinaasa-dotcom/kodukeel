/**
 * SIGN IN WITH APPLE ON THE WEB, THE WAY THE GOOGLE BUTTON IS WIRED
 * (docs/44-sixth-batch.md, N-3 and D7).
 *
 * Apple's own script opens Apple's sign-in in a popup and hands this page an
 * ID token, which `signInWithIdToken` gives to Supabase with the `apple`
 * provider. Nothing goes through Supabase's own redirect, so nothing about
 * the flow names the Supabase project to the person signing in, and the same
 * token shape is what a native app gets from the platform's own sign-in.
 *
 * Apple sends the person's name once, on the very first sign-in, and never
 * again: it is not in the ID token, only beside it. So `readAppleResponse`
 * keeps it when it is there, and the form stores it as the account's display
 * name in the same metadata field Google's token fills on its own.
 *
 * Pure, so the reading is unit tested rather than driven through a popup.
 * The nonce and its hash are the Google module's: one way of making a nonce
 * for both doors, since two would be two answers to one question.
 */
import { visibleLine } from "../security/visibleText";

export { hashNonce, randomNonce } from "./googleIdentity";

/**
 * Apple's script, in English for the reason `GSI_LOCALE` gives: the rest of
 * the sign-in screen is in the reader's language through the tables, and a
 * popup Apple draws in a guessed language reads as a rendering fault.
 */
export const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

/** The one host that script is served from, which is all the CSP has to name. */
export const APPLE_SCRIPT_ORIGIN = "https://appleid.cdn-apple.com";

/** A display name is a line, never a paragraph: this is what the roster allows. */
const NAME_MAX = 80;

/** What `AppleID.auth.init` is handed, built in one place so a test can read it. */
export interface AppleInit {
  clientId: string;
  scope: string;
  redirectURI: string;
  state: string;
  nonce: string;
  usePopup: true;
}

/**
 * The configuration for one attempt.
 *
 * `redirectURI` is never navigated to in popup mode, and Apple still checks it
 * against the Services ID's registered return URLs, so it is this page's own
 * address on this origin, which is the one the operator registers. `nonce` is
 * the hash; the raw value goes to Supabase, which hashes it and compares.
 */
export function appleInit(input: {
  servicesId: string;
  origin: string;
  hashedNonce: string;
  state: string;
}): AppleInit {
  return {
    clientId: input.servicesId,
    scope: "name email",
    redirectURI: `${input.origin}/sign-in`,
    state: input.state,
    nonce: input.hashedNonce,
    usePopup: true,
  };
}

/** What a successful sign-in hands back, reduced to what this app keeps. */
export interface AppleSignIn {
  idToken: string;
  /** The name Apple sent, on the first sign-in only. Null every other time. */
  name: string | null;
  /** The given name alone, for the box that asks what to call somebody. */
  givenName: string | null;
}

/** What the popup's promise can reject with, read into what the screen does. */
export type AppleFailure = "cancelled" | "failed";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function part(value: unknown): string {
  return typeof value === "string" ? visibleLine(value, NAME_MAX) : "";
}

/**
 * Read `AppleID.auth.signIn()`'s answer.
 *
 * The shape is `{ authorization: { id_token, code, state }, user?: { email,
 * name: { firstName, lastName } } }`. The state has to be the one this attempt
 * sent, or the answer is somebody else's and is refused. Anything else
 * malformed is refused too: a token this cannot find is a sign-in that did
 * not happen, never one to guess at.
 */
export function readAppleResponse(raw: unknown, expectedState: string): AppleSignIn | null {
  const top = record(raw);
  const authorization = record(top?.authorization);
  const idToken = authorization?.id_token;
  if (typeof idToken !== "string" || idToken.split(".").length !== 3) return null;
  if (authorization?.state !== expectedState) return null;

  const name = record(record(top?.user)?.name);
  const first = part(name?.firstName);
  const last = part(name?.lastName);
  const full = visibleLine([first, last].filter(Boolean).join(" "), NAME_MAX);
  return { idToken, name: full || null, givenName: first || null };
}

/**
 * Whether a rejection was the person closing the popup, which is not an
 * error to show anybody, or something that went wrong.
 */
export function readAppleFailure(raw: unknown): AppleFailure {
  const code = record(raw)?.error;
  return code === "popup_closed_by_user" || code === "user_cancelled_authorize" ? "cancelled" : "failed";
}

/**
 * The metadata Supabase keeps for the account, in the fields the Google token
 * fills: `full_name` is what `learnerFromClaims` reads first, `given_name` is
 * what the name box offers. Null where Apple sent no name, so a second sign-in
 * never writes over a name somebody has since changed.
 */
export function appleNameMetadata(signIn: AppleSignIn): { full_name: string; given_name?: string } | null {
  if (!signIn.name) return null;
  return signIn.givenName ? { full_name: signIn.name, given_name: signIn.givenName } : { full_name: signIn.name };
}
