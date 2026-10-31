import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b2-eksam`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b2Eksam: ScenePicks = {
  greet: [
    { et: "Tere! Mina olen Tom.", en: "Hello! I'm Tom." },
    { et: "Tere!", en: "Hello!" },
  ],
  talk: [
    { et: "Minu töös on kõige tähtsam see, et me aitame üksteist. Kui keegi ei aita, ei saa töö kunagi valmis. Seetõttu on minu meelest hea kolleeg tähtsam kui hea arvuti.", en: "What matters most in my work is that we help each other. If nobody helps, the work never gets done. So in my view a good colleague matters more than a good computer." },
    { et: "Minu töös on kõige tähtsam, et me aitame üksteist.", en: "What matters most in my work is that we help each other." },
  ],
  choose: [
    { et: "Mina valiksin raamatukogu. Park oleks küll tore, aga raamatukogus käivad nii lapsed kui ka vanad inimesed.", en: "I'd choose the library. A park would be nice, granted, but children and old people both go to the library." },
    { et: "Mina valiksin pargi, sest see on tervisele kasulik.", en: "I'd choose the park, because it's good for your health." },
  ],
  disagree: [
    { et: "Selles on teil õigus. Samas loevad noored üha vähem ja raamatukogu on koht, kus nad saavad lugeda.", en: "You're right there. Then again, young people read less and less, and a library is a place where they can read." },
    { et: "Selles on teil õigus, aga ma arvan teisiti.", en: "You're right there, but I think differently." },
  ],
  phone: [
    { et: "Ma näen seda natuke teisiti. Raamatukogu ei ole ainult raamatud. Seal saavad inimesed kokku, seal on vaikne ja see on tasuta.", en: "I see it a little differently. A library isn't only books. People meet there, it's quiet and it's free." },
    { et: "Raamatukogu on tasuta ja seal on vaikne.", en: "The library is free and it's quiet there." },
  ],
  decide: [
    { et: "Teeme nii: sel aastal raamatukogu ja järgmisel aastal park.", en: "Let's do it like this: the library this year and the park next year." },
    { et: "Järgmisel aastal teeme pargi.", en: "Next year we'll do the park." },
  ],
  close: [
    { et: "Aitäh teile! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Aitäh! Nägemist!", en: "Thank you! See you!" },
  ],
};
