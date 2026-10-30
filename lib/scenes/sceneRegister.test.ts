import { describe, expect, it } from "vitest";
import { LESSONS } from "@/lib/course/lessons";
import { PREVIEW_LESSONS } from "@/lib/course/lessons/preview";
import { LESSON_SCENES } from "./lessonScenes";

/**
 * WHAT A LESSON SAYS ABOUT WHO SAYS WHICH "YOU" IS TRUE OF ITS CONVERSATION.
 *
 * A scene holds one register and a beat may hold its own (`BeatSpec.register`),
 * which is what the gate keeps that beat's lines to. The B1 exam's lesson told
 * the learner that the other candidate says {sina}, and its role card said the
 * same, while the scene was `teie` from end to end: so the banked part-two
 * line asked "Mida te arvate?" of somebody who had just been taught to answer
 * "sul on õigus". A claim like that is prose and the register is data, so this
 * reads the one against the other: where the host lesson's explanation, the
 * role card or a beat's own text says somebody says a pronoun the scene does
 * not hold, some beat has to be registered in it.
 */
const SAYS = /(?<!never |not )\b(?:says|uses|calls you)\s+\{(sina|teie)\}/gu;

function claims(text: string): ("sina" | "teie")[] {
  return [...text.matchAll(SAYS)].map((m) => m[1] as "sina" | "teie");
}

describe("a lesson scene's register", () => {
  const lessons = new Map([...LESSONS, ...PREVIEW_LESSONS].map((l) => [l.id, l]));

  it("registers a beat in the pronoun its lesson says somebody uses", () => {
    const wrong: string[] = [];
    let seen = 0;
    for (const scene of LESSON_SCENES) {
      const lesson = scene.lesson ? lessons.get(scene.lesson) : undefined;
      const how = lesson?.how;
      const texts = [
        scene.role,
        ...scene.beats.flatMap((b) => [b.they ?? "", b.meanwhile ?? "", b.goal]),
        how?.point ?? "",
        how?.watchOut ?? "",
        ...(how?.notes ?? []),
      ];
      for (const pronoun of new Set(texts.flatMap(claims))) {
        seen += 1;
        if (pronoun === scene.register) continue;
        if (!scene.beats.some((b) => b.register === pronoun)) wrong.push(`${scene.id}: its lesson says somebody says {${pronoun}}, and no beat is registered ${pronoun}`);
      }
    }
    expect(seen, "claims about who says which you").toBeGreaterThan(0);
    expect(wrong).toEqual([]);
  });
});

/**
 * The scene screen prints a role card, a goal and a stage direction as text
 * (`t(scene.role)` in `SceneSession`), not through the lesson's brace reader,
 * so a brace there reaches the learner as a brace. A brace that names a slot
 * on the card is the one exception, since the screen fills it in.
 */
describe("a lesson scene's screen copy", () => {
  it("holds no brace but a slot", () => {
    const stray: string[] = [];
    for (const scene of LESSON_SCENES) {
      const slots = new Set(scene.props.map((p) => p.slot));
      const lines = [scene.title, scene.place, scene.role, ...scene.beats.flatMap((b) => [b.goal, b.they ?? "", b.meanwhile ?? ""])];
      for (const line of lines) {
        for (const m of line.matchAll(/\{([^}]*)\}/gu)) if (!slots.has(m[1]!)) stray.push(`${scene.id}: ${line}`);
      }
    }
    expect(stray).toEqual([]);
  });
});
