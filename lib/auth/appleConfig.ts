/**
 * WHETHER THIS DEPLOYMENT OFFERS SIGN IN WITH APPLE, READ IN ONE PLACE
 * (docs/44-sixth-batch.md, N-3 and D7).
 *
 * `NEXT_PUBLIC_APPLE_SERVICES_ID` is the Services ID the operator creates in
 * Apple's developer account and names in Supabase's Apple provider. It is
 * public, like Google's client ID, and it is still read on the server and
 * handed down, for the reason the sign-in page gives about Google's: read in
 * a client component it would be inlined at build time, and one build could
 * only ever serve one of the two states.
 *
 * Four readers ask it: the sign-in page, the content security policy, the
 * recipients list on /privacy, and the native contract's meta route. One
 * function, so the button, the policy that lets its script load, and the page
 * that discloses Apple as a recipient cannot disagree about whether Apple is
 * here at all.
 */

/** The Services ID, trimmed, or nothing where Apple sign-in is not configured. */
export function appleServicesId(): string | undefined {
  return process.env.NEXT_PUBLIC_APPLE_SERVICES_ID?.trim() || undefined;
}

/** True where this deployment draws "Continue with Apple". */
export function appleSignInConfigured(): boolean {
  return appleServicesId() !== undefined;
}
