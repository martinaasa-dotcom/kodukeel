import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { sceneById } from "@/lib/scenes/catalogue";
import { minutesFor } from "@/lib/scenes/run";
import { unitById } from "@/lib/collections/syllabus";
import { SceneSession } from "@/components/scene/SceneSession";
import { BookOpen } from "lucide-react";
import { CardLink, Page } from "@/components/ui";

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
 * A scene links back to the unit whose `canDo` it takes apart, which is the
 * two-way link §14 asks for: the syllabus has been claiming for 81 units that a
 * learner will be able to do something, and this is where it finds out.
 */
export default async function ScenePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const scene = sceneById((await params).id);
  if (!scene) notFound();

  const unit = unitById(scene.tests);

  return (
    <Page
      title={scene.title}
      lead={`${scene.place} · about ${minutesFor(scene)} min`}
      /*
        The unit this scene takes apart, and it has to look like the link it
        is: this was a bare `Link` with no class on it, so the one thing in
        the page header that goes anywhere rendered as plain dark text, and a
        learner reading "Suhtlemine" under the lead had no way to know it was
        the lesson behind the conversation. Every other page in the app styles
        its header action; this was the one that did not. `CardLink` is the
        app's own "go here", and the book says which kind of place.
      */
      actions={unit ? (
        <CardLink href={`/learn/${unit.id}`} icon={<BookOpen size={16} aria-hidden />}>
          {unit.title}
        </CardLink>
      ) : undefined}
    >
      <SceneSession scene={scene} />
    </Page>
  );
}
