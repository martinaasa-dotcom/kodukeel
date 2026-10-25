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
/*
  Relative rather than through the `@/` alias, because `next.config.ts`
  imports this file and is loaded before the alias means anything.
*/
import { appleSignInConfigured } from "../auth/appleConfig";
import { googleScriptLoaded } from "../auth/googleConfig";
import { APPLE_SCRIPT_ORIGIN } from "../auth/appleIdentity";

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
    The microphone is `self`, not `()`: speaking is heard on the device
    through the one engine every screen listens with (components/speech/,
    docs/41-fifth-batch.md D5). Denying it here would switch speaking off
    with no error anybody could act on.

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
/**
 * Where the speech model is downloaded from, when it is not this origin
 * (docs/41-fifth-batch.md, VB-1). The deployment's own storage and nothing
 * else: a learner's address never reaches the model's original host.
 */
function speechModelSrc(): string[] {
  const raw = process.env.NEXT_PUBLIC_ASR_MODEL_BASE?.trim();
  if (!raw || raw.startsWith("/")) return [];
  try {
    return [new URL(raw).origin];
  } catch {
    return [];
  }
}

function googleIdentitySrc(): string[] {
  return googleScriptLoaded() ? ["https://accounts.google.com"] : [];
}

/**
 * Apple's sign-in script, only where the deployment has a Services ID
 * (docs/44-sixth-batch.md, N-3). The script host alone, and that is all it
 * needs, read off the script itself on 2026-10-24: in popup mode it opens
 * Apple's sign-in at `appleid.apple.com` in a window of its own and listens
 * for that window's message, which no directive here governs. It draws no
 * iframe, fetches nothing and posts no form from this page, so `frame-src`,
 * `connect-src` and `form-action` stay exactly as they were.
 */
function appleIdentitySrc(): string[] {
  return appleSignInConfigured() ? [APPLE_SCRIPT_ORIGIN] : [];
}

/**
 * A fresh nonce for one response: sixteen random bytes, base64.
 *
 * `crypto.getRandomValues` rather than `Math.random`, because the whole worth
 * of a nonce is that an injected script cannot guess it.
 */
export function mintNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Which policy a path is answered under.
 *
 * NONCE FOR EVERYTHING RENDERED PER REQUEST, which is every page but four.
 * Next.js reads the nonce off the request's own policy header and stamps it on
 * every script it renders, the inline Flight payload included, so a nonce and
 * `'strict-dynamic'` let the app run and refuse a script somebody managed to
 * inject: that matters here because the Supabase session cookie is readable by
 * script, which `'unsafe-inline'` left within reach of any injected `<script>`.
 *
 * The four that are not are the landing page and its three translations,
 * which are prerendered and served from the cache (`revalidate = 3600`). A
 * cached page carries the inline scripts it was built with and no nonce, so a
 * fresh nonce in the header would refuse every one of them and the page would
 * never hydrate. They keep the inline allowance, which is the residual
 * docs/27-security.md names: those pages are the same for every reader, render
 * nothing from the request, and carry no learner data. Making them dynamic
 * would close it and is one line in each page, paid for in a stranger's first
 * visit.
 *
 * The other prerendered page is the root 404, served for an address no route
 * matches, and it cannot be told apart here. It is answered under the nonce
 * policy and so draws without hydrating: its text and its links work, which is
 * all it has. Making it dynamic (`connection()` in app/not-found.tsx) was
 * tried and turned every page dynamic, the landing page included, because the
 * root boundary is rendered as part of every route.
 *
 * `worker` is the speech worker's own script (`/asr/runtime/`). A dedicated
 * worker takes its policy from its own response, and under `'strict-dynamic'`
 * the `importScripts` it loads its runtime with would be refused, since that
 * call carries no nonce and the policy no longer trusts `'self'`.
 */
export type PolicyKind = "nonce" | "static" | "worker";

/** The prerendered pages, exactly: a prefix would hand the inline allowance to anything beneath them. */
const PRERENDERED = new Set(["/welcome", "/welcome/et", "/welcome/ru", "/welcome/uk"]);

export function policyKindFor(path: string): PolicyKind {
  const bare = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (PRERENDERED.has(bare)) return "static";
  if (bare.startsWith("/asr/")) return "worker";
  return "nonce";
}

export interface PolicyOptions {
  readonly secure?: boolean;
  /** The request's nonce. Absent, the policy is the inline one a prerendered page needs. */
  readonly nonce?: string;
  /** `'sha256-...'` sources for the layout's own inline scripts (lib/security/inlineScripts.ts). */
  readonly scriptHashes?: readonly string[];
  /** For the speech worker's script: `'self'` and WebAssembly, and nothing inline. */
  readonly worker?: boolean;
}

/**
 * The policy.
 *
 * `script-src`, per request: `'nonce-...'` and `'strict-dynamic'` are what a
 * current browser obeys. A script runs if it carries the nonce, matches one of
 * the layout's hashes, or was added by a script that did, which is how Next's
 * own chunks and Google's and Apple's sign-in scripts (loaded through
 * `next/script`) get in. `'strict-dynamic'` makes that browser ignore `'self'`,
 * the named hosts and `'unsafe-inline'`, and a nonce or a hash makes a CSP2
 * browser ignore `'unsafe-inline'` too; those are there for a browser too old
 * to know either keyword, which then falls back to this origin and the two
 * named sign-in hosts rather than to anything.
 *
 * The rest is as tight as the app allows, and every entry has a reason:
 *
 * - `img-src` is this origin, `data:` and `blob:`. Nothing here draws a picture
 *   from anywhere else: the avatar a Google account carries is read into the
 *   session and drawn as an initial, never as an image, and the scanner's
 *   preview is a blob. Google's button draws inside its own frame.
 * - `media-src` takes `blob:` because a recording in speaking practice never
 *   leaves the device, and a blob URL is how it is played back.
 * - `connect-src` is this origin and, where Supabase is configured, that one
 *   project's origin and websocket, which the browser's sign-in client needs.
 *   Ekilex, Wiktionary and the TartuNLP speech service are only ever reached
 *   from the server, which is the same rule that keeps their keys off the
 *   client, and the test pins the whole directive.
 * - `frame-ancestors` is `'none'`. Nothing here is meant to be embedded
 *   anywhere (docs/00-audit-v4.md section A). `frame-src` is `'none'` for
 *   the same reason, except that Google Identity Services renders its own
 *   button inside an `accounts.google.com` iframe, so a deployment with a
 *   Google client ID configured allows that one origin and no other.
 */
export function buildContentSecurityPolicy({
  secure = true,
  nonce,
  scriptHashes = [],
  worker = false,
}: PolicyOptions = {}): string {
  const isDev = process.env.NODE_ENV !== "production";
  const google = googleIdentitySrc();

  /*
    `'wasm-unsafe-eval'` compiles WebAssembly and nothing else: the speech
    worker runs the model in it (ADR-028). It is not `'unsafe-eval'`, which
    stays a development-only allowance, and the test reads the two as tokens.
  */
  const hosts = [...google, ...appleIdentitySrc()];
  const devEval = isDev ? ["'unsafe-eval'"] : [];
  const scriptSrc = worker
    ? ["'self'", "'wasm-unsafe-eval'", ...devEval]
    : nonce
      ? [`'nonce-${nonce}'`, "'strict-dynamic'", ...scriptHashes, "'self'", ...hosts, "'unsafe-inline'", "'wasm-unsafe-eval'", ...devEval]
      : ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", ...hosts, ...devEval];
  const connectSrc = [
    "'self'",
    ...supabaseConnectSrc(),
    ...speechModelSrc(),
    ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*", "http://localhost:*"] : []),
  ];
  const frameSrc = google.length > 0 ? google.join(" ") : "'none'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Google's button fetches a stylesheet of its own; refused, it logged a
    // CSP violation on every sign-in screen (PageSpeed, 14 October 2026).
    `style-src 'self' 'unsafe-inline'${google.length > 0 ? " https://accounts.google.com/gsi/style" : ""}`,
    "img-src 'self' data: blob:",
    // The faces are committed files in app/fonts/, served from this origin, so no font CDN is needed.
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
    /*
      ONLY ON A PAGE SERVED OVER HTTPS. Chromium and Firefox leave a request to
      `localhost` alone under `upgrade-insecure-requests`, and WebKit does not:
      it rewrote every script on a page served over plain HTTP to `https://`,
      none of them loaded, and the page never hydrated. Found by
      `test-browsers.mjs`, where WebKit drew the server's skeleton and no
      heading on every route that streams in. On a page served over HTTPS the
      directive is what it always was; on one served over HTTP it has nothing
      to upgrade to, so leaving it off loses nothing.
    */
    ...(secure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
