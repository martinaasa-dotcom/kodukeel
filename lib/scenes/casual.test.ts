import { describe, expect, it } from "vitest";
import { lemmasOfForm } from "@/lib/dict/forms";
import { CASUAL, CASUAL_BYE_WORDS, casualBye, casualHello } from "./casual";

describe("casual greetings", () => {
  /*
    The Estonian half is a request against the accept list, so nothing here is
    a spelling this project invented: every entry has to be one Ekilex or
    Vabamorf wrote down. The other half is deliberately not, since "ciao" is
    not Estonian and the list would refuse it for the right reason.
  */
  it("names only Estonian the forms list vouches for", async () => {
    for (const word of [...CASUAL.hello.et, ...CASUAL.bye.et]) {
      expect((await lemmasOfForm(word)).length, word).toBeGreaterThan(0);
    }
  });

  it("is read to accept and holds no course phrase", () => {
    const all = [...CASUAL.hello.et, ...CASUAL.hello.other, ...CASUAL.bye.et, ...CASUAL.bye.other];
    expect(all).not.toContain("tere");
    expect(all.join(" ")).not.toMatch(/head aega|nägemist|aitäh/);
  });

  it("hears hello in either language, and folded", () => {
    expect(casualHello(["ciao"])).toBe("ciao");
    expect(casualHello(["tsau"])).toBe("tsau");
    expect(casualHello(["tsau"])).not.toBeNull();
    expect(casualHello(["hei", "kuidas", "läheb"])).toBe("hei");
    expect(casualHello(["poodi"])).toBeNull();
  });

  it("hears goodbye only in a short turn", () => {
    expect(casualBye(["ciao"])).toBe("ciao");
    expect(casualBye(["ok", "tsau"])).toBe("tsau");
    expect(casualBye(["bye", "bye"])).toBe("bye");
    expect(casualBye(["tsau", "kuhu", "ma", "pean", "minema"])).toBeNull();
    expect(casualBye([])).toBeNull();
    expect(CASUAL_BYE_WORDS).toBe(3);
  });
});
