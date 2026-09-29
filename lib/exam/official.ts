/**
 * What the real examination is and how to sit it, off the Board's own pages.
 *
 * WHY THIS IS A TABLE AND NOT A PAGE OF PROSE. A learner uses this to decide
 * when to register, what to bring and what happens if they fail, and every one
 * of those is somebody else's rule that changes on somebody else's schedule.
 * So every fact carries the page it was read from, the page carries the day it
 * was read, and `official.test.ts` refuses a fact with no source and a source
 * that is not the state's own. A second-hand summary of a rule is where a rule
 * quietly goes stale, and the one kind of mistake this page must never make is
 * telling somebody the wrong deadline for a permit application.
 *
 * WHAT IS DELIBERATELY NOT HERE. The dates of the next sittings, which Harno
 * publishes a year at a time and which would be wrong within a quarter of
 * being copied; the street addresses of the centres, which Harno says can
 * change and which the exam notice states anyway; and which level a residence
 * permit asks for, which is decided by the Police and Border Guard Board and
 * is sent there rather than summarised here, because its page could not be
 * read on the day this was written and a guess about a permit is the worst
 * guess available.
 *
 * The pass mark and the retake rule are not typed here at all. They are read
 * from `lib/exam/spec.ts`, which the mock exam marks against and which its own
 * test holds to the published figures, so the guide and the paper cannot say
 * two different things about the same sixty percent.
 *
 * Pure: no Estonian is written here beyond the names of public bodies and
 * documents as those bodies spell them.
 */

import { PASS_PCT, RETAKE_WAIT_PCT } from "./spec";

/** The day every page below was read. Printed on the page, and re-read before it is moved. */
export const READ_ON = "2026-09-25";

export interface OfficialSource {
  readonly label: string;
  readonly href: string;
}

/** The only hosts a fact on this page may cite: the state's own. Asserted. */
export const OFFICIAL_HOSTS = ["harno.ee", "eis.harno.ee", "www.politsei.ee", "www.eesti.ee"] as const;

export const SOURCES = {
  harnoEn: {
    label: "Harno, Estonian language proficiency examinations",
    href: "https://harno.ee/en/examinations-tests-and-studies/examinations-tests-and-certificates/estonian-language-proficiency",
  },
  harnoEt: {
    label: "Harno, the language examinations (the fuller page, in Estonian)",
    href: "https://harno.ee/eesti-keele-tasemeeksamid",
  },
  citizenship: {
    label: "Harno, the citizenship examinations (in Estonian)",
    href: "https://harno.ee/eksamid-testid-ja-uuringud/eksamid-testid-ja-lopudokumendid/kodakondsuseksamid",
  },
  eis: { label: "EIS, the examinations information system", href: "https://eis.harno.ee/" },
  ppa: { label: "The Police and Border Guard Board", href: "https://www.politsei.ee/en" },
  eesti: { label: "eesti.ee, the state portal", href: "https://www.eesti.ee/en" },
} as const satisfies Record<string, OfficialSource>;

export type SourceKey = keyof typeof SOURCES;

export interface Fact {
  readonly text: string;
  readonly source: SourceKey;
}

export interface GuideSection {
  readonly id: string;
  readonly title: string;
  readonly facts: readonly Fact[];
}

export const GUIDE: readonly GuideSection[] = [
  {
    id: "what",
    title: "What it is",
    facts: [
      {
        text: "The state examines Estonian at four levels: A2, B1, B2 and C1. There's no exam at A1 or C2.",
        source: "harnoEn",
      },
      {
        text: "Every level has four parts: writing, listening, reading and speaking. It tests your Estonian, not what you know about Estonian culture or history.",
        source: "harnoEn",
      },
      {
        text: "It's free, and so is sitting it again.",
        source: "harnoEn",
      },
      {
        text: "The papers, the level descriptions and the sample materials are all in Estonian.",
        source: "harnoEn",
      },
      {
        text: "The spoken part starts with a short chat with the examiner, the kind people have when they first meet: who you are and a bit about yourself. Two assessors mark a recording of it.",
        source: "harnoEt",
      },
    ],
  },
  {
    id: "who",
    title: "Who needs which level",
    facts: [
      {
        text: "Applying for citizenship takes two examinations: this one at B1 or higher, and a separate examination on the Constitution and the Citizenship Act.",
        source: "harnoEt",
      },
      {
        text: "If you're applying for citizenship and you're 65 or over, you can skip the writing part of the B1 exam and sit the other three. You choose that on the registration form.",
        source: "harnoEn",
      },
      {
        text: "The level a job needs is set by a government regulation, depending on the kind of post and its professional standard.",
        source: "harnoEn",
      },
      {
        text: "The Police and Border Guard Board decides which level a residence permit needs. Ask them about your own case before you register.",
        source: "ppa",
      },
    ],
  },
  {
    id: "register",
    title: "Registering",
    facts: [
      {
        text: "Register in EIS. If you have an Estonian personal identification code, you have to register there. Paper applications are only for people without one.",
        source: "harnoEn",
      },
      {
        text: "You'll need an email address. The form won't send without one.",
        source: "harnoEn",
      },
      {
        text: "Registration closes on the 1st of the month before the examination. You can register for one examination at a time.",
        source: "harnoEn",
      },
      {
        text: "You'll get an email with the time and place at least 14 days before. You can cancel up to four working days before the date.",
        source: "harnoEn",
      },
      {
        text: "If you need special conditions for health reasons, like more time or a separate room, apply to an expert committee. It meets in the first week of the month before the exam.",
        source: "harnoEn",
      },
    ],
  },
  {
    id: "day",
    title: "When, where and on the day",
    facts: [
      {
        text: "Examinations are held once a quarter in Tallinn, Tartu, Narva and Jõhvi, and in Pärnu in March and September if at least twelve people register.",
        source: "harnoEn",
      },
      {
        text: "They start at 10:00. When a lot of people register, the written and spoken parts can fall on different days.",
        source: "harnoEn",
      },
      {
        text: "There's a free consultation before each exam, up to four and a half hours long, and you don't need to register for it. Bring an ID document, just as you would to the exam.",
        source: "harnoEn",
      },
    ],
  },
  {
    id: "results",
    title: "Results, and failing",
    facts: [
      {
        text: `A pass is ${PASS_PCT} percent of the total, and no part can score zero.`,
        source: "harnoEn",
      },
      {
        text: "Results are published no later than 40 days after the examination, in EIS and on eesti.ee. The certificate is electronic only; the certificate number and your identification code are what an employer checks.",
        source: "harnoEn",
      },
      {
        text: `If you score below ${RETAKE_WAIT_PCT} percent, or miss the exam without a good reason, you wait six months before registering again. You can't register for the next sitting until the last one's results are out.`,
        source: "harnoEn",
      },
      {
        text: "You can ask to see your marked paper and appeal the result.",
        source: "harnoEt",
      },
    ],
  },
  {
    id: "costs",
    title: "Getting course fees back",
    facts: [
      {
        text: "Since 1 January 2024 the state only refunds Estonian course fees to citizenship applicants who have passed both exams, and to people the Language Board sent to sit one.",
        source: "harnoEt",
      },
      {
        text: "You can get up to 384 euros back for a course from a provider licensed for that level. Claim it within three months of finding out you passed.",
        source: "harnoEt",
      },
    ],
  },
  {
    id: "constitution",
    title: "The Constitution and Citizenship Act examination",
    facts: [
      {
        text: "It takes 45 minutes on a computer: 24 multiple choice questions in Estonian. You pass with 18 right.",
        source: "citizenship",
      },
      {
        text: "The Constitution, the Citizenship Act and a dictionary are in the room, and you're allowed to use them.",
        source: "citizenship",
      },
      {
        text: "It's held once a month except in July, in Tallinn, Tartu and Narva, and you get your result as soon as it ends. Harno publishes a handbook for it in English and Russian.",
        source: "citizenship",
      },
    ],
  },
];

export interface Material {
  readonly label: string;
  readonly href: string;
  /** Which level it is for, or null where it covers every level. */
  readonly level: "A2" | "B1" | "B2" | "C1" | null;
}

/**
 * The state's own free preparation, which is the best there is.
 *
 * Every link here was opened on `READ_ON` and answered. The written samples
 * are the one closest thing to a model answer anybody can honestly offer: real
 * candidates' texts, marked, with the examiners' comments, published by the
 * people who set the paper.
 */
export const MATERIALS: readonly Material[] = [
  { label: "Written samples by past candidates, with the examiners' comments", level: "A2", href: "https://harno.ee/sites/default/files/documents/2021-07/A2-taseme-sooritusnaidis.pdf" },
  { label: "Written samples by past candidates, with the examiners' comments", level: "B1", href: "https://harno.ee/sites/default/files/documents/2021-07/B1-taseme-sooritusnaidis.pdf" },
  { label: "Written samples by past candidates, with the examiners' comments", level: "B2", href: "https://harno.ee/sites/default/files/documents/2021-07/B2-taseme-sooritusnaidis.pdf" },
  { label: "Written samples by past candidates, with the examiners' comments", level: "C1", href: "https://harno.ee/sites/default/files/documents/2021-07/C1-sooritusnaidised_2017.pdf" },
  { label: "Consultation workbooks, listening tests and sample tasks for every level", level: null, href: "https://harno.ee/eesti-keele-tasemeeksamid" },
  { label: "Public practice tests in EIS", level: null, href: "https://eis.harno.ee/" },
  { label: "The Constitution and Citizenship Act examination: handbook, dates and practice", level: null, href: "https://harno.ee/eksamid-testid-ja-uuringud/eksamid-testid-ja-lopudokumendid/kodakondsuseksamid" },
];

/** The Board's written sample for a level, which the mock exam's result points at. */
export function writtenSampleFor(level: string): Material | null {
  return MATERIALS.find((m) => m.level === level) ?? null;
}
