import { requireUserId } from "@/lib/auth/session";
import { SCENES } from "@/lib/scenes/catalogue";
import { minutesFor } from "@/lib/scenes/run";
import { unitById } from "@/lib/collections/syllabus";
import { courseLevelFor } from "@/lib/progress/level";
import { moduleReached } from "@/lib/progress/course";
import { unitsThrough } from "@/lib/course";
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
import { tr } from "@/lib/copy/locale";
import { localeFor } from "@/lib/progress/locale";

export async function generateMetadata() {
  return { title: tr(await localeFor(await requireUserId()), "Situations") };
}
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
  const [history, learnerLevel, reached, locale] = await Promise.all([
    sceneHistoryFor(ownerId),
    courseLevelFor(ownerId),
    moduleReached(ownerId),
    localeFor(ownerId),
  ]);
  const scenes = [...SCENES].sort((a, b) => tr(locale, a.title).localeCompare(tr(locale, b.title), locale));
  /*
    WHICH OF THEM THE COURSE HAS NOT REACHED YET, for a learner it holds. The
    module deals a conversation only once every unit it draws its words from
    has been taught, so a scene ahead of that is one whose words the evenings
    have not handed over. Nothing is locked: the tile says so, and the stage
    opens on one the course has reached.
  */
  const unitsMet = reached ? new Set(unitsThrough(reached.programme, reached.day.index)) : null;

  const tiles: SituationTile[] = scenes.map((scene) => {
    const unit = unitById(scene.tests);
    const past = history.get(scene.id);
    return {
      id: scene.id,
      title: scene.title,
      place: scene.place,
      // What it asks for, as tags rather than a sentence, and only the ones
      // that tell this scene from the others: rarest first, and a tag every
      // scene carries is not a tag. See `lib/scenes/practises.ts`. Each is
      // a thing to get done, never a case name: the endings are how the task
      // is done, and the briefing names them once a learner opens it.
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
      early: unitsMet ? scene.units.some((u) => !unitsMet.has(u)) : false,
    };
  });

  /*
    WHICH ONE THE STAGE OPENS ON, decided here so the first paint is the same
    one every time rather than a shuffle the server and the browser disagree
    about. One never played, in the catalogue's own order so the easiest rooms
    come first; failing that, the one played longest ago.
  */
  const ready = new Set(tiles.filter((t) => !t.early).map((t) => t.id));
  const unplayed = SCENES.find((scene) => ready.has(scene.id) && !history.has(scene.id))
    ?? SCENES.find((scene) => !history.has(scene.id));
  const stalest = [...history.entries()]
    .sort(([, a], [, b]) => (a.lastAt?.getTime() ?? 0) - (b.lastAt?.getTime() ?? 0))[0]?.[0];
  const firstPick = unplayed?.id ?? stalest ?? tiles[0]?.id ?? "";

  return (
    <Page route="/situations"
      title={tr(locale, "Situations")}
      titleLang={locale}
      lead={tr(locale, "Practise real conversations: someone wants something from you, and you sort it out in Estonian.")}
    >
      <Stack>
        {/*
          SAID TO A BEGINNER, BECAUSE THE COURSE HAS A VIEW. No evening of A1
          deals a conversation: every scene needs the words for asking and
          offering, which A2 teaches first. A learner on their second evening
          who opens this page was being offered fifteen of them with nothing
          to say they are early, and finds out by being stuck at a counter.
          Nothing is locked; the run is pitched at their level either way.
        */}
        {learnerLevel === "A1" && (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {tr(locale, "Your course brings these in at A2, once you have the words for asking. Try one now if you like: the other side keeps it simple.")}
          </p>
        )}
        {tiles.length === 0 ? (
          /*
            The empty state is a door rather than an explanation, and its body
            stays under 100 characters. There is nothing to explain here that
            opening one would not explain better.
          */
          <Empty
            title={tr(locale, "No conversations yet")}
            body={tr(locale, "More are on the way. A quick practice round is a good way to fill the gap.")}
            action={<ButtonLink href="/practice">{tr(locale, "Practice")}</ButtonLink>}
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
            {tr(locale, "We hand you a card and you play the person on it. Nothing you write here is about you.")}
          </p>
          <Explain label={tr(locale, "Whose details these are")}>
            {tr(locale, "The card is made up, so a transcript is never a record of anything you did. No scene will ask for a real document number. What you type is kept with that run so you can read the conversation back afterwards.")}
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
          <h2 id="places-heading" className="text-xl font-bold tracking-tight">{tr(locale, "Where the people are")}</h2>
          <p className="mb-4 mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {tr(locale, "Practise here, then go and have the real conversation. All of these are free.")}
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
                    <span className="block text-base font-semibold underline">{tr(locale, place.name)}</span>
                    <span className="mt-1 block text-sm" style={{ color: "var(--ink-2)" }}>{tr(locale, place.what)}</span>
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
