/*
  ESCAPING, AND WHY A LETTER NEEDS IT MORE THAN A SCREEN DOES.

  Every string a React component interpolates is escaped by React. Nothing
  escapes a template literal, and an email is built out of template literals
  because it is a string of HTML posted to a service rather than a tree handed
  to a renderer. So the one place in this app where a learner's own text is
  concatenated into markup by hand is here.

  And it is their own text, not a stranger's, which is the reason people talk
  themselves out of escaping. It does not help. `goalNote` is a free-text box a
  learner writes a sentence of encouragement to themselves in, `displayName` is
  whatever they typed, and both land in a letter that their mail client renders
  with their session open in the next tab. A `<` that survives into the markup
  costs a broken letter at best; a letter that can carry markup at all is a
  letter somebody can be talked into pasting something into.

  So everything interpolated goes through `esc`, and `raw` is the one way to
  say "this string is markup I built". A template that reaches for neither is
  the fault this pair exists to make visible, and `render.test.ts` drives a
  name with a tag in it through every letter this app can send.
*/

/** Markup this module built, as opposed to text somebody typed. */
export interface Html {
  readonly __html: string;
}

/** Wrap a string that really is markup. The only way to get an `Html`. */
export function raw(markup: string): Html {
  return { __html: markup };
}

const ENTITIES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Text, as markup.
 *
 * The apostrophe is escaped along with the rest, which is more than a document
 * body strictly needs. Every one of these values is also interpolated into an
 * attribute somewhere in this directory (a `title`, an `alt`, a link that
 * carries a name), and a rule that holds in one context and not the other is
 * a rule somebody applies in the wrong place once.
 */
export function esc(text: string): Html {
  return raw(String(text).replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c));
}

/**
 * A URL, as an attribute value.
 *
 * Refuses anything that is not http or https, and refuses it by returning the
 * fallback rather than by throwing: a letter is built on a schedule with
 * nobody watching, and a run that dies because one learner's stored return
 * path was odd is a run that sends nobody anything. `javascript:` is the shape
 * this exists for, and a mail client that follows one is a mail client this
 * app should not be handing one to.
 */
export function url(value: string, fallback = "#"): Html {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? esc(parsed.toString())
      : esc(fallback);
  } catch {
    return esc(fallback);
  }
}

/**
 * Join markup, which is the thing a template does constantly and the thing a
 * template gets wrong by reaching for `.join("")` on an array of `Html`.
 */
export function join(parts: readonly Html[], between = ""): Html {
  return raw(parts.map((p) => p.__html).join(between));
}

/** A tagged template that escapes every hole and passes `Html` through. */
export function html(strings: TemplateStringsArray, ...values: (Html | string | number)[]): Html {
  let out = strings[0] ?? "";
  for (const [i, value] of values.entries()) {
    const piece =
      typeof value === "object" && value !== null && "__html" in value
        ? value.__html
        : esc(String(value)).__html;
    out += piece + (strings[i + 1] ?? "");
  }
  return raw(out);
}
