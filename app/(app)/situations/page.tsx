import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { bandsAround } from "@/lib/collections/levels";
import { SCENES } from "@/lib/scenes/catalogue";
import { minutesFor } from "@/lib/scenes/run";
import { LEVELS, unitById } from "@/lib/collections/syllabus";
import { Card, Chip, Empty, Page, Stack } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { PLACES_TO_TALK } from "@/lib/collections/placesToTalk";
import { errandForScene } from "@/lib/collections/errands";
import { practises } from "@/lib/scenes/practises";
import { sceneHistoryFor, type SceneHistory } from "@/lib/progress/scene";
import { SceneMotif } from "@/components/scene/SceneMotif";

export const metadata = { title: "Situations" };
export const dynamic = "force-dynamic";

/**
 * Choosing a conversation to have.
 *
 * Each one says where you are standing, what you would be trying to get done,
 * and how long it takes, which is what somebody deciding whether they have time
 * for one actually needs (`docs/19-situations.md` §13).
 *
 * A scene is offered one band either side of the learner's level, through
 * `lib/collections/levels.ts`, which is the same table the minimal pairs round
 * and the government drill draw from. A second answer to "what is around this
 * learner's level" is how the first one rots.
 *
 * The difficulty dial sits on the scene rather than in Settings, because it is
 * a decision about this conversation rather than a preference about the app,
 * and because somebody who found the last one hard should be able to turn it
 * down at the moment they feel that rather than two screens away.
 */
export default async function SituationsPage() {
  const ownerId = await requireUserId();
  const [level, history] = await Promise.all([courseLevelFor(ownerId), sceneHistoryFor(ownerId)]);
  const band = bandsAround(level);

  /*
    Ordered by level inside each group, because the catalog's order is the
    order the scenes were written and with fourteen of them that reads as a
    wall: an A1 learner saw A1, A2, A2, A1, A2, A1 down the page. The level is
    on every tile, so the only thing sorting adds is that the ones a learner
    can walk into come first. Ordering and never filtering, which is
    `aroundFirst`'s rule about a learner's own deck one file over.
  */
  const byLevel = (a: (typeof SCENES)[number], b: (typeof SCENES)[number]) =>
    LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.title.localeCompare(b.title);
  const near = SCENES.filter((scene) => band.includes(scene.level)).sort(byLevel);
  const rest = SCENES.filter((scene) => !band.includes(scene.level)).sort(byLevel);

  return (
    <Page
      title="Situations"
      lead="Somebody wants something from you, and you have to sort it out in Estonian."
    >
      <Stack>
        {near.length === 0 && rest.length === 0 ? (
          /*
            The empty state is a door rather than an explanation, and its body
            stays under 100 characters. There is nothing to explain here that
            opening one would not explain better.
          */
          <Empty
            title="No conversations at your level yet"
            body="More are coming. A practice round is the quickest thing to do in the meantime."
            action={<ButtonLink href="/practice">Practice</ButtonLink>}
          />
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {near.map((scene) => <SceneTile key={scene.id} scene={scene} history={history.get(scene.id)} />)}
            </ul>
            {rest.length > 0 && (
              <div>
                <p className="mb-3 text-sm" style={{ color: "var(--ink-3)" }}>
                  A bit above or below you. Worth a go anyway.
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {rest.map((scene) => <SceneTile key={scene.id} scene={scene} history={history.get(scene.id)} />)}
                </ul>
              </div>
            )}
          </>
        )}

        {/*
          Said once, before anybody starts, because it is the answer to a
          question a careful person would otherwise have to ask: nothing you
          type here is about you (§3). It is one line rather than a panel.
        */}
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          You play somebody else, off a card we hand you. Nothing you write here is
          about you, and nobody will ask you for a real document number.
        </p>

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
          <ul className="grid gap-3 sm:grid-cols-3">
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

function SceneTile({ scene, history }: { scene: (typeof SCENES)[number]; history?: SceneHistory }) {
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
            {/* A level never wraps: "B1" on two lines reads as two chips. */}
            <span className="shrink-0"><Chip tone="neutral">{scene.level}</Chip></span>
          </div>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{scene.place}</p>
          {/*
            What it asks for, read off the beats rather than typed, in the
            words a class uses: a learner who was told about the seesütlev on
            Tuesday should be able to find the conversation that asks for it.
          */}
          {drills.length > 0 && (
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>
              Practices {drills.slice(0, 4).join(", ")}{drills.length > 4 ? " and more" : ""}.
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
            {unit ? ` · ${unit.title}` : ""}
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
