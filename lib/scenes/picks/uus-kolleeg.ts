import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `uus-kolleeg`, beat by beat. See `lib/scenes/picks.ts`. */
export const uusKolleeg: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, kuidas läheb?", en: "Hi, how's it going?" },
  ],
  name: [
    { et: "Mina olen Anna.", en: "I'm Anna." },
    { et: "Anna. Meeldiv tutvuda!", en: "Anna. Nice to meet you!" },
    { et: "Minu nimi on Anna.", en: "My name is Anna." },
  ],
  from: [
    { et: "Ma olen pärit {from:FROM}.", en: "I'm from {from}." },
    { et: "Olen pärit {from:FROM}, aga elan nüüd Eestis.", en: "I'm from {from}, but I live in Estonia now." },
  ],
  job: [
    { et: "Ma olen {job}.", en: "I'm a {job}." },
    { et: "Ma hakkan siin {job:ESSIVE} töötama.", en: "I'm going to work here as a {job}." },
  ],
  back: [
    { et: "Kui kaua sa siin töötad?", en: "How long have you worked here?" },
    { et: "Kas sulle meeldib siin?", en: "Do you like it here?" },
    { et: "Kas sa oled siin kaua töötanud?", en: "Have you worked here long?" },
  ],
  close: [
    { et: "Nägemist!", en: "See you!" },
    { et: "Aitäh, head aega!", en: "Thanks, bye!" },
  ],
};
