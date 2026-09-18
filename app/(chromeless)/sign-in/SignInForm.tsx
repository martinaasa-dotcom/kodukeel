"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ssoDomainFor } from "@/lib/auth/sso";
import { GSI_SCRIPT_SRC, hashNonce, randomNonce } from "@/lib/auth/googleIdentity";

/** The public client ID, when a deployment has one. Never a secret. */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * The one shape of Google Identity Services this file reads. There is no
 * official type package for it, so this is written out by hand rather than
 * reached for as `any`.
 */
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    nonce: string;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: "standard";
      theme?: "outline";
      size?: "large";
      shape?: "rectangular";
      text?: "continue_with";
      logo_alignment?: "left";
      width?: number;
    },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

/** How long the Google button gets to render before the old door reopens. */
const GOOGLE_BUTTON_TIMEOUT_MS = 4000;

/**
 * Three ways in, and the second and third exist because the first excludes people.
 *
 * Google was the only door here, which is fine for a class that already has
 * school accounts and is a wall for everybody else: somebody with no Google
 * account, or unwilling to attach one to a language app, could not reach the
 * product at all. A mailed link asks for an address and nothing else.
 *
 * Google stays the loud action, because it is one press and no waiting, and
 * the mailed link is the quiet one underneath. Both land on the same
 * `/auth/callback`, so the allowlist and the `next=` narrowing are checked in
 * exactly one place for both.
 *
 * The mailed half is drawn by default and a deployment whose mail does not
 * go out hides it with `EMAIL_SIGN_IN="off"`. The reasoning for that being
 * the way round it is lives on the page that reads the switch.
 *
 * THE THIRD WAY IS THE SAME BOX, NOT A THIRD BUTTON. A company running a
 * pilot signs in through its own provider, and the one thing this screen
 * needs to know is whether the address somebody typed belongs to it. So the
 * form takes a work address like any other and `ssoDomainFor` decides where
 * it goes: to the identity provider where the domain is one the deployment
 * configured, and to the mailed link otherwise. A button labelled "single
 * sign-on" beside the other two would be a door that refuses most of the
 * people who press it, and the domains are read on the server so this
 * component never reaches for the environment.
 *
 * `signInWithSSO` hands back a URL and does not follow it, which is the one
 * place it differs from the two calls above, so the redirect is ours to make.
 *
 * THE LINK HAS TO BE OPENED IN THIS BROWSER, and the screen says so rather
 * than letting somebody find out. `signInWithOtp` mints a PKCE verifier and
 * leaves it in a cookie here, so a link forwarded to a phone arrives at a
 * browser with nothing to exchange the code against. That is a property of
 * the flow rather than a bug, and the one sentence explaining it is cheaper
 * than the dead end it prevents.
 *
 * GOOGLE IS TWO DOORS, NOT ONE, AND THE SCRIPT DECIDES WHICH IS DRAWN.
 * `signInWithOAuth` sends the learner to Google by way of Supabase's own
 * `/auth/v1/callback`, which is why Google's own screen used to show the raw
 * Supabase project domain rather than this app's. Google Identity Services
 * runs entirely on this page instead and hands Supabase an ID token, so
 * there is no redirect URI for Google to name and it shows this app's own
 * domain. It needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, which is public (it is
 * the Client ID, never the secret), and it is drawn only once Google's own
 * script has answered; the old redirect door stays underneath it and opens
 * itself if the script never loads, errors, or is blocked, so a learner
 * behind an extension that refuses third-party scripts is never left with
 * no way in.
 */
export function SignInForm({
  emailLink,
  ssoDomains = [],
}: {
  emailLink: boolean;
  /** Domains this deployment has an identity provider for. Empty means none. */
  ssoDomains?: readonly string[];
}) {
  const [pending, setPending] = useState<"google" | "email" | "sso" | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The address we mailed, which is also the flag that we mailed anything. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  /**
   * `loading` while Google's script is still deciding, `gis` once its own
   * button has drawn, `fallback` where there is no client ID to try, or the
   * script never answered in time. Never a bare boolean: a boolean has to
   * start somewhere, and starting at "show the old button" is what put it on
   * screen for a beat before Google's replaced it, which read as one button
   * flashing into another rather than as one screen settling once.
   */
  const [googleState, setGoogleState] = useState<"loading" | "gis" | "fallback">(
    GOOGLE_CLIENT_ID ? "loading" : "fallback",
  );
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  /**
   * The column the button lives in, measured instead of the button's own
   * container: that one is `display: none` until the button has already
   * been drawn into it, so its `clientWidth` is always zero at the moment
   * `renderButton` needs a width. This wrapper is visible the whole time.
   */
  const columnRef = useRef<HTMLDivElement | null>(null);

  const ssoPolicy = useMemo(() => ({ domains: [...ssoDomains] }), [ssoDomains]);
  const sso = ssoDomains.length > 0;
  /** The provider this address would go to, recomputed as they type. */
  const ssoDomain = sso ? ssoDomainFor(email, ssoPolicy) : null;

  /** The page this browser asked to land on, carried through whichever door. */
  function nextPath(): string {
    return new URLSearchParams(window.location.search).get("next") ?? "/";
  }

  /** Where the provider sends somebody back to, carrying the page they wanted. */
  function callbackUrl(): string {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`;
  }

  async function signInWithGoogle() {
    setPending("google");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError(`${error.message}. If this keeps happening, Google sign-in may not be turned on for this copy yet.`);
      setPending(null);
    }
  }

  /** The ID token Google's own button collected, handed straight to Supabase. */
  async function signInWithGoogleIdToken(credential: string, nonce: string) {
    setPending("google");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credential,
      nonce,
    });
    if (error) {
      setError(`${error.message}. Try again, or reload the page.`);
      setPending(null);
      return;
    }
    // The session is already set: signInWithIdToken never redirected anywhere,
    // so there is nothing for /auth/callback to exchange. Go straight there.
    window.location.assign(nextPath());
  }

  /**
   * Google's script answered: build the nonce, hand it a callback, and draw
   * its button into our container. The screen shows a skeleton while this
   * runs rather than the redirect button, so nothing has to be swapped out
   * once Google's own button is ready; the timeout below is what falls back
   * to the redirect door if the script never answers or never draws.
   */
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      cancelled = true;
      window.clearInterval(poll);
      setGoogleState((state) => (state === "loading" ? "fallback" : state));
    }, GOOGLE_BUTTON_TIMEOUT_MS);

    async function draw() {
      const id = window.google?.accounts?.id;
      const container = googleButtonRef.current;
      if (!id || !container || cancelled) return;
      const nonce = randomNonce();
      const hashed = await hashNonce(nonce);
      if (cancelled) return;
      id.initialize({
        client_id: GOOGLE_CLIENT_ID!,
        callback: (response) => { void signInWithGoogleIdToken(response.credential, nonce); },
        nonce: hashed,
        use_fedcm_for_prompt: true,
      });
      const available = columnRef.current?.clientWidth || 320;
      id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        logo_alignment: "left",
        width: Math.max(200, Math.min(available, 400)),
      });
      setGoogleState("gis");
    }

    const poll = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(poll);
        void draw();
      }
    }, 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Hand somebody over to their company's provider.
   *
   * Unlike the other two, this call returns a URL and stays where it is, so
   * nothing happens unless we go. A response with neither a URL nor an error
   * is the one case that would otherwise look like a button that did nothing,
   * and it gets a sentence of its own.
   */
  async function signInWithSso(domain: string) {
    setPending("sso");
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithSSO({
      domain,
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError(`${error.message}. If this keeps happening, ${domain} may not be set up for single sign-on here yet.`);
      setPending(null);
      return;
    }
    if (!data?.url) {
      setError(`We could not reach the sign-in page for ${domain}. Try again, and tell whoever set this up if it keeps happening.`);
      setPending(null);
      return;
    }
    window.location.assign(data.url);
  }

  async function continueWithEmail(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    const domain = ssoDomainFor(address, ssoPolicy);
    if (domain) return signInWithSso(domain);
    if (!emailLink) {
      setError("That address is not one this copy signs in through a company provider. Use Google above, or ask whoever set this up.");
      return;
    }
    setPending("email");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl() },
    });
    setPending(null);
    if (error) {
      setError(`${error.message}. If this keeps happening, email sign-in may not be turned on for this copy yet.`);
      return;
    }
    setSentTo(address);
  }

  if (sentTo) {
    return (
      <div className="rounded-[var(--r-lg)] p-5 text-left" style={{ background: "var(--raised)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Check your email
        </p>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          We sent a link to <span style={{ color: "var(--ink)" }}>{sentTo}</span>. Open it in this
          browser and you are in. It stops working after an hour.
        </p>
        <button
          type="button"
          onClick={() => { setSentTo(null); setError(null); }}
          className="tap-tint mt-3 rounded-[var(--r)] text-sm font-semibold underline underline-offset-2"
          style={{ color: "var(--accent-deep)" }}
        >
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <div ref={columnRef} className="flex flex-col gap-4">
      {/*
        `size="lg"` rather than a padding of its own. The ad-hoc `px-6 py-3`
        this carried put the button at 41px tall on a 360px phone, under the
        44px floor every other control in the app clears, and nothing had ever
        measured it: in local mode this screen draws a panel about local mode
        instead, so no browser suite reached the button until
        `scripts/test-signin.mjs` did.
      */}
      {GOOGLE_CLIENT_ID && (
        <Script src={GSI_SCRIPT_SRC} strategy="afterInteractive" />
      )}

      {/*
        Three states and only one is ever shown at once: a skeleton while
        Google's script is still deciding, its own button once drawn, or the
        redirect button where there is no client ID or the script never
        answered. Not the redirect button first and the GIS one swapped in
        over it, which is what put one button on screen for a beat before
        Google's replaced it.
      */}
      {googleState === "loading" && <Skeleton height={52} className="w-full" />}
      <div
        ref={googleButtonRef}
        className="flex w-full justify-center"
        style={{ display: googleState === "gis" ? "flex" : "none" }}
      />
      {googleState === "fallback" && (
        <Button
          variant="primary"
          size="lg"
          onClick={signInWithGoogle}
          disabled={pending !== null}
          className="w-full"
        >
          {pending === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>
      )}

      {(emailLink || sso) && (
        <>
          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1" style={{ background: "var(--rule-soft)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>or</span>
            <span className="h-px flex-1" style={{ background: "var(--rule-soft)" }} />
          </div>

          <form onSubmit={continueWithEmail} className="text-left">
            <label htmlFor="sign-in-email" className="label-xs mb-2 block" style={{ color: "var(--ink-3)" }}>
              {sso ? "Your email or work address" : "Your email address"}
            </label>
            <input
              id="sign-in-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="field-lg w-full text-sm"
              style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={pending !== null || email.trim() === ""}
              className="mt-3 w-full"
            >
              {pending === "email" ? "Sending…" : null}
              {pending === "sso" ? "Taking you there…" : null}
              {pending === null
                ? ssoDomain
                  ? "Continue with your work account"
                  : emailLink
                    ? "Email me a link"
                    : "Continue"
                : null}
            </Button>
            {/*
              The hint says what the box will do with what is in it, and it
              changes once the address says which. Two sentences describing
              both doors at once is the reader working out which half is
              about them.
            */}
            <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
              {ssoDomain
                ? `We will send you to the ${ssoDomain} sign-in you already use.`
                : emailLink
                  ? sso
                    ? "No password to make up or forget. A work address goes to your company sign-in, and anything else gets a link to open in this browser."
                    : "No password to make up or forget. Open the link in this browser."
                  : "Use the work address your company signs in with."}
            </p>
          </form>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm" style={{ color: "var(--again-ink)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
