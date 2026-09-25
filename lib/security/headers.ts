/**
 * Browser security headers.
 *
 * Static headers live in `next.config.ts` so they cover every response,
 * including the static files that never reach the middleware. The CSP is set
 * in the middleware instead: two CSP headers are intersected by the browser,
 * so a second copy would only ever make the policy stricter in ways nobody
 * asked for, and the policy needs to read the environment to know which
 * Supabase project to allow.
 */

export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  /*
    Sõnaveeb and Ekilex send `X-Frame-Options: DENY` at us, and this app sends
    it back out for the same reason. Nothing here is meant to be embedded in
    somebody else's page, and a flashcard app framed inside one is a
    clickjacking target with a Google session attached.
  */
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  /*
    Google's OAuth handshake opens in the same tab, but keeping popups usable
    costs nothing and breaks nothing.
  */
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  /*
    THE OTHER HALF OF THE FRAMING RULE, AND THE ONE THAT WAS MISSING.

    `X-Frame-Options` above stops a whole page being put in somebody's frame.
    It says nothing about a single response being pulled into another origin's
    document by an ordinary tag, and two responses here are worth the header:
    the share card, which is a picture of somebody's name and their streak, and
    the export, which is everything they have ever written.

    `same-origin` rather than `same-site`, because there is one origin: the
    canonical redirect in `lib/auth/canonical.ts` exists precisely to make sure
    of that, so there is no sibling subdomain that needs to be let in.

    Deliberately NOT `Cross-Origin-Embedder-Policy: require-corp`. That one is
    about what this page may pull in rather than who may pull this page in, and
    turning it on would refuse every response from Supabase, TartuNLP and the
    fonts unless each of them sent a CORP header back, which is not ours to
    set. It buys cross-origin isolation, which this app has no use for: nothing
    here touches SharedArrayBuffer or a high-resolution timer.
  */
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  /*
    The microphone is `self`, not `()`: speaking practice records the learner
    reading a word back (components/Recorder.tsx). Denying it here would
    switch that feature off with no error anybody could act on.

    THE CAMERA JOINED IT, and the failure it prevents is a silent one. Scanning
    a page is `<input type="file" capture="environment">`, and the capture
    attribute is governed by this very policy: with `camera=()` a phone quietly
    ignores it and opens the photo library instead. Nothing errors, nothing is
    logged, and the button simply does not do what it says. Location stays
    denied, because nothing here has ever wanted it.
  */
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/**
 * What a response built out of one learner's own rows says about itself.
 *
 * THE FRAMEWORK'S SILENCE IS NOT A CACHE POLICY. `ImageResponse` stamps
 * `public, immutable, max-age=31536000` on anything that does not say
 * otherwise, and a Route Handler that says nothing gets whatever the platform
 * and whatever is in front of it decide. Neither of those knows the body was
 * assembled for one account.
 *
 * Two shapes, because two things are being said. `NO_STORE` is "do not keep
 * this", which is all a JSON answer to a POST needs. `PRIVATE_NO_STORE` adds
 * "and this belongs to one reader": it is for a download or a picture, the two
 * shapes a shared cache in front of the app would otherwise be free to keep
 * and hand on, and it varies on the cookie that chose the body so a keyed
 * cache cannot serve one learner's copy to the next.
 *
 * Here rather than spelled out in each route, because four routes had written
 * the string for themselves and four more had written nothing at all, and the
 * check that was supposed to notice could only see the ones that happened to
 * build their response with `new Response(`.
 */
export const NO_STORE = { "cache-control": "no-store" } as const;

/** @see NO_STORE. For a download or a picture. */
export const PRIVATE_NO_STORE = {
  "cache-control": "private, no-store",
  vary: "Cookie",
} as const;

/** The Supabase project this deployment talks to, if it has one. */
function supabaseConnectSrc(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return [];
  try {
    const url = new URL(raw);
    return [url.origin, `wss://${url.host}`];
  } catch {
    return [];
  }
}

/**
 * Google's own sign-in script, only when a deployment has told it a client
 * ID to sign in with. It is the one third-party script this app loads in a
 * browser, because it is what lets Google's sign-in screen show this app's
 * own domain instead of Supabase's: `lib/auth/googleIdentity.ts` explains
 * why. Without the client ID nothing about this policy widens, which is the
 * same rule `supabaseConnectSrc` follows for the database.
 */
function googleIdentitySrc(): string[] {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ? ["https://accounts.google.com"] : [];
}

/**
 * The policy.
 *
 * `'unsafe-inline'` in `script-src` is required rather than chosen: the app
 * shell is prerendered and CDN-cached, and Next.js only stamps a nonce onto
 * markup it renders per request. A fresh nonce in the header against cached
 * inline Flight scripts that carry none means the browser refuses to hydrate
 * and the page never becomes interactive. A nonce would also silently disable
 * `'unsafe-inline'` for every other inline script, the theme script in
 * app/layout.tsx included.
 *
 * The rest is as tight as the app allows, and every entry has a reason:
 *
 * - `img-src` takes `https:` because a Google account's avatar is served from
 *   whichever googleusercontent host that account happens to be on.
 * - `media-src` takes `blob:` because a recording in speaking practice never
 *   leaves the device, and a blob URL is how it is played back.
 * - `connect-src` needs no third party at all: Ekilex, Wiktionary and the
 *   TartuNLP speech service are only ever reached from the server, which is
 *   the same rule that keeps their keys off the client.
 * - `frame-ancestors` is `'none'`. Nothing here is meant to be embedded
 *   anywhere (docs/00-audit-v4.md section A). `frame-src` is `'none'` for
 *   the same reason, except that Google Identity Services renders its own
 *   button inside an `accounts.google.com` iframe, so a deployment with a
 *   Google client ID configured allows that one origin and no other.
 */
export function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV !== "production";
  const google = googleIdentitySrc();

  const scriptSrc = ["'self'", "'unsafe-inline'", ...google, ...(isDev ? ["'unsafe-eval'"] : [])];
  const connectSrc = [
    "'self'",
    ...supabaseConnectSrc(),
    ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*", "http://localhost:*"] : []),
  ];
  const frameSrc = google.length > 0 ? google.join(" ") : "'none'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    // next/font self-hosts every face at build time, so no font CDN is needed.
    "font-src 'self'",
    "media-src 'self' blob: data:",
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src ${frameSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}
