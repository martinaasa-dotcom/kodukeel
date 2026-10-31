import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b2-perearst`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b2Perearst: ScenePicks = {
  greet: [
    { et: "Tere, doktor!", en: "Hello, doctor!" },
    { et: "Tere!", en: "Hello!" },
  ],
  line: [
    { et: "Vabandust, side on halb. Kas te saaksite korrata?", en: "Sorry, the line's bad. Could you say that again?" },
    { et: "Kuulen, aga halvasti. Kas te saaksite korrata?", en: "I can hear you, but badly. Could you say that again?" },
  ],
  what: [
    { et: "Ma pole umbes kuu aega korralikult maganud.", en: "I haven't slept properly for about a month." },
    { et: "Uinun alles kella ühe paiku ja ärkan kell neli üles.", en: "I don't fall asleep until around one, and I wake up at four." },
  ],
  since: [
    { et: "Umbes kuu aega.", en: "About a month." },
    { et: "Juba umbes kuu aega.", en: "For about a month now." },
  ],
  head: [
    { et: "Jah, õhtuti natuke valutab.", en: "Yes, it aches a little in the evenings." },
    { et: "Ei valuta.", en: "No, it doesn't." },
  ],
  visit: [
    { et: "Jah, see sobib. Aitäh!", en: "Yes, that suits me. Thank you!" },
    { et: "Neljapäev sobib hästi.", en: "Thursday suits me well." },
  ],
  close: [
    { et: "Aitäh, doktor! Head aega!", en: "Thank you, doctor! Goodbye!" },
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
  ],
};
