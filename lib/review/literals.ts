/**
 * THE STRING LITERALS IN A TYPESCRIPT FILE, WITH WHERE EACH ONE STANDS.
 *
 * The two review importers change a line in a source file a person also
 * edits by hand: a bank row's Estonian, an area file's Russian or Ukrainian.
 * Both find the line by its exact value rather than by a pattern over the text,
 * because a pattern that matches the line it meant and one more besides is a
 * correction landing on a line nobody corrected. So this reads a file as a
 * list of literals, skipping comments and template strings, and hands back
 * each one's decoded value and its span in the source.
 *
 * Coarse on purpose: it knows quotes, escapes and comments and nothing else
 * about the language, which is all the bank and the area files use.
 *
 * Pure: no React, no Next, no Prisma.
 */

export interface Literal {
  /** Index of the opening quote. */
  readonly start: number;
  /** Index just past the closing quote. */
  readonly end: number;
  /** The string the literal stands for, escapes decoded. */
  readonly value: string;
}

function decode(raw: string, quote: string): string {
  if (quote === '"') return JSON.parse(raw) as string;
  // A single-quoted literal: swap the quoting, then read it as JSON.
  const body = raw.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`) as string;
}

/** Every single- and double-quoted literal in `source`, in order. */
export function stringLiterals(source: string): Literal[] {
  const out: Literal[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      const eol = source.indexOf("\n", i);
      i = eol < 0 ? source.length : eol;
      continue;
    }
    if (ch === "/" && next === "*") {
      const close = source.indexOf("*/", i + 2);
      i = close < 0 ? source.length : close + 2;
      continue;
    }
    if (ch === "`") {
      let j = i + 1;
      while (j < source.length && source[j] !== "`") j += source[j] === "\\" ? 2 : 1;
      i = j + 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < source.length && source[j] !== ch && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
      if (source[j] === ch) {
        const raw = source.slice(i, j + 1);
        try {
          out.push({ start: i, end: j + 1, value: decode(raw, ch) });
        } catch {
          // Not a literal this reader understands; it is left alone.
        }
      }
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return out;
}

/** `source` with every comment blanked to spaces, so positions still line up. */
export function withoutComments(source: string): string {
  let out = source;
  const literals = stringLiterals(source);
  const inLiteral = (i: number) => literals.some((l) => i > l.start && i < l.end);
  for (const m of source.matchAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g)) {
    if (inLiteral(m.index!)) continue;
    out = out.slice(0, m.index!) + m[0].replace(/[^\n]/g, " ") + out.slice(m.index! + m[0].length);
  }
  return out;
}

/** `text` written back as a double-quoted literal, the way the bank and the area files spell them. */
export function asLiteral(text: string): string {
  return JSON.stringify(text);
}

/** The first character after `index` that is not white space. */
export function nextNonSpace(source: string, index: number): string {
  const rest = source.slice(index).match(/^\s*(.)/);
  return rest?.[1] ?? "";
}

/** The last character before `index` that is not white space. */
export function previousNonSpace(source: string, index: number): string {
  const before = source.slice(0, index).match(/(\S)\s*$/);
  return before?.[1] ?? "";
}
