import type { Area } from "./area";
import { RU } from "./ru";
import { UK } from "./uk";
import { START } from "./areas/start";
import { TODAY } from "./areas/today";
import { REVIEW } from "./areas/review";
import { SITUATIONS } from "./areas/situations";
import { REFERENCE } from "./areas/reference";
import { APP } from "./areas/app";
import { ROUNDS } from "./areas/rounds";
import { PROGRESS } from "./areas/progress";
import { COURSE } from "./areas/course";

/**
 * Every area of the interface that has been translated. The first is the
 * navigation, the round briefings and the language setting itself, which were
 * written before the app was split into areas.
 */
export const AREAS: readonly (readonly [name: string, area: Area])[] = [
  ["core", { ru: RU, uk: UK }],
  ["start", START],
  ["today", TODAY],
  ["review", REVIEW],
  ["situations", SITUATIONS],
  ["reference", REFERENCE],
  ["app", APP],
  ["rounds", ROUNDS],
  ["progress", PROGRESS],
  ["course", COURSE],
];
