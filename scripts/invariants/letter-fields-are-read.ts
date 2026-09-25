import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function letterFieldsAreRead({ check, LIB, code }: InvariantKit) {
  check("every field a letter takes is one the letter reads", () => {
    /*
      Eight letters declared a name, "what they asked to be called", and mailout
      gathered it for every one of them; not one printed it, including the letter
      whose own comment said where the name goes. The welcome letter carried a
      target nobody read either. A field that reaches no reader is a door nobody
      is watching, so each top-level field of a letter's input is read in its file.
    */
    const files = LIB.filter((f) => f.includes("lib/email/letters/") && !f.endsWith(".test.ts"));
    let fields = 0;
    const unread: string[] = [];
    for (const file of files) {
      const source = code(file);
      for (const m of source.matchAll(/export interface (\w+Input) \{([\s\S]*?)\n\}/g)) {
        let depth = 0;
        const top: string[] = [];
        for (const line of m[2]!.split("\n")) {
          const field = depth === 0 ? /^\s*readonly (\w+)\??:/.exec(line) : null;
          if (field) top.push(field[1]!);
          depth += (line.match(/[{(]/g) ?? []).length - (line.match(/[})]/g) ?? []).length;
        }
        for (const name of top) {
          fields += 1;
          const read = new RegExp(`\\b(?:input|detail)(?:\\.detail)?\\??\\.${name}\\b|const \\{[^}]*\\b${name}\\b[^}]*\\} = input\\b`).test(source);
          if (!read) unread.push(`${file}: ${m[1]}.${name}`);
        }
      }
    }
    assert.ok(fields >= 40, `only ${fields} letter fields found, so this check stopped looking`);
    assert.deepEqual(unread, [], `these letter fields reach no reader: ${unread.join("; ")}`);
  });
}
