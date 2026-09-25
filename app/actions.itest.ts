import { describe, expect, it, vi } from "vitest";

/**
 * Integration tests: these need a real Postgres.
 *
 *   npm run test:db
 *
 * Every export of `app/actions.ts` is a public endpoint and its arguments are
 * JSON off the wire whatever the types say. Each call here sends the shape a
 * forged request can send and asks for a refusal rather than a throw, which
 * the framework answers with a 500, or a write the caller did not mean.
 * With no Supabase keys the owner is the one local learner (ADR-013).
 */
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const actions = await import("./actions");

describe("a server action given the wrong shape", () => {
  it("does not read the string \"false\" as switching a letter on", async () => {
    const result = await actions.setEmailKind({ kind: "wordday", on: "false" as unknown as boolean });
    expect(result.ok).toBe(false);
  });

  it("refuses rather than throws on a non-string or non-array argument", async () => {
    expect((await actions.deleteMyAccount(1 as unknown as string)).ok).toBe(false);
    expect((await actions.replayGrades({} as unknown as [])).ok).toBe(false);
    expect((await actions.setCardSuspended("nobody", "x" as unknown as boolean)).ok).toBe(false);
  });

  it("refuses a paper carrying more answers than any paper has questions", async () => {
    const responses = Object.fromEntries(
      Array.from({ length: 5_000 }, (_, i) => [`k${i}`, { kind: "blank" }]),
    );
    const result = await actions.submitExam({ level: "B1", seed: "s", startedAt: 0, responses });
    expect(result.ok).toBe(false);
  });
});
