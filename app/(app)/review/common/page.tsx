import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { TrendingUp } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { commonGroup } from "@/lib/collections/commonGroups";
import { commonCounts } from "@/lib/progress/common";
import { Card, Chip, Empty, Page, Stack } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { DeepenButton } from "./DeepenButton";

export async function generateMetadata() {
  return titleFor("Most common words");
}

export const dynamic = "force-dynamic";

/**
 * THE FOUR LISTS, AS FOUR ROUNDS.
 *
 * `/dictionary/common` is the same four lists as lists: what is on them, in
 * order, with a button that collects a hundred words cheaply. This is the other
 * question about them, which is what to do with them, and the answer is a round
 * per list.
 *
 * Both exist because they are genuinely two things. Reading the hundred
 * commonest verbs is worth doing once; working through them twenty at a time,
 * asked in a different form each morning, is worth doing for a month. The
 * dictionary's page links here and this links back, so neither is a dead end.
 *
 * It carries the counts because they are the one thing that decides which list
 * to press, and `/practice` deliberately does not: that card is four buttons on
 * a page that already asks five questions of the database, and a number nobody
 * is choosing by is not worth a query on the screen somebody opens every day.
 */
export default async function CommonRoundsPage() {
  const ownerId = await requireUserId();
  const [counts, locale] = await Promise.all([commonCounts(ownerId), localeFor(ownerId)]);
  const found = counts.reduce((sum, c) => sum + c.found, 0);

  return (
    <Page
      title={tr(locale, "Most common words")}
      lead={tr(locale, "Counted from film and TV subtitles, so these are the words people really say.")}
    >
      {found === 0 ? (
        /*
          A deployment seeded before the course harvest holds a few hundred
          words and can answer for almost none of these. A real state, fixed by
          a reseed, and saying so is more use than four empty cards.
        */
        <Empty
          title={tr(locale, "The dictionary isn't loaded yet")}
          body={tr(locale, "These rounds come from the dictionary, so there's nothing to ask until it's loaded.")}
          action={<ButtonLink href="/dictionary" variant="primary">{tr(locale, "Open the dictionary")}</ButtonLink>}
        />
      ) : (
        <Stack>
          {counts.filter((c) => c.found > 0).map((count) => {
          const group = commonGroup(count.group);
          return (
            <Card key={group.key}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `var(--${group.tone})`, color: "var(--surface)" }}
                >
                  <TrendingUp size={18} aria-hidden />
                </span>
                <h2 className="min-w-0 text-base font-bold" style={{ color: "var(--ink)" }}>
                  {tr(locale, group.title)}
                </h2>
                <span className="ml-auto">
                  <Chip tone={count.inDeck >= count.found ? "good" : "neutral"}>
                    {fill(tr(locale, "{n} of {total} in your deck"), { n: count.inDeck, total: count.found })}
                  </Chip>
                </span>
              </div>

              <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>{tr(locale, group.blurb)}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {/*
                  The app's own button rather than a link painted to look like
                  one. The hand-rolled version set `--surface` on `--accent`,
                  which is a hue's fill carrying text, and axe measured it under
                  4.5 (docs/14-design-system.md: every hue has an ink).
                */}
                <DeepenButton group={group.key} variant="secondary" />
                <ButtonLink href={`/review/common/${group.slug}`} variant="primary">
                  {tr(locale, "Start the round")}
                </ButtonLink>
              </div>
            </Card>
          );
        })}

          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {tr(locale, "Every word on these lists is one you can learn here.")}{" "}
            <Link
              href="/dictionary/common"
              className="underline"
              style={{ color: "var(--accent-deep)" }}
            >
              {tr(locale, "See the lists in full")}
            </Link>
            .
          </p>
        </Stack>
      )}
    </Page>
  );
}
