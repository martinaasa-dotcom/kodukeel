import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { SCENES } from "@/lib/scenes/catalogue";
import { minutesFor } from "@/lib/scenes/run";
import { unitById, type Level } from "@/lib/collections/syllabus";
import { courseLevelFor } from "@/lib/progress/level";
import { uiText } from "@/lib/copy/uiLanguage";
import { Card, Empty, Page, Stack } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { PLACES_TO_TALK } from "@/lib/collections/placesToTalk";
import { errandForScene } from "@/lib/collections/errands";
import { practises } from "@/lib/scenes/practises";
import { joinWithAnd } from "@/lib/copy/values";
import { sceneHistoryFor, type SceneHistory } from "@/lib/progress/scene";
import { SceneMotif } from "@/components/scene/SceneMotif";
import { Explain } from "@/components/Explain";

export const metadata = { title: "Situations" };
export const dynamic = "force-dynamic";

/**
 * Choosing a conversation to have.
 *
 * Each one says where you are standing, what you would be trying to get done,
 * and how long it takes, which is what somebody deciding whether they have time
 * for one actually needs (`docs/21-situations.md` §13).
 *
 * NO SCENE HAS A BAND OF ITS OWN. They did, and the page sorted them into
 * "at your level" and "a bit above or below you" on it. What a band on a tile
 * actually decided was how the other side talked, and that is chosen on the
 * briefing now, defaulting to the learner's own level, so every situation is
 * at your level until you move the selector (`lib/scenes/pitch.ts`). One
 * list, ordered by title, because the catalog's own order is the order the
 * scenes were written and reads as a wall.
 *
 * The difficulty dial sits on the scene rather than in Settings, because it is
 * a decision about this conversation rather than a preference about the app,
 * and because somebody who found the last one hard should be able to turn it
 * down at the moment they feel that rather than two screens away.
 */
export default async function SituationsPage() {
  const ownerId = await requireUserId();
  const [history, learnerLevel] = await Promise.all([
    sceneHistoryFor(ownerId),
    courseLevelFor(ownerId),
  ]);
  const scenes = [...SCENES].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <Page
      title="Situations"
      lead="Somebody wants something from you, and you have to sort it out in Estonian."
    >
      <Stack>
        {scenes.length === 0 ? (
          /*
            The empty state is a door rather than an explanation, and its body
            stays under 100 characters. There is nothing to explain here that
            opening one would not explain better.
          */
          <Empty
            title="No conversations yet"
            body="More are coming. A practice round is the quickest thing to do in the meantime."
            action={<ButtonLink href="/practice">Practice</ButtonLink>}
          />
        ) : (
          /*
            Columns by the room the list has, not the window: at 768 the rail
            leaves 368px and `sm:grid-cols-2` gave each title 76px, so
            "appointment" was broken across two lines mid-word.
          */
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
            {scenes.map((scene) => (
              <SceneTile key={scene.id} scene={scene} history={history.get(scene.id)} learnerLevel={learnerLevel} />
            ))}
          </ul>
        )}

        {/*
          Said once, before anybody starts, because it is the answer to a
          question a careful person would otherwise have to ask: nothing you
          type here is about you (§3).

          IT IS ON THE PAGE RATHER THAN BEHIND THE PRESS BESIDE IT, and that is
          the difference between an explanation and an assurance. The pass that
          moved 33 paragraphs into `Explain` moved this one too, and
          `test-scene.mjs` failed on it, correctly: a reader deciding whether
          to type their real details finds out by asking, and somebody who has
          to press to be told has already decided. An explanation may wait to
          be asked for; the answer to "is this about me" may not. The
          disclosure under it carries what the line does not say rather than
          the line again, since a fact written down twice is a fact nobody is
          checking.
        */}
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          You play somebody else, off a card we hand you. Nothing you write here is about you.
        </p>
        <Explain label="Whose details these are">
          The card is fiction, so no transcript is a record of anything you did. A scene never asks
          you for a real document number, and what you type is kept with the run so the debrief can
          read the conversation back to you.
        </Explain>

        {/*
          Where the people are. A learning app that never says so is one that
          would rather you stayed (docs/22-real-life.md). Every entry is a public
          programme, named, with a link that was opened before it was written down.
        */}
        <section aria-labelledby="places-heading">
          <h2 id="places-heading" className="text-lg font-medium">Where the people are</h2>
          <p className="mb-3 mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            The rehearsal is here. The conversation is out there, and these are free.
          </p>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
            {PLACES_TO_TALK.map((place) => (
              <li key={place.href}>
                <Card className="flex h-full flex-col gap-1">
                  <a href={place.href} target="_blank" rel="noreferrer" className="text-base font-medium underline">
                    {place.name}
                  </a>
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>{place.what}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </Stack>
    </Page>
  );
}

function SceneTile({ scene, history, learnerLevel }: {
  scene: (typeof SCENES)[number];
  history?: SceneHistory;
  learnerLevel: Level;
}) {
  const unit = unitById(scene.tests);
  const objectives = scene.beats.filter((beat) => beat.required).length;
  const drills = practises(scene);
  const errand = errandForScene(scene.id);
  return (
    <li>
      <Link href={`/situations/${scene.id}`} className="block h-full">
        <Card hover className="flex h-full flex-col gap-2">
          <div className="flex items-start gap-3">
            {/*
              WHICH ROOM THIS IS, BEFORE THE TITLE IS READ.

              Fourteen tiles were fourteen identical cards and the only thing
              telling a pharmacy from a job interview was the sentence on it.
              `lib/scenes/scenery.ts` gives each one a mark, and it is the same
              mark that sits on the bar for the whole conversation, so choosing
              one and being in it are the same place. Decoration: the title,
              the place and the kind of place are all written out beside it.
            */}
            <SceneMotif sceneId={scene.id} />
            {/*
              On the scale, which it was not: a bare `h2` inherits the
              document's own 16px and the type scale has no such step, so
              every tile on this page was a size nothing else in the app
              uses. Found the day `/situations` joined the design sweep,
              which is the argument for putting it there.
            */}
            <h2 className="min-w-0 flex-1 text-md font-medium">{scene.title}</h2>
          </div>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{scene.place}</p>
          {/*
            What it asks for, read off the beats rather than typed, in the
            words a class uses: a learner who was told about the seesütlev on
            Tuesday should be able to find the conversation that asks for it.
          */}
          {drills.length > 0 && (
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>
              {drills.length > 4
                ? `Practices ${drills.slice(0, 4).join(", ")}, and more.`
                : `Practices ${joinWithAnd(drills)}.`}
            </p>
          )}
          {/*
            The real one, on the tile, so a scene is read as a rehearsal of
            something rather than as a game: the errand this scene rehearses
            is what the debrief offers once it has gone well.
          */}
          {errand && (
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>
              Then for real: {errand.says}
            </p>
          )}
          <p className="mt-auto text-xs" style={{ color: "var(--ink-3)" }}>
            {objectives} things to get done · about {minutesFor(scene)} min
            {unit ? ` · ${uiText(learnerLevel, unit.title, unit.subtitle)}` : ""}
          </p>
          {/*
            How it went last time, derived from the runs and never counted
            (ADR-014). A tile that remembers is what turns a menu into a
            place somebody comes back to.
          */}
          {history && (
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              {history.plays === 1 ? "Played once" : `Played ${history.plays} times`}
              {history.last ? `. Last time: ${history.last}` : "."}
            </p>
          )}
        </Card>
      </Link>
    </li>
  );
}
