import type { CaseKey } from "@/lib/estonian/types";
import { caseKeyFor, type Lexicon } from "./lexicon";
import { propBySlot, type RoleCard } from "./props";
import type { BeatSpec, SceneSpec } from "./types";
import { PICKS, CURVEBALL_PICKS } from "./picks/index";

/**
 * WHAT A LEARNER MAY PICK TO SAY, BEAT BY BEAT, WHERE TYPING IS STILL TOO MUCH.
 *
 * The landing page's café is played by picking a line, and a learner in their
 * first months is the person that shape is for: they can recognize the right
 * thing to say long before they can produce it, and a conversation they can
 * finish is worth more to them than one they abandon at the second beat. So
 * every scene offers two or three lines per beat, each with its English, and
 * pressing one says it (`docs/21-situations.md` section 84).
 *
 * A PICK IS A LINE A PERSON WROTE AND THE DICTIONARY VOUCHES FOR, AND IT IS
 * MARKED BY THE APP'S OWN READER. The lines in `picks/` are typed in a session
 * and read by the native speaker who develops this app in the pull request
 * that adds them, which is the standing the scene bank's `authored` rows have
 * (ADR-025 amendment 1). Every literal word in one is a form the scene's own
 * dictionary holds, and a `{slot}` is a value off the learner's card, put in a
 * case by the dictionary's own table, so nothing here inflects anything.
 * `picks.test.ts` builds every pick against many dealt cards and requires the
 * marker to read each one as meeting its beat, so "every pick is a right
 * answer" is checked rather than hoped.
 *
 * A PICKED TURN GRADES NOTHING (D9). Choosing a line shows that somebody
 * recognized it, not that they could produce it, so a beat met by a pick
 * writes no review row (`finishScene`). The turn is the client's word on that,
 * like `helped`: a forged flag can only ever remove grades.
 */

export interface PickSpec {
  /**
   * The line, with `{slot}` for a value off the card and `{slot:CASE}` for
   * that value in a case read off the dictionary's own table.
   */
  readonly et: string;
  /** What it says, with `{slot}` for the value's English. */
  readonly en: string;
  /**
   * The register this line is in, where it says "you": a shared curveball line
   * is written both ways and a scene takes the one its own register holds, so
   * a friend on the phone is never asked to slow down in the polite plural.
   */
  readonly register?: "teie" | "sina";
}

export interface PickOption {
  /** What the browser sends back with the turn, so a screen can say which was pressed. */
  readonly id: string;
  readonly et: string;
  readonly en: string;
}

/** A beat's picks, keyed by beat id; a curveball's under `hurdle:<id>`. */
export type ScenePicks = Readonly<Record<string, readonly PickSpec[]>>;

const SLOT = /\{([a-zA-Z0-9]+)(?::([A-Z]+))?\}/g;

/** The slots a template names, for the test. */
export function slotsOf(template: string): { slot: string; grammCase?: CaseKey }[] {
  return [...template.matchAll(SLOT)].map((m) => ({ slot: m[1]!, grammCase: m[2] as CaseKey | undefined }));
}

/** The template with its slots taken out, which is every word written here. */
export function literalOf(template: string): string {
  return template.replace(SLOT, " ");
}

/**
 * One pick built against the card in play, or null where a slot is missing or
 * the dictionary holds no form for the case it asks: withheld whole rather
 * than printed in the nominative, which would be Estonian nobody says.
 */
export function buildPick(template: PickSpec, card: RoleCard | null, lexicon: Lexicon): { et: string; en: string } | null {
  let missing = false;
  const et = template.et.replace(SLOT, (_, slot: string, grammCase?: string) => {
    const prop = card ? propBySlot(card, slot) : undefined;
    if (!prop?.value) { missing = true; return ""; }
    if (!grammCase) return prop.value;
    const lemma = prop.lemmas[0];
    const form = lemma ? lexicon.caseForm.get(caseKeyFor(lemma, grammCase as CaseKey)) : undefined;
    if (!form) { missing = true; return ""; }
    return form;
  });
  if (missing) return null;
  const en = template.en.replace(SLOT, (_, slot: string) => {
    const prop = card ? propBySlot(card, slot) : undefined;
    /*
      The sense the situation means where the scene narrowed it (`means`),
      then the gloss's first sense: a pick's English is one thing said, and
      "I'd like road, tea, please" is the whole dictionary entry read out.
    */
    return prop?.shown[0] ?? prop?.english?.split(/[,;]/)[0]?.trim() ?? prop?.value ?? "";
  });
  // A value at the front of a line starts the sentence.
  const lead = et.trimStart();
  return { et: lead.charAt(0).toUpperCase() + lead.slice(1), en };
}

/** The specs offered on a beat: the scene's own, else the curveball's shared ones, in the scene's register. */
export function pickSpecsFor(scene: Pick<SceneSpec, "id" | "register">, beatId: string): readonly PickSpec[] {
  const inRegister = (specs: readonly PickSpec[]) => specs.filter((s) => !s.register || s.register === scene.register);
  const own = PICKS[scene.id]?.[beatId];
  if (own && own.length > 0) return inRegister(own);
  if (beatId.startsWith("hurdle:")) return inRegister(CURVEBALL_PICKS[beatId.slice("hurdle:".length)] ?? []);
  return [];
}

/** What the learner may pick to say on this beat, built off their card. Empty where nothing is written for it. */
export function picksFor(scene: Pick<SceneSpec, "id" | "register">, beat: BeatSpec | null | undefined, card: RoleCard | null, lexicon: Lexicon): PickOption[] {
  if (!beat) return [];
  return pickSpecsFor(scene, beat.id).flatMap((template, n) => {
    const built = buildPick(template, card, lexicon);
    return built ? [{ id: `${beat.id}#${n}`, ...built }] : [];
  });
}
