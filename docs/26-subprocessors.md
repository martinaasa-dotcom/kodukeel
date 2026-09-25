# Subprocessors and recipients

**Controller.** Upthink Solutions OÜ, registry code 16683946, Aiandi tn 8/2-28, Mustamäe linnaosa,
12915 Tallinn, Harju maakond, Estonia. Contact: privacy@upthink.ee.

**Written 5 September 2026. Revised 22 September 2026**, out of cycle and for the reason the review
section gives: two recipients had joined the generated list and this page still said neither was on
it, and a provider had left the chain. Reviewed with `docs/24-dpia.md`.

## The list is generated, so this page and the app cannot quietly disagree

Kodukeel is software somebody installs rather than a service with one address, and which services an
installation talks to is a fact about its own configuration. A privacy notice saying "whichever AI
provider this installation is configured with" answers neither Article 13(1)(e) nor 13(1)(f): the
reader cannot tell whether their writing goes to a company in Tallinn or in California, and the
operator cannot tell whether they have disclosed it.

So `lib/legal/recipients.ts` reads the deployment's own environment and returns the recipients this
copy actually has, and `/privacy` renders that list at request time. This document describes the
same table and the reasoning behind it. Where the two differ, the generated list on the running
deployment is the one that is right.

Two properties of that module are worth stating, because they are what makes the list trustworthy:

- **Labels only, never a model name and never anything derived from a key.** Which company is on the
  other end is the fact a reader needs. The rest is operational detail that would only date.
- **A configured URL is named by host, never by path.** A webhook path is a common place to keep a
  token and the privacy page is public.

## Conditional on configuration

One entry below is unconditional. The rest appear when a deployment sets a variable, or in one case
when the platform sets one about itself, which is why the running app generates its own list rather
than inheriting this one.

| Recipient | Appears when |
| --- | --- |
| TartuNLP | Always |
| Wikimedia | With an Ekilex key set, since the two are one lookup |
| Ekilex | `EKILEX_API_KEY` is set |
| An AI provider, one entry per provider in the chain | That provider's key is set. With none set the tutor and the page scanner do not exist |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` is set. With no Supabase keys the app runs as a single local learner (ADR-013) |
| Resend | `RESEND_API_KEY` is set. With none, the app sends no letters |
| An error reporting endpoint | `ERROR_WEBHOOK_URL` is set |
| Vercel | `VERCEL` is set by the platform itself, so it appears when somebody else owns the machine and not when the operator does |

## The register

### Supabase

**Conditional**, on `NEXT_PUBLIC_SUPABASE_URL`. Configured on kodukeel.ee.

**What it processes.** The email address and user id, as the sign-in provider, and everything in the
database, as its host. This is the broadest relationship in the register and the one to read first:
Supabase holds the whole of what §2 of `docs/24-dpia.md` inventories.

**Where established.** A Supabase project's region is chosen when the project is created and is not
readable from the running app. `lib/legal/recipients.ts` records it as unknown rather than guessing,
and `/privacy` tells the reader to ask the operator. Saying so is more use than a guess.

**Safeguard.** Supabase's own data processing addendum, which incorporates the standard contractual
clauses where the project region is outside the EEA. An operator who wants the transfer question
closed entirely creates the project in an EU region, which is the recommendation for a school or a
public body deploying this.

**Role.** Processor.

### The AI provider chain

**Conditional**, on a provider key being set. The chain is resolved by `resolveProviders()` in
`lib/tutor/provider.ts`, free tiers first, and a recipient entry is generated per distinct provider
label rather than per model.

| Provider | Where established | On the EEA list |
| --- | --- | --- |
| Groq | United States | Outside |
| Google Gemini | United States | Outside |
| Anthropic | United States | Outside |
| OpenAI | United States | Outside |

**What they process.** What a learner types to the tutor, and any page they photograph. Nothing else:
the deck, the review history, the tasks and the level checks are never sent to any of them, and the
route no longer accepts a level from the client either. The learner's name and email are not sent.

**Where established.** All of them outside the EEA, which is recorded in `PROVIDER_HOME` as a
judgment about the company rather than about a region setting on somebody's account. OpenRouter was
on this table and is no longer in the chain at all: `PROVIDER_KEY_ENV` in `lib/tutor/provider.ts` is
the whole list of keys a deployment can hold, and it is the four above.

**Safeguard.** The standard contractual clauses each provider publishes, and nothing else.
`/privacy` says that, and says protection there is not identical to protection here, and says the
transfer is avoidable: the tutor and the page scanner are the only two features that do it. **No
per-provider transfer impact assessment has been carried out.** That is recorded as an open item in
`docs/24-dpia.md` §6 rather than papered over.

**A real limit on the promise.** `/privacy` states it in as many words: what a provider does with
what we send is governed by their own terms, and some free tiers are free because the provider keeps
the right to look at what goes through them. An operator choosing the chain is choosing that too.

**Role.** Processor for the content of the request. The provider's own further use, where its terms
allow one, is its own.

### Ekilex, at the Institute of the Estonian Language

**Conditional**, on `EKILEX_API_KEY`.

**What it processes.** A single Estonian word somebody looked up, with no account attached. No user
id, no session, nothing that identifies the person asking.

**Where established.** Estonia. Inside the EEA.

**Safeguard.** None needed. No transfer leaves the Union.

**Role.** Recipient of a lookup rather than a processor of personal data, on the reading that a bare
word with no identifier attached is not personal data. It is listed because a reader deciding whether
to use a feature deserves to know a request leaves the app at all.

### Wikimedia, which runs Wiktionary

**Conditional**, on the same key, because it is the same lookup: Ekilex carries no English on a
reader key, so a word it answers for is then asked about at Wikimedia.

**What it processes.** The same single word, asked for its English meaning, with no account attached.

**Where established.** The Wikimedia Foundation is established in the United States. Outside the EEA.

**Safeguard.** Nothing identifying the learner is in the request, so there is no personal data in the
transfer. It was missing from this list for a while, while the lookup that makes it had been in the
app since the beginning, which is the argument for generating the list rather than writing it down
once.

**Role.** Recipient of a lookup.

### TartuNLP, at the University of Tartu

**Unconditional.**

**What it processes.** A phrase somebody asked to hear read aloud, with no account attached.

**Where established.** Estonia. Inside the EEA.

**Safeguard.** None needed.

**Note.** Speech goes out; nothing comes back about the learner. Nothing they record is ever sent
anywhere, and no audio of a learner is stored (ADR-018).

**Role.** Recipient of a synthesis request.

### Resend, which posts the letters

**Conditional**, on `RESEND_API_KEY`.

**What it processes.** The learner's email address, and whatever a letter says about their own
course: an evening that is unfinished, a level the scheduler graduated them past, a streak shield
that was spent, an errand to go and try, or a word a day. `lib/email/` composes and is pure,
`lib/mailer/` posts, and `EmailSend` records one line per message so the same letter is not sent
twice.

**Where established.** Resend Inc. is established in the United States. Outside the EEA.

**Safeguard.** Resend's own data processing addendum and the standard contractual clauses it
publishes.

**Why it is the sharpest entry on this page.** Every other recipient here gets a word, a phrase or a
photograph with no account attached. This one gets an address and a message addressed to it, which
is personal data by the plainest reading there is, and it is the only place outside the sign-in
provider that this deployment's addresses go. It is generated whenever the transport is configured
rather than whenever a letter is sent, because what a reader is asking is who their address could
reach rather than who it has reached this week. The way out is in every footer, it is an HMAC over
the learner and the kind so it works with no session (`EMAIL_TOKEN_SECRET`), and a kind a learner
has switched off is never sent.

**Role.** Processor.

### The error reporting endpoint

**Conditional**, on `ERROR_WEBHOOK_URL`.

**What it processes.** A description of anything that breaks, with the opaque user id and never the
email address. Anything shaped like a credential is stripped before it is sent, by `redact` in
`lib/observability/report.ts`, which is the same function `safeMessage` uses to keep a connection
string off a learner's screen.

**Where established.** Wherever the operator pointed it. Nothing in the app can tell, so it is
recorded as unknown and the page says to ask.

**Safeguard.** The operator's own arrangement with whoever runs that endpoint. A user id plus a
timestamp is personal data by any reading of Article 4, so this is a real disclosure and it is on the
generated list for that reason.

**Role.** Processor, of the operator's choosing.

### The hosting platform

**Conditional**, on `VERCEL`, which the platform sets itself.

The deployment runs on Vercel, which is established in the United States. It was for a while the one
recipient this page named and the generated list could not see: the list was built by asking the code
which services it was configured to call, and the machine the code runs on is not one of those. It is
generated now, and only where somebody else owns the machine, because self-hosted the operator named
at the top of `/privacy` is the host and listing them as a recipient of their own data is noise.

What it necessarily handles is every request while it is being answered, which for a signed-in
request includes the session cookie, and a request log with an address in it. Named by company
rather than by region: `vercel.json` pins the functions beside the database, so a European
deployment is answered in Europe, and that is not the question Article 44 asks. Vercel's own data
processing addendum and the standard contractual clauses are the safeguard. An operator hosting this
elsewhere substitutes their own platform here, and sees no Vercel entry on their own privacy page.

**Role.** Processor.

## Not on the list, on purpose

- **No analytics company.** There is no analytics script in the app. Retention is answered from the
  deployment's own database at `/api/metrics`, and only totals leave that route. Vercel Analytics
  was mounted once and was removed, because `/privacy` promised no trackers and the generated
  recipients list did not name it.
- **No advertising network, no data broker, no enrichment service.** Nothing is sold and nothing is
  used to train a model by us.
- **No second email provider.** Resend is the one, above, and it carries both the sign-in links
  Supabase sends through it and the letters this app composes itself. Supabase's built-in sender is
  for testing, which the README says, so a deployment that tells anybody about itself is a
  deployment with `RESEND_API_KEY` set and Resend on its generated list.
- **Whoever receives a research file.** The output of `/api/research` is anonymous information under
  Recital 26, so its recipient is not a recipient of personal data. `docs/19-research-export.md` is
  what to read before sending one to anybody.

## Review

Owned by Upthink Solutions OÜ at privacy@upthink.ee. Reviewed annually with `docs/24-dpia.md`, and
out of cycle whenever a provider is added to or removed from the chain, a new configuration variable
puts a service on the generated list, a hosting or database region changes, or a transfer impact
assessment is carried out.
