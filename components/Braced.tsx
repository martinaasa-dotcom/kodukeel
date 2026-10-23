import type { ReactNode } from "react";

/**
 * AN ENGLISH SENTENCE WITH ITS ESTONIAN MARKED.
 *
 * A lesson writes the Estonian inside an English sentence in braces, `{mina}`
 * (`lib/course/lessons/types.ts`), so the ledger can hold it to the
 * not-taught-yet rule and the screen can set it as Estonian. A sentence with
 * no braces comes back exactly as it was, which is every string anywhere else
 * in the app, so a component can pass its text through here whoever wrote it.
 *
 * QUOTED, BOLD AND IN THE ACCENT, ALL THREE. It used to be bold in the body
 * ink, which inside a bold rule ("A noun + {palun} is a whole order") was no
 * mark at all: `After {on}, a describing word doesn't change` read as English,
 * and a learner reported exactly that. Estonian and English share an alphabet,
 * so a word like `on`, `see` or `must` cannot be told apart by its letters; it
 * has to be told apart by how it is set. The quotes carry it where color does
 * not (a printed page, a reader who sees no hue), the accent carries it at a
 * glance, and `lang="et"` makes a screen reader say it with Estonian sounds.
 * The quotes sit outside the `lang` span and are hidden from a screen reader,
 * since read aloud they are noise. They are English quotes, because the
 * sentence around them is English.
 *
 * AND THE I OF "I FORM" IS A CAPITAL I THAT LOOKS LIKE ONE. The present is
 * named `olevik (I form)` (`verbFormName`), the form said with `ma`
 * (`räägin`). In the app's sans
 * serif a capital I and a lowercase l are the same stroke, so "the I form"
 * read as "the l form", a form nobody has heard of. Neither committed face has
 * an alternate I, so this one glyph is set in the reader's own system serif,
 * which loads nothing and gives it the bars an l never has, wherever the name
 * appears in a lesson's English. It is the one named exemption from the face
 * rule (`scripts/invariants/the-agreed-fonts-and-palette.ts`).
 *
 * AND A GRAMMAR NAME IS IN SQUARE BRACKETS, `[osastav] (3rd form)`. It is
 * Estonian, the name a class uses (`casePlainName`, `verbFormName`), and it is
 * not a word the lesson teaches, so it is neither held to the ledger nor set
 * like one: no quotes and no accent, which would say "learn this word", only
 * italic in the ink of the sentence and `lang="et"` so a screen reader says it
 * with Estonian sounds. The hint after it is ordinary text in the reader's
 * language. `lessons.test.ts` holds every bracket to a known name with its
 * hint right after it.
 *
 * No hooks, so a server page and a client round draw it the same way.
 */
export function Braced({ text }: { text: string }) {
  if (!text.includes("{") && !TERM.test(text) && !I_FORM.test(text)) return <>{text}</>;
  const parts = text.split(/(\{[^{}]+\}|\[[^[\]{}]+\])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("{") && part.endsWith("}")
          ? (
            <span key={i} data-estonian>
              <span aria-hidden>“</span>
              <span lang="et" className="font-bold" style={{ color: "var(--accent-deep)" }}>{part.slice(1, -1)}</span>
              <span aria-hidden>”</span>
            </span>
          )
          : part.startsWith("[") && part.endsWith("]")
            ? <span key={i} lang="et" data-term className="italic">{part.slice(1, -1)}</span>
            : <span key={i}>{withSerifI(part)}</span>,
      )}
    </>
  );
}

/** A grammar name in a lesson's English, `[osastav]`. */
const TERM = /\[[^[\]{}]+\]/;

/** "I form", whole words, the name of a verb's form said with `ma`. */
const I_FORM = /\bI form\b/;

const SERIF_I = { fontFamily: "Georgia, \"Times New Roman\", serif", fontWeight: 700 } as const;

function withSerifI(text: string): ReactNode {
  if (!I_FORM.test(text)) return text;
  return text.split(/\b(I)(?= form\b)/g).map((piece, i) =>
    piece === "I" && i % 2 === 1 ? <span key={i} data-i-form style={SERIF_I}>I</span> : piece,
  );
}
