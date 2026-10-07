import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { oneEntryPerLemma } from "@/lib/dict/search";
import {
  FAMILIAR, FAMILIAR_HEADINGS, SOUND_LETTERS, SPEAKER_ENDINGS, SPEAKER_LEMMAS, SPEAKER_SECTIONS, TYPED_LETTERS,
  caseNameFor, endingFor, type FamiliarWord, type SpeakerPoint,
} from "@/lib/estonian/ukrainian";
import { modeAt } from "@/lib/ux/modes";
import { Card, Page, SectionTitle, Stack } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { fillNodes } from "@/components/reference/fillNodes";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { SAME_SPELLING, sameSpelling } from "@/lib/copy/values";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return titleFor("Estonian for Ukrainian speakers", {
    description: "What your Ukrainian already gives you in Estonian, what is new, the sounds, the keyboard, and the words that look familiar.",
  });
}

/**
 * ESTONIAN SEEN FROM UKRAINIAN.
 *
 * The grammar reference explains Estonian to somebody who thinks in English,
 * and most people reading this app in Ukrainian do not. This page is the same
 * reference turned round: what Ukrainian already gives them, where it leads
 * them wrong, the four vowels and the keyboard, and the words that look like
 * words they know. The prose is `lib/estonian/ukrainian.ts`, which holds no
 * Estonian; every Estonian word on the screen comes into a slot from a lemma
 * list the shipped dictionary is asserted to hold, and the familiar words are
 * printed with the dictionary's own gloss beside them, so a claim on this page
 * is one the entry it links to agrees with.
 *
 * It is a reading rather than a round, so it grades nothing. Every sound point
 * ends in the round that trains it, by the route `lib/ux/modes.ts` names.
 */
export default async function UkrainianSpeakersPage() {
  const ownerId = await requireUserId();
  const [locale, glosses] = await Promise.all([localeFor(ownerId), dictionaryGlosses()]);
  const t = (english: string) => tr(locale, english);

  /** An Estonian word in a slot, marked as Estonian so it is read as one. */
  const et = (text: string): ReactNode => (
    <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>{text}</span>
  );
  const slots: Record<string, ReactNode> = {
    ...Object.fromEntries(Object.entries(SPEAKER_LEMMAS).map(([slot, lemma]) => [slot, et(lemma)])),
    ...Object.fromEntries(Object.entries(TYPED_LETTERS).map(([slot, letter]) => [slot, et(letter)])),
  };
  for (const slot of Object.keys(SPEAKER_ENDINGS)) {
    const ending = endingFor(slot);
    if (ending) slots[slot] = et(ending);
  }
  const part = caseNameFor("part");
  if (part) slots.part = et(part);
  const say = (english: string) => fillNodes(t(english), slots);

  const point = (p: SpeakerPoint) => {
    const mode = p.drill ? modeAt(p.drill) : undefined;
    return (
      <li
        key={p.text}
        className="rounded-[var(--r-lg)] border p-4 text-base leading-relaxed md:p-5"
        style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)", color: "var(--ink)" }}
      >
        {p.letter && (
          <span lang="et" className="font-display mb-1 block text-2xl font-bold leading-none" style={{ color: "var(--accent-deep)" }}>
            {SOUND_LETTERS[p.letter]}
          </span>
        )}
        <span className="block">{say(p.text)}</span>
        {mode && (
          <Link
            href={mode.href}
            className="tap-tint mt-2 inline-flex items-center gap-1.5 rounded-[var(--r-sm)] px-1 text-sm font-semibold"
            style={{ color: "var(--accent-deep)" }}
          >
            {fill(t("Practise it: {round}"), { round: t(mode.title) })}
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </li>
    );
  };

  const word = (w: FamiliarWord) => {
    const gloss = glosses.get(w.lemma);
    return (
      <li
        key={w.lemma}
        className="flex flex-col gap-1 rounded-[var(--r-lg)] border p-4"
        style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
      >
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={`/dictionary?q=${encodeURIComponent(w.lemma)}`}
            className="tap-tint rounded-[var(--r-sm)] px-1"
          >
            <span lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{w.lemma}</span>
          </Link>
          <Speak text={w.lemma} label={fill(t("Hear {word}"), { word: w.lemma })} size={15} />
          <span lang="uk" className="text-md" style={{ color: "var(--ink)" }}>{w.uk}</span>
        </span>
        {/* The dictionary's own English, so the claim beside it is one the
            entry it links to agrees with. Absent where the database did not
            answer, rather than a gloss typed here. */}
        {gloss && (
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            {sameSpelling(w.lemma, gloss) ? t(SAME_SPELLING) : fill(t("In the dictionary: {gloss}"), { gloss })}
          </span>
        )}
        {w.note && <span className="text-sm" style={{ color: "var(--ink-2)" }}>{say(w.note)}</span>}
      </li>
    );
  };

  return (
    <Page
      eyebrow={t("Reference")}
      title={t("Estonian for Ukrainian speakers")}
      lead={t("What your Ukrainian already gives you, and where it leads you astray.")}
      actions={(
        <Link href="/grammar" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-deep)" }}>
          <ArrowLeft size={14} aria-hidden /> {t("All grammar")}
        </Link>
      )}
    >
      <Stack>
        {SPEAKER_SECTIONS.map((section) => (
          <section key={section.id} id={section.id}>
            <SectionTitle>{t(section.title)}</SectionTitle>
            <p className="mb-3 max-w-[68ch] text-base" style={{ color: "var(--ink-2)" }}>{say(section.lead)}</p>
            {section.id === "words" ? (
              <div className="flex flex-col gap-5">
                {(["familiar", "misleading"] as const).map((kind) => (
                  <Card key={kind}>
                    <h3 className="text-md font-bold" style={{ color: "var(--ink)" }}>{t(FAMILIAR_HEADINGS[kind])}</h3>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                      {FAMILIAR.filter((w) => w.kind === kind).map(word)}
                    </ul>
                  </Card>
                ))}
              </div>
            ) : (
              <ul className="flex flex-col gap-2">{section.points.map(point)}</ul>
            )}
          </section>
        ))}
      </Stack>
    </Page>
  );
}

/**
 * The dictionary's English gloss for each familiar word, one entry a lemma.
 *
 * A reference renders whether or not the database is having a good minute,
 * which is the rule the grammar index's own strip follows, so a failure here
 * leaves the glosses out rather than the page.
 */
async function dictionaryGlosses(): Promise<Map<string, string>> {
  const lemmas = FAMILIAR.map((w) => w.lemma);
  try {
    const rows = await prisma.lexeme.findMany({
      where: { lemma: { in: lemmas } },
      select: { id: true, lemma: true, pos: true, provenance: true, translation: true, forms: { select: { id: true } } },
      orderBy: [{ lemma: "asc" }, { id: "asc" }],
    });
    return new Map(oneEntryPerLemma(rows, lemmas).map((row) => [row.lemma, row.translation]));
  } catch {
    return new Map();
  }
}
