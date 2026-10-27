/**
 * TODAY'S CHAT: WHEN IT IS OFFERED, WHO IT IS WITH, AND WHAT IT REMEMBERS
 * (docs/41-fifth-batch.md, VB-11).
 *
 * The half of the chat that is not a database read, held without one. The
 * rule the work order puts first is the keyless one: a deployment with no
 * model never shows the chat, because the bank cannot hold lines for words
 * nobody knew in advance.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROGRAMMES, newWordsIn } from "@/lib/course";
import { scopeFor } from "@/lib/course/scope";
import { PROVIDER_KEY_ENV } from "@/lib/tutor/provider";
import { PERSONAS } from "@/lib/scenes/personas";
import { CHAT_MIN_NEW } from "@/lib/scenes/specs/chat";
import { chatDayOf, chatFits, chatOffered, chatPersona, chatSceneOf, firstSense, memoryFrom, readChatPlan, rememberedFor } from "./chat";
import { finishedEvening } from "./chatDay";
import type { CourseReading } from "./course";

beforeEach(() => {
  for (const key of PROVIDER_KEY_ENV) vi.stubEnv(key, "");
  vi.stubEnv("PAID_OFF", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// The first part built from units: A1 to B1 are the lessons, which end on their own conversation.
const PROGRAMME = PROGRAMMES.find((p) => !p.days[0]?.lesson)!;
const RICH = PROGRAMME.days.find((day) => newWordsIn(day) >= CHAT_MIN_NEW)!;
// An evening of units with too few new words; built from a rich one, since B2 up rarely has one.
const THIN = { ...RICH, words: RICH.words.slice(0, CHAT_MIN_NEW - 1), again: [] };
const LESSON = PROGRAMMES[0]!.days.find((day) => newWordsIn(day) >= CHAT_MIN_NEW)!;

describe("whether a chat is offered", () => {
  it("never on a deployment with no model", () => {
    expect(chatOffered()).toBe(false);
    expect(chatFits(RICH)).toBe(false);
  });

  it("where the scene chain has a model, after an evening of at least three new words", () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    expect(chatOffered()).toBe(true);
    expect(chatFits(RICH)).toBe(true);
    expect(chatFits(THIN)).toBe(false);
    // A lesson ends on its own Say it, so no chat follows it.
    expect(LESSON.lesson).toBeTruthy();
    expect(chatFits(LESSON)).toBe(false);
  });

  it("and not where scenes are switched off, which is the switch the operator reaches for", () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("PAID_OFF", "scenes");
    expect(chatOffered()).toBe(false);
    expect(chatFits(RICH)).toBe(false);
  });

  it("and not on a deployment whose only key is one the scene chain does not use", () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    expect(chatOffered()).toBe(false);
  });
});

describe("who the chat is with", () => {
  it("is always the same person for one learner, and somebody friendly", () => {
    const one = chatPersona("learner-a");
    expect(chatPersona("learner-a").id).toBe(one.id);
    expect(one.translates && one.acknowledges).toBe(true);
    const many = new Set(Array.from({ length: 40 }, (_, i) => chatPersona(`learner-${i}`).id));
    expect(many.size).toBeGreaterThan(1);
    for (const id of many) expect(PERSONAS.map((p) => p.id)).toContain(id);
  });
});

describe("what it remembers, derived from the runs", () => {
  const run = (words: string[], turns: unknown[]) => JSON.stringify({
    chat: { programmeId: "a1.1", dayId: "x", unitId: "u", words: words.map((lemma) => ({ lemma, gloss: `${lemma} meaning` })) },
    turns,
  });

  it("knows every word the two of them have talked about", () => {
    const memory = memoryFrom([run(["a", "b"], []), run(["c"], [])]);
    expect([...memory.talked].sort()).toEqual(["a", "b", "c"]);
  });

  it("remembers the meaning of a word used well last time, and never the learner's words", () => {
    const memory = memoryFrom([
      run(["a", "b"], [
        { beatId: "greet", reading: "complete", met: [true], helped: false, said: "Tere" },
        { beatId: "word-1", reading: "complete", met: [true], helped: false, slips: [{ kind: "spelling" }], said: "aa" },
        { beatId: "word-2", reading: "complete", met: [true], helped: false, said: "bbb" },
      ]),
    ]);
    expect(memory.remembered).toEqual(["b meaning"]);
    expect(JSON.stringify(memory)).not.toContain("bbb");
  });

  it("opens on a meaning that is not one of today's words, or on none", () => {
    const memory = { talked: new Set<string>(), remembered: ["to be", "to live"] };
    expect(rememberedFor(memory, [{ lemma: "olema", gloss: "to be" }, { lemma: "see", gloss: "this" }])).toBe("to live");
    expect(rememberedFor(memory, [{ lemma: "olema", gloss: "to be" }, { lemma: "elama", gloss: "to live" }])).toBeNull();
    expect(rememberedFor(memory, [{ lemma: "see", gloss: "this" }])).toBe("to be");
  });

  it("remembers nothing used with help, a judge or a second word", () => {
    for (const extra of [{ helped: true }, { conceded: [0] }, { substituted: [0] }]) {
      const memory = memoryFrom([run(["a"], [{ beatId: "word-1", reading: "complete", met: [true], helped: false, ...extra }])]);
      expect(memory.remembered).toEqual([]);
    }
  });

  it("reads only the newest chat for the opening, and a broken row as nothing", () => {
    const memory = memoryFrom([
      "{not json",
      run(["a"], [{ beatId: "word-1", reading: "complete", met: [true], helped: false }]),
    ]);
    expect(memory.remembered).toEqual([]);
    expect(memory.talked.has("a")).toBe(true);
  });
});

describe("which evening a finished chat was about", () => {
  it("is read off the run's own draw, and nothing else counts as an evening", () => {
    expect(chatDayOf(JSON.stringify({ chat: { dayId: "a1.1-03", words: [] } }))).toBe("a1.1-03");
    expect(chatDayOf(JSON.stringify({ chat: { dayId: 3 } }))).toBeNull();
    expect(chatDayOf(JSON.stringify({ persona: "x" }))).toBeNull();
    expect(chatDayOf("not json")).toBeNull();
  });
});

describe("a stored chat plan", () => {
  it("is read defensively, and rebuilt as a scene held to what the evenings taught", () => {
    expect(readChatPlan(null)).toBeNull();
    expect(readChatPlan({ programmeId: "x", dayId: "y", unitId: "z", words: [] })).toBeNull();
    const plan = readChatPlan({
      programmeId: PROGRAMME.id, dayId: RICH.id, unitId: RICH.unitId,
      words: [{ lemma: RICH.words[0], gloss: "one" }, { lemma: 7 }], remembered: 3,
    })!;
    expect(plan.words).toHaveLength(1);
    expect(plan.remembered).toBeNull();
    const scene = chatSceneOf(plan);
    for (const lemma of scopeFor(PROGRAMME, RICH).lemmas) expect(scene.lemmas).toContain(lemma);
  });

  it("still builds on its own words where the course no longer holds its evening", () => {
    const scene = chatSceneOf({ programmeId: "gone", dayId: "gone", unitId: "u", words: [{ lemma: "kohv", gloss: "coffee" }], remembered: null });
    expect(scene.lemmas).toContain("kohv");
  });
});

describe("the evening a chat is about", () => {
  const reading = (over: Partial<CourseReading>): CourseReading => ({
    programme: PROGRAMME, current: null, daysDone: 0, upcoming: null, finished: false,
    finishedToday: false, eveningDoneToday: false, started: true, eveningsInARow: 0, ...over,
  });

  it("is the evening finished today, never the one after it", () => {
    const third = PROGRAMME.days[2]!;
    const current = { day: third, done: new Set<string>(), complete: false, next: null } as unknown as CourseReading["current"];
    expect(finishedEvening(PROGRAMME, reading({ eveningDoneToday: true, current }))?.id).toBe(PROGRAMME.days[1]!.id);
    expect(finishedEvening(PROGRAMME, reading({ eveningDoneToday: false, current }))).toBeNull();
  });

  it("is the last evening of a part somebody has just finished", () => {
    expect(finishedEvening(PROGRAMME, reading({ eveningDoneToday: true, finished: true }))?.id)
      .toBe(PROGRAMME.days[PROGRAMME.days.length - 1]!.id);
  });
});

describe("a gloss as an objective names it", () => {
  it("takes the first sense", () => {
    expect(firstSense("coffee, a coffee; brew")).toBe("coffee");
  });
});
