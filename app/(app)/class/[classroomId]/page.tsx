import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame, GraduationCap, Target, Trophy } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { classworkHistory } from "@/app/actions";
import { PATH } from "@/lib/collections/syllabus";
import { classRoster, workplaceRoster } from "@/lib/classroom/roster";
import { emailPrefsFrom, wants } from "@/lib/email/prefs";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { cohortKind } from "@/lib/classroom/cohort";
import type { ExamLevel } from "@/lib/exam/spec";
import { WorkplaceView } from "./WorkplaceView";
import { LocalDate } from "@/components/LocalDate";
import { DUE_DATE_FORMAT } from "@/lib/ux/agenda";
import { Card, Empty, Meter, Note, Page, SectionTitle, Stack, StatTile } from "@/components/ui";
import { ArchiveClass, AssignHomework, AssignUnit, ClassDigest, CopyCode, LeaveClass } from "../ClassForms";
import { localeFor } from "@/lib/progress/locale";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { fillNodes } from "@/components/TemplateNodes";
import { filled } from "@/components/Filled";
import { Explain } from "@/components/Explain";
import { caseByKey } from "@/lib/estonian/cases";
import type { CaseKey } from "@/lib/estonian/types";

/** The name a class uses, never the Latin one. See CLAUDE.md on case names. */
const caseName = (key: string) => caseByKey(key as CaseKey)?.et ?? key.toLowerCase();

/*
  The class's own name, and never a fallback that names one to somebody who is
  not in it. `generateMetadata` runs before the page's membership check, so a
  title read straight from `Classroom` would put the name of a class in the
  browser tab of anybody who guessed its id. It reads through the membership
  row for the same reason the page does.
*/
export async function generateMetadata({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const ownerId = await requireUserId();
  const membership = await prisma.classroomMember.findUnique({
    where: { classroomId_ownerId: { classroomId, ownerId } },
    select: { classroom: { select: { name: true } } },
  });
  return { title: membership?.classroom.name ?? "Class" };
}

export const dynamic = "force-dynamic";

/**
 * One class, or one sponsored group of colleagues.
 *
 * Teachers get the roster and the assign box; students get the same leaderboard
 * their classmates see and nothing more. The two views share one query because
 * they are the same data seen from different seats, and what differs is only
 * what a student has no business acting on.
 *
 * A workplace group is the third seat and it does not share that query. It runs
 * `workplaceRoster`, which never reads a case, and renders a screen with no
 * ranking column and no per-person weakness on it. The branch is here rather than
 * inside the roster so that the narrower read is the only one a sponsor's page
 * ever makes: a view that fetched the teacher's shape and then chose not to
 * print half of it would be one careless render away from printing it.
 */
export default async function ClassroomPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const ownerId = await requireUserId();

  const membership = await prisma.classroomMember.findUnique({
    where: { classroomId_ownerId: { classroomId, ownerId } },
    include: { classroom: true },
  });
  // Not a member: the class simply does not exist as far as this account is
  // concerned. No "you are not allowed" — that would confirm it is real.
  if (!membership) notFound();

  const classroom = membership.classroom;
  const isTeacher = classroom.ownerId === ownerId;
  const workplace = cohortKind(classroom.kind) === "WORKPLACE";
  const [roster, cohort, history, prefs, locale] = await Promise.all([
    workplace ? Promise.resolve(null) : classRoster(classroomId),
    workplace ? workplaceRoster(classroomId, classroom.targetLevel as ExamLevel) : Promise.resolve(null),
    isTeacher ? classworkHistory(classroomId) : Promise.resolve([]),
    /*
      The Monday digest's switch, read only for whoever runs the group, since
      it is the only person it can be drawn for. `wants` rather than the
      off-set, because that is the one function that knows what a missing row
      means for a given kind.
    */
    isTeacher
      ? readSettings(ownerId, [SETTING_KEYS.emailsOff, SETTING_KEYS.emailsOn])
      : Promise.resolve(null),
    localeFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);
  const digest = prefs
    ? wants(
        emailPrefsFrom(prefs[SETTING_KEYS.emailsOff], prefs[SETTING_KEYS.emailsOn]),
        "classroom",
      )
    : false;

  const leader = roster?.entries[0];
  const you = roster?.entries.find((e) => e.ownerId === ownerId);
  const units = PATH.map((u) => ({ id: u.id, title: u.title, subtitle: u.subtitle }));

  return (
    <Page
      eyebrow={t(
        workplace
          ? (isTeacher ? "You run this group" : "Your group at work")
          : (isTeacher ? "You teach this class" : "Your class"),
      )}
      title={classroom.name}
      lead={workplace
        ? fill(t(isTeacher
            ? "Who's practicing, and who's on track for {level}."
            : "Your group, working toward {level} together."), { level: classroom.targetLevel })
        : t(isTeacher
            ? "Who's keeping up, and what the whole class keeps tripping over."
            : "How your class is doing this week.")}
      actions={
        <Link
          href="/class"
          className="press inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink-2)" }}
        >
          <ArrowLeft size={14} aria-hidden /> {t(workplace ? "All groups" : "All classes")}
        </Link>
      }
    >
      <Stack>
        {classroom.archived && (
          <Note tone="hard">
            {t("This class has been archived, so the join code doesn’t work any more. Everything here stays put.")}
          </Note>
        )}

        {isTeacher && !classroom.archived && (
          <Card tone="night">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <div>
                <p className="label-xs" style={{ color: "var(--cta)" }}>{t("Join code")}</p>
                <p
                  className="font-display tnum mt-1 whitespace-nowrap text-4xl font-bold tracking-[0.22em] md:text-5xl"
                  style={{ color: "var(--ink)" }}
                >
                  {classroom.code}
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  {t(workplace ? "Colleagues enter this code under Classes to join." : "Students enter this code under Classes to join.")}
                </p>
              </div>
              <CopyCode code={classroom.code} />
            </div>
          </Card>
        )}

        {workplace && cohort && <WorkplaceView summary={cohort} sponsor={isTeacher} locale={locale} />}

        {roster && (
          <>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile value={roster.entries.length} label={t("Members")} tone="sky" />
          <StatTile value={roster.activeThisWeek} label={t("Active this week")} tone="sky" />
          <StatTile value={roster.totalReviewsThisWeek} label={t("Reviews this week")} tone="accent" />
        </div>

        <section>
          <SectionTitle hint={t("this week")}>{t(isTeacher ? "Roster" : "Class leaderboard")}</SectionTitle>
          {roster.entries.length <= 1 ? (
            <Empty
              title={t(isTeacher ? "Nobody has joined yet" : "You're the first one here")}
              body={t(isTeacher
                ? "Put the join code on the board. People appear here as they join and start reviewing."
                : "Your classmates will show up here as they join.")}
            />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {roster.entries.map((entry, i) => {
                const isYou = entry.ownerId === ownerId;
                const quiet = entry.daysSinceLastReview === null || entry.daysSinceLastReview > 6;
                return (
                  <li
                    key={entry.ownerId}
                    className="flex flex-wrap items-center gap-3 rounded-[var(--r)] border px-4 py-3"
                    style={{
                      borderColor: isYou ? "transparent" : "var(--edge)",
                      background: isYou ? "var(--accent-soft)" : "var(--surface)",
                      boxShadow: isYou ? "none" : "var(--depth-sm)",
                    }}
                  >
                    <span className="tnum w-6 text-xs" style={{ color: "var(--ink-3)" }}>{i + 1}</span>
                    {i === 0 && entry.reviewsThisWeek > 0
                      ? <Trophy size={16} aria-hidden style={{ color: "var(--hard-ink)" }} />
                      : <span className="w-4" aria-hidden />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-base" style={{ color: "var(--ink)" }}>
                        {entry.displayName}
                        {entry.role === "TEACHER" && (
                          <GraduationCap size={13} aria-label={t("teacher")} className="ml-1.5 inline" style={{ color: "var(--ink-3)" }} />
                        )}
                      </span>
                      {isTeacher && (
                        <span className="block text-xs" style={{ color: quiet ? "var(--hard-ink)" : "var(--ink-3)" }}>
                          {entry.daysSinceLastReview === null
                            ? t("no reviews yet")
                            : entry.daysSinceLastReview === 0
                              ? t("reviewed today")
                              : fill(t("last review {days} ago"), { days: countOf(locale, entry.daysSinceLastReview, "day") })}
                          {", "}{fill(t("{words} known"), { words: countOf(locale, entry.wordsKnown, "word") })}
                          {entry.weakestCase && (
                            <>
                              {", "}
                              {filled(t("weakest: {case}"), {
                                case: (
                                  <span style={{ color: "var(--hard-ink)" }}>
                                    <span lang="et">{caseName(entry.weakestCase.grammCase)}</span> ({entry.weakestCase.accuracy}%)
                                  </span>
                                ),
                              })}
                            </>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--ink-2)" }}>
                      {entry.streak}<Flame size={13} aria-hidden style={{ color: entry.streak > 0 ? "var(--hard-ink)" : "var(--ink-3)" }} />
                    </span>
                    <span className="tnum w-24 text-right text-sm" style={{ color: "var(--ink)" }}>
                      {countOf(locale, entry.reviewsThisWeek, "review")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {you && leader && you.ownerId !== leader.ownerId && (
            <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
              {fill(t("{reviews} behind the top of the class this week."), { reviews: countOf(locale, leader.reviewsThisWeek - you.reviewsThisWeek, "review") })}
            </p>
          )}
        </section>

        {/* The teacher's lesson plan. Shown to a student, a class of two is their
            classmate's accuracy less their own. */}
        {isTeacher && roster.weakestCases.length > 0 && (
          <section>
            <SectionTitle hint={t("the whole class, not one person")}>{t("What to teach next")}</SectionTitle>
            <Card>
              <ul className="flex flex-col gap-2">
                {roster.weakestCases.map((c) => (
                  <li key={c.grammCase} className="flex items-center gap-3 text-sm">
                    <Target size={14} aria-hidden style={{ color: "var(--ink-3)" }} />
                    <span lang="et" className="w-28" style={{ color: "var(--ink-2)" }}>{caseName(c.grammCase)}</span>
                    <span className="max-w-[240px] flex-1">
                      <Meter
                        pct={c.accuracy}
                        label={fill(t("{case} across the class"), { case: caseName(c.grammCase) })}
                        tone="var(--accent)"
                        height={5}
                      />
                    </span>
                    <span className="tnum text-xs" style={{ color: "var(--ink-3)" }}>
                      {fill(t("{accuracy}% over {total}"), { accuracy: c.accuracy, total: c.total })}
                    </span>
                  </li>
                ))}
              </ul>
              <Explain label={t("How this is counted")}>
                {t("These add up the answers of everyone who has done a case card. A single answer is only ever shown to the person who gave it.")}
              </Explain>
            </Card>
          </section>
        )}
          </>
        )}

        {isTeacher && !classroom.archived && (
          <section>
            <SectionTitle>{t("Homework")}</SectionTitle>
            <Card>
              <AssignUnit classroomId={classroomId} units={units} />
              <Explain label={t("What this does to their deck")}>
                {t("Each student gets it as a task in their own list, with a link to the unit. Nobody’s deck changes. They choose when to add the words.")}
              </Explain>
            </Card>

            <Card className="mt-3">
              <SectionTitle hint={t("a textbook page, an exercise, anything outside the course")}>
                {t("Set other homework")}
              </SectionTitle>
              <AssignHomework classroomId={classroomId} />
            </Card>

            {history.length > 0 && (
              <div className="mt-4">
                <SectionTitle hint={t("most recent first")}>{t("Sent to this class")}</SectionTitle>
                <ul className="flex flex-col gap-1.5">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="rounded-[var(--r)] border px-3.5 py-2.5"
                      style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{h.title}</span>
                        {/*
                          Through LocalDate, like the joined date below it. These
                          two were formatted on the server with the locale left
                          to the runtime, which is the deployment's: a teacher in
                          Tartu reading their own classwork history was shown
                          "30 Aug" because the machine it renders on is set to
                          en-GB. Same file as the fix, two sections down.
                        */}
                        <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                          <LocalDate
                            iso={h.createdAt.toISOString()}
                            options={{ day: "numeric", month: "short" }}
                            fallback={h.createdAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                          />
                          {h.dueAt && (
                            <>
                              {", "}
                              {fillNodes(t("due {date}"), {
                                /* A day rather than an instant, stored at midnight UTC,
                                   so it is printed in UTC: in the reader's own zone it
                                   named the day before anywhere west of Greenwich. */
                                date: (
                                  <LocalDate
                                    iso={h.dueAt.toISOString()}
                                    zone="UTC"
                                    options={DUE_DATE_FORMAT}
                                    fallback={h.dueAt.toLocaleDateString(undefined, DUE_DATE_FORMAT)}
                                  />
                                ),
                              })}
                            </>
                          )}
                        </span>
                      </div>
                      {h.detail && (
                        <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>{h.detail}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/*
          The housekeeping, in one card with the way out last: when you joined
          and the Monday letter on the left, the quiet door on the right. Laid
          loose along a rule it read as four unrelated scraps.
        */}
        <Card className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-[14rem] flex-1 flex-col gap-2">
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              {filled(t("You joined on {date}."), {
                date: (
                  <span className="font-semibold" style={{ color: "var(--ink)" }}>
                    <LocalDate
                      iso={membership.joinedAt.toISOString()}
                      options={{ day: "numeric", month: "long", year: "numeric" }}
                      fallback={membership.joinedAt.toLocaleDateString(undefined, {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    />
                  </span>
                ),
              })}
            </p>
            {isTeacher && <ClassDigest on={digest} />}
          </div>
          {isTeacher ? <ArchiveClass classroomId={classroomId} /> : <LeaveClass classroomId={classroomId} />}
        </Card>
      </Stack>
    </Page>
  );
}
