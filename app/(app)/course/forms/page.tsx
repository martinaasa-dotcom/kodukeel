import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { formsTonight, moduleScopeFrom } from "@/lib/course/scope";
import { verbExamples } from "@/lib/progress/verbExamples";
import { verbAsks } from "@/lib/course/tryIt";
import { Empty, Page, SectionTitle, Stack } from "@/components/ui";
import { TryIt } from "@/components/course/TryIt";
import { VerbTable } from "@/app/(app)/grammar/topic/[id]/VerbTable";

export const metadata = { title: "The past of your verbs" };

export const dynamic = "force-dynamic";

/**
 * SHOWN BEFORE IT IS ASKED: THE PAST OF TONIGHT'S VERBS.
 *
 * The simple past is not a rule on the stem. `lugesin`, `tahtsin` and
 * `võtsin` each have to be learned for their own verb, and so does the polite
 * imperative, `andke` and `minge`. The page about the past explains the
 * tense and cannot teach a hundred verbs' worth of it, so an evening shows a
 * handful (`DaySpec.forms`, chosen by the builder), and a card asks a verb's
 * past inside the module only once an evening has shown it
 * (`slotWithin` in `lib/course/scope.ts`).
 *
 * Every form on it is stored rather than worked out: the first person is a
 * principal part and the third person and the polite imperative are what the
 * harvest holds, since no rule reaches them (ADR-005). A verb the dictionary
 * holds no such form for shows a gap, which is the truth.
 *
 * The three taps under the table grade nothing, for the reason `TryIt` gives:
 * the answer is on the screen above them.
 */
export default async function CourseFormsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const scope = moduleScopeFrom(await searchParams);
  if (!scope) redirect("/course");

  const { verbs: lemmas, polite } = formsTonight(scope);
  const verbs = lemmas.length > 0 ? await verbExamples(ownerId, lemmas.length, lemmas) : [];
  // Teaching order, which is the order the evening names them in.
  const ordered = [...verbs].sort((a, b) => lemmas.indexOf(a.lemma) - lemmas.indexOf(b.lemma));

  return (
    <Page
      eyebrow="Tonight's module"
      title="The past of your verbs"
      lead="Every verb has its own past, so you learn them one at a time. Listen, then try three."
    >
      {ordered.length === 0 ? (
        <Empty
          title="No verbs to show tonight"
          body="We don't have the past forms for tonight's verbs yet, so there's nothing to learn here."
        />
      ) : (
        <Stack>
          <section>
            <SectionTitle hint="the ones you've met">Tonight&apos;s verbs</SectionTitle>
            <VerbTable verbs={ordered} show={polite ? "forms" : "past"} />
          </section>
          <TryIt asks={verbAsks(ordered, "past")} />
        </Stack>
      )}
    </Page>
  );
}
