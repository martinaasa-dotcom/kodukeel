/**
 * WHETHER THIS DEPLOYMENT OFFERS SIGN IN WITH GOOGLE, AND IN WHICH SHAPE,
 * READ IN ONE PLACE (docs/44-sixth-batch.md, N-3a).
 *
 * Google is two doors (the sign-in form's own header says why). The redirect
 * door through Supabase is drawn on every hosted sign-in page, so Google is
 * offered wherever Supabase is configured; whether the operator has switched
 * the provider on in Supabase's dashboard is not readable from here, and a
 * page naming who your data could reach errs toward naming Google.
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` adds the second door, Google Identity
 * Services, whose script the sign-in page loads from Google as it opens.
 *
 * The sign-in page, the content security policy, /privacy, /terms and the
 * recipients list read these, so the button, the policy that lets its script
 * load and the page naming Google as a recipient cannot disagree.
 */

/** The Client ID (never the secret), trimmed, or nothing where it is not set. */
export function googleClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || undefined;
}

/** True where the sign-in page loads Google's own script as it opens. */
export function googleScriptLoaded(): boolean {
  return googleClientId() !== undefined;
}

/** True where a sign-in page draws "Continue with Google" at all. */
export function googleSignInOffered(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) || googleScriptLoaded();
}
