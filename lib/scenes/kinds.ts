/**
 * WHAT KIND OF PLACE A SITUATION IS, SO THE CHOOSER CAN BE BROWSED.
 *
 * Fifteen tiles in alphabetical order is a wall, and the question somebody
 * brings to it is rarely "which title" and usually "where": I have to see a
 * doctor on Thursday, I keep freezing at the counter. So each scene belongs to
 * one of four kinds of place, and the chooser offers them as a filter.
 *
 * EACH KIND WEARS ONE HUE OF THE MIX, AND THE HUE MEANS ONLY "THIS KIND".
 * The design system lets a tile in a set of tiles cycle the palette to tell
 * itself apart from its neighbours (`docs/14-design-system.md` §1), and this
 * is that rule with a reason behind which tile gets which: every café is the
 * same butter, so the filter chip's dot and the tiles under it agree. Nothing
 * here is a verdict, so blush on a health centre says "health" and nothing
 * about how anybody did there.
 *
 * Keyed on the scene id and checked both ways in `kinds.test.ts`, because a
 * scene added without a row would fall to the fallback in silence and sit
 * under the wrong filter, which reads as the filter being broken.
 *
 * Pure, and English only: a kind is a heading, never a word being taught.
 */
export type SceneKind = "food" | "care" | "around" | "people";

export interface KindSpec {
  readonly id: SceneKind;
  readonly label: string;
  readonly hue: "butter" | "blush" | "sky" | "accent";
}

/** In the order the filter lists them. */
export const KINDS: readonly KindSpec[] = [
  { id: "food", label: "Food and shopping", hue: "butter" },
  { id: "care", label: "Health and offices", hue: "blush" },
  { id: "around", label: "Getting around", hue: "sky" },
  { id: "people", label: "People and work", hue: "accent" },
];

export const SCENE_KINDS: Readonly<Record<string, SceneKind>> = {
  kohvikus: "food",
  "restoranis-tellimine": "food",
  riidepood: "food",
  "poodi-piima": "food",
  kaebus: "food",
  "arsti-aeg": "care",
  apteek: "care",
  ametiasutus: "care",
  "tee-kusimine": "around",
  bussipilet: "around",
  trepikoda: "people",
  "uuri-remont": "people",
  helistamine: "people",
  keeletund: "people",
  toovestlus: "people",
};

export function kindOf(sceneId: string): KindSpec {
  const id = SCENE_KINDS[sceneId] ?? "people";
  return KINDS.find((k) => k.id === id) ?? KINDS[KINDS.length - 1]!;
}
