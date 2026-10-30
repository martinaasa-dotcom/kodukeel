import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `helistamine`, beat by beat. See `lib/scenes/picks.ts`. */
export const helistamine: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  why: [
    { et: "Ma tahaksin midagi küsida.", en: "I'd like to ask something." },
    { et: "Ma tahaksin midagi osta.", en: "I'd like to buy something." },
  ],
  have: [
    { et: "Kas teil on {thing}?", en: "Do you have a {thing}?" },
    { et: "Ma tahaksin osta {thing:GENITIVE}. Kas teil on?", en: "I'd like to buy a {thing}. Do you have one?" },
  ],
  hours: [
    { et: "Mis kell te avate?", en: "What time do you open?" },
    { et: "Mis kell te homme avate?", en: "What time do you open tomorrow?" },
  ],
  confirm: [
    { et: "Kell {open}?", en: "At {open}?" },
    { et: "Homme kell {open}, selge.", en: "Tomorrow at {open}, got it." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, bye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, bye!" },
  ],
};
