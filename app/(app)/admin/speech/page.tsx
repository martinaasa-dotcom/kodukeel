import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { adminsConfigured, isAdmin, requireAdminId } from "@/lib/auth/admin";
import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { speechReport } from "@/lib/progress/speechReport";
import { CHAT_MIN_NEW } from "@/lib/scenes/specs/chat";
import {
  EDIT_ALARM_SHARE, EDIT_ALARM_TURNS, SPEECH_FLOOR, enoughToShow, type EditRow, type RecallSide,
} from "@/lib/stats/speechReport";
import { MIN_TURNS_A_MONTH } from "@/lib/stats/spoken";
import { fill, tr, type Locale } from "@/lib/copy/locale";
import { BackLink, Card, Empty, Page, SectionTitle, Stack } from "@/components/ui";

export async function generateMetadata() {
  return titleFor("Speech figures");
}

export const dynamic = "force-dynamic";

const NUMBER_TAG: Record<Locale, string> = { en: "en-GB", ru: "ru-RU", uk: "uk-UA" };

/**
 * THE SPEECH FIGURES, FOR WHOEVER RUNS THIS COPY (docs/44-sixth-batch.md C-3).
 *
 * What `npm run report:speech` prints, read off the same rows by the same
 * code (`lib/progress/speechReport.ts`), so the operator can read it after the
 * first fortnight without a connection string. Two more readings the command
 * never printed: conversation turns answered by ear, and the median words in a
 * spoken turn by month, which Progress shows each learner for themselves.
 *
 * It reads the whole deployment and names nobody: every figure is a count or
 * a share over everybody, and nothing per learner is kept or cached. A share
 * over fewer than `SPEECH_FLOOR` turns or pairs is not printed; the count is.
 * It changes nothing (D14): a figure that looks wrong is for the operator to
 * read and decide on, never for this page to act on.
 *
 * Behind `requireAdminId`, like the review queue. A signed-in learner who is
 * not a reviewer is told so and shown nothing.
 */
export default async function SpeechFiguresPage() {
  const ownerId = await requireUserId();
  const locale = await localeFor(ownerId);
  const t = (english: string) => tr(locale, english);
  const n = (value: number) => value.toLocaleString(NUMBER_TAG[locale]);
  const pct = (share: number | null) => (share === null ? "" : `${n(Math.round(share * 100))}%`);
  const title = t("Speech figures");

  if (!(await isAdmin())) {
    return (
      <Page title={title} lead={t("How speaking is used across this copy, for whoever runs it.")}>
        <Empty
          title={t("Not this account")}
          body={t(
            adminsConfigured()
              ? "These figures are read by whoever runs this copy."
              : "Nobody has been made a reviewer here yet.",
          )}
        />
      </Page>
    );
  }
  await requireAdminId();
  const report = await speechReport();

  const editLine = (row: EditRow) =>
    enoughToShow(row.turns)
      ? fill(t("{share} of {heard} heard words changed, over {turns} spoken turns"), {
        share: pct(row.share), heard: n(row.wordsHeard), turns: n(row.turns),
      })
      : fill(t("Only {turns} spoken turns so far, too few to give a share."), { turns: n(row.turns) });
  const recallLine = (side: RecallSide) =>
    enoughToShow(side.pairs)
      ? fill(t("{share}, {recalled} of {pairs}"), { share: pct(side.share), recalled: n(side.recalled), pairs: n(side.pairs) })
      : fill(t("Only {pairs} pairs so far, too few to give a share."), { pairs: n(side.pairs) });

  const { edits, recall, chat } = report;
  return (
    <Page
      title={title}
      eyebrow={t("Review queue")}
      lead={t("How speaking is used across this copy, read when this page opened. It names nobody.")}
      actions={<BackLink href="/admin/suggestions">{t("Back to the review queue")}</BackLink>}
    >
      <Stack>
        {edits.alarm && (
          <p className="rounded-[var(--r)] px-4 py-3 text-base" style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}>
            {fill(t("Learners changed {share} of heard words over {turns} spoken turns, past the line of {line}% over {min} turns. Read below, and decide whether to switch speech off."), {
              share: pct(edits.all.share), turns: n(edits.all.turns),
              line: n(Math.round(EDIT_ALARM_SHARE * 100)), min: n(EDIT_ALARM_TURNS),
            })}
          </p>
        )}

        <section>
          <SectionTitle>{t("Answers said aloud")}</SectionTitle>
          <Card>
            <Rows rows={[
              [t("Answers on a card given aloud"), n(report.spokenAnswers)],
              [t("Learners who answered aloud"), n(recall.speakers)],
              [t("Conversation turns said aloud"), n(report.spokenTurns)],
            ]} />
          </Card>
        </section>

        <section>
          <SectionTitle hint={fill(t("The line: {line}% over {min} turns"), { line: n(Math.round(EDIT_ALARM_SHARE * 100)), min: n(EDIT_ALARM_TURNS) })}>
            {t("Heard words changed before sending")}
          </SectionTitle>
          <Card>
            {edits.all.turns === 0 ? (
              <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("No spoken conversation turn carries its counts yet, so there is nothing to read.")}</p>
            ) : (
              <Rows rows={[
                [t("Everybody"), editLine(edits.all)],
                ...edits.byBand.map((row) => [fill(t("At {band}"), { band: row.key }), editLine(row)] as const),
                ...edits.byLanguage.map((row) => [fill(t("Glosses read in {language}"), { language: row.key }), editLine(row)] as const),
              ]} />
            )}
            <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
              {t("An upper bound on what the recognizer got wrong: a learner also changes their own grammar, and that counts here too.")}
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>{t("Recall after a spoken answer")}</SectionTitle>
          <Card>
            <Rows rows={[
              [t("Next answer to the same card recalled, after a spoken answer"), recallLine(recall.spoken)],
              [t("After a typed answer, from the same learners"), recallLine(recall.typed)],
            ]} />
            <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
              {t("Observational: people choose when to speak, and an easy card is likelier to be said aloud. Not a trial.")}
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>{t("Today’s chat")}</SectionTitle>
          <Card>
            <Rows rows={[
              [fill(t("Finished days that met at least {n} new words"), { n: n(CHAT_MIN_NEW) }), n(chat.offered)],
              [t("A chat opened"), n(chat.took)],
              [t("A chat finished"), n(chat.finished)],
              [t("The chat’s words recalled at their next review"), recallLine(chat.chatWords)],
              [t("The same days’ other words"), recallLine(chat.otherWords)],
            ]} />
            <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
              {t("The first figure is an upper bound: this page cannot tell whether a model was configured on a given day.")}
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>{t("Turns answered by ear")}</SectionTitle>
          <Card>
            {report.byEar.length === 0 ? (
              <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("No spoken turn has answered a line that was only heard yet.")}</p>
            ) : (
              <Rows rows={report.byEar.map((row) => [fill(t("At {band}"), { band: row.level }), n(row.turns)] as const)} />
            )}
            <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
              {t("A spoken turn that answered a line the learner only heard, and did what the line asked.")}
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>{t("Words in a spoken turn, by month")}</SectionTitle>
          <Card>
            {report.lengthByMonth.length === 0 ? (
              <p className="text-base" style={{ color: "var(--ink-2)" }}>
                {fill(t("Not enough yet: this needs two months with at least {n} spoken turns each."), { n: n(MIN_TURNS_A_MONTH) })}
              </p>
            ) : (
              <Rows rows={report.lengthByMonth.map((m) => [m.month, fill(t("{median} words in the middle turn, over {turns} turns"), { median: n(m.median), turns: n(m.turns) })] as const)} />
            )}
          </Card>
        </section>

        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {fill(t("A share over fewer than {floor} turns or pairs is not shown; the count is. The first four readings are what {command} prints."), {
            floor: n(SPEECH_FLOOR), command: "npm run report:speech",
          })}{" "}
          <Link href="/admin/errors" className="underline" style={{ color: "var(--accent-deep)" }}>{t("Errors the app reported")}</Link>
        </p>
      </Stack>
    </Page>
  );
}

function Rows({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="flex flex-col gap-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{label}</dt>
          <dd className="text-base" style={{ color: "var(--ink-2)" }}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
