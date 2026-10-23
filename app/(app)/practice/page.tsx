import type { ReactNode } from "react";
import { ArrowRight, Check, Plus, Target } from "lucide-react";
import { HeroFan } from "@/components/HeroFan";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { reviewQueue } from "../review/queue";
import { listDecks } from "@/lib/progress/decks";
import { masteryCounts, masteryFor } from "@/lib/progress/mastery";
import { parseExamples, usableExamples } from "@/lib/dict/examples";
import { dictationWords } from "@/lib/estonian/dictation";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { COMMON_GROUPS } from "@/lib/collections/commonGroups";
import { ButtonLink } from "@/components/Button";
import { GameArt } from "@/components/games/GameArt";
import { Empty, Page, toneInk } from "@/components/ui";
import { courseLevelFor } from "@/lib/progress/level";
import { SET_FOR_YOU, doneToday } from "@/lib/ux/workbookDone";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { inlineName, roundName, type RoundName } from "@/lib/ux/roundNames";

export async function generateMetadata() {
  return titleFor("Practice");
}

export const dynamic = "force-dynamic";

/**
 * PRACTICE: WHAT IS DUE, YOUR WORDS, AND THE FOUR SKILLS.
 *
 * This page was every round in the app, eight sections and then three
 * shelves, and was reported as a page somebody landed on and did not know
 * where to press. On 2026-10-18 the games left for a board of their own
 * (`/games`), and what is left answers "what needs doing" in three sections,
 * top to bottom: what the schedule wants today (Review, with the daily task
 * folded under it), any set of your own words (Flash cards and the workbook,
 * each a card with its choices inside it), and the four things a conversation
 * needs (hear, speak, write, talk). The drills for a named weakness live on
 * the grammar pages they practice, as they already did, so this page never
 * grows a long tail.
 *
 * Every round is named the way Games names it, the Estonian first and its
 * English in parentheses, at every level (`lib/ux/roundNames.ts`).
 */
export default async function PracticePage() {
  const ownerId = await requireUserId();
  const [review, totalCards, settings, sentenceReady, words, decks, level, locale, clock] = await Promise.all([
    // The sitting Review will hold, counted rather than reasoned about: see
    // app/(app)/review/queue.ts for what two readings of it cost.
    reviewQueue(ownerId, null, new Date()),
    prisma.card.count({ where: { ownerId } }),
    readSettings(ownerId, [SETTING_KEYS.workbookDone]),
    /*
      The learner's own words, asked for as words, for the dictation count.

      Asking Lexeme rather than Card is one row per word by construction, so
      the cap is a real `LIMIT` and `examples`, the longest column in the
      schema, is read once per word rather than once per card. Ordered to the
      end, since `Lexeme` is unique on `(lemma, pos)` and past the cap it is
      the tie at the two thousandth row that decides which words count.
    */
    prisma.lexeme.findMany({
      where: { cards: { some: { ownerId, suspended: false } } },
      orderBy: [{ lemma: "asc" }, { id: "asc" }],
      take: 2000,
      select: { examples: true },
    }),
    // Where every met word stands. The same read the Flash cards round makes,
    // so the count on its card and the round behind it are one answer.
    masteryFor(ownerId),
    // The learner's own named shelves, so a deck built anywhere in the app is
    // reachable as a round right here rather than only from `/words/decks`.
    listDecks(ownerId),
    courseLevelFor(ownerId),
    localeFor(ownerId),
    learnerDayClock(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);
  /* The workbook pages finished since the learner's day began. */
  const workbookDone = doneToday(settings[SETTING_KEYS.workbookDone], clock.dayKey());

  /* Dictation wants a sentence short enough to hold in your head. */
  const dictationCount = sentenceReady
    .map((w) => usableExamples(parseExamples(w.examples)))
    .filter((es) => es.some((e) => {
      const count = dictationWords(e.et).length;
      return count >= 3 && count <= 9 && e.et.length <= 80;
    })).length;

  /*
    What Review would put in front of them right now: due cards plus the unseen
    ones it trickles in, drawn the same way Today draws it.
  */
  const ready = review.cards.length;
  const counts = masteryCounts(words);
  const unfinished = counts.struggling + counts.almost + counts.learning;
  const flashMeta = unfinished > 0
    ? fill(t("{n} to work on"), { n: unfinished })
    : words.length > 0 ? t("All mastered") : t("No words yet");
  const stocked = decks.filter((d) => d.wordCount > 0);
  const flash = roundName("/review/flashcards");
  const common = roundName("/review/common");
  const workbook = roundName("/review/workbook");
  const reviewName = roundName("/review");

  /*
    The workbook's themes, as choices inside its card. "Set for you" leads,
    because what the page is for is the ending this learner keeps missing,
    read off their own log. A1 asks no case anywhere in the course, so there
    the only theme is the present tense.
  */
  const workbookThemes: { theme: string | null; title: string; meta: string }[] = level === "A1"
    ? [
      { theme: null, title: "Set for you", meta: "From the words you've met" },
      { theme: "present", title: "Present tense", meta: "For whoever is doing it" },
    ]
    : [
      { theme: null, title: "Set for you", meta: "Your weakest ending first" },
      { theme: "pronouns", title: "Personal pronouns", meta: "Through every case" },
      { theme: "present", title: "Present tense", meta: "For whoever is doing it" },
      { theme: "past", title: "Simple past", meta: "What happened" },
      { theme: "mixed", title: "Mixed forms", meta: "A bit of everything" },
    ];

  return (
    <Page route="/practice" title={t("Practice")} lead={t("Keep the words you've met fresh, a few minutes at a time.")}>
      {totalCards === 0 ? (
        <Empty
          title={t("Nothing to practice yet")}
          body={t("Every round here uses words from your own deck, so meet a few first.")}
          action={<ButtonLink href="/learn" variant="primary">{t("Learn some words first")}</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-12">
          {/*
            The first section carries no heading of its own. It sat directly
            under the page's title and lead, so the screen opened on two
            headings in a row, and the card below already names the round,
            says how many are ready and labels a tile "Due now". The card's
            own h2 is the heading this section is read under.
          */}
          <div className="flex flex-col gap-4">
            <HeroFan
              eyebrow={<span><span lang="et">{reviewName.et}</span> ({t(reviewName.en)})</span>}
              title={ready > 0
                ? fill(t(ready === 1 ? "{cards} is ready" : "{cards} are ready"), { cards: countOf(locale, ready, "card") })
                : t("Nothing is due right now")}
              text={t("Each word comes back just before you'd forget it.")}
              cardsLabel={t("Where your cards stand")}
              cards={[
                { figure: review.dueMore ? `${review.due.length}+` : String(review.due.length), label: t("Due now"), icon: "Clock" },
                { figure: String(review.fresh.length), label: t("New to meet"), icon: "Sparkles" },
                { figure: String(unfinished), label: t("To work on"), icon: "Target" },
              ]}
              action={
                <ButtonLink href="/review" variant={ready > 0 ? "primary" : "secondary"} size="lg" className="whitespace-nowrap">
                  {ready > 0 ? t("Review now") : t("Open it anyway")} <ArrowRight size={17} aria-hidden />
                </ButtonLink>
              }
            />
            <Link
              href="/quest"
              className="glow flex items-center gap-4 rounded-[var(--r-lg)] border p-4"
              style={{ borderColor: "var(--edge)", background: "var(--surface)" }}
            >
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
                <Target size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <Named name={roundName("/quest")} size="text-lg" locale={locale} />
                <span className="mt-0.5 block text-sm" style={{ color: "var(--ink-2)" }}>{t("Two minutes on the endings you miss most.")}</span>
              </span>
              <ArrowRight size={18} aria-hidden className="shrink-0" style={{ color: "var(--ink-3)" }} />
            </Link>
          </div>

          <Section id="words" title={t("Your words")} hint={t("Practice any set of words, whenever you like.")}>
            <div className="@container">
              <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
                <Card tone="accent" art={<CardStack />}>
                  <h3><Named name={flash} size="text-3xl" locale={locale} /></h3>
                  <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("Words you've met, asked in new ways and typed from memory.")}</p>
                  <Choices
                    label={t("Your words")}
                    aside={
                      <Link href="/words/mastery" className="label-xs underline-offset-4 hover:underline" style={{ color: "var(--accent-deep)" }}>
                        {t("Where your words stand")}
                      </Link>
                    }
                  >
                    <Choice href="/review/flashcards" title={t("All words")} meta={flashMeta} />
                    {stocked.map((deck) => (
                      <Choice key={deck.id} href={`/review/deck/${deck.id}`} title={deck.name} meta={countOf(locale, deck.wordCount, "word")} />
                    ))}
                    <AddChoice href="/words/decks" title={t("Add a deck")} />
                  </Choices>
                </Card>
                <Card tone="butter" art={<WorkbookPage />} data-practice-workbook="">
                  <h3><Named name={workbook} size="text-3xl" locale={locale} /></h3>
                  <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("A page of real sentences. Put each word into the form it needs, then check.")}</p>
                  <Choices label={t("Choose a page")}>
                    {workbookThemes.map((choice) => (
                      <Choice
                        key={choice.theme ?? "set"}
                        href={choice.theme ? `/review/workbook?theme=${choice.theme}` : "/review/workbook"}
                        title={t(choice.title)}
                        meta={t(choice.meta)}
                        done={workbookDone.has(choice.theme ?? SET_FOR_YOU) ? t("Done today") : undefined}
                        context={inlineName(workbook, t)}
                      />
                    ))}
                  </Choices>
                </Card>
                {/*
                  The commonest words of the language, a strip of their own
                  under both cards rather than a third group inside Flash
                  cards: they are not the learner's words, and inside that card
                  they made it twice the height of the workbook beside it.
                */}
                <section
                  aria-labelledby="practice-common"
                  data-practice-common=""
                  className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border @3xl:col-span-2 @3xl:flex-row"
                  style={{ borderColor: "var(--edge)", background: "var(--surface)" }}
                >
                  {/* The tint the two cards above carry in their drawing, on the side here, in the one hue this section had not used. */}
                  <div className="flex flex-col justify-center gap-4 p-5 @3xl:w-80 @3xl:shrink-0" style={{ background: "var(--sky-soft)" }}>
                    <h3 id="practice-common">
                      <Link href="/review/common" className="underline-offset-4 hover:underline">
                        <Named name={common} size="text-3xl" locale={locale} />
                      </Link>
                    </h3>
                    <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("The words you'll hear most, a hundred of each kind.")}</p>
                  </div>
                  <div className="grid flex-1 grid-cols-2 content-center gap-2 p-5 @5xl:grid-cols-4">
                    {COMMON_GROUPS.map((group) => (
                      <Choice
                        key={group.key}
                        href={`/review/common/${group.slug}`}
                        title={t(group.title)}
                        meta={countOf(locale, 100, "word")}
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </Section>

          <Section id="skills" title={t("Skills")} hint={t("The four things a conversation needs.")}>
            <div className="@container">
              <ul className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
                <Skill tone="blush" verb={t("Hear")} art="/review/listening" locale={locale} items={[
                  { href: "/review/listening" },
                  { href: "/review/dictation", meta: dictationCount > 0 ? fill(t("{n} ready"), { n: dictationCount }) : undefined },
                ]} />
                <Skill tone="sky" verb={t("Speak")} art="/review/speaking" locale={locale} items={[
                  { href: "/review/speaking" },
                  { href: "/review/numbers" },
                ]} />
                <Skill tone="accent" verb={t("Write")} art="/review/describe" locale={locale} items={[{ href: "/review/describe" }]} />
                <Skill tone="butter" verb={t("Talk")} art="/situations" locale={locale} items={[{ href: "/situations" }]} />
              </ul>
            </div>
          </Section>

          <p className="text-base" style={{ color: "var(--ink-2)" }}>
            {fill(t("Grammar drills like {a} and {b} sit on the grammar pages they practice."), {
              a: inlineName(roundName("/review/government"), t),
              b: inlineName(roundName("/review/conjugation"), t),
            })}{" "}
            <Link href="/grammar" className="font-semibold underline underline-offset-4" style={{ color: "var(--accent-deep)" }}>{t("Open grammar")}</Link>
          </p>
        </div>
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ parts */

function Section({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`practice-${id}`} className="flex flex-col gap-4">
      <div>
        <h2 id={`practice-${id}`} className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>{title}</h2>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>{hint}</p>
      </div>
      {children}
    </section>
  );
}

/** The Estonian name, and its English in parentheses on a quieter line. */
function Named({ name, size, locale }: { name: RoundName; size: string; locale: Locale }) {
  return (
    <span className="block leading-tight">
      <span lang="et" className={`block font-display font-bold ${size}`} style={{ color: "var(--ink)" }}>{name.et}</span>
      <span className="block text-base font-semibold" style={{ color: "var(--ink-3)" }}>({tr(locale, name.en)})</span>
    </span>
  );
}

function Card({ tone, art, children, ...rest }: { tone: string; art: ReactNode; children: ReactNode; "data-practice-workbook"?: string }) {
  return (
    <section {...rest} className="flex flex-col gap-4 overflow-hidden rounded-[var(--r-xl)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
      <div aria-hidden className="grid h-36 place-items-center" style={{ background: `var(--${tone}-soft)` }}>{art}</div>
      <div className="flex flex-col gap-4 px-5 pb-5">{children}</div>
    </section>
  );
}

/**
 * A labeled set of word sets inside a card. The label is small and quiet and
 * says what the buttons under it have in common.
 *
 * `aside` is a link that belongs to the set, drawn at the end of the label's
 * row. Flash cards' "Where your words stand" lives there rather than under the
 * card's name, where it was a line the workbook beside it does not have and
 * pushed everything in that column a line lower than its neighbor.
 */
function Choices({ label, aside, children }: { label: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {aside ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>{label}</p>
          {aside}
        </div>
      ) : (
        <p className="label-xs" style={{ color: "var(--ink-3)" }}>{label}</p>
      )}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 10rem), 1fr))" }}>{children}</div>
    </div>
  );
}

/**
 * The one box in a row of decks that makes a deck rather than opening one.
 *
 * It is a different kind of thing from the boxes beside it, so it is drawn as
 * one: a dashed edge round an empty ground, which is the usual shape of a
 * place something can go, and a plus in the accent with the label beside it.
 * Drawn like its neighbors it read as a deck called "Add a deck". The plus
 * never shrinks and the label is the one that wraps, beside it rather than
 * under it, since "Добавить колоду" is wider than the box at some widths and
 * a label that may not wrap is a label drawn over the border. It is centered in
 * the row height the grid gives it, since it has no line under its name to
 * line up with the boxes beside it.
 */
function AddChoice({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      data-add-deck=""
      className="tap-tint flex min-h-11 items-center gap-2.5 rounded-[var(--r)] border border-dashed px-3.5 py-2.5"
      style={{ borderColor: "var(--accent)", color: "var(--accent-deep)" }}
    >
      <span
        aria-hidden
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
        style={{ background: "var(--accent-soft)" }}
      >
        <Plus size={16} strokeWidth={2.5} />
      </span>
      <span className="min-w-0 text-balance text-sm font-semibold">{title}</span>
    </Link>
  );
}

/**
 * One set of words to practice, as a button: a name and one quiet line under
 * it, no dot and no icon, and a tick where it has been finished today.
 */
function Choice({ href, title, meta, context, done }: {
  href: string; title: string; meta?: string;
  /**
   * Which round this choice opens, said to a screen reader before the title.
   * It is text inside the link rather than an `aria-label` over it, so the
   * name always holds what the link shows (WCAG 2.5.3).
   */
  context?: string;
  /** Said under the name where this one has been finished today. */
  done?: string;
}) {
  return (
    <Link
      href={href}
      data-done={done ? "" : undefined}
      className="tap-tint flex min-h-11 flex-col justify-start rounded-[var(--r)] border px-3.5 py-2.5"
      style={done
        ? { borderColor: "var(--accent)", background: "var(--accent-soft)" }
        : { borderColor: "var(--rule-soft)", background: "var(--raised)" }}
    >
      {/* Balanced, so a line that has to wrap splits in the middle rather than leaving one word alone. */}
      <span className="text-balance text-sm font-semibold" style={{ color: "var(--ink)" }}>
        {context ? <span className="sr-only">{context}: </span> : null}
        {title}
      </span>
      {meta ? <span className="text-balance text-xs" style={{ color: "var(--ink-3)" }}>{meta}</span> : null}
      {done ? (
        <span className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent-deep)" }}>
          <Check size={13} aria-hidden className="shrink-0" />
          <span>{done}</span>
        </span>
      ) : null}
    </Link>
  );
}

function Skill({ tone, verb, art, items, locale }: {
  tone: string; verb: string; art: string; locale: Locale;
  items: { href: string; meta?: string }[];
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-[var(--r-xl)]" style={{ background: `var(--${tone}-soft)` }}>
      <div className="px-5 pt-5">
        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--surface)", color: toneInk(tone) }}>{verb}</span>
      </div>
      <div className="grid min-h-36 flex-1 place-items-center px-5 py-3"><GameArt href={art} size="sm" /></div>
      <div className="flex flex-col gap-1 p-2">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="tap-tint flex items-center justify-between gap-3 rounded-[var(--r)] px-3 py-2.5">
            <span className="min-w-0">
              <Named name={roundName(i.href)} size="text-xl" locale={locale} />
              {i.meta && <span className="block text-sm" style={{ color: "var(--ink-2)" }}>{i.meta}</span>}
            </span>
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: `var(--${tone})`, color: "var(--on-hue)" }}>
              <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </div>
    </li>
  );
}

/* --------------------------------------------------------------- drawings */

/** One card, turned to its meaning, drawn like the workbook page beside it: the same paper, edge and corner. The edge is `--edge`, translucent and outside the box, so it darkens the lavender exactly as much as the page edge darkens the butter. */
function CardStack() {
  return (
    <div className="relative h-24 w-36">
      <span className="absolute inset-0 grid place-items-center rounded-[var(--r-sm)] text-center" style={{ background: "var(--surface)", transform: "rotate(-2deg)", boxShadow: "0 0 0 1px var(--edge)" }}>
        <span>
          <span lang="et" className="block font-display text-2xl font-bold" style={{ color: "var(--ink)" }}>kohv</span>
          <span className="block text-sm" style={{ color: "var(--ink-3)" }}>coffee</span>
        </span>
      </span>
    </div>
  );
}

/** A workbook page: ruled lines with a gap on one, filled on another. */
function WorkbookPage() {
  return (
    <div className="flex w-60 flex-col gap-2.5 rounded-[var(--r-sm)] px-4 py-3" style={{ background: "var(--surface)", boxShadow: "0 0 0 1px var(--edge)", transform: "rotate(-2deg)" }}>
      <span lang="et" className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
        Ma elan <span className="px-1 underline decoration-2 underline-offset-4" style={{ color: "var(--butter-ink)" }}>Tallinnas</span> <Check size={13} aria-hidden className="inline" style={{ color: "var(--sky-ink)" }} />
      </span>
      <span lang="et" className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
        Ta töötab <span className="inline-block w-12 border-b-2 align-baseline" style={{ borderColor: "var(--butter-ink)" }} /> (kool)
      </span>
      <span className="h-0.5 w-full rounded-full" style={{ background: "var(--rule)" }} />
    </div>
  );
}
