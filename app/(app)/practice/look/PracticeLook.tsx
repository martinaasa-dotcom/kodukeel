import type { ReactNode } from "react";
import { ArrowRight, Check, Target } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ButtonLink } from "@/components/Button";
import { HeroFan } from "@/components/HeroFan";
import { Page, toneInk } from "@/components/ui";
import { reviewQueue } from "../../review/queue";
import { listDecks } from "@/lib/progress/decks";
import { masteryCounts, masteryFor } from "@/lib/progress/mastery";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { SET_FOR_YOU, doneToday } from "@/lib/ux/workbookDone";
import { COMMON_GROUPS } from "@/lib/collections/commonGroups";
import { GameArt } from "./art";
import { countOf } from "@/lib/copy/locale";
import { roundName } from "./names";

/**
 * THE PRACTICE PAGE, IN THREE SECTIONS.
 *
 * MOCKUP. Practice keeps your words fresh and answers "what needs doing", the
 * way Games answers "what feels fun". Top to bottom: what is due (Review, with
 * the daily task folded under it), your words (flash cards and the workbook),
 * and the four skills (hear, speak, write, talk). The specialist drills live on
 * the grammar pages they practise, as they already do, so this page never
 * grows a long tail.
 *
 * Names follow the proposed rule for every level: the Estonian name, and its
 * English in parentheses on a quieter line under it.
 */
export async function PracticeLook({ ownerId }: { ownerId: string }) {
  const [review, words, decks, settings, clock] = await Promise.all([
    reviewQueue(ownerId, null, new Date()),
    masteryFor(ownerId),
    listDecks(ownerId),
    readSettings(ownerId, [SETTING_KEYS.workbookDone]),
    learnerDayClock(ownerId),
  ]);
  const ready = review.cards.length;
  const counts = masteryCounts(words);
  const unfinished = counts.struggling + counts.almost + counts.learning;
  const workbookDone = doneToday(settings[SETTING_KEYS.workbookDone], clock.dayKey());
  const stocked = decks.filter((d) => d.wordCount > 0);

  return (
    <Page route="/practice" title="Practice" lead="Keep the words you've met fresh, a few minutes at a time.">
      <div className="flex flex-col gap-12">
        <Section id="due" title="Due now" hint="What the schedule wants from you today.">
          <HeroFan
            eyebrow={<span lang="et">{roundName("/review").et} ({roundName("/review").en})</span>}
            title={ready > 0 ? `${ready} ${ready === 1 ? "card is" : "cards are"} ready` : "Nothing is due right now"}
            text="Each word comes back just before you'd forget it."
            cardsLabel="Where your cards stand"
            cards={[
              { figure: review.dueMore ? `${review.due.length}+` : String(review.due.length), label: "Due now", icon: "Clock" },
              { figure: String(review.fresh.length), label: "New to meet", icon: "Sparkles" },
              { figure: String(unfinished), label: "To work on", icon: "Target" },
            ]}
            action={
              <ButtonLink href="/review" variant={ready > 0 ? "primary" : "secondary"} size="lg" className="whitespace-nowrap">
                {ready > 0 ? "Review now" : "Open it anyway"} <ArrowRight size={17} aria-hidden />
              </ButtonLink>
            }
          />
          <Link
            href="/quest"
            className="glow mt-3 flex items-center gap-4 rounded-[var(--r-lg)] border p-4"
            style={{ borderColor: "var(--edge)", background: "var(--surface)" }}
          >
            <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
              <Target size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <Named {...roundName("/quest")} size="text-lg" />
              <span className="mt-0.5 block text-sm" style={{ color: "var(--ink-2)" }}>Two minutes on the endings you miss most.</span>
            </span>
            <ArrowRight size={18} aria-hidden className="shrink-0" style={{ color: "var(--ink-3)" }} />
          </Link>
        </Section>

        <Section id="words" title="Your words" hint="Practise any set of words, whenever you like.">
          <div className="@container">
            <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
              <Card tone="accent" art={<CardStack />}>
                <Named {...roundName("/review/flashcards")} size="text-3xl" />
                <p className="text-base" style={{ color: "var(--ink-2)" }}>Words you&apos;ve met, asked in new ways and typed from memory.</p>
                <Chips label="Your words">
                  <Chip href="/review/flashcards" title="All words" meta={unfinished > 0 ? `${unfinished} to work on` : undefined} />
                  {stocked.map((d) => <Chip key={d.id} href={`/review/deck/${d.id}`} title={d.name} meta={countOf("en", d.wordCount, "word")} />)}
                </Chips>
                <Chips label={<span><span lang="et">{roundName("/review/common").et}</span> ({roundName("/review/common").en})</span>}>
                  {COMMON_GROUPS.map((g) => <Chip key={g.key} href={`/review/common/${g.slug}`} title={g.title} meta="100 words" />)}
                </Chips>
              </Card>
              <Card tone="butter" art={<WorkbookPage />}>
                <Named {...roundName("/review/workbook")} size="text-3xl" />
                <p className="text-base" style={{ color: "var(--ink-2)" }}>A page of real sentences. Put each word into the form it needs.</p>
                <Chips label="Choose a page">
                  {[
                    { theme: null, title: "Set for you", meta: "Your weakest ending first" },
                    { theme: "pronouns", title: "Personal pronouns", meta: "Through every case" },
                    { theme: "present", title: "Present tense", meta: "Who's doing it" },
                    { theme: "past", title: "Simple past", meta: "What happened" },
                  ].map((c) => (
                    <Chip
                      key={c.theme ?? "set"}
                      href={c.theme ? `/review/workbook?theme=${c.theme}` : "/review/workbook"}
                      title={c.title}
                      meta={c.meta}
                      done={workbookDone.has(c.theme ?? SET_FOR_YOU)}
                    />
                  ))}
                </Chips>
              </Card>
            </div>
          </div>
        </Section>

        <Section id="skills" title="Skills" hint="The four things a conversation needs.">
          <div className="@container">
            <ul className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
              <Skill tone="blush" verb="Hear" items={[
                { href: "/review/listening", ...roundName("/review/listening"), art: "/review/listening" },
                { href: "/review/dictation", ...roundName("/review/dictation") },
              ]} />
              <Skill tone="sky" verb="Speak" items={[{ href: "/review/speaking", ...roundName("/review/speaking"), art: "/review/speaking" }]} />
              <Skill tone="accent" verb="Write" items={[{ href: "/review/describe", ...roundName("/review/describe"), art: "/review/describe" }]} />
              <Skill tone="butter" verb="Talk" items={[{ href: "/situations", ...roundName("/situations"), art: "/situations" }]} />
            </ul>
          </div>
        </Section>

        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          Grammar drills like <span lang="et">Rektsioon</span> (Verb cases) and <span lang="et">Pööramine</span> (Conjugation)
          sit on the <Link href="/grammar" className="font-semibold underline underline-offset-4" style={{ color: "var(--accent-deep)" }}>grammar page</Link> they practise.
        </p>
      </div>
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
function Named({ et, en, size }: { et: string; en: string; size: string }) {
  return (
    <span className="block leading-tight">
      <span lang="et" className={`block font-display font-bold ${size}`} style={{ color: "var(--ink)" }}>{et}</span>
      <span className="block text-base font-semibold" style={{ color: "var(--ink-3)" }}>({en})</span>
    </span>
  );
}

function Card({ tone, art, children }: { tone: string; art: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-[var(--r-xl)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
      <div aria-hidden className="grid h-36 place-items-center" style={{ background: `var(--${tone}-soft)` }}>{art}</div>
      <div className="flex flex-col gap-4 px-5 pb-5">{children}</div>
    </div>
  );
}

function Chips({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="label-xs" style={{ color: "var(--ink-3)" }}>{label}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 10rem), 1fr))" }}>{children}</div>
    </div>
  );
}

function Chip({ href, title, meta, done }: { href: string; title: string; meta?: string; done?: boolean }) {
  return (
    <Link
      href={href}
      className="tap-tint flex min-h-11 flex-col justify-center rounded-[var(--r)] border px-3.5 py-2.5"
      style={done ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : { borderColor: "var(--rule-soft)", background: "var(--raised)" }}
    >
      <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</span>
      {meta && <span className="text-xs" style={{ color: "var(--ink-3)" }}>{meta}</span>}
      {done && <span className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent-deep)" }}><Check size={13} aria-hidden /> Done today</span>}
    </Link>
  );
}

function Skill({ tone, verb, items }: { tone: string; verb: string; items: { href: string; et: string; en: string; art?: string }[] }) {
  const art = items.find((i) => i.art)?.art;
  return (
    <li className="flex flex-col overflow-hidden rounded-[var(--r-xl)]" style={{ background: `var(--${tone}-soft)` }}>
      <div className="px-5 pt-5">
        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--surface)", color: toneInk(tone) }}>{verb}</span>
      </div>
      <div className="grid min-h-36 flex-1 place-items-center px-5 py-3">{art && <GameArt href={art} size="sm" />}</div>
      <div className="flex flex-col gap-1 p-2">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="tap-tint flex items-center justify-between gap-3 rounded-[var(--r)] px-3 py-2.5">
            <Named et={i.et} en={i.en} size="text-xl" />
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: `var(--${tone})`, color: "var(--on-hue)" }}>
              <ArrowRight size={16} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </li>
  );
}

/* --------------------------------------------------------------- drawings */

/** Three cards fanned, the top one turned to its meaning. */
function CardStack() {
  return (
    <div className="relative h-24 w-36">
      {[-10, 4].map((r, i) => (
        <span key={r} className="absolute inset-0 rounded-[var(--r)]" style={{ background: i ? "var(--surface)" : "var(--accent-soft)", transform: `rotate(${r}deg)`, boxShadow: "inset 0 0 0 1px var(--rule)" }} />
      ))}
      <span className="absolute inset-0 grid place-items-center rounded-[var(--r)] text-center" style={{ background: "var(--surface)", transform: "rotate(-2deg)", boxShadow: "inset 0 0 0 2px var(--accent)" }}>
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
    <div className="flex w-60 flex-col gap-2.5 rounded-[var(--r-sm)] px-4 py-3" style={{ background: "var(--surface)", boxShadow: "inset 0 0 0 1px var(--rule)", transform: "rotate(-2deg)" }}>
      <span lang="et" className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
        Ma elan <span className="px-1 underline decoration-2 underline-offset-4" style={{ color: "var(--butter-ink)" }}>Tallinnas</span> <Check size={13} aria-hidden className="inline" style={{ color: "var(--sky-ink)" }} />
      </span>
      <span lang="et" className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
        Ta töötab <span className="inline-block w-12 border-b-2 align-baseline" style={{ borderColor: "var(--butter-ink)" }} /> (kool)
      </span>
      <span className="h-0.5 w-full rounded" style={{ background: "var(--rule)" }} />
    </div>
  );
}
