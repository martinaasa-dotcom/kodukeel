import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Explain } from "@/components/Explain";
import { Building2, GraduationCap, School, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { currentLearner, requireUserId } from "@/lib/auth/session";
import { supabaseConfigured } from "@/lib/auth/mode";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { cohortKind } from "@/lib/classroom/cohort";
import { Card, Chip, Page, SectionTitle, Stack } from "@/components/ui";
import { CreateClass, JoinClass } from "./ClassForms";

export const metadata = { title: "Classes" };

export const dynamic = "force-dynamic";

/**
 * Classes.
 *
 * The feature a real Estonian course actually asks for: a teacher wants to know
 * who is keeping up, and students want the week's homework somewhere other than
 * a WhatsApp group. It is built on top of what each learner already owns —
 * a class is a view, never a copy — so joining one shares progress and nothing
 * else, and leaving takes the sharing away without touching a single card.
 */
export default async function ClassIndexPage() {
  const ownerId = await requireUserId();

  const [memberships, settings, learner] = await Promise.all([
    prisma.classroomMember.findMany({
      where: { ownerId },
      include: {
        classroom: {
          select: { id: true, name: true, code: true, archived: true, ownerId: true, kind: true },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    readSettings(ownerId, [SETTING_KEYS.displayName]),
    currentLearner(),
  ]);

  const counts = await prisma.classroomMember.groupBy({
    by: ["classroomId"],
    where: { classroomId: { in: memberships.map((m) => m.classroomId) } },
    _count: true,
  });
  const sizeOf = new Map(counts.map((c) => [c.classroomId, c._count]));
  const suggestedName =
    settings[SETTING_KEYS.displayName]?.trim() || (learner.name === "you" ? "" : learner.name);

  // With no accounts there is exactly one learner, so there is nobody to share a
  // class with. Any class this install already holds is still listed — switching
  // an instance to local mode should not make data vanish — but the create and
  // join forms would be theater, so they are replaced by the reason why.
  const shareable = supabaseConfigured();

  return (
    <Page route="/class"
      eyebrow="Learn together"
      title="Classes"
      lead="A class shares progress, not data. Your deck, your searches and your history stay yours."
    >
      <Stack>
        {memberships.length > 0 && (
          <section>
            <SectionTitle>Your classes</SectionTitle>
            <ul className="grid gap-3 md:grid-cols-2">
              {memberships.map((m) => {
                const workplace = cohortKind(m.classroom.kind) === "WORKPLACE";
                const owns = m.role === "TEACHER";
                return (
                <li key={m.classroomId}>
                  <Link
                    href={`/class/${m.classroomId}`}
                    className="lift flex h-full flex-col gap-4 rounded-[var(--r-xl)] border p-5"
                    style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth)" }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--r)]"
                        style={{ background: workplace ? "var(--cta)" : "var(--sky)", color: "var(--on-hue)", boxShadow: "var(--depth-sm)" }}
                      >
                        {workplace
                          ? <Building2 size={20} aria-hidden />
                          : owns ? <GraduationCap size={20} aria-hidden /> : <Users size={20} aria-hidden />}
                      </span>
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {m.classroom.archived && <Chip>archived</Chip>}
                        {owns && !m.classroom.archived && (
                          <Chip tone="accent" caseSensitive>{m.classroom.code}</Chip>
                        )}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="font-display block text-2xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
                        {m.classroom.name}
                      </span>
                      <span className="mt-1 block text-sm" style={{ color: "var(--ink-3)" }}>
                        {workplace
                          ? (owns ? "You run this group" : "You are in this group")
                          : (owns ? "You teach this class" : "You are a student here")} ·{" "}
                        {sizeOf.get(m.classroomId) ?? 1} member{(sizeOf.get(m.classroomId) ?? 1) === 1 ? "" : "s"}
                      </span>
                    </span>
                  </Link>
                </li>
                );
              })}
            </ul>
          </section>
        )}

        {shareable ? (
          <div className="grid gap-5 md:grid-cols-2">
            <section>
              <SectionTitle hint="students">Join a class</SectionTitle>
              <Card tone="mint">
                <JoinClass suggestedName={suggestedName} />
              </Card>
            </section>

            <section>
              <SectionTitle hint="teachers and employers">Start a group</SectionTitle>
              <Card tone="accent">
                <p className="mb-4 text-sm" style={{ color: "var(--ink-2)" }}>
                  Either way you get a six-character join code and a roster. A class shows who is
                  actually reviewing, what the whole group keeps getting wrong, and the one case
                  each student struggles with most. That is the useful half of a progress report.
                  A workplace group leaves the grammar out and answers a different question: who
                  is on track for the paper they have to pass.
                </p>
                {/*
                  On the screen rather than behind the press beside it: this is
                  read by a teacher about to write a code on a board, and the
                  one moment it is worth anything is before they do. Estonia
                  sets the age at 13 and the app's whole position on it is that
                  stating the rule is what it is placed to do, which a
                  disclosure nobody opens does not.
                */}
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                  Pupils under 13 need a parent to agree first, and that is the school&rsquo;s call
                  rather than ours. The{" "}
                  <Link href="/privacy" className="underline underline-offset-2">privacy page</Link>{" "}
                  says what is held and what you can see.
                </p>
                <CreateClass />
              </Card>
            </section>
          </div>
        ) : (
          <Card>
            <div className="flex items-start gap-3">
              <School size={20} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} />
              <div>
                <p className="text-base" style={{ color: "var(--ink-2)" }}>
                  Classes need sign-in, and this copy runs without it: one learner on one machine.
                  Everything else works the same.
                </p>
                <Explain label="Turning sign-in on">
                  Set <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and its anon key; the
                  README walks through it in about ten minutes.
                </Explain>
              </div>
            </div>
          </Card>
        )}

        <Explain label="What a teacher or an employer can see">
          A teacher sees effort and progress: reviews this week, streak, words known, the cases
          the whole class keeps missing, and the one case each student struggles with most, as a
          percentage across all their reviews. Whoever runs a workplace group sees less than
          that, never more: a name, whether somebody has been practicing, and one of four bands
          for the paper the group works toward. Never a search, a deck or a single answer, and
          never a colleague&rsquo;s weak grammar. Both of those lines are drawn in the code
          rather than only in a policy. See{" "}
          <code className="text-xs">lib/classroom/roster.ts</code>.
        </Explain>
      </Stack>
    </Page>
  );
}
