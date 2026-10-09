/**
 * THE CONVERSATION, REVIEWED: WHAT HAPPENED, WHAT WENT WELL, WHAT TO TRY NEXT.
 *
 * `reviewOf` is the teaching, a ranked list of the endings that came out
 * differently and why. This is the shape of the whole run around it, the
 * thing a learner reads first when the conversation ends: a headline in their
 * own terms, a few numbers worth being proud of, up to three highlights in
 * their own words, a note on every turn they took, and up to three concrete
 * things to try next time. The operator asked for it in those terms: exactly
 * what happened, what was good, and what could have been better.
 *
 * Three rules, and each is the module's own.
 *
 * IT LEADS ON WHAT WORKED. A run that got four things done and missed two is
 * described as four things done first, because a learner who closes this
 * screen feeling stupid does not open the next scene, and that is the one
 * outcome this module exists to prevent. The misses are still named, plainly,
 * as things to try rather than as failures.
 *
 * IT WRITES NO ESTONIAN. Every Estonian word on it is the learner's own, or a
 * form the dictionary supplied as a slip's recast (`Slip.form`). The English
 * is authored here, which is the one language this project writes, and it is
 * asserted free of Estonian letters like `lib/scenes/review.ts`.
 *
 * IT NEVER MARKS. Nothing here is a grade or a score: the counts are of things
 * that happened in the conversation, and the one claim about somebody's
 * Estonian this app makes is the mock examination's.
 */
import { curveballById } from "./curveballs";
import type { SceneState, TurnRecord } from "./state";
import type { SceneSpec } from "./types";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";

/** How a turn went, in the palette's own three words plus a neutral. */
export type MomentTone = "right" | "nearly" | "neutral";

/** One of the learner's turns, annotated. `at` is its index among their turns. */
export interface Moment {
  readonly at: number;
  readonly said: string;
  /** What they were answering, where it was kept. */
  readonly heard: string | null;
  /** The objective the turn was aimed at, in English. */
  readonly goal: string | null;
  readonly tone: MomentTone;
  /** A few words saying how it went, in English. */
  readonly label: string;
  /** The dictionary's form for a word that came out differently, beside the learner's own. */
  readonly fixes: readonly { readonly said: string; readonly form: string }[];
}

export interface Highlight {
  readonly title: string;
  /** The learner's own words, where the highlight is a thing they said. */
  readonly said?: string;
  readonly detail: string;
}

export interface NextTime {
  readonly title: string;
  readonly detail: string;
}

export interface SceneRecap {
  readonly headline: string;
  readonly stats: readonly { readonly label: string; readonly value: number }[];
  readonly highlights: readonly Highlight[];
  readonly moments: readonly Moment[];
  readonly nextTime: readonly NextTime[];
}

/** Whether a turn got something done, whole or in part. */
function landed(turn: TurnRecord): boolean {
  return turn.reading === "complete" || turn.met.some(Boolean);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
}

/** A turn, labeled in a line a learner reads without feeling marked. */
function momentOf(turn: TurnRecord, at: number, goalOf: (beatId: string) => string | null, locale: Locale): Moment {
  const fixes = (turn.slips ?? [])
    .filter((slip) => slip.kind !== "english" && slip.form && slip.form !== slip.said)
    .map((slip) => ({ said: slip.said, form: slip.form! }));
  const base = { at, said: turn.said, heard: turn.heard ?? null, goal: goalOf(turn.beatId), fixes };
  const english = (turn.slips ?? []).some((slip) => slip.kind === "english");
  if (turn.reading === "complete") {
    if (fixes.length > 0) return { ...base, tone: "nearly", label: tr(locale, "Understood, with an ending to polish") };
    if (english) return { ...base, tone: "right", label: tr(locale, "Understood, with a word in English") };
    if (turn.helped) return { ...base, tone: "right", label: tr(locale, "Done, with a word from the app") };
    if (turn.conceded && turn.conceded.length > 0) return { ...base, tone: "right", label: tr(locale, "Understood, in your own words") };
    if (turn.asked) return { ...base, tone: "right", label: tr(locale, "Answered, and you asked something back") };
    return { ...base, tone: "right", label: tr(locale, "Understood") };
  }
  if (turn.met.some(Boolean)) return { ...base, tone: "nearly", label: tr(locale, "Part of it landed") };
  switch (turn.reading) {
    case "declined": return { ...base, tone: "neutral", label: tr(locale, "You said no, so they tried again") };
    case "lost": return { ...base, tone: "neutral", label: tr(locale, "You said you were stuck, which is allowed") };
    case "english": return { ...base, tone: "neutral", label: tr(locale, "In English, so they helped you along") };
    case "unrecognised": return { ...base, tone: "neutral", label: tr(locale, "They could not quite catch this one") };
    case "fragment": return { ...base, tone: "neutral", label: tr(locale, "A word on its own, so they waited for more") };
    case "echo": return { ...base, tone: "neutral", label: tr(locale, "Their own words back") };
    default:
      return turn.asked
        ? { ...base, tone: "neutral", label: tr(locale, "You asked your own question") }
        : { ...base, tone: "neutral", label: tr(locale, "Understood, but it answered something else") };
  }
}

export function recapOf(scene: SceneSpec, state: SceneState, locale: Locale): SceneRecap {
  const goalOf = (beatId: string): string | null => {
    if (beatId.startsWith("hurdle:")) return curveballById(beatId.slice("hurdle:".length))?.out ?? null;
    return scene.beats.find((beat) => beat.id === beatId)?.goal ?? null;
  };
  const turns = state.turns;
  const moments = turns.map((turn, at) => momentOf(turn, at, goalOf, locale));
  const real = turns.filter((t) => t.reading !== "fragment" && t.reading !== "echo");
  const understood = real.filter(landed).length;

  const required = scene.beats.filter((beat) => beat.required);
  const met = required.filter((beat) => state.done.includes(beat.id));
  /*
    First time: a beat the learner met on the first turn they aimed at it.
    The one number here that is about fluency rather than persistence, and
    the one a learner most wants to see go up between two runs of a scene.
  */
  const firstAt = new Map<string, TurnRecord>();
  for (const turn of turns) if (!firstAt.has(turn.beatId)) firstAt.set(turn.beatId, turn);
  const firstTime = met.filter((beat) => firstAt.get(beat.id)?.reading === "complete").length;
  const questions = turns.filter((t) => Boolean(t.asked)).length;
  const handled = state.hurdles.filter((h) => h.met).length;

  const say = (line: string, values: Readonly<Record<string, string | number>> = {}) => fill(tr(locale, line), values);
  const headline = met.length === required.length && required.length > 0
    ? state.walkedOut ? say("You got everything done before you left.") : say("You got everything done.")
    : met.length === 0
      ? say("A first go at a hard conversation, and every go counts.")
      : say("You got {met} of the {total} things done.", { met: met.length, total: required.length });

  const stats = [
    { label: tr(locale, "Things done"), value: met.length },
    { label: tr(locale, "Turns understood"), value: understood },
    { label: tr(locale, "Right first time"), value: firstTime },
    questions > 0
      ? { label: tr(locale, "Questions you asked"), value: questions }
      : { label: tr(locale, "Surprises handled"), value: handled },
  ];

  /*
    UP TO THREE, IN THE LEARNER'S OWN WORDS WHERE THERE ARE ANY. A highlight
    that quotes what somebody actually said is a thing they recognise about
    themselves; one that says "well done" is a sticker.
  */
  const highlights: Highlight[] = [];
  const longest = [...turns]
    .filter((t) => t.reading === "complete" && wordCount(t.said) >= 4)
    .sort((a, b) => wordCount(b.said) - wordCount(a.said))[0];
  if (longest) {
    highlights.push({
      title: say("Your longest sentence"),
      said: longest.said,
      detail: say("{words}, and they understood every one of them.", { words: countOf(locale, wordCount(longest.said), "word") }),
    });
  }
  const dealtWith = state.hurdles.find((h) => h.met);
  if (dealtWith) {
    const spec = curveballById(dealtWith.id);
    if (spec) highlights.push({ title: say("You handled a surprise"), detail: `${say(spec.says)} ${say("You dealt with it and kept going.")}` });
  }
  const ownQuestion = turns.find((t) => t.asked && t.asked !== "?" && landed(t))
    ?? turns.find((t) => Boolean(t.asked));
  if (ownQuestion && highlights.length < 3) {
    highlights.push({
      title: say("You asked your own question"),
      said: ownQuestion.said,
      detail: say("Asking back is what turns an exchange into a conversation."),
    });
  }
  const chose = turns.find((t) => t.chose && t.chose.length > 0);
  if (chose && highlights.length < 3) {
    highlights.push({
      title: say("You made it your own"),
      said: chose.said,
      detail: say("You said something different from your card, and they went with it."),
    });
  }
  const polished = turns.find((t) => t.reading === "complete" && (t.slips ?? []).some((s) => s.kind !== "english"));
  if (polished && highlights.length < 3) {
    highlights.push({
      title: say("Understood even with an ending off"),
      said: polished.said,
      detail: say("They knew exactly what you meant. That is what a conversation needs first."),
    });
  }
  if (firstTime >= 2 && highlights.length < 3) {
    highlights.push({
      title: say("{count} answers landed first time", { count: firstTime }),
      detail: say("No second try needed."),
    });
  }

  /*
    UP TO THREE THINGS TO TRY, AND EACH ONE IS SOMETHING TO DO. "Watch your
    endings" is advice nobody can act on mid-sentence; "try asking them to say
    it again" is one.
  */
  const nextTime: NextTime[] = [];
  const missed = required.filter((beat) => !state.done.includes(beat.id));
  if (missed[0]) {
    nextTime.push({
      title: say("One thing left to get done"),
      detail: missed.length === 1
        ? `${say(missed[0].goal)} ${say("Try that one first next time.")}`
        : `${say(missed[0].goal)} ${say("It was the first of {count} things left, and the one to start with.", { count: missed.length })}`,
    });
  }
  const fixes = moments.flatMap((m) => m.fixes);
  if (fixes[0]) {
    nextTime.push({
      title: say("An ending to polish"),
      detail: say("You said “{said}” and they understood; the form they would use is “{form}”.", { said: fixes[0].said, form: fixes[0].form }),
    });
  }
  const notCaught = real.filter((t) => t.reading === "unrecognised").length;
  if (notCaught > 0 && nextTime.length < 3) {
    nextTime.push({
      title: say("Shorter lands more often"),
      detail: say("When they could not catch something, one idea in a short sentence usually gets through."),
    });
  }
  const inEnglish = real.filter((t) => t.reading === "english").length;
  if (inEnglish > 0 && nextTime.length < 3) {
    nextTime.push({
      title: say("Reach for the Estonian word first"),
      detail: say("When one is missing, “I need a word” hands you the one they are waiting for."),
    });
  }
  if (questions === 0 && nextTime.length < 3 && real.length >= 3) {
    nextTime.push({
      title: say("Ask them something back"),
      detail: say("One question of your own makes the other side talk more, which is more to learn from."),
    });
  }
  if (nextTime.length === 0) {
    nextTime.push({
      title: say("Try it one level harder"),
      detail: say("This one went smoothly. A harder difficulty brings a surprise or two."),
    });
  }

  /*
    One highlight a sentence: the longest sentence and the one that made the
    card its own are often the same turn, and quoting it twice reads as the
    screen having run out of things to say.
  */
  const quoted = new Set<string>();
  const distinct = highlights.filter((h) => {
    if (!h.said) return true;
    if (quoted.has(h.said)) return false;
    quoted.add(h.said);
    return true;
  });
  return { headline, stats, highlights: distinct.slice(0, 3), moments, nextTime: nextTime.slice(0, 3) };
}
