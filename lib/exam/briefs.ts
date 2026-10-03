import type { ExamLevel } from "./spec";

/**
 * What the written and spoken tasks are about, in English.
 *
 * A task on the real paper is a situation and what to do about it: a business
 * card to write up, a letter to a landlord, two tables of figures to sum up, a
 * phone call to a dentist. Those situations are what this module holds, and
 * nothing else. Every one is English, because a prompt is an instruction
 * rather than a text to be understood and English is the one language this
 * project may write; the Estonian is what the learner says or writes back, and
 * every Estonian word a task names comes out of the dictionary by way of
 * `./paper` (ADR-005). The one table here naming Estonian words is
 * `CARD_JOBS`, and it names lemmas as a course unit does, as requests the
 * dictionary either answers or does not; it writes no form.
 *
 * TOPICS ARE TIED TO THE COURSE. A task names a topic, and the words a text has
 * to use, or an idea card offers, are drawn from the course units that teach
 * that topic. They used to be any five words off the front of the pool, so a
 * B1 story about yourself and your family had to use "ayatollah", "wolf" and
 * "flee", and a speaking card on travel offered "pillowcase" and "spiderweb".
 * A word list that has nothing to do with the task is a task nobody can take
 * seriously, and a mock exam the learner cannot take seriously prepares them
 * for nothing.
 *
 * THE FIGURES ARE INVENTED, AND SAY SO. The summary tasks at B2 and C1 are
 * written from tables, and these tables are made up for practice. The screen
 * prints that beside every one, because a candidate quoting a made-up share of
 * cyclists as a fact would be this app putting a false claim into somebody's
 * mouth.
 *
 * Pure: no React, no Prisma, no clock.
 */

// ── Topics ───────────────────────────────────────────────────────────────────

export type TopicKey =
  | "family" | "home" | "day" | "freetime" | "travel" | "health" | "school" | "shopping"
  | "food" | "town" | "weather" | "work" | "feelings" | "media" | "environment" | "society"
  | "economy" | "science" | "culture";

export interface Topic {
  readonly key: TopicKey;
  /** How a prompt names it: "Write a story about {phrase}". */
  readonly phrase: string;
  /** The course units that teach it, by id. Requests against `lib/collections/syllabus`. */
  readonly units: readonly string[];
  /** The first and last level a task on this topic is set at. */
  readonly from: ExamLevel;
  readonly to: ExamLevel;
}

/*
  The real paper's topics, as the specifications publish them: isikuandmed,
  maja ja kodu, ümbruskond, igapäevaelu, vaba aeg, reisimine, suhted teiste
  inimestega, tervis, haridus, sisseostud, söök ja jook, teenused, kohad,
  keel, ilm at A2 and B1, and work, society, science and culture above that.
*/
export const TOPICS: readonly Topic[] = [
  { key: "family", phrase: "your family and the people close to you", units: ["inimesed", "tutvumine", "inimsuhted"], from: "A1", to: "B1" },
  { key: "home", phrase: "where you live", units: ["kodu", "kodus", "eluase", "kodutood"], from: "A1", to: "B2" },
  { key: "day", phrase: "an ordinary day", units: ["iga-paev", "aeg", "millal", "kodutood"], from: "A1", to: "B1" },
  { key: "freetime", phrase: "free time", units: ["vaba-aeg", "iga-paev"], from: "A1", to: "B2" },
  { key: "travel", phrase: "travel", units: ["reisimine", "transport", "riigid"], from: "A1", to: "C1" },
  { key: "health", phrase: "health", units: ["keha-ja-tervis", "loomad-ja-keha", "tervishoid"], from: "A1", to: "C1" },
  { key: "school", phrase: "studying", units: ["kool-ja-keel", "haridus", "akadeemiline"], from: "A2", to: "C1" },
  { key: "shopping", phrase: "shopping", units: ["ostmine", "riided", "suured-arvud"], from: "A1", to: "B1" },
  { key: "food", phrase: "food and drink", units: ["sook-ja-jook", "rohkem-toitu", "restoranis"], from: "A1", to: "B1" },
  { key: "town", phrase: "your town and its services", units: ["linn-ja-teenused", "kohad-ja-ametid", "kus-ja-kuhu"], from: "A1", to: "B2" },
  { key: "weather", phrase: "the weather and nature", units: ["ilm", "loodus"], from: "A1", to: "B1" },
  { key: "work", phrase: "work", units: ["kohad-ja-ametid", "too-ja-raha", "toomaailm"], from: "A1", to: "C1" },
  { key: "feelings", phrase: "people and how they feel", units: ["tunded", "iseloom", "psuhholoogia"], from: "A2", to: "C1" },
  { key: "media", phrase: "media and technology", units: ["meedia", "tehnoloogia", "innovatsioon"], from: "B1", to: "C1" },
  { key: "environment", phrase: "the environment", units: ["keskkond", "loodus"], from: "B1", to: "C1" },
  { key: "society", phrase: "society", units: ["uhiskond", "poliitika", "oigus", "rahvusvaheline"], from: "B2", to: "C1" },
  { key: "economy", phrase: "the economy", units: ["majandus", "too-ja-raha", "statistika"], from: "B2", to: "C1" },
  { key: "science", phrase: "science and new ideas", units: ["teadus", "teadustoo", "innovatsioon"], from: "B2", to: "C1" },
  { key: "culture", phrase: "culture and the arts", units: ["kunst", "kirjandus", "ajalugu"], from: "B2", to: "C1" },
];

const ORDER: Record<ExamLevel, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };

export function topicByKey(key: TopicKey): Topic {
  return TOPICS.find((t) => t.key === key)!;
}

/** Whether a topic is set at this level. */
export function topicFits(topic: Topic, level: ExamLevel): boolean {
  return ORDER[topic.from] <= ORDER[level] && ORDER[level] <= ORDER[topic.to];
}

// ── Words a paper never asks for ─────────────────────────────────────────────

/*
  A WORD A CANDIDATE IS NEVER HANDED. The dictionary is a dictionary, so it
  holds slurs, swearing and words for parts of the body, and the speaking idea
  card once offered a homophobic slur to somebody talking about travel. No
  paper may ask for, offer or show one of these as a word to use, whatever its
  band.

  Read off the senses a lexicographer separated, whole, never as a substring:
  `lib/dict/gloss.ts` explains why a substring match on "dark" reaches a slur
  four entries down. A sense is unfit when any word in it is on this list, so
  "a homosexual male" is fine where "fag" sits in the same gloss is not, and
  the entry goes.
*/
const UNFIT = new Set([
  "fuck", "fucking", "fuckable", "screwable", "shit", "crap", "faeces", "feces", "cunt", "pussy",
  "vulva", "vagina", "penis", "dick", "prick", "anus", "asshole", "arse", "whore", "slut", "bastard",
  "scumbag", "idiot", "retard", "moron", "fag", "faggot", "negro", "darkie", "nigger", "piss",
  "urine", "turd", "copulation", "corpse", "birdshit", "guano", "puke",
]);

export function unfitForExam(translation: string): boolean {
  return translation
    .toLowerCase()
    .split(/[,;/()]+/)
    .some((sense) => sense.split(/[^a-z]+/).some((word) => UNFIT.has(word)));
}

// ── Writing: the first task ──────────────────────────────────────────────────

/** A business card, for the A2 information transfer. */
export interface CardBrief {
  readonly name: string;
  readonly email: string;
  readonly city: string;
  readonly hours: string;
}

/*
  International names, so no name on a card is an Estonian word this app
  typed, and cities whose English name is their own. What the card's job and
  workplace are comes from the dictionary.
*/
export const CARD_PEOPLE: readonly { name: string; email: string }[] = [
  { name: "Anna Berg", email: "anna.berg@example.ee" },
  { name: "Mark Olsen", email: "mark.olsen@example.ee" },
  { name: "Laura Weiss", email: "laura.weiss@example.ee" },
  { name: "Peter Lind", email: "peter.lind@example.ee" },
  { name: "Eva Novak", email: "eva.novak@example.ee" },
  { name: "Daniel Roos", email: "daniel.roos@example.ee" },
  { name: "Maria Holm", email: "maria.holm@example.ee" },
  { name: "Simon Bauer", email: "simon.bauer@example.ee" },
];

export const CARD_CITIES: readonly string[] = ["Tallinn", "Tartu", "Narva", "Viljandi", "Rakvere", "Haapsalu"];

/*
  A JOB AND THE PLACE IT IS DONE, AS A PAIR. The card's job and workplace used
  to be any person-noun and any place-noun the pool held, so the A1 card said a
  doctor worked at a café and the A2 one put a cook in a castle. These are
  requests against the dictionary, the way a course unit names a lemma: the
  paper uses a pair only where the pool holds both, and `briefs.test.ts` fails
  on one the shipped dictionary does not hold. No form is written here.
*/
export const CARD_JOBS: readonly { job: string; place: string }[] = [
  { job: "õpetaja", place: "kool" },
  { job: "müüja", place: "pood" },
  { job: "arst", place: "haigla" },
  { job: "kokk", place: "restoran" },
  { job: "ettekandja", place: "kohvik" },
  { job: "insener", place: "tehas" },
  { job: "bussijuht", place: "firma" },
  { job: "giid", place: "muuseum" },
  { job: "raamatupidaja", place: "pank" },
];

export const CARD_HOURS: readonly string[] = [
  "Monday to Friday, 9:00 to 17:00",
  "Monday to Thursday, 8:00 to 16:00",
  "Tuesday to Saturday, 10:00 to 18:00",
  "Every day, 12:00 to 20:00",
];

/** A situation for a short message, and the points it has to cover. */
export interface NoteBrief {
  readonly topic: TopicKey;
  readonly scenario: string;
  readonly cover: readonly string[];
}

/*
  The functions the specifications name for the message are what these were
  written against: seletamine, kirjeldamine, ettepaneku tegemine,
  isikuandmete edastamine. Explaining, describing, proposing something,
  passing on your own details. And the A2 paper names invitations.
*/
export const NOTES: readonly NoteBrief[] = [
  { topic: "home", scenario: "a note to a neighbor who took in a parcel for you",
    cover: ["say who you are", "say what you're picking up", "say when you'll come by"] },
  { topic: "health", scenario: "an e-mail canceling an appointment you can't keep",
    cover: ["say which appointment", "give a reason", "suggest another time"] },
  { topic: "home", scenario: "a message to your landlord about something broken in the flat",
    cover: ["say what is broken", "say how long it has been broken", "ask what happens next"] },
  { topic: "work", scenario: "a note to a colleague who will cover your work tomorrow",
    cover: ["say why you're away", "say what needs doing", "say how to reach you"] },
  { topic: "freetime", scenario: "an invitation to a friend to come somewhere with you",
    cover: ["say where and when", "say what you'll do there", "ask them to let you know"] },
  { topic: "school", scenario: "an e-mail to a course you want to join",
    cover: ["give your name and details", "say which course", "ask what it costs"] },
  { topic: "shopping", scenario: "a note to a shop about something you bought that is faulty",
    cover: ["say what you bought and when", "say what is wrong", "say what you want done"] },
  { topic: "health", scenario: "a message to a doctor's surgery asking for an appointment",
    cover: ["give your name", "say what is wrong", "say when you can come"] },
  { topic: "family", scenario: "an invitation to your birthday party",
    cover: ["say when and where", "say what you're planning", "say what to bring"] },
  { topic: "food", scenario: "a note to your flatmate about what to buy for dinner",
    cover: ["say what you're cooking", "list what to buy", "say when you'll eat"] },
  { topic: "travel", scenario: "a message to a friend who is picking you up from the station",
    cover: ["say which train you're on", "say when it arrives", "say how they'll recognize you"] },
  { topic: "town", scenario: "a note to your neighbors about a change in the building",
    cover: ["say what is changing", "say when", "say what they need to do"] },
];

/** A topic to describe, at A2, with the points to cover. */
export interface DescriptionBrief {
  readonly topic: TopicKey;
  readonly subject: string;
  readonly cover: readonly string[];
}

export const DESCRIPTIONS: readonly DescriptionBrief[] = [
  { topic: "home", subject: "your home", cover: ["where it is", "what it is like inside", "what you like about it"] },
  { topic: "town", subject: "the town you live in", cover: ["where it is", "what there is to do", "what you would change"] },
  { topic: "day", subject: "your usual weekday", cover: ["when you get up", "what you do during the day", "how you spend the evening"] },
  { topic: "freetime", subject: "your favorite way to spend a free day", cover: ["what you do", "who with", "why you like it"] },
  { topic: "family", subject: "somebody close to you", cover: ["who they are", "what they are like", "what you do together"] },
  { topic: "food", subject: "a meal you like", cover: ["what it is", "when you eat it", "why you like it"] },
  { topic: "weather", subject: "the weather where you live", cover: ["what it is like now", "your favorite season", "what you do when it rains"] },
  { topic: "travel", subject: "a place you have visited", cover: ["where it is", "what you saw", "whether you would go again"] },
];

/** A letter at B2, semi-formal or informal. */
export interface LetterBrief {
  readonly topic: TopicKey;
  readonly register: "semiformal" | "informal";
  readonly scenario: string;
  readonly cover: readonly string[];
}

export const LETTERS: readonly LetterBrief[] = [
  { topic: "home", register: "semiformal", scenario: "a letter to your housing association about building work that keeps you awake",
    cover: ["say what the problem is", "say how it affects you", "say what you want them to do"] },
  { topic: "school", register: "semiformal", scenario: "a letter to a language school asking about a course for your team at work",
    cover: ["say who you are and what your team does", "say what the team needs", "ask about times, length and price"] },
  { topic: "work", register: "semiformal", scenario: "a letter to your manager asking to change your working hours",
    cover: ["say what you'd like to change", "explain why", "say how your work will still be done"] },
  { topic: "travel", register: "semiformal", scenario: "a letter to a hotel about a stay that went wrong",
    cover: ["say when you stayed", "say what went wrong", "say what you expect them to do"] },
  { topic: "town", register: "semiformal", scenario: "a letter to your town council about the state of a local park",
    cover: ["describe the problem", "say who it affects", "suggest what could be done"] },
  { topic: "health", register: "semiformal", scenario: "a letter to your sports club about a change you'd like to see",
    cover: ["say how long you've been a member", "say what you'd like to change", "say why it would help others too"] },
  { topic: "travel", register: "informal", scenario: "a letter to a friend who is moving to Estonia",
    cover: ["give advice on finding somewhere to live", "say what to bring", "invite them to visit you"] },
  { topic: "family", register: "informal", scenario: "a letter to a friend you haven't seen for a year",
    cover: ["say what has changed in your life", "ask about theirs", "suggest a time to meet"] },
  { topic: "freetime", register: "informal", scenario: "a letter thanking a friend for a weekend at their place",
    cover: ["say what you enjoyed most", "say what has happened since", "invite them back"] },
  { topic: "work", register: "informal", scenario: "a letter to a friend about your new job",
    cover: ["say what the job is", "say what you like and don't like about it", "ask for their advice on something"] },
  { topic: "feelings", register: "informal", scenario: "a letter to a friend who has had a hard month",
    cover: ["say you heard what happened", "say something that might help", "offer to do something together"] },
];

/**
 * Figures to write about, for the B2 summary and the C1 one.
 *
 * Two columns of numbers on one subject, which is what the C1 task's "two
 * figures or tables" are compared in, and what the B2 summary is written from.
 */
export interface Dataset {
  readonly topic: TopicKey;
  readonly title: string;
  readonly unit: string;
  readonly columns: readonly [string, string];
  readonly rows: readonly { label: string; values: readonly [number, number] }[];
}

export const DATASETS: readonly Dataset[] = [
  { topic: "travel", title: "How people in one town get to work", unit: "percent of people who work",
    columns: ["2015", "2025"],
    rows: [
      { label: "By car", values: [54, 41] },
      { label: "By bus", values: [22, 24] },
      { label: "By bicycle", values: [6, 12] },
      { label: "On foot", values: [13, 12] },
      { label: "Working from home", values: [5, 11] },
    ] },
  { topic: "culture", title: "Hours a week spent reading, by age", unit: "hours a week",
    columns: ["Printed books", "On a screen"],
    rows: [
      { label: "Aged 15 to 24", values: [1.5, 6] },
      { label: "Aged 25 to 44", values: [2, 5] },
      { label: "Aged 45 to 64", values: [3, 3.5] },
      { label: "Aged 65 and over", values: [5, 1.5] },
    ] },
  { topic: "economy", title: "Where households buy their food", unit: "percent of households, main place",
    columns: ["2018", "2025"],
    rows: [
      { label: "Large supermarket", values: [61, 55] },
      { label: "Small local shop", values: [21, 14] },
      { label: "Market", values: [12, 10] },
      { label: "Online", values: [6, 21] },
    ] },
  { topic: "environment", title: "Where households get their heating", unit: "percent of households",
    columns: ["2010", "2025"],
    rows: [
      { label: "District heating", values: [58, 60] },
      { label: "Wood", values: [24, 13] },
      { label: "Electricity and heat pumps", values: [10, 22] },
      { label: "Gas", values: [8, 5] },
    ] },
  { topic: "school", title: "How satisfied students are with their course", unit: "percent satisfied",
    columns: ["First year", "Final year"],
    rows: [
      { label: "Teaching", values: [82, 74] },
      { label: "Course materials", values: [70, 66] },
      { label: "Online tools", values: [58, 71] },
      { label: "Support and advice", values: [65, 52] },
    ] },
  { topic: "media", title: "Time spent online each day, by age", unit: "hours a day",
    columns: ["Weekdays", "Weekends"],
    rows: [
      { label: "Aged 15 to 24", values: [5.5, 7] },
      { label: "Aged 25 to 44", values: [4, 4.5] },
      { label: "Aged 45 to 64", values: [3, 3] },
      { label: "Aged 65 and over", values: [1.5, 2] },
    ] },
  { topic: "freetime", title: "Visitors to a national park, by season", unit: "thousands of visitors",
    columns: ["2019", "2025"],
    rows: [
      { label: "Winter", values: [12, 21] },
      { label: "Spring", values: [30, 34] },
      { label: "Summer", values: [95, 88] },
      { label: "Autumn", values: [28, 40] },
    ] },
  { topic: "work", title: "How people found their current job", unit: "percent of people in work",
    columns: ["Under 30", "30 and over"],
    rows: [
      { label: "A job website", values: [48, 27] },
      { label: "Friends or family", values: [21, 30] },
      { label: "Contacting the employer directly", values: [12, 23] },
      { label: "A recruitment agency", values: [9, 12] },
      { label: "Social media", values: [10, 8] },
    ] },
  { topic: "health", title: "How often adults exercise", unit: "percent of adults",
    columns: ["2016", "2025"],
    rows: [
      { label: "Several times a week", values: [28, 37] },
      { label: "About once a week", values: [24, 22] },
      { label: "Now and then", values: [21, 19] },
      { label: "Never", values: [27, 22] },
    ] },
];

/** A statement to argue about, at B2. */
export interface ArgumentBrief {
  readonly topic: TopicKey;
  readonly statement: string;
}

export const ARGUMENTS: readonly ArgumentBrief[] = [
  { topic: "work", statement: "Everybody who can should work from home at least two days a week." },
  { topic: "town", statement: "Public transport in towns should be free for everybody." },
  { topic: "media", statement: "Children shouldn't have their own phone before they're twelve." },
  { topic: "economy", statement: "Shops should be closed on Sundays." },
  { topic: "school", statement: "A language is learned better online than in a classroom." },
  { topic: "environment", statement: "Cars should not be allowed in town centers." },
  { topic: "work", statement: "Every young person should work for a year before going to university." },
  { topic: "travel", statement: "Tourism does a small town more good than harm." },
  { topic: "freetime", statement: "Sport should be a bigger part of every school day." },
];

/** An opinion piece at C1: a situation, who it is for, and two points to develop. */
export interface OpinionBrief {
  readonly topic: TopicKey;
  readonly situation: string;
  readonly reader: string;
  readonly points: readonly [string, string];
}

export const OPINIONS: readonly OpinionBrief[] = [
  { topic: "culture", situation: "Your town council plans to close two small libraries and build one large one in the center.",
    reader: "the readers of the local paper", points: ["what the town would gain", "what it would lose"] },
  { topic: "work", situation: "A large employer wants all its staff back in the office five days a week.",
    reader: "the company's management", points: ["the effect on productivity", "the effect on people's lives"] },
  { topic: "economy", situation: "The government is considering a four day working week.",
    reader: "the readers of a national paper", points: ["what it would mean for the economy", "what it would mean for wellbeing"] },
  { topic: "school", situation: "Universities may start teaching master's courses only in English.",
    reader: "the ministry of education", points: ["the international benefits", "the future of the national language in science"] },
  { topic: "media", situation: "Social media platforms may be required to check the age of every user.",
    reader: "the readers of a news website", points: ["protecting children", "privacy"] },
  { topic: "town", situation: "Your city wants to build housing on the site of a large park.",
    reader: "the city government", points: ["the need for housing", "the value of green space"] },
  { topic: "science", situation: "Schools may replace printed textbooks with tablets.",
    reader: "the readers of an education magazine", points: ["what pupils would gain", "what they might lose"] },
  { topic: "environment", situation: "Supermarkets may be required to give their unsold food away.",
    reader: "the readers of a national paper", points: ["the case against waste", "the cost and the practical problems"] },
  { topic: "society", situation: "Your country is considering lowering the voting age to sixteen.",
    reader: "the readers of a national paper", points: ["young people's voice", "whether sixteen is ready"] },
];

// ── Speaking ─────────────────────────────────────────────────────────────────

/**
 * What the examiner asks about a picture, once it has been described.
 *
 * Any picture, so nothing here may ask what only a photograph could show: the
 * pictures in this app are three drawn things, and "what time of day is it?"
 * over three drawings has no answer.
 */
export const PICTURE_QUESTIONS: readonly string[] = [
  "Where might you see these things together?",
  "When did you last see or use one of them? Tell me about it.",
  "Do you like this kind of place? Why, or why not?",
];

/** An idea card at A2: a topic and what to ask about. */
export interface IdeaCard {
  readonly topic: TopicKey;
  readonly about: string;
  readonly ask: readonly string[];
}

export const IDEA_CARDS: readonly IdeaCard[] = [
  { topic: "freetime", about: "free time", ask: ["what they like doing", "when", "who with", "how much it costs"] },
  { topic: "food", about: "food", ask: ["what they like to eat", "where they shop", "who cooks at home", "what they ate today"] },
  { topic: "travel", about: "a trip", ask: ["where they went", "how they got there", "how long they stayed", "what they liked"] },
  { topic: "home", about: "home", ask: ["where they live", "how many rooms there are", "who they live with", "what they like about it"] },
  { topic: "work", about: "work", ask: ["what they do", "where they work", "when they start and finish", "whether they like it"] },
  { topic: "shopping", about: "shopping", ask: ["what they buy most often", "where", "how they pay", "what they bought last"] },
  { topic: "health", about: "staying healthy", ask: ["what sport they do", "how often", "when they go to the doctor", "how they sleep"] },
  { topic: "day", about: "the weekend", ask: ["when they get up", "what they do", "who they meet", "what they did last weekend"] },
];

/** The B1 first task: questions, then a decision to agree on. */
export interface AgreeBrief {
  readonly topic: TopicKey;
  readonly questions: readonly string[];
  readonly situation: string;
  readonly options: readonly string[];
}

export const AGREE: readonly AgreeBrief[] = [
  { topic: "freetime", questions: ["What do you do in your free time?", "Do you prefer staying in or going out? Why?", "What did you do last weekend?"],
    situation: "A friend is visiting you for one weekend. Decide together what to do on Saturday.",
    options: ["a museum", "a walk in the forest", "a concert"] },
  { topic: "food", questions: ["What do you usually eat in a day?", "Do you like cooking? Why or why not?", "Where did you last eat out?"],
    situation: "Your course is ending and the group wants to celebrate. Decide together where.",
    options: ["a café", "a picnic in the park", "somebody's home"] },
  { topic: "shopping", questions: ["Where do you usually shop?", "What do you buy online?", "What was the last thing you bought for somebody else?"],
    situation: "A colleague is leaving. Decide together on a present.",
    options: ["flowers", "a book", "a gift card"] },
  { topic: "travel", questions: ["Where did you last travel?", "How do you prefer to travel, and why?", "Where would you like to go next?"],
    situation: "You and a friend have three days off. Decide together where to go.",
    options: ["a city you don't know", "an island by the sea", "a spa hotel"] },
  { topic: "health", questions: ["What do you do to stay healthy?", "How often do you do sport?", "What do you do when you're ill?"],
    situation: "You both want to get fitter this year. Decide together how.",
    options: ["running together", "joining a gym", "cycling to work"] },
  { topic: "home", questions: ["Describe where you live.", "What do you like about your neighborhood?", "Would you rather live in town or in the country? Why?"],
    situation: "You share a flat and have money for one new thing. Decide together what to buy.",
    options: ["a new sofa", "a dishwasher", "bicycles for both of you"] },
];

/** The B1 second task: a phone call to ask, and a card of facts to answer from. */
export interface PhoneBrief {
  readonly topic: TopicKey;
  readonly call: string;
  readonly find: readonly string[];
  readonly answerAs: string;
  readonly facts: readonly string[];
}

export const PHONE: readonly PhoneBrief[] = [
  { topic: "health", call: "a dentist's surgery",
    find: ["when there is a free appointment", "what a check-up costs", "where the surgery is", "what to bring"],
    answerAs: "somebody who works at a sports club",
    facts: ["Open every day, 7:00 to 22:00", "A month's membership costs 45 euros", "No need to book, just come in", "Bring sports shoes and a towel"] },
  { topic: "school", call: "a language school",
    find: ["when the next course starts", "how many hours a week it is", "what it costs", "how to sign up"],
    answerAs: "somebody who works at a library",
    facts: ["Open Monday to Saturday, 10:00 to 19:00", "Joining is free", "You can borrow ten books for three weeks", "Bring an ID card"] },
  { topic: "town", call: "a hairdresser",
    find: ["whether there is a free time on Friday", "what a haircut costs", "how long it takes", "whether you can pay by card"],
    answerAs: "somebody who works at a theater box office",
    facts: ["Tickets cost 15 and 25 euros", "The show starts at 19:00", "It lasts two and a half hours", "Children under 12 pay half"] },
  { topic: "travel", call: "a hotel",
    find: ["whether a room is free next weekend", "what a night costs", "whether breakfast is included", "how far it is from the station"],
    answerAs: "somebody who works at a car hire company",
    facts: ["A small car costs 35 euros a day", "Open 8:00 to 20:00", "You need a driving license and a bank card", "Bring the car back with a full tank"] },
  { topic: "freetime", call: "a museum",
    find: ["when it is open", "what a ticket costs", "whether there are guided tours", "whether you can take photos"],
    answerAs: "somebody who works at a doctor's surgery",
    facts: ["The doctor sees patients 8:00 to 16:00", "Book by phone or online", "The next free time is Thursday at 10:30", "Bring your ID card"] },
  { topic: "home", call: "a removal company",
    find: ["whether they are free on the 15th", "what a small flat costs to move", "whether they bring boxes", "how to pay"],
    answerAs: "somebody who works at a swimming pool",
    facts: ["Open 6:30 to 21:00, closed on Mondays", "One swim costs 7 euros", "A swimming cap is required", "Lessons for adults on Tuesdays at 18:00"] },
];

/** The B2 first task: a one minute talk on a work topic, and the question after it. */
export interface TalkBrief {
  readonly topic: TopicKey;
  readonly task: string;
  readonly followUp: string;
}

export const TALKS: readonly TalkBrief[] = [
  { topic: "work", task: "At a team meeting, give a short talk on why your team should try working from home two days a week.",
    followUp: "What would be the hardest part to organize?" },
  { topic: "work", task: "A new colleague starts on Monday. Give a short talk on what they need to know in their first week.",
    followUp: "What mistake do newcomers make most often?" },
  { topic: "environment", task: "At a staff meeting, propose one change that would make your workplace greener.",
    followUp: "How much would it cost, and who would pay?" },
  { topic: "school", task: "At a training day, give a short talk on a skill that matters in your work and how to learn it.",
    followUp: "How long does it take to learn it well?" },
  { topic: "economy", task: "Your company is choosing between a team trip and a bonus for everyone. Speak for one of them.",
    followUp: "What would the others say against it?" },
  { topic: "work", task: "Give a short talk on how meetings at work could take less time.",
    followUp: "Which meeting would you get rid of first?" },
  { topic: "media", task: "Present a tool or an app that makes work easier.",
    followUp: "What would you change about it?" },
];

/** The B2 second task: questions, a situation, and arguments on both sides. */
export interface DebateBrief {
  readonly topic: TopicKey;
  readonly questions: readonly string[];
  readonly situation: string;
  readonly sideA: { readonly label: string; readonly points: readonly string[] };
  readonly sideB: { readonly label: string; readonly points: readonly string[] };
}

export const DEBATES: readonly DebateBrief[] = [
  { topic: "town", questions: ["What does your town need most?", "Who should decide how its money is spent?"],
    situation: "Your town has money for one project this year: a new sports hall or better bus connections. Debate it and agree on one.",
    sideA: { label: "A sports hall", points: ["keeps young people active", "can hold events that bring visitors"] },
    sideB: { label: "Better buses", points: ["help everybody get to work", "mean fewer cars and cleaner air"] } },
  { topic: "home", questions: ["Is it better to rent a home or to buy one?", "Why do people move house?"],
    situation: "A friend has saved enough for a deposit. Debate whether they should buy now or keep renting, and agree on your advice.",
    sideA: { label: "Buy now", points: ["paying off a loan is a kind of saving", "you can make the home your own"] },
    sideB: { label: "Keep renting", points: ["you can move easily for a new job", "repairs are not your problem"] } },
  { topic: "media", questions: ["Do children spend too much time on screens?", "What did children do before phones?"],
    situation: "A school is deciding whether to ban phones for the whole school day. Debate it and agree on a position.",
    sideA: { label: "Ban them", points: ["pupils concentrate better", "breaks become more social"] },
    sideB: { label: "Allow them", points: ["phones help in an emergency", "pupils have to learn to use them sensibly"] } },
  { topic: "work", questions: ["How long should a working week be?", "What makes a good employer?"],
    situation: "Your workplace wants a four day week with longer days. Debate it and agree on a position.",
    sideA: { label: "Four longer days", points: ["three days off leave time for family", "fewer journeys to work"] },
    sideB: { label: "Keep five days", points: ["long days are tiring", "customers expect service every weekday"] } },
  { topic: "freetime", questions: ["Do you prefer holidays at home or abroad?", "What makes a team work well together?"],
    situation: "Your company offers the team either a trip abroad or a summer party at home. Debate it and agree on one.",
    sideA: { label: "A trip abroad", points: ["it builds a team", "people remember it for years"] },
    sideB: { label: "A party at home", points: ["more people can come", "it costs much less"] } },
  { topic: "environment", questions: ["Should cities be built for people or for cars?", "How do you get around your town?"],
    situation: "Your city is deciding whether to close its old town to cars. Debate it and agree on a position.",
    sideA: { label: "Close it", points: ["it's safer for people on foot", "cafés and shops get more customers"] },
    sideB: { label: "Keep it open", points: ["older people find it harder to get around", "delivery vans need to get in"] } },
];

/** The C1 first task: two topics to choose between, and the questions after the talk. */
export interface PresentationBrief {
  readonly topic: TopicKey;
  readonly choices: readonly [string, string];
  readonly followUps: readonly [string, string];
}

export const PRESENTATIONS: readonly PresentationBrief[] = [
  { topic: "work", choices: ["How to keep a team motivated when the work gets hard", "What a good manager does differently"],
    followUps: ["What is the most common mistake here?", "How would you know whether it was working?"] },
  { topic: "media", choices: ["The benefits and risks of working from home", "How technology is changing a profession you know"],
    followUps: ["Which change matters most?", "What should employers do about it?"] },
  { topic: "school", choices: ["Why learning never stops in working life", "How to bring young people into your field"],
    followUps: ["Who should pay for it?", "What stands in the way?"] },
  { topic: "environment", choices: ["How a workplace can cut its environmental footprint", "Why every company should report its energy use"],
    followUps: ["What would be the first step?", "What would it cost?"] },
  { topic: "work", choices: ["What makes a meeting worth having", "How to give and take feedback well"],
    followUps: ["What goes wrong most often?", "How would you train people in it?"] },
  { topic: "science", choices: ["Artificial intelligence at work: a help or a threat?", "How to plan a large project"],
    followUps: ["What would you warn people about?", "Where should a beginner start?"] },
];

/** The C1 second task: a topic and the thoughts on the card. */
export interface DiscussionBrief {
  readonly topic: TopicKey;
  readonly question: string;
  readonly thoughts: readonly string[];
}

export const DISCUSSIONS: readonly DiscussionBrief[] = [
  { topic: "school", question: "Should higher education be free for everybody?",
    thoughts: ["who pays now, and who would pay", "the quality of teaching", "fairness between people from different backgrounds"] },
  { topic: "media", question: "Does social media do more good than harm to public debate?",
    thoughts: ["access to information", "misinformation", "what can be regulated, and by whom"] },
  { topic: "town", question: "Should cities be built around people rather than cars?",
    thoughts: ["safety and health", "business and deliveries", "people who live outside the city"] },
  { topic: "health", question: "Is it the state's job to make people live more healthily?",
    thoughts: ["taxes on sugar and alcohol", "personal freedom", "the cost of health care"] },
  { topic: "work", question: "Should everybody retire at the same age?",
    thoughts: ["physical work and office work", "pensions", "experience in the workplace"] },
  { topic: "culture", question: "Can a small language thrive in a global world?",
    thoughts: ["education", "the internet and entertainment", "what each of us can do"] },
];
