import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight, Languages, Puzzle, TriangleAlert, Waypoints } from "lucide-react";
import { viewerId } from "@/lib/auth/session";
import { PublicReference, referenceHref } from "@/components/grammar/PublicReference";
import { isPublicReference } from "@/lib/ux/publicReference";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";
import { publicCard } from "@/lib/copy/publicCards";
import { caseReference, grammarTopic, TOPIC_GROUPS } from "@/lib/estonian/grammar";
import { CASES } from "@/lib/estonian/cases";
import { caseAccuracy } from "@/lib/stats/history";
import { caseReviewsFor } from "@/lib/progress/cases";
import { exceptionScale } from "@/lib/progress/exceptions";
import { familyStandings } from "@/lib/progress/exceptionStanding";
import { FAMILY_ORDER } from "@/lib/games/exceptionPaths";
import { Card, Chip, Meter, Page, Stack } from "@/components/ui";
import { localeFor } from "@/lib/progress/locale";
import { fill, grouped, tr } from "@/lib/copy/locale";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "Grammar: four short stops", undefined, publicCard("/grammar"));
}

/**
 * THE GRAMMAR PATH: FOUR STOPS, IN THE ORDER A LEARNER NEEDS THEM.
 *
 * This used to be the fourteen-case reference, with the introduction and the
 * exceptions hanging off the bottom of it, and all of it filed under the
 * dictionary. The reference is still there, at `/grammar/cases`, as stop two.
 * What this page adds is the order, and a way to tell where you are in it.
 *
 * WHERE YOU ARE IS ONLY WHAT THE LOG CAN SAY. Reading a page writes nothing, so
 * stop one and stop four have no "done": a tick there would be the app claiming
 * it watched somebody read. Stop two counts the cases the learner has answered
 * on, and stop three says how many of the four exception areas they are known
 * in (`standingOf`). Both are derived on each visit and stored nowhere
 * (ADR-014).
 */
const CASES_TOTAL = CASES.length;

export default async function GrammarHubPage({ searchParams }: { searchParams: PublicSearch }) {
  /*
    Signed out, this is the public reference (FB-8): nobody's log is read, so
    there is no "where you are", the next stop is the first, and the
    exceptions stop is named without a link, since that area reads a
    learner's own words and stays signed in.
  */
  const viewer = await viewerId();
  const [reviews, standings, scale, place] = await Promise.all([
    viewer ? caseReviewsFor(viewer) : Promise.resolve([]),
    viewer ? familyStandings(viewer) : Promise.resolve(null),
    exceptionScale(),
    viewer ? localeFor(viewer).then((locale) => ({ locale, explicit: false })) : resolvePublicLocale(searchParams),
  ]);
  const { locale, explicit } = place;
  const t = (english: string) => tr(locale, english);
  const go = viewer ? (to: string) => to : referenceHref(locale, explicit);

  const practised = caseAccuracy(reviews, 1).length;
  const knownAreas = standings ? FAMILY_ORDER.filter((f) => standings[f].state === "known").length : 0;

  // First stop that has something left in it, going by what the log can show.
  const next: 1 | 2 | 3 | 4 =
    practised === 0 ? 1 : practised < CASES_TOTAL ? 2 : knownAreas < FAMILY_ORDER.length ? 3 : 4;

  const casePeek = (["INESSIVE", "ELATIVE", "ILLATIVE", "ADESSIVE"] as const).flatMap((key) => {
    const ref = caseReference(key);
    return ref ? [{ key, text: `-${ref.spec.suffix} ${t(ref.plain)}` }] : [];
  });
  const verbTopics = (TOPIC_GROUPS.find((g) => g.id === "verb")?.ids ?? []).slice(0, 4).flatMap((id) => {
    const topic = grammarTopic(id);
    return topic ? [{ id, title: t(topic.title) }] : [];
  });

  const stops = [
    {
      n: 1 as const, href: "/grammar/build-a-word", Icon: Puzzle,
      title: t("Build a word"),
      line: t("Learn three forms of a word and get eleven more for free."),
      peek: [] as string[], meter: null as null | { pct: number; label: string },
    },
    {
      n: 2 as const, href: "/grammar/cases", Icon: Languages,
      title: t("The fourteen cases"),
      line: t("What each ending means, with real sentences for every one."),
      peek: casePeek.map((c) => c.text),
      meter: viewer ? { pct: Math.round((practised / CASES_TOTAL) * 100), label: fill(t("{n} of {total} cases you have answered on"), { n: practised, total: CASES_TOTAL }) } : null,
    },
    {
      n: 3 as const, href: "/grammar/exceptions", Icon: TriangleAlert,
      title: t("Where the rules break"),
      line: t("Some words go their own way. Which ones, and how to learn them."),
      peek: [fill(t("{n} words that break a rule"), { n: grouped(locale, scale) })],
      meter: viewer ? { pct: Math.round((knownAreas / FAMILY_ORDER.length) * 100), label: fill(t("{n} of {total} areas known"), { n: knownAreas, total: FAMILY_ORDER.length }) } : null,
    },
    {
      n: 4 as const, href: verbTopics[0] ? `/grammar/topic/${verbTopics[0].id}` : "/grammar/cases", Icon: Waypoints,
      title: t("The verb"),
      line: t("Now and before, and the forms for polite requests and orders."),
      peek: verbTopics.map((v) => v.title), meter: null as null | { pct: number; label: string },
    },
  ];
  const nextStop = stops[next - 1]!;
  // Signed out, the exceptions area is named and not linked: it reads a learner's own words.
  const locked = (href: string) => !viewer && !isPublicReference(href);
  const boxClass = "mb-1 flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--r-lg)] border p-5";

  const page = (
    <Page route="/grammar"
      eyebrow={t("Reference")}
      title={t("Grammar")}
      lead={t("Four short stops. Do them in order, or jump to the one you need.")}
    >
      <Stack>
        <Card tone="night" className="md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0 flex-[1_1_22rem]">
              <p className="label-xs" style={{ color: "var(--butter-ink)" }}>{t("Your path")}</p>
              <h2 className="font-display mt-2 text-2xl font-bold leading-tight md:text-3xl" style={{ color: "var(--ink)", textWrap: "balance" }}>
                {t("Three forms you learn. Eleven you work out.")}
              </h2>
              <p className="mt-2 max-w-[56ch] text-md" style={{ color: "var(--ink-2)" }}>
                {t("That is most of Estonian grammar. The other stops cover what the rule leaves out.")}
              </p>
            </div>
            <Link
              href={go(nextStop.href)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: "var(--cta)", color: "var(--cta-ink)" }}
            >
              {fill(practised === 0 ? t("Start: {stop}") : t("Continue: {stop}"), { stop: nextStop.title })}
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        </Card>

        <ol className="flex flex-col gap-4">
          {stops.map((s, i) => (
            <li key={s.n} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className="tnum flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-md font-bold"
                  style={s.n === next
                    ? { background: "var(--cta)", color: "var(--cta-ink)" }
                    : { background: "var(--raised)", color: "var(--ink-2)", border: "1px solid var(--edge)" }}
                >
                  {s.n}
                </span>
                {i < stops.length - 1 && <span aria-hidden className="mt-1 w-0.5 flex-1" style={{ background: "var(--edge)" }} />}
              </div>
              <StopBox
                href={locked(s.href) ? null : go(s.href)}
                className={boxClass}
                style={{
                  borderColor: s.n === next ? "var(--accent-deep)" : "var(--edge)",
                  background: "var(--surface)",
                  boxShadow: "var(--depth-sm)",
                }}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-lg font-bold" style={{ color: "var(--ink)" }}>
                    <s.Icon size={18} aria-hidden style={{ color: "var(--accent-deep)" }} /> {s.title}
                  </span>
                  {s.n === next && <Chip tone="accent">{t("Next up")}</Chip>}
                  {locked(s.href) && <Chip>{t("In the app")}</Chip>}
                </span>
                <span className="text-md" style={{ color: "var(--ink-2)" }}>{s.line}</span>
                {s.peek.length > 0 && (
                  <span className="flex flex-wrap gap-2 pt-1">
                    {s.peek.map((p) => (
                      <span key={p} className="rounded-full px-3 py-1 text-sm" style={{ background: "var(--raised)", color: "var(--ink-2)" }}>{p}</span>
                    ))}
                  </span>
                )}
                {s.meter && (
                  <span className="mt-1 block max-w-[20rem]">
                    <Meter pct={s.meter.pct} label={s.meter.label} tone="var(--accent)" height={5} />
                    <span className="tnum mt-1 block text-sm" style={{ color: "var(--ink-3)" }}>{s.meter.label}</span>
                  </span>
                )}
              </StopBox>
            </li>
          ))}
        </ol>

        {viewer && (
          <Link
            href="/grammar/sounds"
            className="lift flex flex-wrap items-center gap-4 rounded-[var(--r-lg)] border p-5"
            style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
            data-sounds-link
          >
            <span className="flex shrink-0 gap-1.5" aria-hidden>
              {["õ", "ä", "ö", "ü"].map((letter) => (
                <span key={letter} className="snd-key snd-key-sm"><span lang="et" className="snd-glyph">{letter}</span></span>
              ))}
            </span>
            <span className="flex min-w-0 flex-[1_1_16rem] flex-col gap-0.5">
              <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>{t("How Estonian sounds")}</span>
              <span className="text-md" style={{ color: "var(--ink-2)" }}>{t("Every sound, said by a native speaker. Press a letter and hear it.")}</span>
            </span>
            <ArrowRight size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />
          </Link>
        )}

        <Card>
          <p className="text-md font-bold" style={{ color: "var(--ink)" }}>{t("Looking for something specific?")}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            <Link href={go("/grammar/cases")} className="underline" style={{ color: "var(--accent-deep)" }}>{t("Every ending and every grammar topic, in one list")}</Link>
          </p>
          {viewer && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              <Link href="/grammar/twins" className="underline" style={{ color: "var(--accent-deep)" }}>{t("Words that look alike, and how to tell them apart")}</Link>
            </p>
          )}
        </Card>
      </Stack>
    </Page>
  );
  if (viewer) return page;
  return <PublicReference locale={locale} explicit={explicit} path="/grammar">{page}</PublicReference>;
}

/** A stop: a link to it, or, where it needs an account, the same card with nothing to press. */
function StopBox({ href, className, style, children }: {
  href: string | null; className: string; style: React.CSSProperties; children: React.ReactNode;
}) {
  if (href === null) return <div className={className} style={style}>{children}</div>;
  return <Link href={href} className={`lift ${className}`} style={style}>{children}</Link>;
}
