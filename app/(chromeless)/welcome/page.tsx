import { PARTS } from "@/lib/copy/values";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import type { Metadata } from "next";
import {
  ArrowRight, BookOpen, Briefcase, Check, CircleHelp, ClipboardCheck, Heart, House, Minus,
  Plus, Sparkles, Target, X,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { LEVELS, PATH } from "@/lib/collections/syllabus";
import { DEMO_LEMMAS, DEMO_STEMS, type DemoStems } from "@/lib/collections/demoWords";
import { SEED_SET_SIZE } from "@/lib/collections/seedSize";
import {
  buildCaseTable, followsEndingRule, shownForms, stemsFrom, type DerivedForm,
} from "@/lib/estonian/derive";
import type { CaseSubject } from "@/lib/estonian/caseQuestion";
import { caseByKey, questionInEnglish } from "@/lib/estonian/cases";
import { caseQuestionFor } from "@/lib/estonian/caseQuestion";
import { toWalkWord } from "@/lib/estonian/caseBuild";
import { ButtonLink } from "@/components/Button";
import { Wordmark } from "@/components/brand";
import { BrandLink } from "@/components/BrandLink";
import { MascotWatch } from "@/components/MascotWatch";
import { CaseExplorer, TutorPeek, type DemoCase, type DemoWord } from "./LandingDemo";
import { HeroWord, PlanCalculator } from "./LandingMotion";
import { CafeScene } from "./CafeScene";
import { FirstEvening, type EveningStep, type EveningWord } from "./FirstEvening";
import { VisitRecap } from "./VisitRecap";
import { DEFAULT_PROGRAMME, PROGRAMMES } from "@/lib/course";
import { unitById } from "@/lib/collections/syllabus";
import { LetterTile } from "@/components/LetterTile";
import { LandingAnu, type AnuLine } from "@/components/LandingAnu";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { Explain } from "@/components/Explain";
import { SOURCE_CREDITS } from "@/lib/legal/credits";
import { SpelledCount, spelledCount } from "@/lib/copy/values";
import { Languages } from "lucide-react";
import { LocaleProvider } from "@/components/Locale";
import { rich } from "@/components/Rich";
import { MACHINE_SHORT, countOf, languagesBeside, fill, tr, type Locale } from "@/lib/copy/locale";
import { LANDING_HREF, langParam, localeHref } from "@/lib/copy/publicLocale";
import { ENTRY_COPY, ENTRY_LOCALES, MACHINE_TRANSLATED_EN } from "@/lib/copy/entryLocales";
import { questionReading } from "@/lib/estonian/cases";
import { stepText } from "@/lib/course/stepText";

export const metadata: Metadata = {
  title: { absolute: "kodukeel. Estonian that finally sticks" },
  description:
    "Kodukeel means home language. Fifteen minutes of Estonian an evening, a safe place to practice the conversations you're dreading, and a gentle push to go and have them for real. Free, for anyone making a home in Estonia.",
  alternates: { languages: { en: "/welcome", ...Object.fromEntries(ENTRY_LOCALES.map((l) => [l, ENTRY_COPY[l].href])) } },
};

/** The landing page is public and read-only, so it can be cached hard. */
export const revalidate = 3600;

/**
 * THE SAME PAGE IN THREE LANGUAGES, AND THE ADDRESS IS WHAT SAYS WHICH.
 *
 * `/welcome` is English, and `/welcome/ru` and `/welcome/uk` render this
 * component with their language in `params`, so the three stay one page
 * rather than a short translated copy drifting beside a long original. No
 * search parameter is read, which is what keeps every one of them static.
 * Every line goes through `t`, the area is `lib/copy/i18n/areas/landing.ts`,
 * and the Estonian on it is the dictionary's whatever the page is read in.
 */
interface Say {
  readonly locale: Locale;
  readonly t: (english: string, context?: string) => string;
  /** A link onto another public page, in the language this one is read in. */
  readonly href: (path: string) => string;
  /** A count in prose: spelled out in English, a figure in Russian and Ukrainian. */
  readonly count: (n: number) => string;
  /** A large number with the reader's own grouping. */
  readonly big: (n: number) => string;
  /** "6,153 words", in the reader's own plural and grouping. */
  readonly counted: (n: number, noun: string) => string;
}

function sayIn(locale: Locale): Say {
  return {
    locale,
    t: (english, context) => tr(locale, english, context),
    href: (path) => localeHref(path, locale),
    count: (n) => (locale === "en" ? spelledCount(n) : String(n)),
    big: (n) => n.toLocaleString(locale === "en" ? "en-GB" : locale),
    counted: (n, noun) => countOf(locale, n, noun).replace(String(n), n.toLocaleString(locale === "en" ? "en-GB" : locale)),
  };
}

export default async function WelcomePage({ params }: { params?: Promise<{ lang?: string }> }) {
  const locale = langParam((await params)?.lang) ?? "en";
  const say = sayIn(locale);
  const copy = locale === "en" ? null : ENTRY_COPY[locale];
  const { words: loaded, stats } = await loadDemo();
  // What each form means, in the reader's language: the question it answers,
  // because the short English readings ("into the book") are built from an
  // English gloss and have no Russian or Ukrainian of their own.
  const words = locale === "en" ? loaded : loaded.map((w) => ({
    ...w,
    principal: w.principal.map((p) => ({ ...p, english: questionReading(p.label.split(", ")[1], locale) ?? p.english })),
    cases: w.cases.map((demo) => ({ ...demo, english: questionReading(demo.question, locale) ?? demo.english })),
  }));

  return (
    <LocaleProvider locale={locale}>
    <div lang={locale} className="landing relative overflow-x-hidden" style={{ background: "var(--ground)" }}>
      {/*
        One faint light at the top of the page, in the accent's own tint. It
        was three drifting pastel blobs, which banded into rings on a warm
        ground and read as generated.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px]"
        style={{ background: "radial-gradient(60% 70% at 50% 0%, var(--wash-1), transparent 70%)" }}
      />

      <Nav say={say} />
      {/*
        A translation nobody fluent has read says so, first, in its own
        language and in English, and what language the app itself opens in.
      */}
      {copy && !copy.reviewed && (
        <aside
          aria-label={say.t("About this translation")}
          className="relative mx-auto mt-4 flex max-w-3xl items-start gap-2 rounded-[var(--r)] px-4 py-3 text-sm"
          style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}
        >
          <Languages size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            {copy.notice} <span lang="en">{MACHINE_TRANSLATED_EN}</span> {copy.appLanguage} {MACHINE_SHORT[copy.lang]}
          </span>
        </aside>
      )}

      {/*
        Ten sections became eight, and eight became five.

        The page was answering every question a visitor could have, in the order
        somebody thought of them. The first cut took out a four-tile source
        credit and a four-figure stat panel, and left a page that still had to be
        scrolled four times before it stopped introducing itself. Nothing in it
        was wrong; there was simply more of it than anybody deciding whether to
        try an app will read.

        Two sections went, and neither lost its argument. "You didn't fail
        Estonian. Your tools did." was three cards making three complaints, and
        each complaint was answered somewhere further down by the thing that
        answers it: the case demo, the scheduler card, the line about a model
        never supplying a form. So each one now sits next to its answer instead
        of a screen and a half above it. "How a day goes" was three steps that
        the feature grid and the closing sentence already described, in the same
        words, twice.

        What is left is the five beats somebody actually needs: what this is,
        why the cases are the hard part, what you get, what the catch is, and
        where to start. The comparison is one of the questions now rather than a
        section of its own, which is where the person asking it looks.
      */}
      <main className="landing-flow relative">
        <Hero say={say} stats={stats} words={words} />
        <WhoFor say={say} />
        <Cases say={say} words={words} />
        <Evening say={say} />
        <Talk say={say} />
        <Features say={say} />
        <Compare say={say} />
        <Plan say={say} />
        <Questions say={say} />
        <FinalCta say={say} />
      </main>

      <Footer say={say} />
      <LandingAnu lines={anuLines(say)} />
    </div>
    </LocaleProvider>
  );
}

/**
 * What Anu says at each stop down the page, in the order the page goes.
 *
 * One line a section and none of them a pitch: she says what to do here, or
 * what she is for, in the voice she has inside. English only, for the reason
 * every other authored line on this page is English (ADR-005); the Estonian
 * on this page all came out of the dictionary.
 */
const anuLines = ({ t }: Say): readonly AnuLine[] => [
  { at: "top", mood: "happy", text: t("Hi, I’m Anu, the tutor. Mind if I walk down the page with you?") },
  { at: "who", mood: "happy", text: t("Whichever one you are, you start the same way: fifteen minutes today.") },
  { at: "cases", mood: "thinking", text: t("Press an ending and watch it snap on. That’s the whole trick, honestly.") },
  { at: "evening", mood: "happy", text: t("This really is how your first evening starts. Five new words, and then they come back to check on you.") },
  { at: "talk", mood: "cheer", text: t("Go on, order something. The person behind the counter is very patient.") },
  { at: "features", mood: "happy", text: t("Ask me the thing you’d be too shy to ask in class. I never sigh.") },
  { at: "compare", mood: "thinking", text: t("Keep your class. I’m here for the evenings in between.") },
  { at: "plan", mood: "happy", text: t("Play around with it. Inside, I do the same math with your real pace.") },
  { at: "faq", mood: "thinking", text: t("Short, straight answers. How we compare with other apps is the last one.") },
  { at: "start", mood: "cheer", text: t("Fifteen minutes a day. See you inside.") },
];

/**
 * Fades a block in as it scrolls into view. CSS scroll timelines, so it costs
 * no JavaScript and degrades to "already visible" where they aren't supported.
 *
 * It renders a `div` and nothing else, which is a constraint on where it may go
 * rather than a detail. It once wrapped the `<li>`s of an ordered list, and a
 * `div` between an `ol` and its `li` means the list is not a list: a screen
 * reader announces an empty list and three stray items. If a list ever needs
 * this again, the wrapper has to render the list item itself.
 */
function Reveal({ children }: { children: React.ReactNode }) {
  return <div className="reveal">{children}</div>;
}

/* ─────────────────────────────────────────────────────────── nav ── */

function Nav({ say }: { say: Say }) {
  const { t, locale } = say;
  const signIn = locale === "en" ? "/sign-in" : `/sign-in?lang=${locale}`;
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border px-4 py-2.5 md:px-5"
        style={{
          borderColor: "var(--edge)",
          background: "color-mix(in oklab, var(--surface) 82%, transparent)",
          backdropFilter: "blur(16px)",
          boxShadow: "var(--depth-sm)",
        }}
      >
        {/*
          44px tall, which is what a thumb is owed and what the 30px wordmark
          alone did not give it: the floor in app/globals.css reaches a link
          that is a lone icon, and this one is an icon and a word. The row is
          already 45px for the button beside it, so the nav does not grow.
        */}
        <BrandLink href={LANDING_HREF[locale]} label={t("Kodukeel, home")} className="flex min-h-11 items-center">
          <Wordmark size={30} />
        </BrandLink>
        {/*
          THE LINKS ARRIVE AT 1024, NOT 768, AND THE TYPE SCALE IS WHY.

          This row is already progressively disclosed: below the breakpoint the
          three anchors are simply not drawn, because the pill has the wordmark
          and two controls in it and there is no room. Raising the scale's
          floor moved where "no room" falls. At 768 the three labels, the
          wordmark and the two controls came to more than the 696px inside the
          pill, and flex answered the only way it can, by breaking "What you
          get" over two lines and the button under it over two more: a 90px
          pill with a nav folded in half inside it.

          A label that wraps is not a nav that has adapted, so the answer is
          the breakpoint rather than a smaller label or a tighter gap. Nothing
          is lost at 768: these are anchors onto sections of the page under
          them, which is the one kind of link a reader reaches by scrolling.
          `whitespace-nowrap` is the backstop, so the next thing that runs this
          row out of room overflows somewhere `test-containment.mjs` can see it
          rather than quietly folding again.
        */}
        <div className="hidden items-center gap-7 whitespace-nowrap text-sm font-medium lg:flex" style={{ color: "var(--ink-2)" }}>
          <a href="#who" className="transition-opacity hover:opacity-60">{t("Who it’s for")}</a>
          <a href="#cases" className="transition-opacity hover:opacity-60">{t("The cases")}</a>
          <a href="#plan" className="transition-opacity hover:opacity-60">{t("Your plan")}</a>
        </div>
        <div className="flex items-center gap-2">
          {/*
            The other languages, by their codes from `sm` up and by their own
            names from `xl`: both on the English page, English alone on the
            Russian and the Ukrainian (`languagesBeside`), which never name each
            other. Below `sm` the pill has room for the wordmark and the button
            alone, so a phone finds them in the footer. Real links, each marked
            with its own language.
          */}
          <span className="hidden items-center text-sm font-semibold sm:flex">
            {languagesBeside(locale).filter((l) => l !== locale).map((l) => (
              <Link
                key={l}
                href={LANDING_HREF[l]}
                lang={l}
                hrefLang={l}
                aria-label={l === "en" ? "English" : ENTRY_COPY[l].name}
                className="tap-tint whitespace-nowrap rounded-full px-2.5 py-2"
                style={{ color: "var(--ink-2)" }}
              >
                <span className="hidden xl:inline">{l === "en" ? "English" : ENTRY_COPY[l].name}</span>
                <span aria-hidden className="xl:hidden">{l.toUpperCase()}</span>
              </Link>
            ))}
          </span>
          <Link
            href={signIn}
            className="hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-60 sm:block"
            style={{ color: "var(--ink-2)" }}
          >
            {t("Sign in")}
          </Link>
          {/* Under 360 the pill holds the wordmark and "Start" and no more:
              "Start free" with its arrow came to 290px in a 256px pill and
              broke "Start" in half, and "Start" with the arrow still did at 94px.
              Two whole labels rather than one with a word hidden, so each is a
              single run of text wherever it shows, and no arrow down there. */}
          {/* Russian and Ukrainian say "Start free" in about half as many
              letters again, so their short label takes over below 420. */}
          <ButtonLink href={signIn} variant="primary" className="group">
            <span className={locale === "en" ? "max-[359px]:hidden" : "max-[419px]:hidden"}>{t("Start free")}</span>
            <span className={locale === "en" ? "hidden max-[359px]:inline" : "hidden max-[419px]:inline"}>{t("Start", "begin")}</span>
            <ArrowRight
              size={15}
              aria-hidden
              className={`transition-transform group-hover:translate-x-0.5 ${locale === "en" ? "max-[359px]:hidden" : "max-[419px]:hidden"}`}
            />
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}

/* ────────────────────────────────────────────────────────── hero ── */

/**
 * The hero, with nothing beside it.
 *
 * It carried a live flashcard: a real card, flipped and graded, with the real
 * scheduling intervals under it, so a visitor had done a review before signing
 * up for anything. It was the best thing on the page and it is gone anyway.
 * It cost 413px of a phone, the page was still six screens after everything
 * else had been cut, and it is the second demonstration rather than the first.
 * The case explorer one section down is what this app is actually for. A page
 * that shows two things shows neither, and of the two, spaced repetition is
 * the part a stranger already understands.
 *
 * THE FOUR LETTERS WENT WITH IT, and that is the card's doing rather than a
 * verdict on them. They were tucked over the card's four sides, one to a side,
 * and the argument for that arrangement is the argument against keeping them:
 * a letter with clear air around it reads as a square that missed rather than
 * as one that was put there. With no card there is no edge, and the two other
 * cards big enough to hang them on are a table of Estonian forms and the
 * closing panel, neither of which is the hero. What carries this language's
 * character on the page now is the explorer, which is full of the real thing.
 * Their four checks in `scripts/test-design.mjs` went too, and the suite's
 * floor came down by exactly four.
 *
 * So one centered column, which is the shape a hero takes when it has no second
 * half: the eye goes down the middle to the button rather than across to a card
 * and back.
 */
function Hero({ say, stats, words }: { say: Say; stats: { words: number; forms: number }; words: DemoWord[] }) {
  const { t, locale, counted } = say;
  const signIn = locale === "en" ? "/sign-in" : `/sign-in?lang=${locale}`;
  /*
    The four figures that were a panel of their own, as one line of evidence
    under the button. A stat panel three screens down is a claim nobody has a
    reason to read; the same numbers beside the call to action are the reason to
    believe the sentence above them. The unit count and the level range are read
    from the course itself rather than written by hand, which is what kept this
    line from going stale the way "eighteen units, A1 to C1" once did.
  */
  const claims = [
    /*
      "Every form from Ekilex" was one source too few, and the half it left out
      is the half a stranger meets first: the built-in set is hand-typed
      principal parts checked against a reference, the course vocabulary is
      Ekilex's, and the English on all of it is Wiktionary's. What every one of
      them has in common is the thing worth claiming, which is that a person or
      a dictionary put each form there and no model did. The FAQ names the three
      sources one screen down; this line is the promise they add up to.
    */
    fill(t("{words}, {forms}, and not one of them made up by AI"), { words: counted(stats.words, "word"), forms: counted(stats.forms, "form") }),
    fill(t("{units}, from your first hello at {first} all the way to {last}"), {
      units: counted(PATH.length, "unit"), first: LEVELS[0]!, last: LEVELS[LEVELS.length - 1]!,
    }),
    t("Free, and it works offline"),
    t("Counts the real conversations you have, not the days you open the app"),
  ];
  /*
    As tall as what is in it, and one section gap from the next beat. The
    height rule this used to carry, the window less the nav less a peek, is
    gone with the 230px of nothing it left under the claims; `.landing-flow`
    in `app/globals.css` has the argument. The top padding is the only thing
    between the nav pill and the headline, and it grows with the window the
    way the three gaps inside the column do.
  */
  return (
    <section id="top" className="hero-open hero-stage">
      {/*
        THE HERO IS A STAGE NOW, NOT A COLUMN.

        A centred headline over a centred paragraph over a centred button is
        the shape every generated landing page takes, and it was reported as
        exactly that. So the opening is a full-bleed night-violet band that the
        rest of the page scrolls out of, the headline is set left and huge in
        the condensed display cut, the one word the page is about is a sticker
        slapped on at an angle, and the right half is the thing itself: a real
        word turning through its cases, read out of the dictionary.
      */}
      <div className="hero-grid mx-auto w-full max-w-6xl px-5 md:px-8">
        <div className="hero-copy">
          <p className="hero-kicker fade-up">
            <span className="hero-kicker-dot" aria-hidden />
            {t("Estonian for the life you live here")}
          </p>
          {/*
            In Russian and Ukrainian the headline is one phrase rather than
            four English words: the last word still wears the sticker, and the
            stagger runs over whatever words the phrase has.
          */}
          <h1 className={locale === "en" ? "hero-display" : "hero-display hero-display-long"}>
            {locale === "en" ? (
              <>
                <span className="word-in" style={{ "--w": "60ms" } as React.CSSProperties}>Estonian</span>{" "}
                <span className="word-in" style={{ "--w": "160ms" } as React.CSSProperties}>that</span>{" "}
                <span className="word-in" style={{ "--w": "220ms" } as React.CSSProperties}>finally</span>{" "}
                <span className="word-in hero-sticker" style={{ "--w": "380ms" } as React.CSSProperties}>sticks</span>
              </>
            ) : (
              t("Estonian that finally sticks").split(" ").map((word, n, all) => (
                <span key={n}>
                  {n > 0 ? " " : null}
                  <span
                    className={n === all.length - 1 ? "word-in hero-sticker" : "word-in"}
                    style={{ "--w": `${60 + n * 100}ms` } as React.CSSProperties}
                  >
                    {word}
                  </span>
                </span>
              ))
            )}
          </h1>
          <p className="fade-up hero-lead hero-sub max-w-[44ch] leading-relaxed" style={{ animationDelay: "420ms" }}>
            {t("The neighbor says hello. A coworker asks you something. Even the dog seems to expect Estonian. You need the right words when someone’s actually looking at you, and Kodukeel gets you there, fifteen minutes at a time.")}
          </p>
          <div className="fade-up hero-action flex flex-wrap items-center gap-x-5 gap-y-3" style={{ animationDelay: "520ms" }}>
            <ButtonLink href={signIn} variant="primary" size="lg" hop="hover" className="hero-cta group w-full sm:w-auto">
              {t("Start learning for free")}{" "}
              <ArrowRight size={17} aria-hidden className="transition-transform group-hover:translate-x-1" />
            </ButtonLink>
          </div>
          <ul className="fade-up hero-claims" style={{ animationDelay: "640ms" }}>
            {claims.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check size={16} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--stage-tick)" }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hero-machine fade-up" style={{ animationDelay: "300ms" }}>
          <HeroWord words={words.filter((w) => w.cases.some((c) => !c.principal && c.singular))} />
        </div>
      </div>
    </section>
  );
}


/* ─────────────────────────────────────────────────────── who for ── */

/**
 * Who this is for, in the words a stranger would use about themselves.
 *
 * The page said what the app does and left the reader to decide whether
 * that was them. Four situations cover nearly everybody who learns Estonian
 * as an adult, and they are the reasons first run asks for, so picking the
 * card that is you here is picking the plan you will be shown inside.
 */
const whoCards = ({ t, href }: Say) => [
  {
    icon: House,
    tone: "accent",
    title: t("You live here now"),
    body: t("The pharmacist, the parents at the school gate, the letter from the city. Learn the Estonian you'll actually bump into this week."),
  },
  {
    icon: Heart,
    tone: "blush",
    title: t("You love someone who speaks it"),
    body: t("Their mom on the phone, their friends' jokes, the toast at the birthday party. Get the words ready before Sunday lunch, not halfway through it."),
  },
  {
    icon: ClipboardCheck,
    tone: "butter",
    title: t("You have an exam to pass"),
    body: t("Full mock papers from A2 to C1, marked by clear rules you can check, not an AI's hunch. Walk in on the day knowing exactly what's coming."),
    href: href("/state-exam"),
    link: t("How the real exam works"),
  },
  {
    icon: Briefcase,
    tone: "sky",
    title: t("You work in Estonian"),
    body: t("Meetings, emails, a chat by the coffee machine. Get to know the words you'll hear at work every day, and try the tricky conversations here first, where getting it wrong costs nothing."),
  },
] as const;

function WhoFor({ say }: { say: Say }) {
  const { t } = say;
  const WHO = whoCards(say);
  return (
    <section id="who" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 md:px-8">
      <Reveal>
        <div className="section-head">
          <p className="section-tag" data-tone="blush">{t("Who it’s for")}</p>
          <h2 className="landing-title">
            {t("Whatever brought you to Estonian")}
          </h2>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:mt-12">
        {WHO.map((who) => {
          const Icon = who.icon;
          return (
            <Reveal key={who.title}>
              <article
                className="who-card lift flex h-full flex-col rounded-[var(--r-xl)] border p-6"
                style={{ background: `var(--${who.tone}-soft)` }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-[var(--r)] border"
                  style={{
                    background: `var(--${who.tone})`,
                    borderColor: "var(--edge)",
                    color: who.tone === "accent" ? "var(--accent-ink)" : "var(--on-hue)",
                  }}
                >
                  <Icon size={22} strokeWidth={2.25} aria-hidden />
                </span>
                <h3 className="font-display mt-5 text-xl font-bold leading-tight" style={{ color: "var(--ink)" }}>{who.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{who.body}</p>
                {"href" in who && (
                  <Link
                    href={who.href}
                    className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold underline-offset-4 hover:underline"
                    style={{ color: "var(--accent-deep)" }}
                  >
                    {who.link} <ArrowRight size={14} aria-hidden />
                  </Link>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────── compare ── */

/**
 * The comparison a stranger is actually making, which is between kinds of
 * thing rather than between brands.
 *
 * Nobody arrives here choosing between four named apps. They arrive having
 * tried a streak app, sitting in a class, or asking a chatbot, and the
 * question is what this adds to the one they have. So the columns are those
 * three, each credited with what it is good at before saying where it stops,
 * and the claims are about what each kind of tool is built to do. The
 * tool-by-tool table, checked against each product's own pages, stays in the
 * questions below for the reader who wants names.
 */
const kinds = ({ t }: Say) => [
  { name: t("A streak app"), good: t("A daily habit and your first few hundred words."), stops: t("The fourteen cases, which is exactly where Estonian gets hard.") },
  { name: t("A class or a textbook"), good: t("A teacher, a syllabus and people to talk to."), stops: t("Bringing each word back the day before you'd forget it.") },
  { name: t("An AI chatbot"), good: t("An answer at eleven at night, about anything."), stops: t("Getting the forms right. It writes Estonian that looks perfect and isn't.") },
] as const;

function Compare({ say }: { say: Say }) {
  const { t } = say;
  const KINDS = kinds(say);
  return (
    <section id="compare" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 md:px-8">
      <Reveal>
        <div className="section-head">
          <p className="section-tag" data-tone="sky">{t("How it compares")}</p>
          <h2 className="landing-title">
            {t("Keep what you already use. The fourteen cases are the bit it’s missing.")}
          </h2>
        </div>
      </Reveal>
      <Reveal>
        <div className="compare-grid mt-10 grid gap-4 md:mt-12 lg:grid-cols-4">
          {KINDS.map((kind) => (
            <div key={kind.name} className="rounded-[var(--r-xl)] border p-6" style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth)" }}>
              <h3 className="text-md font-semibold" style={{ color: "var(--ink)" }}>{kind.name}</h3>
              <p className="mt-4 flex gap-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                <Check size={16} aria-label={t("Good at")} className="mt-0.5 shrink-0" style={{ color: "var(--sky-ink)" }} />
                <span>{kind.good}</span>
              </p>
              <p className="mt-3 flex gap-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                <Minus size={16} aria-label={t("Stops at")} className="mt-0.5 shrink-0" style={{ color: "var(--ink-3)" }} />
                <span>{kind.stops}</span>
              </p>
            </div>
          ))}
          <div className="compare-ours night rounded-[var(--r-xl)] border p-6">
            <h3 className="font-display text-xl font-bold" style={{ color: "var(--cta)" }}>kodukeel</h3>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
              {t("The cases taught one at a time, every word brought back just before you’d forget it, a tutor awake at any hour, and every form straight from a dictionary, never an AI. Free, and it works offline.")}
            </p>
          </div>
        </div>
      </Reveal>
      <p className="mt-6 max-w-[60ch] text-sm" style={{ color: "var(--ink-3)" }}>
        {rich(t("Weighing up particular apps? There’s a side-by-side table in {below}, checked against each app’s own website in August 2026."), {
          below: <a href="#comparison" className="font-semibold underline underline-offset-4" style={{ color: "var(--accent-deep)" }}>{t("the questions below")}</a>,
        })}
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── plan ── */

function Plan({ say }: { say: Say }) {
  const { t } = say;
  return (
    <section id="plan" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 md:px-8">
      <Reveal>
        <div className="section-head">
          <p className="section-tag" data-tone="butter">{t("Your plan")}</p>
          <h2 className="landing-title">
            {t("When could you get there?")}
          </h2>
          <p className="mt-5 max-w-[48ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("Answer four questions and we’ll do the same math the app does inside. You get a range, because anyone who gives you one exact number is guessing.")}
          </p>
        </div>
      </Reveal>
      <Reveal>
        <div className="plan-card mt-10 rounded-[var(--r-xl)] border p-5 md:mt-12 md:p-10">
          <PlanCalculator />
          <div className="mt-6">
          <Explain label={t("Where the hours come from")}>
            {t("We start from the study hours usually published for each level, add extra where Estonian’s cases start to bite, and keep the total inside what the US Foreign Service Institute estimates for the language. It isn’t measured on people using this app. Once you’re inside, the same math runs on your own pace instead.")}
          </Explain>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────────────────────────────────────── cases ── */

/**
 * The problem and the demonstration of it, in one section.
 *
 * The complaint used to be a section of its own three cards above this one:
 * streak apps do not teach cases, textbooks do not schedule, chatbots invent
 * Estonian. All three are still made, and each is now made where it is
 * answered. The first is this heading, standing over the thing that answers it.
 * The second is on the scheduling card below, which was already saying half of
 * it. The third is on Anu's card and in the line of evidence under the hero,
 * where it is a promise about the whole app rather than one grievance in three.
 */
function Cases({ say, words }: { say: Say; words: DemoWord[] }) {
  const { t, count } = say;
  const derivable = words.filter((w) => w.cases.some((c) => !c.principal && c.singular));
  if (derivable.length === 0) return null;
  const learnCount = derivable[0]!.principal.length;
  const buildCount = derivable[0]!.cases.filter((c) => !c.principal).length;

  return (
    <section id="cases" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 md:px-8">
      <Reveal>
        {/*
          The heading is one line where there is room for one.

          "You didn't fail Estonian. Your tools did." is 820px of 40px display
          type, and the section has 960px inside its padding from `lg` up and
          704px at `md`. Broken by the column it reads as a sentence that ran
          out of room, with "tools did." stranded on a line of its own. So the
          break is placed rather than left to the wrap: below `lg` it falls
          where the sentence already ends, at the full stop, and above it there
          is no break at all. A `br` rather than `whitespace-nowrap`, because a
          nowrap that turns out not to fit is a heading hanging off the page,
          and this one wraps honestly instead.

          The wrapper is wide enough for that line, and the paragraph under it
          keeps its own measure: a 48ch box around both was what forced the
          heading into two lines in the first place.
        */}
        {/*
          THE HEADLINE IS THE CLAIM, WITH ITS TWO NUMBERS.

          "You didn't fail Estonian. Your tools did." was a complaint, and the
          card under it answers a different sentence: fourteen cases sounds
          impossible, and it is three forms and a set of endings. The numbers
          are counted off the first word the card shows rather than typed, so
          the heading is true of the card under it. The complaint keeps its
          place as the tag, where it frames the claim instead of standing in
          for it.
        */}
        <div className="section-head">
          <p className="section-tag" data-tone="accent">{t("You didn’t fail Estonian. Your tools did.")}</p>
          <h2 className="landing-title">
            {fill(t("Learn {n} forms."), { n: say.locale === "en" ? count(learnCount) : say.counted(learnCount, "form") })}<br className="lg:hidden" /> {fill(t("Build the other {n}."), { n: count(buildCount) })}
          </h2>
          <p className="mt-5 max-w-[52ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("Fourteen cases is the number that makes people give up on Estonian. Here’s the secret: you learn three forms of a word, sometimes four, and the rest are the same endings glued on, for every word in the language. When a word breaks the pattern, you’ll see what Estonians actually say right beside what the rule predicts. Press an ending and build one yourself.")}
          </p>
        </div>
      </Reveal>
      <Reveal>
        <div className="relative mt-10 md:mt-12">
          {/*
            THE FOUR VOWELS A UK OR US KEYBOARD CANNOT WRITE, over the four
            sides of the card that is full of them.

            They are the reason `lib/ux/letterBar.ts` exists and the first
            thing anybody meets about this language, and they used to hang off
            the hero's flashcard. That card went when this page was cut to five
            screens, and the rule they are placed under is why they could not
            simply stay where they were: THEY ALL TOUCH THE CARD, one to a
            side. A letter with clear air around it reads as one that missed
            rather than as one that was put there.

            So they moved rather than went, and this is the card they belong
            on: the only object left on the page big enough to carry them, and
            the one whose contents are the letters themselves. The hero above
            is a centred column with no box in it, and the closing panel is a
            send-off rather than an introduction.

            WHAT THEY MAY NOT TOUCH IS A CONTROL. On the old card that was one
            full-width pill in the footer; here it is the two word chips near
            the top left, which is why the letter on the top edge sits well
            left of them and is checked against every button inside the card
            rather than against one named pill.

            THE CARD CHANGES SHAPE, which the flashcard did not: the explorer
            stacks into one column below `md`, so it is 707px tall at 640 and
            about 440 above it. The two side letters are therefore placed from
            the top and the bottom rather than at a fraction of a height that
            is not stable, and the gutter they hang in goes 20px, 32px, 96px
            across the three widths, so the hang grows with it.

            EVERY OFFSET IS DERIVED FROM THE CARD'S OWN PADDING rather than
            from where the content happens to sit. The nearest run of text is
            21px from the left edge, 17px from the top, 33px from the right and
            22px from the bottom, measured at all three widths and for both
            words the explorer can show. So a letter that reaches in by less
            than its side's margin, wander included, cannot touch a glyph
            whatever the reader presses: that is a property of the placement
            rather than a lucky gap, which matters because pressing a chip
            changes how many rows the card has.

            THE TRAVEL IS ALONG THE EDGE, WHICH IS WHERE THE ROOM IS. These
            used to wander three or four pixels towards the card, because that
            is the only direction anybody had thought to spend, and against a
            17px margin there is nothing to spend: the movement was real and
            invisible. A letter on the top edge can slide the better part of
            the card's width without coming a pixel nearer anything it could
            land on, so õ and ö now travel 38 and 44px sideways, ä and ü 44
            and 40 up and down their own sides, and what crosses the edge is
            one to three pixels. They were 26 to 30 for a while, over periods
            of up to seven seconds, and were reported as not moving at all:
            measured moving, and too slow and too short a way to be seen by
            anybody not already staring at one. The characters got quicker
            with it (`lib/ux/letterMotion.ts`), and the four hop once, in
            turn, whenever the word under them changes. The rock and the squash are what the small budget
            buys, and `room` is what scales them per letter: a rotated square
            is wider than its side, so 8deg on the tightest of the four is
            worth more than 15deg on the one with a gutter under it.

            The hang is bounded by the other end: the gutter is 20px at 640,
            and a rotated square is wider than its side, so 14deg on 40px puts
            its corners about 4px past the box. That is the difference between
            hanging inside the page's padding and being clipped against it, and
            it is why every letter is smaller below `md` than above it.

            EACH ONE MOVES DIFFERENTLY, and that is the point of there being
            four characters in `lib/ux/letterMotion.ts` rather than one
            keyframe with four delays on it. Four squares doing the same thing
            a second and a half apart is a mechanism. õ ambles, ä crouches and
            springs, ü rolls, ö hangs and swings.

            AND THEY NOTICE A POINTER. Coming near one slides it along its own
            edge towards the cursor and settles it further onto the card, which
            is the same rule as the wander for the same reason. They are still
            `pointer-events-none` and `aria-hidden`: an ornament that
            eats a tap on the card underneath it is a decoration doing
            something no decoration should, and the card underneath is the one
            interactive thing on this page.
          */}
          <LetterTile
            letter="õ" hue="blush" edge="top" character="wander"
            tilt={-7} travel={{ x: 38, y: 1 }} room={0.5} reach={280}
            className="-top-6 left-72 z-20 hidden h-8 w-8 text-base sm:block md:-top-8 md:left-80 md:h-10 md:w-10 md:text-xl"
          />
          <LetterTile
            letter="ä" hue="accent" edge="right" character="hop"
            tilt={12} travel={{ x: -3, y: -44 }} room={0.75} delay={0.7} reach={280}
            className="-right-3 top-24 z-20 hidden h-8 w-8 text-base sm:block md:-right-6 md:top-28 md:h-10 md:w-10 md:text-xl"
          />
          <LetterTile
            letter="ü" hue="sky" edge="left" character="tumble"
            tilt={-9} travel={{ x: 2, y: -40 }} room={0.6} delay={1.5} reach={280}
            className="-left-3 bottom-24 z-20 hidden h-8 w-8 text-base sm:block md:-left-6 md:bottom-28 md:h-10 md:w-10 md:text-xl"
          />
          <LetterTile
            letter="ö" hue="butter" edge="bottom" character="swing"
            tilt={15} travel={{ x: -44, y: -3 }} room={0.85} delay={2.2} reach={280}
            className="-bottom-5 right-14 z-20 hidden h-8 w-8 text-base sm:block md:-bottom-6 md:right-20 md:h-10 md:w-10 md:text-xl"
          />

          <CaseExplorer words={derivable} />
        </div>
      </Reveal>
    </section>
  );
}

/* ────────────────────────────────────────────────────── features ── */

/* ─────────────────────────────────────────────────────── evening ── */

/**
 * The first evening of the course, read off the course itself.
 *
 * Its words are the first unit's, with the English the syllabus authors beside
 * each (the one column this project writes), and its steps and minutes are the
 * programme's own, so the page and the button cannot describe two different
 * evenings. No database: the course is code, which is also why this section is
 * there on a deployment whose dictionary has not answered yet.
 */
function eveningOne({ t, locale }: Say): { words: EveningWord[]; steps: EveningStep[]; title: string; canDo: string; evenings: number } | null {
  const day = DEFAULT_PROGRAMME.days[0];
  if (!day) return null;
  const unit = unitById(day.unitId);
  const gloss = new Map((unit?.words ?? []).map(([lemma, en]) => [lemma, en] as const));
  const words = day.words.flatMap((et) => {
    const en = gloss.get(et);
    // A word's meaning in Russian or Ukrainian is the landing area's, read
    // under "gloss" so a short English word cannot collide with a button.
    return en ? [{ et, en: locale === "en" ? en : t(en, "gloss") }] : [];
  });
  if (words.length < 4) return null;
  return {
    words,
    steps: day.steps.map((s) => ({ ...stepText(day, s, locale), minutes: s.minutes })),
    title: day.title,
    canDo: unit?.canDo ? t(unit.canDo) : "",
    evenings: PROGRAMMES.reduce((n, p) => n + p.days.length, 0),
  };
}

function Evening({ say }: { say: Say }) {
  const { t, count } = say;
  const evening = eveningOne(say);
  if (!evening) return null;
  const minutes = evening.steps.reduce((n, s) => n + s.minutes, 0);
  return (
    <section id="evening" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 md:px-8">
      <Reveal>
        <div className="section-head">
          <p className="section-tag" data-tone="sky">{t("Your first evening")}</p>
          <h2 className="landing-title">
            {fill(t("{minutes} minutes, {words} words. Try the first step now."), {
              // Russian and Ukrainian take the noun's form from the number, so
              // the template there holds no noun and is handed the counted phrase.
              minutes: say.locale === "en" ? minutes : say.counted(minutes, "minute"),
              words: say.locale === "en" ? count(evening.words.length) : say.counted(evening.words.length, "word"),
            })}
          </h2>
          <p className="mt-5 max-w-[52ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("Every evening is one button. You meet a handful of new words, and they pop back a moment later to check you kept them. A quick game or two puts them to work, and then the app says you’re done for the night.")}
          </p>
        </div>
      </Reveal>
      <Reveal>
        <div className="mt-10 md:mt-12">
          <FirstEvening {...evening} />
        </div>
      </Reveal>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── talk ── */

/**
 * One of the fifteen conversations, playable with no account.
 *
 * The page's closing line says to say it to somebody, and until now nothing
 * on it let a visitor say anything to anybody. This is the café scene through
 * the app's own machinery, keyless (`app/api/demo-scene/route.ts`).
 */
function Talk({ say }: { say: Say }) {
  const { t } = say;
  return (
    <section id="talk" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 md:px-8">
      <Reveal>
        <div className="section-head">
          <p className="section-tag" data-tone="blush">{t("Say it to somebody")}</p>
          <h2 className="landing-title">
            {t("Order a drink in Estonian. Right now, no account needed.")}
          </h2>
          <p className="mt-5 max-w-[52ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("This is one of the fifteen conversations inside: a café counter, and somebody waiting for your order. Here you pick what to say, from hello to paying. Inside the app, you type it yourself.")}
          </p>
        </div>
      </Reveal>
      <Reveal>
        <div className="mt-10 md:mt-12">
          <CafeScene />
        </div>
      </Reveal>
    </section>
  );
}

function Features({ say }: { say: Say }) {
  const { t } = say;
  /*
    THREE CARDS, AND WHAT EACH ONE IS FOR CHANGED.

    They were a dictionary, a course and a tutor, which is a list of the parts
    this app is built out of rather than an answer to the question the section
    above just asked. That section ends on somebody who freezes at the counter,
    and the honest next line is how they stop doing that. So the cards are the
    three ways this app is used rather than the three things it contains: the
    person you can ask without anybody watching, the practice that puts the
    words in, and the plan that keeps you turning up. The dictionary did not go
    anywhere; it is the first sentence of the practice card, because looking a
    word up here is how a card gets made.

    ANU LEADS NOW. She was third of three, behind two cards describing
    machinery, and she is the part of this nobody else in the list offers: a
    teacher you can ask a question you are embarrassed by, at eleven at night,
    who answers the question rather than marking it. Her card is also the one
    with something to press, which is worth having early rather than last.

    The history the three replaced, kept because it is the argument for there
    being three of anything at all:

    Eight cards became five, five became four, four became three.

    Three of the original eight said what the hero, the FAQ or another card was
    already saying: a portability card beside an offline tick, a progress card
    beside an XP card, and a "four ways to practice" card that had been wrong
    since the third practice mode shipped. Then the speech card, which is not a
    thing of its own: it is what the dictionary entry does when you press a
    form, so it is a clause on the dictionary card.

    The last to go is the seam between the course and the scheduler, and they
    were never two things. A unit is a sitting's worth of words, adding one
    makes cards, and the scheduler is what brings those cards back: that is one
    loop described twice, once as "here is a syllabus" and once as "here is a
    scheduler", with the sentence joining them left for the reader to write.

    What the bodies carry now is the section that used to sit under this one.
    "How a day goes" was three steps, and all three were already here in other
    words: picking a unit and looking a word up is the first card, adding it in
    a press is the second, and being told you are done for the day is the second
    card's whole point. A step somebody reads twice is a step they read neither
    time.

    Three is also what makes the grid a row again, with no hole to explain.
    `md:col-span-2` on Anu's card had done nothing since the day it was written,
    because the grid item is the `Reveal` wrapper and the span was on the card
    inside it: the layout everybody had been looking at was three cards, then
    two, then a gap where the sixth would go.
  */
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 md:px-8">
      <Reveal>
        {/*
          THE HEADING NAMES THE THREE THINGS UNDER IT.

          It read "What's inside" over "How you get there", which is an eyebrow
          about contents over a heading about a journey, and the cards under
          them are neither: they are the three parts of the app somebody uses
          every day. A heading that has to be decoded is a heading that gets
          skipped, on the way to the button. So it says what the cards say,
          one clause each, and the line under it says how the three fit.
        */}
        <div className="section-head">
          <p className="section-tag" data-tone="butter">{t("What you get")}</p>
          <h2 className="landing-title">
            {t("Someone to ask, words that stay, and a nudge out the door")}
          </h2>
          <p className="mt-5 max-w-[48ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("The three feed each other. A word Anu explains goes into your practice with one press, and it comes back on the evening you’re about to forget it.")}
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3">
        <Reveal>
          <Feature
            tone="blush"
            icon={<Sparkles size={18} aria-hidden />}
            title={t("Anu, who never sighs")}
            body={t("Ask her the thing you'd never ask in class. She'll build a sentence with you, read the one you wrote, and tell you why the ending changed. Every Estonian word she shows you is checked in the dictionary, never guessed.")}
          >
            <TutorPeek />
          </Feature>
        </Reveal>
        <Reveal>
          <Feature
            tone="accent"
            icon={<BookOpen size={18} aria-hidden />}
            title={t("Words that stay")}
            body={fill(t("Look up any word and keep it with one press, every form included, read aloud in ten different voices. Then there are {units} of words like it. Each comes back the day before you'd forget it, and you hear it the way people really say it: fast, over café noise, down a crackly phone line."), { units: say.counted(PATH.length, "unit") })}
          />
        </Reveal>
        <Reveal>
          <Feature
            tone="sky"
            icon={<Target size={18} aria-hidden />}
            title={t("Then the real thing")}
            body={t("A receptionist with no slot on Thursday, a landlord on a bad line, a line at the counter. Rehearse it here first, where nobody's watching. Then say one thing to a real person today and tell us how it went. Those are the conversations that really count.")}
          />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * One card, and `children` for the one that shows its work.
 *
 * Anu's card used to be a hand-written copy of this with its icon beside the
 * heading instead of above it, which is how it came to be the only card in the
 * grid laid out differently from its neighbors. A slot under the body is the
 * whole of what it needed, and the icon it was laying out its own way is the
 * arrangement every card takes now: a circle stacked over a heading spends 52px
 * of a phone on saying nothing the heading does not, once per card.
 */
function Feature({ tone, icon, title, body, children }: {
  tone: "accent" | "sky" | "butter" | "blush";
  icon: React.ReactNode;
  title: React.ReactNode;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="lift flex h-full flex-col rounded-[var(--r-xl)] border p-6"
      style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth)" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="feature-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r)] border"
          style={{
            background: `var(--${tone})`,
            borderColor: "var(--edge)",
            color: tone === "accent" ? "var(--accent-ink)" : "var(--on-hue)",
          }}
        >
          {icon}
        </span>
        <h3 className="font-display text-xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
          {title}
        </h3>
      </div>
      <p className="mt-3 max-w-[52ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{body}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────── comparison ── */

/**
 * The comparison, and the rules it is written under.
 *
 * It used to be headed "Kodukeel vs. the owl", which was a joke at the expense
 * of an app that has never offered Estonian at all. Comparing yourself with a
 * product nobody can buy in this language is not an honest comparison, and it
 * left the page silent about the tools somebody choosing today is actually
 * choosing between. The fact is now stated plainly and the mascot is gone with
 * it: borrowing somebody else's branding to sell your own thing is the part of
 * a comparison that gets a letter, and the plain sentence was better copy
 * anyway.
 *
 * So the columns are the real ones, and every claim in the table is written to
 * survive being read by the people it is about: a fact taken from that
 * product's own public pages, checked on a stated date, with a third state for
 * the cells we could not confirm rather than a guess in our own favor. No
 * logos, no borrowed branding, nothing about price beyond what their own store
 * listing says, and a credit line under the table for what each of them does
 * better than Kodukeel does. On most of these rows somebody else ticks too,
 * which is what a comparison looks like when it is not rigged.
 *
 * How many is counted from the rows rather than written under them. It said
 * three, the table had grown since, and the true figure was seven: a sentence
 * claiming to be an honest comparison was the one sentence on the page nobody
 * had rechecked. `SHARED_ROWS` cannot drift from the grid it describes.
 *
 * If you add a row, it has to be checkable by a stranger in an afternoon. A row
 * that can only be settled by opinion belongs in the prose, not the grid.
 */

/** yes · no, going by its own public pages · we could not tell. */
type Verdict = "yes" | "no" | "unsure";

const TOOLS = [
  { name: "Kodukeel", short: "Kodukeel", ours: true },
  { name: "Speakly", short: "Speakly", ours: false },
  { name: "Keeleklikk", short: "Keeleklikk", ours: false },
  { name: "Anki", short: "Anki", ours: false },
] as const;

const rowsIn = ({ t }: Say): readonly { label: string; cells: readonly [Verdict, Verdict, Verdict, Verdict] }[] => [
  { label: t("Free, with no subscription"), cells: ["yes", "no", "yes", "yes"] },
  { label: t("Built for Estonian and nothing else"), cells: ["yes", "no", "yes", "no"] },
  { label: t("Teaches the cases one at a time"), cells: ["yes", "unsure", "yes", "no"] },
  { label: t("Every form shows the dictionary it came from"), cells: ["yes", "no", "no", "no"] },
  { label: t("Brings a word back on the day you would forget it"), cells: ["yes", "yes", "no", "yes"] },
  { label: t("Any word you look up becomes a card"), cells: ["yes", "no", "no", "yes"] },
  { label: t("Explains why the answer was wrong"), cells: ["yes", "yes", "yes", "no"] },
  { label: t("Keeps working with no connection"), cells: ["yes", "unsure", "no", "yes"] },
  { label: t("Lets you rehearse a conversation with somebody who wants something from you"), cells: ["yes", "unsure", "no", "no"] },
  { label: t("Counts the conversations you have outside it"), cells: ["yes", "no", "no", "no"] },
];

/**
 * Rows where a product other than ours also earns a tick. Read off the rows,
 * because the summary above the table says the number out loud.
 *
 * Spelled rather than printed as a digit, because the sentence around it is
 * prose and the rest of this page counts in words; in Russian and Ukrainian
 * it is a figure, which is how both write a count in prose.
 */
function sharedRows(say: Say, rows: ReturnType<typeof rowsIn>): { claims: string; shared: string } {
  const shared = rows.filter((row) => row.cells.slice(1).includes("yes")).length;
  // Capitalized at the source and lowered where it sits mid-sentence: the
  // count of claims is the kind of thing a second caller wants to open with.
  const claims = say.locale === "en" ? SpelledCount(rows.length).toLowerCase() : String(rows.length);
  return { claims, shared: say.locale === "en" ? spelledCount(shared) : String(shared) };
}

/*
  ONE LINE EACH, AND THE LINE IS WHAT THEY ARE BETTER AT.

  These were four paragraphs describing four other products, which is a page
  selling somebody else's app inside a section about ours. What the credit is
  for is the sentence CLAUDE.md asks for, that each of them does something we
  do not, and that is one clause long. The detail underneath it (a price list,
  a chapter count, which platforms are free) is theirs to publish and is a
  click away on their own site, where it will also be current.
*/
const creditsIn = ({ t }: Say) => [
  {
    name: "Speakly",
    body: t("Made in Estonia, and the quickest way to get 4,000 common words into your ear. It's a paid app."),
  },
  {
    name: t("Keeleklikk and Keeletee"),
    body: t("Free, state-funded courses where a real teacher answers you by email. Start there, and keep this open alongside."),
  },
  {
    name: "Anki",
    body: t("Schedules anything you're willing to type in. Finding the Estonian is up to you, and so is getting it right."),
  },
  {
    name: t("The vocabulary apps"),
    body: t("Drops, Mondly, Memrise, Ling and the rest are good at words. This is about which form of the word to use, and why."),
  },
] as const;

function Mark({ verdict, t }: { verdict: Verdict; t: Say["t"] }) {
  if (verdict === "yes") {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{ background: "var(--sky-soft)", color: "var(--sky-ink)" }}
      >
        <Check size={15} strokeWidth={3} aria-label={t("yes", "mark")} />
      </span>
    );
  }
  if (verdict === "unsure") {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}
      >
        <CircleHelp size={15} strokeWidth={2.5} aria-label={t("we could not tell")} />
      </span>
    );
  }
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full"
      style={{ background: "var(--raised)", color: "var(--ink-3)" }}
    >
      <Minus size={15} strokeWidth={3} aria-label={t("no", "mark")} />
    </span>
  );
}

/**
 * The comparison, folded into the questions.
 *
 * Every claim in it is still here, and so is the credit paragraph for each of
 * the four tools. What changed is where it sits. It was a section of its own
 * with its own heading and its own summary paragraph, second from the bottom of
 * the page, and an eight-row grid against three products with four credit cards
 * and a dated methodology note is the longest block here by a distance. It also
 * answers a question only somebody already choosing between tools is asking,
 * which is exactly the shape of the four questions above it. So it is the fifth
 * one, wearing the same shell: the person asking it finds it where they look
 * for it, and everybody else gets a line in a list instead of a screen.
 *
 * Shut by default rather than removed, because the argument in the comment
 * below still holds: a page that will not say what it is not better at is a
 * page whose claims cannot be checked.
 */
function Comparison({ say }: { say: Say }) {
  const { t } = say;
  const ROWS = rowsIn(say);
  const CREDITS = creditsIn(say);
  const { claims, shared } = sharedRows(say, ROWS);
  return (
    <FaqItem id="comparison" question={t("How does it compare with Speakly, Keeleklikk and Anki?")}>
      {/*
        No Reveal inside here. It fades a section up as it enters the
        viewport, and an element that is display:none until somebody opens
        a disclosure has no entry to animate on a page already scrolled
        past it. The one thing worse than an animation nobody sees is one
        that leaves the content half-faded, which the design suite checks
        for by name.
      */}
      <p className="mt-3 max-w-[68ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {rich(t("As of August 2026, Duolingo has never offered Estonian, so the real choice is between the tools that do. That month we checked {claims} claims against each tool’s own website, and another tool earns a check mark on {shared} of them. None of them is trying to get you saying {e1} and knowing why it isn’t {e2}."), {
          claims,
          shared,
          e1: <span lang="et" className="font-semibold">ma lähen tuppa</span>,
          e2: <span lang="et" className="font-semibold">tuba</span>,
        })}
      </p>

      {/* Phones get a card per claim: four columns of ticks at 390px would
          leave the labels a third of a line wide, and this page may not
          scroll sideways. */}
      <div className="mt-7 flex flex-col gap-3 md:hidden">
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="rounded-[var(--r-lg)] border p-4"
            style={{ background: "var(--surface)", borderColor: "var(--rule)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{row.label}</p>
            {/* A column each only where a column holds the name: two to a row
                at 320 left "Keeleklikk" 64px beside its mark and broke it. */}
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
              {TOOLS.map((tool, i) => (
                <span key={tool.name} className="flex items-center gap-2">
                  <Mark t={t} verdict={row.cells[i] ?? "unsure"} />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: tool.ours ? "var(--accent-deep)" : "var(--ink-3)" }}
                  >
                    {tool.short}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-7 hidden overflow-hidden rounded-[var(--r-xl)] border md:block"
        style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth)" }}
      >
        {/* 7rem a column rather than 88px: the header names are set in
            label-xs, which grew to 14px with the type scale, and at 88px
            "Keeleklikk" broke across two lines at every width. */}
        <div
          className="grid grid-cols-[1fr_repeat(4,7rem)] items-center gap-2 border-b px-5 py-3.5"
          style={{ borderColor: "var(--rule-soft)", background: "var(--raised)" }}
        >
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>&nbsp;</span>
          {TOOLS.map((tool) =>
            tool.ours ? (
              <span key={tool.name} className="text-center text-base font-bold" style={{ color: "var(--accent-deep)" }}>
                {tool.name}
              </span>
            ) : (
              <span key={tool.name} className="label-xs text-center" style={{ color: "var(--ink-3)" }}>
                {tool.name}
              </span>
            ),
          )}
        </div>
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_repeat(4,7rem)] items-center gap-2 px-5 py-3.5"
            style={{ borderTop: "1px solid var(--rule-soft)" }}
          >
            <span className="text-base" style={{ color: "var(--ink-2)" }}>{row.label}</span>
            {TOOLS.map((tool, i) => (
              <span key={tool.name} className="flex justify-center">
                <Mark t={t} verdict={row.cells[i] ?? "unsure"} />
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CREDITS.map((credit) => (
          <div
            key={credit.name}
            className="rounded-[var(--r-lg)] border px-4 py-3.5"
            style={{ borderColor: "var(--rule)", background: "color-mix(in oklab, var(--surface) 70%, transparent)" }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{credit.name}</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>{credit.body}</p>
          </div>
        ))}
      </div>

      <Explain label={t("How this table was checked")}>
        {t("A check mark means yes, a dash means their own pages don’t say so, and a question mark means we couldn’t tell. We checked each product’s own website in August 2026. Every name belongs to its owner, and none of them has endorsed this. If we’ve got something wrong, tell us and we’ll fix it.")}
      </Explain>
    </FaqItem>
  );
}

/* ───────────────────────────────────────────────────── questions ── */

/*
  TWO SENTENCES EACH, WHICH IS THE WHOLE EDIT.

  Every one of these was true and three of them ran past ninety words. A
  question somebody opened because they wanted a yes or a no was answered with
  a paragraph, and the thing they asked about was in the middle of it: the
  payment answer listed four daily limits with their numbers before saying the
  word that matters, which is no. A reader skims that and leaves knowing less
  than the heading told them.

  So each answer leads with the answer and stops. What went is the detail a
  reader only wants once they are inside, which is a screen they reach by
  signing in rather than a paragraph they scroll past to reach the button.
*/
const faqsIn = ({ t }: Say) => [
  [
    t("Do I need to pay for anything?"),
    t("No, and there's nothing to install either. A few things cost us real money to run, so Anu, the writing feedback and the camera each have a daily limit. A normal evening never gets near it."),
  ],
  [
    t("Where do the Estonian forms come from?"),
    t("From a real dictionary, never from AI. AI makes up forms that look right and aren't, and a flashcard would drill that mistake straight into your head. When Anu translates a sentence for you, the app says so."),
  ],
  [
    t("Is this only for beginners?"),
    /*
      Main's rewrite of this answer, with the one word this branch is here for
      taken out of it. "A ten-minute check" was written when the paper was
      nineteen questions; it is eighty now and a skill climbs until it stops
      passing, so ten minutes is right for a beginner and three times out for
      anybody else, and the learner who is furthest through is the one it
      misleads. The shorter answer is main's and is better than what this
      branch had.
    */
    t("Not at all. It runs from A1 to C1, and the bits that trip up even advanced learners get extra practice: letters that change in the middle of a word, the case each verb insists on, and when an object takes which ending. Not sure where you are? Take the level check. There are mock state exam papers at A2, B1, B2 and C1 too, built fresh from real sentences and marked by clear rules rather than a model. The one exception is the spoken part, which you mark yourself."),
  ],
  [
    t("Will it actually get me talking to people?"),
    t("That's the whole point. You'll practice with people who want something from you: a receptionist, a landlord, a clerk. What you say is checked against the dictionary, never graded by an AI, so you can't be told you were wrong when you were right. Every morning the app asks whether you spoke Estonian to anyone yesterday, and if not, it gives you one small thing to say out loud. It counts those conversations, even the ones where somebody switched to English. It won't score your pronunciation, though. The best speech recognizer we could find gets native speakers wrong, and we'd rather tell you that than pretend."),
  ],
  [
    t("What happens to my data?"),
    t("It stays in your account, and you can download every bit of it from Settings whenever you like. Your record of every answer you've given is the one thing we could never rebuild, so we never change or delete any of it, unless you delete your account."),
  ],
] as const;

/**
 * One shell for every question, the comparison included.
 *
 * It exists because the comparison used to be its own section with its own
 * heading, its own eyebrow and its own chevron, and folding it in beside four
 * questions that look nothing like it would have read as two designs meeting
 * rather than as one list. A shared shell is also the reason the comparison
 * costs a line rather than a screen: shut, it is exactly as tall as "What
 * happens to my data?".
 */
function FaqItem({ id, question, children }: { id?: string; question: string; children: React.ReactNode }) {
  return (
    <details
      id={id}
      className="group scroll-mt-24 rounded-[var(--r-lg)] border px-5 py-4"
      style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth-sm)" }}
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-4 text-md font-semibold"
        style={{ color: "var(--ink)" }}
      >
        {question}
        {/*
          TWO ICONS SWAPPED, RATHER THAN ONE CHARACTER TURNED.

          It was the character "+", rotated 45 degrees when the question opens.
          A typed plus is a glyph on a baseline, and a baseline is not the
          middle of the line box: `items-center` centres the line box and the
          font then draws the bar wherever its own metrics say, which in Plus
          Jakarta is above centre. So every one of these circles was off centre,
          and the rotation spun the mark about a point that was not its own
          middle, which is why the cross wobbled as it turned. A lucide icon is
          drawn inside a square viewBox, so its centre is the centre of the box
          it is given, and it measures dead centre on both axes.

          THE ROTATION HAD TO GO WITH IT, and that is `test-containment`
          reading the icon correctly rather than a limitation to work around.
          It asks whether an icon is drawn at the size it declared, and
          `getBoundingClientRect` reports the box *after* an ancestor's
          transform: a 15px square turned 45 degrees is 21px across the axes,
          so the check called it deformed, at all three widths, and it was
          right that something was up. The character it replaced declared no
          width or height, so the check had skipped it and never had an opinion
          about the rotation before.

          A cross-fade of the two stacked on top of each other is the other
          way to keep the motion, and it trades this fault for the collision
          check instead. So the icon swaps: `hidden` is `display: none`, which
          is the one state that leaves nothing behind to measure or to sit
          under. What the animation was carrying was never the meaning anyway;
          the meaning is the mark, and the mark is now the right one and in the
          middle of its circle.
        */}
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          <Plus size={15} strokeWidth={2.5} className="group-open:hidden" />
          <X size={15} strokeWidth={2.5} className="hidden group-open:block" />
        </span>
      </summary>
      {children}
    </details>
  );
}

function Questions({ say }: { say: Say }) {
  const { t } = say;
  const FAQS = faqsIn(say);
  return (
    <section id="faq" className="mx-auto w-full max-w-4xl scroll-mt-24 px-5 md:px-8">
      <Reveal>
        {/*
          The same head as the two sections above it, eyebrow, heading, one
          line, because a heading standing alone over a list read as a
          different page starting. Sky, since that hue is reference material
          and this is the reference part of the page.
        */}
        <div className="section-head">
          <p className="section-tag" data-tone="accent">{t("Questions")}</p>
          <h2 className="landing-title">
            {t("Things people ask us")}
          </h2>
          <p className="mt-5 max-w-[52ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("Short answers, straight to the point. How this compares with other apps is the last one.")}
          </p>
        </div>
      </Reveal>
      <div className="mt-10 flex flex-col gap-3 md:mt-14">
        {FAQS.map(([q, a]) => (
          <Reveal key={q}>
            <FaqItem question={q}>
              {/* Capped, because the section is as wide as the comparison table
                  inside it and a hundred characters to the line is not a width
                  anybody reads a paragraph at. */}
              <p className="mt-3 max-w-[68ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{a}</p>
            </FaqItem>
          </Reveal>
        ))}
        <Reveal>
          <Comparison say={say} />
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────── final call ── */

/**
 * The close, and the one line the cut sections left behind.
 *
 * "How a day with Kodukeel goes" was three cards saying pick a unit, add it in
 * a press, and show up for fifteen minutes. That is one sentence, and it reads
 * better as one: it belongs at the point where somebody is deciding, not three
 * scrolls earlier where it is a feature list with numbers on it.
 *
 * The second button went with it. A page this length has its demonstration two
 * screens up rather than eight, and a "see it first" link at the bottom of a
 * short page is an invitation to leave the one screen that asks for a decision.
 */
function FinalCta({ say }: { say: Say }) {
  const { t, locale } = say;
  const signIn = locale === "en" ? "/sign-in" : `/sign-in?lang=${locale}`;
  return (
    <section id="start" className="w-full px-5 md:px-8">
      <Reveal>
        <div
          className="cta-stage night relative mx-auto max-w-5xl overflow-hidden rounded-[var(--r-xl)] px-6 py-10 text-center md:px-16 md:py-16"
        >

          <div className="relative">
            <MascotWatch size={68} mood="cheer" className="float mx-auto" />
            {/*
              The break is placed, not left to the column.

              "Fifteen minutes. Starting today." is 884px of 52px display type
              and the panel has 896px inside its padding at the widest this
              page is drawn, so the one line it fits on is a line with twelve
              pixels to spare: a font that loads a hair wider, or a window a
              step narrower, and the wrap lands wherever it lands, which was
              "Starting" on the first line and "today." alone on the second.
              Two sentences break at the full stop between them or they do not
              break at all, and only one of those is available at every width.
            */}
            <h2 className="landing-title cta-title mx-auto mt-6">
              {t("Fifteen minutes here.")}<br />{rich(t("Then {say} to somebody."), { say: <span className="hero-sticker">{t("say it", "sticker")}</span> })}
            </h2>
            {/*
              The close pays off the section that opens the page's argument.

              It described the loop instead: look a word up, press once, let
              the scheduler remember. That is what the app does, and it is a
              third answer to a question the feature grid and this heading have
              both already answered. What it never said is what any of it is
              for. The cases section opens on somebody freezing when they are
              spoken to at a counter, and this is the same person a screen
              later, with something to say back.

              It opened "Start today" and lost the words: the heading two lines
              above it ends on "Starting today", and the same day named twice
              in three lines reads as a page that has forgotten what it just
              said. The heading carries the date, so the line under it carries
              the payoff and nothing else.
            */}
            <p className="mx-auto mt-6 max-w-[52ch] text-md leading-relaxed" style={{ color: "var(--stage-ink-2)" }}>
              {t("Next time somebody speaks to you in Estonian, you’ll have something to say back. And it won’t be the first time you’ve said it.")}
            </p>
            <VisitRecap />
            <div className="mt-8 flex justify-center">
              <ButtonLink href={signIn} variant="primary" size="lg" hop="hover" className="w-full sm:w-auto">
                {t("Start learning for free")} <ArrowRight size={17} aria-hidden />
              </ButtonLink>
            </div>
            <p className="mt-5 text-xs" style={{ color: "var(--stage-ink-2)" }}>
              {t("Sign in with Google in a click. Nothing to install, and you can take your data with you any time.")}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/**
 * The footer, with room in it.
 *
 * It was one row: the wordmark, a four-source credit run together as a single
 * sentence with the licenses inside it, and three links, all at 12px, all on
 * one line at 1280 and wrapping into a lump under it. Crowded, and the credit
 * was the worst of it, because four institutions and three licenses in one
 * sentence is a sentence nobody can find their way back into. Each source has
 * a line now, with what it gives and the terms it gives it under, the links
 * have a column, and the whole thing is set a size up with the air a last
 * screen can afford. The rule still sits well clear of the closing panel, so
 * the credits read as the end of the page and not as part of the card above.
 */
/**
 * A footer link onto another public page, in the language the page is read
 * in. The English address stays written out at every call, which is what
 * the invariant that every public page is linked from here reads.
 */
function FootLink({ href, say, children }: { href: string; say: Say; children: React.ReactNode }) {
  const to = href === "/sign-in" ? (say.locale === "en" ? href : `/sign-in?lang=${say.locale}`) : say.href(href);
  return <li><Link href={to} className="underline underline-offset-4 transition-opacity hover:opacity-70">{children}</Link></li>;
}

function Footer({ say }: { say: Say }) {
  const { t, locale } = say;
  return (
    <footer className="landing-foot relative px-5 pb-14 md:px-8 md:pb-20">
      <div className="mx-auto max-w-6xl border-t pt-12 md:pt-16" style={{ borderColor: "var(--rule)" }}>
        <div className="grid gap-10 md:grid-cols-[1.1fr_1.5fr_auto] md:gap-14">
          <div>
            <Wordmark size={32} />
            <p className="mt-5 max-w-[34ch] text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {t("Kodukeel means home language. It’s free, and every Estonian form in it comes from a dictionary, never from AI.")}
            </p>
          </div>

          <div>
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Built on")}</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {SOURCE_CREDITS.map((src) => (
                <li key={src.name} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-semibold" style={{ color: "var(--ink)" }}>
                    <a href={src.href} target="_blank" rel="noreferrer" className="underline underline-offset-4 transition-opacity hover:opacity-70">
                      {src.name}
                    </a>
                    {src.by ? <span className="font-normal" style={{ color: "var(--ink-2)" }}>, {t(src.by)}</span> : null}
                  </span>
                  <span>{t(src.gives)}</span>
                  {src.licence ? <span style={{ color: "var(--ink-3)" }}>{src.licence}</span> : null}
                </li>
              ))}
            </ul>
          </div>

          {/*
            The pages a stranger is entitled to read before signing up, and
            until recently the landing page linked none of them: they were
            reachable only from each other and from two screens inside the
            app, which is behind the sign-in they exist to inform.

            AND THAT FIX STOPPED AT THREE, WHICH LEFT OUT THE TWO WRITTEN FOR
            EXACTLY THIS READER. /trust and /accessibility arrived after it and
            were never added here, so the landing page was the only public page
            in the app that did not link them: every one of the other five
            links both. They are the two a school administrator, a teacher or a
            grant reviewer is sent to, they say in their own words that they
            are for somebody with no account, and the one page such a person
            actually arrives on had no route to either. A page nobody can reach
            is a page nobody has read.
          */}
          <div>
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Read more")}</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm font-medium" style={{ color: "var(--ink-2)" }}>
              <FootLink say={say} href="/privacy">{t("Privacy")}</FootLink>
              <FootLink say={say} href="/terms">{t("Terms")}</FootLink>
              <FootLink say={say} href="/funding">{t("What it costs to run")}</FootLink>
              <FootLink say={say} href="/trust">{t("Security and trust")}</FootLink>
              <FootLink say={say} href="/accessibility">{t("Accessibility")}</FootLink>
              <FootLink say={say} href="/state-exam">{t("The state examination")}</FootLink>
              {locale !== "en" && (
                <li><Link href="/welcome" lang="en" hrefLang="en" className="underline underline-offset-4 transition-opacity hover:opacity-70">English</Link></li>
              )}
              {locale === "en" && ENTRY_LOCALES.map((l) => (
                <li key={l}>
                  <Link href={ENTRY_COPY[l].href} lang={l} hrefLang={l} className="underline underline-offset-4 transition-opacity hover:opacity-70">
                    {ENTRY_COPY[l].name}
                  </Link>
                </li>
              ))}
              <FootLink say={say} href="/sign-in">{t("Sign in")}</FootLink>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────────────── data ── */

/**
 * The demo words are pulled from the real dictionary and run through the real
 * derivation, so nothing on this page is a mock-up — and no Estonian form on it
 * was written by hand into marketing copy. If the database is unreachable the
 * page still renders: the fallback carries only principal parts copied from the
 * checked seed set, and no derived forms at all.
 */
async function loadDemo(): Promise<{ words: DemoWord[]; stats: { words: number; forms: number } }> {
  try {
    const [lexemes, wordCount, formCount] = await Promise.all([
      prisma.lexeme.findMany({
        where: { lemma: { in: [...DEMO_LEMMAS] } },
        include: { forms: true },
      }),
      prisma.lexeme.count(),
      prisma.form.count(),
    ]);

    /*
      One entry per lemma. `new Map(lexemes.map(...))` kept whichever row came
      last, which is the plan's choice, and `tuba` is both one of the three
      words this page demonstrates and a lemma the dictionary can hold twice:
      once from Ekilex with thirty forms, and once as a formless stub the
      moment somebody confirms it off a photograph. The case table under it
      is the whole argument this page makes, and it would have been empty.
    */
    const words = oneEntryPerLemma(lexemes, [...DEMO_LEMMAS]).flatMap((lex) => {
      const form = (t: string) => lex.forms.find((f) => f.formType === t)?.value;
      const isVerb = lex.pos === "VERB";

      // The three facts a case question is worded from. Two of the five words
      // on this card are people; see lib/estonian/caseQuestion.ts.
      const subject = {
        lemma: lex.lemma,
        semanticTypes: lex.semanticTypes,
        nomSg: form("NOM_SG") ?? null,
      };

      // Labeled the way a course labels them. The three noun parts are the
      // three questions every Estonian schoolbook drills them by, and a visitor
      // who has been to one lesson recognizes them.
      // And what each of those questions is asking, because two Estonian words
      // over a form is not an explanation to somebody who has not started yet.
      const askedIn = (key: string) => {
        const question = caseQuestionFor(caseByKey(key)!, subject);
        return questionInEnglish(question);
      };
      const principal = (isVerb
        ? [["ma-tegevusnimi", form("INF_MA")], ["da-tegevusnimi", form("INF_DA")], ["olevik, ma", form("PRES_1SG")], ["lihtminevik, ma", form("PAST_1SG")]]
        : [
            [`nimetav, ${caseQuestionFor(caseByKey("NOMINATIVE")!, subject)}`, form("NOM_SG"), askedIn("NOMINATIVE")],
            [`omastav, ${caseQuestionFor(caseByKey("GENITIVE")!, subject)}`, form("GEN_SG"), askedIn("GENITIVE")],
            [`osastav, ${caseQuestionFor(caseByKey("PARTITIVE")!, subject)}`, form("PART_SG"), askedIn("PARTITIVE")],
          ]
      ).flatMap(([label, value, english]) => (label && value ? [{ label, value, english: english ?? null }] : []));

      const table = isVerb
        ? []
        : buildCaseTable(stemsFrom(lex.forms));
      /*
        What each built form means in English, off the build-a-word walk's own
        rows, so the hero and the walkthrough read one table about an ending.
      */
      const readings = new Map(
        isVerb
          ? []
          : toWalkWord(lex.lemma, lex.translation, stemsFrom(lex.forms), subject, [])
              .derived.map((r) => [r.key, r.reading] as const),
      );


      return [{
        lemma: lex.lemma,
        genitive: form("GEN_SG") ?? null,
        principal,
        cases: table.map((row) => demoCase(row, subject, form("GEN_SG") ?? null, readings.get(row.spec.key) ?? null)),
      }];
    });

    if (words.length > 0) return { words, stats: { words: wordCount, forms: formCount } };
  } catch {
    // Falls through to the static set below — a landing page must render even
    // when the database behind it is having a bad day.
  }

  // The counts describe the built-in dictionary that `npm run db:seed` loads —
  // the right thing to claim when the database behind this page is unreachable
  // or has not been seeded yet, since that is exactly what a visitor would get.
  return { words: FALLBACK_WORDS, stats: SEED_SET_SIZE };
}

/**
 * The set the page falls back to when the database is unreachable or has not
 * been seeded yet, which is the state a fresh deployment builds in, so this
 * path is load-bearing rather than theoretical.
 *
 * The stems are copied verbatim from the checked seed data and live in
 * `lib/collections/demoWords.ts` beside the list of words to ask for; the rest
 * is derived by `buildCaseTable()`, exactly as the live path does it, down to
 * the short illative going in with the forms you memorize. Nothing here is a
 * hand-written Estonian form, and `scripts/test-invariants.ts` checks the copy
 * against the built dictionary rather than trusting that it was copied.
 */
/** The same three facts, off the fallback stems, which carry them by name. */
const demoSubject = (w: DemoStems) => ({
  lemma: w.lemma, semanticTypes: w.semanticTypes, nomSg: w.nomSg,
});

const FALLBACK_WORDS: DemoWord[] = DEMO_STEMS.map((w) => {
  const table = buildCaseTable(w);
  return {
    lemma: w.lemma,
    genitive: w.genSg,
    principal: [
      { label: `nimetav, ${caseQuestionFor(caseByKey("NOMINATIVE")!, demoSubject(w))}`, value: w.nomSg, english: questionInEnglish(caseQuestionFor(caseByKey("NOMINATIVE")!, demoSubject(w))) },
      { label: `omastav, ${caseQuestionFor(caseByKey("GENITIVE")!, demoSubject(w))}`, value: w.genSg, english: questionInEnglish(caseQuestionFor(caseByKey("GENITIVE")!, demoSubject(w))) },
      { label: `osastav, ${caseQuestionFor(caseByKey("PARTITIVE")!, demoSubject(w))}`, value: w.partSg, english: questionInEnglish(caseQuestionFor(caseByKey("PARTITIVE")!, demoSubject(w))) },
    ],
    cases: table.map((row) => demoCase(row, demoSubject(w), w.genSg)),
  };
});

/**
 * One row of the card, from one row of the case table.
 *
 * THE SHORT ILLATIVE STAYS IN ITS OWN ROW. It used to be promoted into the
 * left column, with the forms you memorize, on the argument that `tuppa` is
 * not `toa` with an ending on it and so has to be learned. True, and it made
 * the card a different shape for `tuba` than for `raamat`: four rows against
 * three on the left, ten against eleven on the right, and a card that changed
 * height under the pointer on every press. The claim is kept and the shape is
 * not: every word draws three rows and eleven, and the illative's row is where
 * the exception is said, in words, beside both spellings.
 *
 * `stored` is decided by comparing the printed form with the stem plus the
 * ending rather than by reading `origin`, because an entry enriched from
 * Ekilex carries a lexicographer's form for every case and every one of them
 * would read as stored, which is true and is not what the chip means. The
 * chip means no rule reaches this one.
 */
function demoCase(row: DerivedForm, subject: CaseSubject, genitive: string | null, reading: string | null = null): DemoCase {
  const shown = shownForms(row);
  /*
    Regular means the printed form is the genitive with this case's ending on
    it, which `derive.ts` answers because `derive.ts` owns the join. This used
    to work it out here with an `endsWith` and a `slice`, to keep the join out
    of this file, and `/grammar/build-a-word` then needed the same answer and wrote
    the same lines again. One reader rather than two.
  */
  const regular = followsEndingRule(shown[0] ?? "", genitive, row.spec);
  return {
    et: row.spec.et,
    /*
      The question *this* word answers. Two of the five words on this card are
      people, so the `mille-` series printed `milles?` over `mehes` and
      `sõbras`, which is the interrogative for a thing asked about a `kes` on
      the app's own front page. Every row is still shown, because a table of
      forms is a reference rather than a question. See
      lib/estonian/caseQuestion.ts.
    */
    question: caseQuestionFor(row.spec, subject),
    /*
      What the form means, in the fewest English words that are true: "into
      the book", handed in off the build-a-word walk's rows. Where it has
      nothing to say, the English of the question stands in.
    */
    english: reading ?? questionInEnglish(caseQuestionFor(row.spec, subject)),
    singular: shown.length > 0 ? shown.join(PARTS) : null,
    plural: row.plural ?? null,
    principal: row.spec.principal,
    stored: !row.spec.principal && shown.length > 0 && !regular,
  };
}
