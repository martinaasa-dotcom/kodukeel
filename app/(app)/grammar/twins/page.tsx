import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { DrillLink } from "@/components/DrillLink";
import { Card, Chip, Page, SectionTitle, Stack } from "@/components/ui";
import {
  DRIFTED_NOTE, KIND_COPY, KIND_ORDER, groupsOfKind, letterRuns, type TwinGroup,
} from "@/lib/collections/twins";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return titleFor("Words that look alike", {
    description:
      "Estonian words that look alike and mean different things: the pairs a rule builds, the ones English " +
      "calls by one name, and the ones that are just a coincidence.",
  });
}

/**
 * WORDS THAT LOOK ALIKE, AND WHY.
 *
 * The reference half of Kaksikud. Three kinds of look-alike need three kinds
 * of help, so the page is the three rules first, each with every pair it
 * covers, and then the pairs English calls by one name and the pairs that are
 * a coincidence. Every group links into the round drilling just that group.
 *
 * Everything here is read off `lib/collections/twins.ts`, which holds lemmas
 * and English and no Estonian forms. Nothing is generated and nothing is
 * stored.
 */
export default async function TwinsReferencePage() {
  const ownerId = await requireUserId();
  const locale = await localeFor(ownerId);
  const t = (english: string) => tr(locale, english);

  return (
    <Page route="/grammar/twins"
      eyebrow={t("Reference")}
      title={t("Words that look alike")}
      lead={t("Pairs that are easy to mix up, and how to tell them apart.")}
    >
      <Stack>
        <Card tone="night">
          <p className="font-display text-2xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
            {t("Three kinds of look-alike, and each needs a different kind of help.")}
          </p>
          <p className="mt-2 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("Some pairs are one word with a suffix that changes who does what, and a rule unlocks dozens of them. Some are one English word that Estonian splits in two. The rest are a coincidence, and you learn them side by side.")}
          </p>
        </Card>

        <DrillLink href="/review/twins" />

        {KIND_ORDER.map((kind) => (
          <section key={kind} className="flex flex-col gap-3">
            <SectionTitle>{t(KIND_COPY[kind].title)}</SectionTitle>
            <p className="max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {t(KIND_COPY[kind].rule)}
            </p>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {groupsOfKind(kind).map((g) => (
                <li key={g.id}><GroupCard group={g} t={t} /></li>
              ))}
            </ul>
          </section>
        ))}
      </Stack>
    </Page>
  );
}

function GroupCard({ group, t }: { group: TwinGroup; t: (english: string) => string }) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-[var(--r-lg)] border p-4"
      style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}>
      <ul className="flex flex-col gap-1">
        {group.words.map((w) => {
          const other = group.words.find((o) => o.lemma !== w.lemma)?.lemma ?? w.lemma;
          return (
            <li key={w.lemma} className="flex flex-wrap items-baseline gap-x-2">
              <span lang="et" className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                {group.kind === "lookalike"
                  ? letterRuns(w.lemma, other).map((r, k) => (
                      <span key={k} style={r.differs
                        ? { color: "var(--accent-deep)", textDecoration: "underline", textUnderlineOffset: "3px" }
                        : undefined}>{r.text}</span>
                    ))
                  : w.lemma}
              </span>
              <span className="text-base" style={{ color: "var(--ink-2)" }}>{t(w.means)}</span>
            </li>
          );
        })}
      </ul>
      {group.drifted && <span className="self-start"><Chip tone="hard">{t("The rule misleads here")}</Chip></span>}
      {(group.drifted || group.tell) && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {group.drifted ? t(DRIFTED_NOTE) : t(group.tell!)}
        </p>
      )}
      <Link
        href={`/review/twins?group=${encodeURIComponent(group.id)}`}
        className="mt-auto text-sm font-semibold underline"
        style={{ color: "var(--accent-deep)" }}
      >
        {t("Practise this pair")}
      </Link>
    </div>
  );
}
