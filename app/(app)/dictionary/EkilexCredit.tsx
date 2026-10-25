"use client";

import { useT } from "@/components/Locale";
import { fillNodes } from "@/components/reference/fillNodes";
import { CC_BY_DEED, EKILEX_CREDIT, EKILEX_INSTITUTE } from "@/lib/legal/ekilexCredit";

/**
 * THE CREDIT CC BY 4.0 ASKS FOR, ON THE SCREEN WHERE THE DATA IS SHOWN.
 *
 * `docs/05-integrations.md` section 1.3.4 promised a visible credit on every
 * entry view, and the entry named Ekilex in one sentence and gave no license.
 * The license asks for three things where the material is used: who made it,
 * which license with a link to it, and whether it was changed. So one line,
 * under the sentences and the forms rather than on every row of a table: the
 * Institute of the Estonian Language and Ekilex, CC BY 4.0 linked to its deed,
 * and that a form shown as worked out was derived here from what Ekilex
 * stores, which is the change. The words are `lib/legal/ekilexCredit.ts`,
 * which `/partners` quotes as well.
 *
 * Drawn only on an entry Ekilex supplied (`ekilexWordId`), since a word
 * somebody typed in by hand carries none of the Institute's data and a credit
 * over it would claim what is not so.
 */
export function EkilexCredit() {
  const t = useT();
  return (
    <p className="text-sm" style={{ color: "var(--ink-3)" }} data-ekilex-credit>
      {fillNodes(
        t(EKILEX_CREDIT),
        {
          source: <a href="https://ekilex.ee" className="underline" target="_blank" rel="noreferrer">Ekilex</a>,
          institute: t(EKILEX_INSTITUTE),
          license: <a href={CC_BY_DEED} className="underline" target="_blank" rel="noreferrer license">CC BY 4.0</a>,
        },
      )}
    </p>
  );
}
