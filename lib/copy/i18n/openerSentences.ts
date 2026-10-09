import type { Locale } from "@/lib/copy/locale";
import { OPENER_WORDS } from "@/lib/estonian/openers";

/**
 * LAUSE ALGUS IN RUSSIAN AND UKRAINIAN: THE WHOLE SENTENCE, NOT A TEMPLATE
 * WITH AN ENGLISH NOUN IN IT.
 *
 * The round prints what the Estonian sentence means ("I want a book."), built
 * from an English template and the word's English with its article. A
 * translation table cannot do that: «Я хочу {a}» with "a book" dropped in is
 * half a sentence in each language, and the noun after «хочу», «нет» and «есть»
 * is in three different cases. So each opener has a template per language
 * naming the case its noun is in, and each word of the round has its forms in
 * both languages, keyed on the word's English (`OpenerWordSpec.en`), so this
 * file holds no Estonian at all (ADR-005).
 *
 * A few templates agree with the noun's gender ("мне нужен телефон", «мені
 * потрібна сумка»), and nothing here guesses the speaker's own gender: a
 * sentence about "I" is built so that it reads the same said by anybody
 * («мне хотелось бы», never «я хотел бы»).
 *
 * Anything this file cannot build (a word or an opener added later) falls back
 * to the English line, which is what a missing translation does everywhere.
 */

type Gender = "m" | "f" | "n";

interface NounForms {
  nom: string;
  acc: string;
  gen: string;
  nomPl: string;
  accPl: string;
  genPl: string;
  gender: Gender;
}

type Lang = Exclude<Locale, "en">;

/** The round's words, keyed on their English, in the cases the templates ask for. */
const NOUNS: Readonly<Record<Lang, Readonly<Record<string, NounForms>>>> = {
  ru: {
    book: { nom: "книга", acc: "книгу", gen: "книги", nomPl: "книги", accPl: "книги", genPl: "книг", gender: "f" },
    car: { nom: "машина", acc: "машину", gen: "машины", nomPl: "машины", accPl: "машины", genPl: "машин", gender: "f" },
    phone: { nom: "телефон", acc: "телефон", gen: "телефона", nomPl: "телефоны", accPl: "телефоны", genPl: "телефонов", gender: "m" },
    dog: { nom: "собака", acc: "собаку", gen: "собаки", nomPl: "собаки", accPl: "собак", genPl: "собак", gender: "f" },
    cat: { nom: "кошка", acc: "кошку", gen: "кошки", nomPl: "кошки", accPl: "кошек", genPl: "кошек", gender: "f" },
    computer: { nom: "компьютер", acc: "компьютер", gen: "компьютера", nomPl: "компьютеры", accPl: "компьютеры", genPl: "компьютеров", gender: "m" },
    bike: { nom: "велосипед", acc: "велосипед", gen: "велосипеда", nomPl: "велосипеды", accPl: "велосипеды", genPl: "велосипедов", gender: "m" },
    pencil: { nom: "карандаш", acc: "карандаш", gen: "карандаша", nomPl: "карандаши", accPl: "карандаши", genPl: "карандашей", gender: "m" },
    apple: { nom: "яблоко", acc: "яблоко", gen: "яблока", nomPl: "яблоки", accPl: "яблоки", genPl: "яблок", gender: "n" },
    cake: { nom: "торт", acc: "торт", gen: "торта", nomPl: "торты", accPl: "торты", genPl: "тортов", gender: "m" },
    bag: { nom: "сумка", acc: "сумку", gen: "сумки", nomPl: "сумки", accPl: "сумки", genPl: "сумок", gender: "f" },
    ticket: { nom: "билет", acc: "билет", gen: "билета", nomPl: "билеты", accPl: "билеты", genPl: "билетов", gender: "m" },
    banana: { nom: "банан", acc: "банан", gen: "банана", nomPl: "бананы", accPl: "бананы", genPl: "бананов", gender: "m" },
    bus: { nom: "автобус", acc: "автобус", gen: "автобуса", nomPl: "автобусы", accPl: "автобусы", genPl: "автобусов", gender: "m" },
  },
  uk: {
    book: { nom: "книжка", acc: "книжку", gen: "книжки", nomPl: "книжки", accPl: "книжки", genPl: "книжок", gender: "f" },
    car: { nom: "машина", acc: "машину", gen: "машини", nomPl: "машини", accPl: "машини", genPl: "машин", gender: "f" },
    phone: { nom: "телефон", acc: "телефон", gen: "телефона", nomPl: "телефони", accPl: "телефони", genPl: "телефонів", gender: "m" },
    dog: { nom: "собака", acc: "собаку", gen: "собаки", nomPl: "собаки", accPl: "собак", genPl: "собак", gender: "m" },
    cat: { nom: "кішка", acc: "кішку", gen: "кішки", nomPl: "кішки", accPl: "кішок", genPl: "кішок", gender: "f" },
    computer: { nom: "комп'ютер", acc: "комп'ютер", gen: "комп'ютера", nomPl: "комп'ютери", accPl: "комп'ютери", genPl: "комп'ютерів", gender: "m" },
    bike: { nom: "велосипед", acc: "велосипед", gen: "велосипеда", nomPl: "велосипеди", accPl: "велосипеди", genPl: "велосипедів", gender: "m" },
    pencil: { nom: "олівець", acc: "олівець", gen: "олівця", nomPl: "олівці", accPl: "олівці", genPl: "олівців", gender: "m" },
    apple: { nom: "яблуко", acc: "яблуко", gen: "яблука", nomPl: "яблука", accPl: "яблука", genPl: "яблук", gender: "n" },
    cake: { nom: "торт", acc: "торт", gen: "торта", nomPl: "торти", accPl: "торти", genPl: "тортів", gender: "m" },
    bag: { nom: "сумка", acc: "сумку", gen: "сумки", nomPl: "сумки", accPl: "сумки", genPl: "сумок", gender: "f" },
    ticket: { nom: "квиток", acc: "квиток", gen: "квитка", nomPl: "квитки", accPl: "квитки", genPl: "квитків", gender: "m" },
    banana: { nom: "банан", acc: "банан", gen: "банана", nomPl: "банани", accPl: "банани", genPl: "бананів", gender: "m" },
    bus: { nom: "автобус", acc: "автобус", gen: "автобуса", nomPl: "автобуси", accPl: "автобуси", genPl: "автобусів", gender: "m" },
  },
};

/**
 * Each opener's sentence. `{nom}`, `{acc}`, `{gen}` and their plurals are the
 * noun; `{Nom}` is the same with a capital, for a sentence that opens on it;
 * `{need}`, `{was}` and `{liked}` are the word agreeing with the noun's gender.
 */
const SENTENCES: Readonly<Record<Lang, Readonly<Record<string, string>>>> = {
  ru: {
    like: "Мне нравится {nom}.",
    want: "Я хочу {acc}.",
    have: "У меня есть {nom}.",
    nohave: "У меня нет {gen}.",
    need: "Мне {need} {nom}.",
    look: "Я ищу {acc}.",
    wish: "Мне хотелось бы иметь {acc}.",
    wouldwant: "Мне бы хотелось {acc}.",
    wait: "Я жду {acc}.",
    taste: "{Nom} мне по вкусу.",
    table: "На столе есть {nom}.",
    wehave: "У нас есть {nom}.",
    shehas: "У него или у неё есть {nom}.",
    notwant: "Я не хочу {acc}.",
    notneed: "Мне не {need} {nom}.",
    pole: "Нет у меня {gen}.",
    wehavenot: "У нас нет {gen}.",
    tablenot: "На столе нет {gen}.",
    notlike: "Мне не нравится {nom}.",
    wanted: "Мне хотелось {acc}.",
    notwanted: "Мне не хотелось {acc}.",
    had: "У меня {was} {nom}.",
    hadnot: "У меня не было {gen}.",
    liked: "Мне {liked} {nom}.",
    "pl-like": "Мне нравятся {nomPl}.",
    "pl-want": "Я хочу {accPl}.",
    "pl-have": "У меня есть {nomPl}.",
    "pl-nohave": "У меня нет {genPl}.",
    "pl-notwant": "Я не хочу {accPl}.",
    "pl-notlike": "Мне не нравятся {nomPl}.",
  },
  uk: {
    like: "Мені подобається {nom}.",
    want: "Я хочу {acc}.",
    have: "У мене є {nom}.",
    nohave: "У мене немає {gen}.",
    need: "Мені {need} {nom}.",
    look: "Я шукаю {acc}.",
    wish: "Мені хотілося б мати {acc}.",
    wouldwant: "Мені б хотілося {acc}.",
    wait: "Я чекаю на {acc}.",
    taste: "{Nom} мені до смаку.",
    table: "На столі є {nom}.",
    wehave: "У нас є {nom}.",
    shehas: "У нього чи в неї є {nom}.",
    notwant: "Я не хочу {acc}.",
    notneed: "Мені не {need} {nom}.",
    pole: "Нема в мене {gen}.",
    wehavenot: "У нас немає {gen}.",
    tablenot: "На столі немає {gen}.",
    notlike: "Мені не подобається {nom}.",
    wanted: "Мені хотілося {acc}.",
    notwanted: "Мені не хотілося {acc}.",
    had: "У мене {was} {nom}.",
    hadnot: "У мене не було {gen}.",
    liked: "Мені {liked} {nom}.",
    "pl-like": "Мені подобаються {nomPl}.",
    "pl-want": "Я хочу {accPl}.",
    "pl-have": "У мене є {nomPl}.",
    "pl-nohave": "У мене немає {genPl}.",
    "pl-notwant": "Я не хочу {accPl}.",
    "pl-notlike": "Мені не подобаються {nomPl}.",
  },
};

const AGREES: Readonly<Record<Lang, Readonly<Record<"need" | "was" | "liked", Readonly<Record<Gender, string>>>>>> = {
  ru: {
    need: { m: "нужен", f: "нужна", n: "нужно" },
    was: { m: "был", f: "была", n: "было" },
    liked: { m: "нравился", f: "нравилась", n: "нравилось" },
  },
  uk: {
    need: { m: "потрібен", f: "потрібна", n: "потрібне" },
    was: { m: "був", f: "була", n: "було" },
    liked: { m: "подобався", f: "подобалася", n: "подобалося" },
  },
};

/**
 * What the sentence an opener starts means, in the reader's language, or the
 * English it was built with where this file has no answer.
 */
export function openerSentence(locale: Locale, openerId: string, lemma: string, english: string): string {
  if (locale === "en") return english;
  const word = OPENER_WORDS.find((w) => w.lemma === lemma);
  const noun = word ? NOUNS[locale][word.en] : undefined;
  const template = SENTENCES[locale][openerId];
  if (!noun || !template) return english;
  const agree = AGREES[locale];
  const capital = noun.nom.charAt(0).toUpperCase() + noun.nom.slice(1);
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    switch (key) {
      case "Nom": return capital;
      case "need": case "was": case "liked": return agree[key][noun.gender];
      default: return key in noun ? String(noun[key as keyof NounForms]) : whole;
    }
  });
}

/** Every opener and every word this file can say, so a test can hold it whole. */
export const OPENER_SENTENCE_KEYS = { sentences: SENTENCES, nouns: NOUNS } as const;
