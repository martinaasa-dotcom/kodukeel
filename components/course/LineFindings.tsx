"use client";

import type { ReactNode } from "react";
import { useLocale, useT } from "@/components/Locale";
import { fillNodes } from "@/components/TemplateNodes";
import { LessonText } from "@/components/course/LessonText";
import { useFindingLine } from "@/components/course/SentenceFindings";
import { caseByKey, casePlainName } from "@/lib/estonian/cases";
import { sayShort } from "@/lib/estonian/plainAsk";
import type { Axis, Difference, Grade, Person, SlotRead, Tense } from "@/lib/course/lessons/againstLine";
import type { Finding } from "@/lib/course/lessons/sentenceCheck";
import { VERDICT_CLASS } from "@/lib/ux/verdict";

/**
 * WHAT A TYPED OR SPOKEN SENTENCE GOT RIGHT AND WHAT IT DID NOT, SAID ONCE.
 *
 * Two readings of one sentence, drawn as one panel: whether it says what the
 * card asked (`againstLine`: the tense, the person, the ending, the words) and
 * whether it is Estonian (`checkSentence`: spelling and endings). A learner
 * typed `Ma koristan kööki` for "I was cleaning the kitchen" and read "No
 * mistakes found" painted as a right answer; the first reading is what tells
 * them the verb is in the wrong time.
 *
 * The headline is the grade in plain words, never a score: right, understood
 * but not what was asked, understood with a slip, or hard to understand. The
 * colors are the verdict palette's (`lib/ux/verdict.ts`): right is the right
 * color only when both readings found nothing; anything understood with
 * something to change is "nearly"; only a sentence the dictionary could not
 * read is "wrong".
 *
 * NOT A LIVE REGION ITSELF, like `SentenceFindings`: the caller mounts one
 * first and this arrives inside it, or draws it in a list read afterwards.
 */
export function LineFindings({ grade, differences, findings, about }: {
  grade: Grade;
  differences: readonly Difference[];
  findings: readonly Finding[];
  /** Who a story told back is about, for the line that says the verb changes with them. */
  about?: string;
  /**
   * How it reaches a screen reader, said at every call: inside a live region
   * the caller mounted first, or in a list of what was said, read on its own
   * after the step (`SaidList`). Required, so a new caller has to decide.
   */
  announced: "region" | "list";
}) {
  const finding = useFindingLine();
  const t = useT();
  const locale = useLocale();
  const et = (word: string) => <b lang="et">{word}</b>;
  const meant = (text: string) => <LessonText text={text} locale={locale} />;

  const tensePhrase: Record<Tense, string> = {
    now: t("now", "line"),
    past: t("in the past", "line"),
    would: t("would", "line"),
    not: t("with a no", "line"),
    command: t("as a command", "line"),
  };
  const personPhrase: Record<Person, string> = {
    Sg1: t("I", "line"),
    Sg2: t("you", "line"),
    Sg3: t("he or she", "line"),
    Pl1: t("we", "line"),
    Pl2: t("you, more than one or polite", "line"),
    Pl3: t("they", "line"),
  };
  // The object's two endings are named for what they say about the job, which is what the lesson teaches.
  const casePhrase = (slot: SlotRead, other: SlotRead): string => {
    const objectPair = new Set([slot.case, other.case]);
    if (objectPair.has("GENITIVE") && objectPair.has("PARTITIVE")) {
      return slot.case === "GENITIVE" ? t("the whole of it, done", "line") : t("some of it, or still going", "line");
    }
    if (slot.case === "NOMINATIVE") return t("the plain form", "line");
    return (slot.case && sayShort(slot.case, locale)) ?? "";
  };
  /** One reading described over the axes that differ, and only those. */
  const describe = (slot: SlotRead, other: SlotRead, axes: readonly Axis[]): string => {
    const parts: string[] = [];
    if (axes.includes("person") && slot.person) parts.push(personPhrase[slot.person]);
    if (axes.includes("tense") && slot.tense) parts.push(tensePhrase[slot.tense]);
    if (axes.includes("case")) parts.push(casePhrase(slot, other));
    if (axes.includes("number")) parts.push(slot.plural ? t("more than one", "line") : t("one", "line"));
    return parts.filter(Boolean).join(", ");
  };

  const line = (d: Difference): ReactNode => {
    switch (d.kind) {
      case "form": {
        const yours = d.yoursMeant ? meant(d.yoursMeant) : describe(d.yours, d.theirs, d.axes);
        const theirs = d.meant ? meant(d.meant) : describe(d.theirs, d.yours, d.axes);
        if (d.right === null) {
          return fillNodes(about
            ? t("You said {word} ({yours}). The story is about {who}, so the verb changes too ({theirs}).")
            : t("You said {word} ({yours}). Here it needs {theirs}."), { word: et(d.word), yours, theirs, who: about ?? "" });
        }
        return fillNodes(t("You said {word} ({yours}). The line asks for {right} ({theirs})."), { word: et(d.word), yours, right: et(d.right), theirs });
      }
      case "negation":
        return d.youSaidNo
          ? fillNodes(t("Yours says no with {no}. The line doesn't."), { no: et(d.no) })
          : fillNodes(t("The line says no: it needs {no}."), { no: et(d.no) });
      case "swap":
        if (d.meant && d.yoursMeant) {
          return fillNodes(t("Where the line has {right} ({meant}), you have {word} ({yours})."), { right: et(d.right), meant: meant(d.meant), word: et(d.word), yours: meant(d.yoursMeant) });
        }
        if (d.meant) return fillNodes(t("Where the line has {right} ({meant}), you have {word}."), { right: et(d.right), meant: meant(d.meant), word: et(d.word) });
        return fillNodes(t("Where the line has {right}, you have {word}."), { right: et(d.right), word: et(d.word) });
      case "synonym":
        return fillNodes(t("{word} means the same. The line uses {right}."), { word: et(d.word), right: et(d.right) });
      case "missing":
        return d.meant
          ? fillNodes(t("Your sentence has nothing for {right} ({meant})."), { right: et(d.right), meant: meant(d.meant) })
          : fillNodes(t("Your sentence has nothing for {right}."), { right: et(d.right) });
      case "case": {
        const spec = caseByKey(d.theirs);
        const name = spec ? casePlainName(spec, locale) : d.theirs.toLowerCase();
        return d.right
          ? fillNodes(t("The line has {model} in the {case}, and yours takes it too: {right}, not {word}."), { model: et(d.model), case: name, right: et(d.right), word: et(d.word) })
          : fillNodes(t("The line has {model} in the {case}, and {word} needs the same ending."), { model: et(d.model), case: name, word: et(d.word) });
      }
      case "person":
        return fillNodes(about
          ? t("You said {word} ({yours}). The story is about {who}: {right}.")
          : t("You said {word} ({yours}). The line is about {theirs}: {right}."), {
          word: et(d.word), yours: personPhrase[d.yours], right: et(d.right), theirs: personPhrase[d.theirs], who: about ?? "",
        });
    }
  };

  const asked = differences.filter((d) => d.kind !== "synonym");
  const same = differences.filter((d) => d.kind === "synonym");
  const headline: Record<Grade, string> = {
    right: findings.length === 0 ? t("That says what was asked, and no mistakes were found in the spelling or the endings.") : t("That says what was asked."),
    asked: t("Understood, but not quite what was asked."),
    slip: t("Understood, with something to fix."),
    unclear: t("This one is hard to understand: most of its words aren't ones the dictionary knows."),
  };
  const tone = grade === "right" ? VERDICT_CLASS.right : grade === "unclear" ? VERDICT_CLASS.wrong : VERDICT_CLASS.nearly;

  return (
    <div className={`verdict-panel ${tone}`} data-line-check={grade}>
      <p className={grade === "right" ? undefined : "font-semibold"}>{headline[grade]}</p>
      {(asked.length > 0 || same.length > 0) && (
        <ul className="mt-1 flex flex-col gap-1" data-line-differences>
          {[...asked, ...same].map((d, i) => <li key={i}>{line(d)}</li>)}
        </ul>
      )}
      {findings.length > 0 && (
        <>
          {/* The headline already says so on a slip; under a sentence that also missed what was asked it is a second list. */}
          {grade !== "slip" && <p className="mt-2 font-semibold">{findings.length === 1 ? t("One thing to fix") : t("A few things to fix")}</p>}
          <ul className="mt-1 flex flex-col gap-1" data-sentence-check="findings">
            {findings.map((f, i) => <li key={i}>{finding(f)}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}
