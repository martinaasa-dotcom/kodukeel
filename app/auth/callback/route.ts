import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, safeNext } from "@/lib/auth/access";
import { hasSessionCookie } from "@/lib/auth/identity";

/**
 * Where every way in lands: Google's OAuth code, and a mailed sign-in link.
 *
 * `next` is attacker-controllable, anyone can hand out a link to
 * `/sign-in?next=…`, and it is consumed at the exact moment a fresh session
 * cookie exists, so it is narrowed to a same-origin path before use. See
 * `safeNext`.
 *
 * TWO SHAPES ARRIVE HERE AND BOTH ARE HANDLED, which is one route rather than
 * two because everything after the exchange is identical: the same allowlist
 * check, the same narrowed redirect, the same refusals. Splitting them would
 * be two places to remember the allowlist, and the allowlist is the one thing
 * on this path that must never be forgotten.
 *
 *   A `code`, from Google and from a mailed link on a Supabase project using
 *   the default email template. PKCE, so the verifier is a cookie in the
 *   browser that asked, which is why the sign-in screen says to open the link
 *   there.
 *
 *   A `token_hash` and a `type`, which is what the email template shape
 *   Supabase documents for server-rendered apps sends instead. It carries its
 *   own proof, so it survives being opened in another browser. Nothing has to
 *   change here to adopt it: an operator edits the template and this route
 *   already answers.
 */

/** The `type` values a mailed link may legitimately carry. */
const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
  "email",
];

function emailOtpType(raw: string | null): EmailOtpType | null {
  return EMAIL_OTP_TYPES.find((t) => t === raw) ?? null;
}

/** Every cookie name a request carries, which both doors below read. */
function cookieNames(request: Request): string[] {
  return [...request.headers.get("cookie")?.matchAll(/(?:^|;\s*)([^=;]+)=/g) ?? []].map((m) => m[1]!.trim());
}

/*
  303 rather than the default 307 on every redirect out of here: the POST door
  below would otherwise be followed with its method and its body, which would
  replay the form to whatever page it lands on.
*/
function go(path: string, origin: string): NextResponse {
  return NextResponse.redirect(new URL(path, origin), 303);
}

async function settle(email: string | null | undefined, next: string, origin: string): Promise<NextResponse> {
  // The allowlist is checked here as well as in the middleware so a rejected
  // address never holds a valid session even briefly.
  if (!isAllowedEmail(email)) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
    return go("/sign-in?denied=1", origin);
  }
  return go(next, origin);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = emailOtpType(url.searchParams.get("type"));
  const next = safeNext(url.searchParams.get("next"));
  const names = cookieNames(request);

  if (code) {
    /*
      A CODE THAT ARRIVED IN A BROWSER THAT NEVER ASKED FOR ONE IS NOT A
      FAILED EXCHANGE, AND IT WAS BEING REPORTED AS ONE.

      PKCE ties the code to a verifier `signInWithOAuth` left in a cookie on
      the origin the learner pressed the button on. Supabase sends the code
      back to the address it was asked for only where that address is on the
      project's Redirect URLs, and to its Site URL otherwise, so a sign-in
      begun on the domain used to come back on `kodukeel.vercel.app`, where
      no verifier had ever been written. The exchange failed, the learner
      read "that sign-in did not go through", on a host they had not typed,
      and the button worked on the second press from there. That is a
      configuration fault wearing a spent link's clothes, and the two need
      different sentences: one says ask for a new link, the other says which
      address to add to a dashboard.

      The verifier cookie is what tells them apart. Its name is the storage
      key plus `-code-verifier`, in every shape `@supabase/ssr` writes it,
      and it is absent exactly when this browser, on this origin, did not
      start the sign-in. A mailed link opened on another device is the same
      state for the same reason, so the sentence covers both. The
      middleware's canonical redirect stops the host half of this from
      happening at all; this is what a deployment that has not set it reads.

      PKCE is also what makes a GET safe here: a code is worthless in any
      browser but the one holding its verifier, so a page on another site
      that points somebody at this address can neither sign them in nor out.
    */
    if (!names.some((name) => name.endsWith("-code-verifier"))) {
      return go("/sign-in?bounced=1", url.origin);
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return settle(data.user?.email, next, url.origin);
  } else if (tokenHash && type) {
    /*
      A MAILED LINK IS NEVER ACTED ON BY A GET, BECAUSE ANY PAGE CAN SEND ONE.

      A `token_hash` carries its own proof and is deliberately not tied to the
      browser that asked, which is the whole reason that template shape exists.
      Acting on it here meant three faults, all from a plain navigation that
      any other site can cause with `location = ...`, carrying the learner's
      SameSite=Lax cookie because it is top level:

        - With a session in the browser, this branch signed it out before
          checking the token, and Supabase's default sign-out is global, so a
          link with a made-up `token_hash` on somebody else's page revoked
          every session the learner had, on every device and in the native app.
        - With no session, an attacker's own link for an address they control
          signed the visitor silently into the attacker's account (login CSRF),
          and whatever they then wrote went into a deck somebody else reads.
        - A mail client's link scanner fetches every URL in a letter before the
          person does, and spent a single-use link nobody had pressed yet.

      So the GET only hands the link to the sign-in screen, which asks for one
      press, and the press is a same-origin POST to the handler below, which is
      what the forged-request gate in the middleware covers. A page elsewhere
      can still send somebody to the screen; it cannot press for them.
    */
    const confirm = new URLSearchParams({ token_hash: tokenHash, type });
    if (next !== "/") confirm.set("next", next);
    return go(`/sign-in?${confirm.toString()}`, url.origin);
  }

  return go("/sign-in?error=1", url.origin);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return go("/sign-in?error=1", url.origin);
  }
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.slice(0, 512) : null;
  };
  const tokenHash = field("token_hash");
  const type = emailOtpType(field("type"));
  const next = safeNext(field("next"));
  if (!tokenHash || !type) return go("/sign-in?error=1", url.origin);

  /*
    A link that would change who is signed in never just does it, even on a
    press. The session in this browser is ended and the learner is sent to sign
    in again, with a sentence saying what happened. `next` is dropped: it was
    chosen by whoever wrote the link. The sign-out is local, so ending this
    browser's session never reaches the learner's other devices.
  */
  if (hasSessionCookie(cookieNames(request))) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
    return go("/sign-in?switched=1", url.origin);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (!error) return settle(data.user?.email, next, url.origin);
  return go("/sign-in?error=1", url.origin);
}
