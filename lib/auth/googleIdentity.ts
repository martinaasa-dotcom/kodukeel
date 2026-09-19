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
 * THE LANGUAGE OF GOOGLE'S OWN BUTTON, PINNED IN BOTH THE PLACES GOOGLE
 * READS IT.
 *
 * Left to itself Google guesses off the browser, and on an Estonian browser
 * it drew "Jätka Google'iga" on a page whose every other word is English.
 * That is not a translation this app has: the rest of the screen, the mailed
 * link beside it and the fallback button underneath all say it in English,
 * so one button in Estonian reads as a rendering fault rather than as a
 * courtesy.
 *
 * It was pinned once, on the script's own query string, and was still drawn
 * in Estonian on the deployment. `hl` there is the library's hint and the
 * button's own `locale` is the per-button setting, which Google documents as
 * what decides that button's text; a script already loaded by something else
 * on the page, or cached under a different query, leaves the query saying
 * nothing at all. So both carry it and both read this constant, because two
 * spellings of one language is where the two stop agreeing.
 *
 * Not the learner's own gloss language either. This is the door, before
 * anybody has an account for a preference to live on.
 */
export const GSI_LOCALE = "en";

/** The one script this flow needs, loaded once, in the language above. */
export const GSI_SCRIPT_SRC = `https://accounts.google.com/gsi/client?hl=${GSI_LOCALE}`;

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
