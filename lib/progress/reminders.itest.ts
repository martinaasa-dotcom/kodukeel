import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { deleteOwnReminder } from "./reminders";

/**
 * The calendar's bin, against a database, because the rule is a `where` clause.
 *
 * A reminder the learner wrote is theirs to delete; homework a class set is
 * not, and on the teacher's own copy it is the only record of what the class
 * was sent. The rows below are written exactly the way `addReminder`,
 * `assignUnit` and `assignHomework` write them.
 */

const MINE = "itest-owner-reminders";
const THEIRS = "itest-owner-reminders-other";

async function wipe() {
  await prisma.task.deleteMany({ where: { ownerId: { in: [MINE, THEIRS] } } });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("deleteOwnReminder", () => {
  it("deletes a reminder the learner wrote, with notes or without", async () => {
    const plain = await prisma.task.create({ data: { ownerId: MINE, title: "Buy a textbook" } });
    const noted = await prisma.task.create({
      data: { ownerId: MINE, title: "Call the school", notes: "Ask about the evening course" },
    });

    expect(await deleteOwnReminder(MINE, plain.id)).toBe(true);
    expect(await deleteOwnReminder(MINE, noted.id)).toBe(true);
    expect(await prisma.task.count({ where: { ownerId: MINE } })).toBe(0);
  });

  it("leaves homework a class set exactly where it was", async () => {
    const homework = await prisma.task.create({
      data: {
        ownerId: MINE, title: "Page 42", tag: "HOMEWORK",
        notes: "Set by Tuesday evening group. Exercises 3 and 4.",
      },
    });
    const unit = await prisma.task.create({
      data: {
        ownerId: MINE, title: "Kodu, at home", tag: "VOCABULARY",
        notes: "Set by Tuesday evening group. Open the unit on the learning path, add its words and review them.",
      },
    });

    expect(await deleteOwnReminder(MINE, homework.id)).toBe(false);
    expect(await deleteOwnReminder(MINE, unit.id)).toBe(false);
    expect(await prisma.task.count({ where: { ownerId: MINE } })).toBe(2);
  });

  it("never reaches another learner's reminder", async () => {
    const theirs = await prisma.task.create({ data: { ownerId: THEIRS, title: "Not yours" } });
    expect(await deleteOwnReminder(MINE, theirs.id)).toBe(false);
    expect(await prisma.task.count({ where: { ownerId: THEIRS } })).toBe(1);
  });
});
