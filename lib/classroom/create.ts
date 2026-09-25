import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { generateCode } from "./code";

export interface NewClassroom {
  readonly name: string;
  readonly ownerId: string;
  readonly kind: string;
  readonly targetLevel: string;
  readonly displayName: string;
}

/*
  A JOIN CODE IS CLAIMED BY THE INSERT, NOT BY A LOOK BEFORE IT.

  Asking whether a code is free and then creating the class with it is
  check-then-act: two teachers dealt the same code inside that gap both see it
  free, and the second insert fails on the unique index, which the Server Action
  answered with a 500 and a digest rather than a class. The unique index is
  what actually decides, so the insert is the attempt and a violation of it is
  the cue to deal another code. The class and its teacher's membership are one
  statement, so a lost attempt leaves nothing behind.
*/
export async function createWithFreshCode(
  input: NewClassroom,
  attempts: number,
  generate: () => string = generateCode,
): Promise<{ id: string; code: string } | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const code = generate();
    try {
      const classroom = await prisma.classroom.create({
        data: {
          name: input.name, code, ownerId: input.ownerId, kind: input.kind, targetLevel: input.targetLevel,
          members: { create: { ownerId: input.ownerId, role: "TEACHER", displayName: input.displayName } },
        },
        select: { id: true },
      });
      return { id: classroom.id, code };
    } catch (error) {
      // A new class cannot collide on its member row, so a unique violation is the code.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return null;
}
