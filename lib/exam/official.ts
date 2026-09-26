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
        text: "The state examines Estonian at four levels, A2, B1, B2 and C1. There is no A1 examination and no C2.",
        source: "harnoEn",
      },
      {
        text: "Every level has four parts: writing, listening, reading and speaking. It tests language, not knowledge of Estonian culture or history.",
        source: "harnoEn",
      },
      {
        text: "It is free of charge, and so is sitting it again.",
        source: "harnoEn",
      },
      {
        text: "The papers, the descriptions of each level and the sample materials are all in Estonian.",
        source: "harnoEn",
      },
      {
        text: "The spoken part opens with a short general conversation with the examiner, the way people talk when they first meet: who you are and a little about yourself. Two assessors mark a recording of it.",
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
        text: "A citizenship applicant aged 65 or over is excused the writing part of the B1 examination and sits the other three. That has to be chosen on the registration form.",
        source: "harnoEn",
      },
      {
        text: "What a job asks for is set by a government regulation, according to the kind of post and its professional standard.",
        source: "harnoEn",
      },
      {
        text: "Which level a residence permit asks for is decided by the Police and Border Guard Board. Ask them for your own case before you register.",
        source: "ppa",
      },
    ],
  },
  {
    id: "register",
    title: "Registering",
    facts: [
      {
        text: "Register in EIS. Anybody with an Estonian personal identification code has to register there; a paper application is only for somebody without one.",
        source: "harnoEn",
      },
      {
        text: "An email address is required. Without one the form cannot be sent.",
        source: "harnoEn",
      },
      {
        text: "Registration closes on the 1st of the month before the examination. You can register for one examination at a time.",
        source: "harnoEn",
      },
      {
        text: "A notice with the time and the place is emailed no later than 14 days before. A registration can be cancelled up to four working days before the date.",
        source: "harnoEn",
      },
      {
        text: "Somebody who needs special conditions for health reasons, such as more time or a separate room, applies to an expert committee, which meets in the first week of the month before the examination.",
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
        text: "They start at 10:00. The written and the spoken parts can be on different dates when a lot of people have registered.",
        source: "harnoEn",
      },
      {
        text: "A free consultation is held before each examination, up to four and a half hours long, and it can be attended without registering for it. Bring an identity document to it, as to the examination.",
        source: "harnoEn",
      },
    ],
  },
  {
    id: "results",
    title: "Results, and failing",
    facts: [
      {
        text: `A pass is ${PASS_PCT} percent of the total, and no part may score nothing.`,
        source: "harnoEn",
      },
      {
        text: "Results are published no later than 40 days after the examination, in EIS and on eesti.ee. The certificate is electronic only; the certificate number and your identification code are what an employer checks.",
        source: "harnoEn",
      },
      {
        text: `Below ${RETAKE_WAIT_PCT} percent, or absent without a good reason, you wait six months before registering again. You cannot register for the next sitting until the last one's results are out.`,
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
        text: "Since 1 January 2024 the state refunds Estonian course fees only to citizenship applicants who have passed both examinations, and to people the Language Board directed to sit one.",
        source: "harnoEt",
      },
      {
        text: "The refund is up to 384 euros, for a course from a provider licensed for that level, claimed within three months of learning you passed.",
        source: "harnoEt",
      },
    ],
  },
  {
    id: "constitution",
    title: "The Constitution and Citizenship Act examination",
    facts: [
      {
        text: "It lasts 45 minutes, on a computer, and has 24 multiple choice questions in Estonian. A pass is 18 right.",
        source: "citizenship",
      },
      {
        text: "The texts of the Constitution and the Citizenship Act and a dictionary are in the room and may be used.",
        source: "citizenship",
      },
      {
        text: "It is held once a month except July, in Tallinn, Tartu and Narva, and the result is known as soon as it ends. Harno publishes a handbook for it in English and in Russian.",
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
