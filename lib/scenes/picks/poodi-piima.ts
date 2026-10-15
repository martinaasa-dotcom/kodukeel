import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `poodi-piima`, beat by beat. See `lib/scenes/picks.ts`. */
export const poodiPiima: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, kuidas läheb?", en: "Hi, how's it going?" },
  ],
  going: [
    { et: "Ma lähen poodi.", en: "I'm going to the shop." },
    { et: "Poodi, piima ostma.", en: "To the shop, to buy milk." },
  ],
  inside: [
    { et: "Ma olen poes.", en: "I'm in the shop." },
    { et: "Olen juba poes.", en: "I'm already in the shop." },
  ],
  item: [
    { et: "Ma ostan piima.", en: "I'm buying milk." },
    { et: "Piima, see on kõik.", en: "Milk, that's all." },
  ],
  back: [
    { et: "Ma tulen poest.", en: "I'm coming from the shop." },
    { et: "Tulen poest, lähen koju.", en: "I'm coming from the shop, going home." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, bye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
