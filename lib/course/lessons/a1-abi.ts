/**
 * A1, LESSONS 46 TO 49: ABI (docs/43-lessons.md §4.8).
 *
 * Asking and telling: the command form, saying what hurts at the doctor's,
 * the telephone, and then the last evening of A1, a new neighbor inviting
 * you round, which uses something from every part before it.
 *
 * The command to one person is the third pattern (`imperative`): it is the
 * I-form without its -n, the same word as the no-form, so the ledger builds
 * it off `lib/estonian/conjugate.ts` like the persons. `minema` says `mine`
 * and is taught by name, and so is every polite command (`tulge`, `oodake`),
 * which no rule here reaches.
 *
 * Read by the native speaker in the pull request that adds it, and held to
 * the same two checks as every lesson (`lessons.test.ts`, `ledger.ts`).
 */

import type { LessonSpec, PartOfLessons } from "./types";

export const A1_ABI_PART: PartOfLessons = {
  id: "a1-abi",
  level: "A1",
  title: "Help",
  about: "Help: telling and asking, the doctor, the phone, and the end of A1.",
};

export const A1_ABI_LESSONS: readonly LessonSpec[] = [
  {
    id: "a1-46-commands",
    n: 46,
    level: "A1",
    part: "a1-abi",
    kind: "lesson",
    title: "Please help",
    goal: "Tell somebody to come, wait, look or help, to a friend and to a stranger.",
    patterns: ["imperative"],
    cast: { Tom: "kalev", Mari: "mari", Liis: "liivika" },
    conversation: [
      { who: "Tom", et: "Mari, tule siia! Vaata!", en: "Mari, come here! Look!" },
      { who: "Mari", et: "Oota, ma tulen kohe.", en: "Wait, I'm just coming." },
      { who: "Tom", et: "Vaata, sajab lund!", en: "Look, it's snowing!" },
      { who: "Mari", et: "Väga ilus!", en: "Lovely!" },
      { who: "Tom", et: "Vabandust, kus on apteek?", en: "Excuse me, where's the pharmacy?", stage: "Later, in town, to a stranger." },
      { who: "Liis", et: "Minge otse ja siis vasakule. Vaadake, seal!", en: "Go straight on and then left. Look, there!" },
      { who: "Tom", et: "Aitäh!", en: "Thank you!" },
    ],
    teaches: [
      { kind: "verb", et: "ootama", first: "ootan", en: "to wait", firstEn: "I wait" },
      { kind: "verb", et: "aitama", first: "aitan", en: "to help", firstEn: "I help" },
      { kind: "word", et: "siia", en: "here, coming here" },
      { kind: "word", et: "kohe", en: "right away, in a moment" },
      { kind: "form", et: "mine", of: "minema", en: "go!, to one person" },
      { kind: "form", et: "tulge", of: "tulema", en: "come!, polite or to more than one" },
      { kind: "form", et: "minge", of: "minema", en: "go!, polite or to more than one" },
      { kind: "form", et: "oodake", of: "ootama", en: "wait!, polite or to more than one" },
      { kind: "form", et: "vaadake", of: "vaatama", en: "look!, polite or to more than one" },
      { kind: "form", et: "aidake", of: "aitama", en: "help!, polite or to more than one" },
      { kind: "phrase", et: "Appi!", en: "Help!" },
    ],
    how: {
      point: "To tell one person you know to do something, take the -n off the I form: {tulen} becomes {tule}. It's the same word you say after {ei}, said on its own.",
      table: {
        head: ["", "To a friend", "Polite, or to more than one"],
        rows: [
          [{ et: "tulema" }, { et: "tule" }, { et: "tulge" }],
          [{ et: "ootama" }, { et: "oota" }, { et: "oodake" }],
          [{ et: "vaatama" }, { et: "vaata" }, { et: "vaadake" }],
          [{ et: "aitama" }, { et: "aita" }, { et: "aidake" }],
          [{ et: "minema" }, { et: "mine" }, { et: "minge" }],
        ],
      },
      notes: [
        "The polite form is learned with each verb: {tulge}, {oodake}, {vaadake}. A stranger always gets this one.",
        "{Palun} in front turns any of them into a request: {Palun oodake}.",
        "{Appi!} means \"help!\", the word to shout when you need it.",
      ],
      watchOut: "{Mine} is the odd one: \"go!\" is {mine}, and it isn't built on {lähen}.",
      examples: [0, 1, 5],
    },
    answers: [
      { cue: "Tell a friend to come here.", model: { et: "Tule siia!", en: "Come here!" } },
      { cue: "Ask a stranger, politely, to wait.", model: { et: "Palun oodake.", en: "Please wait." } },
      { ask: { et: "Kus on bussijaam?", en: "Where's the bus station?" }, cue: "Tell them politely to go straight on and then right.", model: { et: "Minge otse ja siis paremale.", en: "Go straight on and then right." } },
      { cue: "Ask a friend to help.", model: { et: "Palun aita!", en: "Please help!" } },
    ],
  },
  {
    id: "a1-47-doctor",
    n: 47,
    level: "A1",
    part: "a1-abi",
    kind: "lesson",
    title: "At the doctor's",
    goal: "Say what hurts and how you feel, and understand what to do.",
    cast: { Liis: "liivika", Tom: "kalev" },
    conversation: [
      { who: "Liis", et: "Tere! Mis teil viga on?", en: "Hello! What's the matter?" },
      { who: "Tom", et: "Tere! Ma olen haige. Mul valutab pea.", en: "Hello! I'm sick. My head hurts." },
      { who: "Liis", et: "Kas teil on palavik?", en: "Do you have a temperature?" },
      { who: "Tom", et: "Jah, natuke. Ja kõht valutab ka.", en: "Yes, a little. And my stomach hurts too." },
      { who: "Liis", et: "Kas selg valutab?", en: "Does your back hurt?" },
      { who: "Tom", et: "Ei, selg ei valuta.", en: "No, my back doesn't hurt." },
      { who: "Liis", et: "Hästi. Olge kolm päeva kodus ja jooge palju vett.", en: "All right. Stay at home for three days and drink lots of water." },
      { who: "Tom", et: "Aitäh!", en: "Thank you!" },
    ],
    teaches: [
      { kind: "phrase", et: "Mis teil viga on?", en: "What's the matter?" },
      { kind: "word", et: "haige", en: "sick, ill" },
      { kind: "word", et: "valutama", en: "to hurt, to ache" },
      { kind: "form", et: "valutab", of: "valutama", en: "hurts, aches" },
      { kind: "form", et: "valuta", of: "valutama", en: "hurt, after {ei}" },
      { kind: "word", et: "pea", en: "head" },
      { kind: "word", et: "kõht", en: "stomach, tummy" },
      { kind: "word", et: "selg", en: "back" },
      { kind: "word", et: "palavik", en: "fever, a temperature" },
      { kind: "word", et: "palju", en: "a lot, much" },
      { kind: "form", et: "päeva", of: "päev", en: "days, after a number" },
      { kind: "form", et: "olge", of: "olema", en: "be!, stay!, polite" },
      { kind: "form", et: "jooge", of: "jooma", en: "drink!, polite" },
    ],
    how: {
      point: "{Mul valutab pea} means \"my head hurts\". It's built like {mul on}: {mul} first, then the verb, then what hurts.",
      table: {
        head: ["Where", "What you say"],
        rows: [
          [{ et: "pea" }, { et: "Mul valutab pea." }],
          [{ et: "kõht" }, { et: "Mul valutab kõht." }],
          [{ et: "selg" }, { et: "Mul valutab selg." }],
          [{ et: "palavik" }, { et: "Mul on palavik." }],
        ],
      },
      notes: [
        "The part that hurts stays in its 1st form, like what you like in {Mulle meeldib kohv}.",
        "{Haige} means sick: {Ma olen haige}. A fever is something you have: {Mul on palavik}.",
        "The doctor tells you what to do in the polite command form of lesson 46: {olge}, {jooge}.",
      ],
      watchOut: "Don't start with {ma}. \"My head hurts\" is always {Mul valutab pea}: the head is the one that hurts.",
      examples: [1, 3, 6],
    },
    answers: [
      { ask: { et: "Mis teil viga on?", en: "What's the matter?" }, cue: "Say your head hurts.", model: { et: "Mul valutab pea.", en: "My head hurts." } },
      { ask: { et: "Kas teil on palavik?", en: "Do you have a temperature?" }, cue: "Say yes, a little.", model: { et: "Jah, natuke.", en: "Yes, a little." } },
      { cue: "Say you're sick and your stomach hurts.", model: { et: "Ma olen haige. Mul valutab kõht.", en: "I'm sick. My stomach hurts." } },
    ],
  },
  {
    id: "a1-47a-emergency",
    n: 47,
    extra: "a",
    level: "A1",
    part: "a1-abi",
    kind: "lesson",
    title: "In an emergency",
    goal: "Ask for help on the phone, and say who you need: an ambulance, the police, the fire department.",
    cast: { Liis: "liivika", Tom: "kalev" },
    conversation: [
      { who: "Tom", et: "Tere! Mul on vaja abi!", en: "Hello! I need help!", stage: "On the phone, calling 112." },
      { who: "Liis", et: "Mis on juhtunud?", en: "What's happened?" },
      { who: "Tom", et: "Minu sõber on haige. Tal valutab pea ja kõht.", en: "My friend is sick. His head and stomach hurt." },
      { who: "Liis", et: "Kus te olete?", en: "Where are you?" },
      { who: "Tom", et: "Kodus, kesklinnas.", en: "At home, in the town center." },
      { who: "Liis", et: "Kiirabi tuleb kohe.", en: "The ambulance is coming right away." },
    ],
    teaches: [
      { kind: "phrase", et: "Mis on juhtunud?", en: "What's happened?" },
      { kind: "word", et: "abi", en: "help" },
      { kind: "word", et: "kiirabi", en: "ambulance" },
      { kind: "word", et: "politsei", en: "police" },
      { kind: "form", et: "politseid", of: "politsei", en: "the police, after need" },
      { kind: "word", et: "tuletõrje", en: "fire department, firefighters" },
      { kind: "word", et: "tuli", en: "fire" },
      { kind: "word", et: "ohtlik", en: "dangerous" },
      { kind: "word", et: "varas", en: "thief" },
    ],
    how: {
      point: "{Mul on vaja abi!}, \"I need help!\", is the whole call for help, built like {Mul on vaja jopet}.",
      table: {
        head: ["Who you need", "In English"],
        rows: [
          [{ et: "kiirabi" }, { en: "an ambulance" }],
          [{ et: "politsei" }, { en: "the police" }],
          [{ et: "tuletõrje" }, { en: "the fire department, firefighters" }],
        ],
      },
      notes: [
        "{Mis on juhtunud?} means \"what's happened?\", which is what the person answering 112 asks. {Mis teil viga on?} from lesson 47 is the doctor's question.",
        "In Estonia one number, 112, reaches all three, and the people who answer speak English too.",
        "After {vaja}, {politsei} takes its 3rd form, {politseid}. {Abi} and {kiirabi} look the same either way.",
        "{Kiirabi} is quick help, {kiire} + {abi} in one word. {Appi!} from lesson 46 is the shout, and {abi} is the noun.",
      ],
      watchOut: "{Tuli} means fire, and it's also how a verb you know says \"came\": listen to the sentence around it.",
      examples: [0, 2, 5],
    },
    answers: [
      { ask: { et: "Mis on juhtunud?", en: "What's happened?" }, cue: "Say you need help.", model: { et: "Mul on vaja abi!", en: "I need help!" } },
      { cue: "Say you need the police.", model: { et: "Mul on vaja politseid!", en: "I need the police!" } },
      { ask: { et: "Kus te olete?", en: "Where are you?" }, cue: "Say you're at home.", model: { et: "Kodus.", en: "At home." } },
    ],
  },
  {
    id: "a1-48-phone",
    n: 48,
    level: "A1",
    part: "a1-abi",
    kind: "lesson",
    title: "On the phone",
    goal: "Answer the phone, say who's calling, ask for somebody, and say you'll call back.",
    cast: { Liis: "liivika", Tom: "kalev" },
    conversation: [
      { who: "Liis", et: "Halloo?", en: "Hello?" },
      { who: "Tom", et: "Tere! Siin on Tom. Kas Mari on kodus?", en: "Hello! This is Tom. Is Mari in?" },
      { who: "Liis", et: "Üks hetk.", en: "One moment.", stage: "She looks for Mari. Mari isn't there." },
      { who: "Liis", et: "Vabandust, Mari ei ole kodus. Ta on tööl.", en: "Sorry, Mari isn't in. She's at work." },
      { who: "Tom", et: "Hästi. Ma helistan hiljem. Aitäh!", en: "All right. I'll call later. Thanks!" },
      { who: "Liis", et: "Palun! Head aega!", en: "You're welcome! Bye!" },
    ],
    teaches: [
      { kind: "phrase", et: "Halloo?", en: "Hello? (answering the phone)" },
      { kind: "phrase", et: "Üks hetk.", en: "One moment." },
      { kind: "verb", et: "helistama", first: "helistan", en: "to call (on the phone)", firstEn: "I call" },
      { kind: "word", et: "hiljem", en: "later" },
    ],
    how: {
      point: "On the phone you say who you are with {Siin on}: {Siin on Tom}, this is Tom.",
      table: {
        head: ["Estonian", "In English"],
        rows: [
          [{ et: "Halloo?" }, { en: "Hello?" }],
          [{ et: "Siin on Tom." }, { en: "This is Tom." }],
          [{ et: "Kas Mari on kodus?" }, { en: "Is Mari in?" }],
          [{ et: "Üks hetk." }, { en: "One moment." }],
          [{ et: "Ma helistan hiljem." }, { en: "I'll call later." }],
        ],
      },
      notes: [
        "{Ma helistan hiljem} means \"I'll call later\": the present and a word for when, as in lesson 41.",
        "If the line is bad, you have the lines for it: {Palun korrake} and {Aeglasemalt, palun}.",
      ],
      watchOut: "{Halloo} is only for answering the phone. In person it's {Tere}.",
      examples: [1, 2, 4],
    },
    answers: [
      { ask: { et: "Halloo?", en: "Hello?" }, cue: "Say this is you, and ask whether Mari is in.", model: { et: "Tere! Siin on Tom. Kas Mari on kodus?", en: "Hello! This is Tom. Is Mari in?" } },
      { ask: { et: "Mari ei ole kodus.", en: "Mari isn't in." }, cue: "Say you'll call later.", model: { et: "Hästi. Ma helistan hiljem.", en: "All right. I'll call later." } },
      { cue: "The phone rings. Answer it.", model: { et: "Halloo?", en: "Hello?" } },
    ],
  },
  {
    id: "a1-49-invite",
    n: 49,
    level: "A1",
    part: "a1-abi",
    kind: "partEnd",
    title: "The end of A1",
    goal: "Hold a whole conversation with a new neighbor, and accept an invitation.",
    cast: { Mari: "mari", Tom: "kalev" },
    conversation: [
      { who: "Mari", et: "Tere! Mina olen Mari. Ma elan ka siin.", en: "Hello! I'm Mari. I live here too." },
      { who: "Tom", et: "Tere! Väga meeldiv! Mina olen Tom.", en: "Hello! Nice to meet you! I'm Tom." },
      { who: "Mari", et: "Kust sa pärit oled?", en: "Where are you from?" },
      { who: "Tom", et: "Ma olen pärit Inglismaalt. Aga ma elan Eestis.", en: "I'm from England. But I live in Estonia." },
      { who: "Mari", et: "Sa räägid hästi eesti keelt!", en: "You speak Estonian well!" },
      { who: "Tom", et: "Aitäh! Ma õpin veel.", en: "Thank you! I'm still learning." },
      { who: "Mari", et: "Tule laupäeval meile! Ma teen süüa.", en: "Come over to our place on Saturday! I'm cooking." },
      { who: "Tom", et: "Aitäh! Mis kell?", en: "Thank you! What time?" },
      { who: "Mari", et: "Kell kuus. Kas sa saad?", en: "At six. Can you?" },
      { who: "Tom", et: "Jah, kindlasti! Laupäeval kell kuus.", en: "Yes, definitely! Saturday at six." },
      { who: "Mari", et: "Väga hea. Head aega!", en: "Lovely. Bye!" },
    ],
    teaches: [],
    how: {
      point: "A whole first meeting with a neighbor, made of something from every part of A1.",
      notes: [
        "Part one gave you hello and names, part two where you're from, part three a time, part four cooking, and the invitation is lesson 46's command: {Tule laupäeval meile!}",
        "{Meile} means to us, and with {tule} it means \"come over to our place\".",
        "If you can hold this conversation, you can do what A1 promises: meet somebody, say who you are, and make a plan.",
      ],
      watchOut: "{Ma õpin veel} is the most useful thing to say when somebody compliments your Estonian: I'm still learning. It's true, it's modest, and it keeps the conversation in Estonian.",
      examples: [4, 5, 6],
    },
    answers: [
      { ask: { et: "Kust sa pärit oled?", en: "Where are you from?" }, cue: "Say where you're from, and that you live in Estonia.", model: { et: "Ma olen pärit Inglismaalt, aga ma elan Eestis.", en: "I'm from England, but I live in Estonia." } },
      { ask: { et: "Sa räägid hästi eesti keelt!", en: "You speak Estonian well!" }, cue: "Thank her, and say you're still learning.", model: { et: "Aitäh! Ma õpin veel.", en: "Thank you! I'm still learning." } },
      { ask: { et: "Tule laupäeval meile!", en: "Come over to our place on Saturday!" }, cue: "Say thank you, and ask what time.", model: { et: "Aitäh! Mis kell?", en: "Thank you! What time?" } },
    ],
    roleplay: {
      scene: "A new neighbor stops you on the stairs. She speaks first. Answer her as yourself.",
      turns: [
        { ask: { et: "Tere! Mina olen Mari. Ma elan ka siin.", en: "Hello! I'm Mari. I live here too." }, cue: "Say hello, you're pleased to meet her, and your name.", model: { et: "Tere! Väga meeldiv! Mina olen Tom.", en: "Hello! Nice to meet you! I'm Tom." } },
        { ask: { et: "Kust sa pärit oled?", en: "Where are you from?" }, cue: "Say where you're from.", model: { et: "Ma olen pärit Inglismaalt.", en: "I'm from England." } },
        { ask: { et: "Sa räägid hästi eesti keelt!", en: "You speak Estonian well!" }, cue: "Thank her, and say you're still learning.", model: { et: "Aitäh! Ma õpin veel.", en: "Thank you! I'm still learning." } },
        { ask: { et: "Tule laupäeval meile! Ma teen süüa.", en: "Come over to our place on Saturday! I'm cooking." }, cue: "Thank her and ask what time.", model: { et: "Aitäh! Mis kell?", en: "Thank you! What time?" } },
        { ask: { et: "Kell kuus. Kas sa saad?", en: "At six. Can you?" }, cue: "Say yes, definitely.", model: { et: "Jah, kindlasti!", en: "Yes, definitely!" } },
        { ask: { et: "Väga hea. Head aega!", en: "Lovely. Bye!" }, cue: "Say goodbye.", model: { et: "Nägemist!", en: "See you!" } },
      ],
    },
  },
];
