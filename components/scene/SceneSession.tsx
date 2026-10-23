"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { BookOpen, Clock, CornerDownLeft, DoorOpen, Heart, Info, LifeBuoy, ListChecks, MessageCircle, Mic, Phone, RotateCcw, Shuffle } from "lucide-react";
import { RoundChip } from "@/components/round/RoundStart";
import { Button } from "@/components/Button";
import { ChoiceCard, ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { EstonianInput } from "@/components/EstonianInput";
import { Card, CardLink, toneInk } from "@/components/ui";
import { kindOf } from "@/lib/scenes/kinds";
import { Dots } from "@/components/Dots";
import { Speak } from "@/components/Speak";
import { isSaid, isSpokenEstonian, type Provenance as SceneProvenance } from "@/lib/scenes/line";
import { conditionFor, hidesGoal } from "@/lib/audio/conditions";
import { hidesLines, speaksAloud, type SceneVoice } from "@/lib/audio/sceneVoice";
import { GlossedSentence } from "@/components/GlossedSentence";
import type { GlossedToken } from "@/lib/dict/glossed";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { beginChat, beginScene, finishScene, sceneHelp, setSceneAnswer, setSceneVoice } from "@/app/actions";
import { leafNeeds, type SceneSpec } from "@/lib/scenes/types";
import type { Difficulty } from "@/lib/scenes/curveballs";
import { BUDGETS, defaultDifficultyFor } from "@/lib/scenes/curveballs";
import { LEVELS, type Level } from "@/lib/collections/syllabus/types";
import { SceneFace } from "./SceneFace";
import { SceneDebrief, type Debrief } from "./SceneDebrief";
import type { Errand } from "@/lib/collections/errands";
import { SceneStage } from "./SceneStage";
import { SceneInterlude, VEIL_OUT_MS } from "./SceneInterlude";
import { untilQuiet } from "@/lib/audio/clip";
import { AFTER_BREAK_MS, VOICE_CAP_MS, readingPause } from "@/lib/scenes/pacing";

/** A frame or two for a line's own speaker to mount and start asking for its clip. */
const MOUNT_MS = 250;
const sleep = (ms: number) => new Promise<void>((resume) => window.setTimeout(resume, ms));
import { SceneVignette } from "./SceneVignette";
import { SceneVoiceChoice } from "./SceneVoiceChoice";
import { cueFor, isCall, movesTo, sceneryFor, type Setting } from "@/lib/scenes/scenery";
import { practises } from "@/lib/scenes/practises";
import { NOT_REACHED } from "@/lib/copy/values";
import { useLocale, useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { onScreen, sceneTemplates } from "@/lib/scenes/onScreen";
import { around, aroundAll } from "./inPlace";
import { useModuleFocus } from "@/components/course/moduleFocus";
import { useSpeechConfig } from "@/components/speech/useSpeech";
import { CallScreen, HearFirst, SceneMic, SendRing, type MicState } from "./SceneSpeech";
import { matchPick } from "@/lib/speech/matchPick";
import { editCounts } from "@/lib/speech/edits";
import { core, type Hearing, type Repair } from "@/lib/speech/reconcile";
import { openingAnswer, type SceneAnswer } from "@/lib/ux/sceneAnswer";

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

/**
 * What the recognizer heard on a turn said aloud, kept on the screen and
 * nowhere else: the words as the machine heard them, and where the
 * dictionary read a non-word as a word it holds (`lib/speech/reconcile.ts`).
 * The recast under the bubble and the debrief's "What we heard" read it; the
 * server is told only which words were repaired, because that is the one
 * thing that changes a grade (D13).
 */
interface HeardNote {
  readonly heard: string;
  readonly repairs: readonly Repair[];
}

type Turn =
  | { readonly who: "you"; readonly text: string; readonly slips?: readonly SlipNote[]; readonly heard?: HeardNote }
  | { readonly who: "them"; readonly lines: readonly Line[] };

type Phase = "briefing" | "talking" | "debrief";

interface Opened {
  runId: string;
  /** Runs of this scene before this one, which opens the hearing pool. */
  plays: number;
  card: { you: string; props: { slot: string; card: string; given: readonly string[]; returned?: true; chosen?: true }[] };
  persona: string;
  composed: boolean;
}

interface Sent {
  beatId: string;
  said: string;
  helped: boolean;
  /** The Estonian line this turn answers, for the echo rule and for saying it again. */
  heard: string;
  /**
   * Which requirements a judge conceded on this turn, as the server said. Sent
   * back with every later turn so the server's replay reaches the same state,
   * since the server keeps nothing between turns.
   */
  conceded?: number[];
  /** Beats further along a judge said this same turn met, echoed like `conceded`. */
  alsoDone?: string[];
  /** Picked off the offered lines rather than typed, which grades nothing (`SentTurn.picked`). */
  picked?: boolean;
  /**
   * Said aloud: the dictionary's repairs of what was heard, so a repaired word
   * earns no grade (`SentTurn.spoken`, D13). What the recognizer heard is not
   * sent; only which words it could not take as said.
   */
  spoken?: { repairs: readonly Repair[]; wordsHeard?: number; wordsChanged?: number; unseen?: true };
}

/** A line the learner may pick instead of typing, as the server built it (`lib/scenes/picks.ts`). */
interface PickLine {
  id: string;
  et: string;
  en: string;
}

/**
 * How hard a day the person behind the desk is having.
 *
 * Written as what happens to *you* rather than as a setting. "Two or three,
 * and one of them is real" is a note to whoever wrote the curveball table;
 * "they will throw two or three things at you" is what somebody choosing
 * between four buttons wants to know.
 */
/**
 * The three things about a conversation a learner could not guess from the
 * briefing, one idea each. English, and nothing else: a scene's Estonian is
 * the dictionary's.
 */
const HOW_IT_GOES: { title: string; line: string; hue: "sky" | "cta" | "blush"; icon: ReactNode }[] = [
  {
    title: "They speak first",
    line: "Answer in Estonian, the way you would in real life.",
    hue: "sky",
    icon: <MessageCircle size={16} />,
  },
  {
    title: "Your card is a suggestion",
    line: "Say something else and they'll go with it.",
    hue: "cta",
    icon: <Shuffle size={16} />,
  },
  {
    title: "Mistakes still get through",
    line: "A wrong ending or a word in English is fine. You'll see how they'd say it at the end.",
    hue: "blush",
    icon: <Heart size={16} />,
  },
];

/*
  TODAY'S CHAT SAYS SOMETHING ELSE IN THE MIDDLE (VB-11). It deals no card,
  so "your card is a suggestion" would point at nothing; what a learner cannot
  guess about a chat is that it is about today's words.
*/
const HOW_A_CHAT_GOES: typeof HOW_IT_GOES = [
  HOW_IT_GOES[0]!,
  {
    title: "It's about today",
    line: "They ask about the things today's words are for. Use them in your answers.",
    hue: "cta",
    icon: <MessageCircle size={16} />,
  },
  HOW_IT_GOES[2]!,
];

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "textbook", label: "Easy", blurb: "Everything goes just like it did in the lesson." },
  { id: "good", label: "Fairly easy", blurb: "One thing will catch you out." },
  /* Written for any of the fifteen places rather than for a counter: the
     same two lines sat under a chat on the stairs and a call to a friend. */
  { id: "ordinary", label: "Normal", blurb: "Two or three things go wrong, the way they do in real life." },
  { id: "bad", label: "Hard", blurb: "Everything that can go wrong does, and they're in a hurry." },
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
    return spokenEstonian(line) ? line.text : "";
  }
  return null;
}

export function SceneSession({ scene, minutes, unit, learnerLevel, openAt, answeredLast, finishedOnce, opening, chat, rehearses = null }: {
  scene: SceneSpec;
  /**
   * The errand this scene rehearses, found on the server through
   * `errandForScene` (`lib/collections/errandScenes.ts`), which reads the
   * scene catalog: every scene the course has and every A1 lesson behind them,
   * which this screen would otherwise download to draw one card.
   */
  rehearses?: Errand | null;
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
  /**
   * The learner's own course level, for where the dial opens.
   *
   * Not the scene's own `level`: a beginner opening a B1 scene from the
   * "rest of the course" list should still meet it on `textbook`, since the
   * dial is about how hard a day the other side is having and not about
   * which scene this is. The learner can still move it before they start.
   */
  learnerLevel: Level;
  /**
   * The band the briefing opens at, which is `learnerLevel` leaned one band
   * for somebody whose recent answers are mostly wrong or nearly all right
   * (`lib/course/adapt.ts`). Required rather than defaulted, for the reason
   * `illSgShort` is required: a caller that has not thought about the lean
   * opens every conversation at the level and nothing says the lean was lost.
   * The learner moves it before they start like any default.
   */
  openAt: Level;
  /**
   * How this learner answered in their last conversation: picking a line,
   * saying it or typing it (`lib/ux/sceneAnswer.ts`), or null where they never
   * chose. The switch above the box remembers, because somebody who chose to
   * speak in one scene wants to speak in the next.
   */
  answeredLast: SceneAnswer | null;
  /**
   * Whether they have got through this scene once with every objective met,
   * which is what offers "Talk it through": the other side heard only, nothing
   * to read, and the answers said (VB-4).
   */
  finishedOnce: boolean;
  /**
   * The other side's opening lines from the scene bank, for "Hear them first"
   * on the briefing (`lib/scenes/rehearse.ts`). Shown and spoken, never marked.
   */
  opening: readonly string[];
  /**
   * TODAY'S CHAT (docs/41-fifth-batch.md, VB-11): the meanings of the words
   * it asks for, in English, for the briefing. Present only on `/course/chat`.
   * A chat opens through `beginChat`, which decides on the server which
   * evening it is about; it has no card, no curveballs and no lines to pick,
   * so the difficulty dial and "Pick a line" stand down.
   */
  chat?: { words: readonly string[] };
}) {
  /* From `lg` the card is open in the column beside the conversation; below it
     it stays the one pinned line it was. One element either way. */
  const wide = useSyncExternalStore(
    (notify) => { const q = window.matchMedia("(min-width: 1024px)"); q.addEventListener("change", notify); return () => q.removeEventListener("change", notify); },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
  /* Whether this conversation is a step of today's module, which decides
     whether the briefing carries a door out of it. See
     components/course/moduleFocus.ts. */
  const inModule = useModuleFocus() !== null;
  const t = useT();
  const locale = useLocale();
  const templates = useMemo(() => sceneTemplates(scene), [scene]);
  /** A line the server filled in English, in the learner's interface language. */
  const onStage = (text: string) => onScreen(locale, text, templates);
  const [phase, setPhase] = useState<Phase>("briefing");
  /*
    A LESSON'S OWN CONVERSATION IS NOT SET UP BY THE LEARNER. It is the end of
    an A1 part, played by somebody eight lessons in, so it opens at the plainest
    sentences on the easiest day and draws none of the dials below: three
    choices about how the other side will behave are a decision a beginner has
    no basis to make, and each is a way of making the finale harder than the
    lessons that led up to it.
  */
  const lessonScene = Boolean(scene.lesson);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => (lessonScene ? "textbook" : defaultDifficultyFor(openAt)));
  /*
    HOW THE OTHER SIDE TALKS, WHICH IS THE LEARNER'S OWN LEVEL UNLESS THEY
    SAY OTHERWISE. A scene carries no band of its own: the person behind the
    counter speaks at whatever band this run is opened at (`lib/scenes/pitch.ts`),
    and that defaults to the level the app already holds for this learner.
    Lower is plainer sentences and one question at a time; higher is being
    spoken to like anybody else. A decision about this conversation, so it
    sits beside the difficulty dial rather than in Settings, and for the same
    reason.
  */
  const [level, setLevel] = useState<Level>(lessonScene ? "A1" : openAt);
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
  /* The draft as of the last render, for a callback that must not be rebuilt on every keystroke. */
  const draftRef = useRef(draft);
  draftRef.current = draft;
  /*
    PICKING OR TYPING. The lines to pick are two or three right answers to the
    beat in front, built off this run's card (`lib/scenes/picks.ts`), so a
    beginner can hold the whole conversation by recognizing the right thing to
    say before they can produce it. Picking is the default at A1 and typing
    everywhere else, and either is one press away for the whole run: a learner
    who knows the answer types it, and one who is stuck picks it.
  */
  const [picks, setPicks] = useState<PickLine[]>([]);
  /*
    PICKING, SAYING OR TYPING (VB-4). Saying it is the third choice on batch
    4's switch, offered wherever this deployment can hear on this device, and
    the switch remembers which was used last (`lib/ux/sceneAnswer.ts`). A
    choice remembered on another device that cannot be honored here falls
    back to the band's default rather than to a microphone that cannot open.
  */
  const speechConfig = useSpeechConfig();
  const speechHere = speechConfig.modelBase !== null && speechConfig.unavailable === null;
  const remembered = useRef<SceneAnswer | null>(answeredLast);
  /* A chat has no lines to pick, so where picking would open it, typing does. */
  const opensWith = useCallback((stored: SceneAnswer | null, at: Level): SceneAnswer => {
    const one = openingAnswer(stored, at, speechHere);
    return chat && one === "pick" ? "type" : one;
  }, [chat, speechHere]);
  const [answerBy, setAnswerBy] = useState<SceneAnswer>(() => opensWith(answeredLast, openAt));
  /*
    TALK IT THROUGH: cold plus speaking, which is the closest the app comes to
    the real thing (SP-3). The other side is heard and not shown, what to do is
    behind a press, and the answers are said. Offered on the briefing once the
    learner has finished the scene, and held for this run only: it changes
    nothing remembered.
  */
  const [talk, setTalk] = useState(false);
  /*
    WHAT WAS LAST HEARD, UNTIL IT IS SENT. The box holds its reading, or a pick
    it matched is lit, and either way the turn that goes is said aloud and
    carries its repairs (D13). Cleared when the box is emptied, because a turn
    typed into an empty box was typed.
  */
  const [pending, setPending] = useState<Hearing | null>(null);
  /** The pick what was heard matched, lit before it is sent (D8). */
  const [lit, setLit] = useState<string | null>(null);
  /** Heard, matched no pick, and gone to the box to change and send. */
  const [unmatched, setUnmatched] = useState(false);
  /** The countdown ring, on the lit pick or on the box's button, where one is running (D20). */
  const [ring, setRing] = useState<"pick" | "box" | null>(null);
  /*
    Switching how to answer drops what the last way left behind: a lit line
    and its ring belong to the lines, and a hearing that never reached the box
    belongs to nothing once they are gone. Without this, a line lit by speech,
    then "Type it" and a sentence typed from scratch, went to the server as a
    spoken turn carrying the hearing's repairs and edit counts. A hearing that
    is in the box stays with it, since the box is still holding it.
  */
  const chooseAnswer = useCallback((next: SceneAnswer) => {
    setAnswerBy(next);
    remembered.current = next;
    setLit(null);
    setRing(null);
    setUnmatched(false);
    if (!draftRef.current.trim()) setPending(null);
    void setSceneAnswer(next).catch(() => null);
  }, []);
  /** Whether the microphone is listening or reading, told at turn boundaries only. */
  const [mic, setMic] = useState<MicState>({ listening: false, thinking: false, offered: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  /*
    What the ledger said, on the turn it said it. A run no longer books at the
    door, so "your allowance is spent" is news that arrives mid-conversation
    rather than a fact known at the briefing, and it belongs where it is true.
  */
  const [note, setNote] = useState<string | null>(null);
  /*
    WHO IS WRITING THE OTHER SIDE, SAID ONCE AT THE TOP OF THE CONVERSATION.
    Anu's panel says which model answered and this did not, so the day the
    Gemini balance ran out and a backup wrote every line, nothing on the screen
    said the person across the table had changed. The latest model to answer,
    and whether no model is answering at all, which is news a learner is owed
    before they conclude the conversation cannot understand them.
  */
  const [writer, setWriter] = useState<{ label: string; model: string; primary: boolean } | null>(null);
  const [modelDown, setModelDown] = useState(false);
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
  const [interlude, setInterlude] = useState<{
    text: string; from: Setting; to: Setting | null; done: () => void;
  } | null>(null);
  /*
    WHICH ROOM THE CONVERSATION IS IN, WHICH IS NOT ALWAYS THE ONE IT OPENED
    IN.

    `poodi-piima` starts in your own kitchen with a friend ringing and walks you
    to the corner shop. The scene has one setting, so the briefing drew the shop
    for the whole of it, including the two beats before anybody had left the
    house, and the cover between them had nothing to move from. This is where
    the conversation is standing now: the scene's own room to begin with, and
    whatever the beat moved into afterwards (`movesTo`).
  */
  const [room, setRoom] = useState<Setting>(() => sceneryFor(scene.id).setting);
  /*
    WHAT HAS COME UP, WHICH IS TWO FACTS RATHER THAN ONE.

    A curveball standing in the way is the one the room draws now, and it
    clears when the learner deals with it. It is sent rather than read off the
    beat, because the beat on the wire is the *scene's* own, the one waiting
    behind the curveball: only the objective comes off the one in front of it,
    which is why the first version of this drew no cue at all, ever.

    The queue is the other fact and it does not clear. It is the one curveball
    of the fourteen that is `silent`: it never becomes a beat, it asks for
    nothing, and its whole effect is one number of patience. Its own entry
    calls that "pressure that is felt rather than announced", and for its whole
    life nothing on the screen let anybody feel it. It is also the one that is
    entirely a picture, which is what makes a drawing the right place to say it.
  */
  const [hurdle, setHurdle] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  /*
    HOW THE OTHER SIDE SOUNDS, WHICH IS THE ROOM THIS FEATURE WAS WRITTEN FOR.

    `lib/audio/conditions.ts` opens with a counter, a clinic ringing back on a
    bad line and a sentence caught from the middle of a conversation, and for
    its whole life it reached two flashcard rounds and never a conversation:
    the receptionist was the one voice in the app that always spoke from a
    studio. The pool opens on how many times this learner has had *this*
    conversation, which is the same claim the word pool makes one level down,
    so a first visit to a health center is a quiet room and the harder
    deliveries arrive once the encounter itself has stopped being the hard
    part. Skippable, because nothing marks the words of a line the other side
    says: the learner answers the beat, and catching a sentence from halfway
    is the thing the table exists to rehearse rather than a way to be marked
    down.
  */
  const { hearing, support, sceneVoice } = useAudioPrefs();
  /*
    HOW THE OTHER SIDE REACHES THE LEARNER: read, heard and read, or heard
    alone (lib/audio/sceneVoice.ts). Chosen on the briefing and changeable from
    the panel the learner types into, so somebody who opened a scene with the
    voice on and then got on a bus does not have to leave the conversation to
    turn it off. Remembered for the next scene, optimistically: the choice on
    the screen is the one that holds for this run whether or not the write
    lands, since a setting that failed to save is not a reason to change how a
    conversation already under way sounds.
  */
  const [voiceMode, setVoiceMode] = useState<SceneVoice>(sceneVoice);
  const chooseVoice = useCallback((next: SceneVoice) => {
    setVoiceMode(next);
    void setSceneVoice(next).catch(() => null);
  }, []);
  /* Talking it through hears the other side and shows nothing, whatever the mode on the briefing. */
  const heardMode: SceneVoice = talk ? "listen" : voiceMode;
  const aloud = speaksAloud(heardMode);
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
  /* What to do is behind a press on the cold level, and always when talking it through. */
  const goalHidden = hidesGoal(support) || talk;
  /* A scene that opens on the telephone is a call, and can be had hands-free (`isCall`). */
  const call = isCall(scene.id);
  /*
    THE SPELLINGS THIS MOMENT COULD HOLD, for the dictionary's repairs of what
    was heard (`lib/speech/reconcile.ts`): the words the other side has said,
    the lines on offer, and a word the help button lent. A repair may land only
    on one of these, which keeps it to words already on the screen; the client
    holds no lexicon and should not. Rebuilt when the conversation moves, never
    on a keystroke.
  */
  const expect = useMemo(() => {
    const out = new Set<string>();
    const add = (text: string) => { for (const word of text.split(/\s+/)) { const c = core(word); if (c) out.add(c); } };
    for (const turn of turns) if (turn.who === "them") for (const line of turn.lines) if (spokenEstonian(line)) add(line.text);
    for (const pick of picks) add(pick.et);
    if (lent) add(lent.lemma);
    return out;
  }, [turns, picks, lent]);

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
  /* Whether the turn is being said rather than typed, as of the last render, for the effect below. */
  const speakingRef = useRef(false);
  useEffect(() => {
    /*
      A debrief is read from its own first line. The page is left wherever the
      last turn put it, which with the transcript in the page rather than in a
      box of its own is most of a screen down: measured at 827px, with the
      debrief's own heading 779px above the top of the window, so a scene ended
      on a page that opened halfway through what it had to say.
    */
    /*
      Instantly, and again once the debrief has painted. The page scrolls
      smoothly by default, so a plain `scrollTo` here was an animation, and the
      debrief mounting under it changes the height it is animating over: it
      came to rest 23 to 48 pixels short of the top, with the room band's fade
      laid over the strip and the first line of the result card.
    */
    if (phase === "debrief") {
      const top = () => window.scrollTo({ top: 0, behavior: "instant" });
      top();
      const frame = requestAnimationFrame(top);
      return () => cancelAnimationFrame(frame);
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
    if (phase === "talking" && turns.length === 0) window.scrollTo({ top: 0, behavior: "instant" });
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
    /*
      Saying it, the caret goes to the microphone instead. A phone does not
      focus a button it was tapped on, so after every spoken turn
      `activeElement` was the body and the box took focus, which opened the
      keyboard over the conversation of somebody who had chosen to talk. A
      keyboard user is handed the control they were using, which Space and
      Enter press again.
    */
    if (document.activeElement === document.body) {
      if (speakingRef.current) panel.querySelector<HTMLButtonElement>("[data-scene-mic] button")?.focus({ preventScroll: true });
      else box.current?.focus({ preventScroll: true });
    }
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
            ? "That was a lot of turns in a row. Give it a moment."
            : "Something went wrong on our side. Your turn is still here.",
        );
        return;
      }
      const data = await response.json() as {
        lines?: Line[]; voice?: string; speed?: number;
        beatId?: string | null; goal?: string | null; done?: string[];
        over?: boolean; error?: string;
        composed?: boolean; note?: string | null;
        composedBy?: { label: string; model: string; primary: boolean } | null;
        composer?: { label: string; model: string; primary: boolean } | null;
        modelDown?: boolean;
        slips?: SlipNote[]; hurdle?: string | null; queued?: boolean;
        conceded?: number[] | null;
        alsoDone?: string[] | null;
        chosen?: { slot: string; given: string[] }[];
        picks?: PickLine[];
      };
      if (data.error) { setError(t(data.error)); return; }
      /*
        A beat the judge conceded on this turn is written onto the turn, so the
        next request carries it and the server's replay ends the beat again.
      */
      if (data.conceded && data.conceded.length > 0) {
        const conceded = data.conceded;
        setSent((was) => {
          const at = was.length - 1;
          const last = was[at];
          if (!last) return was;
          return [...was.slice(0, at), { ...last, conceded }];
        });
      }
      if (data.alsoDone && data.alsoDone.length > 0) {
        const alsoDone = data.alsoDone;
        setSent((was) => {
          const at = was.length - 1;
          const last = was[at];
          if (!last) return was;
          return [...was.slice(0, at), { ...last, alsoDone }];
        });
      }
      if (data.composed === false && data.note) setNote(data.note);
      if (data.composedBy) { setWriter(data.composedBy); setModelDown(false); }
      else if (data.composer) setWriter((was) => was ?? data.composer ?? null);
      if (data.modelDown) setModelDown(true);
      /*
        A fact the learner changed on their own card is the fact now, beside
        the objective and on the card alike (ADR-025 amendment 3): somebody who
        said Tartu is going to Tartu, and a card still saying the station would
        be the app arguing with them.
      */
      if (data.chosen && data.chosen.length > 0) {
        const chosen = data.chosen;
        setOpened((was) => was && ({
          ...was,
          card: {
            ...was.card,
            props: was.card.props.map((prop) => {
              const pick = chosen.find((one) => one.slot === prop.slot);
              return pick ? { ...prop, given: pick.given, chosen: true as const } : prop;
            }),
          },
        }));
      }

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
        if (before.length > 0) {
          setTurns((was) => [...was, { who: "them", lines: before }]);
          /*
            AND IT IS LEFT IN THE AIR BEFORE THE ROOM MOVES (lib/scenes/pacing.ts).
            A frame for the line's own speaker to mount and start, then its voice
            to the end, then long enough to read. The cover used to come up in
            the same frame and cut the line off mid-word.
          */
          await sleep(MOUNT_MS);
          await untilQuiet(VOICE_CAP_MS);
          await sleep(readingPause(before.map((line) => line.text)));
        }
        /*
          The room this beat moves into, if it moves anybody at all. Read here
          rather than after the cover clears, because the cover is what draws
          the move: it needs the room being left and the room being arrived in
          at the same moment.
        */
        const into = movesTo(scene.id, data.beatId ?? null);
        await new Promise<void>((resume) => {
          setInterlude({ text: lines[moves]!.text, from: room, to: into, done: resume });
        });
        if (into) setRoom(into);
      }
      /*
        The move itself stays in the transcript, so the record of the
        conversation still says where it happened, and it is the only thing
        the fading cover reveals. What is said in the new place waits a beat
        after the fade (`AFTER_BREAK_MS`), so the next line arrives and speaks
        once the learner is back in the room rather than in the frame the
        cover left.
      */
      if (moves >= 0) {
        setTurns((was) => [...was, { who: "them", lines: [lines[moves]!] }]);
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
            had to be started with the mouse.

            On the next frame, because React removes the button in this commit
            and focusing before that lands on an element about to go.
          */
          requestAnimationFrame(() => box.current?.focus({ preventScroll: true }));
        }, VEIL_OUT_MS);
        await sleep(VEIL_OUT_MS + AFTER_BREAK_MS);
      }
      const said = moves >= 0 ? lines.slice(moves + 1) : lines;

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
      setHurdle(data.hurdle ?? null);
      if (data.queued) setQueued(true);
      setDone(data.done ?? []);
      setPicks(data.picks ?? []);
      if (said.length > 0) setTurns((was) => [...was, { who: "them", lines: said }]);
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
      setError(t("That didn't reach us. Try again."));
    } finally {
      setBusy(false);
    }
  /*
    `room` is in here because the cover draws the move out of it: memoised
    without it, a second break in one conversation would hand the cover the room
    the scene opened in rather than the one it is standing in, so a learner
    walking home from the shop would watch their kitchen leave twice.
  */
  }, [opened, used, setTurns, scene.id, room, t]);

  async function start(talkThrough = false) {
    setBusy(true);
    setError(null);
    const result = chat
      ? await beginChat(level).catch(() => null)
      : await beginScene(scene.id, difficulty, level).catch(() => null);
    setBusy(false);
    setTalk(talkThrough);
    setAnswerBy(talkThrough ? "say" : opensWith(remembered.current, level));
    if (!result || !result.ok) { setError(t(result ? result.error : NOT_REACHED)); return; }

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
    const result = await sceneHelp(opened?.runId, sent).catch(() => null);
    setBusy(false);
    if (!result || !result.ok) { setError(t(result ? result.error : NOT_REACHED)); return; }
    setHelped(true);
    setLent({ lemma: result.lemma, gloss: result.gloss });
    setAsked((was) => [...was, { lemma: result.lemma, lexemeId: result.lexemeId }]);
  }

  async function say() {
    await answer(draft.trim(), false, pending);
  }

  /*
    A TURN, TYPED, PICKED OR SAID. Said aloud, it carries the dictionary's
    repairs (D13) and keeps what the machine heard on the screen for the recast
    under the bubble and the debrief; it is read on the server exactly as a
    typed turn, because what is sent is what the learner saw in the box.
  */
  /*
    WHETHER THE LINE BEING ANSWERED WAS ONLY HEARD (VB-14). The other side's
    newest Estonian, its words behind a press that was never pressed. A spoken
    answer to it is the one evidence a conversation gives that somebody can
    follow speech, and the readiness rungs count it (`SpokenTurn.unseen`).
    Looking stays free: a turn after a look is an ordinary turn, it simply is
    not this evidence.
  */
  function answeredUnseen(): boolean {
    if (!hidesLines(heardMode)) return false;
    const last = [...turns].reverse().find((turn) => turn.who === "them");
    if (!last || last.who !== "them") return false;
    const estonian = last.lines.filter(spokenEstonian);
    return estonian.length > 0 && estonian.every((line) => !shown.has(line.text));
  }

  async function answer(said: string, picked: boolean, spokenAs: Hearing | null = null) {
    if (!said || !beatId || busy) return;
    /*
      Only the repairs whose word is still in what goes, which is the server's
      own rule (`spokenOf`): a word the learner changed in the box they wrote
      themselves, and a line picked by saying it holds the pick's words rather
      than the hearing's, so a recast under it about a word it does not say
      would be about nothing on the screen.
    */
    const sentWords = new Set(said.split(/\s+/).map(core).filter(Boolean));
    const repairs = spokenAs
      ? spokenAs.repairs.filter((repair) => repair.rule !== "hesitation" && repair.to.split(/\s+/).some((w) => sentWords.has(core(w))))
      : [];
    const next: Sent[] = [...sent, {
      beatId, said, helped, heard,
      ...(picked ? { picked: true } : {}),
      /*
        The edit counts only where the learner had the words in the box to
        change. A line lit by what was heard and sent as a pick replaced the
        hearing with the pick's own words, and counting that as words the
        learner changed would read the app's match as the recognizer's misses
        in the edit rate `report:speech` watches (D3).
      */
      ...(spokenAs ? { spoken: picked ? { repairs } : { repairs, ...editCounts(spokenAs.understood, said), ...(answeredUnseen() ? { unseen: true } : {}) } } : {}),
    }];
    setSent(next);
    setTurns((was) => [...was, {
      who: "you",
      text: said,
      ...(spokenAs ? { heard: { heard: spokenAs.heard, repairs } } : {}),
    }]);
    setPicks([]);
    if (!picked) setDraft("");
    setPending(null);
    setLit(null);
    setRing(null);
    setUnmatched(false);
    setHelped(false);
    setLent(null);
    await speak(next);
  }

  /*
    WHAT WAS HEARD GOES WHERE THE SCREEN IS ANSWERED. With lines on offer, it
    is matched to them after decoding (D8, D20's numbers in
    `lib/speech/matchPick.ts`): a clear match lights that line and the ring
    sends it as the pick it is, which grades nothing exactly as a tap. Anything
    that matches no line goes into the box to change and send, and is never
    sent as a pick. Saying it, it goes into the box and the ring sends it
    unless the learner touches the screen. "Send what I say straight away"
    skips the ring.
  */
  function onHeard(hearing: Hearing) {
    if (!hearing.understood.trim() || busy || interlude !== null) return;
    setPending(hearing);
    if (answerBy === "pick" && picks.length > 0) {
      const { index } = matchPick(picks.map((pick) => pick.et), hearing.understood);
      const pick = index === null ? undefined : picks[index];
      if (pick) {
        setUnmatched(false);
        setLit(pick.id);
        if (speechConfig.sendAtOnce) void answer(pick.et, true, hearing);
        else setRing("pick");
        return;
      }
      setLit(null);
      setUnmatched(true);
      setDraft(hearing.understood);
      return;
    }
    setDraft(hearing.understood);
    if (speechConfig.sendAtOnce) void answer(hearing.understood.trim(), false, hearing);
    else setRing("box");
  }

  /** The ring ran out: send what it was on. */
  function ringDone() {
    if (ring === "pick") {
      const pick = picks.find((one) => one.id === lit);
      setRing(null);
      if (pick) void answer(pick.et, true, pending);
      return;
    }
    setRing(null);
    void answer(draft.trim(), false, pending);
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
    }).catch(() => null);
    setBusy(false);
    if (!result || !result.ok) { setError(t(result ? result.error : NOT_REACHED)); return; }
    setDebrief({
      scene,
      rehearses,
      runId: opened?.runId,
      objectives: result.objectives,
      hurdles: result.hurdles,
      outcome: result.outcome,
      gaps: result.gaps,
      graded: result.graded,
      review: result.review,
      recap: result.recap,
      /*
        WHAT WE HEARD (SP-3): the turns said aloud where what the machine heard
        is not what was sent, because the dictionary read a word differently or
        the learner changed it in the box. Off this screen's own record, since
        what was heard is never sent to the server.
      */
      heard: turnsRef.current.flatMap((turn) => {
        if (turn.who !== "you" || !turn.heard) return [];
        const same = (a: string) => a.split(/\s+/).map(core).filter(Boolean).join(" ");
        return same(turn.heard.heard) === same(turn.text) ? [] : [{ heard: turn.heard.heard, said: turn.text }];
      }),
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
  /*
    WHAT THE CARD DEALT FOR THIS OBJECTIVE, BESIDE THE OBJECTIVE.

    The goal used to end "It is on your card", and the card was a disclosure
    above with three lines of prose in it. A learner sent a screenshot and said
    the information was hard to find and that the instruction should carry it,
    and they are right: "say which floor you live on" and the floor are one
    fact, and a sentence pointing somewhere else is the app asking somebody
    mid-conversation to go and look something up.

    Read off the beat's own `datum` requirements through `leafNeeds`, so a
    beat that names two slots shows both and a beat that names none shows
    nothing, and off the same `given` the card prints, so the two cannot
    disagree about what was dealt.
  */
  const dealtFor = (beat: SceneSpec["beats"][number]): string[] => {
    const slots = leafNeeds(beat.needs)
      .flatMap(({ need }) => (need.kind === "datum" ? [need.slot] : []));
    return slots.flatMap((slot) => opened?.card.props.find((prop) => prop.slot === slot)?.given ?? []).map((value) => t(value));
  };
  const progress = objectives.map((beat) => ({
    met: done.includes(beat.id),
    now: !done.includes(beat.id) && beat.id === beatId,
    goal: onStage(beat.goal),
  }));

  /*
    What the card dealt for the beat the other side is waiting on. Nothing
    where the beat is not one of the scene's own, which is a curveball
    standing in front of it: what that beat wants is on no card.
  */
  const inPlay = scene.beats.find((beat) => beat.id === beatId);
  /*
    AND `beatId` IS THE SCENE'S OWN BEAT EVEN WHILE A CURVEBALL STANDS IN
    FRONT OF IT, so the sentence above was the intent and not the code. The
    route sends the beat waiting behind the curveball and only the objective
    comes off the one in front, so "Ask them to slow down." was printed with
    the card's value for the job interview's next beat after it, "shop", which
    reads as an instruction that makes no sense. A curveball's objective is on
    no card, so while one stands nothing is dealt beside it.
  */
  const dealtNow = inPlay && !hurdle ? dealtFor(inPlay) : [];

  if (phase === "debrief" && debrief) {
    /*
      The debrief stays inside the room. A conversation that dropped the
      learner back onto the website the moment it ended would take the one
      screen that says what just happened and draw it beside a rail, and the
      way out is a door on the bar and two buttons at the foot of the debrief
      itself. The pips go, because there is nothing left in play and the
      debrief lists every objective under its own heading.

      AND THE ROOM STAYS, WHICH IS WHAT "INSIDE THE ROOM" HAD BEEN CLAIMING
      WITHOUT DOING. The band arrived on the conversation and stopped there, so
      the screen that says how the conversation went was the one screen of the
      three drawn in no particular place, with an empty bar over a list of what
      happened at a counter the learner could no longer see. It is the same
      drawing at the same size, carried across without remounting, so nothing
      about it arrives a second time.

      Nobody is talking in it and nothing is standing in the way, so it takes
      neither: the breath says whose floor it is and the floor is nobody's once
      the conversation has ended, and a queue drawn behind somebody who has
      already left is a room reporting a fact about a run that is over.
    */
    return (
      <SceneStage
        sceneId={scene.id}
        lesson={scene.lesson}
        title={t(scene.title)}
        place={t(scene.place)}
        stage={<SceneVignette sceneId={scene.id} setting={room} fit="band" />}
      >
        <div className="scene-open">
          <SceneDebrief debrief={debrief} onAgain={() => window.location.reload()} />
        </div>
      </SceneStage>
    );
  }

  if (phase === "briefing") {
    const kind = kindOf(scene.id);
    return (
      <SceneStage sceneId={scene.id} lesson={scene.lesson} title={t(scene.title)} place={t(scene.place)} minutes={minutes}>
      <div className="scene-open flex flex-col gap-5" lang={locale}>
        {/*
          THE DOOR, WHICH IS THE ONE PLACE THIS MODULE GETS TO BE PLEASED WITH
          ITSELF.

          Fourteen conversations opened as fourteen identical white cards, and
          the only thing telling a health center from a job interview was the
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
        {/*
          ONE PANEL, NOT A DRAWING AND THEN A WALL.

          The room and the role were two boxes, a night panel with a drawing in
          it and a white card under it holding the role and four paragraphs, and
          a learner read the second as a wall of text with nothing to do with
          the rest of the app. The room and who you are in it are one thing, so
          they are one night panel, which is the shape every round's briefing
          already opens on (`components/round/Briefing.tsx`): the drawing, the
          role as the one large line, and the facts about this sitting as glass
          pills under it.
        */}
        <div className="night situation-stage pop-in rounded-[var(--r-xl)] border" data-scene-brief="">
          <div className="flex flex-col items-center gap-4 text-center">
            {/* The room in the board's own glass frame, so the tile a learner
                pressed and the room it opened are visibly the same thing. */}
            <div className="situation-stage-room w-full max-w-md">
              <SceneVignette sceneId={scene.id} setting={room} />
            </div>
            {/* The kind in words beside its dot, the way the board names it. */}
            <span className="situation-glass label-xs inline-flex items-center gap-2 rounded-full px-3 py-1">
              <span aria-hidden className="situation-dot" style={{ background: `var(--${kind.hue})` }} />
              {t(chat ? "Today's words" : kind.label)}
            </span>
            {/*
              WHO YOU ARE, AND NOT WHERE YOU ARE AGAIN. The page above prints
              the place as its lead, so the role leads here and there is no
              heading: it is forty words of prose, and a heading that long is a
              paragraph wearing an `h2`.
            */}
            <p className="max-w-[44ch] font-display text-lg font-semibold leading-snug" style={{ color: "var(--ink)", textWrap: "balance" }}>
              {t(scene.role)}
            </p>
            {/*
              What is coming, in the scene's own terms. It is the count the bar
              draws as pips, read off the same list, so nothing here is a
              second answer to it.
            */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <RoundChip icon={<ListChecks size={14} aria-hidden />}>
                {fill(t("{count} things to get done"), { count: objectives.length })}
              </RoundChip>
              <RoundChip icon={<Clock size={14} aria-hidden />}>{fill(t("About {minutes} min"), { minutes })}</RoundChip>
            </div>
          </div>
        </div>

        {/*
          WHAT YOU WILL PRACTICE, AS THINGS RATHER THAN A SENTENCE. It was "You
          will practice a, b, c, d, and e", which is a list typed out as prose
          and read as one more gray line. Each is its own pill now, so the
          screen says at a glance how much there is and what it is.
        */}
        <section className="flex flex-col gap-2.5" aria-labelledby="scene-practise">
          <h2 id="scene-practise" className="label-xs" style={{ color: "var(--ink-3)" }}>
            {t("You'll practice")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(chat ? chat.words : practises(scene)).map((one) => (
              <li
                key={one}
                className="rounded-full px-3 py-1.5 text-sm font-medium"
                style={{ background: `var(--${kind.hue}-soft)`, color: toneInk(kind.hue) }}
              >
                {t(one)}
              </li>
            ))}
          </ul>
        </section>

        {/*
          THREE PROMISES, ONE IDEA EACH, EACH WITH A MARK OF ITS OWN.

          They were three paragraphs of gray prose saying the three things a
          learner cannot guess about this screen: who speaks first, that the
          card is a suggestion (ADR-025 amendment 3), and that being a little
          wrong will not end it. Said before the first line rather than
          discovered on the third, because somebody who expects to be marked
          writes less than somebody who expects to be understood. A short name
          a reader can scan, one line under it, and a colored disk saying which
          of the three it is, which is `Briefing.tsx`'s step on a light page.
        */}
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {(chat ? HOW_A_CHAT_GOES : HOW_IT_GOES).map((one) => (
            <li key={one.title}>
              {/* A row on a phone, where three tall cards are a screen of
                  scrolling, and a column of three from `sm` up. */}
              <div
                className="flex h-full items-start gap-3 rounded-[var(--r-lg)] border p-4 sm:flex-col sm:gap-2.5"
                style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth)" }}
              >
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={{ background: `var(--${one.hue})`, color: "var(--on-hue)" }}
                >
                  {one.icon}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold" style={{ color: "var(--ink)" }}>{t(one.title)}</span>
                  <span className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(one.line)}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/*
          HEAR THEM FIRST (VB-4): the other side's opening lines from the bank,
          one at a time, to say along with before the conversation starts. One
          press away, and nothing in it is marked.
        */}
        <HearFirst lines={opening} />

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
        {/* AND GONE INSIDE A MODULE FOR THE REASON THE COMMENT ABOVE GIVES
            ABOUT THE CONVERSATION ITSELF: a conversation reached from today's
            module is one step of an evening, and a lesson is a door out of it.
            Somebody who chose this conversation still gets the door. */}
        {unit && !inModule && !lessonScene && (
          <CardLink href={`/learn/${unit.id}`} icon={<BookOpen size={16} aria-hidden />}>
            {fill(t("The lesson behind it: {title}"), { title: unit.title })}
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
          about a color never carrying a distinction on its own broken on the
          one control where the color *is* the answer. `ChoiceCard` was
          written for exactly this shape and every other pick-one in the app
          already uses it.
        */}
        {/*
          The band the other side talks at. Five chips rather than a card each,
          since the choice is one of five short names a learner already knows
          from every other screen, and the hint says which one is theirs so
          the default reads as a default rather than as a verdict.
        */}
        {/*
          THE TWO DIALS, IN ONE CARD. They were loose on the page below the
          lesson link, so the screen read as a stack of unrelated parts; they
          are one decision, how this conversation will feel, so they sit
          together like every other settings group in the app.
        */}
        {!lessonScene && (
        <Card className="flex flex-col gap-5">
        <ChoiceGroup
          label={t("How they talk to you")}
          hint={fill(t(openAt === learnerLevel
            ? "Your level is {level}. Lower for simpler sentences, higher to be spoken to like anyone else."
            : openAt < learnerLevel
              ? "Your level is {level}, but this starts at {start} for now, since your recent answers have been a struggle. Change it whenever you like."
              : "Your level is {level}, but this starts at {start} for now, since you've been getting nearly everything right. Change it whenever you like."), { level: learnerLevel, start: openAt })}
        >
          {LEVELS.map((one) => (
            <ChoiceChip key={one} selected={level === one} onSelect={() => setLevel(one)} even>
              {one}
            </ChoiceChip>
          ))}
        </ChoiceGroup>

        {/*
          AND HOW THEY ARE HEARD, beside the other two, because it is the same
          kind of decision: how this conversation will feel. See
          lib/audio/sceneVoice.ts for why a voice mode plays a line unasked.
        */}
        <SceneVoiceChoice value={voiceMode} onSelect={chooseVoice} />

        {/* A chat throws nothing at anybody, so it has no dial for how much. */}
        {!chat && (
        <ChoiceGroup
          label={t("How tricky should it be?")}
          className="grid gap-2 sm:grid-cols-2"
        >
          {DIFFICULTIES.map((one) => (
            <ChoiceCard
              key={one.id}
              selected={difficulty === one.id}
              onSelect={() => setDifficulty(one.id)}
              title={t(one.label)}
              detail={t(one.blurb)}
              layout="stacked"
            />
          ))}
        </ChoiceGroup>
        )}
        </Card>
        )}

        {error && <p className="text-sm" style={{ color: "var(--blush-ink)" }}>{t(error)}</p>}
        {/*
          TALK IT THROUGH (VB-4, SP-3's "cold plus speaking"): the closest this
          app comes to the real thing. The other side is heard and not shown,
          what to do is behind a press, and the answers are said. Offered once
          the learner has got through this scene with the words on screen, and
          only where this deployment can hear. Quieter than starting, because
          starting is what most people came here to do.
        */}
        {finishedOnce && speechHere && (
          <div className="flex flex-col gap-1.5" data-talk-through>
            <Button onClick={() => start(true)} disabled={busy} variant="secondary">
              {call ? <Phone size={16} aria-hidden /> : <Mic size={16} aria-hidden />} {t("Talk it through")}
            </Button>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              {t("Nothing to read: you hear them and answer out loud.")}
            </p>
          </div>
        )}
        <Button onClick={() => start()} disabled={busy} variant="primary" size="lg">
          {busy ? t("Getting ready…") : t(chat ? "Start the chat" : "Start the conversation")}
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
  /*
    WHOSE FLOOR IT IS, WHICH IS THE ONE THING A WALL OF BUBBLES SAYS LEAST WELL.

    The same reading the wait already takes: a turn is with the server, and the
    last thing in the log is not theirs, so they are the ones about to speak.
    Anything else and the floor is the learner's, which is most of a
    conversation and is exactly when somebody is looking at the box rather than
    at the transcript. Nobody has it while the room is moving, because nobody is
    saying anything under a cover.

    A CONVERSATION NOBODY HAS SPOKEN IN YET IS THEIRS, which is not the same
    reading and is the one frame it gets wrong. The other side speaks first in
    every scene, and the briefing says so; the request for that line is sent
    from an effect, so it is the render *after* the conversation arrives that
    sets `busy`. For the frame in between there is no turn and nothing in
    flight, and the learner's own breath was drawn over a room where nobody had
    said anything at all. Read off the transcript rather than off the wait.
  */
  const saying = moving
    ? null
    : (turns.length === 0 || busy) && turns[turns.length - 1]?.who !== "them"
        ? "them" as const
        : "you" as const;
  /*
    And what has just come up, which the server says and the screen draws. The
    standing curveball where there is one, and the queue, which never stands as
    a beat at all and stays for the rest of the run once it has formed.
  */
  const cue = cueFor(hurdle) ?? (queued ? "behind" : null);
  /*
    SPEAKING THE CONVERSATION (VB-4). The microphone leads where the learner
    chose to say it, and where they chose to pick and this beat has no lines to
    pick from. A call is a scene that opens on the telephone (`isCall`): there
    the microphone opens by itself after each of the other side's lines, once
    the learner has pressed it once in this run, and `turnCue` is what moves
    each time the floor comes back to them. A call heard and not read looks
    like one (`CallScreen`).
  */
  const speaking = speechHere && (talk || answerBy === "say" || (answerBy === "pick" && picks.length === 0));
  speakingRef.current = speaking || (speechHere && answerBy === "pick" && picks.length > 0 && !unmatched);
  const turnCue = saying === "you" && !busy && turns[turns.length - 1]?.who === "them" ? turns.length : 0;
  const callLook = call && (hidesLines(heardMode) || goalHidden);

  const cardBlock = (
      <details
        open={wide || undefined}
        className="scene-sticky z-10 mb-4 lg:mb-0 lg:[&>summary]:hidden"
        /*
          Opening it while it is pinned unpins it, and its place in the flow can
          be a screenful above where the learner is standing, so the card would
          open somewhere they cannot see. It is brought to them instead, under
          the bar and the room, which `scroll-margin-top` in the stylesheet is
          the offset for. `nearest` because a card already on screen must not be
          scrolled at all: the press was to read it, not to move the page.

          On the next frame, because the browser sets `open` and fires this
          before it has laid the card out, so a measurement taken here is of the
          box as it was.
        */
        onToggle={(event) => {
          const card = event.currentTarget;
          if (card.open) requestAnimationFrame(() => card.scrollIntoView({ block: "nearest" }));
        }}
      >
        {/*
          The values first, because they are the reason this line is on the
          screen at all, and the place not at all: the bar two lines above
          already says where you are standing, and printing it again is the
          same sentence twice on a screen with room for neither.
        */}
        <summary
          className="cursor-pointer rounded-full px-4 py-2 text-sm"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)", color: "var(--ink-2)" }}
        >
          {dealt.length > 0 ? (
            <>
              <span style={{ color: "var(--ink-3)" }}>{t("Your card:")}{" "}</span>
              <span className="font-medium" style={{ color: "var(--ink)" }}>{dealt.map((value) => t(value)).join(", ")}</span>
            </>
          ) : (
            t("Your card")
          )}
        </summary>
        <Card className="mt-2 flex flex-col gap-4">
          {/*
            WHO YOU ARE, THEN THE FACTS, THEN WHO IS ACROSS THE TABLE, AND EACH
            OF THEM LOOKS LIKE WHAT IT IS.

            A learner sent a screenshot of this card and said it was hard to
            tell where the information was and that the fonts and colors were
            arbitrary. They were: the role, the labels, the values and the
            persona were four kinds of thing in one column, all at `text-sm`,
            two of them in the same ink, and one prop kind printed its value
            inside its own label while another printed it underneath. So a
            label is the small quiet ink on every line, a value is the strong
            ink at reading size on every line, and the prose the card opens and
            closes with is separated from the facts by a rule rather than by a
            gap somebody has to notice.
          */}
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{opened ? t(opened.card.you) : null}</p>
          {/* No list at all where the card dealt nothing, or its two rules stand empty over the persona. */}
          {(opened?.card.props.length ?? 0) > 0 && (
          <ul
            className="flex flex-col gap-3 border-y py-3"
            style={{ borderColor: "var(--rule)" }}
          >
            {(opened?.card.props ?? []).map((prop) => (
              <li key={prop.slot}>
                {/*
                  NOT `label-xs`, WHICH UPPERCASES. Half these labels are whole
                  sentences ("It started earlier this week, on this day."), and
                  a sentence in capitals is a shouted one, which is the same
                  argument the hint panel's own eyebrow makes about itself. The
                  label and the value are told apart by size, weight and ink,
                  which is three things and enough.
                */}
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>{t(prop.card)}</p>
                {/*
                  What you were dealt. In English where the card dealt a word,
                  because saying it in Estonian is the exercise; as itself
                  where it is a floor, a time or a reference, which print
                  themselves (`DrawnProp.shown`). Never empty: a card reading
                  "read it off the word below" with nothing below it is a card
                  nobody can answer, and that shipped on two props of three.
                */}
                {prop.given.length > 0 && (
                  <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                    {prop.given.map((value) => t(value)).join(", ")}
                  </p>
                )}
                {/* The word came back because it was missing last time. Said, so the card reads as remembering rather than repeating. */}
                {prop.returned && (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
                    {t("You reached for this one in a recent conversation and didn't have it.")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          )}
          {/*
            WHO YOU ARE TALKING TO, BELOW THE FACTS RATHER THAN AMONG THEM.

            It came off the strip because it is not a value anybody types, and
            it belongs on the card, which is read once and is where a learner
            finds out who they are about to talk to. It is the persona's
            `meet` line, which says what they will do and says it with a smile
            (docs/18-voice.md, section 3c).
          */}
          {opened?.persona && (
            <p data-scene-persona className="text-sm" style={{ color: "var(--ink-2)" }}>
              <span className="font-semibold" style={{ color: "var(--ink)" }}>{t("Who you're talking to")}: </span>
              {t(opened.persona)}
            </p>
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
              {fill(t("What to get done, {met} of {total}"), { met: metCount, total: objectives.length })}
            </p>
            <ul className="flex flex-col gap-1">
              {objectives.map((beat) => {
                const met = done.includes(beat.id);
                const now = !met && beat.id === beatId;
                const value = dealtFor(beat);
                return (
                  <li key={beat.id} className="flex items-start gap-2 text-sm">
                    {/*
                      An icon and a word beside the hue, because mint means
                      recalled and nothing in this app may be carried by color
                      alone. The marker holds its own column and the goal wraps
                      beside it: a `flex-wrap` on the row lets a long objective
                      push its own bullet onto a line of its own, which reads as
                      a list that has come apart.
                    */}
                    <span aria-hidden className="shrink-0" style={{ color: met ? "var(--sky-ink)" : now ? "var(--accent-deep)" : "var(--ink-3)" }}>
                      {met ? "✓" : now ? "→" : "○"}
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                      <span style={{ color: met || now ? "var(--ink)" : "var(--ink-3)" }} className={now ? "font-medium" : undefined}>
                        {onStage(beat.goal)}
                      </span>
                      {/*
                        AND WHAT THE CARD DEALT FOR IT, HERE RATHER THAN
                        SOMEWHERE ELSE. The goal used to end "It is on your
                        card" and the card was a disclosure above this one with
                        three lines of prose in it. A learner said the
                        instruction should carry the value, and an instruction
                        that sends somebody off to read something is not an
                        instruction. The card still prints all of it, which is
                        the reminder that it is still true while you type.
                      */}
                      {value.length > 0 && (
                        <span className="font-semibold" style={{ color: met || now ? "var(--ink)" : "var(--ink-3)" }}>
                          {value.join(", ")}
                        </span>
                      )}
                      <span className="sr-only">{t(met ? "done" : now ? "this is the one they are waiting on" : "not yet")}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      </details>
  );

  return (
    <SceneStage
      sceneId={scene.id}
      lesson={scene.lesson}
      title={t(scene.title)}
      place={t(scene.place)}
      progress={progress}
      /*
        THE ROOM, STILL THERE WHILE THE CONVERSATION IS HAD IN IT.

        It was drawn on the briefing and then taken away, so every question
        after the first was asked about a place the learner could no longer
        see, and a learner said so: the drawings were gone. All four things a
        drawing is for happen here rather than on the briefing. Where you are
        is what every beat asks about. Who is talking is what a column of
        bubbles carries worst. How many people are in the room is pressure
        nobody announces. And a curveball was a sentence of English above a
        question in Estonian, where a person at a counter would simply have
        seen the man who started talking over them.
      */
      stage={<SceneVignette sceneId={scene.id} setting={room} speaking={saying} cue={cue} fit="band" />}
      aside={cardBlock}
    >
    {/*
      THE COVER, WHICH IS THE ONE MOMENT NOTHING CAN BE TYPED.

      Drawn here rather than inside the conversation, because it covers the
      conversation: the composer under it is closed for the whole of it
      (`busy` is still true, and the field is handed `disabled` as well, since
      a disabled field and a disabled button are two different promises to a
      keyboard), and the lines said after the move are held until it clears.
    */}
    {interlude && (
      <SceneInterlude
        sceneId={scene.id}
        from={interlude.from}
        to={interlude.to}
        text={onStage(interlude.text)}
        onDone={interlude.done}
      />
    )}
    <div className="scene-open flex flex-col gap-4" lang={locale}>
      {/*
        THE CARD IS ONE LINE UNTIL SOMEBODY ASKS FOR MORE, WHICH IS THE WHOLE
        OF WHAT WAS WRONG WITH IT.

        It used to be open. On a phone that is a wall: forty words of role,
        two labeled values, a line about the persona, and then every
        objective in the scene written out as a sentence, all of it above the
        conversation and all of it read once. A learner sent a screenshot of
        it and called it cluttered and confusing, which it was.

        Almost none of that is wanted mid-conversation. What is wanted is what
        the card *dealt*, because a beat asks the learner to read a value off
        it, and that is two words. So the strip is the values, it sticks, and
        everything else is behind it for whoever wants it. Nothing was
        deleted: the role and the persona are the first thing on the briefing,
        the objective in play is named in the panel a learner types into, and
        how many are behind them is a pip apiece on the bar above.

        A `details` rather than a state flag, because the browser gives the
        disclosure a keyboard and a screen reader for free.
      */}
      {/*
        THE ONE LINE STICKS AND THE PROSE DOES NOT, BECAUSE ONE OF THEM IS
        NEEDED AT THE MOMENT OF TYPING AND THE OTHER IS READ ONCE.

        Measured at 360x640, which is the width this app is measured at: the
        card open is 300 to 400 pixels and the composer with its buttons is
        another 200, so the column is half again as tall as the screen and the
        card is off the top of it for the whole conversation. With a keyboard up
        it is off the top twice over. That is not a cosmetic loss: the values on
        the card are exactly what a beat asks for, so a learner asked what time
        suits them was being asked about a time they could no longer see.

        Sticking the whole disclosure is the obvious fix and is worse, since a
        40vh block pinned over the conversation leaves it reading underneath.
        What has to stay is the facts, and they are one line. They are also
        drawn twice, here and under the prop line that asks for them, and that
        is the right kind of twice: the pairing in the body says which value
        answers which line, and this says the value is still true while you
        type. A reminder is not a second answer to a question.

        AND THE THING THAT STICKS IS THE DISCLOSURE, NOT ITS SUMMARY, WHICH IS
        THE HALF THAT WAS WRONG FOR THE WHOLE OF THIS FEATURE'S LIFE.

        `position: sticky` moves a box inside its own containing block and no
        further, and a `summary`'s containing block is the `details` around it.
        Closed, that is exactly as tall as the summary: there is nowhere to
        travel, so the line marked sticky scrolled away with the page like
        anything else, and every word of the paragraph above described a thing
        that never happened. Driven in a browser at 390 after two turns, the
        pill was simply gone.

        So the `details` is what sticks, and only while it is closed, which is
        when it *is* the one line. Open it and it is an ordinary block in the
        flow again, which is the whole of the rule above kept: nothing pins 400
        pixels over a conversation. `:not([open])` is the browser's own
        attribute rather than a flag of ours, so this stays a real disclosure
        with the keyboard and the screen reader it came with.
      */}

      {opened && (!opened.composed || note) && !modelDown && (
        /* A quiet status row rather than two lines of small gray prose loose
           between the card and the conversation: an icon, one sentence, on
           the raised ground every other status in the app sits on. */
        <p
          className="flex items-start gap-2 rounded-[var(--r)] px-3.5 py-2.5 text-sm"
          style={{ background: "var(--raised)", color: "var(--ink-2)" }}
        >
          <Info size={15} aria-hidden className="mt-0.5" style={{ color: "var(--ink-3)" }} />
          <span>
            {/* Said for the learner rather than the operator: "no AI key is
                set up" is a fact about the deployment nobody reading it can
                act on, and what it changes for them is that the other side
                keeps to its lines. */}
            {(note ? t(note) : null)
              ?? t("They speak from lines written for this scene, so they stick closer to the card than a person would.")}
          </span>
        </p>
      )}

      {/*
        A log region that announces each new turn once and does not re-announce
        the ones above it, which is the lesson the exam clock taught: a live
        region that updates constantly reads a number a second at somebody.
      */}
      {/*
        ONE NIGHT, FROM THE FIRST LINE TO THE BOX YOU ANSWER IN. The landing
        page's café is lit this way and it was the part people loved: the
        conversation and the place you say your line are one stage, so the
        screen reads as a room you are in rather than as three panels stacked.
        It grows with every line, because in the app the conversation is the
        page, and nothing inside it scrolls on its own.
      */}
      <div className="night night-open scene-night flex flex-col gap-5 rounded-[var(--r-xl)] border p-3 sm:p-4 md:p-6">
      {/*
        A CALL LOOKS LIKE A CALL (VB-4). On the telephone, heard rather than
        read, the screen is what a phone shows mid-call: who is on the line,
        how long it has been going, and whose turn it is, with nothing to read.
        The conversation is still there under it, mounted so each line still
        plays, and hidden, because the whole point of hearing it is not seeing
        it. The clock counts up and limits nothing (D9).
      */}
      {callLook && <CallScreen saying={saying} listening={mic.listening} thinking={mic.thinking} />}
      <div
        hidden={callLook}
        className="flex flex-col gap-3 px-1 pt-1"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t("The conversation")}
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
            /*
              WHO IS TALKING, BESIDE THE LINE. A learner asked for it in those
              words: the drawings are on the briefing and on the cover between
              two rooms, and the conversation itself was two columns of cards
              told apart by which edge they sat against and which ink they were
              written in. `SceneFace` is the vignette's own figure at thirty
              pixels, once per run rather than once per bubble, and the
              sentence under it is what a screen reader is told instead.
            */
            <div key={index} className="scene-say-you flex flex-row-reverse items-start justify-start gap-2">
              <SceneFace who="you" />
              <div className="flex min-w-0 flex-col items-end">
              <span className="sr-only">{t("You said:")}{" "}</span>
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
                color may carry on its own either.
              */}
              <div data-who="you" className="scene-bubble inline-block max-w-full">
                <p lang="et" className="flex items-center justify-end gap-2">
                  <span>{turn.text}</span>
                  {aloud && <Speak
                    text={turn.text}
                    voice={voice}
                    size={14}
                    className="press inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--cta-ink)_14%,transparent)]"
                    style={{ color: "var(--cta-ink)" }}
                  />}
                </p>
              </div>
              {/*
                Understood, and how the word is said. Under the learner's own
                words and in the quiet ink, because it is not a verdict: the
                conversation carried on, and this is the one thing worth
                knowing about the turn. The form is the dictionary's, off the
                server's marking, and a slip the dictionary cannot recast is
                still "understood", which is the half that matters.
              */}
              {/*
                THE RECAST IS THE LESSON ABOUT THE WORD (SP-3). Said aloud, a
                word the recognizer heard as a non-word was read as the word the
                dictionary holds, and the other side has already said it back
                right. Under the bubble, the two side by side: what was heard,
                and how they say it, the second with a speaker in the app's own
                voice. Only the second: what was heard is a spelling the
                dictionary does not hold, and the app's native voice saying it
                would put the mistake in a native speaker's mouth, which is the
                reason a chat never quotes the learner's Estonian back
                (`ChatPlan.remembered`). "Heard" is the verb: nothing here says
                how the word sounded.
              */}
              {turn.heard && turn.heard.repairs.length > 0 && (
                <ul data-heard-recast className="mt-1 flex flex-col items-end gap-1 pr-1 text-right text-xs" style={{ color: "var(--ink-3)" }}>
                  {turn.heard.repairs.map((repair) => (
                    <li key={`${repair.from}>${repair.to}`} className="flex flex-wrap items-center justify-end gap-x-1">
                      {aroundAll(t("We heard {heard}. They say {said}."), {
                        heard: (
                          <span className="inline-flex items-center gap-0.5">
                            <span lang="et" className="font-medium" style={{ color: "var(--ink-2)" }}>{repair.from}</span>
                          </span>
                        ),
                        said: (
                          <span className="inline-flex items-center gap-0.5">
                            <span lang="et" className="font-medium" style={{ color: "var(--ink-2)" }}>{repair.to}</span>
                            {aloud && <Speak text={repair.to} voice={voice} size={12} label={t("Hear it")} className="press inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-[var(--raised)]" />}
                          </span>
                        ),
                      })}
                    </li>
                  ))}
                </ul>
              )}
              {turn.slips && turn.slips.length > 0 && (
                <p className="mt-1 pr-1 text-right text-xs" style={{ color: "var(--ink-3)" }}>
                  {t("They understood you.")}
                  {turn.slips.some((slip) => slip.form) && (
                    <>
                      {" "}
                      {around(t("They'd say {forms}."), "forms", turn.slips.filter((slip) => slip.form).map((slip, at, all) => (
                        <span key={slip.said}>
                          <span lang="et" className="font-medium" style={{ color: "var(--ink-2)" }}>{slip.form}</span>
                          {at < all.length - 1 && ", "}
                        </span>
                      )))}
                    </>
                  )}
                </p>
              )}
              </div>
            </div>
          ) : (
            <div key={index} className="flex items-start gap-2">
              {/* A break in time on its own is nobody speaking, so no face beside it. */}
              {turn.lines.some((line) => line.provenance !== "meanwhile") && <SceneFace who="them" />}
              <div className={`flex min-w-0 flex-col items-start gap-2 ${turn.lines.every((line) => line.provenance === "meanwhile") ? "w-full" : ""}`}>
              <span className="sr-only">{t("They said:")}{" "}</span>
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
                    <div data-who="them" className="scene-bubble inline-block max-w-full">
                      {hidesLines(heardMode) && spokenEstonian(line) && !shown.has(line.text) ? (
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
                            insist
                            /* Written out, because the default label is the
                               line itself and these words are the ones hidden. */
                            label={t("Hear what they said")}
                            className="press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[var(--raised)]"
                          />
                          <button
                            type="button"
                            onClick={() => reveal(line.text)}
                            className="tap-tint rounded-full px-3 py-1 text-sm"
                            style={{ color: "var(--ink-2)" }}
                          >
                            {t("Show the words")}
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
                          speak={aloud && {
                            voice,
                            condition: conditionFor(opened?.plays ?? 0, index, hearing, true),
                            rate: speed,
                            autoplay: index === turns.length - 1 && at === turn.lines.length - 1,
                            insist: true,
                          }}
                        />
                      ) : (
                      <p lang={spokenEstonian(line) ? "et" : "en"} className="flex items-center gap-2">
                        <span>{line.text}</span>
                        {aloud && spokenEstonian(line) && (
                          <Speak
                            text={line.text}
                            voice={voice}
                            condition={conditionFor(opened?.plays ?? 0, index, hearing, true)}
                            rate={speed}
                            size={14}
                            autoplay={index === turns.length - 1 && at === turn.lines.length - 1}
                            insist
                            className="press inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-[var(--raised)]"
                          />
                        )}
                      </p>
                      )}
                        </>
                      )}
                    </div>
                    {/*
                      NOTHING UNDER THE BUBBLE. Every line used to carry where
                      it came from and a Report button, which under every line
                      of a conversation is a second conversation, and the
                      learner asked for it gone. Which model is composing is
                      said once at the top of the conversation (ADR-025), and
                      the rung still rides on `data-rung` above for a suite.
                    */}
                  </div>
                ) : line.provenance === "meanwhile" ? (
                  /*
                    TIME PASSING, DRAWN AS SOMETHING THAT HAPPENS.

                    A stage direction is set small and gray because it stands
                    in for a line and is worth less than one. This is the
                    opposite: it is the scene picking the learner up and
                    putting them somewhere else, and everything after it is
                    asked about the new place. It was a gray sentence between
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
                      className="scene-break scene-aside inline-flex max-w-[85%] items-center gap-2.5 rounded-[var(--r-lg)] px-4 py-2.5 text-left text-sm"
                    >
                      <Clock size={16} aria-hidden className="shrink-0" style={{ color: "var(--cta)" }} />
                      {onStage(line.text)}
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
                    `test-design.mjs` measures: a hint set as gray italics
                    beside a gray italic stage direction is a hint nobody sees
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
                      panel's color and position say nothing.
                    */}
                    <span className="label-xs block" style={{ color: "var(--accent-deep)" }}>
                      {t("Hint")}
                      <span className="sr-only"> ({t(PROVENANCE.coach)})</span>
                    </span>
                    {onStage(line.text)}
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
                    {onStage(line.text)}
                    <span className="sr-only"> ({t(PROVENANCE.unspoken)})</span>
                  </p>
                )
              ))}
              </div>
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
          <div className="scene-say flex items-start gap-2">
            {/* Beside the same face their lines arrive beside, or the wait
                steps a bubble's width to the left of where they speak. */}
            <SceneFace who="them" />
            {/* The same bubble the lines arrive in, so the wait reads as them
                about to speak rather than as a panel appearing. */}
            <div data-who="them" className="scene-bubble inline-block">
              <Dots label={t("They are answering")} />
            </div>
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
        {/* Lit the way the room above it is, so the two ends of the screen
            are one conversation: the place you are in, and what you say in it. */}
        <div className="scene-ask flex flex-col gap-3 rounded-[var(--r-xl)] p-4 md:p-5">
          {/*
            HOW THEY ARE HEARD, SAID WHERE THE LEARNER IS LOOKING. A label and
            a control at once: the chosen chip says which of the three this
            conversation is, and a press on another changes it without leaving
            the room. Outside the live region below, because a radio group
            announces itself when it is used and announcing it again on every
            turn would be the same sentence read at somebody each time the
            other side speaks.
          */}
          {!talk && <SceneVoiceChoice value={voiceMode} onSelect={chooseVoice} compact />}
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
            <p className="label-xs flex flex-wrap items-baseline justify-between gap-x-3" style={{ color: "var(--cta)" }}>
              <span>{t("Your turn")}</span>
              <span style={{ color: "var(--ink-3)" }}>{fill(t("{met} of {total}"), { met: metCount, total: objectives.length })}</span>
            </p>
            {/*
              The same count as a row of steps, the ones behind you lit in the
              mix, which is the landing page's café brought inside. It says
              nothing the words beside the eyebrow do not, so it is hidden from
              a screen reader rather than read twice.
            */}
            <ol aria-hidden className="scene-meter mt-2">
              {objectives.map((beat) => (
                <li
                  key={beat.id}
                  data-state={done.includes(beat.id) ? "done" : beat.id === beatId ? "now" : undefined}
                />
              ))}
            </ol>
            {/*
              Bigger than the conversation rather than smaller, because it is
              read before every turn and the transcript is read once. Where the
              server has no goal for the beat, the panel still says what the
              box is for rather than standing empty.
            */}
            {goal && goalHidden && !goalShown ? (
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
                {t("Show me what I'm trying to do")}
              </button>
            ) : (
              <p className="mt-1 text-lg font-medium leading-snug">
                {goal ? onStage(goal) : t("Answer them.")}
                {/*
                  AND THE VALUE THE CARD DEALT FOR IT, IN THE ONE PLACE THE
                  LEARNER IS LOOKING WHEN THEY TYPE. Behind the same press as
                  the goal on `cold`, because on that setting the objective is
                  the thing being withheld and a value beside it would hand it
                  over. The card above still prints it, which is what makes
                  this a reminder rather than a second answer.
                */}
                {dealtNow.length > 0 && (
                  <span style={{ color: "var(--accent-deep)" }}> {dealtNow.join(", ")}</span>
                )}
              </p>
            )}
          </div>
          {lent && (
            <p className="text-sm" aria-live="polite">
              <span style={{ color: "var(--ink-2)" }}>{t("The word you were reaching for:")}{" "}</span>
              <span lang="et" className="font-medium">{lent.lemma}</span>
              <span style={{ color: "var(--ink-2)" }}>, {lent.gloss}</span>
            </p>
          )}
          {error && <p className="text-sm" style={{ color: "var(--blush-ink)" }}>{t(error)}</p>}

          {/*
            Closed while the room is moving, and closed by the field itself
            rather than only by the button beside it. A box that still takes
            letters under a cover nobody can see through is a learner typing an
            answer to a question that has not been asked yet, in a place they
            have not been told they are standing in.
          */}
          {/*
            THE SWITCH HAS THREE WAYS NOW (VB-4): pick a line, say it, or type
            it, and it remembers which was used last. Saying it is offered
            wherever this deployment can hear, and talking it through hides the
            switch, because the answers in that mode are said.
          */}
          {/*
            Small chips with the icons hidden on a phone, the way the row
            above it is drawn: three ways at full size broke onto two lines at
            360, which read as two choices and an afterthought.
          */}
          {!talk && (
            <ChoiceGroup ariaLabel={t("How you answer")} className="flex flex-wrap gap-2">
              {([
                ...(chat ? [] : [{ id: "pick" as const, title: t("Pick a line"), icon: <ListChecks size={15} aria-hidden /> }]),
                ...(speechHere ? [{ id: "say" as const, title: t("Say it"), icon: <Mic size={15} aria-hidden /> }] : []),
                { id: "type", title: t("Type it"), icon: <CornerDownLeft size={15} aria-hidden /> },
              ] as const).map((one) => (
                <ChoiceChip
                  key={one.id}
                  selected={answerBy === one.id}
                  onSelect={() => chooseAnswer(one.id)}
                  icon={<span className="hidden sm:inline-flex">{one.icon}</span>}
                  small
                >
                  {one.title}
                </ChoiceChip>
              ))}
            </ChoiceGroup>
          )}
          {answerBy === "pick" && picks.length > 0 ? (
            /*
              Each line is a button that says it, with what it means under it.
              Nothing is marked before it is said: the reply is the marking, as it
              is for a typed turn, and a picked line grades nothing.

              AND A LINE CAN BE SAID RATHER THAN PRESSED. What was heard is
              matched after decoding (D8): a clear match lights that line and
              the ring sends it, still a pick, still grading nothing. A line
              that was heard and matched none is never sent as a pick; it goes
              into the box under the lines, to change and send.
            */
            <div className="flex flex-col gap-2" data-picks>
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                {t(speechHere ? "Pick what you'd say, or say it out loud. Picked lines don't count toward your words." : "Pick what you'd say. Picked lines don't count toward your words.")}
              </p>
              {picks.map((pick) => (
                <button
                  key={pick.id}
                  type="button"
                  className="choice-btn press flex border items-center justify-between gap-3 rounded-xl px-4 py-3 text-left"
                  onClick={() => answer(pick.et, true, lit === pick.id ? pending : null)}
                  disabled={busy || moving}
                  data-pick={pick.id}
                  data-lit={lit === pick.id ? "true" : undefined}
                  aria-describedby={lit === pick.id ? "scene-heard-pick" : undefined}
                >
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span lang="et" className="text-md font-medium">{pick.et}</span>
                    <span className="text-sm" style={{ color: "var(--ink-2)" }}>{pick.en}</span>
                  </span>
                  {lit === pick.id && ring === "pick" && (
                    <span style={{ color: "var(--accent-deep)" }}>
                      <SendRing onDone={ringDone} onStop={() => setRing(null)} announce={false} />
                    </span>
                  )}
                </button>
              ))}
              {lit && (
                <p id="scene-heard-pick" role="status" className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {ring === "pick" ? t("That's the line you said. It goes in a moment. Press anywhere or any key to stop it.") : t("That's the line you said. Press it to send it.")}
                </p>
              )}
              {speechHere && (
                <SceneMic
                  key="mic"
                  box={null}
                  expect={expect}
                  onHeard={onHeard}
                  call={call}
                  cue={turnCue}
                  closed={busy || moving}
                  label={t("Say one of these")}
                  onState={setMic}
                />
              )}
              {unmatched && (
                <>
                  <p role="status" className="text-sm" style={{ color: "var(--ink-2)" }}>
                    {t("That wasn't one of these lines, so it's in the box to change and send.")}
                  </p>
                  <EstonianInput
                    value={draft}
                    onChange={(next) => { setDraft(next); if (!next) setPending(null); }}
                    onEnter={say}
                    inputRef={box}
                    disabled={moving}
                    ariaLabel={t("What you say")}
                    placeholder={t("Say it in Estonian")}
                  />
                  <Button onClick={say} disabled={busy || moving || !draft.trim()} variant="primary" className="w-full sm:w-auto sm:self-start">
                    <CornerDownLeft size={16} aria-hidden /> {t("Say it")}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              {/*
                SAYING IT: the microphone leads, the words appear in the box as
                they are said, and the ring on the button sends them unless the
                learner touches the screen first, which leaves them in the box
                to change. Typing it is the box alone, exactly as before.
              */}
              {speaking && (
                <SceneMic
                  key="mic"
                  box={box}
                  expect={expect}
                  onHeard={onHeard}
                  call={call}
                  cue={turnCue}
                  closed={busy || moving}
                  label={t("Say your answer")}
                  size="lg"
                  onState={setMic}
                />
              )}
              <EstonianInput
                value={draft}
                onChange={(next) => { setDraft(next); if (!next) setPending(null); }}
                onEnter={say}
                inputRef={box}
                disabled={moving}
                ariaLabel={t("What you say")}
                placeholder={moving ? t("Just a moment…") : speaking && mic.offered ? t("Your words appear here") : t("Say it in Estonian")}
              />
              {/*
                Alone in its row, so the one action a learner takes every turn is the
                loud one and nothing sits between it and the box. The three quieter
                controls are a row of their own underneath, which also keeps Leave
                away from the button being pressed twenty times a conversation.
              */}
              <Button onClick={say} disabled={busy || moving || !draft.trim()} variant="primary" className="w-full sm:w-auto sm:self-start">
                {ring === "box"
                  ? <SendRing onDone={ringDone} onStop={() => setRing(null)} announce={false} />
                  : <CornerDownLeft size={16} aria-hidden />}{" "}
                {t("Say it")}
              </Button>
              {ring === "box" && (
                <p role="status" className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {t("This goes in a moment. Press anywhere or any key to stop it and change the words.")}
                </p>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={again} disabled={busy || moving || !heard}>
              <RotateCcw size={16} aria-hidden /> {t("Say that again")}
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
              <LifeBuoy size={16} aria-hidden /> {t("I need a word")}
            </Button>
            <Button variant="ghost" onClick={() => hangUp(sent, true)} disabled={busy || moving}>
              <DoorOpen size={16} aria-hidden /> {t("Leave")}
            </Button>
          </div>
          {/*
            Which model is playing the other side, and whether it is the one
            this module is pinned to, said once in the panel the learner is
            already looking at rather than above the room or under every line.
          */}
          {opened && (modelDown || (writer && !writer.primary)) && (
            <p role="status" className="verdict-panel verdict-nearly">
              {modelDown
                ? t("The language model is not answering right now, so the other side can only use lines written for this scene in advance and will understand much less than usual. Try again a little later.")
                : fill(t("The main language model is not answering, so a backup ({model}) is writing the other side's lines. It may make mistakes the main one would not."), { model: writer?.model ?? "" })}
            </p>
          )}
          {writer && !modelDown && (
            <p className="text-xs" data-scene-model={writer.model} style={{ color: "var(--ink-3)" }}>
              {fill(t("The other side is played by {label}, {model}"), { label: writer.label, model: writer.model })}
            </p>
          )}
        </div>
      </div>
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
    against the dictionary before it was kept (lib/scenes/scripted.ts).
  */
  scripted: "Written for this scene, every word checked",
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
  english: "Said in English",
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
  unspoken: "In English, because we didn't have an Estonian line for it",
  /*
    Time passing. Not a stage direction and not something anybody said: it is
    the scene moving the learner from one place to the next, which the screen
    used not to do at all, so a conversation that walked somebody to a shop
    left them answering from their own kitchen.
  */
  meanwhile: "What's happened since",
  /*
    The app, out of character. Everything else on this screen is one side of a
    conversation and a conversation cannot explain itself; this can, and the
    label says whose voice it is so nobody reads it as the other person
    breaking into English.
  */
  coach: "A hint from us, not from them",
};

export { BUDGETS };
