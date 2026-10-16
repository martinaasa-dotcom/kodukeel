import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `sobra-mure`, beat by beat. See `lib/scenes/picks.ts`. */
export const sobraMure: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, kuidas sul läheb?", en: "Hi, how are you doing?" },
  ],
  how: [
    { et: "Mis juhtus?", en: "What happened?" },
    { et: "Tõesti? Mis siis juhtus?", en: "Really? What happened?" },
  ],
  sorry: [
    { et: "Mul on väga kahju.", en: "I'm really sorry." },
    { et: "Kahju kuulda.", en: "Sorry to hear that." },
    { et: "See on nii kurb. Mul on sinust väga kahju.", en: "That's so sad. I feel so sorry for you." },
  ],
  help: [
    { et: "Ma aitan sind.", en: "I'll help you." },
    { et: "Ma saan sind aidata.", en: "I can help you." },
    { et: "Ma olen sinuga, me saame koos hakkama.", en: "I'm with you, we'll manage together." },
  ],
  meet: [
    { et: "Jah, kindlasti.", en: "Yes, of course." },
    { et: "{day:ADESSIVE} sobib.", en: "{day} works." },
  ],
  close: [
    { et: "Head aega!", en: "Bye!" },
    { et: "Nägemist, näeme {day:ADESSIVE}!", en: "Bye, see you on {day}!" },
  ],
};
