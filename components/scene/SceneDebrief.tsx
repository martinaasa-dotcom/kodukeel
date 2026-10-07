"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button, ButtonLink } from "@/components/Button";
import { Card, Chip, StatTile } from "@/components/ui";
import { ArrowRight, MessageCircleHeart, Sparkles } from "lucide-react";
import { AddWordButton } from "@/components/AddWordButton";
import { DrillLink } from "@/components/DrillLink";
import type { SceneSpec } from "@/lib/scenes/types";
import { drillFor } from "@/lib/scenes/drills";
import { splitOnForm } from "@/lib/dict/examples";
import { curveballById } from "@/lib/scenes/curveballs";
import { errandForScene, errandPlaces, SAY_IT_TODAY, type Errand } from "@/lib/collections/errands";
import { PLACES_TO_TALK } from "@/lib/collections/placesToTalk";
import type { SceneReview } from "@/lib/scenes/review";
import type { SceneRecap } from "@/lib/scenes/recap";
import { useModuleFocus } from "@/components/course/moduleFocus";
import { NextStep } from "@/components/round/RoundExit";
import { CaseLabel } from "@/components/CaseLabel";
import { caseLabelOf } from "@/lib/copy/caseLabel";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill, type Locale } from "@/lib/copy/locale";
import { around, withLink } from "./inPlace";

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
 * 5. **A drill for what was left**, as a `DrillLink` into the drill for the
 *    first goal left undone, rather than advice this screen wrote itself, and
 *    only where there is a drill. The goal is not printed again: it is already
 *    unticked at 2 and named first under "Try next time".
 * 6. **What was said**, both sides, which is the record. §12 of the design
 *    had it third and gave as its reason the job 3 does now, that this is
 *    where a learner finds out the word they were sure of was not the word.
 *    The transcript marks nothing, and it is the one section here with no
 *    bound on its length, so it sits under the things a learner can act on
 *    rather than between them and the outcome
 *    (`docs/21-situations.md` §12, amendment 1).
 * 7. **Say it today.** The errand this scene rehearses, and where the people
 *    are, under the same name Today uses for the same card: this is the
 *    screen a learner is on the moment they have just proved they can book
 *    the appointment, and it used to end in "have it again". The purpose of
 *    the app is to be left (`docs/22-real-life.md`), and a rehearsal that
 *    ends in another rehearsal keeps somebody inside. Shown only where every
 *    required beat was met, because sending somebody out on the strength of
 *    a conversation they did not get through is the false confidence the
 *    readiness screen is built against.
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
  /** The whole run at a glance: headline, stats, highlights, a note per turn (`lib/scenes/recap.ts`). */
  recap: SceneRecap;
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

/** Written out whole so the class names survive Tailwind's scan of this file. */
const HIGHLIGHT_COLS = ["", "sm:grid-cols-2", "sm:grid-cols-3"] as const;

export function SceneDebrief({ debrief, onAgain }: { debrief: Debrief; onAgain: () => void }) {
  /* Whether this conversation is a step of tonight's module, which decides
     whether the debrief carries a way on of its own. */
  const inModule = useModuleFocus() !== null;
  const t = useT();
  const locale = useLocale();
  const { scene, objectives, hurdles, outcome, gaps, turns, graded, review, recap } = debrief;
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
  /*
    ANU'S NOTE, ASKED ONCE THE REVIEW IS ON THE SCREEN (`/api/scene/note`).
    The review draws at once off the run; the note is a teacher's paragraph
    about this conversation and arrives beside it a moment later. Null is a
    real answer: no model configured, the allowance spent, or a note that
    reached for Estonian nobody used and was withheld whole. Then the card
    simply is not there, rather than apologising for itself.
  */
  const [note, setNote] = useState<{ comment: string; rule: string } | null | "waiting">("waiting");
  useEffect(() => {
    let live = true;
    fetch("/api/scene/note", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sceneId: scene.id,
        turns: turns.map((turn) => ({ who: turn.who, text: turn.text })),
        fixes: recap.moments.flatMap((moment) => moment.fixes),
        met: objectives.met,
      }),
    })
      .then((res) => (res.ok ? res.json() as Promise<{ note: { comment: string; rule: string } | null }> : { note: null }))
      .then((data) => { if (live) setNote(data.note && data.note.comment ? data.note : null); })
      .catch(() => { if (live) setNote(null); });
    return () => { live = false; };
    // One conversation, one note: the debrief is drawn once per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6" lang={locale}>
      {/*
        THE RUN AT A GLANCE, FIRST (`lib/scenes/recap.ts`). The headline is
        about what got done, in the learner's terms; the outcome is the scene's
        own sentence about how it ended; the four figures are things that
        happened in the conversation, never a score.
      */}
      <Card tone="night" className="scene-night scene-done evening flex flex-col gap-2">
        <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Your conversation, reviewed")}</p>
        <h2 className="font-display text-2xl leading-tight">{recap.headline}</h2>
        {outcome?.says && (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t(outcome.says)}</p>
        )}
      </Card>
      <div data-recap-stats className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recap.stats.map((stat, at) => (
          <StatTile key={stat.label} value={stat.value} label={stat.label} tone={STAT_TONES[at % STAT_TONES.length]} />
        ))}
      </div>
      {recap.highlights.length > 0 && (
        <section data-recap-highlights>
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("What went well")}</h3>
          {/*
            As many columns as there are cards, up to the three the recap
            ever writes: a fixed two left one card beside a blank half and a
            third card alone on a row of its own.
          */}
          <ul className={`grid gap-3 ${HIGHLIGHT_COLS[Math.min(recap.highlights.length, 3) - 1]}`}>
            {recap.highlights.map((highlight) => (
              <li key={highlight.title}>
                <Card className="flex h-full flex-col gap-2">
                  <p className="flex items-center gap-2 font-medium">
                    <Sparkles size={16} aria-hidden style={{ color: "var(--accent-deep)" }} />
                    {highlight.title}
                  </p>
                  {highlight.said && (
                    /*
                      Their own words, in the bubble they typed them in, because a
                      highlight is something somebody recognises about themselves.
                    */
                    <div className="night scene-night self-start rounded-[var(--r-lg)] p-2">
                      <p data-who="you" lang="et" className="scene-bubble scene-bubble-sm inline-block max-w-full">
                        <span className="sr-only">{t("You said:")}{" "}</span>{highlight.said}
                      </p>
                    </div>
                  )}
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>{highlight.detail}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
      {note !== null && (
        <section data-recap-note aria-live="polite">
          <Card tone="accent" className="flex flex-col gap-2">
            <p className="flex items-center gap-2 font-medium">
              <MessageCircleHeart size={16} aria-hidden style={{ color: "var(--accent-deep)" }} />
              {t("A note from Anu")}
            </p>
            {note === "waiting" ? (
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Anu is reading your conversation…")}</p>
            ) : (
              <>
                <p className="text-sm">{note.comment}</p>
                {note.rule && (
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    <span className="font-medium" style={{ color: "var(--ink)" }}>{t("Next time:")}{" "}</span>{note.rule}
                  </p>
                )}
              </>
            )}
          </Card>
        </section>
      )}
      {recap.nextTime.length > 0 && (
        <section data-recap-next className="recap-panel">
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Try next time")}</h3>
          <ul className="flex flex-col gap-2">
            {recap.nextTime.map((tip) => (
              <li key={tip.title} className="flex items-start gap-2">
                <ArrowRight size={16} aria-hidden className="mt-1" style={{ color: "var(--accent-deep)" }} />
                <p className="text-sm">
                  <span className="font-medium">{tip.title}.</span>{" "}
                  <span style={{ color: "var(--ink-2)" }}>{tip.detail}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="recap-panel">
        {/*
          The heading follows the list. "What you got done" over six unticked
          rows is a heading arguing with what is under it, and the run where
          that happens is the run somebody walked out of, which is the one
          where the copy has to be kind and accurate at once. The card above
          has already said the count, so this says what the list is.
        */}
        <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>
          {t(objectives.met.length === 0 ? "What you went in to get done" : "What you got done")}
        </h3>
        <ul className="flex flex-col gap-1">
          {required.map((beat) => {
            const met = objectives.met.includes(beat.id);
            return (
              <li key={beat.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden style={{ color: met ? "var(--sky-ink)" : "var(--ink-3)" }}>
                  {met ? "✓" : "○"}
                </span>
                <span style={{ color: met ? "var(--ink)" : "var(--ink-3)" }}>{t(beat.goal)}</span>
                <span className="sr-only">{t(met ? "done" : "not this time")}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {hurdles.length > 0 && (
        <section className="recap-panel">
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("What went wrong on the way")}</h3>
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
                  <span aria-hidden style={{ color: hurdle.met ? "var(--sky-ink)" : "var(--ink-3)" }}>
                    {hurdle.met ? "✓" : "○"}
                  </span>
                  <span style={{ color: hurdle.met ? "var(--ink)" : "var(--ink-3)" }}>
                    {t(spec.says)} {t(hurdle.met ? "You handled it." : "They let it slide.")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="recap-panel">
        <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("How it went")}</h3>
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
                  <span lang={note.id === "english" ? undefined : "et"} className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                    {note.said}
                  </span>
                  {note.times && (
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>{countOf(locale, note.times, "time")}</span>
                  )}
                  <span className="ml-auto shrink-0 text-xs" style={{ color: "var(--accent-deep)" }}>
                    {t(showing === note.at ? "Shown below" : "Show me where")}
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
                      {t(note.hunch.sure === "likely" ? "Most likely" : "Possibly")}:
                    </span>{" "}
                    {note.hunch.says}
                  </p>
                )}
                {/* And the form that was wanted, which is the dictionary's. */}
                <p className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
                  {note.form ? (
                    around(
                      fill(t("It should be {form}, {what}."), { what: note.what }),
                      "form",
                      <span lang="et" className="font-medium">{note.form}</span>,
                    )
                  ) : (
                    fill(t("They understood you anyway. It needed {what}."), { what: note.what })
                  )}
                </p>
                {note.term && (caseLabelOf(note.term) ? (
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    <CaseLabel label={caseLabelOf(note.term)!} />
                  </p>
                ) : (
                  <p className="text-xs" lang="et" style={{ color: "var(--ink-3)" }}>{note.term}</p>
                ))}
                {note.body && (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--ink-3)" }}>{note.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {gaps.length > 0 && (
        <section className="recap-panel">
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>
            {t("Words this conversation needed")}
          </h3>
          {/*
            Help is counted and never taken away: a learner who asks for four
            words and finishes has learned more than one who gave up with none.
            So this is a list with a way to keep them, not a tally of mistakes.
          */}
          <ul className="flex flex-wrap gap-2">
            {gaps.map((gap) => (
              <li key={gap.lemma} className="flex items-center gap-1">
                <span lang="et"><Chip tone="neutral" caseSensitive>{gap.lemma}</Chip></span>
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
        <section className="recap-panel">
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("A drill for what was left")}</h3>
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

            AND THE GOAL IS NOT PRINTED HERE AT ALL. It is already on this
            screen twice before this section, unticked in the list of what got
            done and first under "Try next time" with the reason it comes
            first, so a third copy here was the same sentence again and was
            reported as one. What this section adds is the drill, so the
            heading says that and points back at the item above it.
          */}
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
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("What was said")}</h3>
          {/*
            Both sides rather than the learner's alone, because a turn only
            makes sense beside the line it answered, and reading the whole
            exchange back is how somebody notices that "poodi" was the right
            answer to the wrong question.
          */}
          <ul className="night scene-night flex flex-col gap-2 rounded-[var(--r-xl)] border p-3 sm:p-4">
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
                const moment = mine !== null ? recap.moments[mine] : undefined;
                return (
                  <li
                    key={index}
                    ref={here ? marked : undefined}
                    className={turn.who === "you" ? "self-end text-right" : "self-start"}
                  >
                    {/*
                      THE SAME TWO BUBBLES THE CONVERSATION WAS HAD IN.

                      This is the record of a conversation, and it was drawn in
                      two white cards that differed only by which edge they sat
                      against, while the round itself gives the learner's own
                      words the accent's tint and squares off the corner nearest
                      the box they were typed in. Reading it back in a different
                      pair of shapes is the same exchange in somebody else's
                      handwriting.
                    */}
                    <div
                      data-who={turn.who === "you" ? "you" : "them"}
                      className="scene-bubble scene-bubble-sm inline-block max-w-full"
                      /* A ring set off the bubble by the stage's own ground, so it
                         reads on the gold of your turns and the glass of theirs. */
                      style={here ? { boxShadow: "0 0 0 2px var(--stage), 0 0 0 4px var(--butter)" } : undefined}
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
                      <span className="sr-only">{t(turn.who === "you" ? "You said:" : "They said:")}{" "}</span>
                      <span lang={turn.lang}>
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
                    </div>
                    {/*
                      How that turn went, in a few words, under the learner's own
                      bubble, and the dictionary's form beside any word that came
                      out differently. Never a mark: a miss is described, in the
                      neutral ink, as what happened.
                    */}
                    {moment && (
                      <p data-moment={moment.tone} className="mt-1 text-xs" style={{ color: MOMENT_INK[moment.tone] }}>
                        {moment.label}
                        {moment.fixes.map((fix) => (
                          <span key={fix.said}>
                            {": "}
                            <span lang="et">{fix.said}</span>
                            {" \u2192 "}
                            <span lang="et" className="font-medium">{fix.form}</span>
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                );
              });
            })()}
          </ul>
        </section>
      )}

      {errand && (
        <section>
          {/*
            "Now the real one" implied the conversation just had was not real,
            which is not the argument this section is making and read as a
            put-down of ten minutes somebody just spent. `SAY_IT_TODAY` is
            the same heading Today itself uses for the same errand when the
            answer to "did you speak any Estonian yesterday" is no
            (`components/SayItToday.tsx`), read off one constant rather than
            typed twice, so the two screens cannot drift into naming it
            differently.
          */}
          <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t(SAY_IT_TODAY)}</h3>
          <Card tone="sky">
            <p className="text-base font-semibold" style={{ color: "var(--sky-ink)" }}>{t(errand.says)}</p>
            {/*
              `errandPlaces` leads the sentence rather than following a colon.
              Every `where` in `lib/collections/errands.ts` is authored
              capitalized as a sentence's first word ("Work, a party" is
              "Work" then lowercase "a party"), so a lead-in like "Try it:"
              would put that capital mid-sentence instead, on every errand
              but the single-place ones.
            */}
            <p className="mt-1.5 text-sm" style={{ color: "var(--sky-ink)" }}>
              {withLink(
                fill(
                  t("{places}. Nobody there has seen your card, so you'll say it your own way, which is the whole point. Tomorrow, the [Today] screen will ask how it went."),
                  { places: placesIn(locale, errand, t) },
                ),
                (words) => <Link href="/">{words}</Link>,
              )}
            </p>
            {cafe && (
              <p className="mt-2 text-xs" style={{ color: "var(--sky-ink)" }}>
                {around(
                  t("No one to say it to? {name} runs language cafés, where people turn up hoping to be spoken to."),
                  "name",
                  <a href={cafe.href} target="_blank" rel="noopener noreferrer" className="underline">{t(cafe.name)}</a>,
                )}
              </p>
            )}
          </Card>
        </section>
      )}

      {/*
        THE WAY OUT IS ONE BLOCK, AND IT WAS THREE LOOSE SENTENCES.

        A learner read the end of a run and said it was three strings of text
        with nothing said. It was: a line about a word going into the review
        schedule, a line about second runs, the two buttons, and then a line
        about progress counting this as a review. The first and the last were
        the same fact in different words, twenty pixels apart, and the middle
        one was an argument for the button underneath it printed as though it
        were news.

        So the argument sits under the button it is an argument for, the two
        readings of the schedule are one sentence, and nothing floats. Only the
        schedule line is conditional, because a run that graded nothing has
        nothing to say about it, and the button is the point either way.

        THE BUTTONS NAME THE PRACTICE RATHER THAN BORROW THE ERRAND'S WORD.
        "Have it again" and "Another conversation" both named the bare noun
        "a conversation", which the errand card two inches above also uses
        for the real one ("Say it today"): a learner could not tell at a
        glance whether the second button was still about the errand. The
        landing page, the manifest and this app's own tagline already draw
        the line between the two with a verb rather than a second noun, "a
        conversation to rehearse" (`app/layout.tsx`, `app/manifest.ts`,
        `/situations`'s own "The rehearsal is here. The conversation is out
        there."): nobody rehearses a real conversation, they have one, so
        putting "rehearse" on both buttons here says which kind each is
        without inventing a new word for what this app has always called a
        scene, "a conversation", everywhere a learner reads it.
      */}
      <div className="flex flex-col gap-3">
        {/*
          The quiet way out first and the loud one last, which is the shape
          every other finish screen in the app has.
        */}
        {/*
          AND INSIDE TONIGHT'S MODULE NEITHER OF THESE IS THE WAY ON. The
          conversation is one step of an evening and what follows it is the
          next step, which is the "Next" the module draws here.
          Offering a different conversation there is the catalogue again, and
          offering this one again is a second decision on the screen whose job
          is to say how it went.
        */}
        <NextStep />
        {!inModule && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/situations" variant="ghost">{t("Rehearse a different conversation")}</ButtonLink>
            {/* Redoing it keeps this scene and redraws everything else. */}
            <Button variant="primary" onClick={onAgain}>{t("Rehearse this conversation again")}</Button>
          </div>
        )}

        {(objectives.missed.length > 0 || graded > 0) && (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {objectives.missed.length > 0 && `${t("Most of it sticks the second time round.")} `}
            {graded > 0 && (
              <>
                {withLink(
                  graded === 1
                    ? t("One word you used is now in [your reviews].")
                    : fill(t("{count} words you used are now in [your reviews]."), { count: graded }),
                  (words) => <Link href="/progress">{words}</Link>,
                )}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/** The top rule on each figure, in the brand mix, so the row reads as four things. */
const STAT_TONES = ["sky", "accent", "butter", "blush"] as const;

/** A turn note's ink: sky for landed, butter for nearly, and the quiet ink for the rest. */
const MOMENT_INK: Record<"right" | "nearly" | "neutral", string> = {
  right: "var(--sky-ink)",
  nearly: "var(--butter-ink)",
  neutral: "var(--ink-3)",
};

/**
 * Where an errand can be done, as one phrase in the learner's language. The
 * English reading is `errandPlaces`, untouched; another language translates
 * the authored list whole, because "in a shop or in a lift" takes a
 * preposition and a case per place that no list joiner can supply.
 */
function placesIn(locale: Locale, errand: Errand, t: (english: string) => string): string {
  return locale === "en" ? errandPlaces(errand) : t(errand.where);
}
