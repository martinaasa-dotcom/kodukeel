/*
  WHAT A LETTER MUST BE TRUE OF WHATEVER IT SAYS.

  The copy is swept by `readerCopy.test.ts` like every other string in `lib/`.
  What is here is the half that is about the letter as an object: that a name
  with a tag in it cannot become markup, that the text part is a real letter
  rather than the HTML with its tags pulled off, and that the way out is in
  both of them.
*/
import { describe, expect, it } from "vitest";

import { renderHtml, renderText, type Chrome } from "./render";
import type { Letter } from "./letter";
import { tonightLetter } from "./letters/tonight";
import { welcomeLetter } from "./letters/welcome";
import { comebackLetter } from "./letters/comeback";
import { weeklyLetter } from "./letters/weekly";
import { errandLetter } from "./letters/errand";
import { milestoneLetter } from "./letters/milestone";
import { shieldLetter } from "./letters/shield";
import { deadlineLetter } from "./letters/deadline";
import { classroomLetter } from "./letters/classroom";
import { worddayLetter } from "./letters/wordday";
import { OPTIONAL_KINDS } from "./letter";

const CHROME: Chrome = {
  origin: "https://kodukeel.ee",
  unsubscribeUrl: "https://kodukeel.ee/api/email/unsubscribe?u=x&k=tonight&t=y",
  unsubscribeLabel: "Stop these emails",
  operator: "Upthink OU",
};

/** Something a learner could genuinely type into the box that feeds a letter. */
const NASTY = `<script>alert(1)</script> "Mari" & co`;

const STEPS = [
  { title: "Meet today's five words", minutes: 6, done: true },
  { title: "Read the point behind it", minutes: 2, done: false },
  { title: "Match", minutes: 3, done: false },
  { title: "Quick review, and you are done", minutes: 2, done: false },
];

/** One of every letter this app can send, each carrying the nasty string. */
const EVERY: Letter[] = [
  tonightLetter({
    name: NASTY,
    origin: CHROME.origin,
    day: {
      title: NASTY,
      subtitle: "At home",
      part: { n: 2, of: 3 },
      canDo: "You can say where you live.",
      newWords: 5,
      steps: STEPS,
    },
    theirWords: NASTY,
    streak: 6,
    word: { lemma: "pannkook", translation: "pancake", occasion: NASTY },
  }),
  welcomeLetter({
    origin: CHROME.origin,
    reminderAt: "18:00",
    cardsWaiting: 404,
    opensOn: { title: NASTY, subtitle: "At home" },
  }),
  comebackLetter({
    origin: CHROME.origin,
    wordsKept: 212,
    shieldUsed: true,
    streak: 7,
    smallStep: { title: NASTY, href: `${CHROME.origin}/review/match`, minutes: 2 },
    word: { lemma: "lumi", translation: "snow", occasion: null },
  }),
  errandLetter({
    origin: CHROME.origin,
    errand: {
      says: NASTY,
      places: "A café or a shop",
      unitId: "sook-ja-jook",
      unitTitle: NASTY,
      scene: { id: "kohvikus", title: NASTY },
    },
    word: { lemma: "kohv", translation: "coffee" },
  }),
  milestoneLetter({
    origin: CHROME.origin,
    level: { key: "A1", title: NASTY, arrival: NASTY, words: 493 },
    pct: 41,
    target: "B1",
    next: { level: "A2", wordsAway: 118 },
  }),
  shieldLetter({
    origin: CHROME.origin,
    streak: 12,
    remaining: 1,
    nextAt: 30,
    week: ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({ label, studied: i !== 5 })),
  }),
  weeklyLetter({
    origin: CHROME.origin,
    week: ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({ label, studied: i < 5 })),
    reviews: 91,
    held: 212,
    conversations: 2,
    ladder: { target: "B1", pct: 41, assumed: 318, next: { level: "A2", wordsAway: 120 } },
    part: { title: NASTY, eveningsLeft: 3 },
  }),
  deadlineLetter({
    origin: CHROME.origin,
    band: "B1",
    label: "Live in the language",
    phrase: "9 weeks",
    distance: NASTY,
    confidence: 41,
    evidence: "There is enough history here for a rough estimate, not a confident one.",
    gap: NASTY,
    onTrack: false,
  }),
  classroomLetter({
    origin: CHROME.origin,
    groupName: NASTY,
    members: 25,
    active: 18,
    reviews: 412,
    week: ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({ label, studied: i < 5 })),
    detail: {
      kind: "CLASS",
      weakestCases: [
        { grammCase: "osastav", accuracy: 54, total: 88 },
        { grammCase: "seesütlev", accuracy: 61, total: 40 },
      ],
    },
  }),
  /*
    THE WORKPLACE HALF IS A LETTER OF ITS OWN IN HERE, NOT A SECOND FIXTURE.

    The two are one `kind` and two branches, and the branch is exactly where
    the boundary between the seats lives: one reads a case aggregate and the
    other reads none. A sweep that drove only the class half would be checking
    the safer of the two.
  */
  classroomLetter({
    origin: CHROME.origin,
    groupName: NASTY,
    members: 9,
    active: 9,
    reviews: 140,
    week: ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({ label, studied: i !== 6 })),
    detail: {
      kind: "WORKPLACE",
      level: "B1",
      onTrack: 4,
      close: 3,
      needTime: 1,
      tooEarly: 1,
      evidence: "There is enough history here for these numbers to mean something.",
    },
  }),
  worddayLetter({
    origin: CHROME.origin,
    word: {
      lemma: "pannkook",
      translation: "pancake",
      occasion: NASTY,
      example: { et: "Ema küpsetab pannkooke.", en: NASTY },
    },
  }),
];

describe("the sweep above covers the letters that exist", () => {
  /*
    The floor under every per-letter check in this file. A kind added to
    `EMAIL_KINDS` and not to `EVERY` is a letter nothing in here has ever
    rendered, and it looks exactly like a letter that passed: the loop below
    simply runs one fewer time and every assertion in it still goes green.

    `system` is the one exemption and is not a letter: nothing in
    `lib/email/` composes one, and the sign-in mail it names is Supabase's.
  */
  it("drives one of every kind but the one nothing here composes", () => {
    const drawn = new Set(EVERY.map((letter) => letter.kind));
    for (const kind of OPTIONAL_KINDS) {
      expect(drawn.has(kind), `no fixture renders the ${kind} letter`).toBe(true);
    }
  });
});

describe("every letter, whatever it is given", () => {
  for (const letter of EVERY) {
    describe(letter.kind, () => {
      const html = renderHtml(letter, CHROME);
      const text = renderText(letter, CHROME);

      it("never lets a learner's own text become markup", () => {
        /*
          Nothing in this directory is rendered by React, so nothing escapes
          for free. `goalNote` is a free-text box and a display name is
          whatever somebody typed, and both land in a document their mail
          client renders.

          The claim is only this: no letter may carry unescaped markup. That
          the escaping is really happening is proved once, below, over the
          letters that interpolate learner text at all, because two of these
          carry none by construction and asserting the escaped form on those
          would be asserting something about the test data rather than about
          the letter.
        */
        expect(html).not.toContain("<script>");
        expect(html).not.toContain("<img");
      });

      it("says the same thing in plain text as in HTML", () => {
        /*
          Not the HTML with its tags pulled off: a real letter, built from the
          same blocks.

          What it asserts is that none of the markup this renderer emits
          reaches the text part. Deliberately not "no angle bracket anywhere":
          the nasty string above is a learner's own sentence and it belongs in
          a plain-text letter exactly as they typed it, because plain text has
          nothing to inject into. The first version of this test asked the
          wider question, failed on correct output, and would have been "fixed"
          by escaping a text part, which is how a letter ends up telling
          somebody their own note was `&lt;script&gt;`.
        */
        expect(text).not.toMatch(/<\/?(table|td|tr|div|span|a|body|html|style)\b/i);
        expect(text.length).toBeGreaterThan(120);
        expect(text).toContain(CHROME.unsubscribeUrl);
      });

      it("carries the way out in both renderings", () => {
        expect(html).toContain(CHROME.unsubscribeLabel);
        expect(html).toContain("/privacy");
        expect(text).toContain(CHROME.unsubscribeLabel);
      });

      it("has a subject and a preheader, and they are not the same sentence", () => {
        expect(letter.subject.length).toBeGreaterThan(8);
        expect(letter.preheader.length).toBeGreaterThan(8);
        expect(letter.preheader).not.toBe(letter.subject);
      });

      it("asks for one thing, or for nothing at all", () => {
        /*
          A letter with two buttons is a letter with a decision in it, which is
          the thing the whole course model exists to take off the learner.

          Nought is the word of the day and only the word of the day, which is
          the one letter here that wants nothing: its own header argues that
          the moment it grows an ask it has become a reminder with a word on
          the front, and this is where that is held. Named rather than counted,
          so a second letter cannot quietly lose its button.
        */
        const buttons = letter.blocks.filter((b) => b.t === "button");
        expect(buttons).toHaveLength(letter.kind === "wordday" ? 0 : 1);
      });

      it("renders no image, so it is whole with images off", () => {
        expect(html).not.toMatch(/<img|background-image|url\(/i);
      });

      it("lays out in tables, which is what Word's engine can draw", () => {
        expect(html).toContain("<table");
        expect(html).not.toMatch(/display:\s*(flex|grid)/);
      });

      it("gives every drawing the sentence that stands in for it", () => {
        for (const block of letter.blocks) {
          if (block.t !== "art") continue;
          expect(block.alt.trim().length, `a drawing in ${letter.kind} has an empty alt`).toBeGreaterThan(8);
          expect(text).toContain(block.alt.split("\n")[0]);
        }
      });
    });
  }
});

describe("the escaping really happens", () => {
  it("escapes learner text in every letter that carries any", () => {
    /*
      The half the per-letter check cannot make. Without it, a renderer that
      silently dropped every interpolated value would pass "no unescaped
      markup" on all seven, which is `A || !A` wearing a sweep's clothes.

      Counted rather than listed, so a letter that starts carrying learner text
      is covered the day it does. The floor is what makes it a claim: at the
      time of writing five of the seven interpolate something a learner typed,
      and the two that do not are the ones about a level and a shield, which
      are made of numbers.
    */
    const escaping = EVERY.filter((letter) =>
      renderHtml(letter, CHROME).includes("&lt;script&gt;"),
    );
    expect(escaping.length, "no letter interpolates learner text any more, so nothing proves the escaping works").toBeGreaterThanOrEqual(8);
  });
});

describe("the preheader", () => {
  it("is padded, so a client cannot reach past it into the body", () => {
    const html = renderHtml(EVERY[0]!, CHROME);
    expect(html).toContain("&#8204;&nbsp;");
  });
});

describe("a link that is not a link", () => {
  it("is refused rather than rendered", () => {
    /*
      `url()` refuses anything that is not http or https, and refuses it by
      falling back rather than by throwing: a mail run happens on a schedule
      with nobody watching, and one odd value should cost one link rather than
      everybody's letter.
    */
    const letter: Letter = {
      kind: "tonight",
      subject: "A subject long enough",
      preheader: "A preheader long enough",
      blocks: [{ t: "button", label: "Press", href: "javascript:alert(1)" }],
    };
    const html = renderHtml(letter, CHROME);
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="#"');
  });
});
