/**
 * The three scenes Phase 1 would build, and the input Phase 0 measures.
 *
 * Every lemma below is a word one of the scene's declared units already
 * teaches, which `catalogue.test.ts` asserts word by word. That is the only
 * rule about Estonian this file has to obey and it is a strong one: a scene
 * cannot introduce vocabulary, it can only point at vocabulary the Ekilex
 * harvest brought back. Nothing here is a sentence, and no line anybody reads
 * comes from this file.
 *
 * The three are the ones `docs/21-situations.md` §19 names, chosen because the
 * course already promises all three in as many words:
 *
 *   keha-ja-tervis   "Describe a symptom to a doctor and understand the
 *                     advice you are given."
 *   eluase           "Rent a flat, describe a problem with it and deal with a
 *                     landlord."
 *   linn-ja-teenused "Deal with a bank, a post office and an official form
 *                     without switching to English."
 *
 * The shared units are the same four every time and they are the ones the
 * seventeenth pass added for the words between the words: greetings, question
 * words, pronouns, and the clock. A conversation is mostly those.
 */
/*
  ONE FILE PER SCENE. Each scene is the default export of
  `lib/scenes/specs/<scene id>.ts`, and what every scene shares is in
  `lib/scenes/specs/shared.ts`. They used to be one file of two and a half
  thousand lines, and with a scene a pull request every one conflicted with
  every other. This file keeps the order the scenes are listed in, which is
  the order the listing and the tests read them in, and re-exports the shared
  tables so no importer had to change.
*/
import type { SceneSpec } from "./types";
import SHOP from "./specs/poodi-piima";
import DOCTOR from "./specs/arsti-aeg";
import LANDLORD from "./specs/uuri-remont";
import COUNTER from "./specs/ametiasutus";
import CAFE from "./specs/kohvikus";
import DIRECTIONS from "./specs/tee-kusimine";
import TICKET from "./specs/bussipilet";
import RESTAURANT from "./specs/restoranis-tellimine";
import PHONE from "./specs/helistamine";
import NEIGHBOR from "./specs/trepikoda";
import PHARMACY from "./specs/apteek";
import COURSE from "./specs/keeletund";
import INTERVIEW from "./specs/toovestlus";
import COMPLAINT from "./specs/kaebus";
import CLOTHES from "./specs/riidepood";
import NEW_COLLEAGUE from "./specs/uus-kolleeg";
import ASKING_FOR_HELP from "./specs/abi-palumine";
import WAITING from "./specs/ootamine";
import ARRANGING from "./specs/kokkulepe";
import MARKET from "./specs/turul";
import BUS_STOP from "./specs/bussipeatus";
import LIBRARY from "./specs/raamatukogu";
import WEEKEND from "./specs/nadalavahetus";
import EMERGENCY from "./specs/hadaabi";
import BANK from "./specs/pangas";
import FAMILY_DOCTOR from "./specs/perearst";
import UNEMPLOYMENT_FUND from "./specs/tootukassa";
import RESIDENCE_PERMIT from "./specs/elamisluba";
import FAMILY_BENEFIT from "./specs/peretoetus";
import PARENTS_EVENING from "./specs/lastevanemad";

export { FAREWELLS, REACTIONS, LOST, ASIDES, FEELINGS, FALLBACK_PHRASE, ASK_ENGLISH } from "./specs/shared";

export const SCENES: readonly SceneSpec[] = [
  SHOP, DOCTOR, LANDLORD, COUNTER, CAFE, DIRECTIONS, TICKET,
  RESTAURANT, PHONE, NEIGHBOR, PHARMACY, COURSE, INTERVIEW, COMPLAINT, CLOTHES,
  NEW_COLLEAGUE, ASKING_FOR_HELP, WAITING, ARRANGING, MARKET, BUS_STOP, LIBRARY, WEEKEND, EMERGENCY, BANK, FAMILY_DOCTOR, UNEMPLOYMENT_FUND, RESIDENCE_PERMIT, FAMILY_BENEFIT, PARENTS_EVENING,
];

export function sceneById(id: string): SceneSpec | undefined {
  return SCENES.find((s) => s.id === id);
}

/**
 * The scene that tests a unit's own "you can do this" claim, if one does.
 *
 * Read by the unit page and by Progress's list of claims, so a unit is linked
 * to the conversation that tests it from the two places somebody would look.
 */
export function sceneTesting(unitId: string): SceneSpec | undefined {
  return SCENES.find((s) => s.tests === unitId);
}
