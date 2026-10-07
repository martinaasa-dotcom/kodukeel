import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { CASES } from "@/lib/estonian/cases";
import { caseQuestionFor } from "@/lib/estonian/caseQuestion";
import { sayPhrase } from "@/lib/estonian/sayIt";
import { grammarTerm } from "@/lib/estonian/terms";
import { courseLevelFor } from "@/lib/progress/level";
import { describeRound } from "@/lib/progress/describe";
import { resolveProvider } from "@/lib/tutor/provider";
import { DescribeSession, type ScenePrompt } from "./DescribeSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { practiceScope } from "@/lib/progress/moduleScope";

export async function generateMetadata() {
  return titleFor("Say what you see");
}

export const dynamic = "force-dynamic";

/**
 * SAY WHAT YOU SEE: A PICTURE, AND ONE SENTENCE OF YOUR OWN ABOUT IT.
 *
 * The feedback asked for a picture to describe and for a conversation to hold.
 * They are the same exercise with different scenery, and this is it: a
 * situation, three things in it, and the learner producing Estonian rather
 * than recalling the back of a card.
 *
 * ONLY ONE OF THE THREE WORDS IS NAMED, and that is the whole reason the
 * picture is worth having. The named one carries the case the task asks for,
 * so the requirement is unambiguous and the marking is certain. The other two
 * are pictures and nothing else: knowing them is worth credit, not knowing
 * them still leaves something to write about, and both are revealed with their
 * glosses once the sentence has been marked. Naming all three up front would
 * make the picture decoration.
 *
 * Nothing here ships artwork. The things are emoji, which are characters drawn
 * by the reader's own font, joined to dictionary headwords by
 * `scripts/build-emoji.ts` against Unicode's own data file. See
 * `lib/collections/scenes.ts` for why that is the answer rather than a
 * shortcut to one.
 */
export default async function DescribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const [level, locale] = await Promise.all([courseLevelFor(ownerId), localeFor(ownerId)]);
  // Opened from the module: scenes of taught words, asked in taught cases.
  const round = await describeRound(ownerId, level, undefined, await practiceScope(ownerId, await searchParams));

  if (round.length === 0) {
    return (
      <Page title={tr(locale, "Say what you see")} lead={tr(locale, "Look at a picture, then write one sentence of your own about it.")}>
        <Empty
          title={tr(locale, "No pictures at your level yet")}
          body={tr(locale, "This needs a few more nouns at your level that we can draw. Learn some and come back.")}
          action={<ButtonLink href="/practice" variant="primary">{tr(locale, "Back to practice")}</ButtonLink>}
        />
      </Page>
    );
  }

  const prompts: ScenePrompt[] = round.map(({ task, cardId }) => {
    const spec = CASES.find((c) => c.key === task.caseKey)!;
    const asked = task.words[task.askIndex]!;
    return {
      sceneId: task.sceneId,
      situation: task.situation,
      cardId,
      // The character and its English, and no Estonian but the named word's:
      // see `ScenePrompt.things` for why the English travels with it.
      things: task.words.map((w) => ({ emoji: w.emoji, translation: w.translation })),
      askIndex: task.askIndex,
      askLemma: asked.lemma,
      askTranslation: asked.translation,
      say: sayPhrase(task.caseKey, asked.translation, {
        lemma: asked.lemma,
        semanticTypes: asked.semanticTypes,
        nomSg: asked.forms.find((f) => f.formType === "NOM_SG")?.value ?? null,
      }),
      caseKey: task.caseKey,
      // What a hint uncovers. The marking stays on the route: see the field.
      targetForm: task.accepted[0] ?? null,
      // The Estonian name leads and the English is the cross-reference, which
      // is the rule every screen in this app that names a case follows.
      caseEt: grammarTerm(spec.key)?.et ?? spec.et,
      // The question *this* word answers. Half the pictured nouns are people
      // and animals, so the `mille-` series was asking `millega?` about a
      // horse; and `kus?` names two cases at once, which is not a question a
      // task wanting one form can print. See lib/estonian/caseQuestion.ts.
      caseQuestion: caseQuestionFor(spec, {
        lemma: asked.lemma,
        semanticTypes: asked.semanticTypes,
        nomSg: asked.forms.find((f) => f.formType === "NOM_SG")?.value ?? null,
      }),
    };
  });

  return (
    <BeforeYouStart id="describe" ready={prompts.length > 0} count={{ n: prompts.length, noun: "picture" }}>
      <DescribeSession prompts={prompts} aiAvailable={resolveProvider() !== null} />
    </BeforeYouStart>
  );
}
