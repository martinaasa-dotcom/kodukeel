import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { StatTile } from "@/components/ui";
import { RosterList } from "@/components/class/RosterList";
import { tr } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { SAMPLE_CLASS } from "@/lib/classroom/sample";
import { resolveOperator } from "@/lib/legal/operator";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "For teachers", undefined, {
    description: "Put a code on the board. See who is practising and what the group keeps getting wrong.",
    path: "/teachers",
  });
}

/*
  Like /trust: whether a mail link is drawn is a fact about the deployment, so
  a page baked at build time would describe whichever machine ran the build.
*/
export const dynamic = "force-dynamic";

/**
 * WHAT A TEACHER SEES, SHOWN RATHER THAN DESCRIBED.
 *
 * A teacher deciding whether to put a code on a board wants to know what the
 * roster looks like, and until now the only way to find out was to make a
 * class and wait for people to join it. This page draws the class page's own
 * stat tiles and roster list (`components/class/RosterList.tsx`) over an
 * invented class (`lib/classroom/sample.ts`), so what is on it is exactly the
 * drawing a teacher gets, and nothing on it is anybody real.
 *
 * Every claim is one the class page and `/privacy` already make: the effort
 * figures, the one case each learner finds hardest, the class's weakest cases,
 * and never a deck, a search or an answer. "13 and older" is the operator's
 * standing decision (docs/37-second-batch.md, D1).
 */
export default async function TeachersPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicLocale(searchParams);
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  const contact = resolveOperator().email;
  const subject = encodeURIComponent(t("A Kodukeel pilot"));

  return (
    <Legal title={t("For teachers")} updated="14 October 2026" locale={locale} explicit={explicit} path="/teachers">
      <P>{t("Put a code on the board. See who is practising and what the group keeps getting wrong.")}</P>

      {/*
        Not inside a card: the roster rows take the full width of the column,
        as they do on the class page, or a long Russian label squeezes the
        name to a sliver at 360.
      */}
      <section aria-labelledby="sample-class">
        <h2 id="sample-class" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
          {t("A sample class")}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
          {t("These learners are invented. Nobody here is real.")}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile value={SAMPLE_CLASS.entries.length} label={t("Members")} tone="sky" />
          <StatTile value={SAMPLE_CLASS.activeThisWeek} label={t("Active this week")} tone="sky" />
          <StatTile value={SAMPLE_CLASS.totalReviewsThisWeek} label={t("Reviews this week")} tone="accent" />
        </div>
        <div className="mt-5" data-sample-roster>
          <RosterList entries={SAMPLE_CLASS.entries} viewerId="sample-viewer" isTeacher locale={locale} />
        </div>
      </section>

      <S title={t("What you see")}>
        <P>{t("A roster with each person’s reviews this week, streak, words known and days since their last review. The one case each person finds hardest. And what the whole class is weakest at, which is next week’s lesson.")}</P>
      </S>

      <S title={t("What you never see")}>
        <P>{t("Anybody’s deck, their searches or their answers. A learner can leave a class at any time, and nothing they have learned goes with them.")}</P>
      </S>

      <S title={t("Starting takes five minutes")}>
        <ol className="list-decimal space-y-1.5 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>{t("Sign in and open Classes.")}</li>
          <li>{t("Create a class and print the poster.")}</li>
          <li>{t("Learners scan the code or open the link, sign in and press Join.")}</li>
          <li>{t("Set homework from any unit when you are ready.")}</li>
        </ol>
      </S>

      <S title={t("Who it is for")}>
        <P>{t("For learners aged 13 and older. Younger pupils need an agreement with their school first.")}</P>
      </S>

      <S title={t("What it costs")}>
        <P>
          {t("Nothing. The app is free and the code is open.")}{" "}
          <Link href={href("/funding")} className="underline underline-offset-2">{t("What it costs to run")}</Link>
        </P>
      </S>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base font-semibold">
        <li>
          <Link href={href("/trust")} className="underline underline-offset-4" style={{ color: "var(--accent-deep)" }}>
            {t("How the data is handled")}
          </Link>
        </li>
        <li>
          <Link href="/pilots" className="underline underline-offset-4" style={{ color: "var(--accent-deep)" }}>
            {t("How a pilot works")}
          </Link>
        </li>
        {contact && (
          <li>
            <a href={`mailto:${contact}?subject=${subject}`} className="underline underline-offset-4" style={{ color: "var(--accent-deep)" }}>
              {t("Write to us about a pilot")}
            </a>
          </li>
        )}
      </ul>
    </Legal>
  );
}
