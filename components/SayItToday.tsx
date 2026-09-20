"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Footprints } from "lucide-react";
import { recordEncounter } from "@/app/actions";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button } from "@/components/Button";
import { Card, SectionTitle } from "@/components/ui";
import {
  errandPlaces, HOW_IT_WENT, isConversation, OUTCOME_LABEL, SAY_IT_TODAY, sceneForErrand,
  SPOKE_LABEL, type Conversation, type Errand, type Outcome,
} from "@/lib/collections/errands";

/**
 * Whether any Estonian was spoken to a real person yesterday, and a small
 * thing to say today where the answer is no.
 *
 * THE QUESTION IS ABOUT A DAY THAT IS OVER. This card used to set an errand
 * in the morning and put the answers underneath it, which asked for a report
 * on something that had not happened yet: at eight in the morning those are
 * not answers, they are ways to make a card go away. And it could only see
 * conversations this app had set, so a learner who spent an hour with their
 * Estonian mother-in-law and ignored the errand was recorded as having done
 * nothing, in the one number this app says it is measured by.
 *
 * AND IT IS TWO QUESTIONS, BECAUSE THE FIRST ONE IS THE ACHIEVEMENT. One row
 * of answers asked whether anything was said and how it went at the same
 * time, so the learner who spoke and struggled had to claim they were
 * understood, claim the other person switched, or answer "not yesterday",
 * which deletes the conversation from the count. Worse, it passed over the
 * thing worth saying: speaking Estonian to a stranger is the hard part and
 * the app went straight to marking it. So the card asks whether anything was
 * said, says that it was the thing, and then asks how it went.
 *
 * NOTHING IS WRITTEN UNTIL THE SECOND PRESS, and that is deliberate rather
 * than an oversight. Reading "yes" as `UNDERSTOOD` and letting the follow-up
 * refine it would count an abandoned half-answer as a conversation nobody
 * switched out of, which biases the one figure Progress says to watch in the
 * direction that flatters. A learner who closes the tab between the two is
 * asked again tomorrow, which is the honest state.
 */
export function SayItToday({ errand, answered, conversations, days, unitTitle }: {
  errand: Errand;
  /** Today's answer, about yesterday, or null where the question is still open. */
  answered: Outcome | null;
  /** Conversations reported in the window, so the card can say what it is collecting. */
  conversations: number;
  days: number;
  unitTitle: string;
}) {
  const [answer, setAnswer] = useState<Outcome | null>(answered);
  /** Pressed yes, not yet said how it went. Held here and stored nowhere. */
  const [spoke, setSpoke] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const report = (outcome: Outcome) => {
    setAnswer(outcome);
    setFailed(false);
    start(async () => {
      /*
        No errand id: this is the learner's own day rather than our homework,
        and a conversation with a neighbor is not ours to take credit for.

        A report is not a grade, so it is not queued for a train (ADR-015): a
        press that did not land puts the answers back with a line saying so,
        which is the star button's answer to the same failure. It used to
        throw into nothing and leave the card claiming the day was answered
        when the server had heard nothing.
      */
      try {
        const result = await recordEncounter(null, outcome);
        if (!result.ok) throw new Error(result.error);
        router.refresh();
      } catch {
        setAnswer(null);
        setFailed(true);
      }
    });
  };

  const mishap = failed && (
    <p className="mt-2 text-xs" role="status" style={{ color: "var(--hard-ink)" }}>
      That did not save. Try again when you are back online.
    </p>
  );

  /*
    BEAT ONE. Whether anything was said at all, which is a question with a
    yes and a no in it and no judgment either way. The bar is deliberately on
    the floor: one sentence at a door is a yes.
  */
  if (answer === null && !spoke) {
    return (
      <Card>
        <SectionTitle hint="yesterday">Out there</SectionTitle>
        <p className="text-md leading-snug" style={{ color: "var(--ink)" }}>
          Did you speak any Estonian to somebody yesterday?
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
          Anything counts. A shop, a colleague, one sentence at the door.
        </p>
        {mishap}
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Whether you spoke Estonian yesterday">
          <button
            type="button"
            disabled={pending}
            onClick={() => { setSpoke(true); setFailed(false); }}
            /*
              `border` and a height, which this card had never asked for:
              `.choice-btn` paints a border color and leaves the width to the
              caller, and its resting fill is the card's own surface, so the
              answers sat on Today as runs of plain text. Every other caller
              of the class says both.
            */
            className="choice-btn min-h-[44px] rounded-full border px-4 py-2 text-sm"
          >
            {SPOKE_LABEL}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => report("BAILED")}
            className="choice-btn min-h-[44px] rounded-full border px-4 py-2 text-sm"
          >
            {OUTCOME_LABEL.BAILED}
          </button>
        </div>
      </Card>
    );
  }

  /*
    BEAT TWO. The congratulation first, because it is about the learner rather
    than about the result, and then how it went. The answers are read off
    `isConversation` in `lib/collections/errands.ts`, so a fifth one that is a
    conversation arrives here by existing.
  */
  if (answer === null) {
    return (
      <Card>
        <SectionTitle hint="yesterday">Out there</SectionTitle>
        <p className="flex items-start gap-2 text-md leading-snug" style={{ color: "var(--ink)" }}>
          <Footprints size={16} aria-hidden className="mt-1" />
          You spoke Estonian to somebody. That is the hard part, and it is what all of this is for.
        </p>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>How did it go?</p>
        {mishap}
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="How the conversation went">
          {HOW_IT_WENT.map((o) => (
            <button
              key={o}
              type="button"
              disabled={pending}
              onClick={() => report(o)}
              className="choice-btn min-h-[44px] rounded-full border px-4 py-2 text-sm"
            >
              {OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>
        {/*
          A WAY BACK, BECAUSE NOTHING HAS BEEN WRITTEN YET. The first press is
          one tap away from the other one, and a card with no way out of a
          mistaken yes is a card that records the wrong day rather than one
          that is corrected.
        */}
        <button
          type="button"
          disabled={pending}
          onClick={() => setSpoke(false)}
          className="tap-tint mt-2 rounded-md px-2 py-1 text-xs underline"
          style={{ color: "var(--ink-3)" }}
        >
          I pressed that by mistake
        </button>
      </Card>
    );
  }

  /*
    A day with nothing in it is answered with something small to do about it,
    and today's errand is that. It carries no buttons of its own: the report
    comes tomorrow, when there is something to report, which is the whole
    argument this card was rebuilt on.
  */
  if (!isConversation(answer)) {
    const scene = sceneForErrand(errand);
    return (
      <Card>
        <SectionTitle>{SAY_IT_TODAY}</SectionTitle>
        {/*
          A LINE THAT ONLY ANNOUNCES THE NEXT LINE SAYS NOTHING OF ITS OWN.
          "Then here is a small one for today." sat between the title and the
          errand and did no work: the title already says this is today's
          thing to say, and the errand itself is the small one. Removing it
          took the card from three sizes of text to two.
        */}
        <p className="text-md leading-snug" style={{ color: "var(--ink)" }}>{errand.says}</p>
        {/*
          The place reads as part of the errand rather than as a hint in the
          corner of the card. It sat in the SectionTitle's hint slot, which on
          every other card on Today holds a level or a count, so "A bus stop, a
          corridor" was a caption belonging to nothing.
        */}
        <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
          {errandPlaces(errand)}. The words are in{" "}
          <Link href={`/learn/${errand.unit}`} className="underline">{unitTitle}</Link>.
          {" "}Nobody will slow down for you, and that is the practice.
        </p>
        {/*
          The rehearsal, where the course has one. Situations plays this
          same encounter on somebody with an agenda of their own, and for a
          while the two never pointed at each other: the errand sent people
          to a word list and the scene ended in "have it again".
        */}
        {scene && (
          <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
            Not sure of the words? <Link href={`/situations/${scene.id}`} className="underline">Rehearse it first</Link>, then go.
          </p>
        )}
      </Card>
    );
  }

  /*
    THE COUNT INCLUDES THE ANSWER THAT WAS JUST GIVEN, AND EXACTLY ONCE.

    `conversations` is counted on the server and this reply renders straight
    away, so a learner reporting their first ever conversation would read
    "They understood you. That is the whole point of all of this." over "0 in
    the last 30 days" until `router.refresh()` landed: a zero directly under a
    confirmation of one, on the panel this app says it is measured by. So one
    is added for the answer the server has not seen yet.

    ADDED ONLY WHILE THE SERVER HAS NOT SEEN IT. `answered` is the prop and
    `answer` is the local state, and the two disagree exactly during the
    window the added one is for: before the press they are both null, and once
    `router.refresh()` lands the prop carries today's answer and the count
    behind it. Added unconditionally, the tally read one too many from that
    moment on, and a learner who opened Today after reporting yesterday
    evening was told they had held one more conversation than they had, which
    is the direction this card may not be wrong in.

    The sentence is built above the markup rather than inside it, because the
    caption cap in `lib/copy/readerCopy.test.ts` measures the run of text an
    element holds and a two-armed conditional written inline is one long run
    of it.
  */
  const held = conversations + (answered === null ? 1 : 0);
  const tally = held === 1
    ? `Your first in the last ${days} days.`
    : `That is ${held} in the last ${days} days.`;
  const next = NEXT[answer];

  return (
    <Card>
      <SectionTitle hint="yesterday">Out there</SectionTitle>
      <p className="flex items-start gap-2 text-md leading-snug" style={{ color: "var(--ink)" }}>
        <Footprints size={16} aria-hidden className="mt-1" /> {REPLY[answer]}
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
        {tally} <Link href="/progress" className="underline">Progress keeps the count</Link>.
      </p>
      {/*
        AND THEN ONE THING TO DO ABOUT IT, WHICH IS A REHEARSAL AND NOT AN
        ERRAND. A day that held a conversation is not a day to be handed
        homework (ADR-027 amendment 1), and a scene is the opposite of that:
        the same encounter played on somebody with an agenda of their own,
        where getting it wrong costs nothing. The line says why it is being
        offered, so it reads as an answer to what just happened rather than as
        a standing advertisement for another screen.
      */}
      {next && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
          {next}{" "}
          <Link href={rehearsal(errand)} className="underline">Rehearse one now</Link>.
        </p>
      )}
      {/*
        THE ONE THING WORTH KEEPING FROM A CONVERSATION IS THE WORD YOU
        REACHED FOR AND DID NOT HAVE, and this used to ask for it as "A word
        you did not have?" over an empty box. It was reported as a question
        nobody can answer, and that reading is right about the wording rather
        than about the thing: a learner cannot list what they missed, and
        everybody who has run out of words mid-sentence remembers the one they
        wanted. So it is asked as that memory, and the label says what the box
        will do with it.

        It goes to the dictionary search, which is where a word gets looked
        up, added to the deck or reported as missing, and it is stored nowhere
        on the way: /privacy says the answer and the day are kept and nothing
        else, and that stays true.
      */}
      <form action="/dictionary" method="get" className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="out-there-word" className="label-xs mb-1 block" style={{ color: "var(--ink-3)" }}>
            Was there a word you wanted and could not find?
          </label>
          <input
            id="out-there-word"
            name="q"
            placeholder="In English or Estonian"
            autoComplete="off"
            className="field w-full text-sm"
          />
        </div>
        <Button type="submit" size="sm">Look it up</Button>
      </form>
    </Card>
  );
}

/**
 * Where "rehearse one now" goes: the scene that rehearses today's errand
 * where the course has one, and the list where it does not.
 *
 * Resolved through `sceneForErrand` rather than from the errand's own field,
 * so a stale id fails `errands.test.ts` rather than rendering a link to a
 * conversation that is not there.
 */
function rehearsal(errand: Errand): string {
  const scene = sceneForErrand(errand);
  return scene ? `/situations/${scene.id}` : "/situations";
}

/*
  Only the answers that are a conversation. A day with nothing in it is
  answered with an errand rather than with a sentence, so there is nothing to
  say here about it, and an entry for it would be copy no screen can reach.

  None of the three is praise for a result. `UNDERSTOOD` names what happened
  and says what it was worth, `STUCK` says the thing this app exists to say
  and no other one will, and `SWITCHED` says what to do next time, because
  being answered in English is the figure Progress says to watch and is not a
  failure on the learner's part.
*/
const REPLY: Record<Conversation, string> = {
  UNDERSTOOD: "They understood you. That is the whole point of all of this.",
  STUCK: "Getting stuck is what learning a language out loud looks like. It still counts, and it is still on the board.",
  SWITCHED: "They switched. Answer in Estonian anyway next time, and most people come back.",
};

/*
  What to offer after each, or nothing. A conversation that went well needs no
  follow-up from us: the count is the answer and the card stops talking, which
  is the difference between a reply and a screen that always wants one more
  press. `null` rather than an empty string, so the one answer with nothing to
  say says so in the type rather than in a falsy value a reader has to test
  for.

  NEITHER LINE CLAIMS TO REPLAY YESTERDAY. The rehearsal offered is today's
  errand's scene, which is a conversation of its own and not the one the
  learner just had: this card never learns what that was. `STUCK` used to be
  answered with "The same conversation, where running out of words costs
  nothing", which is a promise the link cannot keep, and a learner who follows
  it into a different situation has caught the app being loose about the one
  thing it is claiming to help with.
*/
const NEXT: Record<Conversation, string | null> = {
  UNDERSTOOD: null,
  STUCK: "Running out of words costs nothing in a rehearsal, and somebody there is waiting for you to find them.",
  SWITCHED: "They can switch to English in there too, so you can practise coming back.",
};
