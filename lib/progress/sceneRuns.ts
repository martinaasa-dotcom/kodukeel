import { prisma } from "@/lib/db";
import { LEVELS } from "@/lib/collections/syllabus/types";
import { clip } from "@/lib/copy/clip";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { chatOffered, chatPersona, planChat } from "@/lib/progress/chat";
import { chatDay } from "@/lib/progress/chatDay";
import { gradeOnce } from "@/lib/progress/grading";
import { courseLevelFor } from "@/lib/progress/level";
import {
  alsoDoneOf, beatNow, beginRun, concededOf, finishRun, MAX_TURNS, MAX_TURN_CHARS, spokenOf,
  type Briefing, type FinishedRun,
} from "@/lib/progress/scene";
import { sceneById } from "@/lib/scenes/catalogue";
import { BUDGETS, type Difficulty } from "@/lib/scenes/curveballs";
import { cardsForGrades } from "@/lib/scenes/grades";
import { CHAT_ID } from "@/lib/scenes/specs/chat";
import { stableReviewId } from "@/lib/srs/grade";
import type { RatingValue } from "@/lib/srs/scheduler";
import { sceneProviders } from "@/lib/tutor/provider";
import { wouldAuthorise } from "@/lib/usage/ledger";

/*
  A CONVERSATION OPENED, HELPED AND FINISHED, FOR EVERY DOOR (ADR-029).

  These four were the bodies of `beginScene`, `beginChat`, `sceneHelp` and
  `finishScene` in `app/actions.ts`, moved here unchanged so the web's actions
  and `/api/v1/scenes` call one function each. A door resolves the owner,
  takes its own allowance (`throttleAction`) and, on the web, revalidates the
  pages it touched; everything else is here. A refusal carries a `reason`, the
  closest of the v1 error codes, which the actions leave off the answer the
  screen reads and the routes answer with.
*/

/** An argument that is supposed to be a string, as one: anything else reads as empty. */
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** A refusal, with the v1 code it answers to. */
export interface Refused {
  ok: false;
  reason: "not_found" | "invalid" | "switched_off" | "rate_limited";
  error: string;
}

/** A run opened: what the briefing screen is handed. */
export interface OpenedRun {
  ok: true;
  runId: string;
  briefing: Briefing;
  plays: number;
  composed: boolean;
}

/** The word the help button hands over. */
export interface HelpWord {
  ok: true;
  lemma: string;
  gloss: string;
  lexemeId: string;
}

/** A finished run, as the debrief draws it. */
export interface FinishedScene {
  ok: true;
  runId: string;
  objectives: FinishedRun["objectives"];
  hurdles: FinishedRun["hurdles"];
  outcome: FinishedRun["outcome"];
  turns: FinishedRun["turns"];
  recap: FinishedRun["recap"];
  gaps: FinishedRun["gaps"];
  review: FinishedRun["review"];
  graded: number;
}

/**
 * Starts a conversation: draws it and writes it down.
 *
 * It books nothing. §16 said a scene should book **one call rather than one per
 * turn**, on the argument that running out of allowance halfway through a
 * conversation is the worst failure available here, and that half of it is
 * right and is not what a booking buys: the ledger writes a call down when it
 * authorizes one because two of its three limits count `CALL` rows, so a dozen
 * turns behind one booking is eleven calls the allowance never saw. The route
 * books each composed turn instead, and the mid-scene refusal is survivable for
 * the reason it was always survivable: the rung below the model is a real
 * conversational move rather than an error.
 *
 * **A refusal is never a refusal to run the scene.** A deployment with no key,
 * and a learner who has spent the day's allowance, both get a real conversation
 * built from the beats retrieval can fill, and the screen says so.
 *
 * The seed is the server's. A seed a learner picks is a learner picking their
 * persona, their card and their curveballs, which is every axis of §5 at once.
 */
export async function beginSceneFor(
  ownerId: string, sceneId: unknown, difficulty: unknown, level?: unknown,
): Promise<OpenedRun | Refused> {
  const scene = sceneById(text(sceneId).slice(0, 64));
  if (!scene) return { ok: false as const, reason: "not_found", error: "We couldn't find that conversation." };
  const chosen = text(difficulty);
  // `in` walks the prototype, so `constructor` and `toString` passed it and
  // reached a SceneRun.difficulty Int column as a function. Own keys only.
  if (!Object.hasOwn(BUDGETS, chosen)) return { ok: false as const, reason: "invalid", error: "Pick one of the difficulty levels." };
  /*
    THE BAND THE OTHER SIDE TALKS AT IS THE LEARNER'S, UNLESS THEY MOVED IT. A
    scene carries no level of its own: the selector on the briefing defaults
    to the learner's level and lets them go lower for plainer sentences or
    higher to be spoken to like anybody else. Checked against the closed list
    rather than trusted, since this is a public endpoint, and absent reads as
    the learner's own rather than as a band of ours.
  */
  const pitched = level === undefined ? await courseLevelFor(ownerId) : text(level);
  if (!(LEVELS as readonly string[]).includes(pitched)) return { ok: false as const, reason: "invalid", error: "Pick a level from the list." };

  const opened = await beginRun({
    ownerId,
    sceneId: scene.id,
    level: pitched,
    difficulty: chosen as Difficulty,
    /*
      WHETHER THIS CONVERSATION IS SPOKEN LIVE OR OUT OF THE BANK, DECIDED HERE
      AND ONCE (`LineMode`). A run whose lines came from whichever rung happened
      to be available on each turn is a character who changes voice mid-scene,
      and the likeliest cause of that is the ordinary one on a small budget: the
      day's allowance running out at turn six.

      Decided on whether a provider is configured at all, which is the one thing
      knowable here that does not change under a run in flight, and asked of
      `sceneProviders` rather than the whole chain because that is what the
      route will actually use: `/api/scene` asks the scene chain since the
      purpose split, so an Anthropic-only deployment would otherwise promise
      composition the route is never going to attempt. Everything that *can*
      change under a run, the allowance and a provider having a bad minute, is
      handled where it happens: the ladder falls to the bank, which is the same
      Estonian this run would have been speaking under the other mode.
    */
    lines: sceneProviders().length > 0 ? "composed" : "scripted",
  });
  if (!opened) return { ok: false as const, reason: "invalid", error: "We couldn't set up that conversation. Try again in a moment." };

  /*
    Only the briefing crosses, never the plan: the curveballs and the persona's
    leans are what is supposed to happen to somebody rather than be read off a
    card, and nothing here is bought by sending them, because the route marks
    every turn on the server anyway. `Briefing` is where that is written down.

    And nothing is booked here either. A run is many turns and the ledger books
    a call when it authorizes one, so one booking at the door would let a whole
    conversation through on the burst allowance for a single call, which is the
    limit's own arithmetic broken rather than bent. The route books each
    composed turn and hands the booking back where nothing was composed. What
    this reports is the only part that is a fact about the deployment rather
    than about the next minute: whether a provider is configured at all.
  */
  return {
    ok: true as const,
    runId: opened.runId,
    briefing: opened.briefing,
    // How many times they have had this one before, which is what opens the
    // hearing pool for the other side's lines.
    plays: opened.plays,
    /*
      Read off the run's own decision rather than asking the chain a second
      time, because two reads of one question is where the screen and the
      conversation start disagreeing about whether anybody is composing. The
      chain was asked once, above, and it was the scene chain.
    */
    composed: opened.lines === "composed",
  };
}

/**
 * Starts today's chat (docs/41-fifth-batch.md, VB-11).
 *
 * `beginScene`'s shape, with the three things a chat decides differently, and
 * every one of them decided here rather than taken from the caller. WHICH
 * EVENING: the one this learner finished today (`chatDay`), never a day id off
 * the wire, which could name an evening whose words nobody has met. WHETHER
 * AT ALL: only on a deployment whose scene chain has a model on it and with
 * `PAID_OFF=scenes` not set (`chatOffered`), since the bank cannot hold lines
 * for words nobody knew in advance, so a keyless deployment is refused here as
 * well as never shown the button. WHO: always the same persona for this
 * learner (`chatPersona`), so the neighbor who remembers you is one person.
 *
 * The band is the learner's, or the one they chose on the briefing, checked
 * against the closed list as `beginScene` checks it.
 */
export async function beginChatFor(ownerId: string, level?: unknown): Promise<OpenedRun | Refused> {
  if (!chatOffered()) return { ok: false as const, reason: "switched_off", error: "Today's chat needs a model, and this app has none set up." };
  if (!(await wouldAuthorise(ownerId, "SCENE"))) {
    return {
      ok: false as const,
      reason: "rate_limited",
      error: "That's all the help from Anu and the other AI features for today. They're back at midnight UTC, and your cards, the dictionary and everything else work as normal until then.",
    };
  }
  const pitched = level === undefined ? await courseLevelFor(ownerId) : text(level);
  if (!(LEVELS as readonly string[]).includes(pitched)) return { ok: false as const, reason: "invalid", error: "Pick a level from the list." };

  const evening = await chatDay(ownerId);
  const plan = evening ? await planChat(ownerId, evening.programme, evening.day) : null;
  if (!plan) return { ok: false as const, reason: "not_found", error: "There's no chat to have today. It comes after an evening with new words." };

  const opened = await beginRun({
    ownerId,
    sceneId: CHAT_ID,
    level: pitched,
    difficulty: "textbook",
    lines: "composed",
    chat: { plan, persona: chatPersona(ownerId) },
  });
  if (!opened) return { ok: false as const, reason: "invalid", error: "We couldn't set up that conversation. Try again in a moment." };
  return {
    ok: true as const,
    runId: opened.runId,
    briefing: opened.briefing,
    plays: opened.plays,
    composed: true,
  };
}

/**
 * One word the current beat is about, for the "I need a word" button.
 *
 * A LEARNER WHO ASKS IS NOT PENALIZED, and this is where that is paid for: the
 * scene's own beats declare what they are about as lemmas, so the help is a
 * word out of the closed list rather than anything a model wrote, and the whole
 * cost is that `advance` sees the next turn as helped. Nothing is deducted, no
 * objective is withheld, and the word goes on the debrief with a button to keep
 * it. Somebody who asks for four words and finishes has learned more than
 * somebody who gave up with none (`docs/21-situations.md` §12).
 *
 * The first version of this button recorded the *beat id* as the word needed,
 * so a debrief listed `reason` and `greet` under "words this conversation
 * needed" and offered no way to keep any of them, which is the one screen in
 * the feature whose whole job is turning a gap into a card.
 *
 * It reaches no provider and books nothing: it is the beat's own topic and one
 * indexed read. The English gloss is the dictionary's, which is the only
 * language this project may write.
 */
export async function sceneHelpFor(ownerId: string, runId: unknown, turns: unknown): Promise<HelpWord | Refused> {
  const id = text(runId).slice(0, 64);
  if (!id) return { ok: false as const, reason: "not_found", error: "That conversation has already ended." };

  const said = Array.isArray(turns)
    ? turns.slice(0, MAX_TURNS).map((one) => {
        const row = (one ?? {}) as Record<string, unknown>;
        const said = clip(text(row.said), MAX_TURN_CHARS);
        const spoken = spokenOf(row.spoken, said);
        return {
          beatId: text(row.beatId).slice(0, 64),
          said,
          helped: row.helped === true,
          ...(row.picked === true ? { picked: true } : {}),
          ...(spoken ? { spoken } : {}),
          heard: clip(text(row.heard), MAX_TURN_CHARS),
          conceded: concededOf(row.conceded),
          alsoDone: alsoDoneOf(row.alsoDone),
        };
      })
    : [];

  const beat = await beatNow({ ownerId, runId: id, turns: said });
  if (!beat) return { ok: false as const, reason: "not_found", error: "That conversation has already ended." };

  /*
    A word they have not already used, so pressing it twice on one beat is not
    the same word twice. Ordered, because two entries can share a lemma and the
    debrief offers exactly one to keep.
  */
  const typed = said.map((one) => one.said.toLowerCase()).join(" ");
  /*
    A beat of today's chat has no topic of its own: it is there for one of
    today's words, and that word is the one a stuck learner is handed.
  */
  const topic = beat.elicits ? [beat.elicits] : beat.topic;
  const fresh = topic.filter((lemma: string) => !typed.includes(lemma.toLowerCase()));
  const wanted = (fresh.length > 0 ? fresh : topic).slice(0, 12);
  if (wanted.length === 0) return { ok: false as const, reason: "not_found", error: "There's no word to hand you here." };

  /*
    Through `oneEntryPerLemma`, because a lemma can hold two entries and this
    hands one of them to a button that keeps it. `hall` is a noun meaning frost
    and an adjective meaning gray; a word confirmed off a photograph makes a
    pair for any lemma at all, with no forms behind it. `bySubstance` is the
    rule the dictionary itself leads with, so the entry the help offers and the
    entry a search would show are the same entry.
  */
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: wanted } },
    select: {
      id: true, lemma: true, translation: true, pos: true, provenance: true,
      forms: { select: { id: true } },
    },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  const entry = oneEntryPerLemma(rows, wanted)[0];
  if (!entry) return { ok: false as const, reason: "not_found", error: "There's no word to hand you here." };

  return {
    ok: true as const,
    lemma: entry.lemma,
    gloss: entry.translation,
    lexemeId: entry.id,
  };
}

/**
 * A finished conversation, marked by the server and written down.
 *
 * `recordSonad`'s shape over a whole scene, and the same rule behind it: the
 * client sends what it typed and the server rebuilds the run from its seed and
 * reads every turn again (ADR-022). A result anybody can type is not a
 * measurement, and here it would be worse than that, because a conversation
 * writes into the review log and a forged one would schedule words nobody said.
 *
 * Nothing in the transcript is true about the learner. The role card is fiction
 * (`docs/21-situations.md` §3), which is what makes a table of somebody's
 * practice sentences about a doctor's appointment safe to hold at all.
 */
export async function finishSceneFor(ownerId: string, input: {
  runId: unknown;
  turns: unknown;
  walkedOut: unknown;
  asked: unknown;
}): Promise<FinishedScene | Refused> {

  /*
    Off the wire, whatever the types say: every export of this file is a public
    endpoint and its arguments are JSON. What has to be stopped here is the size
    rather than the shape, since a turn that is not a string is read as an empty
    one and marked as nothing.
  */
  const runId = text(input.runId).slice(0, 64);
  if (!runId) return { ok: false as const, reason: "not_found", error: "We couldn't tell which conversation that was." };

  const turns = Array.isArray(input.turns)
    ? input.turns.slice(0, MAX_TURNS).map((turn) => {
        const row = (turn ?? {}) as Record<string, unknown>;
        const said = clip(text(row.said), MAX_TURN_CHARS);
        const spoken = spokenOf(row.spoken, said);
        return {
          beatId: text(row.beatId).slice(0, 64),
          said,
          helped: row.helped === true,
          ...(row.picked === true ? { picked: true } : {}),
          ...(spoken ? { spoken } : {}),
          heard: clip(text(row.heard), MAX_TURN_CHARS),
          conceded: concededOf(row.conceded),
          alsoDone: alsoDoneOf(row.alsoDone),
        };
      })
    : [];

  const asked = Array.isArray(input.asked)
    ? input.asked.slice(0, MAX_TURNS).map((one) => {
        const row = (one ?? {}) as Record<string, unknown>;
        return {
          lemma: text(row.lemma).slice(0, 64),
          lexemeId: typeof row.lexemeId === "string" ? row.lexemeId : null,
        };
      }).filter((one) => one.lemma)
    : [];

  const finished = await finishRun({
    ownerId, runId, turns, walkedOut: input.walkedOut === true, asked,
  });
  if (!finished) return { ok: false as const, reason: "not_found", error: "That conversation has already ended." };

  /*
    EVERY MODE GRADES THROUGH `gradeCard` (ADR-016), and a scene is no
    exception. What is conservative is which turns earn a row rather than where
    the row goes: `gradesFor` writes only where the retrieval was unambiguous,
    and where the beat asked for a case the row carries it, so the case somebody
    fails under pressure lands in the same weak-case charts as the case they
    fail on a card.
  */
  /*
    Every candidate card read once, and matched in `cardsForGrades`. This was a
    `findFirst` per grade inside the loop below, so a conversation that met ten
    requirements made ten round trips before its first write, on the screen
    that says how it went. Bounded by this learner's own cards for the words
    the run graded.
  */
  const lemmas = [...new Set(finished.grades.map((grade) => grade.lemma))];
  const candidates = lemmas.length === 0 ? [] : await prisma.card.findMany({
    where: { ownerId, lexeme: { lemma: { in: lemmas } }, cardType: { in: ["CASE_FORM", "PRODUCTION"] } },
    select: { id: true, cardType: true, targetCase: true, lexeme: { select: { lemma: true } } },
    orderBy: { id: "asc" },
  });
  const cardIds = cardsForGrades(finished.grades, candidates);

  let graded = 0;
  for (const [index, grade] of finished.grades.entries()) {
    const cardId = cardIds[index];
    if (!cardId) continue;
    /*
      The case that came back instead travels with the grade, so the pair
      somebody mixes up at a counter is counted beside the pair they mix up
      on a card. `writeGrade` checks both against the closed list rather than
      trusting them, which is what it does for every other caller.
    */
    /*
      Named by the run and the grade's place in it, so a finish arriving twice
      is graded once. `finishRun` closes a run once and a second finish gets
      nothing to grade; the id is the second lock on the same door.
    */
    /*
      A turn said aloud writes its row as spoken, so `npm run report:speech`
      counts a conversation's spoken recalls beside the cards'. A requirement
      met by a word the dictionary repaired never reaches here (D13).
    */
    const result = await gradeOnce(
      ownerId, cardId, grade.rating as RatingValue,
      stableReviewId("scene", ownerId, finished.runId, String(index)),
      {
        ...(grade.grammCase ? { practisedSlot: grade.grammCase } : {}),
        ...(grade.reachedCase ? { reachedSlot: grade.reachedCase } : {}),
        ...(grade.spoken ? { spoken: true } : {}),
      },
    );
    if (result.ok && !result.repeat) graded += 1;
  }

  return {
    ok: true as const,
    runId: finished.runId,
    objectives: finished.objectives,
    hurdles: finished.hurdles,
    outcome: finished.outcome,
    turns: finished.turns,
    recap: finished.recap,
    gaps: finished.gaps,
    review: finished.review,
    graded,
  };
}
