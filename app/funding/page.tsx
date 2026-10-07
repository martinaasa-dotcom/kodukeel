import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { CostExplorer } from "./CostExplorer";
import { rich } from "@/components/Rich";
import { LocaleProvider } from "@/components/Locale";
import { fill, tr } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";
import { resolveOperator } from "@/lib/legal/operator";
import { audioCacheIsDurable } from "@/lib/audio/store";
import { supabaseConfigured } from "@/lib/auth/mode";
import { ekilexConfigured } from "@/lib/ekilex/client";
import { resolveProviders } from "@/lib/tutor/provider";
import { priceFor } from "@/lib/usage/pricing";
import { DEFAULT_LIMITS } from "@/lib/usage/quota";
import { SERVICES } from "@/lib/funding/model";
import { CONTINUITY, floorUsd, retrenchment } from "@/lib/funding/sustainability";
import {
  COMPUTE, DEFAULT_SHAPE, DEVTOOLS, DOMAIN, EMAIL, ERRORS, FX, MEASURED, MEASURED_ON,
  PRICES_CHECKED, SPEECH_MARKET, SUPABASE, VERCEL,
} from "@/lib/funding/facts";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "Funding");
}

/*
  Same reason as /privacy and /terms: most of what is worth saying here is a
  fact about this particular deployment rather than about the software, and a
  page baked at build time would describe whichever machine ran the build.
*/
export const dynamic = "force-dynamic";

/**
 * What this costs to run, who pays, and what money would change.
 *
 * WHY A PAGE AND NOT A PARAGRAPH IN THE README. Three kinds of reader end up
 * asking the same question from different directions. Somebody at a ministry
 * wants to know they are not underwriting a company's margin. A university
 * wants to know what happens to the work when the money stops. A company's
 * community budget wants to know the number is real and small. All three are
 * asking "what am I actually paying for", and the honest answer is an itemized
 * list with the arithmetic left in.
 *
 * A learner is a fourth reader and the one this page is most careful with. An
 * app for people whose data is the reason they are careful has to be able to
 * say where its money comes from, because "free" is the word that should make
 * somebody ask what is being sold. Nothing is. `/privacy` says that and this
 * page shows the bill that makes it possible.
 *
 * WHAT MAKES IT DIFFERENT FROM A PITCH. Every number is either measured on
 * this repository, quoted off a vendor's price list with the date it was read,
 * or named as an assumption the reader can change. The interactive part is not
 * decoration: a total somebody can move is a total they can check, and the
 * three least flattering findings on the page (that the bill is about three
 * hundred dollars a month before a single learner arrives, that speech is the
 * fastest-growing line once anybody puts a figure on it, and that what is
 * given to this app outgrows what it pays for) are all things the model
 * surfaced rather than things anybody chose to admit.
 *
 * THAT FIRST FIGURE READ "ABOUT FORTY-SIX DOLLARS" UNTIL A GRANT CASE WAS
 * WRITTEN OFF THIS PAGE AND THE NUMBERS WERE RUN AGAIN. `billFor` at one
 * learner is 299.27 with the tutor on the model it answers on, which is what
 * CLAUDE.md has said all along. Forty-six is
 * close to what the retrenchment ladder now calls Lights on, 45, which is the
 * bill with nobody paid, no tooling and the tutor switched off. Those are two
 * different questions and the comment had quietly answered the wrong one: a
 * page whose whole argument is that its numbers are checkable cannot carry a
 * stale one in its own header.
 */
export default async function FundingPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicLocale(searchParams);
  const operator = resolveOperator();
  // Anu's own chain rather than the general one: the general chain carries the
  // paid tail, which a tutor chain never reaches, so naming it here told a
  // reader Anthropic answers Anu on a deployment where it cannot.
  const chain = resolveProviders({ purpose: "tutor" });
  const modelLabels = [...new Set(chain.map((p) => p.label))];
  /*
    Whether the configured chain actually charges, asked of the pricing table
    rather than of the model's name.

    The first version of this read `isFreeModel`, which is true only of a slug
    ending in `:free`, so a deployment on Groq or Gemini (whose free models
    carry no such suffix) was told on a page about honesty that at least one of
    its models charges. The table is the thing that knows, and it fails the
    safe way: a model it has never heard of prices at the dearest rate in it,
    which reads here as "something on this chain costs money" rather than as a
    reassurance nobody checked.
  */
  const freeChain = chain.length > 0 && chain.every((p) => {
    const price = priceFor(p.model);
    return price.inputPerMTok === 0 && price.outputPerMTok === 0;
  });

  /*
    Whether a piece of the infrastructure is switched on *here*.

    Only ever a boolean, and never the value: several of these variables are
    keys, this page is public, and the whole point of the credential rules in
    CLAUDE.md is that nothing reads one out loud. An item with no variable
    behind it is always on, because it is Postgres, a host, or the reader's own
    phone.
  */
  const switchedOn = (key: string | undefined): boolean =>
    key === undefined ? true : Boolean(process.env[key]?.trim());

  /*
    The retrenchment ladder is priced at the same default size the cost
    explorer opens on, so the first figure in that section is the same number
    the explorer shows above it. A reader who changes the explorer is asking a
    different question, and this section is deliberately not tied to it: what
    it costs to keep alive is one number, not a slider.
  */
  const ladder = retrenchment(DEFAULT_SHAPE);
  const floor = floorUsd(DEFAULT_SHAPE);

  /*
    The language is the request's (lib/progress/publicLocale.ts). The prose and
    every service's own description come from the public area; the arithmetic is
    the same arithmetic in every language, and the figures stay figures. The
    model's own explanation of each line and the judged numbers below the panel
    are still English in Russian and Ukrainian, and the page says so.
  */
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  /*
    Figures and dates the way the reader writes them: a decimal comma and a
    grouping space in Russian and Ukrainian, and a date in their own words.
    The facts file holds its dates as English strings, so English reads them
    as written and the other two re-read them as a day.
  */
  const tag = locale === "en" ? "en-GB" : locale;
  const num = (n: number | undefined) => (n === undefined ? "" : n.toLocaleString(tag));
  const dayOf = (day: string) => (locale === "en"
    ? day
    : new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day} UTC`)));
  const privacyLink = (label: string) => (
    <Link href={href("/privacy")} className="underline underline-offset-2">{t(label)}</Link>
  );

  return (
    <Legal title={t("Funding")} updated="2 September 2026" locale={locale} explicit={explicit} path="/funding">
      <P>
        {t("Kodukeel is free to use, there’s nothing to buy, and nothing about you is sold. This page shows the sums behind that sentence: what the app runs on, what each piece costs, who’s paying for the copy you’re reading, and what would change if somebody funded it.")}
      </P>
      {locale !== "en" && (
        <P>{t("The figures and the sums are the same in every language. The working the calculator shows for each line, and the numbers it had to judge, are still in English.")}</P>
      )}

      <S title={t("Who pays for this copy")}>
        {operator.identified ? (
          <P>
            {rich(t("This installation is run by **{name}**, and they pay the bills on this page. Kodukeel is software anyone can install rather than one service, so every copy has its own operator and its own invoice."), {
              name: operator.name,
            })}
          </P>
        ) : (
          <P>
            {rich(t("**Whoever runs this installation has not filled their name in.** Kodukeel is software anyone can install rather than one service, so the bills below are paid by whoever set this copy up. They are supposed to be named here and on the {privacy}, and they are not. If that is you, set `OPERATOR_NAME`, `OPERATOR_ADDRESS` and `OPERATOR_EMAIL`."), {
              privacy: privacyLink("privacy page"),
            })}
          </P>
        )}
        <P>
          {t("The code is MIT licensed and the dictionary data is not ours to license: Ekilex is CC BY 4.0 and Wiktionary is CC BY-SA 4.0, which is share-alike and therefore reaches the built dictionary as well. Anyone may run their own copy, and at one learner it costs the price of a domain name.")}
        </P>
      </S>

      <S title={t("What it runs on")}>
        <P>
          {rich(t("{count} things, and every one of them has a price on it. The list is longer than the one on {privacy}, because that page answers a narrower question: a service can hold every row in the database without ever being told who a learner is."), {
            count: String(SERVICES.length),
            privacy: privacyLink("the privacy page"),
          })}
        </P>
        <P>
          {rich(t("**Nothing anybody bills us for is counted as free.** Every vendor here is on the plan a real deployment is on, because a free tier either pauses when nobody’s using it or forbids commercial use, and pricing one would describe a deployment nobody actually runs."))}
        </P>
        <P>
          {rich(t("**What is given is credited, not priced.** Ekilex, Wiktionary and TartuNLP are public institutions that decided this work should be available. They ask for nothing, and that is a good arrangement rather than a gap in the accounts, so they are named here with what each one gives and the license it comes under, and they appear in no total. Where buying the same thing is possible the panel says what that would come to, because the size of the gift is worth seeing. The last line of each card is the one worth reading: every entry is a state the app already handles rather than a disaster."))}
        </P>
        <ul className="space-y-3">
          {SERVICES.map((service) => (
            <li
              key={service.id}
              className="rounded-[var(--r-lg)] border p-4"
              style={{ background: "var(--surface)", borderColor: "var(--rule)" }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  {t(service.name)}
                </span>
                <span
                  className="label-xs"
                  style={{ color: switchedOn(service.setBy) ? "var(--sky-ink)" : "var(--ink-3)" }}
                >
                  {switchedOn(service.setBy) ? t("on here") : t("not set here")}
                </span>
              </div>
              <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>{t(service.who)}</p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {t(service.does)}
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
                {fill(t("Without it: {gone}"), { gone: t(service.whenItIsGone) })}
              </p>
            </li>
          ))}
        </ul>
        <P>
          {rich(t("**On this installation.** Sign-in is {signIn}. Live dictionary lookups are {lookups}, and speech is cached {speech}. {anu}"), {
            signIn: supabaseConfigured()
              ? t("on, so every learner has a deck of their own")
              : t("off, so this copy is one local learner"),
            lookups: ekilexConfigured() ? tr(locale, "on", "switch") : t("off, so the built-in dictionary answers by itself"),
            speech: audioCacheIsDurable() ? t("in shared storage") : t("on the server’s own disk"),
            anu: chain.length === 0
              ? t("No model key is set, so Anu is not here at all and nothing on this page bills for her.")
              : fill(
                freeChain
                  ? t("Anu is answered by {models}, on models that are given away at the tier this uses, which the panel below still prices as though they were bought.")
                  : t("Anu is answered by {models}, on at least one model that charges."),
                {
                  models: modelLabels.length > 1
                    ? `${modelLabels.slice(0, -1).join(", ")} ${t("and")} ${modelLabels[modelLabels.length - 1]}`
                    : modelLabels[0] ?? "",
                },
              ),
          })}
        </P>
      </S>

      <S title={t("What it comes to")}>
        <P>
          {t("Move the slider. Nothing here is stored or sent anywhere. The sums run in your browser, using the same code the app itself uses to decide when to stop spending.")}
        </P>
        <LocaleProvider locale={locale}>
          <CostExplorer />
        </LocaleProvider>
      </S>

      <S title={t("What was measured, and how")}>
        <P>
          {fill(t("Taken on {day}, against Postgres 16 on one machine and a production build served locally. Each row says what to run to get the same number, because a figure nobody can reproduce is a claim rather than a measurement."), {
            day: dayOf(MEASURED_ON),
          })}
        </P>
        {/* Focusable, because a region that scrolls sideways on a phone has to be
            reachable by a keyboard as well as a finger. */}
        <div className="scroll-host overflow-x-auto" tabIndex={0} role="region" aria-label={t("Measurements taken on this repository")}>
          <table className="w-full text-sm">
            <caption className="sr-only">{t("Measurements taken on this repository")}</caption>
            <thead>
              <tr style={{ color: "var(--ink-3)" }}>
                <th scope="col" className="label-xs py-1 text-left">{t("What")}</th>
                <th scope="col" className="label-xs py-1 text-left">{t("How much")}</th>
              </tr>
            </thead>
            <tbody>
              {MEASURED.map((m) => (
                <tr key={m.what} className="border-t align-top" style={{ borderColor: "var(--rule)" }}>
                  <td className="py-2 pr-3" style={{ color: "var(--ink-2)" }}>
                    {t(m.what)}
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--ink-3)" }}>{t(m.how)}</span>
                  </td>
                  <td className="py-2" style={{ color: "var(--ink)" }}>{t(m.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          {t("Two of those are worth stopping on. A review row is 300 bytes, so a learner costs about 1.3 MB a year and the whole review log of a thousand people for a year fits in less space than a phone photograph album. And a spoken clip is uncompressed audio, 43 KB for every second of it once trimmed and stored as 16-bit, which still makes speech the largest thing this app moves by a wide margin. Turning the audio off in the panel above is the single biggest saving available, and it is also the feature hardest to argue for losing.")}
        </P>
      </S>

      <S title={t("Where the prices came from")}>
        <P>
          {fill(t("Read on {day}. These are the numbers most likely to be out of date by the time you read this, which is why they carry a date rather than being folded into the total."), {
            day: dayOf(PRICES_CHECKED),
          })}
        </P>
        <ul className="space-y-1.5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>
            <Priced href={VERCEL.ref.source} label="Vercel" />
            {": "}
            {fill(t("${base} a month, then ${rate} a gigabyte out past the first {gb}."), {
              base: num(VERCEL.pro.baseUsd),
              rate: num(VERCEL.overage.perTransferGb),
              gb: VERCEL.pro.included.transferGb?.toLocaleString(locale === "en" ? "en-GB" : locale) ?? "",
            })}
          </li>
          <li>
            <Priced href={SUPABASE.ref.source} label="Supabase" />
            {": "}
            {fill(t("${base} a month with {db} GB of database, {files} GB of files and ${credit} of compute credit."), {
              base: num(SUPABASE.pro.baseUsd),
              db: num(SUPABASE.pro.included.dbGb),
              files: num(SUPABASE.pro.included.storageGb),
              credit: num(SUPABASE.computeCreditUsd),
            })}
          </li>
          <li>
            <Priced href={COMPUTE.ref.source} label={t("Database instances")} />
            {": "}
            {fill(t("from ${low} a month to ${high}. This is the steepest ladder on the page."), {
              low: num(COMPUTE.sizes[0]!.usd),
              high: COMPUTE.sizes[COMPUTE.sizes.length - 1]!.usd.toLocaleString(locale === "en" ? "en-GB" : locale),
            })}
          </li>
          <li>
            <Priced href={SPEECH_MARKET.ref.source} label={t("Speech")} />
            {": "}
            {fill(t("${rate} a million characters, which is what {who} charge. TartuNLP charge nothing. That rate is here only to show the size of what they give, and it is in no total on this page."), {
              rate: num(SPEECH_MARKET.usdPerMillionCharacters),
              who: t(SPEECH_MARKET.equivalentOf),
            })}
          </li>
          <li>
            <Priced href={EMAIL.ref.source} label="Resend" />
            {": "}
            {fill(t("${base} a month for {emails} emails, then ${rate} a thousand."), {
              base: num(EMAIL.pro.baseUsd),
              emails: EMAIL.pro.included.emails?.toLocaleString(locale === "en" ? "en-GB" : locale) ?? "",
              rate: num(EMAIL.overage.perThousandEmails),
            })}
          </li>
          <li>
            <Priced href={ERRORS.ref.source} label={t("Error reporting")} />
            {": "}
            {fill(t("${base} a month for {events} events."), {
              base: num(ERRORS.team.baseUsd),
              events: ERRORS.team.included.events?.toLocaleString(locale === "en" ? "en-GB" : locale) ?? "",
            })}
          </li>
          <li>
            <Priced href={DEVTOOLS.ref.source} label={DEVTOOLS.plan} />
            {": "}
            {fill(t("{eur} euros a month. The tooling that writes and maintains this, which is the one line here that is not runtime and the one that does not grow."), {
              eur: num(DEVTOOLS.eurPerMonth),
            })}
          </li>
          <li>
            <Priced href={FX.ref.source} label={t("The euro")} />
            {": "}
            {fill(t("{usd} dollars, the European Central Bank’s reference rate. Two lines here are billed in euros and the rest in dollars, and every price is net of VAT, which is how each vendor quotes its own."), {
              usd: num(FX.usdPerEur),
            })}
          </li>
          <li>
            <Priced href={DOMAIN.ref.source} label={t("A .ee domain")} />
            {": "}
            {fill(t("about {eur} euros a year."), { eur: DOMAIN.eurPerYear })}
          </li>
        </ul>
        <P>
          {t("Ekilex, Wiktionary and TartuNLP are not on that list, because they do not charge and this page does not pretend otherwise. They are credited above instead, with what each one gives and the license it comes under. Where buying the same thing is possible the panel says what that would come to, so the size of the gift is visible, and that figure is in no total here.")}
        </P>
      </S>

      <S title={t("What that number leaves out")}>
        <P>
          {rich(t("**Somebody’s time**, which is the largest real cost of this project by a long way and is not a hosting bill. The panel above prices machines. It does not price writing the course, checking 5,363 English glosses against their sources, or reading the queue of corrections learners send in."))}
        </P>
        <P>
          {rich(t("**Answering people.** A dead end in this app offers to send a report, and somebody has to work through them for that to mean anything."))}
        </P>
        <P>
          {rich(t("**A bad month.** The projection is a steady month. It does not model the week something is on the radio, and a plan’s included allowance is exactly where a spike is felt first."))}
        </P>
      </S>

      <S title={t("What money would change")}>
        <P>
          {t("Four things, in the order they would matter.")}
        </P>
        <P>
          {rich(t("**The daily cap on the tutor could go up.** Every model call in the app is booked against a shared budget of ${cap} a day, which cannot be turned off and is what stops the one line that could run away. Raising it is a knob with a stop on it rather than an open check, and at ten thousand learners it is already the thing holding that line down."), {
            cap: (DEFAULT_LIMITS.dailyMicrosGlobal / 1e6).toFixed(0),
          })}
        </P>
        <P>
          {rich(t("**A school could keep its history.** Everything on the progress screens is worked out from the review log on each request rather than stored, so the log is never thrown away and the database only grows. That is the right design and it is what makes the instance ladder the steepest line on this page."))}
        </P>
        <P>
          {rich(t("**The corrections could be worked.** The dictionary is built from Ekilex and Wiktionary rather than typed, which keeps invented Estonian out of it and does not make every entry right. Learners already report the wrong ones."))}
        </P>
        <P>
          {rich(t("**Something could go back to the institutions this is built on.** Ekilex, Wiktionary and TartuNLP ask for nothing and there is no suggestion they should start. But this app would not exist without any of the three, and at a size worth funding the decent thing is to support the work rather than only to use it: a contribution, a corrected entry sent back, or paying for the compute somebody else is currently absorbing."))}
        </P>
      </S>

      <S title={t("What happens when the money stops")}>
        <P>
          {t("The question a grant is scored on, and the one a cost page usually leaves out. The figures below are the same bill as above with things switched off, in the order somebody would actually switch them off. The tooling that writes the software goes first, because a reader opening the app tomorrow does not notice it. The server and the database go last, because without those there is nothing.")}
        </P>
        {ladder.map((step) => (
          <P key={step.stage.id}>
            <strong>{fill(t("{stage}, ${usd} a month."), { stage: tr(locale, step.stage.name, "stage"), usd: step.usd.toFixed(0) })}</strong>{" "}
            {t(step.stage.why)}
            {step.lost.length > 0 ? (
              <>
                {" "}{fill(t("What goes: {lost}"), { lost: step.lost.map((l) => `${t(l.name)}. ${t(l.cost)}`).join(" ") })}
              </>
            ) : null}
          </P>
        ))}
        <P>
          {t("The fall is gradual because most of what this app is made of was never bought. The dictionary is Ekilex, the speech is TartuNLP, the English is Wiktionary, and all three are public institutions that decided this work should be available. The scheduler, the course, the exams, the games and the grammar run on a server and a database and nothing else. What money buys is the tutor, the polish, and somebody to work on it.")}
        </P>
        <P>
          {fill(t("So the honest claim is not that this becomes profitable. It is that at ${floor} a month it can be kept alive by one person who has not been paid, and that it keeps teaching Estonian the whole way down."), {
            floor: floor.toFixed(0),
          })}
        </P>
      </S>

      <S title={t("What survives even that")}>
        <P>
          {t("Six things, and every one of them is a file somebody can open rather than an intention somebody has stated.")}
        </P>
        {CONTINUITY.map((item) => (
          <P key={item.id}>
            {t(item.claim)}{" "}
            <span style={{ color: "var(--ink-3)" }}>({item.checkableAt})</span>
          </P>
        ))}
        <P>
          {t("Which is the answer to the question under the question. A funder is not really asking whether the lights stay on. They are asking whether the money buys something that outlives the project. For a language this size, the thing worth buying is a corrected dictionary, a course built out of attested sources, and the code to run both, all published under a licence that lets somebody else pick it up.")}
        </P>
      </S>

      <S title={t("What it will not be spent on")}>
        <P>
          {rich(t("There is no advertising, no analytics script and no third-party tracker on any page of this app, which the {privacy} states and the code keeps true: an analytics package was mounted here once, on every visitor of the hosted build, while that same notice said there was none. It was removed rather than the notice being edited."), {
            privacy: privacyLink("privacy page"),
          })}
        </P>
        <P>
          {t("Nothing about a learner is sold, shared or used to train anything. Whether a teacher can see a pupil is answered narrowly and separately, and the answer is effort rather than contents. Every one of those promises costs money to keep rather than saving it, which is most of why this page exists.")}
        </P>
      </S>
    </Legal>
  );
}

/** A vendor's name, linked to the page its price was read off. */
function Priced({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">{label}</a>
  );
}
