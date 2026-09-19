/**
 * WHICH SLOT A SPELLING FILLS, ASKED OF THE WHOLE SHIPPED DICTIONARY.
 *
 * The grammar reference pins an attested sentence under a claim and marks the
 * word carrying it, and the pin table's own header argues that naming a form
 * the dictionary vouches for is choosing rather than writing (ADR-005). That
 * argument is only worth anything while somebody checks the vouching, and for
 * one pass it was checked by a scratch script that was then deleted: the pins
 * were right and the thing that made them right was not in the repository, so
 * the next editor could file a sentence whose "conditional" is not a
 * conditional and every test would pass.
 *
 * This is that scratch script, shipped. It builds one index over the files
 * `npm run db:seed` loads, through the app's own derivation modules rather
 * than through any reading of endings: a case comes off `buildCaseTable`, so
 * an attested form beats the suffix rule exactly as it does on screen, and a
 * verb form comes off `derivedVerbForms` beside the parts the harvest stored,
 * which `npm run audit:verbs` checked against Ekilex for all 797 verbs.
 *
 * IT IS DELIBERATELY THE STRICT RULE, which is `readCase`'s: a spelling more
 * than one slot claims is claimed by none of them. `jooksid` is the simple
 * past of `jooksma` and the conditional of `jooma`, and the sentence decides
 * which, which is a parse this file cannot make and will not guess at. So a
 * verdict has four values rather than two, and `shared` is an honest "nobody
 * here can check this" rather than a pass.
 *
 * A CASE IS TAGGED BY THE CASE AND NOT BY THE NUMBER. `raamatutes` verifies as
 * the inessive, because what a case page claims is about the case and a use
 * illustrated in the plural illustrates it.
 *
 * Read-only and offline. No database, no network, no key.
 */
import { dictionaryRows } from "./dictionary";
import { buildCaseTable, stemsFrom } from "../../lib/estonian/derive";
import { derivedVerbForms } from "../../lib/estonian/conjugate";
import { tidyForm } from "../../lib/estonian/whichCase";

/** `CASE:INESSIVE` or `VERB:KndPrSg1`. Prefixed, so the two schemes cannot collide. */
export type SlotTag = string;

/** The principal parts that are a verb slot under another name. */
const PART_CODE: Readonly<Record<string, string>> = {
  INF_MA: "Sup", INF_DA: "Inf", PRES_1SG: "IndPrSg1",
  PAST_1SG: "IndIpfSg1", PART_TUD: "PtsPtPs",
};

export interface SlotIndex {
  /** Every slot any entry claims for this spelling. */
  slotsFor(written: string): ReadonlySet<SlotTag>;
  /** The entries claiming it as that slot, for a report somebody reads. */
  wordsFor(written: string, slot: SlotTag): readonly string[];
}

export function buildSlotIndex(): SlotIndex {
  /** spelling -> slot -> the lemmas claiming it. */
  const index = new Map<string, Map<SlotTag, string[]>>();

  const claim = (value: string | undefined | null, slot: SlotTag, lemma: string) => {
    if (!value) return;
    // A multi-word form is a particle verb's whole phrase, and its bare
    // particle is a word of its own: `ära` is not the imperative of anything.
    if (/\s/.test(value)) return;
    const key = tidyForm(value);
    if (!key) return;
    const slots = index.get(key) ?? index.set(key, new Map()).get(key)!;
    const lemmas = slots.get(slot) ?? slots.set(slot, []).get(slot)!;
    if (!lemmas.includes(lemma)) lemmas.push(lemma);
  };

  for (const row of dictionaryRows()) {
    if (row.pos === "VERB") {
      for (const f of row.forms) {
        const code =
          PART_CODE[f.formType]
          ?? (f.formType.startsWith("EKILEX:") ? f.formType.slice(7) : null);
        if (code) claim(f.value, `VERB:${code}`, row.lemma);
      }
      const pres1sg = row.forms.find((f) => f.formType === "PRES_1SG")?.value;
      if (pres1sg) {
        for (const d of derivedVerbForms({ lemma: row.lemma, pres1sg })) {
          claim(d.value, `VERB:${d.morphCode}`, row.lemma);
        }
      }
      continue;
    }
    for (const form of buildCaseTable(stemsFrom(row.forms))) {
      const tag = `CASE:${form.spec.key}`;
      for (const value of form.accepted) claim(value, tag, row.lemma);
      claim(form.plural, tag, row.lemma);
    }
  }

  return {
    slotsFor: (written) => new Set(index.get(tidyForm(written))?.keys() ?? []),
    wordsFor: (written, slot) => index.get(tidyForm(written))?.get(slot) ?? [],
  };
}

export type SlotVerdict =
  /** Exactly this slot claims the spelling, so the pin says what it says. */
  | { readonly kind: "verified"; readonly words: readonly string[] }
  /** Somebody claims it and it is not this slot. The pin is wrong. */
  | { readonly kind: "wrong"; readonly instead: readonly SlotTag[] }
  /** This slot claims it and so does another, so no reading can be asserted. */
  | { readonly kind: "shared"; readonly others: readonly SlotTag[] }
  /** No entry the dictionary ships inflects into this spelling at all. */
  | { readonly kind: "unknown" };

/** Whether the marked word really is the slot the pin is filed under. */
export function readSlot(index: SlotIndex, written: string, slot: SlotTag): SlotVerdict {
  const slots = [...index.slotsFor(written)];
  if (slots.length === 0) return { kind: "unknown" };
  if (!slots.includes(slot)) return { kind: "wrong", instead: slots.sort() };
  const others = slots.filter((s) => s !== slot).sort();
  if (others.length > 0) return { kind: "shared", others };
  return { kind: "verified", words: index.wordsFor(written, slot) };
}
