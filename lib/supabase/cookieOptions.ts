/**
 * The flags every Supabase session cookie is written with, from all three
 * clients: the server one, the middleware's and the browser's.
 *
 * `@supabase/ssr` writes `SameSite=Lax`, a 400 day `Max-Age` and no `Secure`
 * unless told otherwise, so the session cookie, refresh token included, would
 * travel over plain HTTP to any address on this host that answered one. HSTS
 * preload covers the canonical domain in a browser that has the list; it does
 * not cover a self-hosted install, a host not yet on the list, or a first
 * visit. So the cookie says `Secure` itself wherever the request arrived over
 * HTTPS, which is every hosted deployment.
 *
 * A loopback address over plain HTTP is the one place it is left off: the
 * browser suites and a contributor's `npm run dev` run there, and a `Secure`
 * cookie on `http://localhost` is refused by some engines, which would read
 * as sign-in being broken rather than as this.
 *
 * `HttpOnly` is deliberately not set. The browser client reads the session to
 * start and end a sign-in (Google's button, the mailed link, Apple), so a
 * script-hidden cookie would end those, and the CSP is what stands between an
 * injected script and the cookie. docs/27-security.md says so.
 */
export function sessionCookieOptions(secure: boolean): { secure: boolean } {
  return { secure };
}

/** Whether a request arrived over HTTPS, read the way the middleware reads it for HSTS. */
export function arrivedSecure(protocol: string | null | undefined, forwardedProto: string | null | undefined): boolean {
  if (protocol === "https:" || protocol === "https") return true;
  return (forwardedProto ?? "").split(",").some((hop) => hop.trim() === "https");
}
