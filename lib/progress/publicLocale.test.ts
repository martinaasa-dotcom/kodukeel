import { describe, expect, it, vi } from "vitest";

// The address names the language in every case below, so neither the cookie
// jar nor the session is ever reached; these stand in so importing the module
// needs no request and no database.
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => "nobody" }));
vi.mock("@/lib/progress/locale", () => ({ localeFor: async () => "en" }));

const { publicTitle } = await import("./publicLocale");

// A line /trust has carried since before the card existed, so the test reads
// the same on every branch that adds a page of its own.
const card = {
  description: "This page is for whoever decides whether Kodukeel is safe for a class, a team or a grant. The short answers come first, and each one takes you to the detail below.",
  path: "/trust",
};

describe("publicTitle", () => {
  it("leaves a page without a card to the root layout's description", async () => {
    const meta = await publicTitle(Promise.resolve({}), "Trust and security");
    expect(meta.description).toBeUndefined();
    expect(meta.openGraph).toBeUndefined();
  });

  it("gives a page with a card its own description and share card, pointing at itself", async () => {
    const meta = await publicTitle(Promise.resolve({}), "Trust and security", undefined, card);
    expect(meta.description).toBe(card.description);
    expect(meta.openGraph).toMatchObject({ url: "/trust", description: card.description, locale: "en_EE" });
    expect((meta.openGraph as { title?: string }).title).toBe("Trust and security | kodukeel");
  });

  it("writes the card in the language the page is drawn in", async () => {
    const meta = await publicTitle(Promise.resolve({ lang: "ru" }), "Trust and security", undefined, card);
    expect(meta.title).toBe("Доверие и безопасность");
    expect(meta.description).not.toBe(card.description);
    expect(meta.description).toMatch(/[а-я]/);
    expect(meta.openGraph).toMatchObject({ locale: "ru_EE", url: "/trust" });
  });
});
