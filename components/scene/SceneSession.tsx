"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { BookOpen, Clock, CornerDownLeft, DoorOpen, LifeBuoy, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceCard, ChoiceGroup } from "@/components/Choice";
import { EstonianInput } from "@/components/EstonianInput";
import { Card, CardLink, Chip } from "@/components/ui";
import { SuggestFix } from "@/components/SuggestFix";
import { Dots } from "@/components/Dots";
import { Speak } from "@/components/Speak";
import { isSaid, isSpokenEstonian, type Provenance as SceneProvenance } from "@/lib/scenes/line";
import { conditionFor, hidesGoal, hidesWords } from "@/lib/audio/conditions";
import { GlossedSentence } from "@/components/GlossedSentence";
import type { GlossedToken } from "@/lib/dict/glossed";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { beginScene, finishScene, sceneHelp } from "@/app/actions";
import type { SceneSpec } from "@/lib/scenes/types";
import type { Difficulty } from "@/lib/scenes/curveballs";
import { BUDGETS } from "@/lib/scenes/curveballs";
import { SceneDebrief, type Debrief } from "./SceneDebrief";
import { SceneStage } from "./SceneStage";
import { SceneInterlude, VEIL_OUT_MS } from "./SceneInterlude";
import { SceneMotif } from "./SceneMotif";
import { sceneryFor } from "@/lib/scenes/scenery";
import { practises } from "@/lib/scenes/practises";

/**
 * One conversation, from the desk to the debrief.
 *
 * THERE ARE NO METERS (§7). No progress bar, no timer, no patience gauge: every
 * one of those turns this into a game about the gauge. Pressure is carried in
 * what the other person says, and when their patience runs out they say so and
 * move on. What stays on screen is the role card and the objectives, because
 * knowing what you came in to get done is not a hint, it is what somebody
 * walking into a health center already knows.
 *
 * THE SERVER MARKS EVERY TURN. This sends what has been typed and is told what
 * the other side says back; it never decides whether a turn landed. That is
 * ADR-022's split, and it is why the same function marks the run again when it
 * ends: two markers would be two answers to "were you understood", and the one
 * nobody watches is the one that drifts.
 *
 * A REPLY IS A FEW LINES, NOT ONE. The other side reacts to what was said and
 * then makes their move (`lib/scenes/reply.ts`), so what arrives is a list:
 * "Hästi." and then the next question, or "Ma ei saa aru" and the same
 * question again, or "Jah?" on its own while they wait for the rest of a
 * sentence. Each line still carries where it came from (ADR-025), and a line
 * of English about what they did is drawn as a stage direction rather than as
 * a bubble, because it is not something anybody said.
 *
 * YOU CAN WALK OUT. Leaving is a real option in a real conversation, and the
 * debrief handles it without a word of reproach.
 */

/*
  Read off the one definition rather than written out again. This was a second
  copy of the list, so the day a line learned to be a break in time or a hint
  from the app, the screen went on knowing nine kinds and `PROVENANCE` still
  type-checked with two of them missing. A type-only import is erased, so a
  client component pays nothing for it.
*/
type Provenance = SceneProvenance;

interface Line {
  readonly text: string;
  readonly provenance: Provenance;
  readonly reaction?: true;
  /**
   * The line read word by word, so a learner can open any word the
   * dictionary vouches for without leaving the conversation. Absent on a
   * stage direction, and on any line the route could not gloss.
   */
  readonly tokens?: GlossedToken[];
  /**
   * Every rung that wrote a piece of this bubble, where two lines were said in
   * one breath (`inOneBreath`). One entry on a line that stands alone, and the
   * words under the bubble name them in the order they were said, because a
   * reply that says "your word, said back" and then asks a question written
   * for this turn is two claims and both are owed to the reader (ADR-025).
   */
  readonly rungs?: readonly Provenance[];
}

/**
 * What a turn was understood despite: the learner's spelling and the form
 * the other side would use, off the server's own marking. Shown under the
 * learner's bubble as "understood", never as a verdict, because that is
 * what happened (`lib/scenes/nearly.ts`).
 */
export interface SlipNote {
  readonly kind: "spelling" | "case" | "person";
  readonly said: string;
  readonly form: string | null;
}

type Turn =
  | { readonly who: "you"; readonly text: string; readonly slips?: readonly SlipNote[] }
  | { readonly who: "them"; readonly lines: readonly Line[] };

type Phase = "briefing" | "talking" | "debrief";

interface Opened {
  runId: string;
  /** Runs of this scene before this one, which opens the hearing pool. */
  plays: number;
  card: { you: string; props: { slot: string; card: string; given: readonly string[]; returned?: true }[] };
  persona: string;
  composed: boolean;
}

interface Sent {
  beatId: string;
  said: string;
  helped: boolean;
  /** The Estonian line this turn answers, for the echo rule and for saying it again. */
  heard: string;
}

/**
 * How hard a day the person behind the desk is having.
 *
 * Written as what happens to *you* rather than as a setting. "Two or three,
 * and one of them is real" is a note to whoever wrote the curveball table;
 * "they will throw two or three things at you" is what somebody choosing
 * between four buttons wants to know.
 */
const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "textbook", label: "Easy", blurb: "It all goes the way the lesson said it would." },
  { id: "good", label: "Fairly easy", blurb: "One thing catches you out." },
  { id: "ordinary", label: "Normal", blurb: "Two or three, the way a real counter goes." },
  { id: "bad", label: "Hard", blurb: "As bad as a Tuesday at a busy desk." },
];

/*
  Both read off `lib/scenes/line.ts` rather than written out here, because this
  was one of three copies of the same list and the day a line learned to be a
  break in time or a hint from the app, two of them did not hear about it.
*/
/** Whether a line is Estonian the other side said, as opposed to a note or their English. */
const spokenEstonian = (line: Line) => isSpokenEstonian(line.provenance);
/** Whether a line was said at all, in either language. */
const spoken = (line: Line) => isSaid(line.provenance);
/**
 * Whether "this is not how anybody says it" is a thing to say about a line.
 *
 * Not about a line said once more, since the report belongs on the first
 * time it was said, and not about the learner's own word handed back to
 * them: a report there is somebody reporting themselves. A recast is
 * reportable, because the form in it is the dictionary's.
 */
const reportable = (line: Line) =>
  spokenEstonian(line) && line.provenance !== "again" && line.provenance !== "echo";

/**
 * A REPLY IS ONE THING SAID, NOT A LIST OF BUBBLES.
 *
 * `replyFor` builds a reply as a reaction and then a move, which is right, and
 * the screen drew each of them in a card of its own: `Jah.` in one bubble and
 * `Kuhu sa nüüd lähed?` in the next, twice a turn, all the way down. Nobody
 * talks in two bubbles. A learner read it back and said the other side was
 * answering itself, and the transcript is the record of the conversation, so
 * the fault was in the debrief as loudly as in the round.
 *
 * So consecutive lines said in Estonian are one bubble, joined with a space:
 * "Jah. Kuhu sa nüüd lähed?" is what a friend on the phone says in one breath.
 * Nothing else is merged, and that is the whole of the rule: a break in time,
 * a hint from the app and a stage direction are not something anybody said, so
 * they stand on their own and keep their own drawing.
 *
 * WHERE THE LINE CAME FROM SURVIVES THE JOIN, which is ADR-025's claim and the
 * reason this returns a line rather than a string. The bubble carries every
 * rung that wrote a piece of it, in the order it was said, and the words under
 * it name them all; `provenance` stays the move's, because that is the line
 * the learner is answering and the one a report is about.
 */
export function inOneBreath(lines: readonly Line[]): Line[] {
  const out: Line[] = [];
  for (const line of lines) {
    const last = out[out.length - 1];
    if (!last || !spokenEstonian(last) || !spokenEstonian(line)) {
      out.push({ ...line, rungs: [line.provenance] });
      continue;
    }
    out[out.length - 1] = {
      ...line,
      text: `${last.text} ${line.text}`,
      rungs: [...(last.rungs ?? [last.provenance]), line.provenance],
      /*
        The dictionary under the line survives too, where every piece has one.
        A spacer between them keeps the module's own promise that joining every
        token's text gives the sentence back, which is what the speaker reads.
      */
      ...(last.tokens && line.tokens
        ? { tokens: [...last.tokens, { text: " ", word: false, taught: false, entry: null }, ...line.tokens] }
        : { tokens: undefined }),
    };
  }
  return out;
}

/**
 * The line the learner is now answering: the other side's last move, which is
 * never a reaction and never a stage direction. `Jah?` on its own leaves the
 * question before it standing, which is exactly what waiting means.
 */
function moveIn(lines: readonly Line[]): string | null {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]!;
    if (line.reaction) continue;
    /*
      A move made in English leaves nothing to say again: the last Estonian
      question is over and repeating it would be repeating the wrong one,
      which is what happened when a stage direction stood between two beats.
    */
    return spoken(line) ? line.text : "";
  }
  return null;
}

export function SceneSession({ scene, minutes, unit }: {
  scene: SceneSpec;
  /** How long it takes, printed on the briefing beside where you are standing. */
  minutes: number;
  /**
   * The unit whose "you can do this" claim this scene takes apart, where the
   * syllabus has one. It used to sit in the page header, and the page header
   * is gone: without the shell there is nothing above this component, which
   * is what makes a conversation a room rather than a page (`SceneStage`).
   * So it is offered on the briefing, where somebody deciding whether they
   * are ready is the person it is for, and nowhere during the conversation,
   * where a link to a lesson is a door out of the room.
   */
  unit?: { id: string; title: string } | null;
}) {
  const [phase, setPhase] = useState<Phase>("briefing");
  const [difficulty, setDifficulty] = useState<Difficulty>("good");
  const [opened, setOpened] = useState<Opened | null>(null);
  const [turns, setTurnsState] = useState<Turn[]>([]);
  /*
    THE TRANSCRIPT IS READ FROM A REF, BECAUSE THE DEBRIEF IS BUILT IN THE SAME
    BREATH AS THE LAST TURN.

    The reply arrives, `setTurns` appends it, and two lines later `data.over`
    calls `hangUp`, all inside one continuation after `await response.json()`.
    React batches updates scheduled there, so no render commits between them
    and `hangUpRef.current` is still the closure from the previous commit,
    whose `turns` does not hold the reply that just arrived. Every scene that
    ends the ordinary way, on its last beat or on the persona running out of
    patience, produced a debrief missing its final exchange: the sign-off, or
    the moment they gave up, and the slips written onto the learner's last turn
    with it. A scene that ended on the first server turn had no transcript at
    all.

    The ref is written by the same updater that writes the state, so the two
    cannot come apart, and `hangUp` reads the ref. Grading was never affected:
    `finishScene` is handed `finalTurns` as an argument, which is fresh.
  */
  const turnsRef = useRef<Turn[]>([]);
  const setTurns = useCallback((update: (was: Turn[]) => Turn[]) => {
    setTurnsState((was) => {
      const next = update(was);
      turnsRef.current = next;
      return next;
    });
  }, []);
  const [sent, setSent] = useState<Sent[]>([]);
  const [beatId, setBeatId] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [heard, setHeard] = useState<string>("");
  /** Whose voice the other side speaks in, off the run's persona. */
  const [voice, setVoice] = useState<string | undefined>(undefined);
  /** How fast they talk: the persona's pace, faster once they have sped up. */
  const [speed, setSpeed] = useState(1);
  const [asked, setAsked] = useState<{ lemma: string; lexemeId: string | null }[]>([]);
  const [helped, setHelped] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  /*
    What the ledger said, on the turn it said it. A run no longer books at the
    door, so "your allowance is spent" is news that arrives mid-conversation
    rather than a fact known at the briefing, and it belongs where it is true.
  */
  const [note, setNote] = useState<string | null>(null);
  /** The word the help button last handed over, shown until the next turn. */
  const [lent, setLent] = useState<{ lemma: string; gloss: string } | null>(null);
  /*
    THE SCENE MOVING, AND THE ONE MOMENT NOTHING CAN BE TYPED.

    A `meanwhile` line is the scene picking the learner up and putting them
    somewhere else, and every question after it is asked about the new place.
    While this is set the room is covered (`components/scene/SceneInterlude.tsx`)
    and the reply that follows the move is held, so the conversation the
    learner comes back to is already the new one rather than changing under a
    screen they could not see. `done` is what the cover calls when it has been
    read or pressed through, and `speak` is waiting on it.
  */
  const [interlude, setInterlude] = useState<{ text: string; done: () => void } | null>(null);
  /*
    HOW THE OTHER SIDE SOUNDS, WHICH IS THE ROOM THIS FEATURE WAS WRITTEN FOR.

    `lib/audio/conditions.ts` opens with a counter, a clinic ringing back on a
    bad line and a sentence caught from the middle of a conversation, and for
    its whole life it reached two flashcard rounds and never a conversation:
    the receptionist was the one voice in the app that always spoke from a
    studio. The pool opens on how many times this learner has had *this*
    conversation, which is the same claim the word pool makes one level down,
    so a first visit to a health centre is a quiet room and the harder
    deliveries arrive once the encounter itself has stopped being the hard
    part. Skippable, because nothing marks the words of a line the other side
    says: the learner answers the beat, and catching a sentence from halfway
    is the thing the table exists to rehearse rather than a way to be marked
    down.
  */
  const { hearing, support } = useAudioPrefs();
  /*
    WHICH LINES THE LEARNER HAS ASKED TO SEE.

    With `support` on, the other side's Estonian is spoken and its words
    wait behind a press: in a shop you do not get the subtitles, and every line
    here has been text and audio at once, so catching it the first time at
    somebody else's speed was the one thing a rehearsal never rehearsed.

    Keyed on the text rather than on an index, because a line said again is the
    same line and should stay shown; the newest line is what is hidden, and the
    set only ever grows, so nothing a learner has already read is taken back.
    Revealing is free and is written down nowhere: the point is to try first,
    not to be marked on it.
  */
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  /* Whether the objective has been asked for on this beat. Reset when it changes. */
  const [goalShown, setGoalShown] = useState(false);
  const reveal = useCallback((text: string) => {
    setShown((was) => (was.has(text) ? was : new Set([...was, text])));
  }, []);

  /*
    `ask` is main's, and the panel it points at is what the page comes down to
    after a reply. There is no `log` ref beside it any more: the transcript is
    not a scroller of its own (see the effect below), so there is nothing to
    scroll inside it.
  */
  const ask = useRef<HTMLDivElement>(null);
  /*
    A scene can end on its own, when the last beat is done or the persona has
    run out of patience, and the turn that ended it is the one that has to hang
    up. `speak` is memoised and `hangUp` is not, so calling it directly captured
    whichever `hangUp` existed when `speak` was last built, closing over the
    `asked` and `turns` of that render: a learner who pressed the help button
    twice and then finished lost both words off the debrief, silently, because
    the stale closure sent an empty list. The ref is always this render's.
  */
  const hangUpRef = useRef<(t: Sent[], walkedOut: boolean) => Promise<void>>(
    async () => {},
  );

  /*
    THE CONVERSATION IS THE PAGE, AND FOR A WHILE IT WAS A BOX INSIDE ONE.

    The turns were in a `scroll-host` capped at 46vh, on the containment rule,
    and that is the shape the first-run wizard already removed from its own
    screen: a nested scroll region inside a page that also scrolls swallows the
    wheel. Measured on `bussipilet` at 1280x900 after six turns, the page had
    323px still to go and the log had 1,622px of turns in a 414px box sitting
    across the middle of the column, with `overscroll-behavior: contain` on it
    so the scroll could not chain out. A pointer anywhere over the transcript
    scrolled the transcript, and once that hit its end the page never moved
    again: the input, the goal for this turn and every button under it were
    below the fold and unreachable, which reads as an app that has frozen.
    Auto-scrolling the box to the newest turn is what made it certain, since
    the box is at its end the moment a reply lands.

    Containment never asked for a second scroller. It asks that nothing is
    drawn outside the box it was given, and a list that grows downward makes a
    page taller rather than overflowing anything. So there is one scroller
    here, the page, and what brings the newest line into view is the effect
    below, which came down main and is the better half of two answers written
    the same day: it moves the page to the panel a learner answers in, does
    nothing at all when that is already on screen, and is still for anybody who
    asked for less movement. What is left here is the two moments a screen has
    to open at its own top rather than wherever the screen before it was left.
  */
  /*
    THE CARET GOES BACK IN THE BOX, BECAUSE THE BUTTON TAKES IT AND THEN LEAVES.

    "Say it" disables itself the moment the draft is empty, which is the moment
    the turn is sent, and a browser moves focus off a control that has just been
    disabled: measured, `document.activeElement` was `BODY` after every turn
    taken with the mouse. So the learner had to click back into the box for each
    turn of a conversation, and a keyboard could not carry on at all. Answering
    with Enter never had the fault, since the box keeps focus, which is why it
    survived this long.

    Only where focus was lost, never taken: if it sits on a word of the last
    line, on the report button or anywhere else the learner put it, it stays
    there. And there is deliberately no focus when a scene opens: the box is at
    the bottom of the page, so focusing it would scroll the role card off a
    phone and open the keyboard over the first thing there is to read.
  */
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    /*
      A debrief is read from its own first line. The page is left wherever the
      last turn put it, which with the transcript in the page rather than in a
      box of its own is most of a screen down: measured at 827px, with the
      debrief's own heading 779px above the top of the window, so a scene ended
      on a page that opened halfway through what it had to say.
    */
    if (phase === "debrief") {
      window.scrollTo({ top: 0 });
      return;
    }
    /*
      And a conversation opens at its own top. The briefing is taller than a
      phone, so the button that starts it is below the fold: measured at 360,
      it sits at 849 in a 740 window, so a learner has scrolled about 300px by
      the time they press it and the scroll is left there when the screen
      changes under them. What they were then looking at was the first line
      with the role card cut off 114px above the top of the window, on the one
      card the whole conversation is answered from, and the title of the scene
      gone. Where the briefing fits, which is every desktop width, this is the
      scroll it is already at and moves nothing.
    */
    if (phase === "talking" && turns.length === 0) window.scrollTo({ top: 0 });
  }, [turns.length, phase]);

  /*
    AND THE PAGE COMES DOWN TO THE BOX WHEN IT IS YOUR TURN AGAIN.

    The card and what to get done stand above the conversation and are worth
    the room they take, which on a phone puts the box below the fold: every
    turn was press, read the reply, scroll, type. The reply lands at the
    bottom of the log and the box is directly under it, so bringing the box
    into view brings the newest line with it, which is the pair a learner
    needs at that moment.

    `block: "nearest"` rather than a scroll to a position, because it does
    nothing at all when the box is already on screen, which is the desktop
    case and the case on a phone once somebody has scrolled down: a page that
    jumps on every turn is worse than one that never moves. Only on a line
    from the other side, never on the learner's own turn appearing, and never
    smooth for somebody who has asked for less movement.
  */
  useEffect(() => {
    if (turns[turns.length - 1]?.who !== "them") return;
    /*
      EXCEPT ON THE LINE THAT OPENS THE SCENE, WHICH NOBODY HAS ANSWERED YET.

      This says "when it is your turn again", and on the first line there is no
      again: the learner has said nothing, and what is above the conversation is
      the role card they answer *from*, with the destination and the time on it.
      Measured at 360 on the merged tree, coming down to the panel then put the
      page 531px in, with the card 320px above the top of the window and the
      scene's title 499px above it, which is the fault `test-mobile.mjs` was
      written for one pass earlier. So the page comes down once there is a
      conversation to come back to.
    */
    if (!turns.some((turn) => turn.who === "you")) return;
    const still = typeof matchMedia === "function"
      && matchMedia("(prefers-reduced-motion: reduce)").matches;
    /*
      THE WHOLE PANEL, WHICH `nearest` STOPPED REACHING WHEN THE LOG LOST ITS
      OWN SCROLLER.

      `block: "nearest"` scrolls the least it can, which was right while the
      transcript was a 46vh box and the panel sat just under it. With the
      conversation flowing down the page the panel is the last thing on a much
      taller one, and the least it can do leaves the panel's top on screen and
      everything under it off: measured at 390 after two turns, the field's
      bottom edge was the window's bottom edge, "Say it" was 70px below the
      fold and the page had 347px still to go. That is the report this pass
      started from, arriving through the fix for it.

      So: nothing at all where the panel is already whole on screen, which is
      the desktop case and main's own argument; its bottom brought up to the
      window's where it is not, which shows the ask, the box and the button
      together; and its top where the panel is taller than the window, since
      the half worth seeing then is the one you read before you type.
    */
    const panel = ask.current;
    if (!panel) return;
    const at = panel.getBoundingClientRect();
    const whole = at.top >= 0 && at.bottom <= window.innerHeight;
    if (!whole) {
      panel.scrollIntoView({
        block: at.height > window.innerHeight ? "start" : "end",
        behavior: still ? "auto" : "smooth",
      });
    }
    /*
      And the caret goes back in the box, which is the same moment: "Say it"
      disables itself as the draft empties, and a browser moves focus off a
      control it has just disabled, so `document.activeElement` was `BODY`
      after every turn taken with the mouse and the learner had to click back
      in for each one. Only where focus was lost, never taken: on a word of
      the last line or on the report button it stays where the learner put it.
    */
    /*
      `preventScroll`, or the caret does the placing instead of the panel: a
      browser scrolls a field it is focusing the least it can, which lands the
      field's bottom edge flush with the window's and leaves "Say it" below the
      fold. Measured at 390: the field's bottom was 844 in an 844 window and the
      button 70px under it, on a page with 347px still to go. The panel above
      decides where the page sits; this only decides where the caret is.
    */
    if (document.activeElement === document.body) box.current?.focus({ preventScroll: true });
  }, [turns]);

  const speak = useCallback(async (next: Sent[]) => {
    if (!opened) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/scene", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: opened.runId, turns: next, used }),
      });
      /*
        A FAILURE MAY NOT MISNAME ITS CAUSE. Reading the body without looking at
        the status made a 500 and a dead network the same sentence, and the
        first version of this said "that did not reach us" about a route that
        had answered perfectly promptly with an error. That sends whoever reads
        it to check their connection about a bug in this app.
      */
      if (!response.ok) {
        setError(
          response.status === 429
            ? "That was a lot of turns at once. Give it a moment."
            : "Something went wrong at our end. Your turn is still here.",
        );
        return;
      }
      const data = await response.json() as {
        lines?: Line[]; voice?: string; speed?: number;
        beatId?: string | null; goal?: string | null; done?: string[];
        over?: boolean; error?: string;
        composed?: boolean; note?: string | null;
        slips?: SlipNote[];
      };
      if (data.error) { setError(data.error); return; }
      if (data.composed === false && data.note) setNote(data.note);

      /*
        What the last turn was understood despite, written onto that turn so
        the note sits under the learner's own words. The server marked it,
        because the screen never decides whether a turn landed.
      */
      const slips = data.slips ?? [];
      if (slips.length > 0) {
        setTurns((was) => {
          const at = was.length - 1;
          const last = was[at];
          if (!last || last.who !== "you") return was;
          return [...was.slice(0, at), { ...last, slips }];
        });
      }

      /*
        WHAT COMES AFTER THE SCENE MOVES WAITS UNTIL IT HAS MOVED.

        A reply carrying a `meanwhile` walks the learner out of one place and
        into another, and every line from that point on is said in the new one.
        Appending the lot at once drew the move as one more bubble among
        bubbles that all arrive the same way, which is exactly what two
        learners reported as the scene not having told them anything.

        So the reply is cut at the break. What was said before it lands now,
        because it was said in the old place; the break itself and everything
        after it, along with the beat, the objective and the line to answer,
        wait behind the cover. `busy` is true for the whole of it, which is
        what closes the composer: a turn typed into a scene that is halfway
        through moving is a turn answered about the wrong place.
      */
      const lines = data.lines ?? [];
      const moves = lines.findIndex((line) => line.provenance === "meanwhile");
      if (moves >= 0) {
        const before = lines.slice(0, moves);
        if (before.length > 0) setTurns((was) => [...was, { who: "them", lines: before }]);
        await new Promise<void>((resume) => {
          setInterlude({ text: lines[moves]!.text, done: resume });
        });
      }
      /* The move itself stays in the transcript, so the record of the
         conversation still says where it happened. */
      const said = moves >= 0 ? lines.slice(moves) : lines;

      setBeatId(data.beatId ?? null);
      /*
        A new objective is a new beat, so the cold level hides it again: the
        press is per beat rather than per scene, or the first one would be the
        only one anybody had to work out.
      */
      setGoal((was) => {
        const next = data.goal ?? null;
        // A new objective is a new beat, so the cold level hides it again.
        if (next !== was) setGoalShown(false);
        return next;
      });
      if (data.voice) setVoice(data.voice);
      if (typeof data.speed === "number" && data.speed > 0) setSpeed(data.speed);
      setDone(data.done ?? []);
      if (said.length > 0) setTurns((was) => [...was, { who: "them", lines: said }]);
      /*
        And the cover comes off last, over the new place rather than over the
        old one. It is cleared on a timer rather than in the line above so the
        fade has something to fade to: the lines said after the move are
        already underneath it by the time it starts going, which is the whole
        of why the room appears to have changed while nobody was looking.
      */
      if (moves >= 0) {
        window.setTimeout(() => {
          setInterlude(null);
          /*
            AND THE CARET GOES BACK IN THE BOX.

            The cover takes focus while it is up, which is right: the screen has
            stopped for a moment that has to be read, and a learner on a
            keyboard whose caret is in a box they cannot type into has been told
            nothing. But the button it took focus onto is removed here, and a
            browser drops focus to the body when that happens, so without this
            the conversation resumed with the caret nowhere and the next turn
            had to be started with the mouse. The effect that usually puts it
            back only runs when a turn arrives, and the turn arrived while the
            cover still had it.

            On the next frame, because React removes the button in this commit
            and focusing before that lands on an element about to go.
          */
          requestAnimationFrame(() => box.current?.focus({ preventScroll: true }));
        }, VEIL_OUT_MS);
      }
      if (lines.length > 0) {
        /*
          Read off the whole reply rather than off the half that waited: the
          line the learner is now answering and the lines a beat may not say
          twice are facts about what was said, and cutting the list at the
          break would lose either of them whenever the move came last.
        */
        const move = moveIn(lines);
        if (move !== null) setHeard(move);
        // Both rungs the route passes over once used. A scripted line left out
        // of this would be the one sentence a beat can repeat.
        const fresh = lines
          .filter((line) => line.provenance === "attested" || line.provenance === "scripted")
          .map((line) => line.text);
        if (fresh.length > 0) setUsed((was) => [...was, ...fresh]);
      }
      if (data.over) await hangUpRef.current(next, false);
    } catch {
      /*
        The network, which is the case this catch is actually for now that a
        refusal is read off the status. Either way the conversation stays where
        it was: the turn they typed is still theirs and pressing again resends
        it.
      */
      setError("That did not reach us. Try again.");
    } finally {
      setBusy(false);
    }
  }, [opened, used, setTurns]);

  async function start() {
    setBusy(true);
    setError(null);
    const result = await beginScene(scene.id, difficulty);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }

    /*
      The briefing and nothing else: the plan stays on the server, so there is
      no cast here and nothing to read off a network tab. `Briefing` in
      `lib/progress/scene.ts` is where that is argued.
    */
    setOpened({
      runId: result.runId,
      plays: result.plays,
      card: { you: result.briefing.you, props: [...result.briefing.props] },
      persona: result.briefing.persona,
      composed: result.composed,
    });
    setPhase("talking");
  }

  async function help() {
    setBusy(true);
    const result = await sceneHelp(opened?.runId, sent);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    setHelped(true);
    setLent({ lemma: result.lemma, gloss: result.gloss });
    setAsked((was) => [...was, { lemma: result.lemma, lexemeId: result.lexemeId }]);
  }

  async function say() {
    const said = draft.trim();
    if (!said || !beatId || busy) return;
    const next = [...sent, { beatId, said, helped, heard }];
    setSent(next);
    setTurns((was) => [...was, { who: "you", text: said }]);
    setDraft("");
    setHelped(false);
    setLent(null);
    await speak(next);
  }

  /*
    Asking for repetition is the most useful sentence a learner can own, so it
    is a control rather than something they have to think of. It costs no
    turn, no patience and no round trip: the line they were answering is said
    again, as it was, because a person asked to repeat themselves repeats
    themselves rather than rephrasing.
  */
  function again() {
    if (!heard) return;
    setTurns((was) => [...was, { who: "them", lines: [{ text: heard, provenance: "again" }] }]);
  }

  async function hangUp(finalTurns: Sent[], walkedOut: boolean) {
    setBusy(true);
    const result = await finishScene({
      runId: opened?.runId, turns: finalTurns, walkedOut, asked,
    });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    setDebrief({
      scene,
      objectives: result.objectives,
      hurdles: result.hurdles,
      outcome: result.outcome,
      gaps: result.gaps,
      graded: result.graded,
      review: result.review,
      turns: turnsRef.current.flatMap((turn): Debrief["turns"][number][] => {
        if (turn.who === "you") return [{ who: "you", text: turn.text, lang: "et" }];
        /*
          A LINE EACH, WHICH IS HOW THEY WERE SAID AND HOW THEY WERE DRAWN.

          A reply is a reaction and then a move, so it arrives as a list, and
          the transcript joined the list into one string per language. Nothing
          in that list promises to end in a full stop: `Ma ei saa aru` is a
          phrase the course teaches as a lemma, so a turn that could not be
          made out and then asked again read back as "Ma ei saa aru Tere!",
          one run-on sentence nobody said. Each line is its own bubble in the
          conversation itself and is its own bubble here, which also carries
          the language per line for free. That was the reason the join was
          split in two: joining a stage direction to Estonian and marking the
          result `lang="et"` had a screen reader saying the English with
          Estonian phonology.
        */
        return inOneBreath(turn.lines).filter(spoken).map((line) => ({
          who: "them" as const,
          text: line.text,
          lang: spokenEstonian(line) ? ("et" as const) : ("en" as const),
        }));
      }),
    });
    setPhase("debrief");
  }

  hangUpRef.current = hangUp;

  // The first line, once the run is open.
  useEffect(() => {
    if (phase === "talking" && opened && turns.length === 0) void speak([]);
  }, [phase, opened, turns.length, speak]);

  /*
    WHAT THERE IS TO GET DONE, READ ONCE FOR EVERY PHASE.

    This used to be worked out after the briefing had already returned, which
    was fine while the briefing was a screen of its own. The bar along the top
    of the room draws a pip per objective and it is above all three phases, so
    the reading has to be here: one list, one count, and the checklist below
    reads the same two, which is what stops the pips and the ticks disagreeing
    about a conversation the learner is in the middle of.
  */
  const objectives = scene.beats.filter((beat) => beat.required);
  const metCount = objectives.filter((beat) => done.includes(beat.id)).length;
  const progress = objectives.map((beat) => ({
    met: done.includes(beat.id),
    now: !done.includes(beat.id) && beat.id === beatId,
    goal: beat.goal,
  }));

  if (phase === "debrief" && debrief) {
    /*
      The debrief stays inside the room. A conversation that dropped the
      learner back onto the website the moment it ended would take the one
      screen that says what just happened and draw it beside a rail, and the
      way out is a door on the bar and two buttons at the foot of the debrief
      itself. The pips go, because there is nothing left in play and the
      debrief lists every objective under its own heading.
    */
    return (
      <SceneStage sceneId={scene.id} title={scene.title} place={scene.place}>
        <div className="scene-open">
          <SceneDebrief debrief={debrief} onAgain={() => window.location.reload()} />
        </div>
      </SceneStage>
    );
  }

  if (phase === "briefing") {
    return (
      <SceneStage sceneId={scene.id} title={scene.title} place={scene.place} minutes={minutes}>
      <div className="scene-open flex flex-col gap-5">
        {/*
          THE DOOR, WHICH IS THE ONE PLACE THIS MODULE GETS TO BE PLEASED WITH
          ITSELF.

          Fourteen conversations opened as fourteen identical white cards, and
          the only thing telling a health centre from a job interview was the
          sentence you read. The room says which room it is before a word of it
          is read: `lib/scenes/scenery.ts` gives every scene an icon and one of
          five movements, and the movement is the place's own, so a counter has
          a queue advancing at it and a phone call rings out in circles.

          Decoration, and it says so: everything it carries is printed beside
          it in words, which is what lets it be hidden from a screen reader
          outright. And it is drawn in the accent like everything else, because
          the other four hues in this app mean something and a café is not
          "you got it".
        */}
        <div className="flex flex-col items-center gap-3 pb-1 pt-2 text-center">
          <SceneMotif sceneId={scene.id} />
          <p className="label-xs" style={{ color: "var(--accent-deep)" }}>
            {sceneryFor(scene.id).label}
          </p>
        </div>

        <Card className="flex flex-col gap-2">
          {/*
            WHO YOU ARE, AND NOT WHERE YOU ARE AGAIN.

            This card was headed with the place, which the page above it
            already prints as its lead, so the first two lines of the screen
            were the same sentence twice. What the card is for is the role, so
            the role leads it and there is no heading at all: the role is
            forty words of prose, and a heading that long is a paragraph
            wearing an `h2`, which is worse for somebody moving by headings
            than having none.
          */}
          {/*
            On the scale. A bare paragraph inherits the document's own 16px,
            which is a step the type scale does not have, and this is the
            first and largest thing anybody reads on the way into a scene.
          */}
          <p className="text-md leading-relaxed">{scene.role}</p>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            You will need {practises(scene).join(", ")}. They speak first, you answer, and the box
            you type into says what to say each time. The card above the conversation lists what to
            get done and ticks it off.
          </p>
          {/*
            Said before the first line rather than discovered on the third,
            because a learner who expects to be marked writes less than one
            who expects to be understood, and being understood is the point.
          */}
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            An ending that is off is still understood, the way it would be on the street. They
            will say the word back the way they say it, and the debrief lists those afterwards.
          </p>
          {/*
            What is coming, in the scene's own terms. It is the count the bar
            above draws as pips and the checklist ticks, read off the same
            list, so nothing here is a second answer to it.
          */}
          <p className="mt-1 text-sm font-medium" style={{ color: "var(--ink-2)" }}>
            {objectives.length} things to get done, in about {minutes} minutes.
          </p>
        </Card>

        {/*
          THE LESSON BEHIND THE CONVERSATION, AND NOT IN THE BAR ABOVE IT.

          This is the two-way link §14 asks for: a scene takes apart a unit's
          own "you can do this" claim, and somebody deciding whether they are
          ready should be able to go and read it. It sat in the bar and cost
          the room's name half its width on a phone, which is the one width
          this app is measured at. Here it is a door beside the briefing, and
          it is gone for the whole of the conversation, where a link to a
          lesson is a door out of a room somebody has just stepped into.
        */}
        {unit && (
          <CardLink href={`/learn/${unit.id}`} icon={<BookOpen size={16} aria-hidden />}>
            The lesson behind it: {unit.title}
          </CardLink>
        )}

        {/*
          The dial sits on the scene rather than in Settings, because it is a
          decision about this conversation rather than a preference about the
          app: somebody who found the last one hard should be able to turn it
          down where they feel it.

          `ChoiceGroup` rather than four bare buttons, and that is a fix rather
          than a tidy-up. These were `aria-pressed` toggles, so four mutually
          exclusive options announced as four unrelated switches and cost four
          tab stops, where a radio group is one stop and says "2 of 4"; and the
          chosen one was told apart by a background alone, which is the rule
          about a colour never carrying a distinction on its own broken on the
          one control where the colour *is* the answer. `ChoiceCard` was
          written for exactly this shape and every other pick-one in the app
          already uses it.
        */}
        <ChoiceGroup
          label="How hard do you want it"
          className="grid gap-2 sm:grid-cols-2"
        >
          {DIFFICULTIES.map((one) => (
            <ChoiceCard
              key={one.id}
              selected={difficulty === one.id}
              onSelect={() => setDifficulty(one.id)}
              title={one.label}
              detail={one.blurb}
              layout="stacked"
            />
          ))}
        </ChoiceGroup>

        {error && <p className="text-sm" style={{ color: "var(--peach-ink)" }}>{error}</p>}
        <Button onClick={start} disabled={busy} variant="primary" size="lg">
          {busy ? "Getting ready" : "Start the conversation"}
        </Button>
      </div>
      </SceneStage>
    );
  }

  /*
    What the learner was dealt, flattened, for the line that stays on screen
    while they type. English, like the card itself: saying it in Estonian is the
    exercise, so the word is not here either.
  */
  const dealt = (opened?.card.props ?? []).flatMap((prop) => prop.given);
  /*
    Whether the room is between two places, read once. `busy` already closes
    every control while a turn is in flight and this is the stricter half of
    it: a cover is up, the question after the move has not been shown, and
    nothing on the screen underneath may be pressed or typed into. One reading
    rather than five, because five controls each testing `interlude` for
    themselves is how one of them comes to be the one that stayed live.
  */
  const moving = interlude !== null;

  return (
    <SceneStage sceneId={scene.id} title={scene.title} place={scene.place} progress={progress}>
    {/*
      THE COVER, WHICH IS THE ONE MOMENT NOTHING CAN BE TYPED.

      Drawn here rather than inside the conversation, because it covers the
      conversation: the composer under it is closed for the whole of it
      (`busy` is still true, and the field is handed `disabled` as well, since
      a disabled field and a disabled button are two different promises to a
      keyboard), and the lines said after the move are held until it clears.
    */}
    {interlude && (
      <SceneInterlude sceneId={scene.id} text={interlude.text} onDone={interlude.done} />
    )}
    <div className="scene-open flex flex-col gap-4">
      {/*
        The card and the objectives stay, collapsible and never gone. A `details`
        rather than a state flag, because the browser gives the disclosure a
        keyboard and a screen reader for free.
      */}
      <details open>
        {/*
          THE SUMMARY STICKS AND THE PROSE DOES NOT, BECAUSE ONE OF THEM IS
          NEEDED AT THE MOMENT OF TYPING AND THE OTHER IS READ ONCE.

          Measured at 360x640, which is the width this app is measured at: the
          card open is 300 to 400 pixels, the log is capped at 46vh and the
          composer with its four buttons is another 200, so the column is half
          again as tall as the screen and the card is off the top of it for the
          whole conversation. With a keyboard up it is off the top twice over.
          That is not a cosmetic loss: the values on the card are exactly what a
          beat asks for, so a learner asked what time suits them was being asked
          about a time they could no longer see.

          Sticking the whole disclosure is the obvious fix and is worse, since a
          40vh block pinned over a 46vh log leaves the conversation reading
          underneath it. What has to stay is the facts, and they are one line.
          They are also drawn twice, here and under the prop line that asks for
          them, and that is the right kind of twice: the pairing in the body says
          which value answers which line, and this says the value is still true
          while you type. A reminder is not a second answer to a question.
        */}
        <summary
          className="scene-sticky z-10 cursor-pointer rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}
        >
          Your card and what to get done
          <span style={{ color: "var(--ink-3)" }}> · {scene.place}</span>
          {dealt.length > 0 && (
            <span className="font-normal" style={{ color: "var(--ink-2)" }}>
              {" · "}{dealt.join(" · ")}
            </span>
          )}
        </summary>
        <Card className="mt-2 flex flex-col gap-2">
          <p className="text-sm">{opened?.card.you}</p>
          <ul className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {(opened?.card.props ?? []).map((prop) => (
              <li key={prop.slot}>
                {prop.card}
                {/*
                  What you were dealt, in English, because the card's own line
                  points at it: "read it off the word below" with nothing below
                  it is a card nobody can answer. Saying it in Estonian is the
                  exercise, so the word itself is not here.
                */}
                {prop.given.length > 0 && (
                  <span className="block font-medium" style={{ color: "var(--ink)" }}>
                    {prop.given.join(" · ")}
                  </span>
                )}
                {/* The word came back because it was missing last time. Said, so the card reads as remembering rather than repeating. */}
                {prop.returned && (
                  <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                    You reached for this one in a conversation recently and did not have it.
                  </span>
                )}
              </li>
            ))}
          </ul>
          {opened?.persona && (
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>{opened.persona}</p>
          )}
          {/*
            WHAT TO GET DONE, AND WHICH OF IT IS IN PLAY.

            The ticks were here from the start and said only what was behind
            you. What a learner mid-conversation asks first is where they are
            in it, and the answer was on the screen all along in `beatId`: the
            beat the other side is waiting on. So the objective in play is
            named, in words as well as in weight, and the count says how many
            are behind you.

            A count of things done is not a meter (§7). There is no bar, no
            timer and nothing draining: it is the same ticks added up, which
            is the reading the debrief is allowed to give and the one somebody
            glancing at a list wants without counting it themselves.
          */}
          <div className="mt-1 flex flex-col gap-1">
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>
              What to get done · {metCount} of {objectives.length} done
            </p>
            <ul className="flex flex-col gap-1">
              {objectives.map((beat) => {
                const met = done.includes(beat.id);
                const now = !met && beat.id === beatId;
                return (
                  <li key={beat.id} className="flex items-start gap-2 text-sm">
                    {/*
                      An icon and a word beside the hue, because mint means
                      recalled and nothing in this app may be carried by colour
                      alone. The marker holds its own column and the goal wraps
                      beside it: a `flex-wrap` on the row lets a long objective
                      push its own bullet onto a line of its own, which reads as
                      a list that has come apart.
                    */}
                    <span aria-hidden className="shrink-0" style={{ color: met ? "var(--mint-ink)" : now ? "var(--accent-deep)" : "var(--ink-3)" }}>
                      {met ? "✓" : now ? "→" : "·"}
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                      <span style={{ color: met || now ? "var(--ink)" : "var(--ink-3)" }} className={now ? "font-medium" : undefined}>
                        {beat.goal}
                      </span>
                      {now && <Chip tone="accent">Now</Chip>}
                      <span className="sr-only">{met ? "done" : now ? "this is the one they are waiting on" : "not yet"}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      </details>

      {opened && (!opened.composed || note) && (
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          {note
            ?? "No model today: the lines are the course's own and the ones written for this scene, and a turn nothing was written for is described instead."}
        </p>
      )}

      {/*
        A log region that announces each new turn once and does not re-announce
        the ones above it, which is the lesson the exam clock taught: a live
        region that updates constantly reads a number a second at somebody.
      */}
      <div
        className="flex flex-col gap-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="The conversation"
      >
        {turns.map((turn, index) => (
          turn.who === "you" ? (
            /*
              ARRIVING FROM THE SIDE IT CAME FROM.

              A list that grows with no movement at all reads as a page that
              reloaded rather than as a conversation. The learner's own turn
              comes in from the right, because that is the side of the screen
              it is on and the side the box that wrote it is under; the other
              side's lines come in from the left, one after another rather than
              together, so a reaction and the move after it arrive in the order
              they were said. Transform and opacity, and nothing at all for
              somebody who asked for less movement.
            */
            <div key={index} className="scene-say-you flex flex-col items-end">
              {/*
                What you typed, and a button to hear it said by a native
                voice, which the design (§11) promised and nothing drew: a
                learner who reads their own line back in a voice that is not
                theirs hears where the stress falls, which is the half of
                speaking a typed turn cannot rehearse. Never autoplayed, and
                the speaker is the app's own, so a turn of English is read
                with Estonian phonology and sounds exactly as wrong as it is.
              */}
              {/*
                The learner's own words in the accent's tint with the ink drawn
                to sit on it, which is the pairing `test-design.mjs` measures
                and the one the app already uses for "this is yours". The
                corner nearest the box it was typed in is squared off, so the
                two sides of the conversation are told apart by shape as well
                as by which edge they sit against: a bubble is not a thing a
                colour may carry on its own either.
              */}
              <Card
                tone="accent"
                className="inline-block max-w-full rounded-br-[var(--r-sm)] px-4 py-3 md:px-5 md:py-3.5"
              >
                <p lang="et" className="flex items-center justify-end gap-2" style={{ color: "var(--accent-deep)" }}>
                  <span>{turn.text}</span>
                  <Speak
                    text={turn.text}
                    voice={voice}
                    size={14}
                    className="press inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-[var(--raised)]"
                  />
                </p>
              </Card>
              {/*
                Understood, and how the word is said. Under the learner's own
                words and in the quiet ink, because it is not a verdict: the
                conversation carried on, and this is the one thing worth
                knowing about the turn. The form is the dictionary's, off the
                server's marking, and a slip the dictionary cannot recast is
                still "understood", which is the half that matters.
              */}
              {turn.slips && turn.slips.length > 0 && (
                <p className="mt-1 pr-1 text-right text-xs" style={{ color: "var(--ink-3)" }}>
                  Understood.
                  {turn.slips.some((slip) => slip.form) && (
                    <>
                      {" "}Here it is{" "}
                      {turn.slips.filter((slip) => slip.form).map((slip, at, all) => (
                        <span key={slip.said}>
                          <span lang="et" className="font-medium" style={{ color: "var(--ink-2)" }}>{slip.form}</span>
                          {at < all.length - 1 && ", "}
                        </span>
                      ))}
                      .
                    </>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div key={index} className="flex flex-col items-start gap-2">
              {inOneBreath(turn.lines).map((line, at) => (
                spoken(line) ? (
                  /*
                    THE RUNG IS ON THE LINE, NOT ONLY IN THE SENTENCE UNDER IT.

                    ADR-025's claim is that every line says which rung answered,
                    and the words under the bubble are how a reader is told. A
                    suite reading the same fact had to walk the markup to pair a
                    line with its label, and `scripts/test-scene.mjs` did that by
                    counting hops: one up from the `p[lang=et]` and along to the
                    next paragraph. That was true until a line grew the
                    dictionary under it (`GlossedSentence`), which put two more
                    elements between the two, and from then on every label the
                    suite read came back empty. Both checks keyed on it stopped
                    running and waived themselves with a reason that was not the
                    reason: it said the bank held no line for this run, and the
                    bank had just supplied the second one.

                    So the rung is an attribute on the line's own wrapper, which
                    is a fact about the line rather than a shape in the markup,
                    and an invariant keeps it there.
                  */
                  <div
                    key={at}
                    data-rung={line.provenance}
                    className="scene-say max-w-full"
                    style={{ "--say-at": at } as CSSProperties}
                  >
                    <Card className="inline-block max-w-full rounded-bl-[var(--r-sm)] px-4 py-3 md:px-5 md:py-3.5">
                      {hidesWords(support) && spokenEstonian(line) && !shown.has(line.text) ? (
                        /*
                          Heard, not read. The speaker is the whole line, and
                          the way out is beside it rather than hidden: a
                          learner who cannot catch it has to be able to look,
                          or the mode is a wall rather than an exercise.
                        */
                        <p className="flex items-center gap-3">
                          <Speak
                            text={line.text}
                            voice={voice}
                            condition={conditionFor(opened?.plays ?? 0, index, hearing, true)}
                            rate={speed}
                            size={18}
                            autoplay={index === turns.length - 1 && at === turn.lines.length - 1}
                            className="press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[var(--raised)]"
                          />
                          <button
                            type="button"
                            onClick={() => reveal(line.text)}
                            className="tap-tint rounded-full px-3 py-1 text-sm"
                            style={{ color: "var(--ink-2)" }}
                          >
                            Show the words
                          </button>
                        </p>
                      ) : (
                        <>
                      {/*
                        Spoken in the persona's voice (§6), in the room this
                        scene is heard in, and the newest line plays itself
                        where the learner has autoplay on: a turn was just
                        pressed, so the gesture the browser wants has
                        happened. A second persona in a scene would be a
                        second voice, which is how an interruption reads as a
                        second person.

                        The room and the pace go separately, because
                        `playClip` takes the two apart: a condition with a
                        room in it goes through the mixer, which cannot hold a
                        pitch, so the persona's rate applies only where the
                        delivery is otherwise clean.
                      */}
                      {line.tokens ? (
                        /*
                          The line with the dictionary under it, which is the
                          same component a first meeting uses and at the same
                          standard. A learner who cannot read what was said to
                          them is stuck in the one place being stuck is not
                          the exercise.
                        */
                        <GlossedSentence
                          tokens={line.tokens}
                          sentence={line.text}
                          speak={{
                            voice,
                            condition: conditionFor(opened?.plays ?? 0, index, hearing, true),
                            rate: speed,
                            autoplay: index === turns.length - 1 && at === turn.lines.length - 1,
                          }}
                        />
                      ) : (
                      <p lang={spokenEstonian(line) ? "et" : "en"} className="flex items-center gap-2">
                        <span>{line.text}</span>
                        {spokenEstonian(line) && (
                          <Speak
                            text={line.text}
                            voice={voice}
                            condition={conditionFor(opened?.plays ?? 0, index, hearing, true)}
                            rate={speed}
                            size={14}
                            autoplay={index === turns.length - 1 && at === turn.lines.length - 1}
                            className="press inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-[var(--raised)]"
                          />
                        )}
                      </p>
                      )}
                        </>
                      )}
                    </Card>
                    {/*
                      Where the line came from, in words rather than a chip
                      shouting in capitals under every bubble (ADR-025), and
                      the report button beside it, because "this is not how
                      anybody says it" needs the line it is about.
                    */}
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: "var(--ink-3)" }}>
                      {/*
                        Every rung that wrote a piece of the bubble, in the
                        order it was said and each named once: two lines from
                        the course in one breath is one claim, not the same
                        sentence twice.
                      */}
                      <span>{[...new Set(line.rungs ?? [line.provenance])].map((rung) => PROVENANCE[rung]).join(" · ")}</span>
                      {reportable(line) && (
                        <SuggestFix
                          category="WRONG_CONTENT"
                          trigger={`Situations · ${scene.id} · ${line.text}`}
                          label="Report"
                        />
                      )}
                    </p>
                  </div>
                ) : line.provenance === "meanwhile" ? (
                  /*
                    TIME PASSING, DRAWN AS SOMETHING THAT HAPPENS.

                    A stage direction is set small and grey because it stands
                    in for a line and is worth less than one. This is the
                    opposite: it is the scene picking the learner up and
                    putting them somewhere else, and everything after it is
                    asked about the new place. It was a grey sentence between
                    two hairlines, and the learner it was drawn for reported
                    that nothing on the screen had told them the scene had
                    moved. They were reading the right pixels.

                    So it is the panel the app's own hint uses, in the accent's
                    softest tint with the ink drawn to sit on it, with the hour
                    beside it, and it arrives: the rules draw out from the
                    middle and the words settle onto the thread
                    (`app/globals.css`, `.scene-break`). Under
                    `prefers-reduced-motion` it is still a panel and still says
                    what happened, which is the whole of the information.
                  */
                  <p key={at} className="my-3 flex w-full items-center gap-3">
                    <span
                      aria-hidden
                      className="scene-break-rule h-px flex-1 origin-right"
                      style={{ background: "var(--rule)" }}
                    />
                    <span
                      className="scene-break inline-flex items-center gap-2 rounded-full px-4 py-2 text-center text-sm"
                      style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                    >
                      <Clock size={16} aria-hidden className="shrink-0" />
                      {line.text}
                    </span>
                    <span
                      aria-hidden
                      className="scene-break-rule h-px flex-1 origin-left"
                      style={{ background: "var(--rule)" }}
                    />
                  </p>
                ) : line.provenance === "coach" ? (
                  /*
                    THE APP, OUT OF CHARACTER, AND DRAWN SO NOBODY MISTAKES IT
                    FOR THE OTHER PERSON. A panel in the accent's softest tint
                    with the ink drawn to sit on it, which is the pairing
                    `test-design.mjs` measures: a hint set as grey italics
                    beside a grey italic stage direction is a hint nobody sees
                    at the moment they most need one.
                  */
                  <p
                    key={at}
                    className="rounded-2xl px-4 py-3 text-sm"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                  >
                    {/*
                      One word in the eyebrow, because `label-xs` uppercases:
                      the whole label set in capitals is a shouted sentence
                      over a panel that exists to be reassuring. The sentence
                      itself is read to a screen reader instead, where the
                      panel's colour and position say nothing.
                    */}
                    <span className="label-xs block" style={{ color: "var(--accent-deep)" }}>
                      Hint
                      <span className="sr-only"> ({PROVENANCE.coach})</span>
                    </span>
                    {line.text}
                  </p>
                ) : (
                  /*
                    A stage direction: what they did, in English, because no
                    Estonian line could be built for it or because this
                    persona translates for somebody who wrote English. Not a
                    bubble, because nobody said it, and not offered to the
                    report queue, because a reader who reported it would be
                    reporting our own sentence.
                  */
                  <p key={at} className="text-sm italic" style={{ color: "var(--ink-3)" }}>
                    {line.text}
                    <span className="sr-only"> ({PROVENANCE.unspoken})</span>
                  </p>
                )
              ))}
            </div>
          )
        ))}
        {/*
          THEY ARE ANSWERING, WHICH IS THE ONE THING THE LOG NEVER SAID.

          A turn goes to the server to be marked and the reply can be a
          model's, so the wait is a second or two on a good day and longer on
          a bad one, and the screen showed nothing at all in it: the learner's
          own bubble appeared and then the page sat still, which reads as a
          turn that did not register and is answered by pressing again. Anu
          has had the dots since she was written, so this is her drawing
          rather than a second one.

          Only while the floor is theirs: `busy` is also true while the help
          button fetches a word and while the run is being finished, and in
          both of those the last thing in the log is already something they
          said. The opening line has nothing before it, which is exactly when
          the dots are worth most.
        */}
        {busy && turns[turns.length - 1]?.who !== "them" && (
          <div className="scene-say flex flex-col items-start">
            {/* The same bubble the lines arrive in, so the wait reads as them
                about to speak rather than as a panel appearing. */}
            <Card className="inline-block rounded-bl-[var(--r-sm)] px-4 py-3 md:px-5 md:py-3.5">
              <Dots label="They are answering" />
            </Card>
          </div>
        )}
      </div>

      {/*
        THE ASK AND THE BOX ARE ONE OBJECT.

        What to say next was a `text-sm` paragraph between the transcript and
        the field, in the quiet ink, and it was reported as hidden and hard to
        see: the single most important sentence on the screen was set smaller
        than the conversation above it and separated from the box it is an
        instruction for. Two lines of prose floating between two blocks read as
        furniture wherever they are put, so it is not a matter of finding a
        better gap. The instruction belongs *inside* the thing it instructs.

        So the ask, the word the help button lent, the box and the send button
        are one tinted panel: accent, because the accent is "this is yours" and
        the primary action (§1), and it is the one place on this screen the
        learner is being asked for something. The field keeps its own white
        ground, so the box still reads as a box.
      */}
      <div ref={ask} className="dock-clear">
        {/*
          The one thing on this screen the learner is being asked for, and it
          is lifted off the page rather than merely tinted: the room around it
          is a soft light and a tint alone stopped reading as a panel on it.
          The shadow is the app's own, so this is the same object the rest of
          the app raises rather than a second idea of what raised means.
        */}
        <Card
          tone="accent"
          className="flex flex-col gap-3"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <div aria-live="polite">
            {/*
              HOW FAR IN, WHERE THE LEARNER IS LOOKING.

              The checklist marks the beat in play and counts what is behind
              you, and it stands above the conversation, so once the page has
              come down to the box it is off the screen: the panel says what to
              say now and nothing about where that sits in the whole thing. The
              same count, in the same words, beside the eyebrow. It is the
              checklist's own figure rather than a second one, so the two cannot
              disagree, and it is a count of ticks rather than a meter (§7):
              nothing fills, nothing drains, and nothing is running.
            */}
            <p className="label-xs flex flex-wrap items-baseline justify-between gap-x-3" style={{ color: "var(--accent-deep)" }}>
              <span>Your turn</span>
              <span style={{ color: "var(--ink-3)" }}>{metCount} of {objectives.length} done</span>
            </p>
            {/*
              Bigger than the conversation rather than smaller, because it is
              read before every turn and the transcript is read once. Where the
              server has no goal for the beat, the panel still says what the
              box is for rather than standing empty.
            */}
            {goal && hidesGoal(support) && !goalShown ? (
              /*
                COLD: THEY HAVE SAID SOMETHING AND NOBODY HAS TOLD YOU WHAT TO
                SAY. Which is the position anybody is in at a counter, and the
                objective in English is the last thing between a scene and the
                real exchange. It is one press away and the press is never
                recorded, because a scene that punished looking would teach
                people to guess rather than to ask.

                Inside the panel rather than above it, which is the merge of two
                passes rather than a choice between them: the ask belongs in the
                box it instructs, and a button floating over the box is the
                furniture that argument was made against.

                Reset per beat, so the objective is hidden again on the next one
                rather than only on the first: `goal` is what changes when the
                conversation moves.
              */
              <button
                type="button"
                onClick={() => setGoalShown(true)}
                className="tap-tint mt-1 block rounded-full px-3 py-1 text-lg font-medium"
                style={{ color: "var(--ink-2)" }}
              >
                Show what you are trying to do
              </button>
            ) : (
              <p className="mt-1 text-lg font-medium leading-snug">{goal ?? "Answer them."}</p>
            )}
          </div>
          {lent && (
            <p className="text-sm" aria-live="polite">
              <span style={{ color: "var(--ink-2)" }}>The word you were reaching for: </span>
              <span lang="et" className="font-medium">{lent.lemma}</span>
              <span style={{ color: "var(--ink-2)" }}> · {lent.gloss}</span>
            </p>
          )}
          {error && <p className="text-sm" style={{ color: "var(--peach-ink)" }}>{error}</p>}

          {/*
            Closed while the room is moving, and closed by the field itself
            rather than only by the button beside it. A box that still takes
            letters under a cover nobody can see through is a learner typing an
            answer to a question that has not been asked yet, in a place they
            have not been told they are standing in.
          */}
          <EstonianInput
            value={draft}
            onChange={setDraft}
            onEnter={say}
            inputRef={box}
            disabled={moving}
            ariaLabel="What you say"
            placeholder={moving ? "One moment" : "Say it in Estonian"}
          />
          {/*
            Alone in its row, so the one action a learner takes every turn is the
            loud one and nothing sits between it and the box. The three quieter
            controls are a row of their own underneath, which also keeps Leave
            away from the button being pressed twenty times a conversation.
          */}
          <Button onClick={say} disabled={busy || moving || !draft.trim()} variant="primary" className="w-full sm:w-auto sm:self-start">
            <CornerDownLeft size={16} aria-hidden /> Say it
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={again} disabled={busy || moving || !heard}>
              <RotateCcw size={16} aria-hidden /> Say that again
            </Button>
            {/*
              Asking costs the turn its `helped` flag and nothing else: no
              objective is withheld and nothing is deducted, because somebody who
              asks for four words and finishes has learned more than somebody who
              gave up with none. The word is one of the beat's own, off the
              scene's closed list, which is why this is a server call rather than
              something the screen could work out: the client does not hold the
              lexicon and should not.
            */}
            <Button variant="ghost" onClick={help} disabled={busy || moving || helped}>
              <LifeBuoy size={16} aria-hidden /> I need a word
            </Button>
            <Button variant="ghost" onClick={() => hangUp(sent, true)} disabled={busy || moving}>
              <DoorOpen size={16} aria-hidden /> Leave
            </Button>
          </div>
        </Card>
      </div>
    </div>
    </SceneStage>
  );
}

/** Where a line came from, in words, because a color cannot carry this on its own. */
const PROVENANCE: Record<Provenance, string> = {
  attested: "From the course",
  /*
    Honest about both halves: a model wrote it, and every word was checked
    against the dictionary before it was kept. "Checked by a native speaker"
    is a different claim and the label does not make it until the bank's row
    says so (lib/scenes/scripted.ts).
  */
  scripted: "Written for this scene, checked word by word",
  composed: "Written for this turn",
  fallback: "They did not catch that",
  again: "Said again",
  /*
    Their word back at them because it needed nothing doing to it, which is
    not the same claim as "said again": that one means the line the learner
    was answering, once more. A learner who said the right word was reading
    "Said again" under their own word coming back.
  */
  echo: "Your word, said back",
  /*
    The learner's word, put right and said back, which is the one correction
    a conversation makes without stopping. The label says whose word it was
    and what happened to it; "said again" would claim they had said it.
  */
  recast: "Your word, the way they say it",
  /*
    Handed over because the learner said they were not following. The label
    says whose word it is and that it was given rather than asked for, since
    "from the course" would read as the other side making a move.
  */
  offered: "The word you were reaching for",
  english: "They said it in English",
  /*
    This one is not a line they said, it is what they did, and the label has
    to say so or the sentence reads as Estonian rendered in English. It was
    "the sixth" here for as long as there were six, which is a count of a
    list kept in a comment beside the list. It is
    read to a screen reader beside the stage direction and drawn to nobody:
    the italics are what a sighted reader gets. See `replyFor` in
    lib/scenes/reply.ts for why this exists at all: "They did not catch that"
    used to be printed over a turn that had been understood perfectly, which
    is the app blaming a learner for its own empty pool.
  */
  unspoken: "In English, because no Estonian line could be built for it",
  /*
    Time passing. Not a stage direction and not something anybody said: it is
    the scene moving the learner from one place to the next, which the screen
    used not to do at all, so a conversation that walked somebody to a shop
    left them answering from their own kitchen.
  */
  meanwhile: "What has happened since",
  /*
    The app, out of character. Everything else on this screen is one side of a
    conversation and a conversation cannot explain itself; this can, and the
    label says whose voice it is so nobody reads it as the other person
    breaking into English.
  */
  coach: "A hint, from the app rather than from them",
};

export { BUDGETS };
