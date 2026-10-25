import { ekilexConfigured } from "@/lib/ekilex/client";
import { resolveProviders } from "@/lib/tutor/provider";
import { pushConfigured } from "@/lib/push/config";
import { fcmConfigured } from "@/lib/push/fcm";
import { appleSignInConfigured } from "@/lib/auth/appleConfig";
import { googleScriptLoaded, googleSignInOffered } from "@/lib/auth/googleConfig";

/**
 * Who this particular installation actually sends anything to, so the privacy
 * page can name them rather than describe them.
 *
 * Article 13(1)(e) asks for the recipients of personal data, and 13(1)(f) for
 * whether any of it goes outside the Union. A page that says "whichever AI
 * provider this installation is configured with" answers neither: the reader
 * cannot tell whether their writing is going to a company in Tallinn or in
 * California, and the operator cannot tell whether they have disclosed it.
 *
 * A deployment already knows the answer, because the answer is its own
 * configuration. So the page reads it. Labels only, never a model name and
 * never anything derived from a key: which company is on the other end is the
 * fact a reader needs, and the rest is operational detail that would only date.
 */

export interface Recipient {
  /**
   * A stable name for the recipient, never shown: what the store labels
   * (`lib/legal/storeLabels.ts`) key their answers on, since `name` is copy
   * and changes with the wording.
   */
  id: string;
  name: string;
  /** What of theirs goes there, in the reader's terms. */
  what: string;
  /**
   * Whether the service is established in the European Economic Area.
   * `false` makes the transfer disclosure apply; `null` means it depends on
   * an account setting this app cannot see.
   */
  eea: boolean | null;
}

/**
 * Where each provider is established. A judgment about the company, not about
 * a region setting on somebody's account, which is why the two that offer a
 * choice are recorded as unknown rather than guessed.
 */
/** The id each provider's recipient carries; a label not here is `ai:` and the label. */
const PROVIDER_ID: Record<string, string> = {
  Groq: "groq",
  "Google Gemini": "gemini",
  Anthropic: "anthropic",
  OpenAI: "openai",
};

const PROVIDER_HOME: Record<string, boolean | null> = {
  Groq: false,
  "Google Gemini": false,
  Anthropic: false,
  OpenAI: false,
};

/**
 * The host of a configured URL, or a plain admission that it is unreadable.
 *
 * Never the whole URL: a webhook path is a common place to put a token, and
 * this renders on a page anybody can read.
 */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "an address this installation has configured";
  }
}

export function resolveRecipients(): Recipient[] {
  const recipients: Recipient[] = [];

  for (const label of [...new Set(resolveProviders().map((p) => p.label))]) {
    recipients.push({
      id: PROVIDER_ID[label] ?? `ai:${label}`,
      name: label,
      what: "what you type to Anu, and any page you photograph",
      eea: PROVIDER_HOME[label] ?? null,
    });
  }

  if (ekilexConfigured()) {
    recipients.push({
      id: "ekilex",
      name: "Ekilex, at the Institute of the Estonian Language",
      what: "a single word you looked up, with no account attached",
      eea: true,
    });
    /*
      And Wiktionary, on the same trigger and in the same breath, because it is
      the same lookup: Ekilex carries no English on a reader key, so a word it
      answers for is then asked about at Wikimedia. One request, one word, no
      account. It was missing from this list while the lookup that makes it has
      been in the app from the beginning. An English search the dictionary
      has nothing for goes the same way, asked for its Estonian
      (`lib/dict/englishToEstonian.ts`), and only on this same trigger, since
      an entry it names can only be opened through Ekilex.
    */
    recipients.push({
      id: "wikimedia",
      name: "Wikimedia, which runs Wiktionary",
      what: "the same single word, asked for its English meaning, or an English word you searched for, asked for its Estonian, with no account attached",
      // Wikimedia Foundation is established in the United States.
      eea: false,
    });
  }

  /*
    THE SENDING PROVIDER, WHICH IS A RECIPIENT OF THE ONE THING THIS APP
    OTHERWISE NEVER HANDS OVER.

    Every other entry on this list gets a word, a phrase or a photograph with
    no account attached. This one gets an email address and a letter addressed
    to it, which is personal data by the plainest reading there is, and it is
    the only place outside the sign-in provider where this deployment's
    addresses go.

    Named whenever the transport is configured rather than whenever a letter is
    sent, because the question a reader is asking is who their address could
    reach rather than who it has reached this week. It was already true before
    any of this: the README has had Resend as the SMTP behind Supabase's
    sign-in links from the beginning, and the list never said so, which is
    exactly the shape of omission `resolveRecipients` exists to end.
  */
  if (process.env.RESEND_API_KEY?.trim()) {
    recipients.push({
      id: "resend",
      name: "Resend, which sends our emails",
      what: "your email address, and whatever a message to you says about your own course",
      // Resend Inc. is established in the United States.
      eea: false,
    });
  }

  /*
    THE PUSH SERVICES, WHICH CARRY A REMINDER TO A COMPUTER (VB-10).

    A notification reaches a browser through a service its maker runs, and
    this deployment posts to the four `lib/push/subscription.ts` names and to
    no other host. What they receive is a message encrypted to the browser's
    own key, which they cannot read, sent to an address that names a browser
    rather than a person. That is still a recipient: they learn that this
    deployment sent that browser something, when, and how large it was.

    Named whenever the keys are set rather than whenever somebody has turned
    reminders on, for the reason the sending provider above is: a reader is
    asking who their data could reach. Which of the four depends on the
    learner's own browser, which is why all four are named.
  */
  if (pushConfigured()) {
    recipients.push({
      id: "push-services",
      name: "The push services run by Google, Mozilla, Apple and Microsoft",
      what: "a reminder you asked to have on a computer, encrypted so that only that browser can read it",
      // All four companies are established in the United States.
      eea: false,
    });
  }

  /*
    FIREBASE CLOUD MESSAGING, WHICH CARRIES A REMINDER TO A PHONE (N-9).

    A phone running the app is reminded through Google's Firebase Cloud
    Messaging, which delivers an Android notification itself and an iPhone's
    through Apple's service. Unlike the browsers' push services it reads what
    it carries: a token that names the app on that phone, and the two lines of
    the notification, which are a letter's subject and preview and never a
    name or an answer. Named wherever the operator has set an account, for the
    reason the push services above are.
  */
  if (fcmConfigured()) {
    recipients.push({
      id: "fcm",
      name: "Google, through Firebase Cloud Messaging",
      what: "a reminder you allowed on a phone with the app: the token that names the app on that phone, and the two lines the reminder says",
      // Google LLC runs Firebase in the United States.
      eea: false,
    });
  }

  /*
    SIGN IN WITH GOOGLE, ON EVERY PAGE THAT DRAWS THE BUTTON (N-3a).

    It was the one sign-in provider this list did not name, which
    `docs/26-subprocessors.md` called a gap. Somebody who presses "Continue
    with Google" tells Google they are signing in here, and when, and Google
    hands back the name and the email address on their account, which the
    account keeps. Every hosted sign-in page draws the button
    (`lib/auth/googleConfig.ts`), so it is named wherever that page exists.
    And where the Client ID is set, the page loads Google's own script as it
    opens, so Google learns of the visit before anybody presses anything,
    which is said in its own words.
  */
  if (googleSignInOffered()) {
    recipients.push({
      id: "google-sign-in",
      name: "Google, if you sign in with Google",
      what: googleScriptLoaded()
        ? "that you opened the sign-in page and from what address, and if you sign in with Google, when, with the name and email address on your Google account"
        : "that you sign in here and when, and the name and email address on your Google account",
      // Google LLC, in the United States, runs Identity Services; which Google
      // entity answers a European account is not readable from here, so the
      // transfer is disclosed rather than assumed away.
      eea: false,
    });
  }

  /*
    SIGN IN WITH APPLE, WHERE THE OPERATOR HAS SET IT UP (N-3).

    Somebody who presses "Continue with Apple" tells Apple they are signing in
    here, and when, and Apple hands back the name and the address they chose
    to share, which may be a private relay address Apple makes for them. That
    is both directions of a recipient, so it is named, and only where the
    button is drawn: a deployment with no Services ID sends Apple nothing.
  */
  if (appleSignInConfigured()) {
    recipients.push({
      id: "apple-sign-in",
      name: "Apple, if you sign in with Apple",
      what: "that you sign in here and when, and the name and email address you let Apple share with us",
      // Apple Inc. is established in the United States, and an account's
      // sign-ins are handled there whichever Apple entity answers in Europe.
      eea: false,
    });
  }

  recipients.push({
    id: "tartunlp",
    name: "TartuNLP, at the University of Tartu",
    what: "a phrase you asked to hear read aloud, with no account attached",
    eea: true,
  });

  /*
    An operator-chosen endpoint that handled errors are posted to, if one is
    configured. It is redacted — no email address, and anything shaped like a
    credential is stripped — but it carries the opaque user id, and a user id
    plus a timestamp is personal data by any reading of Article 4.

    It was the one recipient this page could not name, because it is the one
    the software does not choose. Which made it exactly the one worth
    generating: the page is meant to be reused as-is by whoever deploys this,
    and it went from accurate to inaccurate the moment a deployer set a single
    variable, silently, with nothing anywhere to notice.

    The host is named rather than the URL. A reader needs to know who is on the
    other end; a path may carry a token, and this page is public.
  */
  const webhook = process.env.ERROR_WEBHOOK_URL?.trim();
  if (webhook) {
    recipients.push({
      id: "error-webhook",
      name: `The error reporting endpoint at ${hostOf(webhook)}`,
      what: "a description of anything that breaks, with your user id and never your email",
      // Wherever the operator pointed it. Nothing here can tell.
      eea: null,
    });
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    recipients.push({
      id: "supabase",
      name: "Supabase",
      what: "your email address and everything in the database, as the host of both",
      // The project's region is chosen when it is created and is not readable
      // from here. Saying so is more use than guessing at it.
      eea: null,
    });
  }

  /*
    THE ONE THAT WAS MISSING, AND IT WAS MISSING FOR A REASON WORTH KEEPING.

    Everything above is a service the application code calls, so the list was
    built by asking the code what it was configured to call. The machine the
    code runs on is not one of those, and so it was the one recipient this page
    never named while handling every request on it: the pages rendered, the
    answers posted, and a request log with an address in it.

    Only where somebody else owns the machine. Self-hosted, the operator named
    at the top of the page is the host, and listing them again as a recipient
    of their own data would be noise. `VERCEL` is set by the platform itself,
    which is what makes this a fact about where the code is running rather than
    a guess.

    Named by company rather than by region. `vercel.json` pins the functions
    beside the database, so a European deployment's requests are answered in
    Europe, and that is not the question Article 44 asks: the company is
    established in the United States and is subject to being asked there.
  */
  if (process.env.VERCEL === "1") {
    recipients.push({
      id: "vercel",
      name: "Vercel, which runs the servers this app lives on",
      what:
        "every request you make, while it's being answered, and a log of it "
        + "that includes your IP address",
      eea: false,
    });
  }

  return recipients;
}

/** True when anything on the list is, or may be, outside the EEA. */
export function transfersOutsideEea(recipients: Recipient[]): boolean {
  return recipients.some((r) => r.eea !== true);
}
