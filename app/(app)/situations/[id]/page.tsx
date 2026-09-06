import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { sceneById } from "@/lib/scenes/catalogue";
import { minutesFor } from "@/lib/scenes/run";
import { unitById } from "@/lib/collections/syllabus";
import { SceneSession } from "@/components/scene/SceneSession";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const scene = sceneById((await params).id);
  return { title: scene ? scene.title : "Situations" };
}

/**
 * One conversation.
 *
 * The server's job here is small on purpose: it resolves the scene and hands it
 * to the session, which opens the run through `beginScene`. The draw is the
 * server's and is written down when the run opens (`beginRun`), so nothing on
 * this page decides what happens.
 *
 * AND IT DRAWS NO PAGE FURNITURE, WHICH IS THE CHANGE WORTH KNOWING ABOUT.
 * Every other route in the app wraps itself in `Page`: a title, a lead, an
 * action in the corner, inside a shell with a rail down the left. This one does
 * not, because the one thing a situation is for is forgetting that you are
 * using an app, and a counter clerk's question read with eight navigation rows
 * in the corner of your eye is a question read inside an app. `SceneStage` is
 * the room instead: it takes the shell off the screen while a conversation is
 * mounted, carries the scene's name as the page's one heading, and puts it
 * back the moment the learner leaves.
 *
 * So the two things the header used to carry are passed down instead. How long
 * it takes goes on the bar; the unit whose "you can do this" claim this scene
 * takes apart is offered on the briefing, where somebody deciding whether they
 * are ready is the person it is for, and nowhere during the conversation, where
 * a link to a lesson is a door out of the room. That is the two-way link §14
 * asks for, moved rather than dropped.
 */
export default async function ScenePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const scene = sceneById((await params).id);
  if (!scene) notFound();

  const unit = unitById(scene.tests);

  return (
    <SceneSession
      scene={scene}
      minutes={minutesFor(scene)}
      unit={unit ? { id: unit.id, title: unit.title } : null}
    />
  );
}
