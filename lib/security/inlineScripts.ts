/**
 * THE INLINE SCRIPTS THIS APP WRITES ITSELF, AND THE HASHES THAT LET THEM RUN.
 *
 * A page's scripts are allowed by a nonce minted per request (middleware.ts,
 * lib/security/headers.ts), and Next.js stamps that nonce on everything it
 * renders. The root layout's two blocking scripts are ours rather than Next's,
 * and reading the nonce there would mean calling `headers()` in the root
 * layout, which turns every page dynamic, the prerendered landing page and the
 * 404 included. So they are allowed by their SHA-256 instead: they are fixed
 * strings, the hash is a fact about the string, and a hash works on a page
 * rendered at build time as well as on one rendered per request.
 *
 * Every inline script app/layout.tsx draws is listed here, and an invariant
 * holds the two together (scripts/invariants/inline-scripts-are-hashed.ts): a
 * third script added to the layout and not here is a script the browser
 * refuses, silently, on every page.
 *
 * Relative imports, because lib/security/headers.ts is loaded by
 * next.config.ts before the `@/` alias means anything and this sits beside it.
 */
import { AWAKE_SCRIPT } from "../ux/awake";
import { THEME_SCRIPT } from "../ux/themeScript";

export const INLINE_SCRIPTS: readonly string[] = [THEME_SCRIPT, AWAKE_SCRIPT];

/** `'sha256-...'` for one script, in the form a `script-src` directive takes. */
export async function scriptHash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return `'sha256-${btoa(binary)}'`;
}

let hashes: Promise<readonly string[]> | null = null;

/** The hashes of every script in `INLINE_SCRIPTS`, worked out once per process. */
export function inlineScriptHashes(): Promise<readonly string[]> {
  hashes ??= Promise.all(INLINE_SCRIPTS.map(scriptHash)).catch((error: unknown) => {
    // Not remembered: the next request tries again rather than inheriting this one's failure.
    hashes = null;
    throw error;
  });
  return hashes;
}
