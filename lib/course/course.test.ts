import { LESSONS } from "@/lib/course/lessons";
import { LESSON_SITUATIONS, situationsOfferedBefore, situationsOfferedThrough } from "./lessonSituations";
import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/estonian/cases";
import { grammarTopic } from "@/lib/estonian/grammar";
import { SCENES, sceneById as conversationById } from "@/lib/scenes/catalogue";
import { askedLemmas } from "@/lib/scenes/types";
import { SYLLABUS, unitById } from "@/lib/collections/syllabus";
import { modeAt } from "@/lib/ux/modes";
import {
  ACTIVITIES, type ActivitySpec, MAX_DAY_WORDS, MINUTES_PER_WORD,
  EARLIER_SCENES_FOR_UNIT, PARTS, PROGRAMMES, ROTATION, SCENE_FOR_UNIT, dayStanding, ordinaryWords, programmeAfter,
  programmeStanding, slice, wordsThrough, taughtThrough, activityTitle,
  PAGE_NEEDS, builtOnACase, supportsRound, taughtFrom, grammarThrough, readingPlan,
  WORDS_FOR_LETTERS, NO_TAUGHT, rounds, formsPerEvening,
} from "./index";
import { LESSON_PARTS } from "./lessons";
import { HARVESTED } from "@/prisma/data/harvested";
import { readFileSync } from "node:fs";
import { cardWithin, moduleScopeFrom, scopeFor, slotWithin } from "./scope";
import { LESSON_FORMS_MINUTES, lessonMinutes, lessonPastSlots, lessonPasts } from "./lessonCourse";
import { LESSON_STEP } from "./types";
import { pastPersons } from "@/lib/estonian/conjugate";
import { evenings } from "./build";

/**
 * What the ladder had taught by the end of a day, in the shape the builder
 * decides a round against: every word of every part before, then this part's
 * own through the day. Rebuilt here from the syllabus rather than read off the
 * builder, so the test is a second opinion rather than the builder agreeing
 * with itself.
 */
function taughtBy(programme: (typeof PROGRAMMES)[number], index: number) {
  const lemmas = new Set(taughtThrough(programme, index));
  const grammar = grammarThrough(programme, index);
  return taughtFrom(
    SYLLABUS.flatMap((u) => u.vocabulary).filter((v) => lemmas.has(v.lemma)),
    [...grammar.cases.map((c) => ({ grammarCase: c })), ...grammar.topics.map((t) => ({ grammar: t }))],
  );
}

/**
 * The parts built from units, of which there are none since C1 became lessons
 * (docs/43-lessons.md §16): every level from A1 to C1 is the lessons
 * (`lessonCourse.ts`), whose evenings are one step each and are held by
 * `lessonCourse.test.ts`. The tests that walked a unit evening went with
 * C1's units, and the pure-function tests of the builder stay until the
 * builder goes (§15.13, C1-9).
 */
const BUILT = PROGRAMMES.filter((p) => !p.days.some((d) => d.lesson));
/** The levels the lessons teach, which is every level the course has. */
const LESSON_LEVELS = new Set<string>(LESSON_PARTS.map((p) => p.level));
/** Every lesson evening of the ladder, in teaching order, with its part. */
const LESSON_DAYS = PROGRAMMES.flatMap((p) => p.days.map((d) => ({ programme: p, day: d })));
/** A lesson's evening and its part, by the lesson's id. */
function lessonEvening(lessonId: string) {
  const at = LESSON_DAYS.find(({ day }) => day.lesson === lessonId);
  if (!at) throw new Error(`no evening carries ${lessonId}`);
  return at;
}

describe("the program is a request against the course, never a copy of it", () => {
  it("builds no part from units, since every level is lessons", () => {
    expect(PARTS).toEqual([]);
    expect(BUILT).toEqual([]);
    expect(PROGRAMMES.every((p) => p.days.length > 0 && p.days.every((d) => d.lesson))).toBe(true);
    expect([...LESSON_LEVELS]).toEqual(["A1", "A2", "B1", "B2", "C1"]);
  });

  /*
    A DECLARED EVENING IS HELD TO THE SAME CEILING AS A SLICED ONE. The
    budget is what the arithmetic may spend and a person may go past it, but
    nobody may go past `MAX_DAY_WORDS`: that is what a fifteen-minute evening
    can carry at all. Asked of the declaration itself rather than of the days
    it builds, so a unit whose words are all taught earlier is still checked.
  */
  it("keeps a declared evening under the ceiling a day has", () => {
    for (const u of SYLLABUS) {
      for (const group of u.evenings ?? []) {
        expect(group.length, `${u.id} declares an evening of ${group.length} words`)
          .toBeLessThanOrEqual(MAX_DAY_WORDS);
      }
    }
  });

  /*
    WHAT A DAY ID NAMES, PINNED, BECAUSE A LEARNER'S ROW STORES ONE.

    `CourseStep` is `@@unique([ownerId, programmeId, dayId, stepId])` and
    `dayReached` is the furthest id carrying a tick, so a day id is not a
    label, it is a foreign key into a person's place in the course. It is
    assigned positionally (`${spec.id}-${n}`), which means any syllabus edit
    that adds, removes or re-splits a unit renumbers every evening after it
    and quietly moves everybody mid-part onto a different one. That is not
    hypothetical: this very change took A1.1 from thirteen evenings to
    twelve, and `a1.1-05` went from the second half of the verbs to the
    first quarter of the greetings.

    A positional id cannot be made stable, so what is asserted instead is
    that a shift is *deliberate*. The snapshot is what each id named when it
    was last agreed; a build that disagrees fails here, naming the days that
    moved, and whoever made the edit decides whether the shift is worth its
    cost before running `npx tsx scripts/write-day-ids.ts`. Read off the file
    rather than a literal, since 288 lines in a test is a test nobody reads.
  */
  it("names the same evening by the same id as the agreed snapshot", () => {
    const pinned = JSON.parse(
      readFileSync(new URL("./day-ids.json", import.meta.url), "utf8"),
    ) as Record<string, string>;
    const built: Record<string, string> = {};
    for (const p of PROGRAMMES) {
      for (const d of p.days) built[d.id] = d.lesson ? `lesson ${d.lesson}` : `${d.unitId} ${d.part.n}/${d.part.of}`;
    }

    const moved = Object.keys({ ...pinned, ...built })
      .filter((id) => pinned[id] !== built[id])
      .map((id) => `${id}: was ${pinned[id] ?? "no evening"}, is ${built[id] ?? "no evening"}`);
    expect(
      moved,
      "a day id now names a different evening, so every learner mid-part moves with it. "
      + "Decide whether that is worth it, then run `npx tsx scripts/write-day-ids.ts`",
    ).toEqual([]);
  });

  /*
    THE DEGRADATION BRANCH, WHICH NO SHIPPED UNIT REACHES.

    `evenings()` intersects a declared group with the words still to teach,
    because a lemma an earlier unit of the part already taught is dropped
    before the builder gets here. Nothing in the course exercises that today:
    the two units that declare their evenings own every word they name. So
    it is the branch that rots, and it is the one where getting it wrong puts
    a word on a screen twice or leaves an evening blank. Driven directly, on
    a real unit, rather than waited for.
  */
  describe("a unit's declared evenings, against the words still to teach", () => {
    const pronouns = unitById("asesonad")!;
    const verbs = unitById("esimesed-verbid")!;

    it("uses the declaration when every word is still to teach", () => {
      expect(evenings(verbs, verbs.lemmas, 5)).toEqual([
        ["olema", "see", "elama", "õppima"],
        ["rääkima", "töötama", "tahtma", "minema", "tulema"],
      ]);
    });

    it("drops a word an earlier unit already taught, and the group with it", () => {
      const left = verbs.lemmas.filter((l) => l !== "see");
      expect(evenings(verbs, left, 5)).toEqual([
        ["olema", "elama", "õppima"],
        ["rääkima", "töötama", "tahtma", "minema", "tulema"],
      ]);
      const only = evenings(verbs, ["rääkima", "töötama"], 5);
      expect(only, "an emptied group is dropped rather than drawn blank")
        .toEqual([["rääkima", "töötama"]]);
    });

    it("never puts a word on two evenings, whatever it is handed", () => {
      for (const words of [verbs.lemmas, verbs.lemmas.slice(3), pronouns.lemmas]) {
        const unit = words === pronouns.lemmas ? pronouns : verbs;
        const flat = evenings(unit, words, 5).flat();
        expect(new Set(flat).size).toBe(flat.length);
        expect([...flat].sort()).toEqual([...words].sort());
      }
    });

    it("falls back rather than teaching a word twice on a repeated declaration", () => {
      /* Length alone would accept this: two groups naming `see` and none
         naming `õppima` is still nine words. The result has to be a partition. */
      const repeated = {
        ...verbs,
        evenings: [
          ["olema", "see"], ["see", "elama"],
          ["rääkima", "töötama", "tahtma", "minema", "tulema"],
        ],
      } as typeof verbs;
      const got = evenings(repeated, verbs.lemmas, 5);
      expect(got.flat()).toEqual(verbs.lemmas);
      expect(got.map((g) => g.length), "the even slice, not the declaration").toEqual([5, 4]);
    });

    it("falls back to the even slice for a unit that declares nothing", () => {
      const plain = unitById("inimesed")!;
      expect(plain.evenings).toBeUndefined();
      const got = evenings(plain, plain.lemmas, 5);
      expect(got.flat()).toEqual(plain.lemmas);
      for (const group of got) expect(group.length).toBeLessThanOrEqual(5);
    });
  });

  it("splits a unit evenly rather than filling each evening to the ceiling", () => {
    expect(slice([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2], [3, 4], [5, 6]]);
    expect(slice([1, 2, 3, 4, 5], 2)).toEqual([[1, 2, 3], [4, 5]]);
    expect(slice([1], 1)).toEqual([[1]]);
  });
});

describe("what a day reads and where it goes", () => {
  it("only sends somebody to a conversation the app has", () => {
    for (const [lessonId, sceneId] of Object.entries(LESSON_SITUATIONS)) {
      expect(LESSONS.some((l) => l.id === lessonId), lessonId).toBe(true);
      expect(SCENES.some((s) => s.id === sceneId), sceneId).toBe(true);
    }
    // No unit opens one any more (`plan.ts`): the lessons offer every one.
    expect(SCENE_FOR_UNIT).toEqual({});
    expect(EARLIER_SCENES_FOR_UNIT).toEqual({});
  });

  // The other direction, which is what lets a screen say "every conversation
  // the app has" with a count read off the catalog: a scene no lesson offers
  // is a scene the course never brings in.
  it("puts every conversation the app has on an evening", () => {
    // Every one is offered by the lesson that rehearses it, on its finish (`lessonSituations.ts`), once.
    const offered = new Set(Object.values(LESSON_SITUATIONS));
    for (const scene of SCENES) expect(offered.has(scene.id), `${scene.id}: no lesson offers it`).toBe(true);
    expect(offered.size).toBe(SCENES.length);
    expect(Object.keys(LESSON_SITUATIONS).length).toBe(SCENES.length);
  });

  /*
    AND THE SAME ANSWER FROM OUTSIDE THE MODULE. The Situations list says
    which conversations the course has not reached yet, and a conversation a
    lesson offers is brought in from the evening that lesson is finished
    (`situationsOfferedThrough`), never before it, so a scene a finish screen
    offers tonight may never read as "later" there.
  */
  it("counts every conversation a lesson offers as brought in by the evening that offers it", () => {
    let offered = 0;
    for (const [lessonId, sceneId] of Object.entries(LESSON_SITUATIONS)) {
      offered += 1;
      expect(situationsOfferedThrough(lessonId).has(sceneId), lessonId).toBe(true);
      expect(situationsOfferedBefore(lessonId).has(sceneId), lessonId).toBe(false);
    }
    // Measured at 43 when C1 became lessons: B1's 21, B2's 17 and C1's 5.
    expect(offered).toBeGreaterThanOrEqual(43);
  });

  /*
    ONE TABLE OF WHAT A MODE IS CALLED, AND THIS IS NOT IT. An activity that
    opens a practice mode reads its title out of `PRACTICE_MODES`, so a mode
    renamed once is renamed on the course screen too; one that opens something
    else carries its own. Both, or neither, is the fault worth catching.
  */
  it("reads a mode's name from the mode table and nowhere else", () => {
    const entries: [string, ActivitySpec][] = Object.entries(ACTIVITIES);
    for (const [key, spec] of entries) {
      const mode = modeAt(spec.href);
      expect(Boolean(mode) !== Boolean(spec.title), key).toBe(true);
      expect(activityTitle(spec).length, key).toBeGreaterThan(2);
    }
  });

  /*
    THE ALTERNATION IS LOAD-BEARING AND IS ASSERTED RATHER THAN TRUSTED. Each
    rotation runs game, drill, game, drill, and an evening takes two
    neighbors, which is what guarantees the check above over 182 evenings
    without anybody reading them. A list that stopped alternating would give
    some level a fortnight of drills and nothing would say so.
  */
  it("alternates a game and a drill in every rotation", () => {
    for (const [level, keys] of Object.entries(ROTATION)) {
      expect(keys.length % 2, level).toBe(0);
      keys.forEach((key, at) => {
        const want = at % 2 === 0 ? "game" : "drill";
        expect(ACTIVITIES[key].kind, `${level} ${key} at ${at}`).toBe(want);
      });
      expect(new Set(keys).size, `${level} repeats a round`).toBe(keys.length);
    }
  });

  /*
    A CONVERSATION ABOVE THE LESSONS ASKS FOR WORDS THE LADDER TAUGHT, OR SAYS
    WHICH IT DOES NOT. The catalog's conversations declare the units of A1 to
    B2, and those levels are lessons now, which taught their words by goal
    rather than unit by unit: of B1's and B2's units, most of the lemmas are
    taught by no evening. So `unitsThrough` crediting a finished lesson level's units is
    a claim about the conversation's setting rather than its every word, and
    what a learner is asked to say is checked here, word by word. The words a
    conversation dealt above the lessons asks for and the ladder has not
    taught by that evening are listed per scene: C1's own lessons, when C1
    moves, are where they get taught (docs/43-lessons.md §10), and the list is
    checked both ways, so a word taught later comes off it and a new gap fails.
  */
  it("asks for a word in a conversation a lesson offers only where the lessons taught it, or names it", () => {
    /*
      Measured when C1 became lessons, every offer walked against what the
      lessons had taught by the evening that offers it. The B1 and B2 offers
      were never word-checked before (their scenes were dealt on unit evenings
      until those levels moved), and these are what the walk found, per scene:
      words the scene asks the learner to say that no lesson by then teaches.
      Each is listed rather than waived, and the list is checked both ways, so
      a word a lesson comes to teach earlier comes off it and a new gap fails.
    */
    /*
      Twenty-three of the twenty-four are B1's and B2's, where the scene's
      words were taught by the unit evening the scene used to open on and the
      lesson that offers it now teaches by goal; C1's one is `mõjuv` in the
      book club, which C1's book lesson argues with and never hands over. A
      C1 offer that reaches the scene's words leaves the list: `kuulsin` asked
      `kuulduma`, which `c1-meedia` teaches before the rumor lesson offers it.
    */
    const KNOWN_UNTAUGHT: Readonly<Record<string, readonly string[]>> = {
      turul: ["hind", "maasikas", "pannkook", "porgand", "sibul", "tomat"], // offered by b1-03-some-or-all
      ootamine: ["kellaaeg", "paistma", "udu"], // offered by b1-04-waiting
      "abi-palumine": ["aeglaselt", "hoidma", "kandma", "tänama", "vabandama"], // offered by b1-05-do-it
      "uus-kolleeg": ["Prantsusmaa", "laulja", "näitleja"], // offered by b1-08-help
      trepikoda: ["üksi"], // offered by b1-10-about
      bussipeatus: ["maha", "peatus"], // offered by b1-13-reply
      toovestlus: ["ettevõte", "huvi", "leping", "nõustuma", "palk", "prantsuse", "vene"], // offered by b1-16-as
      pangas: ["allkiri", "dokument", "teenima"], // offered by b1-18-payday
      "uuri-remont": ["küte", "mööbel", "remont", "ruum", "üleeile"], // offered by b1-25-broken
      "tee-kusimine": ["vasak"], // offered by b1-30-was-built
      koosolek: ["kahtlema", "keeruline"], // offered by b1-33-decided
      lastevanemad: ["murelik"], // offered by b1-36-although
      soovitus: ["erinev", "halvem", "näitus", "sarnane"], // offered by b1-38-differently
      "tehniline-tugi": ["uuendama", "võrk", "ühendus"], // offered by b1-39-online
      ametiasutus: ["allkiri", "teenus", "varsti"], // offered by b1-44-office
      apteek: ["hommik", "ravim"], // offered by b1-45-lost
      "eksam-b1": ["elukoht", "ettevõte", "küla", "näitus", "pealinn", "politseinik", "vanalinn"], // offered by b1-49-end
      elamisluba: ["taotlus"], // offered by b2-31-tax-board
      tootukassa: ["tööpuudus"], // offered by b2-32-new-job
      kaebus: ["kaebama"], // offered by b2-35-complaint
      graafik: ["inflatsioon", "kriis", "pakkumine", "tööpuudus"], // offered by b2-43-figures
      "elanike-koosolek": ["hääletama", "kogukond"], // offered by b2-44-granted
      "eksam-b2": ["kokkuvõte"], // offered by b2-48-end
      raamatuklubi: ["mõjuv"], // offered by c1-43-book
    };
    const bare = (w: string) => w.toLocaleLowerCase("et").replace(/[.!?,]+/g, "").trim();
    let offered = 0;
    const found: Record<string, string[]> = {};
    for (const [lessonId, sceneId] of Object.entries(LESSON_SITUATIONS)) {
      offered += 1;
      const { programme, day } = lessonEvening(lessonId);
      const scene = conversationById(sceneId)!;
      const taught = new Set(taughtThrough(programme, day.index).map(bare));
      const untaught = [...new Set(scene.beats.flatMap((b) => askedLemmas(scene, b)))].filter((l) => !taught.has(bare(l))).sort();
      if (untaught.length) found[scene.id] = untaught;
    }
    expect(offered).toBe(SCENES.length);
    expect(found).toEqual(KNOWN_UNTAUGHT);
  });

  it("puts Sõnad on no rotation, since its word is dealt off the dictionary and marked from the date", () => {
    for (const [level, keys] of Object.entries(ROTATION)) expect(keys, level).not.toContain("sonad");
    expect(supportsRound("sonad", taughtBy(PROGRAMMES.at(-1)!, 999), "C1")).toBe(false);
  });

  /*
    A PAGE BUILT ON A CASE NAMES ITSELF AS ONE. The numerals page is the
    partitive and the time page is -l and -s, so the ladder's order (below)
    reads them after the case pages they rest on.
  */
  it("knows which topic pages are built on a case, and explains case pages from A2", () => {
    for (const name of ["numerals", "adjective-agreement", "time-expressions"]) expect(builtOnACase(name), name).toBe(true);
    expect(builtOnACase("present-tense")).toBe(false);
    expect(PROGRAMMES.some((p) => p.level === "A2" && p.days.some((d) => d.lesson && (d.cases?.length ?? 0) > 0))).toBe(true);
  });

  /*
    And a round the module opens can find out what the module has taught, off
    the address the step wrote (`scope.ts`), which is what lets Match,
    Listening, Tähed and the table narrow themselves to it. An A1 evening is a
    lesson, so what it has taught is the lessons through it.
  */
  it("tells a round what has been taught, off the step's own address", () => {
    const a1 = PROGRAMMES[0]!;
    const third = a1.days[2]!;
    const scope = moduleScopeFrom({ module: `${a1.id}~${third.id}~lesson~1~1~0` });
    expect(scope?.day.id).toBe(third.id);
    expect(scope?.lemmas).toContain("tere");
    expect(scope?.lemmas).toContain(a1.days[1]!.words[0]);
    expect(scope?.lemmas).not.toContain("õpetaja");
    expect(moduleScopeFrom({ module: "a1.1~nowhere~lesson~1~1~0" })).toBeNull();
    expect(moduleScopeFrom(undefined)).toBeNull();
    // No ending has been explained by then.
    expect(scope!.cases).toEqual([]);

    // Deep into A2, the cases explained so far and not the ones ahead.
    const a2 = PROGRAMMES.find((p) => p.level === "A2" && p.days.some((d) => d.lesson === "a2-14-meet-in-town"))!;
    const meet = a2.days.find((d) => d.lesson === "a2-14-meet-in-town")!;
    const later = moduleScopeFrom({ module: `${a2.id}~${meet.id}~lesson~1~1~0` })!;
    expect(later.cases).toContain("INESSIVE");
    expect(later.cases).not.toContain("TERMINATIVE");
    expect(later.lemmas).toContain("tere");
    expect(later.topics).toContain("imperative");
  });

  it("asks a part of a verb only once the lesson or page teaching it has been read", () => {
    const lessons = PROGRAMMES.filter((p) => p.level === "A1").flatMap((p) => p.days.map((d) => ({ programme: p, day: d })));
    // Before the lesson that explains the present, no person of a verb.
    const present = lessons.findIndex(({ day }) => day.topics?.includes("present-tense"));
    expect(present).toBeGreaterThan(0);
    const before = lessons[present - 1]!;
    const early = moduleScopeFrom({ module: `${before.programme.id}~${before.day.id}~lesson~1~1~0` })!;
    expect(early.topics).not.toContain("present-tense");
    expect(slotWithin(early, "IndPrSg3")).toBe(false);
    expect(slotWithin(early, "PRODUCTION")).toBe(true);
    expect(slotWithin(early, "INESSIVE")).toBe(false);
    // Once it has, the persons and not the past or the conditional.
    const at = lessons[present]!;
    const later = moduleScopeFrom({ module: `${at.programme.id}~${at.day.id}~lesson~1~1~0` })!;
    expect(later.topics).toContain("present-tense");
    expect(slotWithin(later, "IndPrSg3")).toBe(true);
    expect(slotWithin(later, "IndIpfSg3")).toBe(false);
    expect(slotWithin(later, "KndPrSg1")).toBe(false);
    // A code nobody listed fails closed, and a rule's page opens its forms.
    const a2 = PROGRAMMES.find((p) => p.level === "A2" && p.days.some((d) => d.lesson === "a2-15-lived"))!;
    const pastDay = a2.days.find((d) => d.lesson === "a2-15-lived")!;
    const a2scope = moduleScopeFrom({ module: `${a2.id}~${pastDay.id}~lesson~1~1~0` })!;
    expect(a2scope.topics).toContain("imperfect");
    expect(slotWithin(a2scope, "IndPrPs_")).toBe(true);
    expect(slotWithin(a2scope, "PtcPtPs")).toBe(false);
    expect(slotWithin(null, "IndIpfSg3")).toBe(true);
  });

  /*
    A FORM LEARNED VERB BY VERB IS NOT ASKED INSIDE THE MODULE, AT ANY LEVEL.
    Reported off `juhtuma → lihtminevik, ma` in a closing review: the past-tense
    page had been read, and nothing had ever shown `juhtusin`.
  */
  /*
    SHOWN BEFORE IT IS ASKED. The simple past and the polite imperative are
    learned verb by verb, so a card asks one inside the module only once an
    evening's forms step has shown that very verb. `juhtuma → lihtminevik, ma`
    reached an A1 learner who had never seen `juhtusin`.
  */
  it("asks a verb's past inside the module only once an evening has shown that verb's", () => {
    // Asked of C1's lessons, which are where the forms tables show verbs (`withLessonForms`).
    const c1 = PROGRAMMES.filter((p) => p.level === "C1");
    let checked = 0;
    for (const programme of c1) {
      for (const d of programme.days) {
        const scope = moduleScopeFrom({ module: `${programme.id}~${d.id}~lesson~1~1~0` })!;
        for (const lemma of scope.lemmas) {
          // The past is shown by a lesson or a forms table, the polite imperative by a forms table alone.
          for (const [slot, shownIn] of [["IndIpfSg1", scope.pastsShown], ["IndIpfSg3", scope.thirdPastsShown], ["ImpPrPl2", scope.formsShown]] as const) {
            if (!shownIn.includes(lemma)) expect(slotWithin(scope, slot, lemma), `${d.id} ${lemma} ${slot}`).toBe(false);
          }
          checked += 1;
        }
        // A caller that cannot say which verb gets a no, whatever was shown.
        expect(slotWithin(scope, "IndIpfSg1"), d.id).toBe(false);
      }
    }
    // Measured at 83,992 words asked about across C1's 49 lessons the day it became lessons.
    expect(checked).toBeGreaterThan(80_000);

    // The reported card, on every C1 evening: askable exactly where `juhtuma`'s past has been shown.
    for (const programme of c1) {
      for (const d of programme.days) {
        const scope = moduleScopeFrom({ module: `${programme.id}~${d.id}~lesson~1~1~0` })!;
        const card = {
          cardType: "CONJUGATION", targetCase: null, slot: null,
          front: "juhtuma \u2192 lihtminevik, ma", back: "juhtusin", lexeme: { lemma: "juhtuma" },
        };
        expect(cardWithin(scope, card, null), d.id).toBe(scope.pastsShown.includes("juhtuma"));
      }
    }

    const a1last = PROGRAMMES.filter((p) => p.level === "A1").at(-1)!;
    const scope = moduleScopeFrom({ module: `${a1last.id}~${a1last.days.at(-1)!.id}~lesson~1~1~0` })!;
    expect(scope.topics).toContain("imperative");
    expect(slotWithin(scope, "ImpPrSg2")).toBe(true);
    // No verb's past is shown verb by verb at A1: the lessons teach each past form by
    // name, and what they taught by name is what the module counts as shown.
    const a1 = LESSONS.filter((l) => l.level === "A1").map(lessonPastSlots);
    const a1First = [...new Set(a1.flatMap((s) => s.first))];
    const a1Third = [...new Set(a1.flatMap((s) => s.third))];
    expect(a1First).toEqual(expect.arrayContaining(["olema", "tegema", "käima"]));
    expect([...scope.pastsShown].sort()).toEqual(a1First.sort());
    expect([...scope.thirdPastsShown].sort()).toEqual(a1Third.sort());
    expect(scope.formsShown).toEqual([]);
  });

  /*
    A LESSON SHOWS A SLOT, NOT A TENSE. b1-03 teaches `tahtsin` and never
    `tahtis`, and the module was asking `tahtma → lihtminevik, ta` from b1-04
    on, because a verb on the list opened every past slot. The third person is
    stored per verb, so it opens only where a lesson taught that spelling or a
    forms step drew the verb's table. Both halves over the whole ladder.
  */
  it("asks a lesson verb's third-person past only where that very form was shown", () => {
    const thirdOf = new Map<string, string[]>();
    for (const w of HARVESTED) {
      if (w.pos !== "VERB" || thirdOf.has(w.lemma)) continue;
      thirdOf.set(w.lemma, w.extraForms.filter((f) => f.code.startsWith("IndIpfSg3")).map((f) => f.value));
    }
    let shownAsked = 0, unshownRefused = 0;
    for (const programme of PROGRAMMES) {
      for (const d of programme.days) {
        const scope = scopeFor(programme, d);
        if (!scope.topics.includes("imperfect")) continue;
        for (const v of scope.pastsShown) {
          // The I form, and the persons built off it, are shown with it.
          expect(slotWithin(scope, "IndIpfSg1", v), `${d.id} ${v} I form`).toBe(true);
          expect(slotWithin(scope, "IndIpfPl1", v), `${d.id} ${v} we form`).toBe(true);
          const third = scope.thirdPastsShown.includes(v);
          expect(slotWithin(scope, "IndIpfSg3", v), `${d.id} ${v} third person`).toBe(third);
          if (third) shownAsked += 1; else unshownRefused += 1;
        }
        for (const v of scope.thirdPastsShown) expect(slotWithin(scope, "IndIpfSg3", v), `${d.id} ${v}`).toBe(true);
      }
    }
    expect(shownAsked).toBeGreaterThan(100);
    expect(unshownRefused).toBeGreaterThan(100);
    // And a lesson's own list holds the third person only where it taught that spelling.
    // And the I form only where it taught the I form or a person built off it, so `oli` alone opens nothing but `oli`.
    const firstOf = new Map(HARVESTED.filter((w) => w.pos === "VERB" && w.parts.PAST_1SG).map((w) => [w.lemma, w.parts.PAST_1SG!]));
    let thirdOnly = 0;
    for (const lesson of LESSONS) {
      const { first, third } = lessonPastSlots(lesson);
      for (const v of third) {
        const taught = lesson.teaches.filter((t) => t.kind === "form" && t.of === v).map((t) => t.et);
        expect(taught.some((et) => (thirdOf.get(v) ?? []).includes(et)), `${lesson.id} ${v}`).toBe(true);
        if (!first.includes(v)) thirdOnly += 1;
      }
      for (const v of first) {
        const past1 = firstOf.get(v) ?? "";
        const family = new Set([past1, ...pastPersons(past1).map((p) => p.value)]);
        const taught = lesson.teaches.flatMap((t) => (t.kind === "form" && t.of === v ? [t] : []));
        expect(taught.some((t) => family.has(t.et) || (t.past && !(thirdOf.get(v) ?? []).includes(t.et))), `${lesson.id} ${v}`).toBe(true);
      }
    }
    expect(thirdOnly).toBeGreaterThan(0);
    // The reported verb: `tahtsin` is taught and `tahtis` is not, until a forms step shows it.
    const lesson = LESSONS.find((l) => lessonPastSlots(l).first.includes("tahtma"))!;
    expect(lessonPastSlots(lesson).third).not.toContain("tahtma");
    const programme = PROGRAMMES.find((p) => p.days.some((d) => d.lesson === lesson.id))!;
    const day = programme.days.find((d) => d.lesson === lesson.id)!;
    const next = programme.days.find((d) => d.index === day.index + 1)!;
    const scope = scopeFor(programme, next);
    expect(slotWithin(scope, "IndIpfSg1", "tahtma")).toBe(true);
    expect(slotWithin(scope, "IndIpfSg3", "tahtma")).toBe(false);
    const card = {
      cardType: "CONJUGATION", targetCase: null, slot: "IndIpfSg3",
      front: "tahtma → lihtminevik, ta", back: "tahtis", lexeme: { lemma: "tahtma" },
    };
    expect(cardWithin(scope, card, null)).toBe(false);
    const last = PROGRAMMES.at(-1)!;
    expect(slotWithin(scopeFor(last, last.days.at(-1)!), "IndIpfSg3", "tahtma")).toBe(true);
  });

  it("shows every taught verb's past, a handful an evening, after the page about the past", () => {
    const withPast = new Set(HARVESTED.filter((w) => w.pos === "VERB" && w.parts.PAST_1SG).map((w) => w.lemma));
    const kindOf = new Map(LESSONS.map((l) => [l.id, l]));
    // The C1 lessons that show a table: every one but a part's last (`withLessonForms`).
    const eligible = LESSON_DAYS.filter(({ day }) => day.level === "C1" && kindOf.get(day.lesson!)?.kind !== "partEnd");
    const lastTable = eligible.at(-1)!.day;
    let readPast = false;
    let imperativeRead = false;
    let tables = 0;
    const shown = new Set<string>();
    const taughtBefore = new Set<string>();
    for (const { day, programme } of LESSON_DAYS) {
      if (day.topics?.includes("imperative")) imperativeRead = true;
      if (day.topics?.includes("imperfect")) readPast = true;
      const forms = day.forms ?? [];
      if (forms.length > 0) {
        tables += 1;
        // Only on a C1 lesson that is not a part's last, after both pages.
        expect(day.level, day.id).toBe("C1");
        expect(kindOf.get(day.lesson!)?.kind, day.id).not.toBe("partEnd");
        expect(readPast, day.id).toBe(true);
        expect(imperativeRead, day.id).toBe(true);
        // Twelve, except on the last lesson that shows one, which shows whatever is still waiting.
        if (day !== lastTable) expect(forms.length, day.id).toBeLessThanOrEqual(formsPerEvening(programme.level));
        // And the evening says the two minutes the table takes, its one step with it.
        const spec = kindOf.get(day.lesson!)!;
        expect(day.minutes, day.id).toBe(lessonMinutes(spec, forms.length));
        expect(day.minutes, day.id).toBe(lessonMinutes(spec) + LESSON_FORMS_MINUTES);
        expect(day.steps[0]!.minutes, day.id).toBe(day.minutes);
        for (const v of forms) {
          expect(withPast.has(v), `${day.id} ${v}`).toBe(true);
          expect(shown.has(v), `${day.id} ${v} shown twice`).toBe(false);
          // A table shows a verb some lesson has taught, never one ahead of the learner.
          expect(taughtBefore.has(v) || day.words.includes(v), `${day.id} ${v} not yet taught`).toBe(true);
          shown.add(v);
        }
      }
      for (const w of day.words) taughtBefore.add(w);
    }
    // Measured at 30 forms tables the day C1 became lessons, twelve verbs a lesson.
    expect(tables).toBeGreaterThanOrEqual(30);
    // Every verb with a stored past the lessons teach is shown somewhere, except
    // one first taught on a part's last lesson after the last table (C1's party):
    // there is no later lesson for it to be shown on.
    const after = new Set(LESSON_DAYS.slice(LESSON_DAYS.findIndex(({ day }) => day === lastTable) + 1).flatMap(({ day }) => day.words));
    const before = new Set(LESSON_DAYS.slice(0, LESSON_DAYS.findIndex(({ day }) => day === lastTable) + 1).flatMap(({ day }) => day.words));
    const missing = [...taughtBefore].filter((v) => withPast.has(v) && !shown.has(v));
    expect(missing.filter((v) => !(after.has(v) && !before.has(v)))).toEqual([]);
    const taughtPasts = new Set(LESSONS.flatMap(lessonPasts));
    expect(taughtPasts.size).toBeGreaterThan(40);
    // And the module counts what the lessons showed as shown, so a later lesson may ask it:
    // from the end of B2 to the last evening of the ladder, every one of them is askable.
    const b2End = PROGRAMMES.filter((p) => p.level === "B2").at(-1)!;
    const last = PROGRAMMES.at(-1)!;
    for (const [programme, day] of [[b2End, b2End.days.at(-1)!], [last, last.days.at(-1)!]] as const) {
      const scope = scopeFor(programme, day);
      for (const lesson of LESSONS) {
        if (lesson.level === "C1") continue;
        const { first, third } = lessonPastSlots(lesson);
        for (const v of first) {
          expect(scope.pastsShown.includes(v), `${programme.id} ${v}`).toBe(true);
          expect(slotWithin(scope, "IndIpfSg1", v), `${programme.id} ${v}`).toBe(true);
        }
        for (const v of third) expect(slotWithin(scope, "IndIpfSg3", v), `${programme.id} ${v} third`).toBe(true);
      }
    }
    // A lesson taught the past and nothing else, so the polite imperative of
    // those verbs (`tehke`, `lugege`) waits for the C1 table that shows it:
    // not askable when B2 ends, and shown by the last evening.
    const endScope = scopeFor(b2End, b2End.days.at(-1)!);
    const lastScope = scopeFor(last, last.days.at(-1)!);
    for (const v of [...taughtPasts].filter((x) => !(after.has(x) && !before.has(x)))) {
      if (LESSONS.filter((l) => l.level !== "C1").some((l) => lessonPasts(l).includes(v))) {
        expect(slotWithin(endScope, "ImpPrPl", v), `${b2End.id} ${v} polite imperative`).toBe(false);
      }
      expect(lastScope.formsShown.includes(v), `${v}: no forms table shows its polite imperative`).toBe(true);
      expect(slotWithin(lastScope, "ImpPrPl", v), `${last.id} ${v} polite imperative`).toBe(true);
    }
  });

  /*
    A PAGE IS READ ONLY ONCE THE PAGE IT STANDS ON HAS BEEN. Every oblique case
    is the genitive stem with an ending glued on, so a learner told `toas` is
    `toa` plus `s` before being told what `toa` is has been handed a rule with
    a hole under it; A2 read eight case pages before the genitive's. The table
    is the reference's own dependencies and nothing finer: what a page
    explains is built out of what an earlier page explained.
  */
  it("reads a grammar page only after the pages it is built on, over the whole ladder", () => {
    const CASE_FREE = new Set(["NOMINATIVE", "GENITIVE", "PARTITIVE"]);
    const NEEDS_FIRST = PAGE_NEEDS;
    // The table names real pages, on both sides of it.
    for (const [page, needs] of Object.entries(PAGE_NEEDS)) {
      for (const name of [page, ...needs]) {
        expect(grammarTopic(name) || CASES.some((c) => c.key === name.toUpperCase()), name).toBeTruthy();
      }
    }
    // Every page the table names as a need is one some lesson explains.
    const read = new Set<string>(PROGRAMMES.flatMap((p) => p.days).filter((d) => d.lesson)
      .flatMap((d) => [...(d.topics ?? []), ...(d.cases ?? []).map((c) => c.toLowerCase())]));
    for (const need of new Set(Object.values(NEEDS_FIRST).flat())) {
      expect(read.has(need) || CASE_FREE.has(need.toUpperCase()), need).toBe(true);
    }
    // And the genitive is the first case A2 explains, before any ending goes on it.
    const a2 = PROGRAMMES.filter((p) => p.level === "A2").flatMap((p) => p.days);
    const firstCase = a2.find((d) => (d.cases?.length ?? 0) > 0)!;
    expect(firstCase.cases).toEqual(["GENITIVE"]);
  });

  it("does not read the B1 object rule at A2 either", () => {
    for (const { day } of LESSON_DAYS) {
      if (day.level === "A2") expect(day.topics ?? [], day.id).not.toContain("object");
    }
    // B1 is where the object rule is explained.
    expect(PROGRAMMES.some((p) => p.level === "B1" && p.days.some((d) => d.topics?.includes("object")))).toBe(true);
  });

  /*
    TÄHED IS DEALT ONLY ONCE THERE ARE ENOUGH WORDS TO BE A GAME. A round is
    eight words with an order to find; the A1 lessons hand over far more than
    that, so A2 deals it from its rotation on its own turns.
  */
  it("deals Tähed once four words with an order to find have been taught", () => {
    expect(supportsRound("letters", NO_TAUGHT, "A2")).toBe(false);
    expect(supportsRound("letters", { ...NO_TAUGHT, spellable: WORDS_FOR_LETTERS }, "A2")).toBe(true);
    expect(ROTATION.A2).toContain("letters");
  });

  it("stands in with a round the evening before did not deal, where the ledger allows one", () => {
    // Nothing but Match and Tähed supported: A2's third pair opens on the
    // sentence builder, which needs a sentence of taught words, so its game
    // is stood in for.
    const taught = { ...NO_TAUGHT, spellable: WORDS_FOR_LETTERS };
    // Walked from the builder, the next supported game along is Match.
    expect(rounds("A2", 2, false, taught, false)[0]).toBe("match");
    // And where the evening before dealt Match, it takes Tähed instead.
    expect(rounds("A2", 2, false, taught, false, ["match", "listening"])[0]).toBe("letters");
  });

  it("deals the table on the evenings a unit of verbs pins it, and not on the others", () => {
    const taught = { ...NO_TAUGHT, verbs: true, spellable: WORDS_FOR_LETTERS };
    // Pair two of A2 is Tähed and a drill the ledger cannot carry yet, stood in for by Listening.
    expect(rounds("A2", 1, false, taught, false)).toEqual(["letters", "listening"]);
    expect(rounds("A2", 1, false, taught, true)).toEqual(["letters", "listening"]);
    expect(rounds("A2", 1, true, taught, true)).toEqual(["letters", "conjugation"]);
  });

  /*
    A PAGE IS READ ONCE. The greetings read the politeness page four evenings
    running and the impersonal was read nineteen times between B1 and C1,
    which is a step a learner skips past and then stops trusting.
  */
  it("plans a unit's pages once each in its author's order, and every page a unit declares is read by a lesson", () => {
    // The pages a unit declares are its plan, in its order, each once.
    const keha = unitById("keha-ja-tervis")!;
    expect(readingPlan(keha, new Set())).toEqual(["partitive", "adessive", "gradation"]);
    expect(readingPlan(keha, new Set(["partitive"]))).toEqual(["adessive", "gradation"]);
    /*
      And every page a unit declares above A1 is explained by a lesson, which
      since C1 became lessons means every unit of the course: a page a C1 unit
      declared and no lesson read would be a page the course stopped teaching
      when the units went. C1's lessons read it through a pattern
      (`PATTERN_PAGE`) or by name (`LESSON_PAGES`).
    */
    const everRead = new Set(PROGRAMMES.flatMap((p) => p.days).filter((d) => d.lesson)
      .flatMap((d) => [...(d.topics ?? []), ...(d.cases ?? []).map((c) => c.toLowerCase())]));
    for (const unit of SYLLABUS) {
      if (unit.level === "A1") continue;
      for (const name of unit.grammar) {
        if (!grammarTopic(name) && !CASES.some((c) => c.key === name.toUpperCase())) continue;
        expect(everRead.has(name), `${unit.id} declares ${name} and no lesson reads it`).toBe(true);
      }
    }
  });

  it("holds a verb card in the closing review to the page teaching its part", () => {
    const past = { cardType: "CONJUGATION", targetCase: null, front: "Ta ____ eile.", back: "luges", slot: "IndIpfSg3" };
    const present = { ...past, slot: "IndPrSg3" };
    const spellings = new Set(["ta", "eile"]);
    // The would form waits for the A2 lesson that explains it.
    const a2 = PROGRAMMES.filter((p) => p.level === "A2");
    const at = (lessonId: string) => {
      const programme = a2.find((p) => p.days.some((d) => d.lesson === lessonId))!;
      const day = programme.days.find((d) => d.lesson === lessonId)!;
      return moduleScopeFrom({ module: `${programme.id}~${day.id}~lesson~1~1~0` })!;
    };
    const before = at("a2-34-ticket");
    expect(before.topics).not.toContain("conditional");
    expect(cardWithin(before, { ...past, slot: "KndPrSg1" }, spellings)).toBe(false);
    expect(cardWithin(at("a2-35-would"), { ...past, slot: "KndPrSg1" }, spellings)).toBe(true);
    // And a verb's past is learned verb by verb: one the A1 lessons taught by name
    // (`lugesin`) is askable from C1's first lesson, and one nobody has shown yet waits.
    const c1 = PROGRAMMES.find((p) => p.id === "c1.1")!;
    const scope = moduleScopeFrom({ module: `${c1.id}~${c1.days[0]!.id}~lesson~1~1~0` })!;
    expect(scope.pastsShown).toContain("lugema");
    expect(cardWithin(scope, { ...past, lexeme: { lemma: "lugema" } }, spellings)).toBe(true);
    expect(cardWithin(scope, present, spellings)).toBe(true);
    const byLessons = new Set(LESSONS.flatMap(lessonPasts));
    const later = PROGRAMMES.filter((p) => p.level === "C1").flatMap((p) => p.days).filter((d) => d !== c1.days[0])
      .flatMap((d) => d.forms ?? []).find((v) => !byLessons.has(v))!;
    expect(later).toBeDefined();
    expect(scope.pastsShown).not.toContain(later);
    expect(slotWithin(scope, "IndIpfSg3", later)).toBe(false);
  });

  it("reads the part off the front of a verb card built before Card.slot", () => {
    const c1 = PROGRAMMES.find((p) => p.id === "c1.1")!;
    const scope = moduleScopeFrom({ module: `${c1.id}~${c1.days[0]!.id}~lesson~1~1~0` })!;
    const old = { cardType: "CONJUGATION", targetCase: null, slot: null, back: "" };
    expect(cardWithin(scope, { ...old, front: "lugema \u2192 lihtminevik, ma" }, null)).toBe(false);
    expect(cardWithin(scope, { ...old, front: "lugema \u2192 olevik, ta" }, null)).toBe(true);
  });

  it("conjugates a unit of verbs, and not a grammar unit that happens to hold verbs", () => {
    // A unit of verbs that declares the table is pinned to it (`rounds`).
    expect(rounds("B1", 0, true)[1]).toBe("conjugation");
    // And one that is not keeps the rotation's own drill.
    expect(rounds("B1", 0, false)[1]).not.toBe("conjugation");
  });

  it("gives every step in a day its own id", () => {
    for (const { day } of LESSON_DAYS) {
      const ids = day.steps.map((s) => s.id);
      expect(new Set(ids).size, day.id).toBe(ids.length);
    }
  });

  /*
    AND EVERY DAY HAS SOMETHING THE LOG CANNOT PROVE, which the reading leans
    on twice. It is what makes a tick the pointer, since a day nobody ticked
    anything on is a day nobody started; and it is why the reading asks the log
    about two days and never three, because the day after the one it advances
    to has no ticks and so can never complete unasked. A day of nothing but a
    meet and a review would finish itself the moment its words were met
    somewhere else and walk the learner through the program.
  */
  it("gives every evening a step only the learner can say they did", () => {
    for (const { day } of LESSON_DAYS) {
      expect(day.steps.some((s) => !s.derived), day.id).toBe(true);
    }
  });
});

describe("the ladder", () => {
  it("runs from A1 to C1 with no gap", () => {
    // The lessons' parts, A1 to C1, and no part built from units.
    expect(PROGRAMMES.length).toBe(LESSON_PARTS.length + PARTS.length);
    expect(PARTS.length).toBe(0);
    expect(PROGRAMMES.slice(0, LESSON_PARTS.length).every((p) => p.days.every((d) => d.lesson))).toBe(true);
    const levels = [...new Set(PROGRAMMES.map((p) => p.level))];
    expect(levels).toEqual(["A1", "A2", "B1", "B2", "C1"]);
    for (const level of levels) {
      expect(PROGRAMMES.filter((p) => p.level === level).length, level).toBeGreaterThan(1);
    }
  });

  it("gives every part an id nothing else has, and a real evening's worth of days", () => {
    const ids = PROGRAMMES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const programme of PROGRAMMES) {
      // A part of the lessons is as long as its lessons; the last of A1 is five.
      expect(programme.days.length, programme.id).toBeGreaterThanOrEqual(5);
      expect(programme.days.length, programme.id).toBeLessThanOrEqual(26);
      const dayIds = programme.days.map((d) => d.id);
      expect(new Set(dayIds).size, programme.id).toBe(dayIds.length);
      programme.days.forEach((d, at) => expect(d.index, d.id).toBe(at + 1));
    }
  });

  it("points each part at the next one, and stops at the end", () => {
    for (let at = 0; at < PROGRAMMES.length - 1; at += 1) {
      expect(programmeAfter(PROGRAMMES[at]!)?.id).toBe(PROGRAMMES[at + 1]!.id);
    }
    expect(programmeAfter(PROGRAMMES.at(-1)!)).toBeUndefined();
  });

  /*
    The evening does not get longer further up the ladder, it gets denser: a
    word costs less to meet once you have the stem, the case and the register
    already, so the same fifteen minutes carries more of them.
  */
  it("carries more words a night as the level rises, in the same fifteen minutes", () => {
    const levels = ["A1", "A2", "B1", "B2", "C1"];
    const costs = levels.map((l) => MINUTES_PER_WORD[l]!);
    for (let at = 1; at < costs.length; at += 1) {
      expect(costs[at]!, levels[at]).toBeLessThan(costs[at - 1]!);
    }
    const sizes = levels.map((l) => ordinaryWords(l));
    expect(sizes.at(-1)!).toBeGreaterThan(sizes[0]!);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_DAY_WORDS);
  });
});

describe("where somebody is", () => {
  // A part of the lessons, whose evenings are one step each, the lesson.
  const programme = PROGRAMMES[0]!;
  const allOf = (index: number) => new Set(programme.days[index]!.steps.map((s) => s.id));

  it("starts on day one with nothing done", () => {
    const standing = programmeStanding(programme, new Map());
    expect(standing.current?.day.index).toBe(1);
    expect(standing.daysDone).toBe(0);
    expect(standing.finished).toBe(false);
    expect(standing.current?.next?.id).toBe(LESSON_STEP);
  });

  it("moves on once every step of a day is finished", () => {
    const done = new Map([[programme.days[0]!.id, allOf(0)]]);
    const standing = programmeStanding(programme, done);
    expect(standing.daysDone).toBe(1);
    expect(standing.current?.day.index).toBe(2);
    expect(standing.upcoming?.index).toBe(3);
  });

  it("finishes", () => {
    const done = new Map(programme.days.map((d, i) => [d.id, allOf(i)] as const));
    const standing = programmeStanding(programme, done);
    expect(standing.finished).toBe(true);
    expect(standing.current).toBeNull();
    expect(standing.upcoming).toBeNull();
    expect(standing.daysDone).toBe(programme.days.length);
  });

  it("counts what is left in minutes rather than in steps", () => {
    const first = programme.days[0]!;
    const untouched = dayStanding(first, new Set());
    expect(untouched.minutesLeft).toBe(first.minutes);
    expect(untouched.pct).toBe(0);
    const done = dayStanding(first, new Set([LESSON_STEP]));
    expect(done.minutesLeft).toBe(0);
    expect(done.pct).toBe(100);
  });

  it("knows which words have been taught by a given day", () => {
    expect(wordsThrough(programme, 0)).toEqual([]);
    expect(wordsThrough(programme, 1)).toEqual([...programme.days[0]!.words]);
    // A lesson may hand over a word an earlier lesson of the part already taught, and it is one word.
    expect(wordsThrough(programme, programme.days.length))
      .toHaveLength(new Set(programme.days.flatMap((d) => d.words)).size);
  });

  it("credits every part before this one, not only the part in hand", () => {
    /*
      A `Programme` is one part of seventeen, so `wordsThrough` answers about a
      fortnight and `taughtThrough` about the ladder. Drawn against the part,
      the readability rule credited a learner on their first evening of a1.5
      with eight words rather than 394 and refused nearly every sentence they
      could read, so the difference between the two is the whole test.
    */
    const later = PROGRAMMES.find((p) => p.id === "a1.5")!;
    const earlier = PROGRAMMES.slice(0, PROGRAMMES.indexOf(later));
    const before = new Set(earlier.flatMap((p) => p.days.flatMap((d) => d.words)));

    const firstEvening = taughtThrough(later, 1);
    expect(wordsThrough(later, 1)).toEqual([...later.days[0]!.words]);
    expect(firstEvening.length).toBeGreaterThan(before.size);
    for (const word of before) expect(firstEvening).toContain(word);
    for (const word of later.days[0]!.words) expect(firstEvening).toContain(word);
    expect(new Set(firstEvening).size).toBe(firstEvening.length);

    // The first part of the ladder has nothing ahead of it, so the two agree.
    expect(taughtThrough(PROGRAMMES[0]!, 2)).toEqual(wordsThrough(PROGRAMMES[0]!, 2));
  });

});

/*
  FOUR GOVERNED VERBS MEANS FOUR VERBS. Words are taught again across parts on
  purpose, and the ledger counted a governed verb each time, so one verb met
  four times opened the government round the same as four verbs would.
*/
describe("the ledger counts a word taught twice once", () => {
  it("does not open the government round on one verb taught four times", () => {
    const verb = SYLLABUS.flatMap((u) => u.vocabulary).find((v) => v.pos === "VERB"
      && taughtFrom([v], [{ grammar: "government" }]).governed === 1);
    expect(verb, "no course verb carries a recorded government").toBeDefined();
    const taught = taughtFrom([verb!, verb!, verb!, verb!], [{ grammar: "government" }]);
    expect(taught.governed).toBe(1);
    expect(supportsRound("government", taught)).toBe(false);
  });
});

describe("a forms evening does not use up a drill's turn", () => {
  /*
    The forms step takes the drill's place every other evening from A2 up,
    and B2's rotation paired `write` with Tähed and the government round
    with the sentence builder, and a drill sitting on the forms evening's turn
    came up too rarely: the writing round three times in B2's 45 evenings.
  */
  it("takes the drill from its own place on the rotation", () => {
    const [, drillOfPair1] = rounds("B2", 1, false);
    expect(rounds("B2", 0, false, undefined, false, [], 1)[1]).toBe(drillOfPair1);
  });

});

