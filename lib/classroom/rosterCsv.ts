import type { ClassSummary } from "./roster";
import { BAND_LABEL, type CohortSummary } from "./cohort";
import { EVIDENCE_LABEL } from "@/lib/exam/readiness";
import { caseByKey } from "@/lib/estonian/cases";
import { commentBlock, defused } from "@/lib/research/csv";

/**
 * THE ROSTER AS A FILE A SPREADSHEET OPENS, HOLDING WHAT THE BOARD SHOWS AND
 * NOTHING ELSE.
 *
 * The owner of a class already sees every figure here on the class page, so
 * the file is the same data for the same reader, written down: a teacher who
 * keeps a register in a spreadsheet should not have to copy thirty rows by
 * hand. Two shapes, as the board has two. A class carries each learner's
 * weakest case, rolled up exactly as `classRoster` rolls it; a workplace group
 * carries a band and the evidence behind it and has no column a case could go
 * in, because `workplaceRoster` never reads one.
 *
 * Pure: it is handed the summary the board was drawn from and a function that
 * says a line in the teacher's language, and it returns the text. The headers
 * follow the teacher's interface language; the case names are Estonian, read
 * off `lib/estonian/cases.ts`, because that is how a class names a case.
 *
 * The file opens with a byte order mark and ends its lines with CRLF, which is
 * what makes a spreadsheet on Windows read Cyrillic and `õ` as letters rather
 * than as mojibake. Every text cell goes through `defused`, since a display name
 * is typed by the learner and `=HYPERLINK(...)` is a name somebody could type.
 */

export type RosterCsvInput = {
  className: string;
  /** The day the file was made, as YYYY-MM-DD. */
  date: string;
  /** A line in the teacher's interface language. */
  say: (english: string) => string;
} & (
  | { kind: "CLASS"; summary: ClassSummary }
  | { kind: "WORKPLACE"; summary: CohortSummary }
);

const BOM = "\uFEFF";
const CRLF = "\r\n";

/** One cell, quoted per RFC 4180 wherever a comma, a quote or a line break would change the row. */
export function cell(value: string | number | null): string {
  if (value === null) return "";
  const text = typeof value === "number" ? String(value) : defused(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function line(values: (string | number | null)[]): string {
  return values.map(cell).join(",");
}

/** A comment line holds one line, whatever a name carried in it. */
function flat(text: string): string {
  return text.replace(/[\r\n]+/g, " ");
}

function caseName(key: string): string {
  return caseByKey(key)?.et ?? key.toLowerCase();
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function rosterCsv(input: RosterCsvInput): string {
  const { say } = input;
  const notes: string[] = [flat(input.className), input.date, say("Reviews are counted over the last 7 days.")];
  const rows: string[] = [];

  if (input.kind === "CLASS") {
    const weakest = input.summary.weakestCases
      .map((c) => `${caseName(c.grammCase)} ${c.accuracy}%`)
      .join(", ");
    if (weakest) notes.push(`${say("What the class is weakest at:")} ${weakest}`);
    notes.push(say("This file holds what the roster shows you as the teacher. Treat it as you treat the roster."));

    rows.push(line([
      say("Name"), say("Role"), say("Joined"), say("Reviews this week"), say("Said aloud this week"), say("Streak"),
      say("Words known"), say("Days since last review"), say("Weakest case"),
      say("Weakest case accuracy (%)"), say("Weakest case answers"),
    ]));
    for (const entry of input.summary.entries) {
      const weak = entry.weakestCase;
      rows.push(line([
        entry.displayName,
        say(entry.role === "TEACHER" ? "teacher" : "student"),
        isoDate(entry.joinedAt),
        entry.reviewsThisWeek,
        entry.spokenThisWeek,
        entry.streak,
        entry.wordsKnown,
        entry.daysSinceLastReview,
        weak ? caseName(weak.grammCase) : null,
        weak ? weak.accuracy : null,
        weak ? weak.total : null,
      ]));
    }
  } else {
    notes.push(`${say("The bands are about the exam at")} ${input.summary.level}`);
    notes.push(say("This file holds what the group page shows you. Treat it as you treat that page."));
    rows.push(line([
      say("Name"), say("Reviews this week"), say("Days since last review"), say("Band"), say("Evidence"),
    ]));
    for (const member of input.summary.members) {
      rows.push(line([
        member.displayName,
        member.reviewsThisWeek,
        member.daysSinceLastReview,
        // The board says "Close to passing" wherever "Close" alone would be read as nearby.
        say(member.band === "close" ? "Close to passing" : BAND_LABEL[member.band]),
        say(EVIDENCE_LABEL[member.evidence]),
      ]));
    }
  }

  const header = commentBlock(notes.map(flat)).split("\n");
  return BOM + [...header, ...rows].join(CRLF) + CRLF;
}

/**
 * The file's name: the class name reduced to plain letters and digits, so the
 * header carries no character a browser has to guess at, and `class` where
 * nothing is left.
 */
export function rosterFilename(className: string, date: string): string {
  const plain = className.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `kodukeel-${plain || "class"}-roster-${date}.csv`;
}

/** Where the owner of a class downloads its roster file. */
export function rosterPath(classroomId: string): string {
  return `/api/class/${encodeURIComponent(classroomId)}/roster`;
}
