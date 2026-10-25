import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { arrivedSecure, sessionCookieOptions } from "@/lib/supabase/cookieOptions";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads the session from cookies; only used for auth (who is signed in), never
 * for data. Prisma talks to Postgres directly for everything else.
 *
 * `fetchImpl` is how a caller puts a deadline on the auth service without
 * every call site having to remember to. `lib/auth/identity.ts` passes a
 * bounded one, so a slow minute at Supabase costs a page a couple of seconds
 * rather than the whole function budget. The OAuth callback deliberately does
 * not: exchanging the code for a session is the one call with nothing to fall
 * back on, and cutting it short would fail a sign-in that was about to work.
 */
export async function createClient(fetchImpl?: typeof globalThis.fetch) {
  const [cookieStore, head] = await Promise.all([cookies(), headers()]);
  const secure = arrivedSecure(null, head.get("x-forwarded-proto"))
    || (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(fetchImpl ? { global: { fetch: fetchImpl } } : null),
      cookieOptions: sessionCookieOptions(secure),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // A Server Component cannot set cookies. The middleware refreshes
            // the session on every request instead, so this is safe to ignore.
          }
        },
      },
    },
  );
}
