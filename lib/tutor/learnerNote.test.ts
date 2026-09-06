import { describe, expect, it } from "vitest";
import { buildSystemPrompt, learnerNote } from "./prompt";

/**
 * What Anu is told about the person asking, and what she is not.
 *
 * The note is the one place a learner's own figures reach the model, so it
 * has to name the case the way a class does, carry the numbers exactly, and
 * say nothing at all when there is nothing worth saying: an empty note is
 * the honest shape for somebody on their first evening, not a sentence about
 * having no data.
 */
describe("learnerNote", () => {
  it("names the weakest case in Estonian first with its figures", () => {
    const note = learnerNote({
      level: "A2",
      weakestCase: { grammCase: "PARTITIVE", accuracy: 58, total: 120 },
      unit: { title: "Kodu", subtitle: "Home", level: "A1" }, scene: null,
    });
    expect(note).toContain("Their level is A2.");
    expect(note).toContain("osastav (Partitive)");
    expect(note).toContain("right 58% of 120 times");
    expect(note).toContain('"Kodu" (Home) at A1');
    // Offered for when it is relevant, never as a refrain.
    expect(note).toMatch(/Do not raise it unprompted/);
  });

  it("still names the level when there is nothing else to say", () => {
    /*
      The level is the one line this block always carries, because it is the
      one fact about the learner the static prompt no longer holds: it moved
      here so the cached half stops varying per person. An empty note would
      take it with it.
    */
    const bare = learnerNote({ level: "B1", weakestCase: null, unit: null, scene: null });
    expect(bare).toBe("ABOUT THIS LEARNER\n- Their level is B1.");
  });

  it("drops a case key it cannot name rather than inventing a name", () => {
    const note = learnerNote({
      level: "B1",
      weakestCase: { grammCase: "NOT_A_CASE", accuracy: 10, total: 30 },
      unit: null, scene: null,
    });
    // The claim is that the unnameable case is dropped, not that the note is
    // empty: the level line is always there now (see above).
    expect(note).not.toMatch(/weakest case/);
    expect(note).not.toContain("NOT_A_CASE");
  });

  /*
    A tutor told "B1" and nothing else treats a guess and a measurement alike.
    The note says which it was, and for a measured check with uneven skills it
    says so, because a learner who reads at B2 and listens at A1 should not be
    spoken to at the average.
  */
  it("says how the level is known, and names uneven skills", () => {
    const measured = learnerNote({
      level: "B1", weakestCase: null, unit: null,
      standing: { source: "measured", skills: { reading: "B2", listening: "A1", writing: "B2" } },
    });
    expect(measured).toContain("measured by the level check (reading B2, listening A1, writing B2)");
    expect(measured).toContain("The skills are uneven");
    const even = learnerNote({
      level: "B1", weakestCase: null, unit: null,
      standing: { source: "measured", skills: { reading: "B1", listening: "B1", writing: "B1" } },
    });
    expect(even).not.toContain("uneven");
    const guessed = learnerNote({ level: "B1", weakestCase: null, unit: null, standing: { source: "estimated" } });
    expect(guessed).toContain("their own estimate rather than a measurement");
  });

  it("tells her what Estonian the learner already lives in, in the plan's own words", () => {
    const note = learnerNote({
      level: "A2", weakestCase: null, unit: null, situation: "live in Estonia and have Estonian at home",
    });
    expect(note).toContain("They live in Estonia and have Estonian at home");
    expect(note).toContain("point them at using it");
    expect(learnerNote({ level: "A2", weakestCase: null, unit: null, situation: null }))
      .not.toMatch(/point them at using it/);
  });

  /*
    THE CACHED HALF IS THE SAME BYTES FOR EVERY LEARNER, AND THAT IS THE WHOLE
    POINT OF SPLITTING IT.

    The first version of this test asserted one half of the property and wrote
    the breach of the other half into an assertion: it checked that the
    per-learner block stayed out of the static prompt, and then required the
    static prompt to contain "Their current level is B1", which is the string
    that gave every CEFR level its own cache entry. A prompt built for two
    different learners has to be byte-identical or the `cache_control`
    breakpoint in `callAnthropic` is marking a prefix that is not shared.
  */
  it("is the same static prompt for every learner, which is what makes it cacheable", () => {
    expect(buildSystemPrompt()).not.toContain("ABOUT THIS LEARNER");
    expect(buildSystemPrompt()).not.toMatch(/current level is/);
    expect(learnerNote({ level: "B1", weakestCase: null, unit: null })).toContain("level is B1");
  });
});
