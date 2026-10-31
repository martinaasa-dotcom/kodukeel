import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { forgetSettings, SETTING_KEYS, writeSetting } from "@/lib/settings/store";
import { PROGRAMMES } from "@/lib/course";
import { forgetRehoming, moduleReached } from "./course";
import { learnerScopeSoFar } from "./moduleScope";

/**
 * A PART'S FIRST EVENING, BEFORE ANYTHING IN IT IS TICKED, IS STILL THE MODULE.
 *
 * The hold was read off the part in play alone, so a learner who had passed a
 * check and moved on was held to nothing until they ticked the new part's
 * first lesson: Review and Practice asked what no evening had taught. A tick
 * anywhere is a learner following the module; none anywhere is somebody who
 * never opened it, who is untouched.
 */

const OWNER = "itest-owner-module-reached";
const b1 = PROGRAMMES.filter((p) => p.level === "B1");

async function wipe() {
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
  forgetSettings(OWNER);
  forgetRehoming();
}

beforeEach(wipe);
afterAll(wipe);

describe("where a learner stands on a part they have not started", () => {
  it("holds them to the parts before it, and to nothing of the new one", async () => {
    const day = b1[0]!.days.at(-1)!;
    await prisma.courseStep.create({ data: { ownerId: OWNER, programmeId: b1[0]!.id, dayId: day.id, stepId: day.steps[0]!.id } });
    await writeSetting(OWNER, SETTING_KEYS.programme, b1[1]!.id);
    const reached = await moduleReached(OWNER);
    expect(reached?.programme.id).toBe(b1[1]!.id);
    expect(reached?.day.id).toBe(b1[1]!.days[0]!.id);
    expect(reached?.entered).toBe(false);
    const scope = await learnerScopeSoFar(OWNER);
    expect(scope).not.toBeNull();
    // The last lesson of the part before is taught; the first of the new one is not yet.
    for (const w of day.words) expect(scope!.lemmas, w).toContain(w);
    const fresh = b1[1]!.days[0]!.words.filter((w) => !PROGRAMMES.slice(0, PROGRAMMES.indexOf(b1[1]!)).some((p) => p.days.some((d) => d.words.includes(w))));
    expect(fresh.length).toBeGreaterThan(0);
    for (const w of fresh) expect(scope!.lemmas, w).not.toContain(w);
  });

  it("leaves a learner who never ticked anything untouched", async () => {
    await writeSetting(OWNER, SETTING_KEYS.programme, b1[1]!.id);
    expect(await moduleReached(OWNER)).toBeNull();
    expect(await learnerScopeSoFar(OWNER)).toBeNull();
  });
});
