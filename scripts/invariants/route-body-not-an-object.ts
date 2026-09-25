import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function routeBodyMayBeNull({ check, APP, code }: InvariantKit) {
  check("a route answers a body that is not an object with a refusal, not a 500", () => {
    /*
      JSON "null" parses. The scene route let it through .catch(() => ({})) and the
      scan route parsed it inside a try and read its key after the try had
      closed, and both then read a key off null, which the framework answered
      with a 500. So the first key read off a parsed body happens inside the try
      that parsed it, whose catch refuses it, or after an object check.
    */
    const routes = APP.filter((f) => /app\/api\/.*route\.ts$/.test(f));
    let asked = 0;
    const loose: string[] = [];
    for (const file of routes) {
      const source = code(file);
      for (const m of source.matchAll(/(\w+)\s*(?::[^=;\n]+)?=\s*\(?\s*await (?:request|req)\.json\(\)/g)) {
        asked += 1;
        const name = m[1]!;
        let depth = 0;
        let tryEnd = -1;
        for (let i = m.index! - 1; i >= 0; i -= 1) {
          if (source[i] === "}") depth += 1;
          else if (source[i] === "{") {
            if (depth > 0) { depth -= 1; continue; }
            if (/\btry\s*$/.test(source.slice(Math.max(0, i - 12), i))) {
              let open = 1;
              let at = i + 1;
              while (open > 0 && at < source.length) {
                if (source[at] === "{") open += 1;
                else if (source[at] === "}") open -= 1;
                at += 1;
              }
              tryEnd = at;
              break;
            }
          }
        }
        const rest = source.slice(m.index! + m[0].length);
        const firstRead = rest.search(new RegExp(`\\b${name}\\??\\.\\w`));
        const checked = new RegExp(`typeof ${name} === "object" && ${name} !== null`).test(rest.slice(0, Math.max(firstRead, 0)));
        const readInTry = tryEnd >= 0 && firstRead >= 0 && m.index! + m[0].length + firstRead < tryEnd;
        if (firstRead >= 0 && !checked && !readInTry) loose.push(`${file} (${name})`);
      }
    }
    assert.ok(asked >= 7, `only ${asked} parsed request bodies found, so this check stopped looking`);
    assert.deepEqual(loose, [], `these read a key off a parsed body that may be null: ${loose.join(", ")}`);
  });
}
