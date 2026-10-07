import { BookOpen, Headphones, Mic, PenLine } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { P, PublicFooter, S, switcherHrefs } from "@/components/Legal";
import { LanguageSwitcher, TranslationNotice } from "@/components/PublicLanguage";
import { tr, type Locale } from "@/lib/copy/locale";
import { LANDING_HREF, localeHref } from "@/lib/copy/publicLocale";
import { GUIDE, MATERIALS, READ_ON, SOURCES, type Fact } from "@/lib/exam/official";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "The state examination", {
    description: "What the Estonian language examination is, who needs which level, how to register, and what happens after.",
  });
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "25 September 2026", with the month in the page's language and case. */
function spelledDay(iso: string, locale: Locale): string {
  const [year, month, day] = iso.split("-").map(Number);
  const name = MONTHS[(month ?? 1) - 1] ?? "";
  return `${day} ${locale === "en" ? name : tr(locale, name, "date")} ${year}`;
}

function sourcesOf(facts: readonly Fact[]) {
  return [...new Set(facts.map((f) => f.source))].map((key) => SOURCES[key]);
}

/**
 * What the state examination is, off the state's own pages.
 *
 * In Russian and Ukrainian the facts and the source labels are read through
 * the public area (lib/copy/i18n/areas/public.ts); every link still goes to
 * the page the fact came from, which is in Estonian or English, and the page
 * says the facts were checked against those rather than against a translation.
 */
export default async function StateExamPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicLocale(searchParams);
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  return (
    <main lang={locale} className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link href={locale === "en" ? "/" : LANDING_HREF[locale]} className="label-xs inline-block" style={{ color: "var(--ink-3)" }}>
          Kodukeel
        </Link>
        <LanguageSwitcher locale={locale} hrefs={switcherHrefs("/state-exam")} />
      </div>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight" style={{ color: "var(--ink)" }}>
        {t("The state examination")}
      </h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
        {t("Checked against the state’s own pages on")} {spelledDay(READ_ON, locale)}
      </p>
      <TranslationNotice locale={locale} className="mt-5" />

      {/*
        The examination at a glance, drawn: the four levels it sets and the four
        parts every level has. Both are facts the first section below states
        with its source, so this repeats them as a picture rather than adding a
        claim of its own.
      */}
      <div
        className="mt-8 grid gap-5 rounded-[var(--r-lg)] border p-5"
        style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
      >
        <div>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Four levels")}</p>
          <ul className="mt-2 flex gap-2">
            {["A2", "B1", "B2", "C1"].map((level) => (
              <li
                key={level}
                className="font-display flex h-12 w-12 items-center justify-center rounded-[var(--r)] text-lg font-bold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
              >
                {level}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Four parts at every level")}</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-3">
            {[
              { name: "Writing", Icon: PenLine },
              { name: "Listening", Icon: Headphones },
              { name: "Reading", Icon: BookOpen },
              { name: "Speaking", Icon: Mic },
            ].map(({ name, Icon }) => (
              <li key={name} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--raised)", color: "var(--ink-2)" }}>
                  <Icon size={19} aria-hidden />
                </span>
                <span className="text-xs" style={{ color: "var(--ink-2)" }}>{t(name)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <P>
          {t("Every fact below links to the page it came from. Rules and dates do change, so check that page before you register.")}
        </P>

        {GUIDE.map((section) => (
          <S key={section.id} title={t(section.title)}>
            <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {section.facts.map((fact) => (
                <li key={fact.text}>{t(fact.text)}</li>
              ))}
            </ul>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              {tr(locale, "From", "source")}{" "}
              {sourcesOf(section.facts).map((source, i) => (
                <span key={source.href}>
                  {i > 0 ? ` ${t("and")} ` : ""}
                  <a href={source.href} className="underline underline-offset-2" rel="noreferrer">
                    {t(source.label)}
                  </a>
                </span>
              ))}
            </p>
          </S>
        ))}

        <S title={t("The best free preparation there is")}>
          <P>
            {t("The Board publishes its own practice materials, for free. Start with these before anything else, this app included.")}
          </P>
          <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {MATERIALS.map((material) => (
              <li key={material.href}>
                <a href={material.href} className="underline underline-offset-2" rel="noreferrer">
                  {t(material.label)}
                  {material.level ? `, ${material.level}` : ""}
                </a>
              </li>
            ))}
          </ul>
        </S>

        <S title={t("Where Kodukeel fits")}>
          <P>
            {t("Kodukeel sets a mock paper at A2, B1, B2 and C1, plus one of its own at A1. Each one keeps the published time limits, the points, the pass mark and the rule that you fail if any part scores zero, and every task tells you which official task it stands in for. The questions are built from sentences a lexicographer recorded, so they aren’t the Board’s own. Nothing here scores your pronunciation, and it’s free.")}
          </P>
          <P>
            <Link href="/exam" className="underline underline-offset-2">{t("Sit a mock paper")}</Link>
            {", "}
            <Link href={href("/welcome")} className="underline underline-offset-2">{t("What Kodukeel is")}</Link>
          </P>
        </S>
      </div>

      <PublicFooter locale={locale} explicit={explicit} href={href} short />
    </main>
  );
}
