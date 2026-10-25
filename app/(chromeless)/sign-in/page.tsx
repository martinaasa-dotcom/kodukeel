import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowLeft, Check } from "lucide-react";
import { supabaseConfigured } from "@/lib/auth/mode";
import { readSsoPolicy } from "@/lib/auth/sso";
import { appleServicesId as readAppleServicesId } from "@/lib/auth/appleConfig";
import { googleClientId as readGoogleClientId } from "@/lib/auth/googleConfig";
import { resolveOperator } from "@/lib/legal/operator";
import { Note } from "@/components/ui";
import { Button, ButtonLink } from "@/components/Button";
import { MascotWatch } from "@/components/MascotWatch";
import { fillNodes } from "@/components/TemplateNodes";
import { fill, localeFrom, tr } from "@/lib/copy/locale";
import { SignInForm } from "./SignInForm";
import { ForgetLinkInAddress } from "./ForgetLinkInAddress";
import { ForgetLeftBehind } from "@/components/ForgetLeftBehind";
import { LocaleProvider } from "@/components/Locale";
import { areaTable } from "@/lib/copy/i18n/slice";
import { START } from "@/lib/copy/i18n/areas/start";

export const metadata = { title: "Sign in" };

export const dynamic = "force-dynamic";

const PROMISES = [
  "A dictionary that shows you every form of every word",
  "Your words brought back just before you'd forget them, plus quick games: speed rounds, listening and matching pairs",
  "Anu, a tutor who explains the grammar and never makes up a word",
  "A conversation to rehearse, and one small thing to say to a real person today",
];

/**
 * Two refusals used to be written into the URL and read by nothing.
 *
 * `/auth/callback` sends somebody to `?denied=1` when their address is not on
 * this deployment's allowlist, to `?switched=1` when a mailed link arrived on
 * a browser that was already signed in, to `?bounced=1` when Google sent them
 * back to a host that never started the sign-in, and to `?error=1` when an
 * exchange failed or a mailed link had already been used. Both landed on an ordinary sign-in
 * screen that said nothing at all, so the one person who needed telling why
 * they could not get in was shown the button that had just refused them.
 * Every other dead end in this app says what happened; this one now does too,
 * and where there is somebody to ask, it says who.
 */
export default async function SignInPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const configured = supabaseConfigured();
  const params = await searchParams;
  /*
    THE LANGUAGE COMES IN ON THE ADDRESS, BECAUSE NOBODY IS SIGNED IN YET.

    The Russian and Ukrainian front pages link here with `?lang=ru` and
    `?lang=uk`, and there is no learner to read a setting from, so the query is
    the only place the choice can live. `localeFrom` honors those two and
    reads anything else as English, which is what this screen always was. The
    form carries it on to first run, so the wizard opens in the same language.
  */
  const locale = localeFrom(typeof params.lang === "string" ? params.lang : null);
  const t = (english: string) => tr(locale, english);
  const operator = resolveOperator();
  /*
    THE MAILED LINK IS DRAWN UNLESS THE OPERATOR SAYS OTHERWISE.

    It used to be the other way round, off until `EMAIL_SIGN_IN="on"`, on the
    argument that Supabase's built-in sender is a couple of messages an hour
    for the whole project and a form that mails nobody is worse than no form.
    That argument was right about the sender and wrong about the default: the
    switch lived in a dashboard nobody was reminded of, so the one deployment
    this app has ran for weeks with Google as the only door, and the person
    who noticed was the person the door was for. A Google account may not be
    the price of entry, and a default that quietly makes it one is the fault
    the form exists to fix.

    So the door is open unless a deployment closes it. `EMAIL_SIGN_IN="off"`
    is for a copy whose mail really does not go out, and the README says what
    to set up before the second person asks for a link.
  */
  const emailLink = (process.env.EMAIL_SIGN_IN ?? "").trim().toLowerCase() !== "off";
  /*
    ENTERPRISE SIGN-IN IS READ HERE AND NOWHERE ELSE.

    `SSO_DOMAINS` names the email domains a company's identity provider
    answers for, and the form needs both halves of it: whether to draw the
    box at all on a copy with the mailed link switched off, and which
    addresses go to the provider rather than into an inbox. The domains are
    not a secret, they are printed on everybody's business card, but the
    environment is still the server's to read: a client component reaching
    for it would be a variable that has to be public to work at all.
  */
  const ssoDomains = readSsoPolicy().domains;
  /*
    GOOGLE'S OWN BUTTON IS READ HERE TOO, FOR THE REASON THE SWITCH ABOVE IS.

    `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is public, and it is still the server's to
    read: a client component reaching for it has it inlined at build time, so
    one build can only ever serve one of the two states. That is what kept the
    whole Google door outside `scripts/test-signin.mjs`, which makes one build
    and starts it twice with different environments. The CSP reads the same
    variable, on the server, in `lib/security/headers.ts`, and /privacy names
    Google as a recipient off the same reader (`lib/auth/googleConfig.ts`).
  */
  const googleClientId = readGoogleClientId();
  /*
    And Apple's, for the same reason and through the one reader the CSP and
    /privacy use, so the button, the policy that lets its script load and the
    page naming Apple as a recipient cannot disagree (lib/auth/appleConfig.ts).
  */
  const appleServicesId = readAppleServicesId();
  const denied = params.denied !== undefined;
  const failed = params.error !== undefined;
  /*
    A mailed link arrived while somebody else was already signed in on this
    browser. `/auth/callback` will not follow it, because a link like that
    silently moves whoever clicks it into the account it was issued for, and
    everything they write afterwards goes into a stranger's deck. It ends the
    session that was here and sends them back to this screen instead.
  */
  const switched = params.switched !== undefined;
  /*
    The code arrived in a browser holding no verifier for it: a mailed link
    opened on another device, or Google sending somebody back to a different
    address from the one they started on. The second is a dashboard setting
    rather than anything the learner did, which is why the sentence says
    what to add and, where there is one, who to tell. `lib/auth/canonical.ts` says how a deployment stops it.
  */
  const bounced = params.bounced !== undefined;
  /*
    A mailed link, handed over by `/auth/callback` rather than acted on there.
    Any page can send somebody to a URL, so a GET may not sign anybody in or
    out; this form is the one press that does, and it is a same-origin POST
    the forged-request gate covers. The values go back exactly as they came,
    and the callback checks every one of them again.
  */
  const linkToken = typeof params.token_hash === "string" ? params.token_hash.slice(0, 512) : null;
  const linkType = typeof params.type === "string" ? params.type.slice(0, 32) : null;
  const linkNext = typeof params.next === "string" ? params.next.slice(0, 512) : null;
  const confirming = configured && linkToken !== null && linkType !== null;

  return (
    <main lang={locale === "en" ? undefined : locale} className="night relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      {/* What the session the server just ended left on this device goes with it (lib/offline/forget.ts). */}
      <ForgetLeftBehind signedOutHere={switched || denied} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(70% 55% at 0% 0%, var(--wash-1), transparent 72%)" }}
      />

      <div className="relative w-full max-w-[440px]">
        <Link
          href={locale === "en" ? "/welcome" : `/welcome/${locale}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-60"
          style={{ color: "var(--ink-3)" }}
        >
          <ArrowLeft size={14} aria-hidden /> {t("Back to the front page")}
        </Link>

        <div
          className="arrive rounded-[var(--r-xl)] border p-8 text-center"
          style={{
            background: "rgb(255 255 255 / 0.06)",
            borderColor: "rgb(255 255 255 / 0.14)",
            boxShadow: "none",
            backdropFilter: "blur(18px)",
          }}
        >
          <MascotWatch size={62} className="float mx-auto" />
          <h1 className="font-display mt-5 text-2xl font-bold leading-tight tracking-tight md:text-3xl" style={{ color: "var(--ink)" }}>
            {/* Estonian whatever language the page around it is in. */}
            <span lang="et">Tere tulemast tagasi</span>
          </h1>
          <p className="mx-auto mt-2 max-w-[36ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("Sign in to start. It’s free, and if you’ve been here before, everything you learned is where you left it.")}
          </p>

          {denied && (
            <div className="mt-6 text-left">
              <Note tone="again">
                {operator.email
                  ? fill(t("That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with, or ask {email} to add you."), { email: operator.email })
                  : t("That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with.")}
              </Note>
            </div>
          )}
          {switched && (
            <div className="mt-6 text-left">
              <Note tone="hard">
                {t("That link would have signed you in as someone else, so to be safe we signed you out and didn’t follow it. If the link is yours, sign in below. If you didn’t ask for it, you can safely ignore it.")}
              </Note>
            </div>
          )}
          {bounced && (
            <div className="mt-6 text-left">
              <Note tone="hard">
                {t("This browser couldn’t finish that sign-in. Either the link was opened in a different browser from the one that asked for it, or you ended up on a different address from the one you started on. Try again from here.")}{" "}
                {operator.email
                  ? fill(t("If it keeps happening, let {email} know: this address needs adding to the sign-in settings."), { email: operator.email })
                  : t("If it keeps happening, whoever runs this copy needs to add this address to the sign-in settings.")}
              </Note>
            </div>
          )}
          {failed && !denied && !switched && !bounced && (
            <div className="mt-6 text-left">
              <Note tone="hard">
                {t("That sign-in did not go through. An emailed link works once and only lasts an hour, so if yours is older than that, ask for a fresh one below.")}
              </Note>
            </div>
          )}

          {confirming && (
            <form method="post" action="/auth/callback" className="mt-6 text-left">
              <input type="hidden" name="token_hash" value={linkToken ?? ""} />
              <input type="hidden" name="type" value={linkType ?? ""} />
              {linkNext && <input type="hidden" name="next" value={linkNext} />}
              {/*
                SAY ONLY WHAT IS TRUE, AND WHAT TO DO IF IT IS NOT.

                This said the link came from "your email", and nothing here can
                know that: anybody can ask for a link to their own address and
                send it to somebody else, and pressing the button would sign that
                person into the sender's account, where everything they write
                afterwards is the sender's to read. Whose address it is cannot be
                said before the link is spent, so the sentence asks the one
                question only the reader can answer.
              */}
              <Note tone="neutral">
                {t("Only continue if you asked for this sign-in link yourself just now. If you didn’t, close this page.")}
              </Note>
              <Button type="submit" variant="primary" className="mt-4 w-full">{t("Finish signing in")}</Button>
              <ForgetLinkInAddress />
            </form>
          )}

          <div className="mt-7">
            {configured ? (
              <>
                {/* The form's own lines, which are all in the first-run area, and no more of the language. */}
                <LocaleProvider locale={locale} table={locale === "en" ? undefined : areaTable(locale, [START])}>
                  {/*
                    No third-party script on a page holding a sign-in token. Google's
                    and Apple's scripts run with this page's full reach, so while the
                    form above carries a mailed link's token neither is loaded:
                    Google's door falls back to this app's own redirect button and
                    Apple's waits for a page with nothing in it to read.
                  */}
                  <SignInForm
                    emailLink={emailLink}
                    ssoDomains={ssoDomains}
                    googleClientId={confirming ? undefined : googleClientId}
                    appleServicesId={confirming ? undefined : appleServicesId}
                    locale={locale}
                  />
                </LocaleProvider>
                <p className="mt-4 text-center text-sm">
                  <Link href={locale === "en" ? "/help#sign-in" : `/help?lang=${locale}#sign-in`} className="underline underline-offset-2" style={{ color: "var(--ink-2)" }}>
                    {t("Trouble signing in?")}
                  </Link>
                </p>
              </>
            ) : (
              <div className="rounded-[var(--r-lg)] p-5 text-left" style={{ background: "var(--raised)" }}>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {fillNodes(t("This copy is running in local mode. There are no accounts and no signing in, and everything is kept right here on this machine. Add {url} and {key} to your {env} to turn on sign-in and separate decks for each person."), {
                    url: <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,
                    key: <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,
                    env: <code className="text-xs">.env</code>,
                  })}
                </p>
                <ButtonLink href={locale === "en" ? "/" : `/start?lang=${locale}`} variant="primary" className="mt-4 w-full">{t("Start studying")}</ButtonLink>
              </div>
            )}
          </div>

          <ul className="mt-7 flex flex-col gap-2.5 border-t pt-6 text-left" style={{ borderColor: "var(--rule-soft)" }}>
            {PROMISES.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--ink-2)" }}>
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--sky-soft)", color: "var(--sky-ink)" }}
                >
                  <Check size={12} strokeWidth={3} aria-hidden />
                </span>
                {t(p)}
              </li>
            ))}
          </ul>
        </div>

        {/*
          THE AGE, SAID ONCE, WHERE SOMEBODY IS ABOUT TO SIGN UP.

          Estonia sets the age at which somebody can agree to a service like
          this for themselves at 13, /privacy has always named that number, and
          the one screen where it is worth reading never mentioned it. Not a
          checkbox: a tick nobody can check verifies nothing, adds a step to
          the one screen that should have none, and would make the honest parts
          of the same page harder to believe. Stating the rule is the whole of
          what this app is in a position to do, and a teacher signing a class
          up is the reader it is actually for.
        */}
        <p className="mx-auto mt-6 max-w-[46ch] text-center text-xs" style={{ color: "var(--ink-3)" }}>
          {t("Kodukeel is for people aged 13 and over. If you’re younger, a parent needs to say yes first.")}
        </p>

        <p className="mx-auto mt-3 max-w-[46ch] text-center text-xs" style={{ color: "var(--ink-3)" }}>
          {t("Estonian forms and example sentences from Ekilex (Institute of the Estonian Language, CC BY 4.0). English translations from English Wiktionary (CC BY-SA 4.0). Word counts from FrequencyWords over OpenSubtitles (CC BY-SA 4.0). Every spelling of every word from Ekilex’s own tables as gathered in Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0), and from Vabamorf (LGPL). Speech from the University of Tartu, and heard on your device by TalTech’s Estonian model (MIT) running in sherpa-onnx (Apache 2.0).")}
        </p>
      </div>
    </main>
  );
}
