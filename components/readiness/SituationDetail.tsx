import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ButtonLink } from "@/components/Button";
import { Card, Chip, Meter, Note, SectionTitle } from "@/components/ui";
import { EVIDENCE_NOTE } from "@/lib/exam/readiness";
import {
  CONVERSATIONAL_MS, RUNG_LABEL, SLOW_MS, wordStanding, type Reading,
} from "@/lib/readiness/rungs";
import type { WordEvidence } from "@/lib/readiness/evidence";
import { paceWords, verdictFor } from "@/lib/readiness/narrative";
import { RUNG_INK, RungChip } from "./Rung";
import { SCENES } from "@/lib/scenes/catalogue";
import { Explain } from "@/components/Explain";
import { fill, tr, type Locale } from "@/lib/copy/locale";
import { fillNodes } from "@/components/TemplateNodes";
import { sayIn } from "@/lib/copy/said";

/**
 * One situation, in full: the verdict, the three rungs as three bars, what
 * stands in the way of the next one, and the thing worth going out and doing.
 *
 * The struggles are the point of the page and come before the encouragement,
 * because somebody who reads "you could take part" and stops has read the
 * headline; the line under it about pace is what they meet at the counter.
 * The encouragement is real and is printed only once the log supports it.
 */
export function SituationDetail({
  reading, words, locale,
}: {
  reading: Reading;
  locale: Locale;
  /** The situation's words with their evidence, for the list at the bottom. */
  words: readonly { lemma: string; gloss: string; evidence: WordEvidence | undefined }[];
}) {
  const { situation, rung, at, total, pace, struggles, evidence } = reading;
  const t = (english: string) => tr(locale, english);
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  /*
    Where the course has a scene that takes this very claim apart, the honest
    thing between "you could take part" and the counter is to rehearse it on
    somebody who wants something from you. A scene names the unit it tests,
    so this is a lookup rather than a second table.
  */
  const scene = SCENES.find((s) => s.tests === situation.id);
  const missing = words.filter((w) => {
    const s = wordStanding(w.evidence);
    return s === "unmet" || s === "met";
  });

  return (
    <div lang={locale} className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <RungChip rung={rung} locale={locale} />
          <Chip tone="neutral">{situation.level}</Chip>
          {situation.live && <Chip tone="sky">{t("Live conversation")}</Chip>}
        </div>
        <p className="mt-3 text-lg font-semibold leading-snug" style={{ color: "var(--ink)" }}>
          {verdictFor(reading, locale)}
        </p>
        {rung === "unmet" ? (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(t("You haven't practised any of these {total} words yet. Start with the unit they come from."), { total })}
          </p>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
            {t(EVIDENCE_NOTE[evidence])} {fill(t("{answers} answers across {total} words, and none of them spoken out loud."), { answers: reading.answers, total })}
          </p>
        )}
        {reading.uncapped !== rung && (
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(t("Going by your answers so far, you might already be at {rung}. A few more answers and we'll know."), { rung: t(RUNG_LABEL[reading.uncapped].toLowerCase()) })}
          </p>
        )}
      </Card>

      <section>
        <SectionTitle hint={t("how many of the words are ready")}>{t("From following to leading")}</SectionTitle>
        <Card>
          <ul className="flex flex-col gap-4">
            <Bar
              locale={locale}
              label={t("Follow it")} ink={RUNG_INK.follow} n={at.follow} total={total} pct={pct(at.follow)}
              what={t("Words you know when you see them. Enough to follow what's being said to you.")}
            />
            <Bar
              locale={locale}
              label={t("Take part")} ink={RUNG_INK.takePart} n={at.takePart} total={total} pct={pct(at.takePart)}
              what={t("Words you can come up with yourself. You've typed them right more than once, last time included.")}
            />
            <Bar
              locale={locale}
              label={t("Lead it")} ink={RUNG_INK.lead} n={at.lead} total={total} pct={pct(at.lead)}
              what={t(situation.live
                ? "Words you know in several forms and can find fast. You also need the endings and numbers this conversation uses, and to show you can follow it spoken."
                : "Words you know in several forms, plus the endings this situation needs.")}
            />
          </ul>
        </Card>
      </section>

      {situation.live && rung !== "unmet" && (
        <section>
          <SectionTitle hint={t("timed on typed answers, so a little generous")}>{t("Speed")}</SectionTitle>
          <Card>
            {pace.medianMs === null ? (
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                {t("Not enough timed answers yet to tell how fast these words come to you. Knowing a word and finding it in two seconds aren't the same, and someone waiting for your answer needs the second.")}
              </p>
            ) : (
              <>
                <p className="text-base" style={{ color: "var(--ink)" }}>
                  {fill(t("These words come to you in about {time} each, measured over {n} of them."), { time: paceWords(pace.medianMs, locale), n: pace.timedWords })}
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  {t(pace.label === "quick"
                    ? "Quick enough to answer before the other person fills the silence."
                    : pace.label === "steady"
                      ? "Fine for a patient listener. Leading a conversation means reaching for your next word while they're still finishing theirs."
                      : "Slow enough that someone at a counter will jump in for you, usually in English. Speed comes with practice, on top of knowing the word.")}
                </p>
                <Explain label={t("How quick and slow are decided")}>
                  {fill(t("We time your correct typed answers, typing included. Under {quick} seconds counts as quick and over {slow} as slow. Those cut-offs are our guess, so the seconds are shown too."), { quick: CONVERSATIONAL_MS / 1000, slow: SLOW_MS / 1000 })}
                </Explain>
              </>
            )}
          </Card>
        </section>
      )}

      {struggles.length > 0 && (
        <section>
          <SectionTitle hint={t("biggest problem first")}>{t("Where it would go wrong")}</SectionTitle>
          <ul className="flex flex-col gap-3">
            {struggles.map((s) => (
              <li key={s.id}>
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="neutral">{fill(t("holds you back from {rung}"), { rung: t(RUNG_LABEL[s.blocks].toLowerCase()) })}</Chip>
                  </div>
                  <p className="mt-2 font-semibold" style={{ color: "var(--ink)" }}>{sayIn(locale, s.said.title)}</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{sayIn(locale, s.said.detail)}</p>
                  {s.href && s.cta && (
                    <div className="mt-3">
                      <ButtonLink href={s.href} size="sm">{t(s.cta)}</ButtonLink>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {scene && rung !== "unmet" && (
        <section>
          <SectionTitle hint={t("a practice run here, before the real thing")}>{t("Rehearse it first")}</SectionTitle>
          <Card tone="sky">
            <p className="text-base font-semibold" style={{ color: "var(--sky-ink)" }}>{t(scene.title)}</p>
            <p className="mt-1.5 text-sm" style={{ color: "var(--sky-ink)" }}>
              {t(scene.place)}. {t("It's marked just like your cards, never by an AI, and it's the nearest thing to the real conversation you'll find here.")}
            </p>
            <div className="mt-3">
              <ButtonLink href={`/situations/${scene.id}`} size="sm">{t("Play the scene")}</ButtonLink>
            </div>
          </Card>
        </section>
      )}

      {reading.tryThis ? (
        <section>
          <SectionTitle hint={t("your answers say you're ready")}>{t("Try it for real")}</SectionTitle>
          <Card tone="sky">
            <p className="text-base font-semibold" style={{ color: "var(--sky-ink)" }}>{t(reading.tryThis)}</p>
            {situation.expect && (
              <p className="mt-2 text-sm" style={{ color: "var(--sky-ink)" }}>{fill(t("What you might hear back: {what}"), { what: t(situation.expect) })}</p>
            )}
            <p className="mt-2 text-sm" style={{ color: "var(--sky-ink)" }}>
              {t("It won't go as smoothly as a card, and that's fine. Whatever you couldn't say, look up afterwards.")}
            </p>
          </Card>
        </section>
      ) : situation.expect ? (
        <Note tone="neutral">
          {fill(t("When you do try this, expect {what}"), { what: `${t(situation.expect).charAt(0).toLowerCase()}${t(situation.expect).slice(1)}` })}
        </Note>
      ) : null}

      {missing.length > 0 && (
        <section>
          <SectionTitle hint={fill(t("{n} of {total}"), { n: missing.length, total })}>{t("Words to learn first")}</SectionTitle>
          <Card>
            <ul className="flex flex-wrap gap-2">
              {missing.map((w) => (
                <li key={w.lemma}>
                  <Link
                    href={`/dictionary?q=${encodeURIComponent(w.lemma)}`}
                    className="tap-tint inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                    style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
                  >
                    <span lang="et" className="font-semibold">{w.lemma}</span>
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>{w.gloss}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {situation.live && (
        <Explain label={t("What this page doesn't measure")}>
          {fillNodes(t("Nothing on this page has heard you speak. How you sound is yours to judge, in {link}, and no number here pretends otherwise."), {
            link: <Link href="/review/speaking" className="underline" style={{ color: "var(--accent-deep)" }}>{t("speaking practice")}</Link>,
          })}
        </Explain>
      )}
    </div>
  );
}

function Bar({ label, ink, n, total, pct, what, locale }: {
  label: string; ink: string; n: number; total: number; pct: number; what: string; locale: Locale;
}) {
  const words = fill(tr(locale, "{n} of {total} words"), { n, total });
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold" style={{ color: ink }}>{label}</span>
        <span className="tnum text-xs" style={{ color: "var(--ink-3)" }}>{words}</span>
      </div>
      <div className="mt-1.5">
        <Meter pct={pct} label={`${label}: ${words}`} tone="var(--accent)" height={7} />
      </div>
      <p className="mt-1.5 text-xs" style={{ color: "var(--ink-3)" }}>{what}</p>
    </li>
  );
}
