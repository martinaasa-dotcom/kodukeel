import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { minutesFor } from "@/lib/scenes/run";
import { courseLevelFor } from "@/lib/progress/level";
import { adaptTiltFor } from "@/lib/progress/adapt";
import { tiltedLevel } from "@/lib/course/adapt";
import { SceneSession } from "@/components/scene/SceneSession";
import { titleFor } from "@/lib/progress/locale";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { sceneAnswerFrom } from "@/lib/ux/sceneAnswer";
import { chatAffordable, chatSceneOf, planChat } from "@/lib/progress/chat";
import { chatDay } from "@/lib/progress/chatDay";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return titleFor("Tonight's chat");
}

/**
 * TONIGHT'S CHAT (docs/41-fifth-batch.md, VB-11).
 *
 * The conversation screen every scene uses, opened on a scene built for the
 * evening the learner finished today (`lib/scenes/specs/chat.ts`). Everything
 * that decides what it is about is the server's: which evening (`chatDay`),
 * which of its words (`planChat`), and whether there is a chat at all. Where
 * there is none, on a deployment with no model or an evening with too few new
 * words, the address goes back to the module rather than drawing a screen
 * that could only apologise: the module never offered it, so nobody pressed
 * anything to get here.
 *
 * The same plan is built again when the run opens (`beginChat`), from the same
 * rows, so the words on the briefing are the words the conversation asks for.
 */
export default async function ChatPage() {
  const ownerId = await requireUserId();
  if (!(await chatAffordable(ownerId))) redirect("/course");
  const evening = await chatDay(ownerId);
  const plan = evening ? await planChat(ownerId, evening.programme, evening.day) : null;
  if (!plan) redirect("/course");

  const scene = chatSceneOf(plan);
  const [learnerLevel, tilt, answer] = await Promise.all([
    courseLevelFor(ownerId),
    adaptTiltFor(ownerId),
    readSetting(ownerId, SETTING_KEYS.sceneAnswer),
  ]);
  return (
    <SceneSession
      scene={scene}
      minutes={minutesFor(scene)}
      unit={null}
      learnerLevel={learnerLevel}
      openAt={tiltedLevel(learnerLevel, tilt)}
      answeredLast={sceneAnswerFrom(answer)}
      finishedOnce={false}
      opening={[]}
      chat={{ words: plan.words.map((word) => word.gloss) }}
    />
  );
}
