/**
 * A1, LESSON BY LESSON (docs/43-lessons.md §4).
 *
 * This file holds part one, lessons 1 to 8 (Tere!): hello, being stuck, your
 * name, the six persons, the first questions, yes and no, and how it is going,
 * then an evening that puts all of it together on a neighbour on the stairs.
 * Parts two to eight are a file each (`a1-elad.ts` to `a1-abi.ts`), and
 * `A1_LESSONS` at the foot is all forty-nine in teaching order, which is the
 * order the ledger walks.
 *
 * EVERY ESTONIAN LINE HERE WAS WRITTEN FOR A BEGINNER AND IS READ BY THE
 * NATIVE SPEAKER IN THE PULL REQUEST THAT ADDS IT (ADR-005 amendment 6). Two
 * checks run before anybody reads it: every spelling is one the forms list
 * knows (`lessons.test.ts`), and every spelling has been taught by the lesson
 * it is shown in (`ledger.ts`). Neither can say a line sounds like a person,
 * which is what the reading is for, and anything that reads as unnatural is
 * replaced rather than defended.
 *
 * Estonian inside an English sentence is in braces, `{mina}`, so the screen
 * marks it as Estonian and the ledger holds it to the same rule.
 */

import { A1_ELAD_LESSONS, A1_ELAD_PART } from "./a1-elad";
import { A1_KELL_LESSONS, A1_KELL_PART } from "./a1-kell";
import { A1_SOOK_LESSONS, A1_SOOK_PART } from "./a1-sook";
import { A1_LINN_LESSONS, A1_LINN_PART } from "./a1-linn";
import { A1_POOD_LESSONS, A1_POOD_PART } from "./a1-pood";
import { A1_EILE_LESSONS, A1_EILE_PART } from "./a1-eile";
import { A1_ABI_LESSONS, A1_ABI_PART } from "./a1-abi";
import type { LessonSpec, PartOfLessons } from "./types";

export const A1_LESSON_PARTS: readonly PartOfLessons[] = [
  { id: "a1-tere", level: "A1", title: "First words", about: "First words: hello, your name, who you are, and how it's going." },
  A1_ELAD_PART,
  A1_KELL_PART,
  A1_SOOK_PART,
  A1_LINN_PART,
  A1_POOD_PART,
  A1_EILE_PART,
  A1_ABI_PART,
];

const TERE_LESSONS: readonly LessonSpec[] = [
  {
    id: "a1-01-hello",
    n: 1,
    level: "A1",
    part: "a1-tere",
    kind: "lesson",
    title: "Hello and thank you",
    goal: "Say hello, thank you and goodbye, at any time of day.",
    cast: { Mari: "mari", Jaan: "tambet" },
    conversation: [
      { who: "Mari", et: "Tere hommikust!", en: "Good morning!" },
      { who: "Jaan", et: "Tere, tere!", en: "Hi there!" },
      { who: "Mari", et: "Palun.", en: "Here you are.", stage: "She hands him a coffee." },
      { who: "Jaan", et: "Aitäh!", en: "Thank you!" },
      { who: "Mari", et: "Palun!", en: "You're welcome!" },
      { who: "Jaan", et: "Head aega!", en: "Goodbye!" },
      { who: "Mari", et: "Nägemist!", en: "Bye, see you!" },
    ],
    teaches: [
      { kind: "phrase", et: "Tere!", en: "Hello! Hi!" },
      { kind: "phrase", et: "Tere hommikust!", en: "Good morning!" },
      { kind: "phrase", et: "Tere päevast!", en: "Good afternoon!" },
      { kind: "phrase", et: "Tere õhtust!", en: "Good evening!" },
      { kind: "phrase", et: "Aitäh!", en: "Thank you!" },
      { kind: "phrase", et: "Palun!", en: "Please. Here you are. You're welcome." },
      { kind: "phrase", et: "Head aega!", en: "Goodbye!" },
      { kind: "phrase", et: "Nägemist!", en: "See you! Bye!" },
    ],
    how: {
      point: "Estonian is said the way it is written: one letter is one sound, and every letter is said.",
      notes: [
        "A double letter is a long sound. The mm in {Tere hommikust} is held a little longer than an English m.",
        "Four letters have no key on an English keyboard: õ, ä, ö and ü. Each is a letter of its own with a sound of its own, not a mark on another letter.",
        "{Palun} does three jobs: please, here you are, and you're welcome.",
      ],
      table: {
        head: ["Letter", "Sounds a bit like", "As in"],
        rows: [
          [{ en: "ä" }, { en: "the a in cat" }, { et: "aitäh" }],
          [{ en: "õ" }, { en: "an o said with the lips spread, not rounded" }, { et: "Tere õhtust" }],
          [{ en: "mm" }, { en: "a long m: hold it" }, { et: "Tere hommikust" }],
          [{ en: "h" }, { en: "always said, even at the end of a word" }, { et: "aitäh" }],
        ],
      },
      watchOut: "Don't drop the h at the end of {aitäh}. Every letter is said, the last one too.",
      examples: [0, 3],
    },
    answers: [
      { ask: { et: "Tere!", en: "Hello!" }, cue: "Say hello back.", model: { et: "Tere!", en: "Hello!" } },
      { ask: { et: "Aitäh!", en: "Thank you!" }, cue: "They thank you. Say you're welcome.", model: { et: "Palun!", en: "You're welcome!" } },
      { cue: "It's evening. Greet somebody.", model: { et: "Tere õhtust!", en: "Good evening!" } },
      { ask: { et: "Head aega!", en: "Goodbye!" }, cue: "Say goodbye back.", model: { et: "Nägemist!", en: "See you!" } },
    ],
  },
  {
    id: "a1-02-stuck",
    n: 2,
    level: "A1",
    part: "a1-tere",
    kind: "lesson",
    title: "When you're stuck",
    goal: "Say you don't understand, ask for it again and slower, and ask whether somebody speaks English.",
    cast: { Liis: "liivika", Tom: "kalev" },
    conversation: [
      { who: "Liis", et: "Tere!", en: "Hello!", stage: "And then a long sentence, very fast." },
      { who: "Tom", et: "Vabandust, ma ei saa aru. Palun korrake.", en: "Sorry, I don't understand. Could you say that again?" },
      { who: "Liis", stage: "She says it again, just as fast." },
      { who: "Tom", et: "Aeglasemalt, palun.", en: "Slower, please." },
      { who: "Liis", stage: "She says it slowly. It's still too hard." },
      { who: "Tom", et: "Kas te räägite inglise keelt?", en: "Do you speak English?" },
      { who: "Liis", et: "Jah, natuke.", en: "Yes, a little.", stage: "And she says it again, in English." },
      { who: "Tom", et: "Selge! Aitäh!", en: "Got it! Thank you!" },
    ],
    teaches: [
      { kind: "word", et: "jah", en: "yes" },
      { kind: "word", et: "ei", en: "no" },
      { kind: "word", et: "natuke", en: "a little" },
      { kind: "word", et: "selge", en: "clear; got it" },
      { kind: "phrase", et: "Vabandust!", en: "Sorry! Excuse me!" },
      { kind: "phrase", et: "Ma ei saa aru.", en: "I don't understand." },
      { kind: "phrase", et: "Palun korrake.", en: "Please say that again." },
      { kind: "phrase", et: "Aeglasemalt, palun.", en: "Slower, please." },
      { kind: "phrase", et: "Kas te räägite inglise keelt?", en: "Do you speak English?" },
    ],
    how: {
      point: "You don't have to understand everything. You need a way to say so, and these lines are it.",
      notes: [
        "{Ma ei saa aru} is \"I don't understand\". Learn it whole: you'll say it more than any other sentence in your first months.",
        "{Kas te räägite inglise keelt?} asks it the polite way, which is the right way to ask a stranger. You'll meet the friendly way in lesson 4.",
        "{Vabandust} is both sorry and excuse me, so it opens a question to a stranger too.",
        "{Selge} is clear, and on its own it's how you say you've got it: {Selge! Aitäh!}",
      ],
      watchOut: "Don't apologise and switch to English at the first word you miss. Say {Aeglasemalt, palun} first: most people are happy to slow down.",
      examples: [1, 3],
    },
    answers: [
      { cue: "Somebody speaks to you very fast. Say sorry, you don't understand.", model: { et: "Vabandust, ma ei saa aru.", en: "Sorry, I don't understand." } },
      { cue: "Ask them to say it again.", model: { et: "Palun korrake.", en: "Please say that again." } },
      { cue: "Ask them to speak more slowly.", model: { et: "Aeglasemalt, palun.", en: "Slower, please." } },
      { cue: "Ask whether they speak English.", model: { et: "Kas te räägite inglise keelt?", en: "Do you speak English?" } },
      { ask: { et: "Kas te räägite inglise keelt?", en: "Do you speak English?" }, cue: "Answer: yes, a little.", model: { et: "Jah, natuke.", en: "Yes, a little." } },
    ],
  },
  {
    id: "a1-03-name",
    n: 3,
    level: "A1",
    part: "a1-tere",
    kind: "lesson",
    title: "Your name",
    goal: "Say your name, ask somebody theirs, and say you're pleased to meet them.",
    cast: { Mari: "mari", Tom: "kalev" },
    conversation: [
      { who: "Mari", et: "Tere! Minu nimi on Mari. Mis su nimi on?", en: "Hello! My name is Mari. What's your name?" },
      { who: "Tom", et: "Tere! Mu nimi on Tom.", en: "Hi! My name's Tom." },
      { who: "Mari", et: "Väga meeldiv!", en: "Nice to meet you!" },
      { who: "Tom", et: "Väga meeldiv!", en: "Nice to meet you too!" },
    ],
    teaches: [
      { kind: "word", et: "nimi", en: "name" },
      { kind: "form", et: "on", of: "olema", en: "is" },
      { kind: "word", et: "minu", en: "my" },
      { kind: "word", et: "mu", en: "my" },
      { kind: "word", et: "sinu", en: "your" },
      { kind: "word", et: "su", en: "your" },
      { kind: "phrase", et: "Mis su nimi on?", en: "What's your name?" },
      { kind: "phrase", et: "Väga meeldiv!", en: "Nice to meet you!" },
    ],
    how: {
      point: "My and your each have a long form and a short one. The short one is what people usually say.",
      table: {
        head: ["", "Long", "Short"],
        rows: [
          [{ en: "my" }, { et: "minu" }, { et: "mu" }],
          [{ en: "your" }, { et: "sinu" }, { et: "su" }],
        ],
      },
      notes: [
        "{Minu nimi on Mari} and {Mu nimi on Mari} say the same thing. The long form leans on it: my name, not yours.",
        "Estonian has no word for a or the. {Nimi} is name, a name and the name.",
      ],
      watchOut: "{On} here is \"is\". It has nothing to do with the English on, as in on the table.",
      examples: [0, 1],
    },
    answers: [
      { ask: { et: "Mis su nimi on?", en: "What's your name?" }, cue: "Say your own name.", model: { et: "Minu nimi on Tom.", en: "My name is Tom." } },
      { cue: "Now ask them theirs.", model: { et: "Mis su nimi on?", en: "What's your name?" } },
      { ask: { et: "Mu nimi on Mari.", en: "My name's Mari." }, cue: "Say you're pleased to meet her.", model: { et: "Väga meeldiv!", en: "Nice to meet you!" } },
    ],
  },
  {
    id: "a1-04-persons",
    n: 4,
    level: "A1",
    part: "a1-tere",
    kind: "lesson",
    title: "I am, you are",
    goal: "Say who you are and what you do, and who somebody else is.",
    cast: { Mari: "mari", Tom: "kalev" },
    conversation: [
      { who: "Mari", et: "Tere! Mina olen Mari. Ma olen õpetaja.", en: "Hello! I'm Mari. I'm a teacher." },
      { who: "Tom", et: "Tere! Mina olen Tom. Ma olen õpilane.", en: "Hello! I'm Tom. I'm a student." },
      { who: "Mari", et: "Ja tema?", en: "And him?", stage: "She looks at the man by the door." },
      { who: "Tom", et: "Tema on Jaan. Ta on arst.", en: "That's Jaan. He's a doctor." },
    ],
    teaches: [
      { kind: "word", et: "mina", en: "I" },
      { kind: "word", et: "ma", en: "I" },
      { kind: "word", et: "sina", en: "you, one person you know" },
      { kind: "word", et: "sa", en: "you, one person you know" },
      { kind: "word", et: "tema", en: "he, she" },
      { kind: "word", et: "ta", en: "he, she" },
      { kind: "word", et: "meie", en: "we" },
      { kind: "word", et: "me", en: "we" },
      { kind: "word", et: "teie", en: "you, polite or more than one" },
      { kind: "word", et: "te", en: "you, polite or more than one" },
      { kind: "word", et: "nemad", en: "they" },
      { kind: "word", et: "nad", en: "they" },
      { kind: "word", et: "olema", en: "to be" },
      { kind: "form", et: "olen", of: "olema", en: "I am" },
      { kind: "form", et: "oled", of: "olema", en: "you are, to one person you know" },
      { kind: "form", et: "oleme", of: "olema", en: "we are" },
      { kind: "form", et: "olete", of: "olema", en: "you are, polite or more than one" },
      { kind: "word", et: "ja", en: "and" },
      { kind: "word", et: "õpetaja", en: "teacher" },
      { kind: "word", et: "õpilane", en: "student, pupil" },
      { kind: "word", et: "arst", en: "doctor" },
    ],
    how: {
      point: "Estonian has six persons, and most of them have a long form and a short one.",
      table: {
        head: ["", "Long", "Short", "With {olema}, to be"],
        rows: [
          [{ en: "I" }, { et: "mina" }, { et: "ma" }, { et: "olen" }],
          [{ en: "you, one person you know" }, { et: "sina" }, { et: "sa" }, { et: "oled" }],
          [{ en: "he, she" }, { et: "tema" }, { et: "ta" }, { et: "on" }],
          [{ en: "we" }, { et: "meie" }, { et: "me" }, { et: "oleme" }],
          [{ en: "you, polite or more than one" }, { et: "teie" }, { et: "te" }, { et: "olete" }],
          [{ en: "they" }, { et: "nemad" }, { et: "nad" }, { et: "on" }],
        ],
      },
      notes: [
        "The short forms are what people usually say. The long form is for the person who matters in the sentence: {Mina olen Mari}, and that one's Jaan.",
        "Every person ends the verb differently, which is why Estonian can leave the person out: {Olen õpetaja} is \"I'm a teacher\".",
        "{Tema} is he and she. Estonian uses one word for both.",
      ],
      watchOut: "Use {teie} with somebody you don't know and {sina} with friends and family. Getting it wrong isn't rude, only a little too formal or a little too friendly.",
      examples: [0, 3],
    },
    answers: [
      { ask: { et: "Mina olen Mari. Ja sina?", en: "I'm Mari. And you?" }, cue: "Say who you are.", model: { et: "Mina olen Tom.", en: "I'm Tom." } },
      { cue: "Say you're a student. Or a teacher, or a doctor, if that's you.", model: { et: "Ma olen õpilane.", en: "I'm a student." } },
      { ask: { et: "Ja tema?", en: "And him?" }, cue: "Say that's Jaan, and he's a doctor.", model: { et: "Tema on Jaan. Ta on arst.", en: "That's Jaan. He's a doctor." } },
    ],
  },
  {
    id: "a1-05-what-who",
    n: 5,
    level: "A1",
    part: "a1-tere",
    kind: "lesson",
    title: "What is this, who is that?",
    goal: "Ask what something is and who somebody is, and answer.",
    cast: { Tom: "kalev", Mari: "mari" },
    conversation: [
      { who: "Tom", et: "Mis see on?", en: "What's this?" },
      { who: "Mari", et: "See on raamat.", en: "It's a book." },
      { who: "Tom", et: "Ja see?", en: "And this?" },
      { who: "Mari", et: "See on telefon.", en: "It's a phone." },
      { who: "Tom", et: "Kes see on?", en: "Who's this?", stage: "He points at a photo." },
      { who: "Mari", et: "See on minu sõber Jaan. Ta on arst.", en: "That's my friend Jaan. He's a doctor." },
    ],
    teaches: [
      { kind: "word", et: "see", en: "this, that, it" },
      { kind: "word", et: "mis", en: "what" },
      { kind: "word", et: "kes", en: "who" },
      { kind: "word", et: "raamat", en: "book" },
      { kind: "word", et: "telefon", en: "phone" },
      { kind: "word", et: "sõber", en: "friend" },
    ],
    how: {
      point: "A question starts with its question word, and the rest stays in the order it was in.",
      table: {
        head: ["Question", "Answer"],
        rows: [
          [{ et: "Mis see on?" }, { et: "See on raamat." }],
          [{ et: "Kes see on?" }, { et: "See on Jaan." }],
        ],
      },
      notes: [
        "{Mis} asks about things and {kes} about people. Point at a person and it's {Kes see on?}, never {mis}.",
        "{See} is this, that and it at once. Pointing does the rest.",
      ],
      watchOut: "Don't move the verb to the front to make a question, the way English turns \"it is\" into \"is it\". Estonian keeps {see on} as it was and puts the question word first.",
      examples: [0, 4],
    },
    answers: [
      { ask: { et: "Mis see on?", en: "What's this?" }, cue: "It's a book. Say so.", model: { et: "See on raamat.", en: "It's a book." } },
      { ask: { et: "Kes see on?", en: "Who's this?" }, cue: "It's your friend. Say so.", model: { et: "See on minu sõber.", en: "That's my friend." } },
      { cue: "Point at something near you and ask what it is.", model: { et: "Mis see on?", en: "What's this?" } },
    ],
  },
  {
    id: "a1-06-yes-no",
    n: 6,
    level: "A1",
    part: "a1-tere",
    kind: "lesson",
    title: "Yes or no",
    goal: "Ask a yes-or-no question, and say what you are and what you're not.",
    cast: { Liis: "liivika", Tom: "kalev" },
    conversation: [
      { who: "Liis", et: "Kas sa oled eestlane?", en: "Are you Estonian?" },
      { who: "Tom", et: "Ei, ma ei ole eestlane. Ma olen inglane.", en: "No, I'm not Estonian. I'm English." },
      { who: "Liis", et: "Kas sa oled õpilane?", en: "Are you a student?" },
      { who: "Tom", et: "Jah, olen.", en: "Yes, I am." },
      { who: "Liis", et: "Ja Jaan? Kas tema on inglane?", en: "And Jaan? Is he English?" },
      { who: "Tom", et: "Ei, ta pole inglane. Ta on eestlane.", en: "No, he's not English. He's Estonian." },
    ],
    teaches: [
      { kind: "word", et: "kas", en: "starts a yes-or-no question" },
      { kind: "form", et: "ole", of: "olema", en: "be, after {ei}: not" },
      { kind: "form", et: "pole", of: "olema", en: "isn't, aren't, the short way" },
      { kind: "word", et: "eestlane", en: "an Estonian" },
      { kind: "word", et: "inglane", en: "an English person" },
      { kind: "word", et: "ameeriklane", en: "an American" },
      { kind: "word", et: "venelane", en: "a Russian" },
      { kind: "word", et: "ukrainlane", en: "a Ukrainian" },
    ],
    how: {
      point: "{Kas} at the front turns a sentence into a yes-or-no question, and {ei} before the verb turns it into no.",
      table: {
        head: ["", "Yes", "No"],
        rows: [
          [{ en: "I" }, { et: "Ma olen eestlane." }, { et: "Ma ei ole eestlane." }],
          [{ en: "you" }, { et: "Sa oled eestlane." }, { et: "Sa ei ole eestlane." }],
          [{ en: "he, she" }, { et: "Ta on eestlane." }, { et: "Ta ei ole eestlane." }],
        ],
      },
      notes: [
        "In the no, the verb loses its ending: {ma ei ole}, {sa ei ole}, {ta ei ole}. It's {ei ole} for every person.",
        "{Pole} is {ei ole} squeezed into one word, and people say it all the time.",
        "Answer a {kas} question with the verb itself: {Jah, olen.} That's how Estonians say \"yes, I am\".",
      ],
      watchOut: "Don't say {ma ei olen}. After {ei} the verb has no ending: {ma ei ole}.",
      examples: [0, 1, 5],
    },
    answers: [
      { ask: { et: "Kas sa oled eestlane?", en: "Are you Estonian?" }, cue: "Answer for yourself. If you're not, say what you are.", model: { et: "Ei, ma ei ole eestlane. Ma olen inglane.", en: "No, I'm not Estonian. I'm English." } },
      { ask: { et: "Kas sa oled õpilane?", en: "Are you a student?" }, cue: "Say yes, the short way.", model: { et: "Jah, olen.", en: "Yes, I am." } },
      { cue: "Ask somebody whether they're Estonian.", model: { et: "Kas sa oled eestlane?", en: "Are you Estonian?" } },
    ],
  },
  {
    id: "a1-07-how-are-you",
    n: 7,
    level: "A1",
    part: "a1-tere",
    kind: "lesson",
    title: "How are you?",
    goal: "Ask how it's going, answer, and ask it back.",
    cast: { Mari: "mari", Jaan: "tambet", Tom: "kalev" },
    conversation: [
      { who: "Mari", et: "Tere, Jaan! Kuidas läheb?", en: "Hi, Jaan! How's it going?" },
      { who: "Jaan", et: "Väga hästi, aitäh! Ja sinul?", en: "Really well, thanks! And you?" },
      { who: "Mari", et: "Normaalselt.", en: "Not bad." },
      { who: "Mari", et: "Tere, Tom! Kuidas läheb?", en: "Hi, Tom! How's it going?", stage: "Tom comes in." },
      { who: "Tom", et: "Halvasti.", en: "Not great.", stage: "Then he smiles anyway." },
    ],
    teaches: [
      { kind: "phrase", et: "Kuidas läheb?", en: "How's it going?" },
      { kind: "word", et: "hästi", en: "well, good" },
      { kind: "word", et: "väga", en: "very, really" },
      { kind: "word", et: "normaalselt", en: "okay, not bad" },
      { kind: "word", et: "halvasti", en: "badly, not great" },
      { kind: "phrase", et: "Ja sinul?", en: "And you? (asking it back)" },
    ],
    how: {
      point: "{Kuidas läheb?} is asked every day, and the answer is usually one word.",
      table: {
        head: ["How it's going", "In English"],
        rows: [
          [{ et: "väga hästi" }, { en: "really well" }],
          [{ et: "hästi" }, { en: "well" }],
          [{ et: "normaalselt" }, { en: "okay, not bad" }],
          [{ et: "halvasti" }, { en: "not great" }],
        ],
      },
      notes: [
        "{Kuidas läheb?} is friendly. People ask it of friends and colleagues, not of the stranger at the till.",
        "Ask it back with {Ja sinul?}, and the answer is one word again.",
      ],
      watchOut: "Estonians answer {Kuidas läheb?} honestly, and {normaalselt} is a perfectly happy answer. It isn't a complaint.",
      examples: [0, 1],
    },
    answers: [
      { ask: { et: "Kuidas läheb?", en: "How's it going?" }, cue: "Answer for yourself, then ask it back.", model: { et: "Hästi, aitäh! Ja sinul?", en: "Good, thanks! And you?" } },
      { cue: "Greet Jaan and ask him how it's going.", model: { et: "Tere, Jaan! Kuidas läheb?", en: "Hi, Jaan! How's it going?" } },
      { ask: { et: "Väga hästi! Ja sinul?", en: "Really well! And you?" }, cue: "Say it's not going great.", model: { et: "Halvasti.", en: "Not great." } },
    ],
  },
  {
    id: "a1-08-neighbour",
    n: 8,
    level: "A1",
    part: "a1-tere",
    kind: "checkin",
    title: "Meeting somebody",
    goal: "Hold a first conversation with somebody new, start to finish.",
    cast: { Mari: "mari", Tom: "kalev" },
    conversation: [
      { who: "Mari", et: "Tere õhtust!", en: "Good evening!" },
      { who: "Tom", et: "Tere õhtust!", en: "Good evening!" },
      { who: "Mari", et: "Mina olen Mari. Mis su nimi on?", en: "I'm Mari. What's your name?" },
      { who: "Tom", et: "Minu nimi on Tom.", en: "My name is Tom." },
      { who: "Mari", et: "Väga meeldiv! Kas sa oled eestlane?", en: "Nice to meet you! Are you Estonian?" },
      { who: "Tom", et: "Ei, ma olen inglane.", en: "No, I'm English." },
      { who: "Mari", stage: "She says something about the building, very fast." },
      { who: "Tom", et: "Vabandust, ma ei saa aru. Aeglasemalt, palun.", en: "Sorry, I don't understand. Slower, please." },
      { who: "Mari", stage: "She laughs, and says it again slowly." },
      { who: "Tom", et: "Aitäh!", en: "Thanks!" },
      { who: "Mari", et: "Head aega, Tom!", en: "Bye, Tom!" },
      { who: "Tom", et: "Nägemist!", en: "See you!" },
    ],
    teaches: [],
    how: {
      point: "A whole conversation, made only of what the last seven evenings taught.",
      notes: [
        "Everything in it is something you have said before. The new part is putting it together, one line after another.",
        "Notice how Mari leads and Tom answers, and how one line from lesson 2 keeps it going when Tom gets lost.",
      ],
      watchOut: "When you're lost, say so in Estonian. {Vabandust, ma ei saa aru} keeps the conversation going in Estonian.",
      examples: [2, 7],
    },
    answers: [
      { ask: { et: "Mis su nimi on?", en: "What's your name?" }, cue: "Say your name.", model: { et: "Minu nimi on Tom.", en: "My name is Tom." } },
      { ask: { et: "Kas sa oled eestlane?", en: "Are you Estonian?" }, cue: "Answer for yourself.", model: { et: "Ei, ma olen inglane.", en: "No, I'm English." } },
      { ask: { et: "Kuidas läheb?", en: "How's it going?" }, cue: "Answer, and ask it back.", model: { et: "Hästi, aitäh! Ja sinul?", en: "Good, thanks! And you?" } },
    ],
    roleplay: {
      scene: "You meet a neighbour, Mari, on the stairs. She speaks first. Answer her as yourself.",
      turns: [
        { ask: { et: "Tere õhtust!", en: "Good evening!" }, cue: "Say hello back.", model: { et: "Tere õhtust!", en: "Good evening!" } },
        { ask: { et: "Mina olen Mari. Mis su nimi on?", en: "I'm Mari. What's your name?" }, cue: "Say your name.", model: { et: "Minu nimi on Tom.", en: "My name is Tom." } },
        { ask: { et: "Väga meeldiv! Kas sa oled eestlane?", en: "Nice to meet you! Are you Estonian?" }, cue: "Answer for yourself.", model: { et: "Ei, ma ei ole eestlane. Ma olen inglane.", en: "No, I'm not Estonian. I'm English." } },
        { ask: { et: "Kuidas läheb?", en: "How's it going?" }, cue: "Say how it's going, and ask her back.", model: { et: "Hästi, aitäh! Ja sinul?", en: "Good, thanks! And you?" } },
        { ask: { et: "Normaalselt. Head aega!", en: "Not bad. Bye!" }, cue: "Say goodbye.", model: { et: "Nägemist!", en: "See you!" } },
      ],
    },
  },
];

/** A1 in teaching order, part by part. */
export const A1_LESSONS: readonly LessonSpec[] = [...TERE_LESSONS, ...A1_ELAD_LESSONS, ...A1_KELL_LESSONS, ...A1_SOOK_LESSONS, ...A1_LINN_LESSONS, ...A1_POOD_LESSONS, ...A1_EILE_LESSONS, ...A1_ABI_LESSONS];
