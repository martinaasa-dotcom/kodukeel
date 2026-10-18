import { describe, expect, it } from "vitest";
import { BUILD_FROM } from "@/lib/collections/levels";
import { A1_GAME_WEEK, GAME_WEEK, GAMES, GROUPS, gameAt, opensFor, playedFrom, spotlight, weekFor, withPlayed } from "./games";
import { modeAt } from "./modes";
import { inlineName, nameOf, roundName } from "./roundNames";

describe("the games board", () => {
  it("puts every game in a group, names it, and knows it as a mode", () => {
    for (const game of GAMES) {
      expect(GROUPS.some((g) => g.id === game.group), game.href).toBe(true);
      expect(nameOf(game.href), `${game.href} has no agreed name`).toBeDefined();
      expect(modeAt(game.href), `${game.href} is not a mode`).toBeDefined();
    }
    expect(new Set(GAMES.map((g) => g.href)).size).toBe(GAMES.length);
  });

  it("files every game under /games and every game is on the board", () => {
    const filed = GAMES.map((g) => modeAt(g.href)?.within);
    expect(new Set(filed)).toEqual(new Set(["/games"]));
  });

  it("never puts one colour on two tiles that touch", () => {
    /*
      A group is drawn two across on a narrow board, and the Quick group three
      across with its last two widened on a wide one. Within a group, a tile
      touches the one before it and the one above it at either width. The
      groups have a heading between them, so nothing touches across one.
    */
    let pairs = 0;
    for (const group of GROUPS) {
      const tones = GAMES.filter((g) => g.group === group.id).map((g) => g.tone);
      expect(tones.length, group.id).toBeGreaterThan(1);
      for (const across of [2, 3]) {
        tones.forEach((tone, i) => {
          if (i % across !== 0) { pairs += 1; expect(tones[i - 1], `${group.id} ${i} beside, ${across} across`).not.toBe(tone); }
          if (i >= across) { pairs += 1; expect(tones[i - across], `${group.id} ${i} above, ${across} across`).not.toBe(tone); }
        });
      }
    }
    expect(pairs).toBeGreaterThan(10);
  });

  it("locks word order at the band the round itself waits for", () => {
    expect(gameAt("/review/sentences")?.from).toBe(BUILD_FROM);
    expect(opensFor(gameAt("/review/sentences")!, "A1")).toBe(false);
    expect(opensFor(gameAt("/review/sentences")!, "B1")).toBe(true);
    expect(opensFor(gameAt("/review/match")!, "A1")).toBe(true);
  });
});

describe("the game of the day", () => {
  it("has seven distinct games a week, every one playable at its level", () => {
    for (const [week, level] of [[GAME_WEEK, "B1"], [A1_GAME_WEEK, "A1"]] as const) {
      expect(week).toHaveLength(7);
      expect(new Set(week).size).toBe(7);
      for (const href of week) expect(opensFor(gameAt(href)!, level), href).toBe(true);
    }
    expect(weekFor("A1")).toBe(A1_GAME_WEEK);
    expect(weekFor("A2")).toBe(GAME_WEEK);
  });

  it("leaves the daily puzzles out of the full week, since they sit under it marked new", () => {
    expect(GAME_WEEK.filter((h) => gameAt(h)?.group === "daily")).toEqual([]);
  });

  it("offers the first untried game, in the week's order from today", () => {
    const none = playedFrom("");
    const first = spotlight(2, "B1", none, "2026-10-20");
    expect(first).toMatchObject({ why: "new", tomorrow: null });
    expect(first.game.href).toBe(GAME_WEEK[2]);
    const tried = playedFrom(`${GAME_WEEK[2]}@2026-10-01`);
    expect(spotlight(2, "B1", tried, "2026-10-20").game.href).toBe(GAME_WEEK[3]);
  });

  it("offers a game outside the week once the week is tried, and never a locked one", () => {
    const all = GAME_WEEK.map((h) => `${h}@2026-10-01`).join(" ");
    expect(spotlight(0, "B1", playedFrom(all), "2026-10-20").game.href).toBe("/review/letters");
    const a1 = A1_GAME_WEEK.map((h) => `${h}@2026-10-01`).join(" ");
    const next = spotlight(0, "A1", playedFrom(a1), "2026-10-20").game;
    expect(next.href).toBe("/review/twenty");
    expect(opensFor(next, "A1")).toBe(true);
  });

  it("is the day's own game once everything is tried, and hands over once that is played today", () => {
    const every = GAMES.map((g) => `${g.href}@2026-10-01`).join(" ");
    const day = spotlight(1, "B1", playedFrom(every), "2026-10-20");
    expect(day).toMatchObject({ why: "week" });
    expect(day.game.href).toBe(GAME_WEEK[1]);
    expect(day.tomorrow?.href).toBe(GAME_WEEK[2]);
    const played = spotlight(1, "B1", playedFrom(withPlayed(every, GAME_WEEK[1]!, "2026-10-20")), "2026-10-20");
    expect(played.game.href).toBe(GAME_WEEK[2]);
    expect(played.tomorrow).toBeNull();
  });
});

describe("what a learner has played", () => {
  it("keeps the last day per game and drops anything that is not a game and a day", () => {
    const played = playedFrom("/sonad@2026-10-01 /nope@2026-10-02 /crossword@soon junk /sonad@2026-10-03");
    expect([...played]).toEqual([["/sonad", "2026-10-03"]]);
  });

  it("refuses to store a game nobody has", () => {
    expect(withPlayed("", "/settings", "2026-10-03")).toBeNull();
    expect(withPlayed("", "/sonad", "tomorrow")).toBeNull();
    expect(withPlayed("/sonad@2026-10-01", "/sonad", "2026-10-03")).toBe("/sonad@2026-10-03");
  });
});

describe("the agreed names", () => {
  it("throws on an href nobody named, and reads the ones that are", () => {
    expect(() => roundName("/nowhere")).toThrow();
    expect(nameOf("constructor")).toBeUndefined();
    expect(roundName("/review/match")).toEqual({ et: "Paarid", en: "Pairs" });
  });

  it("puts the reader's own language in the parentheses when handed a translator", () => {
    expect(inlineName(roundName("/review/match"))).toBe("Paarid (Pairs)");
    expect(inlineName(roundName("/review/match"), (en) => (en === "Pairs" ? "Пары" : en))).toBe("Paarid (Пары)");
  });
});
