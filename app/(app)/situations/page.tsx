import { requireUserId } from "@/lib/auth/session";
import { SCENES } from "@/lib/scenes/catalogue";
import { minutesFor } from "@/lib/scenes/run";
import { unitById } from "@/lib/collections/syllabus";
import { courseLevelFor } from "@/lib/progress/level";
import { uiText } from "@/lib/copy/uiLanguage";
import { Empty, Page, Stack } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { PLACES_TO_TALK } from "@/lib/collections/placesToTalk";
import { distinctive } from "@/lib/scenes/practises";
import { CASES } from "@/lib/estonian/cases";
import { sceneHistoryFor } from "@/lib/progress/scene";
import { ArrowUpRight } from "lucide-react";
import { kindOf } from "@/lib/scenes/kinds";
import { SituationsBoard, type SituationTile } from "./SituationsBoard";
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

  const tiles: SituationTile[] = scenes.map((scene) => {
    const unit = unitById(scene.tests);
    const past = history.get(scene.id);
    return {
      id: scene.id,
      title: scene.title,
      place: scene.place,
      // What it asks for, as tags rather than a sentence, and only the ones
      // that tell this scene from the others: rarest first, and a tag every
      // scene carries is not a tag. See `lib/scenes/practises.ts`. In the
      // words a class uses, so a learner told about the seesütlev on Tuesday
      // can find the conversation that asks for it.
      chips: distinctive(scene, SCENES).map((text) => ({ text, et: CASES.some((c) => c.et === text) })),
      objectives: scene.beats.filter((beat) => beat.required).length,
      minutes: minutesFor(scene),
      kind: kindOf(scene.id).id,
      lesson: unit ? uiText(learnerLevel, unit.title, unit.subtitle) : null,
      // How it went last time, derived from the runs and never counted
      // (ADR-014). A tile that remembers is what turns a menu into a place
      // somebody comes back to.
      plays: past?.plays ?? 0,
      last: past?.last ?? null,
    };
  });

  /*
    WHICH ONE THE STAGE OPENS ON, decided here so the first paint is the same
    one every time rather than a shuffle the server and the browser disagree
    about. One never played, in the catalogue's own order so the easiest rooms
    come first; failing that, the one played longest ago.
  */
  const unplayed = SCENES.find((scene) => !history.has(scene.id));
  const stalest = [...history.entries()]
    .sort(([, a], [, b]) => (a.lastAt?.getTime() ?? 0) - (b.lastAt?.getTime() ?? 0))[0]?.[0];
  const firstPick = unplayed?.id ?? stalest ?? tiles[0]?.id ?? "";

  return (
    <Page route="/situations"
      title="Situations"
      lead="Somebody wants something from you, and you have to sort it out in Estonian."
    >
      <Stack>
        {tiles.length === 0 ? (
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
          <SituationsBoard tiles={tiles} firstPick={firstPick} />
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
        <div className="flex flex-col gap-1">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            You play somebody else, off a card we hand you. Nothing you write here is about you.
          </p>
          <Explain label="Whose details these are">
            The card is fiction, so no transcript is a record of anything you did. A scene never asks
            you for a real document number, and what you type is kept with the run so the debrief can
            read the conversation back to you.
          </Explain>
        </div>

        {/*
          Where the people are. A learning app that never says so is one that
          would rather you stayed (docs/22-real-life.md). Every entry is a public
          programme, named, with a link that was opened before it was written down.
          On the accent's own tint, one panel, because it is the page's last
          word and the one that points out of the app.
        */}
        <section aria-labelledby="places-heading" className="situation-out rounded-[var(--r-xl)] border p-5 md:p-7">
          <h2 id="places-heading" className="text-xl font-bold tracking-tight">Where the people are</h2>
          <p className="mb-4 mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            The rehearsal is here. The conversation is out there, and these are free.
          </p>
          <ul className="grid gap-3 @container">
            {PLACES_TO_TALK.map((place) => (
              <li key={place.href}>
                <a
                  href={place.href}
                  target="_blank"
                  rel="noreferrer"
                  className="situation-place tap-tint flex items-start gap-3 rounded-[var(--r-lg)] p-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold underline">{place.name}</span>
                    <span className="mt-1 block text-sm" style={{ color: "var(--ink-2)" }}>{place.what}</span>
                  </span>
                  <ArrowUpRight aria-hidden size={20} className="mt-0.5" style={{ color: "var(--accent-deep)" }} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </Stack>
    </Page>
  );
}
