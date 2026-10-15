import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// The address names the language in every case below, so neither the cookie
// jar nor the session is ever reached; these stand in so importing the module
// needs no request and no database.
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => "nobody" }));
vi.mock("@/lib/progress/locale", () => ({ localeFor: async () => "en" }));

const { publicTitle, SHARE_IMAGE } = await import("./publicLocale");

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

  it("keeps the share picture a page would otherwise lose by naming its own card", async () => {
    const meta = await publicTitle(Promise.resolve({}), "Trust and security", undefined, card);
    expect((meta.openGraph as { images?: unknown[] }).images).toEqual([SHARE_IMAGE]);
    expect((meta.twitter as { images?: unknown[] }).images).toEqual([SHARE_IMAGE]);
  });

  it("names the picture at the size and with the words its route draws", () => {
    const route = readFileSync("app/opengraph-image.tsx", "utf8");
    expect(route).toContain(`width: ${SHARE_IMAGE.width}, height: ${SHARE_IMAGE.height}`);
    expect(route).toContain(`alt = "${SHARE_IMAGE.alt}"`);
  });
});

/*
  EVERY PUBLIC PAGE SHARES ITSELF. The paths are read off the sitemap's own
  list, so a page added there without a card of its own fails here rather than
  sharing the landing page's pitch pointing at /welcome. The landing page is the
  one exception, since the root layout's card is its card.
*/
const { PUBLIC_CARDS, publicCard } = await import("@/lib/copy/publicCards");
const { entryMetadata } = await import("@/app/(chromeless)/welcome/entryMetadata");

const sitemapPaths = [...readFileSync("app/sitemap.ts", "utf8").matchAll(/\{ path: "([^"]+)", priority/g)].map((m) => m[1]!);
const englishOnly = new Set(["/pilots", "/how-we-know", "/curriculum"]);

describe("every public page has a share card of its own", () => {
  it("reads the paths it checks from the sitemap", () => {
    expect(sitemapPaths.length).toBeGreaterThanOrEqual(12);
    expect(sitemapPaths).toContain("/welcome");
  });

  for (const path of sitemapPaths.filter((p) => p !== "/welcome")) {
    it(`${path} shares its own description at its own address, with the picture`, async () => {
      if (path === "/welcome/ru" || path === "/welcome/uk") {
        const meta = entryMetadata(path.endsWith("ru") ? "ru" : "uk");
        expect(meta.openGraph).toMatchObject({ url: path, description: meta.description });
        expect((meta.openGraph as { images?: unknown[] }).images).toEqual([SHARE_IMAGE]);
        return;
      }
      expect(Object.keys(PUBLIC_CARDS)).toContain(path);
      const card = publicCard(path as keyof typeof PUBLIC_CARDS);
      // The page itself has to hand that card over, by its own path.
      const page = readFileSync(`app${path}/page.tsx`, "utf8");
      expect(page.includes(`publicCard("${path}")`) || page.includes(`PUBLIC_CARDS["${path}"]`)).toBe(true);
      const meta = await publicTitle(Promise.resolve({}), "A page", undefined, card);
      expect(meta.openGraph).toMatchObject({ url: path, description: card.description });
      expect((meta.openGraph as { images?: unknown[] }).images).toEqual([SHARE_IMAGE]);
      if (englishOnly.has(path)) return;
      for (const lang of ["ru", "uk"] as const) {
        const translated = await publicTitle(Promise.resolve({ lang }), "A page", undefined, card);
        expect(translated.description, `${path} in ${lang}`).not.toBe(card.description);
        expect(translated.openGraph).toMatchObject({ url: path, locale: `${lang}_EE` });
      }
    });
  }
});
