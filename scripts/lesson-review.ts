/**
 * THE LESSONS' ESTONIAN, LAID OUT FOR THE NATIVE SPEAKER TO READ.
 *
 * ADR-005 amendment 6 lets the lessons carry Estonian this app wrote, on the
 * condition that a native speaker reads every line before it reaches a
 * learner. The checks in `lib/course/lessons/` say a spelling exists and has
 * been taught; they cannot say a sentence is one a person would say. This
 * prints every lesson in teaching order as one Markdown file, with a box to
 * tick beside each piece of Estonian, so that reading is a sitting rather
 * than a hunt through nine source files.
 *
 *   npx tsx scripts/lesson-review.ts [out.md]
 */

import { writeFileSync } from "node:fs";
import { LESSONS, LESSON_PARTS, lessonLabel } from "@/lib/course/lessons";
import type { Cell, Prompt } from "@/lib/course/lessons";
import { nativeClip } from "@/lib/audio/native";

const out: string[] = [];
const say = (line = "") => out.push(line);
const braced = (text: string) => text.replace(/\{([^{}]+)\}/g, "**$1**");
const cell = (c: Cell) => ("et" in c ? `**${c.et}**` : c.en);

say("# A1 lessons: the Estonian, for review");
say();
say(`${LESSONS.length} lessons. Every **bold** piece is Estonian this app wrote. Tick a box once the line reads as something a person would say; write a correction under any that does not.`);
say();
say("Bold inside an English sentence is Estonian quoted in a rule or a note, and it is held to the same standard.");

for (const part of LESSON_PARTS) {
  say();
  say(`## ${braced(part.title)}`);
  say();
  say(part.about);
  for (const lesson of LESSONS.filter((l) => l.part === part.id)) {
    say();
    say(`### Lesson ${lessonLabel(lesson)}: ${lesson.title}`);
    say();
    say(`*${lesson.goal}*${lesson.kind === "lesson" ? "" : lesson.kind === "checkin" ? " (check-in)" : " (end of the part)"}`);
    say();
    say("**The conversation**");
    say();
    for (const line of lesson.conversation) {
      const stage = line.stage ? ` _(${line.stage})_` : "";
      if (line.et) say(`- [ ] ${line.who}: **${line.et}** = ${braced(line.en ?? "")}${stage}`);
      else say(`- ${line.who}:${stage}`);
    }
    if (lesson.teaches.length > 0) {
      say();
      say("**Taught tonight**");
      say();
      for (const t of lesson.teaches) {
        if (t.kind === "verb") say(`- [ ] **${t.et}**, **${t.first}** = ${braced(t.en)}; ${braced(t.firstEn)}`);
        else say(`- [ ] **${t.et}**${t.kind === "form" ? ` (of ${t.of})` : t.kind === "phrase" ? " (phrase)" : ""} = ${braced(t.en)}`);
      }
    }
    say();
    say("**How it works**");
    say();
    say(`- [ ] ${braced(lesson.how.point)}`);
    for (const note of lesson.how.notes ?? []) say(`- [ ] ${braced(note)}`);
    say(`- [ ] Watch out: ${braced(lesson.how.watchOut)}`);
    const table = lesson.how.table;
    if (table) {
      say();
      say(`| ${table.head.map(braced).join(" | ")} |`);
      say(`| ${table.head.map(() => "---").join(" | ")} |`);
      for (const row of table.rows) say(`| ${row.map(cell).join(" | ")} |`);
    }
    for (const row of lesson.how.sounds ?? []) {
      say(`- [ ] Sound **${row.glyph}**: ${braced(row.like)}, as in **${nativeClip(row.word).text}** (recorded)`);
    }
    for (const set of lesson.how.listen ?? []) {
      say(`- [ ] Hear side by side: ${set.words.map((w) => `**${nativeClip(w.clip).text}** (${braced(w.en)})`).join(", ")} (recorded)`);
    }
    const prompts = (title: string, list: readonly Prompt[]) => {
      if (list.length === 0) return;
      say();
      say(`**${title}**`);
      say();
      for (const p of list) {
        const ask = p.ask ? `asked **${p.ask.et}** (${braced(p.ask.en)}); ` : "";
        say(`- [ ] ${ask}${braced(p.cue)} → **${p.model.et}** = ${braced(p.model.en)}`);
      }
    };
    prompts("Say it", lesson.answers);
    if (lesson.roleplay) {
      say();
      say(`*Role-play: ${braced(lesson.roleplay.scene)}*`);
      prompts("Role-play", lesson.roleplay.turns);
    }
  }
}

const path = process.argv[2] ?? "lesson-review.md";
writeFileSync(path, `${out.join("\n")}\n`);
console.log(`Wrote ${path}: ${LESSONS.length} lessons, ${out.filter((l) => l.startsWith("- [ ]")).length} lines to tick.`);
