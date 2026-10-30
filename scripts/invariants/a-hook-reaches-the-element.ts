import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A `data-*` HOOK HANDED TO A COMPONENT REACHES AN ELEMENT.
 *
 * JSX does not type-check a hyphenated attribute, so `<Card data-check-result>`
 * compiled against a `Card` that took no such prop and drew it nowhere. The
 * browser suite then waited thirty seconds for a result the screen was
 * showing, and four hooks on three screens had been reaching nobody. A
 * component one of these is handed has to take the rest of its props and
 * spread them onto what it draws. Read off the import, so a component renamed
 * on the way in (`PrefetchLink` as `Link`) is the one asked.
 */
export default function aHookReachesTheElement({ check, ALL, code }: InvariantKit) {
  check("a data- hook handed to a component is spread onto an element", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"));
    let seen = 0;
    const offenders: string[] = [];
    for (const f of files) {
      const source = code(f);
      for (const m of source.matchAll(/<([A-Z][A-Za-z]*)\b[^<>]*?\bdata-[a-z-]+=/g)) {
        const name = m[1]!;
        // A tag name held in a variable (`as: Tag`) draws the element itself.
        if (new RegExp(`\\bas:\\s*${name}\\b|\\b(?:const|let)\\s+${name}\\b`).test(source)) continue;
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
    assert.ok(seen >= 8, `only ${seen} hooks on components found, so the haystack stopped matching`);
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });
}
