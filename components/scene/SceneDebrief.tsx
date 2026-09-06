"use client";

import { useCallback, useRef, useState } from "react";

import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button, ButtonLink } from "@/components/Button";
import { Card, Chip } from "@/components/ui";
import { AddWordButton } from "@/components/AddWordButton";
import { DrillLink } from "@/components/DrillLink";
import type { SceneSpec } from "@/lib/scenes/types";
import { drillFor } from "@/lib/scenes/drills";
import { splitOnForm } from "@/lib/dict/examples";
import { curveballById } from "@/lib/scenes/curveballs";
import { errandForScene } from "@/lib/collections/errands";
import { PLACES_TO_TALK } from "@/lib/collections/placesToTalk";
import type { SceneReview } from "@/lib/scenes/review";

/** So "words your conversations needed" is a query and never a counter (ADR-014). */
export const SCENE_SOURCE = "SCENE";

/**
 * The debrief, and the order is the argument (§12).
 *
 * 1. **What happened**, in one line, before any teaching. A person remembers
 *    the outcome, so it goes first.
 * 2. **What you got done**: the required beats, ticked. A count of things
 *    achieved, never a percentage, because a mark on a conversation is a claim
 *    about somebody's Estonian and only the mock exam may make one (ADR-022).
 * 3. **How it went**, which is the review a teacher gives after a role-play:
 *    it leads on how much of what you said was understood, and then names
 *    each ending that came out as something else, what that ending is for,
 *    and your own words beside the ones the other side used. English, and
 *    derived from the transcript rather than written here
 *    (`lib/scenes/review.ts`).
 * 4. **The words you needed and did not have**, each with an add-to-deck
 *    button, from the help button and from the beats that stalled.
 * 5. **One thing to work on**, as a `DrillLink` into the drill that addresses
 *    it, rather than advice this screen wrote itself, and only where there is
 *    a drill: the goal itself is already ticked off at 2.
 * 6. **What was said**, both sides, which is the record. §12 of the design
 *    had it third and gave as its reason the job 3 does now, that this is
 *    where a learner finds out the word they were sure of was not the word.
 *    The transcript marks nothing, and it is the one section here with no
 *    bound on its length, so it sits under the things a learner can act on
 *    rather than between them and the outcome
 *    (`docs/21-situations.md` §12, amendment 1).
 * 7. **The real one.** The errand this scene rehearses, and where the people
 *    are. This is the screen a learner is on the moment they have just proved
 *    they can book the appointment, and it used to end in "have it again":
 *    the purpose of the app is to be left (`docs/22-real-life.md`), and a
 *    rehearsal that ends in another rehearsal keeps somebody inside. Shown
 *    only where every required beat was met, because sending somebody out on
 *    the strength of a conversation they did not get through is the false
 *    confidence the readiness screen is built against.
 * 8. **Try it again**, which is one button, because the second run is where
 *    most of the learning is.
 *
 * No score anywhere on this screen. That is not an omission.
 */
export interface Debrief {
  scene: SceneSpec;
  objectives: { met: readonly string[]; missed: readonly string[] };
  hurdles: readonly { id: string; beat: number; met: boolean }[];
  outcome: { id: string; says: string } | null;
  gaps: readonly { lemma: string; lexemeId: string | null }[];
  /** What to do differently, in English, derived from the run (`lib/scenes/review.ts`). */
  review: SceneReview;
  graded: number;
  /** The conversation, both sides, in order. A stage direction is not a line and is left out. */
  /*
    `lang` because the other side does not only speak Estonian. Where neither
    rung could put their move into words the course teaches, `reply` says what
    they did in English, and the transcript kept those lines and marked the lot
    `lang="et"`, so a screen reader read the English half with Estonian
    phonology. The live conversation gets this right through `spokenEstonian`;
    the debrief was the copy that did not.
  */
  turns: readonly { who: "them" | "you"; text: string; lang: "et" | "en" }[];
}

export function SceneDebrief({ debrief, onAgain }: { debrief: Debrief; onAgain: () => void }) {
  const { scene, objectives, hurdles, outcome, gaps, turns, graded, review } = debrief;
  const byId = new Map(scene.beats.map((beat) => [beat.id, beat]));
  const required = scene.beats.filter((beat) => beat.required);
  const missed = objectives.missed.length > 0 ? byId.get(objectives.missed[0]!) : undefined;
  const drill = missed ? drillFor(missed.needs) : null;
  const errand = objectives.missed.length === 0 ? errandForScene(scene.id) : undefined;
  const cafe = PLACES_TO_TALK[0];

  /*
    WHICH TURN A NOTE IS POINTING AT, AND THE WORD INSIDE IT.

    `showing` is an index among the learner's own turns, which is what a note
    carries: the transcript holds both sides and the two lists are built in
    different processes, so what they can agree on is that the nth thing the
    learner said is the nth thing the learner said.

    Scrolled into view rather than only marked, because on a phone the
    transcript is under everything else on this screen, and marked rather than
    only scrolled to, because a page that jumps and highlights nothing has
    answered a different question.
  */
  const [showing, setShowing] = useState<number | null>(null);
  const marked = useRef<HTMLLIElement | null>(null);
  const show = useCallback((at: number) => {
    setShowing(at);
    /*
      After the paint that marks it, and never smoothly for a reader who asked
      for less movement: `prefers-reduced-motion` turns every animation in
      `app/globals.css` off and a scroll this app starts itself is no different.
    */
    requestAnimationFrame(() => {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      marked.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
    });
  }, []);
  const wordAt = new Map(review.notes.map((note) => [note.at, note.said]));

  return (
    <div className="flex flex-col gap-6">
      {/* What happened, first, before any teaching. */}
      <Card tone="mint" className="flex flex-col gap-2">
        <h2 className="font-medium">
          {outcome?.says ?? "The conversation ended before it got anywhere."}
        </h2>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {objectives.met.length} of {required.length} things you came in to get done.
        </p>
      </Card>

      <section>
        {/*
          The heading follows the list. "What you got done" over six unticked
          rows is a heading arguing with what is under it, and the run where
          that happens is the run somebody walked out of, which is the one
          where the copy has to be kind and accurate at once. The card above
          has already said the count, so this says what the list is.
        */}
        <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>
          {objectives.met.length === 0 ? "What you went in to get done" : "What you got done"}
        </h3>
        <ul className="flex flex-col gap-1">
          {required.map((beat) => {
            const met = objectives.met.includes(beat.id);
            return (
              <li key={beat.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden style={{ color: met ? "var(--mint-ink)" : "var(--ink-3)" }}>
                  {met ? "✓" : "·"}
                </span>
                <span style={{ color: met ? "var(--ink)" : "var(--ink-3)" }}>{beat.goal}</span>
                <span className="sr-only">{met ? "done" : "not this time"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {hurdles.length > 0 && (
        <section>
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>What went wrong on the way</h3>
          {/*
            The curveballs this run drew, and whether each was dealt with.
            Named in the debrief and nowhere before it, because pressure is
            felt in what the other person says and not announced (§7); here it
            is over, and the learner can read what caught them out.
          */}
          <ul className="flex flex-col gap-1">
            {hurdles.map((hurdle) => {
              const spec = curveballById(hurdle.id);
              if (!spec) return null;
              return (
                <li key={`${hurdle.id}-${hurdle.beat}`} className="flex items-start gap-2 text-sm">
                  <span aria-hidden style={{ color: hurdle.met ? "var(--mint-ink)" : "var(--ink-3)" }}>
                    {hurdle.met ? "✓" : "·"}
                  </span>
                  <span style={{ color: hurdle.met ? "var(--ink)" : "var(--ink-3)" }}>
                    {spec.says} {hurdle.met ? "You handled it." : "They let it go."}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>How it went</h3>
        {/*
          The lead is the sentence a learner takes away, and it is about being
          understood rather than about being right: those are the same run
          described two ways, and only one of them gets somebody to open the
          next scene. The notes under it are the teaching, in the quiet ink,
          with the learner's own words beside the ones the other side used.
        */}
        <p className="text-sm">{review.lead}</p>
        {review.notes.length > 0 && (
          <ul className="mt-3 flex flex-col gap-3">
            {review.notes.map((note) => (
              <li key={note.id}>
                {/*
                  THE WORD FIRST, THEN WHAT THEY WERE REACHING FOR, THEN THE
                  FORM THAT WAS WANTED. A learner read the earlier version and
                  said the word itself should lead: a note headed "The ending
                  for “into”" is a grammar point, and what they want to know is
                  what happened to the word they wrote.

                  And it is pressable, because the transcript is on the same
                  screen and somebody asking "where did I do that" was being
                  left to find it themselves. It marks the turn and the word
                  inside it rather than only scrolling to it, since a page that
                  jumps and highlights nothing has answered a different
                  question.
                */}
                <button
                  type="button"
                  onClick={() => show(note.at)}
                  aria-expanded={showing === note.at}
                  className="press tap-tint -mx-1.5 flex w-full items-baseline gap-2 rounded-[var(--r-sm)] px-1.5 py-1 text-left"
                >
                  <span lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                    {note.said}
                  </span>
                  {note.times && (
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>{note.times} times</span>
                  )}
                  <span className="ml-auto shrink-0 text-xs" style={{ color: "var(--accent-deep)" }}>
                    {showing === note.at ? "Shown below" : "Where I said it"}
                  </span>
                </button>
                {/*
                  What they were reaching for, marked as the guess it is and
                  worded as a guess in both tiers, because a wrong confident
                  diagnosis teaches a learner a reason for a mistake they did
                  not make and they have no way to tell
                  (`lib/scenes/diagnose.ts`).
                */}
                {note.hunch && (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--ink-3)" }}>
                    <span className="font-medium">
                      {note.hunch.sure === "likely" ? "Most likely" : "Possibly"}:
                    </span>{" "}
                    {note.hunch.says}
                  </p>
                )}
                {/* And the form that was wanted, which is the dictionary's. */}
                <p className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
                  {note.form ? (
                    <>
                      {"It should be "}
                      <span lang="et" className="font-medium">{note.form}</span>
                      {`, ${note.what}.`}
                    </>
                  ) : (
                    `Understood as it stood. It wanted ${note.what}.`
                  )}
                </p>
                {note.term && (
                  <p className="text-xs" lang="et" style={{ color: "var(--ink-3)" }}>{note.term}</p>
                )}
                {note.body && (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--ink-3)" }}>{note.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {gaps.length > 0 && (
        <section>
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>
            Words this conversation needed
          </h3>
          {/*
            Help is counted and never taken away: a learner who asks for four
            words and finishes has learned more than one who gave up with none.
            So this is a list with a way to keep them, not a tally of mistakes.
          */}
          <ul className="flex flex-wrap gap-2">
            {gaps.map((gap) => (
              <li key={gap.lemma} className="flex items-center gap-1">
                <Chip tone="neutral" caseSensitive>{gap.lemma}</Chip>
                {/*
                  A word the dictionary holds can be kept; one it does not is
                  still listed, because "the conversation needed this and you
                  did not have it" is true either way and hiding it would hide
                  exactly the gaps worth reporting.
                */}
                {gap.lexemeId && (
                  <AddWordButton lexemeId={gap.lexemeId} lemma={gap.lemma} source={SCENE_SOURCE} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {missed && drill && (
        <section>
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>One thing to work on</h3>
          {/*
            NAMED HERE ONLY WHERE THERE IS A DRILL TO NAME IT FOR.

            Every unmet goal is ticked off a few sections above, in order, so
            the first of them is already on the screen and already first. What
            this section adds is the way to practise it, and with no drill
            behind it the whole section was that same sentence printed a second
            time under a heading, followed by an encouragement about pressing a
            button that is four lines further down. `lib/scenes/review.ts` used
            to print it a third time in between, which is how one sentence came
            to be on this screen three times over.
          */}
          <p className="mb-2 text-sm" style={{ color: "var(--ink-2)" }}>{missed.goal}</p>
          {/*
            A link into a drill that already exists rather than advice this
            screen invented, and the drill is read off what the beat needed
            rather than being the same one every time. `assessReadiness` makes
            the same move on the exam hub and for the same reason: the app knows
            what it can drill and does not know what to say. Where no drill
            rehearses what was missed there is no link, because a link to the
            wrong drill is a screen saying "go and practise this" about
            something else.
          */}
          {drill && <DrillLink href={drill} />}
        </section>
      )}

      {/*
        THE RECORD, AFTER THE TEACHING RATHER THAN IN FRONT OF IT.

        §12 of the design put the turns third, and the reason it gave is the
        job the review does now: "this is where a learner finds out that the
        word they were sure of was not the word", with each word marked and
        the near misses named. The transcript as built marks nothing; it is
        the plain record, and the review quotes the learner's own words, so it
        stands without having read the conversation back first. Meanwhile the
        transcript is the one section on this screen with no bound on its
        length: measured on a seven-turn run at 360px it is 900 of the 2,232
        pixels, and it sat between the outcome and every actionable thing
        under it, so the teaching, the words to keep and the way back in were
        all below the fold on a conversation that had barely started.

        What stays exactly where §12 put it is the outcome, which leads
        because a person remembers the outcome, and it still leads before any
        teaching at all.
      */}
      {turns.length > 0 && (
        <section>
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>What was said</h3>
          {/*
            Both sides rather than the learner's alone, because a turn only
            makes sense beside the line it answered, and reading the whole
            exchange back is how somebody notices that "poodi" was the right
            answer to the wrong question.
          */}
          <ul className="flex flex-col gap-2">
            {(() => {
              /*
                The learner's turns are numbered as they go past, because that
                is the join a note points along: the nth thing the learner said.
                Counted here rather than carried on the turn, since the
                transcript is built in the browser out of what was drawn and
                the notes are built on the server out of what was marked.
              */
              let said = -1;
              return turns.map((turn, index) => {
                const mine = turn.who === "you" ? (said += 1) : null;
                const here = mine !== null && mine === showing;
                const word = mine !== null ? wordAt.get(mine) : undefined;
                return (
                  <li
                    key={index}
                    ref={here ? marked : undefined}
                    className={turn.who === "you" ? "self-end text-right" : "self-start"}
                  >
                    <Card
                      className="inline-block max-w-full text-sm"
                      style={here ? { boxShadow: "inset 0 0 0 2px var(--butter-ink)" } : undefined}
                    >
                      {/*
                        WHO SAID IT, FOR A READER WHO CANNOT SEE WHICH SIDE IT
                        IS ON. Left and right and two inks are the whole of what
                        tells the two speakers apart, and both are things you
                        have to be looking at. Read aloud, this section was one
                        flat run of sentences in two languages with nothing
                        between them, on the screen whose point is reading the
                        exchange back.

                        `sr-only`, because the alignment does say it to anybody
                        who can see it and a label on every bubble would be the
                        same two words twenty times down a phone.
                      */}
                      <span className="sr-only">{turn.who === "you" ? "You said: " : "They said: "}</span>
                      <span lang={turn.lang} style={turn.who === "them" ? { color: "var(--ink-2)" } : undefined}>
                        {/*
                          The word marked inside the turn, in butter, which is
                          this app's colour for "nearly" and is what a slip is.
                          `splitOnForm` is the same whole-word split the
                          dictionary marks a form with, so a word inside a
                          longer one is never painted.
                        */}
                        {here && word
                          ? splitOnForm(turn.text, word).map((run, at) => (
                            run.match ? (
                              <mark
                                key={at}
                                className="rounded-[var(--radius-sm)] px-0.5"
                                style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}
                              >
                                {run.text}
                              </mark>
                            ) : <span key={at}>{run.text}</span>
                          ))
                          : turn.text}
                      </span>
                    </Card>
                  </li>
                );
              });
            })()}
          </ul>
        </section>
      )}

      {graded > 0 && (
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          {graded === 1 ? "One word" : `${graded} words`} you used went into your review schedule.
        </p>
      )}

      {errand && (
        <section>
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>Now the real one</h3>
          <Card tone="mint">
            <p className="text-base font-semibold" style={{ color: "var(--mint-ink)" }}>{errand.says}</p>
            <p className="mt-1.5 text-sm" style={{ color: "var(--mint-ink)" }}>
              {errand.where}. Nobody there has read the card, and that is the practice.
              Tomorrow, <Link href="/">Today</Link> asks how it went.
            </p>
            {cafe && (
              <p className="mt-2 text-xs" style={{ color: "var(--mint-ink)" }}>
                Nobody to say it to? <a href={cafe.href} target="_blank" rel="noopener noreferrer" className="underline">{cafe.name}</a> runs
                language cafés where people came to be spoken to.
              </p>
            )}
          </Card>
        </section>
      )}

      {/*
        The reason to press the button, beside the button. It used to sit under
        "one thing to work on", which is a heading about a goal rather than
        about the way back in. Only where something is left undone: a run that
        got everything done closes on the errand above, which points out of the
        app rather than back into it (`docs/22-real-life.md`).
      */}
      {objectives.missed.length > 0 && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          The second run of a scene is where most of it sticks.
        </p>
      )}

      {/*
        The quiet way out first and the loud one last, which is the shape every
        other finish screen in the app has: "Another round" beside a primary
        that says where to go next. This row had no primary at all, so the way
        back into the scene was drawn quieter than the link away from it, under
        the very sentence above that argues for it.
      */}
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/situations" variant="ghost">Another conversation</ButtonLink>
        {/* Try it again keeps the scene and redraws everything else. */}
        <Button variant="primary" onClick={onAgain}>Have it again</Button>
      </div>

      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        <Link href="/progress">Your progress</Link> counts this the way it counts a review.
      </p>
    </div>
  );
}
