import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { TrendingUp } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { COMMON_BATCH, commonGroup } from "@/lib/collections/commonGroups";
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

  /*
    ONE LOUD BUTTON, ON THE PART TO DO NEXT.

    Every part of every list carried a primary button, sixteen of them in one
    column, so the page was a wall of gold and the one thing it could tell a
    learner, which part comes next, was the one thing it did not say. The
    first part not yet in the deck is the gold one, or the first part of all
    once everything is; the rest are the quiet key.
  */
  const lists = counts.filter((c) => c.found > 0);
  const parts = lists.flatMap((c) => c.parts.filter((p) => p.found > 0).map((p, i) => ({ group: c.group, n: i + 1, whole: p.inDeck >= p.found })));
  const lead = parts.find((p) => !p.whole) ?? parts[0];
  const isLead = (group: string, n: number) => lead !== undefined && lead.group === group && lead.n === n;

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
          {lists.map((count) => {
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

              <ul className="mt-4 flex flex-col gap-3">
                {count.parts.filter((p) => p.found > 0).map((part, i) => {
                  const n = i + 1;
                  const first = i * COMMON_BATCH + 1;
                  const last = i * COMMON_BATCH + part.found;
                  const href = `/review/common/${group.slug}?part=${n}`;
                  const whole = part.inDeck >= part.found;
                  return (
                    <li key={n} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      {/* At least 12rem for the words, so on a phone the button
                          drops under them rather than squeezing "Part 1 words 1
                          to 25" into four lines beside it. */}
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                          {fill(tr(locale, "Part {n}"), { n })}
                          <span className="font-normal" style={{ color: "var(--ink-2)" }}>
                            {" "}{fill(tr(locale, "words {first} to {last}"), { first, last })}
                          </span>
                        </p>
                        {/*
                          WHAT A PART IS WORTH PRESSING FOR: how many of its
                          words are learned, which is the scheduler's reading
                          rather than a count of cards added. A bar as well as
                          the words, since a column of four parts is read at
                          a glance.
                        */}
                        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                          {part.inDeck === 0
                            ? tr(locale, "Not in your deck yet")
                            : fill(tr(locale, "{known} of {total} learned"), { known: part.known, total: part.found })}
                        </p>
                        {part.inDeck > 0 && (
                          <span aria-hidden className="mt-1.5 block h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full" style={{ background: "var(--scale-track)" }}>
                            <span className="block h-full rounded-full" style={{ width: `${Math.round((part.known / part.found) * 100)}%`, background: "var(--scale-3)" }} />
                          </span>
                        )}
                      </div>
                      {whole ? (
                        <ButtonLink href={href} variant={isLead(count.group, n) ? "primary" : "secondary"}>{tr(locale, "Start")}</ButtonLink>
                      ) : (
                        <DeepenButton
                          group={group.key}
                          part={n}
                          goTo={href}
                          variant={isLead(count.group, n) ? "primary" : "secondary"}
                          label={tr(locale, "Add and start")}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
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
