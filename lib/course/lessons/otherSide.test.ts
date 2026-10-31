import { describe, expect, it } from "vitest";

import { LESSONS } from "./index";
import { normalisePhrase } from "./ledger";
import { otherSideOf, STAND_IN } from "./otherSide";
import type { LessonSpec } from "./types";

const byId = (id: string) => {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson ${id}`);
  return l;
};

/** Every question about yourself a lesson asks, and the faster one. */
const answerAsks = (l: LessonSpec) => [...l.answers.map((p) => p.ask?.et), l.faster?.ask.et].filter((et): et is string => !!et);

describe("who the learner talks to on Say it", () => {
  it("is said by every role-play, as a speaker of its cast who is not the learner's stand-in", () => {
    const withPlay = LESSONS.filter((l) => l.roleplay);
    expect(withPlay.length).toBeGreaterThan(20);
    for (const l of withPlay) {
      const who = l.roleplay!.who;
      expect(who, `${l.id} has a role-play and does not say who it is with`).toBeTruthy();
      expect(who).not.toBe(STAND_IN);
      expect(Object.keys(l.cast), `${l.id}'s role-play partner is not in its cast`).toContain(who);
    }
  });

  it("names the person each B1 role-play is with, from the scene rather than the order of speakers", () => {
    const partners = Object.fromEntries(LESSONS.filter((l) => l.id.startsWith("b1") && l.roleplay).map((l) => [l.id, otherSideOf(l).partner]));
    expect(partners).toEqual({
      "b1-07-repair": "Rein",
      "b1-14-colleague": "Kadri",
      "b1-21-pay": "Kristi",
      "b1-28-deposit": "Peeter",
      "b1-35-residents": "Helgi",
      // A colleague who wants to work from home: Kadri. Kristi is the manager.
      "b1-42-disagree": "Kadri",
      "b1-49-end": "Merike",
    });
  });

  it("voices a role-play in its partner's voice, not the opener's", () => {
    const meeting = byId("b1-42-disagree");
    const side = otherSideOf(meeting);
    expect(side.voiceOf(side.partner)).toBe(meeting.cast.Kadri);
    expect(side.voiceOf(side.partner)).not.toBe(meeting.cast.Kristi);
  });

  it("voices an ask that is a whole line by whoever said it", () => {
    let traced = 0;
    for (const l of LESSONS) {
      for (const et of answerAsks(l)) {
        const line = l.conversation.find((c) => c.et && c.who !== STAND_IN && normalisePhrase(c.et) === normalisePhrase(et));
        if (!line) continue;
        traced++;
        expect(otherSideOf(l).askerOf(et), `${l.id}: "${et}"`).toBe(line.who);
      }
    }
    expect(traced).toBeGreaterThan(5);
  });

  it("voices an ask cut from part of a line by whoever said that line, not by a radio or a recording", () => {
    expect(otherSideOf(byId("b1-32-news")).askerOf("Kas keegi sai vigastada?")).toBe("Jaan");
    expect(otherSideOf(byId("b1-47-phone")).askerOf("Kas jätate sõnumi?")).toBe("Kaja");
    // And the other questions are asked by somebody in the conversation, not by the newsreader.
    expect(otherSideOf(byId("b1-32-news")).askerOf("Mis uudistes on?")).not.toBe("Raadio");
  });

  it("finds every ask that is one sentence of somebody's line, across the course", () => {
    let checked = 0;
    for (const l of LESSONS) {
      const side = otherSideOf(l);
      for (const et of answerAsks(l)) {
        const owner = l.conversation.find((c) => c.et && c.who !== STAND_IN && c.et.split(/(?<=[.!?…])\s+/u).some((s) => normalisePhrase(s) === normalisePhrase(et)));
        if (!owner) continue;
        checked++;
        expect(side.askerOf(et), `${l.id}: "${et}"`).toBe(owner.who);
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("never voices anything in the stand-in's voice, a monologue of his included", () => {
    let checked = 0;
    for (const l of LESSONS) {
      const side = otherSideOf(l);
      for (const et of answerAsks(l)) {
        checked++;
        const voice = side.voiceOf(side.askerOf(et));
        expect(voice, `${l.id}: "${et}"`).toBeTruthy();
        if (l.cast[STAND_IN]) expect(voice, `${l.id}: "${et}"`).not.toBe(l.cast[STAND_IN]);
      }
    }
    expect(checked).toBeGreaterThan(100);
    const message = byId("b1-23-bright-room");
    expect(otherSideOf(message).partner).toBeNull();
    // A voice message left for Mari is answered in a voice nobody in its cast has, which is Mari's own.
    expect(otherSideOf(message).voiceOf(otherSideOf(message).askerOf("Kus sa elad?"))).toBe("mari");
  });

  it("never names Tom while anybody else is in the conversation", () => {
    for (const l of LESSONS) if (l.conversation.some((c) => c.who !== STAND_IN)) expect(otherSideOf(l).partner).not.toBe(STAND_IN);
  });
});
