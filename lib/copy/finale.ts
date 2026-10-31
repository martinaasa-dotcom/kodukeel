/**
 * THE COURSE-FINISHED SCREEN, IN ENGLISH, FOR `components/course/CourseFinished.tsx`.
 *
 * Kept out of the component so the six pieces of advice are one table the
 * screen and the browser check both read, and so the area file that translates
 * them (`lib/copy/i18n/areas/courseFinished.ts`) is checked against the same
 * strings. The two Estonian lines on the screen, `Palju õnne!` and `Aitäh!`,
 * are phrases A1 teaches (`a1-eile`, `a1-01-hello`) and are not in here.
 *
 * Every claim was checked against the app the day it was written: a lesson
 * page opens whatever part somebody is on, a headline word opens its entry
 * and the entry adds it to the deck, Today's "Out there" still asks about
 * yesterday after the course, Anu answers a sentence with a FIX line, and the
 * report button files into the queue a reviewer works.
 */

export interface Advice {
  readonly lead: string;
  readonly text: string;
  /** What in Kodukeel helps with it, where something does. */
  readonly app?: string;
}

export const FINALE = {
  heading: "You've finished the course.",
  figures: "From your first {Tere} to a C1 exam: {lessons} lessons, on {days} days you sat down to it.",
  figuresNoDays: "From your first {Tere} to a C1 exam: {lessons} lessons.",
  conversations: "And {conversations} conversations in Estonian out there, which is the number this app has been counting since your first week.",
  conversation: "And one conversation in Estonian out there, which is the number this app has been counting since your first week.",
  meansTitle: "What C1 means",
  means: "C1 is the highest level Estonia examines. It doesn't mean you'll never look a word up again: people born here do that too. It means you can be yourself in Estonian, at work, with friends and in the hard moments, and you can keep learning from Estonian itself. That's what happens from here.",
  betterTitle: "How to keep getting better",
  betterLead: "Six things that work, and what in Kodukeel helps with each:",
  certificate: "If you need the certificate, sit the C1 mock exam first, then book the real one with the Education and Youth Board.",
  kindTitle: "Be kind to yourself",
  kind: "Nearly everybody who learns a language as an adult keeps an accent and makes small mistakes, for good. Estonians understand you, and most of them are glad you made the effort. A mistake that doesn't stop you being understood matters less every year. The one that matters is going quiet.",
  fromHereTitle: "Kodukeel from here",
  fromHere: "Nothing you have goes away. Every lesson stays open, so you can go back to any part. The review, the practice rounds, Väljendid, the word of the day, the dictionary and Anu all carry on as before. Come back as often as it helps, and spend the rest of the time out there. This app was built to be left.",
  openTitle: "Be open with us",
  open: "Some of this course was written with a machine's help and is still being read by people: the Russian and Ukrainian translations, and a few Estonian lines a native speaker hasn't checked yet. If something was wrong or unclear, the report button on every screen goes to a person.",
  thanks: "Thank you for learning with us.",
  today: "Back to Today",
  lessons: "See every lesson",
  exam: "Sit the C1 mock exam",
} as const;

export const ADVICE: readonly Advice[] = [
  {
    lead: "A little every day.",
    text: "Ten minutes of review keeps the words you have.",
    app: "Review keeps asking what you'd otherwise forget, and nothing you learned in the course is lost.",
  },
  {
    lead: "Read what you'd read anyway, in Estonian.",
    text: "The news, a novel, the instructions on the box.",
    app: "The headlines on the dictionary page come with the dictionary under every word, and a word you meet anywhere goes into your deck in two taps.",
  },
  {
    lead: "Keep the radio on.",
    text: "Estonian radio in the kitchen, a podcast on the way to work, a film with Estonian subtitles and then without. Your ear keeps growing for years after your speaking settles.",
  },
  {
    lead: "Talk, and stay in Estonian.",
    text: "When somebody switches to English, ask to carry on in Estonian. Join something that happens in Estonian: a choir, a club, a course, a volunteer evening.",
    app: "Today still asks about yesterday's conversations, and the count is yours.",
  },
  {
    lead: "Write, and let somebody read it.",
    text: "A message, an email at work, a comment on a plan.",
    app: "Anu reads what you write and tells you what she would change and why.",
  },
  {
    lead: "Collect the words of your own life.",
    text: "Your work, your hobby, the word you were missing in a conversation.",
    app: "Add them to your deck from the dictionary, a photo of a page, or the box on Today.",
  },
];
