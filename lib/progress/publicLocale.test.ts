import { describe, expect, it, vi } from "vitest";

// The address names the language in every case below, so neither the cookie
// jar nor the session is ever reached; these stand in so importing the module
// needs no request and no database.
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => "nobody" }));
vi.mock("@/lib/progress/locale", () => ({ localeFor: async () => "en" }));

const { publicTitle } = await import("./publicLocale");

const card = {
  description: "Put a code on the board. See who is practising and what the group keeps getting wrong.",
  path: "/teachers",
};

describe("publicTitle", () => {
  it("leaves a page without a card to the root layout's description", async () => {
    const meta = await publicTitle(Promise.resolve({}), "For teachers");
    expect(meta.description).toBeUndefined();
    expect(meta.openGraph).toBeUndefined();
  });

  it("gives a page with a card its own description and share card, pointing at itself", async () => {
    const meta = await publicTitle(Promise.resolve({}), "For teachers", undefined, card);
    expect(meta.description).toBe(card.description);
    expect(meta.openGraph).toMatchObject({ url: "/teachers", description: card.description, locale: "en_EE" });
    expect((meta.openGraph as { title?: string }).title).toBe("For teachers | kodukeel");
  });

  it("writes the card in the language the page is drawn in", async () => {
    const meta = await publicTitle(Promise.resolve({ lang: "ru" }), "For teachers", undefined, card);
    expect(meta.title).toBe("Для преподавателей");
    expect(meta.description).not.toBe(card.description);
    expect(meta.description).toMatch(/[а-я]/);
    expect(meta.openGraph).toMatchObject({ locale: "ru_EE", url: "/teachers" });
  });
});
