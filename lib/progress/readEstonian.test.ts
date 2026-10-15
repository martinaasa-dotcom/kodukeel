import { describe, expect, it, vi } from "vitest";

/*
  READING MODE STORES NOTHING (docs/38-third-batch.md, D13).

  The action is driven against a database that records every write it is
  asked for and answers every read with nothing, so whatever the dictionary
  lookups do, a write of any kind fails here. The learner's text is the one
  thing a page like this could be tempted to keep, and the claim on the
  screen is that it does not.
*/
const writes: string[] = [];
const WRITE = /^(create|update|upsert|delete)|^\$execute/i;
const model = (name: string) => new Proxy({}, {
  get: (_t, method: string) => (...args: unknown[]) => {
    if (WRITE.test(method)) writes.push(`${name}.${method}`);
    void args;
    if (method === "findUnique" || method === "findFirst") return Promise.resolve(null);
    if (method === "count") return Promise.resolve(0);
    return Promise.resolve([]);
  },
});
const prisma: Record<string, unknown> = new Proxy({}, {
  get: (_t, key: string) => {
    if (key === "$transaction") return (fn: unknown) => (typeof fn === "function" ? fn(prisma) : Promise.all(fn as Promise<unknown>[]));
    if (key.startsWith("$")) return (...args: unknown[]) => {
      void args;
      if (WRITE.test(key)) writes.push(key);
      return Promise.resolve([]);
    };
    return model(key);
  },
});
vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => "itest-reader", currentUserId: async () => "itest-reader" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));

const { readEstonian } = await import("@/app/actions");

describe("reading mode", () => {
  it("glosses a pasted text and writes nothing anywhere", async () => {
    const result = await readEstonian("Tere! Ma loen ajalehte.\n\nSee on teine lõik.");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paragraphs.map((p) => p.map((s) => s.sentence))).toEqual([["Tere!", "Ma loen ajalehte."], ["See on teine lõik."]]);
    // Joining the tokens gives the sentence back: nothing pasted is edited.
    for (const s of result.paragraphs.flat()) expect(s.tokens.map((t) => t.text).join("")).toBe(s.sentence);
    expect(writes).toEqual([]);
  });

  it("refuses an empty paste and anything that is not text, and still writes nothing", async () => {
    expect((await readEstonian("   ")).ok).toBe(false);
    expect((await readEstonian(42)).ok).toBe(false);
    expect(writes).toEqual([]);
  });
});
