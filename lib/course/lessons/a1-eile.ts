/**
 * A1, LESSONS 41 TO 45: EILE JA HOMME (docs/43-lessons.md §4.7).
 *
 * Tomorrow first, because Estonian has no future tense and that is good news:
 * the present and a word for when already says it. Then the past, which is
 * not good news in the same way: its I-form is learned with each verb
 * (`lib/estonian/conjugate.ts` derives none of it, rightly, since `tegin`
 * and `lugesin` follow nothing you could guess), so every past form a lesson
 * shows here is taught by name rather than built by a pattern. Then the
 * months and seasons, and a check-in about the weekend.
 *
 * Read by the native speaker in the pull request that adds it, and held to
 * the same two checks as every lesson (`lessons.test.ts`, `ledger.ts`).
 */

import type { LessonSpec, PartOfLessons } from "./types";

export const A1_EILE_PART: PartOfLessons = {
  id: "a1-eile",
  level: "A1",
  title: "{Eile ja homme}",
  about: "Tomorrow and yesterday: plans, what you did, and the months of the year.",
};

export const A1_EILE_LESSONS: readonly LessonSpec[] = [
  {
    id: "a1-41-tomorrow",
    n: 41,
    level: "A1",
    part: "a1-eile",
    kind: "lesson",
    title: "Tomorrow",
    goal: "Say what you'll do tomorrow and next week, and make a date to meet.",
    cast: { Mari: "mari", Tom: "kalev" },
    conversation: [
      { who: "Mari", et: "Tom, mida sa homme teed?", en: "Tom, what are you doing tomorrow?" },
      { who: "Tom", et: "Homme ma töötan. Ja laupäeval ma sõidan Tartusse.", en: "Tomorrow I'm working. And on Saturday I'm going to Tartu." },
      { who: "Mari", et: "Ja järgmisel nädalal?", en: "And next week?" },
      { who: "Tom", et: "Ma ei tea. Võib-olla ma olen kodus.", en: "I don't know. Maybe I'll be at home." },
      { who: "Mari", et: "Mina olen järgmisel nädalal Tallinnas! Saame kokku?", en: "I'm in Tallinn next week! Shall we meet up?" },
      { who: "Tom", et: "Jah, kindlasti!", en: "Yes, definitely!" },
    ],
    teaches: [
      { kind: "word", et: "järgmine", en: "next" },
      { kind: "phrase", et: "järgmisel nädalal", en: "next week" },
      { kind: "phrase", et: "võib-olla", en: "maybe" },
      { kind: "word", et: "kindlasti", en: "definitely, for sure" },
      { kind: "phrase", et: "Saame kokku!", en: "Let's meet up!" },
    ],
    how: {
      point: "Estonian has no future tense. The present and a word for when says it: {Homme ma töötan}, I'll work tomorrow.",
      table: {
        head: ["When", "Estonian"],
        rows: [
          [{ en: "today" }, { et: "täna" }],
          [{ en: "tomorrow" }, { et: "homme" }],
          [{ en: "on Saturday" }, { et: "laupäeval" }],
          [{ en: "next week" }, { et: "järgmisel nädalal" }],
        ],
      },
      notes: [
        "The word for when often goes first, and then the verb comes straight after it: {Homme ma töötan}.",
        "{Saame kokku} is let's meet up. {Kokku} with {saama} is getting together, not the total at the till from lesson 27.",
        "{Võib-olla} is maybe, and the line in the middle is part of how it's written.",
      ],
      watchOut: "Don't look for a word for will. {Laupäeval ma sõidan Tartusse} already says I'll go to Tartu on Saturday.",
      examples: [0, 1, 4],
    },
    answers: [
      { ask: { et: "Mida sa homme teed?", en: "What are you doing tomorrow?" }, cue: "Say you're working tomorrow.", model: { et: "Homme ma töötan.", en: "Tomorrow I'm working." } },
      { ask: { et: "Ja järgmisel nädalal?", en: "And next week?" }, cue: "Say maybe you'll be in Tartu.", model: { et: "Võib-olla ma olen Tartus.", en: "Maybe I'll be in Tartu." } },
      { ask: { et: "Saame kokku?", en: "Shall we meet up?" }, cue: "Say yes, definitely.", model: { et: "Jah, kindlasti!", en: "Yes, definitely!" } },
    ],
  },
  {
    id: "a1-42-yesterday",
    n: 42,
    level: "A1",
    part: "a1-eile",
    kind: "lesson",
    title: "Yesterday",
    goal: "Say what you did yesterday.",
    cast: { Mari: "mari", Tom: "kalev" },
    conversation: [
      { who: "Mari", et: "Tom, mida sa eile tegid?", en: "Tom, what did you do yesterday?" },
      { who: "Tom", et: "Eile ma olin kodus. Ma tegin süüa ja lugesin raamatut.", en: "Yesterday I was at home. I cooked and read a book." },
      { who: "Mari", et: "Ja õhtul?", en: "And in the evening?" },
      { who: "Tom", et: "Õhtul ma käisin poes. Ja sina?", en: "In the evening I went to the shop. And you?" },
      { who: "Mari", et: "Mina olin tööl. Õhtul ma sõin ja jõin teed.", en: "I was at work. In the evening I ate and had some tea." },
    ],
    teaches: [
      { kind: "phrase", et: "Mida sa eile tegid?", en: "What did you do yesterday?" },
      { kind: "verb", et: "käima", first: "käin", en: "to go and come back, to visit", firstEn: "I go (and come back)" },
      { kind: "form", et: "olin", of: "olema", en: "I was" },
      { kind: "form", et: "tegin", of: "tegema", en: "I did, I made" },
      { kind: "form", et: "lugesin", of: "lugema", en: "I read (yesterday)" },
      { kind: "form", et: "käisin", of: "käima", en: "I went, I visited" },
      { kind: "form", et: "sõin", of: "sööma", en: "I ate" },
      { kind: "form", et: "jõin", of: "jooma", en: "I drank" },
    ],
    how: {
      point: "The past for I ends in -in, and the rest of the word is learned with each verb: {olin}, {tegin}, {sõin}.",
      table: {
        head: ["Verb", "Now", "Yesterday"],
        rows: [
          [{ et: "olema" }, { et: "olen" }, { et: "olin" }],
          [{ et: "tegema" }, { et: "teen" }, { et: "tegin" }],
          [{ et: "lugema" }, { et: "loen" }, { et: "lugesin" }],
          [{ et: "käima" }, { et: "käin" }, { et: "käisin" }],
          [{ et: "sööma" }, { et: "söön" }, { et: "sõin" }],
          [{ et: "jooma" }, { et: "joon" }, { et: "jõin" }],
        ],
      },
      notes: [
        "Learn the past with the verb, the way you learned its I-form: {sööma, söön, sõin}. A few change a lot, and these are the commonest.",
        "{Käisin} is the usual way to say you went somewhere and came back: {Ma käisin poes}, I went to the shop.",
        "{Mida sa eile tegid?} is what did you do yesterday. Take it whole tonight; the other persons are the next lesson.",
      ],
      watchOut: "With {käisin}, the place is where you were, not where to: {Ma käisin poes}, never with {poodi}.",
      examples: [1, 3, 4],
    },
    answers: [
      { ask: { et: "Mida sa eile tegid?", en: "What did you do yesterday?" }, cue: "Say you were at home and read a book.", model: { et: "Ma olin kodus ja lugesin raamatut.", en: "I was at home and read a book." } },
      { cue: "Say you went to the shop yesterday.", model: { et: "Eile ma käisin poes.", en: "Yesterday I went to the shop." } },
      { cue: "Say you ate cake and drank coffee.", model: { et: "Ma sõin kooki ja jõin kohvi.", en: "I ate cake and drank coffee." } },
    ],
  },
  {
    id: "a1-43-past-persons",
    n: 43,
    level: "A1",
    part: "a1-eile",
    kind: "lesson",
    title: "What did you do?",
    goal: "Ask what somebody did, and say what other people did.",
    cast: { Liis: "liivika", Tom: "kalev" },
    conversation: [
      { who: "Liis", et: "Tom, kus sa laupäeval olid?", en: "Tom, where were you on Saturday?" },
      { who: "Tom", et: "Ma olin Tartus. Ja Mari oli ka seal.", en: "I was in Tartu. And Mari was there too." },
      { who: "Liis", et: "Mida te seal tegite?", en: "What did you do there?" },
      { who: "Tom", et: "Me käisime poes ja kohvikus.", en: "We went round the shops and to a café." },
      { who: "Liis", et: "Ja Jaan? Kas ta käis ka?", en: "And Jaan? Did he come too?" },
      { who: "Tom", et: "Ei, Jaan oli tööl.", en: "No, Jaan was at work." },
    ],
    teaches: [
      { kind: "form", et: "olid", of: "olema", en: "you were, they were" },
      { kind: "form", et: "olime", of: "olema", en: "we were" },
      { kind: "form", et: "olite", of: "olema", en: "you were, polite or more than one" },
      { kind: "form", et: "tegid", of: "tegema", en: "you did, they did" },
      { kind: "form", et: "tegi", of: "tegema", en: "he, she did" },
      { kind: "form", et: "tegime", of: "tegema", en: "we did" },
      { kind: "form", et: "tegite", of: "tegema", en: "you did, polite or more than one" },
      { kind: "form", et: "käisid", of: "käima", en: "you went, they went" },
      { kind: "form", et: "käis", of: "käima", en: "he, she went" },
      { kind: "form", et: "käisime", of: "käima", en: "we went" },
      { kind: "form", et: "käisite", of: "käima", en: "you went, polite or more than one" },
      { kind: "word", et: "kohvik", en: "café" },
      { kind: "form", et: "kohvikus", of: "kohvik", en: "in a café" },
    ],
    how: {
      point: "The past has six endings, -in, -id, -s, -ime, -ite, -id, though for {ta} some verbs drop the s: {käis}, but {oli} and {tegi}.",
      table: {
        head: ["", "{olema}", "{käima}", "{tegema}"],
        rows: [
          [{ et: "ma" }, { et: "olin" }, { et: "käisin" }, { et: "tegin" }],
          [{ et: "sa" }, { et: "olid" }, { et: "käisid" }, { et: "tegid" }],
          [{ et: "ta" }, { et: "oli" }, { et: "käis" }, { et: "tegi" }],
          [{ et: "me" }, { et: "olime" }, { et: "käisime" }, { et: "tegime" }],
          [{ et: "te" }, { et: "olite" }, { et: "käisite" }, { et: "tegite" }],
          [{ et: "nad" }, { et: "olid" }, { et: "käisid" }, { et: "tegid" }],
        ],
      },
      notes: [
        "Learn the I-form of the past with each verb, and the others follow it, all but the {ta} form, which is learned too.",
        "{Kohvikus} is in the café: {kohvik} with lesson 32's -s.",
        "Ask with {kas} as ever: {Kas ta käis ka?}, did he come too?",
      ],
      watchOut: "{Sa olid} and {nad olid} are the same word, and so are {sa tegid} and {nad tegid}. The person in front tells you which.",
      examples: [0, 2, 3],
    },
    answers: [
      { ask: { et: "Kus sa laupäeval olid?", en: "Where were you on Saturday?" }, cue: "Say you were in Tartu.", model: { et: "Ma olin Tartus.", en: "I was in Tartu." } },
      { cue: "Ask a friend what they did on Sunday.", model: { et: "Mida sa pühapäeval tegid?", en: "What did you do on Sunday?" } },
      { ask: { et: "Mida te tegite?", en: "What did you do?" }, cue: "Say you went to a café.", model: { et: "Me käisime kohvikus.", en: "We went to a café." } },
    ],
  },
  {
    id: "a1-44-months",
    n: 44,
    level: "A1",
    part: "a1-eile",
    kind: "lesson",
    title: "Months and seasons",
    goal: "Name the months and the seasons, and say what you do when.",
    cast: { Mari: "mari", Tom: "kalev" },
    conversation: [
      { who: "Mari", et: "Tom, mis kuu praegu on?", en: "Tom, what month is it now?" },
      { who: "Tom", et: "Praegu on oktoober. Sügis!", en: "It's October now. Autumn!" },
      { who: "Mari", et: "Mulle meeldib sügis. Aga talv ei meeldi.", en: "I like autumn. But I don't like winter." },
      { who: "Tom", et: "Mulle meeldib talv! Talvel sajab lund.", en: "I like winter! In winter it snows." },
      { who: "Mari", et: "Ja suvel?", en: "And in summer?" },
      { who: "Tom", et: "Suvel on soe. Juulis ma sõidan Tartusse.", en: "In summer it's warm. In July I'm going to Tartu." },
    ],
    teaches: [
      { kind: "word", et: "kuu", en: "month" },
      { kind: "word", et: "jaanuar", en: "January" },
      { kind: "word", et: "veebruar", en: "February" },
      { kind: "word", et: "märts", en: "March" },
      { kind: "word", et: "aprill", en: "April" },
      { kind: "word", et: "mai", en: "May" },
      { kind: "word", et: "juuni", en: "June" },
      { kind: "word", et: "juuli", en: "July" },
      { kind: "word", et: "august", en: "August" },
      { kind: "word", et: "september", en: "September" },
      { kind: "word", et: "oktoober", en: "October" },
      { kind: "word", et: "november", en: "November" },
      { kind: "word", et: "detsember", en: "December" },
      { kind: "word", et: "talv", en: "winter" },
      { kind: "word", et: "kevad", en: "spring" },
      { kind: "word", et: "suvi", en: "summer" },
      { kind: "word", et: "sügis", en: "autumn" },
      { kind: "phrase", et: "talvel", en: "in winter" },
      { kind: "phrase", et: "kevadel", en: "in spring" },
      { kind: "phrase", et: "suvel", en: "in summer" },
      { kind: "phrase", et: "sügisel", en: "in autumn" },
      { kind: "phrase", et: "juulis", en: "in July" },
    ],
    how: {
      point: "A season takes -l for when, like a day does: {talvel}, in winter. A month takes -s: {juulis}, in July.",
      table: {
        head: ["Season", "When"],
        rows: [
          [{ et: "talv" }, { et: "talvel" }],
          [{ et: "kevad" }, { et: "kevadel" }],
          [{ et: "suvi" }, { et: "suvel" }],
          [{ et: "sügis" }, { et: "sügisel" }],
        ],
      },
      notes: [
        "The months look like the English ones and are said the Estonian way, every letter: {jaanuar}, {juuni}, {juuli}.",
        "Months and seasons take no capital letter, like the days.",
        "{Juulis} is lesson 32's -s for in: in July.",
      ],
      watchOut: "{Juuni} and {juuli} are a letter apart, June and July. Say the middle sound clearly.",
      examples: [1, 3, 5],
    },
    answers: [
      { ask: { et: "Mis kuu praegu on?", en: "What month is it now?" }, cue: "Say it's October.", model: { et: "Praegu on oktoober.", en: "It's October now." } },
      { cue: "Say you like summer.", model: { et: "Mulle meeldib suvi.", en: "I like summer." } },
      { cue: "Say in winter it's cold.", model: { et: "Talvel on külm.", en: "In winter it's cold." } },
    ],
  },
  {
    id: "a1-45-weekend",
    n: 45,
    level: "A1",
    part: "a1-eile",
    kind: "checkin",
    title: "The weekend",
    goal: "Tell a friend what you did at the weekend, and make a plan for next week.",
    cast: { Liis: "liivika", Tom: "kalev" },
    conversation: [
      { who: "Liis", et: "Tere, Tom! Kuidas läheb?", en: "Hi, Tom! How's it going?" },
      { who: "Tom", et: "Hästi, aitäh! Ja sinul?", en: "Good, thanks! And you?" },
      { who: "Liis", et: "Normaalselt. Mida sa laupäeval tegid?", en: "Not bad. What did you do on Saturday?" },
      { who: "Tom", et: "Ma käisin poes ja siis olin kodus. Ma lugesin raamatut.", en: "I went to the shop and then I was at home. I read a book." },
      { who: "Liis", et: "Ja pühapäeval?", en: "And on Sunday?" },
      { who: "Tom", et: "Pühapäeval ma olin Tartus.", en: "On Sunday I was in Tartu." },
      { who: "Liis", et: "Tartus? Väga hea! Saame järgmisel nädalal kokku?", en: "In Tartu? How nice! Shall we meet up next week?" },
      { who: "Tom", et: "Jah, kindlasti!", en: "Yes, definitely!" },
    ],
    teaches: [],
    how: {
      point: "A whole chat about the weekend, made only of what the last four lessons taught.",
      notes: [
        "Notice how the past and the future sit side by side: what you did on Saturday, and when you'll meet next week.",
        "{Saame järgmisel nädalal kokku?} puts the when in the middle, and it's still a plan to meet up.",
      ],
      watchOut: "A chat like this is mostly short answers. {Pühapäeval ma olin Tartus} is plenty.",
      examples: [3, 5, 6],
    },
    answers: [
      { ask: { et: "Mida sa laupäeval tegid?", en: "What did you do on Saturday?" }, cue: "Say you went to the shop.", model: { et: "Ma käisin poes.", en: "I went to the shop." } },
      { ask: { et: "Kus sa pühapäeval olid?", en: "Where were you on Sunday?" }, cue: "Say you were at home.", model: { et: "Ma olin kodus.", en: "I was at home." } },
      { ask: { et: "Saame kokku?", en: "Shall we meet up?" }, cue: "Say yes, next week.", model: { et: "Jah, järgmisel nädalal.", en: "Yes, next week." } },
    ],
    roleplay: {
      scene: "Your friend Liis rings on Monday to ask about your weekend.",
      turns: [
        { ask: { et: "Tere! Kuidas läheb?", en: "Hi! How's it going?" }, cue: "Say well, and ask back.", model: { et: "Hästi, aitäh! Ja sinul?", en: "Good, thanks! And you?" } },
        { ask: { et: "Normaalselt. Mida sa laupäeval tegid?", en: "Not bad. What did you do on Saturday?" }, cue: "Say what you did.", model: { et: "Ma käisin poes ja lugesin raamatut.", en: "I went to the shop and read a book." } },
        { ask: { et: "Ja pühapäeval?", en: "And on Sunday?" }, cue: "Say where you were.", model: { et: "Pühapäeval ma olin kodus.", en: "On Sunday I was at home." } },
        { ask: { et: "Saame järgmisel nädalal kokku?", en: "Shall we meet up next week?" }, cue: "Say yes, definitely.", model: { et: "Jah, kindlasti!", en: "Yes, definitely!" } },
      ],
    },
  },
];
