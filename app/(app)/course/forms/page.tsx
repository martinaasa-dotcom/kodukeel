import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { formsTonight, moduleScopeFrom } from "@/lib/course/scope";
import { verbExamples } from "@/lib/progress/verbExamples";
import { verbAsks } from "@/lib/course/tryIt";
import { Empty, Page, SectionTitle, Stack } from "@/components/ui";
import { ReadingEnd } from "@/components/course/ReadingEnd";
import { TryIt } from "@/components/course/TryIt";
import { VerbTable } from "@/app/(app)/grammar/topic/[id]/VerbTable";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

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
 *
 * And it ends on tonight's Next, like every reading does. This page is only
 * ever a module step, and without `ReadingEnd` a desktop reached the end of
 * the three taps with nothing to press: the phone has its bar, and the
 * desktop's way on is where the step ends.
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
  const locale = await localeFor(ownerId);
  const t = (english: string) => tr(locale, english);

  return (
    <Page
      eyebrow={t("Tonight's module")}
      title={t("The past of your verbs")}
      lead={t("Each verb makes its past its own way, so learn them a few at a time. Listen, then try three.")}
    >
      <Stack>
        {ordered.length === 0 ? (
          <Empty
            title={t("No verbs to learn here tonight")}
            body={t("We don't have the past forms of tonight's verbs yet. Carry on to the next step.")}
          />
        ) : (
          <>
            <section>
              <SectionTitle hint={t("the ones you've met")}>{t("Tonight's verbs")}</SectionTitle>
              <VerbTable verbs={ordered} show={polite ? "forms" : "past"} />
            </section>
            <TryIt asks={verbAsks(ordered, "past")} />
          </>
        )}
        <ReadingEnd />
      </Stack>
    </Page>
  );
}
