/**
 * Google Identity Services runs the Google button on this app's own domain
 * and hands back an ID token, which `signInWithIdToken` gives to Supabase
 * directly. Nothing here goes through `<project-ref>.supabase.co/auth/v1/`:
 * that is what put the raw Supabase domain on Google's sign-in screen, since
 * that address was the OAuth redirect URI Google was told about. This flow
 * has no redirect URI at all, only the page's own origin, so what Google
 * shows is this app's own domain.
 *
 * Pure, so the nonce is unit tested rather than driven through a browser.
 */

/**
 * The one script this flow needs, loaded once. `hl=en` pins the button's own
 * text to English rather than letting Google guess a locale off the
 * browser: left to itself it drew "Jätka Google'iga" on an Estonian browser,
 * on a page whose every other word is English.
 */
export const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client?hl=en";

/** A fresh nonce for one sign-in attempt. */
export function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The SHA-256 of a nonce, hex encoded. Google Identity Services is handed
 * this hash and puts it in the ID token; `signInWithIdToken` is handed the
 * raw nonce and checks the two agree, which is what stops a token minted for
 * somebody else's sign-in attempt being replayed into this one.
 */
export async function hashNonce(nonce: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
