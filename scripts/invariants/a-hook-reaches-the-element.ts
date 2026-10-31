import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";
import { tagsIn } from "../lib/jsxTags";

/**
 * A `data-*` HOOK HANDED TO A COMPONENT REACHES AN ELEMENT, a bare one included.
 *
 * JSX does not type-check a hyphenated attribute, so `<Card data-check-result>`
 * compiled against a `Card` that took no such prop and drew it nowhere. The
 * browser suite then waited thirty seconds for a result the screen was
 * showing, and four hooks on three screens had been reaching nobody. A
 * component one of these is handed has to take the rest of its props and
 * spread them onto what it draws. Read off the import, so a component renamed
 * on the way in (`PrefetchLink` as `Link`) is the one asked.
 */
/** A tag's own attributes, with everything inside a brace emptied, so a hook on an element passed in a prop is not read as this tag's. */
function topLevel(text: string): string {
  let depth = 0;
  let out = "";
  for (const c of text) {
    if (c === "{") { if (depth === 0) out += c; depth += 1; continue; }
    if (c === "}") { depth -= 1; if (depth === 0) out += c; continue; }
    if (depth === 0) out += c;
  }
  return out;
}

export default function aHookReachesTheElement({ check, ALL, code }: InvariantKit) {
  check("a data- hook handed to a component is spread onto an element", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"));
    let seen = 0;
    const offenders: string[] = [];
    for (const f of files) {
      const source = code(f);
      // A tag read whole, so a handler before the hook (`onClick={() => …}`) does not end it early.
      for (const tag of tagsIn(source)) {
        if (tag.closing || !/^[A-Z][A-Za-z]*$/.test(tag.name)) continue;
        if (!/\bdata-[a-z-]+(?=[=\s/>])/.test(topLevel(tag.text))) continue;
        const name = tag.name;
        // A tag name held in a variable (`as: Tag`) draws the element itself.
        if (new RegExp(`\\bas:\\s*${name}\\b|\\b(?:const|let)\\s+${name}\\b`).test(source)) continue;
        // A component defined in the same file is read where it is defined.
        const local = source.search(new RegExp(`\\bfunction ${name}\\b`));
        if (local >= 0) {
          const next = source.indexOf("\nfunction ", local + 1);
          const body = source.slice(local, next < 0 ? undefined : next);
          seen += 1;
          if (!/\.\.\.\w+\s*[}:]/.test(body) || !/\{\s*\.\.\.\w+\s*\}/.test(body)) {
            offenders.push(`${f}: <${name}> is handed a data- hook and its own ${name} spreads nothing onto what it draws`);
          }
          continue;
        }
        const imported = new RegExp(`import\\s+(?:\\{[^}]*?\\b(?:(\\w+)\\s+as\\s+)?${name}\\b[^}]*\\}|${name})\\s+from\\s+"(@/[^"]+|\\.[^"]+)"`).exec(source);
        if (!imported) { offenders.push(`${f}: <${name}> is not imported from a file this check can read`); continue; }
        const original = imported[1] ?? name;
        const spec = imported[2]!;
        const base = spec.startsWith("@/") ? spec.slice(2) : `${f.replace(/\/[^/]+$/, "")}/${spec.replace(/^\.\//, "")}`;
        const target = [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`].find((p) => existsSync(p));
        if (!target) { offenders.push(`${f}: cannot find ${spec}`); continue; }
        const definition = code(target);
        const at = definition.search(new RegExp(`export (?:default )?function ${original}\\b`));
        if (at < 0) { offenders.push(`${f}: ${original} is not a function in ${target}`); continue; }
        const next = definition.indexOf("\nexport ", at + 1);
        const body = definition.slice(at, next < 0 ? undefined : next);
        seen += 1;
        if (!/\.\.\.\w+\s*[}:]/.test(body) || !/\{\s*\.\.\.\w+\s*\}/.test(body)) {
          offenders.push(`${f}: <${name}> is handed a data- hook and ${target}'s ${original} spreads nothing onto what it draws`);
        }
      }
    }
    // 32 hooks on components measured on 2026-10-30, with tags read whole; the floor sits a quarter below.
    assert.ok(seen >= 24, `only ${seen} hooks on components found, so the haystack stopped matching`);
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });
}
