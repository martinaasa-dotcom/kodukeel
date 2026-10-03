/**
 * WHAT THE OTHER SIDE SAYS BACK, WORKED OUT ONCE FOR THE ROUTE AND FOR EVERY
 * HARNESS THAT MEASURES IT.
 *
 * A turn is marked by `replay` and answered by `replyFor`, and between the two
 * sits the assembly: which beat the reply is for, the card as it stands now,
 * whether a question is answered off the card or with a shrug, which lines the
 * bank may still say, whether a line is built at all, and what a model is
 * handed when one is asked. That assembly lived in `app/api/scene/route.ts`
 * and was copied into `scripts/lib/keylessPlay.ts`, `scripts/play-scene.ts`
 * and `scripts/fuzz-scenes.ts`, and the copies had drifted from the route in
 * a dozen places: the sweep shrugged at a scene that was over, the fuzzer
 * never passed `answeredTimes`, the keyless harness built a line on a turn the
 * route answers by saying the last line again. Each drift was a harness
 * reporting a conversation the app does not have, which is the one thing a
 * harness may not do (§53).
 *
 * So it lives here, and the route's own reading of every rule is the one
 * kept. `planTurn` is everything a turn's reply is planned from, `speakTurn`
 * walks the keyless rungs and hands the model, where there is one, to the
 * caller, and `composeTurn` is what the model is asked, both the answer before
 * a break in time and the move. The caller supplies only what needs a socket
 * or a ledger: the route books the call and posts it, a harness posts it to
 * the links it was given.
 *
 * No database read happens here. The module is in `lib/progress/` because it
 * reads `clockInPlay` and `moneyInPlay` beside `SceneContext`.
 */
import { clip } from "@/lib/copy/clip";
import { clockInPlay, moneyInPlay, type SceneContext, type StoredDraw } from "@/lib/progress/scene";
import { asideFor, asideOwed, asksToHearAgain, priceAsked, shrug } from "@/lib/scenes/aside";
import { asksSlower, saysGoodbye, LEAVING } from "@/lib/scenes/casual";
import { FAREWELLS } from "@/lib/scenes/catalogue";
import { choiceOf } from "@/lib/scenes/choice";
import { repeatsItself, type buildConsistencyUserPrompt } from "@/lib/scenes/consistency";
import { ASKS_ON } from "@/lib/scenes/curveballs";
import { gateFor } from "@/lib/scenes/gate";
import { offerFor } from "@/lib/scenes/grades";
import { words } from "@/lib/scenes/lexicon";
import { sceneLine, type LineRequest, type SpokenLine } from "@/lib/scenes/line";
import type { PersonaSpec } from "@/lib/scenes/personas";
import type { ComposeAsk, ComposeScene } from "@/lib/scenes/prompt";
import { dealtNumbers } from "@/lib/scenes/props";
import {
  cardAfterHurdles, cardChosen, cardInPlay, composeNote, counterBeat, datumLine, establishedBy, factsFor, feltAt, saidAgain,
  heldBack, heldNumbers, replyFor, sayableAfterHurdles, sceneMovedOn, stageFor, timesAnswered, wantsAsideFor,
  wantsFreshLine,
} from "@/lib/scenes/reply";
import { answerBeatId, sceneBeats } from "@/lib/scenes/scripted";
import { currentBeat, hurdleBeat, hurdleSpec, isOver, type Response, type SceneState } from "@/lib/scenes/state";
import type { BeatSpec, SceneSpec } from "@/lib/scenes/types";
import type { Level } from "@/lib/collections/syllabus/types";
import type { ChatMessage } from "@/lib/tutor/provider";

/** A bound on a body rather than on a scene. */
export const MAX_CONTEXT_CHARS = 600;
/**
 * How many exchanges of the run the composer is shown.
 *
 * Enough that a line can answer something said several turns ago, which is the
 * whole reason the conversation is passed at all, and bounded because the free
 * models this runs on have small windows and a request refused for length is a
 * turn with no line in it. Six is about half a scene.
 */
export const MAX_CONTEXT_TURNS = 6;

/** What a turn's reply is planned from. */
export interface TurnInput {
  readonly scene: SceneSpec;
  /**
   * The context the turn was marked with, after `knowing` widened it, so a
   * word the forms list vouched for in the learner's turn is on topic for the
   * line that answers it.
   */
  readonly context: SceneContext;
  readonly draw: StoredDraw | null;
  readonly state: SceneState;
  readonly response: Response;
  /** How many beats away from the pointer the last turn answered (`replay`). */
  readonly elsewhere: number;
  /** How many turns the learner has sent. The opening line is planned with none. */
  readonly taken: number;
  /** The lines this run has already said off the attested and scripted rungs. */
  readonly used: ReadonlySet<string>;
  readonly persona: PersonaSpec | undefined;
  /** Whether this run composes: a run opened to compose, on a deployment with a model. */
  readonly composing: boolean;
  /** Where this run starts reading a beat's own lines (`LineRequest.rotate`). */
  readonly rotate: number;
  /** The band the run was opened at, which is how the other side talks (`pitchFor`). */
  readonly level: Level;
}

/** Everything the line for a beat is built from, where a line is built at all. */
export interface LinePlan {
  readonly beat: BeatSpec;
  readonly agenda: readonly string[];
  readonly settled: readonly string[];
  readonly anticipated: string | null;
  readonly handing: string | null;
  readonly stillTalking: boolean;
  readonly closingOnNews: boolean;
  /** The ladder's request, less the pool, which each rung sets for itself. */
  readonly request: Omit<LineRequest, "pool">;
}

export type TurnPlan = ReturnType<typeof planTurn>;

/**
 * Everything one turn's reply is planned from, in the order the route has
 * always worked it out.
 */
export function planTurn(input: TurnInput) {
  const { scene, context, draw, state, response, elsewhere, taken, used, persona, composing } = input;
  const current = currentBeat(scene, state);
  /*
    A curveball in the way is what the other side says next and what the
    learner is asked for, and the beat waits behind it (`raiseHurdle`).
  */
  const standing = state.hurdle ? hurdleBeat(state.hurdle) : null;
  /*
    THE ONE LINE THIS SCENE'S REGISTER DOES NOT APPLY TO. `other-register` is
    the other side switching pronoun, so the check that withholds a line for
    the wrong pronoun is the check that withheld every line ever drafted for
    it, and what a learner met in the middle of a conversation was the English
    stage direction saying what was supposed to be happening. While it stands,
    the register the composer is asked for is the other one and the check
    stands down for that line alone; everything else in the gate is untouched.
  */
  const switched = Boolean(standing && hurdleSpec(state)?.switchesRegister);
  const register = switched
    ? (scene.register === "teie" ? "sina" : "teie")
    : scene.register;
  /*
    The offer was turned down and they offer again: the beat is spoken as
    its counter, and from here on every line reads the second offer's values
    off the card, so a time read back later is the one that was accepted.
  */
  const speaking = response === "counter" && current?.counter ? counterBeat(current) : current;
  /*
    The card as the other side knows it now: a counter-offer's second values
    stood in for the first, and a curveball's changed fact stood in for the
    one the learner was told, so "how much?" after the price curveball is
    answered with the price the other side actually has (`cardAfterHurdles`).
    And with every fact the learner changed on it (`cardChosen`, ADR-025
    amendment 3): a destination, a time, a floor or a drink they named
    themselves is the fact from that turn on, for the line that reads it back,
    the composer, the gate and the objective on the screen alike.
  */
  const glossOf = (lemma: string) => context.marker.englishFor?.get(lemma)?.[0];
  const card = cardChosen(
    cardAfterHurdles(cardInPlay(draw?.card ?? null, scene.beats, state.countered), state),
    state.turns,
    glossOf,
  );
  const last = state.turns[state.turns.length - 1] ?? null;
  /*
    THE BEAT JUST ANSWERED IS OFTEN A HURDLE, AND `scene.beats` HAS NEVER
    HEARD OF ONE.

    A curveball's beat is synthetic (`hurdle:<id>`, built by `hurdleBeat`)
    and lives nowhere in the catalogue's own `beats` array, so the moment a
    learner resolved one, this lookup came back empty. `answered` feeds the
    whole reaction system below: the acknowledgment after a landed turn is
    gated on `answered` being truthy, so every turn that resolved a curveball
    skipped it in silence and went straight to the next beat's bare opening
    line with nothing said about what had just happened. A learner who
    corrected a mishearing ("ei ole") read the "where" beat's ordinary
    opener next, "Jah, palun?", which answers a yes/no question nobody had
    asked and reads as agreeing with the "no" they had just said. `sceneBeats`
    is the one function that also knows about hurdle and `answer:<beat>`
    beats, and it is what every other reader of "which beat was this turn
    about" already uses (`bank.test.ts`, `scriptedFor`).
  */
  const answered = last ? sceneBeats(scene).find((b) => b.id === last.beatId) ?? null : null;
  const heard = last?.heard ?? null;
  /* What the last turn was read as. Five readings, not two (§8). */
  const reading = last?.reading ?? null;
  const sent = taken > 0;

  /*
    A QUESTION THE SCENE DID NOT ANTICIPATE GETS AN ANSWER BEFORE THE MOVE.
    `readTurn` wrote down that one was asked and with which word; `asideFor`
    answers it from what the other side knows, a fact off the card or more of
    what they just said, and where it cannot, a model is asked for one line
    inside the list below, and failing that the other side says they do not
    know, which is what a person says. Never on a turn nobody understood,
    since then the repair phrase is the whole reaction.

    A QUESTION IS ANSWERED WHERE THE TURN LANDED, AND NOT WHERE IT MISSED.
    §36 put an answer in front of the move for a learner who said their piece
    and asked something extra, which is what `okei, otse, ja kuhu siis?` is.
    It read every question the same way, so a learner who missed the beat and
    asked something got `Ei tea.` and then the question again: "do you speak
    English?" answered with "I don't know", and "sorry, what?" answered the
    same way. Neither is a person. When the floor is still theirs and the
    learner has not answered yet, the human move is to ask again, which is
    what `narrow` already does.

    AND A REAL QUESTION ON A TURN THAT MISSED IS STILL A QUESTION. That
    reasoning is right about "sorry, what?" and wrong about "what is the price
    now?", which a learner asked after being told it had changed, on a beat
    that wanted how they were paying, and read `Vabandust!` and the same
    question again for. On a miss, a fact off the card answers it before the
    question is put again (`wantsAsideFor`, `AsideInput.missed`); the model's
    own line answers it where one composes, since the note tells it to; and
    the shrug is never said at somebody who missed, since "I don't know" to
    "sorry, what?" is the fault the paragraph above describes.
  */
  const askedNow = last?.asked ?? null;
  const landedNow = response === "answer" || response === "counter" || elsewhere > 0;
  const wantsAside = wantsAsideFor(askedNow, sent ? response : null, reading, elsewhere > 0);
  /*
    The prepared lines for a beat, less any a curveball this run raised has
    made untrue (`sayableAfterHurdles`): after "it can't be done today" the
    bank still held "take it tonight". The scene is handed over, or a
    mishearing says a line about a beat nobody has reached.
  */
  const bank = (id: string | undefined): readonly string[] =>
    id ? sayableAfterHurdles(context.scripted.get(id) ?? [], state, context.lexicon, context.marker.negators, scene) : [];
  const fresh = (id: string | undefined) => bank(id).filter((text) => !used.has(text));
  const asking = {
    asked: askedNow,
    spoken: words(last?.said ?? ""),
    said: last?.said ?? "",
    answered,
    card,
    lexicon: context.lexicon,
    more: fresh(answered?.id),
    answers: answered ? fresh(answerBeatId(answered)) : [],
    missed: !landedNow,
    already: used,
  };
  /*
    In a run that composes, the model answers what was asked, so none of the
    keyless answers is said beside it: a canned "See maksab 21 eurot." said
    beside a prepared line, after the model's attempts were withheld, read as
    the price out of nowhere.

    ONE REPLY PER TURN, AND THE QUESTION IS ANSWERED INSIDE IT. A question the
    bank and the card could not answer used to book the turn's one call for
    an aside, and the move itself then came out of the bank: a learner who
    asked anything got `Ei tea.` from a model told only that a question had
    been asked, and a scripted question after it. The composed move now
    carries the answer (`composeNote` tells it what was asked and what the
    scene says the answer is), so the aside here is the keyless rungs only,
    and the shrug is what a landed turn gets where nothing composed and no
    fact answered.
  */
  let aside: SpokenLine | null = wantsAside && !composing ? asideFor(asking) : null;
  /*
    AND "SORRY, WHAT?" IS ANSWERED WITH THE LINE AGAIN, NEVER WITH A SHRUG.
    On a beat that takes anything the turn lands, the question word is left
    over, and nothing on the card or in the bank answers "what?": the honest
    answer is what was just said, said once more, and a composed line says it
    in its own words.
  */
  const hearAgain = asksToHearAgain(words(last?.said ?? ""), context.marker.questionWords, context.lexicon);
  if (!composing && wantsAside && aside === null && hearAgain && heard) aside = saidAgain(heard);
  /*
    AND NOBODY SHRUGS AT A GOODBYE. A question tucked into the turn that ends
    the scene ("17 eurot, jah? Siin on kaart... head aega!") met "Ei tea."
    and then the farewell, which is the other side answering a card payment
    with "I don't know". The conversation is over, so what is owed is the
    goodbye and nothing in front of it.

    A RUN WITH A MODEL BEHIND IT NEVER SHRUGS. `Ei tea.` is the keyless
    answer to a question nothing in the scene could answer, and in a run that
    composes it was said in front of the bank's line whenever the model's line
    did not get through: a receptionist asked whether to bring the cat said
    "I don't know" and goodbye. Where a model answers, the question is its to
    answer, and where its line does not get through the bank's line is said
    without a shrug in front of it.

    AND "PLEASE SPEAK MORE SLOWLY" IS A REQUEST FOR HELP, NOT A QUESTION TO
    SHRUG AT. It rides in a turn with a question mark often enough that a
    confused learner who had met the beat and asked the other side to slow
    down was answered `Ei tea.` (`asksSlower`).
  */
  const slower = asksSlower(words(last?.said ?? ""));
  const shrugOwed = wantsAside && landedNow && aside === null && asideOwed(asking) && !hearAgain && !slower
    && !isOver(scene, state) && !composing;

  /*
    WHAT THIS PERSON KNOWS, FOR THE MODEL. Every value on the card, the
    learner's and the other side's, in English, off the same labels the
    briefing prints. Without it a model told "they ask what time" could not
    react to the time on the card, and one asked the price could only invent
    a number the gate withholds. The card is the one in play, so a changed
    price is the new price.

    WHAT THIS PERSON HOLDS FOR LATER, AND WHAT THE RUN HAS ESTABLISHED.

    A value of theirs that the scene says only at a beat still ahead is kept
    back until then (`heldBack`): told the wage from the first line, an
    interviewer named it while asking about experience, and the learner's own
    objective later asked about a figure already on the screen. A question
    releases it, since a question is owed an answer. And a curveball that
    changed the situation stays changed (`establishedBy`): a bus that is not
    leaving tonight is not leaving tonight when the learner asks for beer.
  */
  const held = heldBack(scene.beats, card, state, standing ?? speaking ?? null, {
    any: askedNow !== null,
    money: askedNow !== null && priceAsked(last?.said ?? "", context.lexicon) !== null,
  });
  const established = establishedBy(state, card);
  const moved = sceneMovedOn(state, card, scene.beats);
  const facts = factsFor(card, scene.beats, held);
  /*
    AND WHAT THE LEARNER JUST SAID IS A TOPIC A LINE MAY BE ABOUT, ON EVERY
    TURN. The gate holds a composed line to the beat's own words, which is
    right for a line that asks and wrong for one that first answers: a learner
    who asked the price and was answered about the price, then asked how they
    were paying, has been answered on both, and a check that sees only `kaart`
    and `raha` withholds the half that answered them. A line that takes up the
    word the learner used ("Tartusse, hästi") is on topic whatever the turn
    was read as.
  */
  const spokenWords = words(last?.said ?? "").filter((word) => context.lexicon.forms.has(word) || context.marker.known?.(word));
  /*
    Every form of a word they used, not only the spelling: asked `Kuidas ma
    maksin?`, a cashier answering `kaardiga saab maksta` was withheld as off
    the point three times, because `maksta` is not the spelling `maksin`.
  */
  const theirs = [...spokenWords, ...[...context.lexicon.byLemma.values()]
    .filter((forms) => spokenWords.some((word) => forms.has(word)))
    .flatMap((forms) => [...forms])];

  // The question waiting behind a curveball that carries straight on with it (`ASKS_ON`).
  const askedOn = ASKS_ON.has(hurdleSpec(state)?.id ?? "") ? fresh(speaking?.id)[0] ?? null : null;
  /*
    Which beat the ladder is asked for: the hurdle where one stands, and once
    the scene is over, the farewell, since somebody who said goodbye first is
    still owed one back.
  */
  const spokenFor = standing ?? speaking ?? (answered?.move === "close" ? answered : undefined);

  /*
    WHETHER A LINE IS BUILT AT ALL. Where it is not, the reply is the reaction
    and whatever `replyFor` says with no line, which is the line said again.

    A beat the other side opens with nothing: they said their piece and are
    waiting, so no line is built and the screen prints what they are doing.
    A PERSON WAITING STILL ANSWERS WHAT THEY ARE ASKED. A beat that opens with
    nothing printed no line at all, so a learner at a street corner who asked
    "is `vasakule` left?" got silence, and then the directions word for word.
    In a run that composes, a turn that asked something, or one that said it
    was lost or missed, is answered; the move itself is still to wait.
  */
  const waitingAnswers = composing && !standing
    && (askedNow !== null || reading === "lost" || reading === "offtarget");
  const silent = !spokenFor || (spokenFor.awaits && !standing && !waitingAnswers)
    /*
      And in a run that composes, every turn gets a line written for it.
      Saying the last line again, which is what a turn handed back or a turn
      in English gets keyless, read in every transcript as the other side
      repeating itself.
    */
    || (!composing && !wantsFreshLine(sent ? response : null, heard, reading))
    /*
      A CURVEBALL SAID IN ENGLISH IS SAID IN ENGLISH. "They switch to English"
      carries its own line (`said`) and no Estonian is wanted for it; composed,
      it came back as `Kas te räägite inglise keelt?`, which is the other side
      asking rather than switching, and the whole point is that they switched.
    */
    || Boolean(standing && hurdleSpec(state)?.said);
  const line = silent || !spokenFor ? null : linePlan(spokenFor);

  function linePlan(beat: BeatSpec): LinePlan {
    /*
      THE PERSON'S OWN AGENDA, FOR THE MODEL: what they still need from the
      learner, in order, and what has already been given, both in English off
      the beats' own stage directions and goals. A model that can see the
      shape of the conversation can take an answer given early and bring a
      wandering one back, which a model handed one move could not.

      AND THE GOODBYE STAYS OFF IT UNTIL IT IS THE MOVE. The agenda ended in
      "they thank you for coming and say goodbye" from the first beat on, and
      a weaker model folded the whole list into one turn: `Palk on hea. Kas
      teil on veel küsimusi? Aitäh, Head aega!` on the beat about the pay,
      with three beats still to go. A person does not plan their farewell;
      they say it when the conversation is over. So a `close` beat is on the
      agenda only when it is the beat being asked, and `saysGoodbye` in the
      gate withholds a farewell said anywhere else.
    */
    const agenda = scene.beats
      .slice(state.beat)
      .filter((b) => !state.done.includes(b.id))
      .filter((b) => b.move !== "close" || b.id === beat.id)
      /*
        A step that will say no is marked as one, or the model, reading "they
        ask what you'd like them to do", promised the refund the next step
        refuses.
      */
      .map((b) => {
        const stage = stageFor(b, card, b.id === beat.id ? new Set() : held);
        return b.move === "refuse" && b.id !== beat.id ? `(you will turn this down) ${stage}` : stage;
      });
    const settled = scene.beats.filter((b) => state.done.includes(b.id)).map((b) => stageFor(b, card));
    /*
      And what the scene says the answer to the learner's question is, where
      it anticipated one: the beat's own `answer`, with the card's values
      filled in, which is what the bank was drafted against.
    */
    const anticipated = askedNow && answered?.answer ? stageFor({ ...answered, they: answered.answer }, card) : null;
    /* The word the beat was waiting for, where the other side is letting it go or was asked for help. */
    const handing = (response === "help" || response === "moveOn") && answered
      ? offerFor(answered, card, context.marker.questionWords, last?.met ?? [], context.lexicon.infinitives)
      : null;
    /*
      A closing beat where the learner is still asking: the goodbye waits, so
      the line is gated as a line that may not say it (`farewell`).
    */
    const stillTalking = beat.move === "close" && askedNow !== null && last !== null && !saysGoodbye(last.said, [...FAREWELLS, ...LEAVING]);
    /*
      AND NOT WHERE THE LEARNER HAS JUST TOLD THEM SOMETHING. The close beat
      is a farewell off the course, and straight after an answer it was said
      bare: asked how long they had been learning, a learner wrote "two
      weeks, it is hard but interesting" and the teacher replied `Head aega!`,
      with nothing about what they had said. A person takes it in and then
      says goodbye. So where the learner's last turn was not itself a goodbye,
      the model is asked to react and wrap up, and the farewell stays the net.
    */
    const closingOnNews = beat.move === "close" && last !== null && !saysGoodbye(last.said, [...FAREWELLS, ...LEAVING]);
    const typed = () => state.turns.flatMap((turn) => turn.said.match(/\d{1,2}[:.]\d{2}|\d+/g) ?? []);
    const request: Omit<LineRequest, "pool"> = {
      beat: stillTalking ? { ...beat, move: "confirm" as const } : beat,
      lexicon: context.lexicon,
      /*
        WHERE THIS RUN STARTS READING A BEAT'S OWN LINES. Every conversation
        opened with the same word. A courtesy is answered from the recorded
        rung and a beat's bank holds two or three lines, both scanned from the
        front, so `Tere!` opened every run of every scene and a keyless run
        asked its second question in the same sentence every time.
      */
      rotate: input.rotate,
      /*
        The gate, plus the numbers this run was dealt. Per run rather than per
        scene, because the card is drawn when the run opens and the scene
        knows nothing about it.
      */
      gate: gateFor(beat.id, {
        ...context.gate,
        /*
          The numbers the card dealt, and every number the learner has typed
          in this run: a line saying back a figure the learner gave is
          repeating them, not inventing a fact, and `facts` withheld it as
          invented.
        */
        dealt: new Set([...dealtNumbers(card), ...typed()]),
        times: clockInPlay(card, context.lexicon),
        money: moneyInPlay(card, context.lexicon),
        // A question that is not about money may be answered with a number nobody dealt.
        freeNumbers: askedNow !== null,
        /*
          The numbers of what this person keeps for later (`ahead`), less any
          spelling another value in play shares and any number the learner
          typed, since saying those back is not news.
        */
        held: (() => {
          const kept = heldNumbers(card, held);
          const open = heldNumbers(card, new Set((card?.props ?? []).map((p) => p.slot).filter((slot) => !held.has(slot))));
          const said = new Set(typed());
          return new Set([...kept].filter((n) => !open.has(n) && !said.has(n)));
        })(),
      }),
      topic: new Set<string>([...(context.topic.get(beat.id) ?? []), ...theirs]),
      hasFiniteVerb: context.hasFiniteVerb,
      fallback: context.fallback,
      scripted: bank(beat.id),
      /*
        THE RUN'S OWN CHOICE, READ BACK OFF THE DRAW AND NEVER RE-DECIDED HERE.
        A run opened with a key composes for the whole of its length and one
        opened without a key speaks out of the bank for the whole of its
        length, whatever has happened to the environment in between
        (`LineMode`). What is allowed to change under a run in flight is
        whether a *particular* call can be made, and the ladder answers that
        with the bank.
      */
      mode: draw?.lines ?? "scripted",
      used,
    };
    return { beat, agenda, settled, anticipated, handing, stillTalking, closingOnNews, request };
  }

  /*
    THE REPLY IS A REACTION AND THEN A MOVE (`lib/scenes/reply.ts`). Everything
    `replyFor` cannot work out for itself is handed over here, once, for every
    way a turn ends: with no line, with the bank's line, or with a line a
    model wrote.

    The aside is the one input that depends on how the turn ended. A composed
    line answered what was asked, so a fact off the card or a banked answer in
    front of it would be the same thing said twice and the shrug would
    contradict it; the answer written before a break in time is what goes in
    front of it, where there was one. Anywhere else a landed question nothing
    answered gets the shrug, and an answer written before a break in time
    still goes first.
  */
  function respond(said: SpokenLine | null, preBreak: SpokenLine | null = null): SpokenLine[] {
    const before = said?.provenance === "composed"
      ? preBreak
      : preBreak ?? (shrugOwed ? shrug(asking) : aside);
    return replyFor({
      beat: speaking,
      // A turn that answered a beat the other side had moved past is not a miss.
      landed: elsewhere > 0,
      hurdle: standing
        ? { beat: standing, line: standing === spokenFor ? said : null, said: hurdleSpec(state)?.said, then: askedOn }
        : null,
      answered: sent ? answered : null,
      response: sent ? response : null,
      reading,
      line: said,
      heard,
      said: last?.said ?? null,
      card,
      translates: persona?.translates ?? false,
      askedForEnglish: last?.wantsEnglish === true,
      acknowledges: persona?.acknowledges ?? true,
      echo: last?.matched?.[0] ?? null,
      /*
        The word the other side repeats is the learner's own, or, where it was
        understood with a slip, the dictionary's form of it (`Slip.form`),
        which `readTurn` already put first in `matched`. The flag is what
        labels it.
      */
      recast: Boolean(last?.slips?.some((slip) => slip.form && slip.form === last?.matched?.[0])),
      /*
        And where they reached for the word in English, the Estonian is said
        back as the word they were reaching for rather than as their own word
        put right, because it was not their word.
      */
      english: Boolean(last?.slips?.some((slip) => slip.kind === "english")),
      aside: before,
      /*
        The word to hand over where the turn said they were not following. The
        beat they were answering, not the one coming next: they are stuck on
        the question they were asked.
      */
      offer: !composing && (response === "help" || response === "moveOn") && answered
        ? offerFor(answered, card, context.marker.questionWords, last?.met ?? [], context.lexicon.infinitives)
        : null,
      met: state.done.length,
      metLast: last?.met ?? [],
      /*
        Whether this is the learner's first sight of the beat now being
        spoken, which is what the break in time is printed on: a scene that
        walks somebody to a shop has to say so before it asks where they are.
      */
      arriving: speaking ? !state.turns.some((turn) => turn.beatId === speaking.id) : false,
      /*
        How long they have been on this beat, so the app knows when to step
        out of character and say what is wanted (`lib/scenes/coach.ts`). Turns
        that cost no patience are still turns the learner took, so they are
        counted: somebody who has answered three times and got nowhere is
        stuck whether or not the machine spent a try on it.
      */
      tries: answered ? state.turns.filter((turn) => turn.beatId === answered.id).length : 0,
      // And how often they have heard the line itself, which a question carried on behind a curveball reaches first (`timesAnswered`).
      answeredTimes: timesAnswered(state.turns, heard),
      /*
        The beat's other banked lines, so a question that has already been
        put twice and narrowed once can be put a different way rather than a
        fourth identical time (`replyFor`). `fresh` is the same filter the
        aside uses: the bank's rows for the beat, minus whatever this run has
        already said, so nothing repeats and no line is composed for it.
      */
      others: fresh(speaking?.id),
      /*
        And the same question narrowed to two, where the beat's own words or
        the card's own values can supply a pair. Built off the beat the
        learner was answering rather than the one coming next: they are stuck
        on the question they were asked. The roll is the turn count, which is
        stable across a replay, so a choice does not swap sides under somebody
        reading it.
      */
      choice: answered && !isOver(scene, state)
        ? choiceOf({
            beat: answered, card, lexicon: context.lexicon,
            dealt: new Map(
              scene.props.flatMap((prop) =>
                prop.kind === "word" || prop.kind === "weekday" ? [[prop.slot, prop.oneOf] as const] : [],
              ),
            ),
            roll: state.turns.length, met: last?.met ?? [],
          })
        : null,
    });
  }

  /*
    THE CONVERSATION SO FAR, BOTH SIDES, RATHER THAN THE LEARNER'S LAST TWO
    LINES.

    What went before was `body.said`: the last two things the learner typed,
    as two `user` messages with nothing between them. A model reading that is
    reading half a conversation with the halves it did not write missing, so
    it could answer the beat and could not answer the person. Somebody who
    said at turn two that they were in a hurry and is asked at turn six
    whether the afternoon suits them has been talked at rather than talked
    to, and that is most of what "it does not answer me like a human" was
    about.

    So it is the run's own turns, alternating, off `state.turns`, which holds
    both `said` and the `heard` it was answering. Same trust level as the
    field it replaced, since both come from the client's transcript and are
    re-read by `readTurn` on the server before any of this; what is different
    is that it is complete. Never interpolated into an instruction (§17): the
    exchange goes in as messages, so a learner can type anything into it and
    the blast radius is one withheld line.

    Capped at `MAX_CONTEXT_TURNS` exchanges, which is what stops a long run
    quietly turning into a request that is refused for length at exactly the
    point the conversation has become worth reading.
  */
  const conversation: ChatMessage[] = state.turns
    .slice(-MAX_CONTEXT_TURNS)
    .flatMap((turn) => [
      ...(turn.heard ? [{ role: "assistant" as const, content: clip(turn.heard, MAX_CONTEXT_CHARS) }] : []),
      { role: "user" as const, content: clip(turn.said, MAX_CONTEXT_CHARS) },
    ]);
  /*
    The other side's voice, for tone: the first banked line of each of the
    scene's own beats. The same on every turn of this run, so it goes in the
    cached half of the prompt rather than being paid for again each turn.
  */
  const voice = [...context.scripted.entries()]
    .filter(([id]) => !id.includes(":"))
    .flatMap(([, lines]) => lines.slice(0, 1))
    .slice(0, 6);

  return {
    input, scene, context, state, response, sent, current, standing, register, speaking, card, last, answered,
    heard, reading, askedNow, landedNow, wantsAside, bank, fresh, asking, aside, hearAgain, shrugOwed, held,
    established, moved, facts, theirs, spokenFor, silent, line, respond, conversation, voice,
  };
}

/** How the model's turn went, as the caller tells `speakTurn`. */
export type Composition =
  /* Nothing was composed and nothing was asked to: the net is said. */
  | { readonly kind: "none"; readonly extra?: Record<string, unknown> }
  /* A model was asked and no line of its got through: the net is said, or what was withheld where the net has nothing. */
  | { readonly kind: "withheld"; readonly line: SpokenLine; readonly preBreak: SpokenLine | null; readonly extra?: Record<string, unknown> }
  /* A model wrote the move, with the answer it wrote before a break in time where there was one. */
  | { readonly kind: "composed"; readonly line: SpokenLine; readonly preBreak: SpokenLine | null; readonly extra?: Record<string, unknown> };

/** What the model step is handed: the plan, the line it is for, and the net under it. */
export interface ModelTurn {
  readonly plan: TurnPlan;
  readonly line: LinePlan;
  /** What this turn says if the model cannot: the bank's line, or the line said off the card. */
  readonly move: SpokenLine;
}

/**
 * The other side's reply to one turn: the keyless rungs, then the model where
 * the caller has one, then the reply around whichever line answered.
 *
 * `extra` is whatever the model step wanted the screen to know (the route's
 * `composed`, `note`, `composedBy`, `modelDown`), and is empty on a turn that
 * never reached it.
 */
export async function speakTurn(
  plan: TurnPlan,
  model?: (turn: ModelTurn) => Promise<Composition>,
): Promise<{ lines: SpokenLine[]; extra: Record<string, unknown> }> {
  const line = plan.line;
  if (!line) return { lines: plan.respond(null), extra: {} };
  /*
    WHAT THIS TURN SAYS IF THE MODEL CANNOT, WORKED OUT BEFORE THE MODEL IS
    ASKED.

    Three rungs, none of which costs a request: a phrase the course teaches,
    then a line drafted in advance and gated then (ADR-025 amendment 1), then a
    line the beat can say out of course words and this run's own dealt values
    (`Teisipäeval kell 13:30?`). This is the whole of what a keyless
    deployment ever says, and it is also the safety net under composition
    rather than the thing composition was a fallback for: the model is asked
    on every beat, and whatever it cannot answer is answered from here.

    Worked out first rather than after the call fails, because the failure
    cases include the ledger refusing and the provider timing out, and a net
    assembled at that point is a net assembled while somebody is waiting.

    THE NET IS THE BEAT AS IT IS, NOT AS THE MODEL IS TOLD IT. `stillTalking`
    hands a closing beat to the composer as a `confirm`, so a model asked
    something on the way out answers it and leaves the goodbye to the learner.
    The cheap ladder was handed the same relabelled beat, and a `confirm` does
    not take `Head aega!`, so with no model behind the run a learner who asked
    "kui kaua?" as they were leaving read the stage direction "They say
    goodbye." in English and nothing in Estonian, turn after turn.
  */
  const cheap = await sceneLine({ ...line.request, beat: line.beat, pool: plan.context.pool.get(line.beat.id) ?? [] });
  const dealt = cheap.provenance === "fallback" ? datumLine(line.beat, plan.card, plan.context.lexicon) : null;
  const move = cheap.provenance !== "fallback" ? cheap : dealt ?? cheap;
  /*
    A COURTESY IS THE LINE, AND A MODEL ONLY PARAPHRASES IT INTO SOMETHING
    NOBODY SAYS. The attested rung is reachable only where the beat's pool
    holds a phrase entry, which after §32 narrowed it is `Tere!`, `Aitäh!`,
    `Head aega!` and their neighbours: a lexicographer recorded them, they are
    the whole line, and there is nothing about the conversation for a drafted
    greeting to be better about.

    AND NOT WHERE THE TURN NEEDS ANSWERING. A learner who asked something on
    the way out, or was being handed the word they could not find, was
    answered `Ei tea. Head aega!` because the farewell is a courtesy and the
    courtesy rung stands above the model. The model is asked then, told what
    was asked and what to hand over, and the courtesy is still the net. And
    not where the learner has just told them something (`closingOnNews`).
  */
  if (cheap.provenance === "attested" && !plan.shrugOwed && !line.handing && !plan.askedNow && !line.closingOnNews) {
    return { lines: plan.respond(cheap), extra: {} };
  }
  if (!model) return { lines: plan.respond(move), extra: {} };
  const composed = await model({ plan, line, move });
  const extra = composed.extra ?? {};
  if (composed.kind === "none") return { lines: plan.respond(move), extra };
  if (composed.kind === "withheld") {
    /*
      AND THE NET CATCHES IT. The model was asked, and it did not answer or
      the gate withheld what it wrote; the run says the line it would have
      said with no key at all rather than the repair phrase. The withheld line
      is kept where the net has nothing either, because that is the one case
      where the screen has something to explain.
    */
    return { lines: plan.respond(move.provenance !== "fallback" ? move : composed.line, composed.preBreak), extra };
  }
  return { lines: plan.respond(composed.line, composed.preBreak), extra };
}

/** What a model is handed for one line: the prompt's live half and its constant half, together. */
export type TurnAsk = Omit<ComposeAsk, "avoid"> & ComposeScene;

/** What the caller's transport does with one ask, and the consistency check where the caller has one. */
export interface ComposeIO {
  /** Ask the model for one line. Null where nothing came back. */
  readonly compose: (ask: TurnAsk, conversation: readonly ChatMessage[], avoid: readonly string[]) => Promise<string | null>;
  /** Whether a line keeps to what was said, on the caller's grader. Absent where the caller has none. */
  readonly consistency?: (ask: Parameters<typeof buildConsistencyUserPrompt>[0]) => Promise<string | null>;
  /** Which of these spellings are Estonian, asked of the language rather than of the scene (`sceneVouch`). */
  readonly vouch: (spellings: readonly string[]) => Promise<ReadonlySet<string>>;
  /** What the learner's turn appears to say, word by word, from the dictionary. Empty where the caller has no dictionary to ask. */
  readonly reading?: (text: string) => Promise<string>;
}

/** What the composer is told about the turn after a question answered before a break in time. */
export const AFTER_BREAK_NOTE =
  "You have just answered what they asked, in the line before the break above; do not answer it or react to it again. Now make your move.";
/** What the composer is told when it answers before a break in time. */
export const BEFORE_BREAK_NOTE =
  "They have just asked you something: answer it briefly and kindly, as things stand right now. Make no other move and ask nothing; something is about to happen.";
const BEFORE_BREAK_THEY = "They answer what the learner has just asked, as things stand right now.";

/**
 * The model's line for one turn, and the answer it writes before a break in
 * time where the turn crosses one. Throws where the transport or a read
 * throws; what the caller does about it is the caller's.
 */
export async function composeTurn(
  plan: TurnPlan,
  line: LinePlan,
  io: ComposeIO,
): Promise<{ line: SpokenLine; preBreak: SpokenLine | null }> {
  const { scene, state, card, last, askedNow, answered, input, context, bank } = plan;
  const { beat, agenda, settled, anticipated, handing, stillTalking } = line;
  const persona = input.persona;
  const who = `${scene.title}. ${scene.place}. ${persona?.who ?? ""}`.trim();
  let preBreak: SpokenLine | null = null;
  const learnerReading = last?.said && io.reading ? await io.reading(last.said) : "";
  /*
    THE QUESTION ASKED ON THE WAY OUT IS ANSWERED BEFORE THE BREAK IN TIME.

    A diner asked whether the soup was spicy on the turn that crossed into
    "you've eaten, the waiter comes back", and the waiter's answer arrived
    after the break: an answer about the soup with the plates already
    cleared. A friend asked "have you had breakfast?" got the answer after
    "you're walking home", reading as a reply to somebody still on the way
    to the shop. So a turn that asks something and arrives at a break gets
    its answer written first, as things stood before it, and then the break
    and the move, each line checked like any other.
  */
  const crossing = askedNow !== null && !plan.standing && plan.speaking === beat && Boolean(beat.meanwhile)
    && answered !== beat && !state.turns.some((turn) => turn.beatId === beat.id);
  const ask = (because: string | undefined): TurnAsk => ({
    reading: learnerReading,
    facts: plan.facts,
    because,
    /*
      Who they are and where this is happening (`ComposeAsk`). Every line of
      it is on the learner's own briefing screen: a character told none of it
      is answering a beat rather than playing a part.
    */
    scene: scene.title,
    place: scene.place,
    // The band this run was opened at, which is how the other side talks (`pitchFor`).
    level: input.level,
    persona: persona?.who ?? "",
    situation: scene.role,
    move: beat.move,
    they: stageFor(beat, card),
    register: plan.register,
    words: context.lexicon.spoken,
    /*
      The scene's own banked lines, for tone: a model shown six sentences
      this receptionist has said writes a seventh in the same register and
      length, where one shown a word list alone writes a paragraph. They are
      examples of the voice and never of the answer, since none is for this
      beat.
    */
    examples: [],
    voice: plan.voice,
    /*
      AND THIS BEAT'S OWN, WHICH THE PROMPT ASKS IT TO REPHRASE RATHER THAN
      COPY. `they` is one sentence of English and a model reads it fluently
      and still guesses the content: told they ask when the learner could
      start, it wrote `Kust alustaksite tööd?`, which asks where. The bank
      holds the same beat asked properly by somebody who read it.
    */
    asked: bank(beat.id).slice(0, 2),
    agenda,
    settled,
    established: plan.established,
    moved: plan.moved,
    /* A closing beat where the learner is still asking, so the goodbye waits. */
    stillTalking,
    /*
      AND WHAT HAPPENED TO THEIR TURN, WHICH IS WHY A MISS IS WORTH A CALL AT
      ALL. Without it a model asked to compose after a miss writes the
      question again, which is what the table did for free; with it the
      character answers the person and then asks.
    */
    note: composeNote(
      plan.sent ? plan.response : null, plan.reading, input.elsewhere > 0, preBreak ? null : askedNow,
      { offer: handing, answer: anticipated, again: plan.hearAgain && plan.heard !== null },
    ),
    /* How many times this move has already been made, so a question answered is not asked a third time. */
    madeBefore: state.turns.filter((turn) => turn.beatId === beat.id).length,
    // And what that turn was to this person, so the model feels what the keyless reply feels.
    feel: feltAt(answered, plan.sent ? plan.response : null),
  });
  const conversation = plan.conversation;
  const talkWith = (text: string) => conversation.map((m) => ({ role: m.role === "assistant" ? "them" as const : "learner" as const, text: m.content }))
    .concat(text ? [{ role: "them" as const, text }] : []);
  if (crossing) {
    const movedBefore = sceneMovedOn({ beat: state.beat - 1 }, card, scene.beats);
    const pre = await sceneLine({
      ...line.request,
      beat: { ...line.request.beat, move: "confirm" as const, meanwhile: undefined },
      pool: [],
      scripted: [],
      vouch: io.vouch,
      review: async (candidate: string) => io.consistency
        ? io.consistency({
          who,
          conversation: talkWith(""),
          established: plan.established,
          moved: movedBefore,
          facts: plan.facts,
          later: agenda,
          line: candidate,
        })
        : null,
      compose: (avoid, because) => io.compose({
        ...ask(because),
        move: "confirm",
        they: BEFORE_BREAK_THEY,
        moved: movedBefore,
        asked: [],
        agenda: [],
        note: BEFORE_BREAK_NOTE,
      }, conversation, avoid),
    });
    if (pre.provenance === "composed") preBreak = pre;
  }
  const said = await sceneLine({
    ...line.request,
    // The attested and scripted rungs were already tried and did not answer.
    pool: [],
    scripted: [],
    /*
      WHETHER THE WORDS ARE ESTONIAN, ASKED OF THE LANGUAGE RATHER THAN OF THE
      SCENE. The closed list is what the learner has been taught to read and
      the gate keeps holding the line to it, by a budget rather than by a
      refusal (`NEW_WORDS`); what may not happen is a made-up word, and that is
      what this answers, off the course and the forms list.
    */
    vouch: io.vouch,
    /*
      AND A LINE THE GATE PASSED STILL HAS TO KEEP TO WHAT WAS SAID. Only
      once the conversation has said something to keep to: the opening line
      has nothing behind it to contradict. And never its own earlier line
      again, word for word, which is free to check and is what a critic
      flagged most after a turn went nowhere.
    */
    review: async (candidate: string) => {
      const before = [...state.turns.flatMap((turn) => (turn.heard ? [turn.heard] : [])), ...(preBreak ? [preBreak.text] : [])];
      if (repeatsItself(candidate, before)) {
        return "it repeats, word for word, something you already said; say something new that answers what they just said";
      }
      const talk = preBreak ? [...conversation, { role: "assistant" as const, content: preBreak.text }] : conversation;
      return talk.length > 0 && io.consistency
        ? io.consistency({
          who,
          conversation: talkWith(preBreak?.text ?? ""),
          established: plan.established,
          moved: plan.moved,
          facts: plan.facts,
          later: agenda.slice(1),
          line: candidate,
        })
        : null;
    },
    /*
      After an answer written before a break in time, the move is written
      knowing it: that answer is the last thing this person said, and the
      line does not answer or react to the question again. Without it every
      crossing said the answer twice, once on each side of the break.
    */
    compose: (avoid, because) => io.compose({
      ...ask(because),
      ...(preBreak ? { note: AFTER_BREAK_NOTE, feel: undefined } : {}),
    }, preBreak ? [...conversation, { role: "assistant" as const, content: preBreak.text }] : conversation, avoid),
  });
  return { line: said, preBreak };
}
