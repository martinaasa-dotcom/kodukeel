/**
 * JSX TAGS READ WHOLE, FOR THE INVARIANTS THAT ASK ABOUT ONE.
 *
 * A tag's end is the first `>` outside its braces and its strings. A pattern
 * like `[^<>]*` stops at the `>` of an arrow (`onClick={() => …}`) and reads
 * half a tag, which is how a hook handed to a component with a handler before
 * it went unread. Approximate by design: it knows braces, quotes and template
 * strings and nothing else, which is what attributes in this tree are made of.
 */

export interface JsxTag {
  /** The tag's name, `Card` or `span`; empty for a fragment. */
  name: string;
  /** Where the tag starts (`<`) and ends (one past its `>`). */
  start: number;
  end: number;
  /** The tag's own text, `<` to `>`. */
  text: string;
  closing: boolean;
  selfClosing: boolean;
}

/** The tag that starts at `start` (a `<`), or null where none does. */
export function tagAt(source: string, start: number): JsxTag | null {
  const head = /^<(\/?)([A-Za-z][\w.]*)?/.exec(source.slice(start, start + 80));
  if (!head || (!head[2] && !head[1] && source[start + 1] !== ">")) return null;
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < source.length; i++) {
    const c = source[i]!;
    if (quote) {
      if (c === "\\") { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) {
      const text = source.slice(start, i + 1);
      return {
        name: head[2] ?? "",
        start,
        end: i + 1,
        text,
        closing: head[1] === "/",
        selfClosing: /\/\s*>$/.test(text),
      };
    }
  }
  return null;
}

/** Every tag in a source, in order. */
export function tagsIn(source: string): JsxTag[] {
  const out: JsxTag[] = [];
  for (let i = source.indexOf("<"); i >= 0; ) {
    const tag = tagAt(source, i);
    if (tag) { out.push(tag); i = source.indexOf("<", tag.end); }
    else i = source.indexOf("<", i + 1);
  }
  return out;
}

/**
 * The element that encloses a position: the nearest opening tag before it that
 * is not closed before it, passing over self-closing tags (`<Check … />`) and
 * whole elements that open and close in between. Its opening tag to the
 * position, or the last 200 characters where nothing encloses it.
 */
export function enclosingElement(source: string, at: number): string {
  const from = Math.max(0, at - 4000);
  const stack: JsxTag[] = [];
  for (const tag of tagsIn(source.slice(from, at))) {
    if (tag.selfClosing) continue;
    if (tag.closing) {
      const open = stack.map((t) => t.name).lastIndexOf(tag.name);
      if (open >= 0) stack.length = open;
      continue;
    }
    stack.push(tag);
  }
  const top = stack.at(-1);
  return top ? source.slice(from + top.start, at) : source.slice(Math.max(0, at - 200), at);
}
