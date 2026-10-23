/**
 * WHAT COUNTS AS A GOODBYE, FOR EVERYTHING THAT HAS TO TELL ONE APART FROM A
 * LINE WITH SOMETHING IN IT.
 *
 * One module because three readers ask it: the line ladder, which may not
 * open a closing beat on a bare farewell while the bank holds one that says
 * why the conversation is ending; the reply; and the turn assembly, which
 * may not let a model's bare farewell stand over a question still open.
 */
import { FAREWELLS } from "./specs/shared";

/**
 * Goodbyes a line may end on that the course does not teach as phrases, read
 * and never said: a closing line ending "Head päeva!" was not taken for a
 * goodbye, so a second one followed the learner's thanks.
 */
export const HEARD_FAREWELLS: readonly string[] = [
  "head päeva", "head õhtut", "head ööd", "head nädalavahetust", "kõike head", "ilusat päeva", "ilusat õhtut",
];

const letters = (s: string) => (s.match(/\p{L}+/gu) ?? []).join(" ").toLowerCase();

/** Words that may stand beside a goodbye without making it say anything. */
const COURTESY = ["aitäh", "tänan", "ja", "teile", "sulle", "suur"];

/**
 * WHETHER A LINE IS A GOODBYE AND NOTHING ELSE: no reason for leaving, no
 * answer, no wrap. Thanks beside it does not count as content, since
 * "Aitäh, head aega!" said to a question is still a question walked away
 * from. The colleague on a first day at work answered "how long have you
 * worked here?" with a bare `Nägemist!`, and said it again to "what?".
 */
export function onlyFarewell(text: string): boolean {
  let rest = letters(text);
  // Longest first, so "head päeva" goes before anything shorter could leave half of it behind.
  const parts = [...FAREWELLS.map(letters), ...HEARD_FAREWELLS, ...COURTESY].sort((a, b) => b.length - a.length);
  for (const bye of parts) rest = rest.replace(new RegExp(`(^| )${bye}(?= |$)`, "gu"), " ");
  const said = ` ${letters(text)} `;
  return rest.trim() === "" && [...FAREWELLS.map(letters), ...HEARD_FAREWELLS].some((bye) => said.includes(` ${bye} `));
}

/** Whether a line says goodbye anywhere in it, as a sentence of its own or at the end of one. */
export function saysFarewell(text: string): boolean {
  const leaving = [...FAREWELLS.map(letters), ...HEARD_FAREWELLS];
  return text.split(/(?<=[.!?])\s+/).some((sentence) => {
    const its = letters(sentence);
    return leaving.some((bye) => its === bye || its.endsWith(` ${bye}`) || its.startsWith(`${bye} `));
  });
}

/**
 * A closing line with its goodbye taken off, so what is left is the reason or
 * the wrap: "Mul on kiire, ma pean tööle minema. Nägemist!" is said again as
 * "Mul on kiire, ma pean tööle minema." to somebody who asked "what?" after the
 * goodbye. Null where nothing but the goodbye was there.
 */
export function withoutGoodbye(text: string): string | null {
  const kept = text.split(/(?<=[.!?])\s+/).filter((sentence) => !saysFarewell(sentence) && !onlyCourtesy(sentence));
  const joined = kept.join(" ").trim();
  return joined.length > 0 ? joined : null;
}

function onlyCourtesy(sentence: string): boolean {
  const its = letters(sentence);
  return its.length > 0 && its.split(" ").every((word) => COURTESY.includes(word));
}
