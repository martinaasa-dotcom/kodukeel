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
    name: NASTY,
    origin: CHROME.origin,
    reminderAt: "18:00",
    cardsWaiting: 404,
    opensOn: { title: NASTY, subtitle: "At home" },
    target: { level: "B1", deadline: "2027-06-01" },
  }),
  comebackLetter({
    name: NASTY,
    origin: CHROME.origin,
    daysAway: 9,
    wordsKept: 212,
    shieldUsed: true,
    streak: 7,
    smallStep: { title: NASTY, href: `${CHROME.origin}/review/match`, minutes: 2 },
    word: { lemma: "lumi", translation: "snow", occasion: null },
  }),
  weeklyLetter({
    name: NASTY,
    origin: CHROME.origin,
    week: ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({ label, studied: i < 5 })),
    reviews: 91,
    held: 212,
    conversations: 2,
    ladder: { target: "B1", pct: 41, next: { level: "A2", wordsAway: 120 } },
    part: { title: NASTY, eveningsLeft: 3 },
  }),
];

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
        */
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
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

      it("asks for one thing", () => {
        // A letter with two buttons is a letter with a decision in it, which is
        // the thing the whole course model exists to take off the learner.
        expect(letter.blocks.filter((b) => b.t === "button")).toHaveLength(1);
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
