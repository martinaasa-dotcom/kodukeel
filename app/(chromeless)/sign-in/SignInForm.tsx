"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/access";
import { ssoDomainFor } from "@/lib/auth/sso";
import { GSI_LOCALE, GSI_SCRIPT_SRC, hashNonce, randomNonce } from "@/lib/auth/googleIdentity";

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
      locale?: string;
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

/** How long the column gets to stop moving before it is measured anyway. */
const SETTLE_TIMEOUT_MS = 1500;

/** How long a resize has to stop before the button is drawn again. */
const REDRAW_SETTLE_MS = 150;

/**
 * The narrowest and widest button Google's own API will draw.
 *
 * The floor is Google's rather than ours, so a column narrower than it
 * cannot be asked for a button that fits: handed anything under 200 the
 * script draws 200 anyway, which is a button wider than its own box and is
 * the cut-off right edge this whole file is about. A column that narrow gets
 * the redirect button instead, which is this app's own and reflows.
 */
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

/**
 * A BOX IS WORTH MEASURING ONCE NOTHING IS MOVING IT.
 *
 * `renderButton` is handed a number of pixels and draws a button that keeps
 * that number for ever, so it has to be the column's real width, and twice
 * now it has not been. The first reading was the button's own container,
 * which is `display: none` until the button has been drawn into it, so it
 * read zero every time and a hardcoded 360 went to Google instead. The second
 * was the column, which is visible throughout and is also still arriving: the
 * card wears `pop-in`, which scales it up from 0.9 over most of half a
 * second, and Google's script can answer well inside that. Measured a beat
 * into that animation, the column's layout width read 374 and its own
 * rectangle read 361.
 *
 * What either mistake looks like on a screen is a button that does not fit
 * the column it sits in, which is a right edge stopping before its own
 * border. It was reported that way both times.
 *
 * So this resolves once the column's rectangle agrees with the width it was
 * laid out at, which is what says no transform is scaling it, and has not
 * moved since the frame before. It gives up at the deadline, because a
 * browser where something never settles should still get a button.
 *
 * THE DEADLINE IS A TIMER RATHER THAN A COUNT OF FRAMES, and that is not
 * tidiness. A browser runs no animation frames in a tab nobody is looking
 * at, so a loop that gives up by reading the clock inside a frame never
 * gives up at all there: written that way, `/sign-in` opened in a background
 * tab waited out the fallback above instead and came back to the redirect
 * door, having drawn nothing. It reports whether it settled or ran out,
 * because the two are measured differently by the caller.
 */
function settled(el: HTMLElement, deadlineMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (still: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve(still);
    };
    const timer = window.setTimeout(() => finish(false), deadlineMs);
    let previous = -1;
    const frame = () => {
      if (done) return;
      const measured = el.getBoundingClientRect().width;
      const still = Math.abs(measured - el.clientWidth) < 0.5 && Math.abs(measured - previous) < 0.5;
      if (still) return finish(true);
      previous = measured;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

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
  googleClientId,
}: {
  emailLink: boolean;
  /** Domains this deployment has an identity provider for. Empty means none. */
  ssoDomains?: readonly string[];
  /*
    The Client ID, read on the server and handed down rather than reached for
    here. It is public, which is why it carries the `NEXT_PUBLIC_` prefix and
    why the CSP can name Google's host off the same variable. Reading it here
    would inline it at build time, and then one build could only ever serve
    one of the two states, which is what kept the whole of this door outside
    `scripts/test-signin.mjs`: that suite makes one build and runs it twice
    with different environments, exactly as `EMAIL_SIGN_IN` is read.
  */
  googleClientId?: string;
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
    googleClientId ? "loading" : "fallback",
  );
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  /**
   * The column the button lives in, measured instead of the button's own
   * container: that one is `display: none` until the button has already
   * been drawn into it, so its `clientWidth` is always zero at the moment
   * `renderButton` needs a width. This wrapper is visible the whole time.
   */
  const columnRef = useRef<HTMLDivElement | null>(null);
  /** The width the button was last drawn at, so a resize knows to draw it again. */
  const drawnWidth = useRef<number | null>(null);

  const ssoPolicy = useMemo(() => ({ domains: [...ssoDomains] }), [ssoDomains]);
  const sso = ssoDomains.length > 0;
  /** The provider this address would go to, recomputed as they type. */
  const ssoDomain = sso ? ssoDomainFor(email, ssoPolicy) : null;

  /**
   * The page this browser asked to land on, carried through whichever door.
   *
   * Through `safeNext`, here and not only in the callback: the Google button's
   * ID-token path never reaches /auth/callback, it signs in on this page and
   * navigates itself, so `?next=https://evil.example` sent somebody off-site
   * with a session freshly minted a second earlier.
   */
  function nextPath(): string {
    return safeNext(new URLSearchParams(window.location.search).get("next"));
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
   *
   * THE WIDTH IS THE ONE THING THIS HAS TO GET RIGHT, AND IT IS MEASURED
   * TWICE. `settled` above says why the first measurement has to wait. The
   * second is this: a number of pixels is right for the column it was taken
   * from and for no other, so a column that changes size afterwards leaves a
   * button that no longer fits it, and a button that no longer fits it is a
   * right edge stopping short of its own border. A phone turned on its side,
   * a scrollbar arriving once the page is long enough to need one, and a
   * browser zoom are all that same change. So the column is watched and the
   * button is drawn again whenever its width moves, which is cheap: the
   * observer answers once per resize and `renderButton` is local work on a
   * script that has already loaded.
   *
   * The rectangle rather than `clientWidth`, floored, because what has to fit
   * is the painted box and a number rounded up is a number one pixel too
   * wide. `initialize` is called once, since the nonce belongs to the attempt
   * rather than to the drawing, and only `renderButton` is repeated.
   */
  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    let drawn = false;
    let observer: ResizeObserver | null = null;
    let redraw = 0;
    /*
      The deadline gives up on Google's script, not on a button that has
      already arrived. Written to cancel whatever had happened, it also shut
      the observer below down four seconds in, so a phone turned on its side
      after that kept the width it was drawn at, which is the fault this is
      here to fix arriving by the back door.
    */
    const timeout = window.setTimeout(() => {
      if (drawn) return;
      cancelled = true;
      window.clearInterval(poll);
      setGoogleState((state) => (state === "loading" ? "fallback" : state));
    }, GOOGLE_BUTTON_TIMEOUT_MS);

    /**
     * The column's own width, floored so the number can never exceed the box.
     *
     * The rectangle is the exact painted width and is the one to take, so
     * long as nothing is scaling it. Where `settled` gave up rather than
     * settling, something still is, and then the layout width is the truth
     * and the rectangle is a frame of an animation. `Math.min` is the guard
     * either way: a rectangle wider than the box it was laid out at is a
     * transform, never a wider box, and asking Google for that number is the
     * right edge stopping short of its border that started all this.
     */
    function widthNow(still: boolean): number | null {
      const column = columnRef.current;
      if (!column) return null;
      const laid = column.clientWidth;
      const rect = column.getBoundingClientRect().width;
      const measured = Math.floor(still ? Math.min(rect, laid) : laid);
      /* Nothing to draw a Google button in. The caller opens the other door. */
      if (measured < MIN_BUTTON_WIDTH) return null;
      return Math.min(measured, MAX_BUTTON_WIDTH);
    }

    /** Draw the button at the column's width, replacing whatever was there. */
    function paint(id: GoogleAccountsId, still: boolean) {
      const container = googleButtonRef.current;
      if (!container) return;
      const width = widthNow(still);
      /*
        A column that cannot hold Google's own minimum gets this app's button,
        which is a real one rather than a picture of one and fits whatever it
        is put in. Reversible: the observer below watches the same column, so
        a window widened again draws Google's back.
      */
      if (width === null) {
        container.replaceChildren();
        drawnWidth.current = null;
        setGoogleState("fallback");
        return;
      }
      container.replaceChildren();
      id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        logo_alignment: "left",
        locale: GSI_LOCALE,
        width,
      });
      drawnWidth.current = width;
      setGoogleState("gis");
    }

    async function draw() {
      const id = window.google?.accounts?.id;
      const container = googleButtonRef.current;
      const column = columnRef.current;
      if (!id || !container || !column || cancelled) return;
      const nonce = randomNonce();
      const hashed = await hashNonce(nonce);
      if (cancelled) return;
      const still = await settled(column, SETTLE_TIMEOUT_MS);
      if (cancelled) return;
      id.initialize({
        client_id: googleClientId!,
        callback: (response) => { void signInWithGoogleIdToken(response.credential, nonce); },
        nonce: hashed,
        use_fedcm_for_prompt: true,
      });
      paint(id, still);
      drawn = true;
      /*
        Coalesced, because a window dragged across the clamp range fires the
        observer on every frame of the drag and each answer is a button torn
        down and built again under somebody's pointer. One redraw once the
        dragging stops is the same button and none of the churn.
      */
      observer = new ResizeObserver(() => {
        if (cancelled) return;
        window.clearTimeout(redraw);
        redraw = window.setTimeout(() => {
          if (cancelled) return;
          /*
            `null` is a width like any other here: it means the column has
            become too narrow for Google's own minimum, and that is exactly
            the case the redraw has to act on. Filtered out as "no width",
            a window narrowed past it kept a button wider than its column.
          */
          const width = widthNow(true);
          if (width !== drawnWidth.current) paint(id, true);
        }, REDRAW_SETTLE_MS);
      });
      observer.observe(column);
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
      window.clearTimeout(redraw);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleClientId]);

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

  /*
    `data-sign-in-column` on the column below is a hook for
    `scripts/test-signin.mjs`, which has to measure that box with Google's
    button in it and with it gone: read off the button's own ancestors it
    could only be found while a button was there, which is the one state the
    narrow case does not have.
  */
  return (
    <div ref={columnRef} data-sign-in-column className="flex flex-col gap-4">
      {/*
        `size="lg"` rather than a padding of its own. The ad-hoc `px-6 py-3`
        this carried put the button at 41px tall on a 360px phone, under the
        44px floor every other control in the app clears, and nothing had ever
        measured it: in local mode this screen draws a panel about local mode
        instead, so no browser suite reached the button until
        `scripts/test-signin.mjs` did.
      */}
      {googleClientId && (
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
      {/*
        `gsi-button` is not styling: it is the one hook the stylesheet's
        exemption for Google's own iframe is scoped to, and the reason is
        written out beside that rule. Without it the frame Google draws is
        capped at this container and the button inside it is painted ten
        pixels short of its own right edge, which is the cut-off right side
        this file has now been rewritten for three times.
      */}
      <div
        ref={googleButtonRef}
        className="gsi-button flex w-full justify-center"
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
