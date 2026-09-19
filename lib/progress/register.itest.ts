import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { candidateFor, letterInputFor } from "./mailout";

/**
 * THE MONDAY REGISTER, AGAINST A DATABASE, BECAUSE BOTH OF ITS FAULTS WERE
 * QUERY SHAPES.
 *
 * Neither is visible in the arguments and neither is reachable from a unit
 * test. The first is which of somebody's groups the letter is about, which is
 * a `findFirst` and a `count` that have to ask the same question; the second
 * is who the figures are counted over, which is a `ClassroomMember` row the
 * owner holds and every roster therefore counts.
 *
 * WHAT MAKES THE FIRST ONE WORTH A TEST IS THAT IT FAILS SILENTLY. A gathering
 * that answers null is skipped before a send is ever booked, so a teacher owed
 * a register simply never received one, every Monday, with nothing in the log
 * and no row to notice.
 */

const TEACHER = "itest-owner-register";
const PUPIL = "itest-pupil-register";
const LEMMA = "zzregister";

/** Monday morning where the process is, which is the window the register opens in. */
const MONDAY = new Date("2026-09-14T08:00:00.000Z");

async function wipe() {
  await prisma.classroom.deleteMany({ where: { ownerId: TEACHER } });
  await prisma.review.deleteMany({ where: { ownerId: { in: [TEACHER, PUPIL] } } });
  await prisma.card.deleteMany({ where: { ownerId: { in: [TEACHER, PUPIL] } } });
  await prisma.setting.deleteMany({ where: { ownerId: { in: [TEACHER, PUPIL] } } });
  await prisma.emailSend.deleteMany({ where: { ownerId: TEACHER } });
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

/**
 * A class the teacher owns, with the member row `createClassroom` gives them
 * and however many pupils are asked for.
 *
 * The owner's own membership is the whole point of the fixture: it is what
 * every roster counts and what the letter may not.
 */
async function classroom(name: string, code: string, pupils: readonly string[]) {
  return prisma.classroom.create({
    data: {
      name,
      code,
      ownerId: TEACHER,
      members: {
        create: [
          { ownerId: TEACHER, role: "TEACHER", displayName: "The teacher" },
          ...pupils.map((ownerId) => ({ ownerId, role: "STUDENT", displayName: ownerId })),
        ],
      },
    },
    select: { id: true },
  });
}

async function reviewedOn(ownerId: string, at: Date, lexemeId: string) {
  await prisma.review.create({
    data: {
      ownerId,
      lexemeId,
      cardId: `${ownerId}-${at.toISOString()}`,
      rating: 3,
      reviewedAt: at,
      stateBefore: 2,
      durationMs: 3000,
    },
  });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("which group the register is about", () => {
  it("is one with somebody in it, not simply the oldest they own", async () => {
    /*
      The fault this is written for. `candidateFor` asks whether any group of
      theirs holds a member besides them, and the gathering used to take the
      oldest group by id: a teacher who ran a class last term and opened a new
      one this term was decided owed a register, and then the gathering picked
      the empty old one and answered null. Both halves ask the same question
      now, so the two can no longer name different groups.
    */
    await classroom("Last term", "ZZAAA1", []);
    const full = await classroom("This term", "ZZAAA2", [PUPIL]);

    const built = await letterInputFor(TEACHER, "classroom", "https://example.test", MONDAY);
    expect(built?.kind).toBe("classroom");
    expect(built && built.kind === "classroom" && built.input.groupName).toBe("This term");
    expect(full.id).toBeTruthy();
  });

  it("and the decision agrees, rather than owing a letter nothing can build", async () => {
    await classroom("Empty", "ZZAAA3", []);
    const who = await candidateFor(TEACHER, MONDAY);
    // An owner alone in every group they own runs no group worth a register.
    expect(who.runsGroup).toBe(false);
  });
});

describe("who the register counts", () => {
  it("leaves the teacher out of their own class", async () => {
    /*
      `createClassroom` writes the owner a `ClassroomMember` row, so
      `classRoster` counts them: a class of one pupil read two, and a teacher
      who studied that morning was counted among those who practised. On the
      board that is right, since a list you are in has your row in it; in a
      count about the people you teach it is not.
    */
    await classroom("Mine", "ZZAAA4", [PUPIL]);
    const word = await prisma.lexeme.create({
      data: { lemma: LEMMA, pos: "NOUN", translation: `${LEMMA} in English` },
    });
    // The teacher studies and the pupil does not, which is what separates the
    // two readings: the roster would report one active member and one answer.
    await reviewedOn(TEACHER, new Date("2026-09-10T09:00:00.000Z"), word.id);

    const built = await letterInputFor(TEACHER, "classroom", "https://example.test", MONDAY);
    expect(built?.kind).toBe("classroom");
    if (!built || built.kind !== "classroom") throw new Error("no register built");

    expect(built.input.members).toBe(1);
    expect(built.input.active).toBe(0);
    expect(built.input.reviews).toBe(0);
    // And the drawing agrees with the sentence, which is the same claim again.
    expect(built.input.week.filter((d) => d.studied)).toHaveLength(0);
  });

  it("counts a pupil's week over the days the strip draws", async () => {
    await classroom("Mine", "ZZAAA5", [PUPIL]);
    const word = await prisma.lexeme.create({
      data: { lemma: LEMMA, pos: "NOUN", translation: `${LEMMA} in English` },
    });
    await reviewedOn(PUPIL, new Date("2026-09-10T09:00:00.000Z"), word.id);
    await reviewedOn(PUPIL, new Date("2026-09-11T09:00:00.000Z"), word.id);

    const built = await letterInputFor(TEACHER, "classroom", "https://example.test", MONDAY);
    if (!built || built.kind !== "classroom") throw new Error("no register built");

    expect(built.input.members).toBe(1);
    expect(built.input.active).toBe(1);
    expect(built.input.reviews).toBe(2);
    expect(built.input.week.filter((d) => d.studied)).toHaveLength(2);
  });
});
