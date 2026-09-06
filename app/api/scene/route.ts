import { after } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { authoriseCall, recordUsage, releaseReservation, type Reservation } from "@/lib/usage/ledger";
import { bucketForOwner, checkRateLimit, rateLimited } from "@/lib/security/rateLimit";
import { reportError } from "@/lib/observability/report";
import { openWithFallback, sceneProviders, type ChatMessage } from "@/lib/tutor/provider";
import { MAX_TURNS, MAX_TURN_CHARS, knowing, readDraw, replay, sceneContext } from "@/lib/progress/scene";
import { sceneById } from "@/lib/scenes/catalogue";
import { isSpokenEstonian, sceneLine, type SpokenLine } from "@/lib/scenes/line";
import { cardInPlay, counterBeat, datumLine, replyFor, stageFor, wantsFreshLine } from "@/lib/scenes/reply";
import { dealtNumbers } from "@/lib/scenes/props";
import { COMPOSE_SYSTEM, composeLive } from "@/lib/scenes/prompt";
import { asideFor, asideOwed, shrug } from "@/lib/scenes/aside";
import { choiceOf } from "@/lib/scenes/choice";
import { answerBeatId } from "@/lib/scenes/scripted";
import { offerFor } from "@/lib/scenes/grades";
import { passes, runGate } from "@/lib/scenes/gate";
import { words } from "@/lib/scenes/lexicon";
import { currentBeat, hurdleBeat, hurdleSpec, isOver } from "@/lib/scenes/state";
import { personaById, type PersonaSpec } from "@/lib/scenes/personas";
import { DEFAULT_VOICE } from "@/lib/audio/voice";
import { glossSentences } from "@/lib/dict/glossed";

/**
 * One line of one turn, walked up the ladder.
 *
 * `sceneLine` decides which rung answers and `lib/scenes/gate.ts` decides
 * whether a composed line is shown at all. This route is the part of that which
 * needs a socket; everything else it hands over is data the pure modules asked
 * for.
 *
 * WHAT THE MODEL IS ASKED FOR, AND WHAT IT IS NOT (§6). One line, for one move,
 * inside a closed word list. It never sees the plot, never decides what happens
 * next, never marks anything, and never sees the learner's deck beyond the words
 * lent to the list. Its only output is one line, which is then checked for
 * shape, vouched word by word against that list, checked for register and
 * checked for government. A line that tries to be anything other than a short
 * Estonian sentence fails the shape check; a line reaching outside the list
 * fails vouching; and either way what the learner gets is the fallback, which
 * is somebody asking them to repeat. The worst available outcome is a wasted
 * call and a withheld line.
 *
 * THE LEARNER'S TEXT REACHES A MODEL, SO IT IS DATA (§17). The last two turns
 * go in as conversation, the way the tutor's do, and are never concatenated
 * into an instruction.
 *
 * ONE BOOKING PER COMPOSED TURN (§16), and the first version of this booked one
 * for the whole run instead. The argument for that was real, that running out
 * of allowance halfway through a conversation is the worst failure available
 * here, and it does not survive the arithmetic: the ledger books a call when it
 * authorizes one because two of the three limits count `CALL` rows, so a dozen
 * turns behind one booking is eleven calls the allowance never saw, on the
 * dearest path in the app. What is left of the argument is that the allowance
 * running out mid-scene has to be *survivable*, and it is, because the rung
 * below the model is a real conversational move rather than an error: the
 * other side did not catch that, say it again.
 *
 * The ledger is asked only once the attested rung has failed, because a line
 * the dictionary already had costs nothing and booking for it would ration a
 * learner over a request nobody made. And a booking is handed back where
 * nothing was composed.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A bound on a body rather than on a scene. */
const MAX_CONTEXT_CHARS = 600;
/**
 * How many exchanges of the run the composer is shown.
 *
 * Enough that a line can answer something said several turns ago, which is the
 * whole reason the conversation is passed at all, and bounded because the free
 * models this runs on have small windows and a request refused for length is a
 * turn with no line in it. Six is about half a scene.
 */
const MAX_CONTEXT_TURNS = 6;
/** Per instance, and not the thing that bounds cost: the ledger is (§16). */
const PER_MINUTE = 30;
const NO_STORE = { "cache-control": "no-store" };

export async function POST(request: Request) {
  const ownerId = await requireUserId();

  /*
    CHARGED TO THE LEARNER, NEVER TO THEIR ADDRESS. Twenty-five students on one
    school network are one IP, and a class starting the same scene together is
    exactly the shape that would refuse in its first few seconds. There is
    always an owner here, because `requireUserId` threw if there was not.
  */
  const limit = checkRateLimit(`scene:${bucketForOwner(ownerId)}`, PER_MINUTE, 60_000);
  if (!limit.ok) {
    return rateLimited(limit, "That was a lot of turns at once. Give it a moment.");
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const runId = String(body.runId ?? "").slice(0, 64);

  /*
    THE RUN IS READ, NOT REBUILT, AND NOT SENT. Which scene this is, who is
    behind the desk and what is on the card were all decided once when the run
    was opened and written down (`beginRun`), because a run is a function of its
    seed *and its recency* and recency moves. Re-planning here would deal a
    different persona from the one the learner is talking to.
  */
  const row = runId
    ? await prisma.sceneRun.findFirst({
        where: { id: runId, ownerId, endedAt: null },
        select: { sceneId: true, transcript: true },
      })
    : null;
  const scene = row ? sceneById(row.sceneId) : null;
  if (!scene) {
    return Response.json({ error: "That is not a turn in a scene." }, { status: 400 });
  }

  const context = await sceneContext(scene.id);
  if (!context) {
    return Response.json({ error: "That scene could not be built." }, { status: 400 });
  }

  const persona = personaOf(row!.transcript);
  const voice = persona?.voice ?? DEFAULT_VOICE;

  /*
    MARKED HERE, BY THE SAME FUNCTION THAT MARKS IT AT THE END.

    The client sends everything it has typed so far and the server replays the
    lot, which costs nothing at a dozen turns and buys the property that
    matters: the reading a learner sees while they are talking and the reading
    written down when they stop come from one function over one input. The route
    therefore holds no state, and a client that lies about its own turns changes
    only what it shows itself, because `finishRun` runs this again.
  */
  const turns = Array.isArray(body.turns)
    ? body.turns.slice(0, MAX_TURNS).map((turn) => {
        const one = (turn ?? {}) as Record<string, unknown>;
        return {
          beatId: String(one.beatId ?? "").slice(0, 64),
          said: String(one.said ?? "").slice(0, MAX_TURN_CHARS),
          helped: one.helped === true,
          heard: String(one.heard ?? "").slice(0, MAX_TURN_CHARS),
        };
      })
    : [];

  const draw = readDraw(row!.transcript);
  /*
    WHETHER THE LEARNER WAS UNDERSTOOD IS A WIDER QUESTION THAN WHAT THIS
    SCENE MAY SAY. The scene's list is its declared units and the marker was
    widened once to the course, so a real Estonian word from anywhere else
    read as noise and the other side said `Ma ei saa aru` to somebody who had
    written perfectly good Estonian. `knowing` asks the forms list about the
    spellings in this run, which is the accept side of ADR-005 and the reason
    that file exists.
  */
  const marking = await knowing(context, turns.map((t) => t.said));
  const { state, response } = replay(marking, draw, turns);
  const current = currentBeat(scene, state);
  /*
    A curveball in the way is what the other side says next and what the
    learner is asked for, and the beat waits behind it (`raiseHurdle`).
  */
  const standing = state.hurdle ? hurdleBeat(state.hurdle) : null;
  /*
    The offer was turned down and they offer again: the beat is spoken as
    its counter, and from here on every line reads the second offer's values
    off the card, so a time read back later is the one that was accepted.
  */
  const speaking = response === "counter" && current?.counter ? counterBeat(current) : current;
  const card = cardInPlay(draw?.card ?? null, scene.beats, state.countered);
  const last = state.turns[state.turns.length - 1] ?? null;
  const answered = last ? scene.beats.find((b) => b.id === last.beatId) ?? null : null;
  const heard = last?.heard ?? null;

  const used = new Set(
    Array.isArray(body.used) ? body.used.filter((v): v is string => typeof v === "string") : [],
  );

  /*
    A QUESTION THE SCENE DID NOT ANTICIPATE GETS AN ANSWER BEFORE THE MOVE.
    `readTurn` wrote down that one was asked and with which word; `asideFor`
    answers it from what the other side knows, a fact off the card or more of
    what they just said, and where it cannot, a model is asked for one line
    inside the list below, and failing that the other side says they do not
    know, which is what a person says. Never on a turn nobody understood,
    since then the repair phrase is the whole reaction.
  */
  /*
    A QUESTION IS ANSWERED WHERE THE TURN LANDED, AND NOT WHERE IT MISSED.

    §36 put an answer in front of the move for a learner who said their piece
    and asked something extra, which is what `okei, otse, ja kuhu siis?` is.
    It read every question the same way, so a learner who missed the beat and
    asked something got `Ei tea.` and then the question again: "do you speak
    English?" answered with "I don't know", and "sorry, what?" answered the
    same way. Neither is a person. When the floor is still theirs and the
    learner has not answered yet, the human move is to ask again, which is
    what `narrow` already does.
  */
  const askedNow = last?.asked ?? null;
  const wantsAside = Boolean(askedNow) && (response === "answer" || response === "counter");
  const fresh = (id: string | undefined) =>
    (id ? context.scripted.get(id) ?? [] : []).filter((text) => !used.has(text));
  const asking = {
    asked: askedNow,
    spoken: words(last?.said ?? ""),
    answered,
    card,
    lexicon: context.lexicon,
    more: fresh(answered?.id),
    answers: answered ? fresh(answerBeatId(answered)) : [],
  };
  let aside = wantsAside ? asideFor(asking) : null;
  /* Whether the model, if any, is asked for the aside rather than for the move. */
  const asideWantsModel = wantsAside && aside === null && asideOwed(asking);

  /*
    WHERE THE CONVERSATION IS, AND EVERY BRANCH RETURNS IT. Three of the four
    used to return the line alone, so the screen was handed something to read
    and never told which beat it was on: `beatId` stayed null, the objectives
    never ticked, and "Say it" was disabled for the whole run. The line is what
    the reader sees and this is what the screen runs on, and a branch that
    answers one without the other has not answered.
  */
  /*
    How fast they talk: the persona's own pace, and a fifth faster once the
    "they speed up" curveball has happened in this run, because a line said
    after that at the old pace is the curveball not having happened.
  */
  const speed = (persona?.speed ?? 1) * (state.hurdles.some((h) => h.id === "faster") ? 1.2 : 1);
  const progress = {
    voice,
    speed,
    response,
    beatId: current?.id ?? null,
    goal: standing?.goal ?? current?.goal ?? null,
    done: state.done,
    over: isOver(scene, state),
    /*
      What the last turn was read as, so the screen can answer in character
      rather than with a verdict. Five readings, not two (§8).
    */
    reading: state.turns[state.turns.length - 1]?.reading ?? null,
    /*
      What the last turn was understood despite, so the screen can say under
      the learner's own bubble that they were understood and how the word is
      said. Empty on a turn that was right.
    */
    slips: last?.slips ?? [],
  };

  /*
    THE REPLY IS A REACTION AND THEN A MOVE (`lib/scenes/reply.ts`), and this
    route's job is to hand `replyFor` the one thing it cannot work out for
    itself: what Estonian the ladder could build for the next move. It walks
    the ladder only where a fresh line is wanted at all. A turn nobody
    understood is answered with the line the learner already heard, said
    again, so a booking for a fresh one would be a booking for a line that is
    not wanted (§16).
  */
  const reply = (line: SpokenLine | null) => replyFor({
    beat: speaking,
    hurdle: standing
      ? { beat: standing, line: standing === spokenFor ? line : null, said: hurdleSpec(state)?.said }
      : null,
    answered: turns.length > 0 ? answered : null,
    response: turns.length > 0 ? response : null,
    reading: progress.reading,
    line,
    heard,
    said: last?.said ?? null,
    card,
    translates: persona?.translates ?? false,
    askedForEnglish: last?.wantsEnglish === true,
    acknowledges: persona?.acknowledges ?? true,
    echo: last?.matched?.[0] ?? null,
    /*
      The word the other side repeats is the learner's own, or, where it was
      understood with a slip, the dictionary's form of it (`Slip.form`), which
      `readTurn` already put first in `matched`. The flag is what labels it.
    */
    recast: Boolean(last?.slips?.some((slip) => slip.form && slip.form === last?.matched?.[0])),
    /*
      And where they reached for the word in English, the Estonian is said back
      as the word they were reaching for rather than as their own word put
      right, because it was not their word.
    */
    english: Boolean(last?.slips?.some((slip) => slip.kind === "english")),
    aside,
    /*
      The word to hand over where the turn said they were not following. The
      beat they were answering, not the one coming next: they are stuck on
      the question they were asked.
    */
    offer: (response === "help" || response === "moveOn") && answered
      ? offerFor(answered, card, context.marker.questionWords)
      : null,
    met: state.done.length,
    /*
      Whether this is the learner's first sight of the beat now being spoken,
      which is what the break in time is printed on: a scene that walks
      somebody to a shop has to say so before it asks where they are.
    */
    arriving: speaking ? !state.turns.some((turn) => turn.beatId === speaking.id) : false,
    /*
      How long they have been on this beat, so the app knows when to step out
      of character and say what is wanted (`lib/scenes/coach.ts`). Turns that
      cost no patience are still turns the learner took, so they are counted:
      somebody who has answered three times and got nowhere is stuck whether
      or not the machine spent a try on it.
    */
    tries: answered ? state.turns.filter((turn) => turn.beatId === answered.id).length : 0,
    /*
      The beat's other banked lines, so a question that has already been put
      twice and narrowed once can be put a different way rather than a fourth
      identical time (`replyFor`). `fresh` is the same filter the aside uses:
      the bank's rows for the beat, minus whatever this run has already said,
      so nothing repeats and no line is composed for it.
    */
    others: fresh(speaking?.id),
    /*
      And the same question narrowed to two, where the beat's own words or the
      card's own values can supply a pair. Built off the beat the learner was
      answering rather than the one coming next: they are stuck on the question
      they were asked. The roll is the turn count, which is stable across a
      replay, so a choice does not swap sides under somebody reading it.
    */
    choice: answered && !isOver(scene, state)
      ? choiceOf({
          beat: answered, card, lexicon: context.lexicon,
          dealt: new Map(
            scene.props.flatMap((prop) =>
              prop.kind === "word" || prop.kind === "weekday" ? [[prop.slot, prop.oneOf] as const] : [],
            ),
          ),
          roll: state.turns.length,
        })
      : null,
  });
  /*
    THE OTHER SIDE'S LINE, WITH THE DICTIONARY UNDER IT.

    `lib/dict/glossed.ts` argues that an attested sentence a beginner can read
    one word of is the sentence doing the opposite of its job, and it was
    built for the first meeting of a word. The screen that needed it most had
    none: a receptionist says a sentence and the learner either knows it or
    is stuck, in the one place in the app where being stuck is the point of
    the exercise. So every Estonian line the other side says is glossed the
    same way, by the same module, at the same standard: `matchEstonianForm`
    decides at the confidence a photographed page has to clear (ADR-021), a
    word it will not vouch for is printed plain, and what opens is the
    dictionary's own headword rather than a reading of this sentence.

    It cannot hand over the answer, and that is a property rather than a
    hope: `bank.test.ts` and the drafter both refuse a line containing the
    form the beat is about to ask for, so what is glossed is the question.

    One query per turn, bounded by `WORD_BUDGET`, on a route that already
    reads the run and may call a model.
  */
  const glossedLines = async (lines: readonly SpokenLine[]) => {
    /*
      Only lines somebody said in Estonian are glossed, off the one definition
      of which those are: a hint from the app and a break in time are English
      and would come back as a row of dictionary misses under a sentence
      nobody spoke.
    */
    const spoken = lines.filter((l) => isSpokenEstonian(l.provenance));
    if (spoken.length === 0) return lines;
    const tokens = await glossSentences(spoken.map((l) => ({ et: l.text, form: null })));
    const byText = new Map(spoken.map((l, i) => [l.text, tokens[i]]));
    return lines.map((l) => {
      const found = byText.get(l.text);
      return found ? { ...l, tokens: found } : l;
    });
  };
  const answer = async (lines: readonly SpokenLine[], extra: Record<string, unknown> = {}) =>
    Response.json({ ...progress, lines: await glossedLines(lines), ...extra }, { headers: NO_STORE });

  /*
    Which beat the ladder is asked for: the hurdle where one stands, and once
    the scene is over, the farewell, since somebody who said goodbye first is
    still owed one back.
  */
  const spokenFor = standing ?? speaking ?? (answered?.move === "close" ? answered : undefined);
  /*
    A beat the other side opens with nothing: they said their piece and are
    waiting, so no line is built and the screen prints what they are doing.
  */
  if (!spokenFor || (spokenFor.awaits && !standing)) {
    if (asideWantsModel) aside = shrug(context.lexicon);
    return answer(reply(null));
  }
  if (!wantsFreshLine(turns.length > 0 ? response : null, heard, progress.reading)) {
    if (asideWantsModel) aside = shrug(context.lexicon);
    return answer(reply(null));
  }
  const beat = spokenFor;

  /*
    THE CONVERSATION SO FAR, BOTH SIDES, RATHER THAN THE LEARNER'S LAST TWO
    LINES.

    What went before was `body.said`: the last two things the learner typed, as
    two `user` messages with nothing between them. A model reading that is
    reading half a conversation with the halves it did not write missing, so it
    could answer the beat and could not answer the person. Somebody who said at
    turn two that they were in a hurry and is asked at turn six whether the
    afternoon suits them has been talked at rather than talked to, and that is
    most of what "it does not answer me like a human" was about.

    So it is the run's own turns, alternating, off `state.turns`, which holds
    both `said` and the `heard` it was answering. Same trust level as the field
    it replaces, since both come from the client's transcript and are re-read by
    `readTurn` on the server before any of this; what is different is that it is
    complete. Never interpolated into an instruction (§17): the exchange goes in
    as messages, so a learner can type anything into it and the blast radius is
    one withheld line.

    Capped at `MAX_CONTEXT_TURNS` exchanges. A conversation is a dozen turns and
    the free models this runs on have small windows, so the cap is what stops a
    long run quietly turning into a request that is refused for length at
    exactly the point the conversation has become worth reading.
  */
  const conversation: ChatMessage[] = state.turns
    .slice(-MAX_CONTEXT_TURNS)
    .flatMap((turn) => [
      ...(turn.heard ? [{ role: "assistant" as const, content: turn.heard.slice(0, MAX_CONTEXT_CHARS) }] : []),
      { role: "user" as const, content: turn.said.slice(0, MAX_CONTEXT_CHARS) },
    ]);

  /*
    WHAT THE LEARNER APPEARS TO HAVE SAID, IN ENGLISH, MADE BY THE DICTIONARY.

    A beginner's Estonian is short, endingless and often a word off, and the
    model composing the other side's next line reads it raw. Handing it a
    word-by-word reading is the cheapest way to make that line about what they
    actually said rather than about what the beat expected, and it is the thing
    a bilingual listener does without noticing: hear it, understand it, answer
    in Estonian.

    `lib/dict/glossed.ts` makes it, which means the DICTIONARY makes it: every
    gloss here is the entry's own, vouched at the confidence a photographed
    page has to clear (ADR-021), and a word it will not vouch for is simply
    absent. No second model reads the learner's turn, nothing here can advance
    the scene, and the reply the model writes is still checked four ways by the
    gate before anybody sees it. It is context for one line, not a verdict:
    `advance` still takes `Evidence` and `readTurn` is still its only producer.

    Only on a turn that is going to book a call anyway, so the ordinary turn
    pays nothing for it.
  */
  const readingOf = async (text: string): Promise<string> => {
    const [tokens] = await glossSentences([{ et: text, form: null }]);
    const seen = (tokens ?? [])
      .filter((token) => token.word && token.entry)
      .map((token) => `${token.text}: ${token.entry!.gloss.split(/[,;]/)[0]!.trim()}`);
    return seen.join("; ");
  };

  const shared = {
    beat,
    lexicon: context.lexicon,
    /*
      The gate, plus the numbers this run was dealt. Per run rather than per
      scene, which is why it is joined here rather than in `sceneContext`: the
      card is drawn when the run opens and the scene knows nothing about it.
    */
    gate: { ...context.gate, dealt: dealtNumbers(card) },
    topic: context.topic.get(beat.id) ?? new Set<string>(),
    hasFiniteVerb: context.hasFiniteVerb,
    fallback: context.fallback,
    scripted: context.scripted.get(beat.id) ?? [],
    used,
  };

  /*
    WHAT THIS TURN SAYS IF THE MODEL CANNOT, WORKED OUT BEFORE THE MODEL IS
    ASKED.

    Three rungs, none of which costs a request: a phrase the course teaches,
    then a line drafted in advance and gated then (ADR-025 amendment 1), then a
    line the beat can say out of course words and this run's own dealt values
    (`Teisipäeval kell 13:30?`). This is the whole of what a keyless deployment
    ever says, unchanged, and it is now also the safety net under composition
    rather than the thing composition was a fallback for: the model is asked on
    every beat, and whatever it cannot answer is answered from here.

    Worked out first rather than after the call fails, because the failure
    cases include the ledger refusing and the provider timing out, and a net
    assembled at that point is a net assembled while somebody is waiting.
  */
  const cheap = await sceneLine({ ...shared, pool: context.pool.get(beat.id) ?? [] });
  const dealt = cheap.provenance === "fallback" ? datumLine(beat, card, context.lexicon) : null;
  const move = cheap.provenance !== "fallback" ? cheap : dealt ?? cheap;

  /*
    THE TURN'S ONE BOOKING GOES TO THE QUESTION WHERE THERE IS ONE. A learner
    who asked something is owed an answer more than a fresh phrasing of the
    next move, which the bank usually has anyway. The model is asked for one
    line answering what they asked, inside the list, and the gate reads it as
    a `confirm` (a question or a statement, either); what it withholds, the
    other side answers with "ei tea", which is at least true.
  */
  if (asideWantsModel) {
    /*
      Asked whether anything could answer before booking, then rebuilt once the
      ledger has said whether the last resort is still affordable today. Two
      reads of a pure function rather than one, because the first has to include
      the fallback (a deployment with only an Anthropic key can still compose)
      and the second has to reflect what the budget allows.
    */
    const configured = sceneProviders().length > 0;
    const decision = configured ? await authoriseCall(ownerId, "SCENE") : null;
    if (!decision?.allowed || !decision.reservation) {
      aside = shrug(context.lexicon);
      return answer(reply(move), { composed: false, note: decision?.message ?? null });
    }
    const chain = sceneProviders({ allowFallback: decision.fallbackAllowed });
    const asking: typeof beat = { ...beat, id: `aside:${beat.id}`, move: "confirm", topic: [] };
    const drafted = await compose(chain, {
      ownerId,
      reading: last?.said ? await readingOf(last.said) : "",
      // The booking this turn already made, so the settlement is a settlement
      // rather than a second `CALL` at the full estimate. Required rather than
      // optional for exactly this: a call site that has not thought about it
      // does not compile, and this one arrived on a merge.
      /*
        Who they are and where this is happening (`ComposeAsk`). Every line of
        it is on the learner's own briefing screen: a character told none of it
        is answering a beat rather than playing a part.
      */
      scene: scene.title,
      place: scene.place,
      persona: persona?.who ?? "",
      situation: scene.role,
      reservation: decision.reservation,
      move: "answer",
      they: "They were just asked a question they did not expect. They answer it briefly, as best they can from what they know, and no more.",
      register: scene.register,
      words: [...context.lexicon.byLemma.keys()],
      examples: [...context.scripted.values()].flatMap((lines) => lines.slice(0, 1)).slice(0, 6),
      conversation,
      avoid: [],
    });
    const verdict = drafted ? runGate(drafted, asking, { ...context.gate, dealt: dealtNumbers(card) }) : null;
    if (drafted && verdict && passes(verdict)) {
      aside = { text: drafted, provenance: "composed" };
    } else {
      after(() => releaseReservation(decision.reservation!));
      aside = shrug(context.lexicon);
    }
    return answer(reply(move));
  }

  /*
    A COURTESY IS THE LINE, AND A MODEL ONLY PARAPHRASES IT INTO SOMETHING
    NOBODY SAYS.

    The attested rung is reachable only where the beat's pool holds a phrase
    entry, which after §32 narrowed it is `Tere!`, `Aitäh!`, `Head aega!` and
    their neighbours: a lexicographer recorded them, they are the whole line,
    and there is nothing about the conversation for a drafted greeting to be
    better about. Everywhere a beat has content to carry, which is every beat
    that makes a scene this scene, the model is asked. See `sceneLine` for the
    rest of the argument.
  */
  if (cheap.provenance === "attested") return answer(reply(cheap));

  /*
    THE BOOKING IS PER TURN, because a call is what the ledger counts. Booking
    once when the run opened was the first version of this and it is the burst
    limiter's own arithmetic broken: a conversation is a dozen turns, and one
    `CALL` row in front of twelve settlements is eleven calls the allowance
    never saw.
  */
  const decision = sceneProviders().length > 0
    ? await authoriseCall(ownerId, "SCENE")
    : null;

  if (!decision?.allowed || !decision.reservation) {
    /*
      A keyless deployment and a spent allowance take the same path, and that is
      the design rather than a shortcut: §16 says a deployment with no key runs
      this module, marked identically, with the beats retrieval can fill. The
      difference between them is a sentence, and it is the ledger's own, since
      only the ledger knows which of the three limits was reached.

      `move` rather than `cheap`, which is the fix that came with putting the
      model first: `cheap` is the bank alone and `move` is the bank or the line
      the beat says off the card, so a spent allowance on a beat that names a
      time used to be answered with the repair phrase where a perfectly good
      line was sitting one variable away.
    */
    return answer(reply(move), { composed: false, note: decision?.message ?? null });
  }
  /*
    Held as a const so the narrowing the guard above just did survives into the
    closures below: the settlement is written inside `compose`'s callback and
    the release inside an `after`, and a property read in either place is
    `Reservation | undefined` again to the compiler. The release used a `!` for
    that reason and no longer needs one.
  */
  const reservation = decision.reservation;
  /*
    Anthropic behind Groq only while the day's fallback budget has room. Past
    it the chain is Groq alone, and a Groq that is not answering means the
    ladder falls to its next rung, which is where a keyless deployment lives
    and is a conversation rather than an error.
  */
  const chain = sceneProviders({ allowFallback: decision.fallbackAllowed });

  const learnerReading = last?.said ? await readingOf(last.said) : "";
  const line = await sceneLine({
    ...shared,
    // The attested and scripted rungs were already tried and did not answer.
    pool: [],
    scripted: [],
    compose: (avoid) => compose(chain, {
      ownerId,
      reading: learnerReading,
      // The booking this turn was authorised under, so the settlement corrects
      // it rather than being written down as a second call. See `compose`.
      /*
        Who they are and where this is happening (`ComposeAsk`). Every line of
        it is on the learner's own briefing screen: a character told none of it
        is answering a beat rather than playing a part.
      */
      scene: scene.title,
      place: scene.place,
      persona: persona?.who ?? "",
      situation: scene.role,
      reservation,
      move: beat.move,
      they: stageFor(beat, card),
      register: scene.register,
      words: [...context.lexicon.byLemma.keys()],
      /*
        The scene's own banked lines, for tone: a model shown six sentences
        this receptionist has said writes a seventh in the same register and
        length, where one shown a word list alone writes a paragraph. They are
        examples of the voice and never of the answer, since none is for this
        beat.
      */
      examples: [...context.scripted.entries()]
        .filter(([id]) => id !== beat.id)
        .flatMap(([, lines]) => lines.slice(0, 1))
        .slice(0, 6),
      conversation,
      avoid,
    }),
  });

  /*
    A booking is handed back where nothing was composed, which is the rule
    `releaseReservation` states about itself: a release gives back the call and
    not only the money, and two of the three limits count calls. The ladder
    walking past the model to the fallback rung is exactly the case, and it is
    an ordinary one here rather than an error.
  */
  if (line.provenance !== "composed") {
    after(() => releaseReservation(reservation));
    /*
      AND THE NET CATCHES IT. The model was asked, and it did not answer or the
      gate withheld what it wrote; the run says the line it would have said with
      no key at all rather than the repair phrase. `line.withheld` is kept where
      the net has nothing either, because that is the one case where the screen
      has something to explain.
    */
    if (move.provenance !== "fallback") return answer(reply(move), { composed: false });
    return answer(reply(line), { composed: false });
  }

  return answer(reply(line), { composed: true });
}

/** Who is behind the desk, off the run's own row rather than out of a request. */
function personaOf(transcript: string): PersonaSpec | undefined {
  try {
    const parsed = JSON.parse(transcript) as { persona?: unknown };
    return typeof parsed.persona === "string" ? personaById(parsed.persona) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Asks a model for one line, inside the list.
 *
 * The static half of the prompt is identical on every turn of every scene, so
 * on Anthropic it sits behind the `cache_control` breakpoint the tutor already
 * uses, and on an OpenAI-compatible provider it is the cached prefix. What
 * changes per turn goes in the `live` block after it, which is the same shape
 * `learnerNote` takes.
 */
async function compose(
  chain: ReturnType<typeof sceneProviders>,
  input: {
    ownerId: string;
    /**
     * What `authoriseCall` booked for this turn. Required, because the
     * settlement below is what corrects it, and it was not passed: `recordUsage`
     * reads this field to decide whether a row is a `SETTLEMENT` or a `CALL`,
     * so every composed turn wrote a second `CALL` at the full cost beside the
     * reserve, and nothing ever settled the reserve. Both counting limits count
     * `CALL` rows, so a scene spent the burst and daily SCENE allowances at
     * twice the rate it should, and the deployment budget saw reserve plus
     * actual rather than the difference. Required rather than optional so a
     * caller that has not thought about it does not compile.
     */
    reservation: Reservation;
    /** The scene, the place, the character and why the learner is here (`ComposeAsk`). */
    scene: string;
    place: string;
    persona: string;
    situation: string;
    move: string;
    /** What they are doing, in English, from their side: the beat's `they`. */
    they: string;
    /**
     * What the learner's last turn appears to say, word by word, from the
     * dictionary. Empty where there is no turn yet or the dictionary could
     * vouch for none of it, and then the model reads the Estonian alone,
     * which is what it did before.
     */
    reading: string;
    register: string;
    words: readonly string[];
    /** Lines this character has said on other beats, for tone. Never for this beat. */
    examples: readonly string[];
    /** The run so far, both sides, alternating. Empty on the opening line. */
    conversation: readonly ChatMessage[];
    avoid: readonly string[];
  },
): Promise<string | null> {
  /*
    The prompt is `lib/scenes/prompt.ts`, one definition, because
    `npm run play:scenes` composes with it too and a harness carrying its own
    copy measures a conversation this app does not have.
  */
  const system = COMPOSE_SYSTEM;
  const live = composeLive(input);

  try {
    const open = await openWithFallback(
      chain,
      system,
      /*
        The turns as conversation, never interpolated into an instruction (§17).
        A learner can type anything into these and the blast radius is one
        withheld line: the model cannot call anything, cannot see the deck,
        cannot mark, and cannot advance the scene.
      */
      [
        ...input.conversation,
        { role: "user" as const, content: "Your line:" },
      ],
      (usage, config) => {
        /*
          The settlement, charged to the provider that actually answered.
          `after` because the deployment target suspends a function once its
          response is sent and does not guarantee a pending promise runs, and a
          settlement that never lands leaves the scene's reservation standing.
        */
        after(() => recordUsage({
          ownerId: input.ownerId,
          kind: "SCENE",
          provider: config.name,
          model: config.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          reservation: input.reservation,
        }));
      },
      live,
    );

    let text = "";
    for await (const chunk of open.chunks) text += chunk;
    return text.trim() || null;
  } catch (error) {
    /*
      A provider having a bad minute is an ordinary case here rather than an
      error a learner should see: the ladder's next rung is somebody who did not
      catch what they said, which is the truest thing that can happen in a
      conversation.
    */
    reportError(error, { at: "api/scene", ownerId: input.ownerId });
    return null;
  }
}
