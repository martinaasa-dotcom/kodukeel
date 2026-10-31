import { describe, expect, it } from "vitest";
import { LESSON_SCENES, isPreviewScene, sceneForLesson } from "./lessonScenes";
import { SCENES, sceneById } from "./catalogue";
import { BANK } from "./bank";
import { pickSpecsFor, literalOf } from "./picks";
import { planRun } from "./run";
import { propBySlot, type RoleCard } from "./props";
import { isSpokenEstonian } from "./line";
import { caseKeyFor, type Lexicon } from "./lexicon";
import { leafNeeds, type BeatSpec, type SceneSpec } from "./types";
import { acceptFromRows, contextFromRows, sceneLemmas, type Row, type StoredDraw } from "@/lib/progress/scene";
import { LESSONS as COURSE_LESSONS, ledgerThrough, uncovered, NAMES, wordsOf } from "@/lib/course/lessons";
import { PREVIEW_LESSONS } from "@/lib/course/lessons/preview";

/* The course and the lessons in preview after it, since a part in preview has its own conversation too. */
const LESSONS = [...COURSE_LESSONS, ...PREVIEW_LESSONS];
const lessonById = (id: string) => LESSONS.find((l) => l.id === id) ?? null;
import type { Level } from "@/lib/collections/syllabus";
import { shippedDictionary } from "../../scripts/lib/dictionary";
import { playScripted, type Event, type Floor } from "../../scripts/lib/keylessPlay";

/**
 * THE LESSONS' OWN CONVERSATIONS, PLAYED.
 *
 * A lesson scene says only what the lessons have taught by its lesson, and
 * the one way to know what a scene says is to have the conversation: the
 * reply is built from the bank, the card, the scene's own `says`, and the
 * app's fixed reactions, and any of the four can reach for a word. So each
 * scene is played keyless through the app's own marker and reply
 * (`playScripted`, the same loop `npm run sweep:fallback` drives) by a few
 * kinds of learner, the ones a beginner actually is, and every Estonian word
 * the other side says is read against the lesson's ledger.
 */

const ROWS: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
}));

/** One option of each requirement in its right form, which is what a learner doing as asked says. */
function rightAnswer(scene: SceneSpec, beat: BeatSpec, card: RoleCard | null, lexicon: Lexicon): string {
  const leaves = leafNeeds(beat.needs).map(({ need }) => need);
  const value = (slot: string) => (card ? propBySlot(card, slot)?.value : undefined) ?? "";
  // A question the beat requires, rather than one it merely accepts beside a word.
  if (beat.needs.some((n) => n.kind === "question")) {
    const datum = leaves.find((n) => n.kind === "datum");
    if (datum && datum.kind === "datum") return `Vabandust, kus on ${value(datum.slot)}?`;
    if (beat.topic.includes("maksma")) return "Kui palju see maksab?";
    if (beat.topic.includes("kaugel")) return "Kas see on kaugel?";
    return "Kus?";
  }
  const first = leaves[0];
  if (!first) return "Jah.";
  if (first.kind === "lemma") return first.oneOf[0]!;
  if (first.kind === "datum") return value(first.slot);
  if (first.kind === "case") return lexicon.caseForm.get(caseKeyFor(first.lemma, first.grammCase)) ?? first.lemma;
  return scene.register === "teie" ? "Jah." : "Jah.";
}

type Learner = (floor: Floor, answer: string, first: boolean) => string;

/** A beginner, several ways: as asked, lost, in English, off the point, unsure, and asking things. */
const LEARNERS: Record<string, Learner> = {
  plain: (_f, answer) => answer,
  lost: (_f, answer, first) => (first ? "Ma ei saa aru." : answer),
  english: (_f, answer, first) => (first ? "Sorry, do you speak English?" : answer),
  offtopic: (_f, answer, first) => (first ? "Mulle meeldib kohv." : answer),
  unsure: (_f, answer, first) => (first ? "Ma ei tea." : answer),
  asker: (f, answer) => `${answer.replace(/[.?!]$/, "")}. ${["Kuidas läheb?", "Kui palju see maksab?", "Mis kell on?"][f.n % 3]}`,
  slower: (_f, answer, first) => (first ? "Aeglasemalt, palun." : answer),
};

function levelOf(scene: SceneSpec): Level {
  // Every lesson scene names its lesson (the first test asserts it), so there is no default to fall to.
  const level = lessonById(scene.lesson ?? "")?.level;
  if (!level) throw new Error(`${scene.id}: names no lesson, so its level is unknown`);
  return level;
}

async function play(scene: SceneSpec, seed: string, learner: Learner): Promise<{ events: Event[]; card: RoleCard }> {
  const lemmas = sceneLemmas(scene);
  // Played at its own lesson's level, so an A2 conversation is pitched the way an A2 learner meets it.
  const level = levelOf(scene);
  const base = contextFromRows(scene, ROWS.filter((r) => lemmas.has(r.lemma)), level);
  const context = { ...base, marker: { ...base.marker, ...acceptFromRows(scene, ROWS) } };
  const run = planRun(scene, seed, level, "textbook");
  const draw: StoredDraw = { persona: run.persona.id, card: run.card, curveballs: [], lines: "scripted", patience: run.patience };
  const firsts = new Set<string>();
  const events = await playScripted({
    scene, context, draw, runSeed: run.seed, level, maxTurns: 30,
    next: (floor) => {
      const first = !firsts.has(floor.target.id);
      firsts.add(floor.target.id);
      return learner(floor, rightAnswer(scene, floor.target, floor.card, context.lexicon), first);
    },
  });
  return { events, card: run.card };
}

describe("the lessons' own conversations", () => {
  it("exist, each for a lesson that has a role-play, and are in no listing", () => {
    expect(LESSON_SCENES.length).toBeGreaterThan(0);
    const listed = new Set(SCENES.map((s) => s.id));
    for (const scene of LESSON_SCENES) {
      const lesson = LESSONS.find((l) => l.id === scene.lesson);
      expect(lesson, `${scene.id} names ${scene.lesson}`).toBeDefined();
      expect(lesson!.roleplay, `${scene.id}: lesson ${lesson!.id} has no role-play to play`).toBeDefined();
      expect(listed.has(scene.id), `${scene.id} is in the situations listing`).toBe(false);
      expect(sceneById(scene.id)).toBe(scene);
      expect(sceneForLesson(scene.lesson!)).toBe(scene);
    }
    expect(new Set(LESSON_SCENES.map((s) => s.id)).size).toBe(LESSON_SCENES.length);
    expect(new Set(LESSON_SCENES.map((s) => s.lesson)).size).toBe(LESSON_SCENES.length);
  });

  it("are listed in the order the course teaches their lessons", () => {
    const at = LESSON_SCENES.map((s) => LESSONS.findIndex((l) => l.id === s.lesson));
    expect(at.length).toBeGreaterThan(1);
    expect(at, LESSON_SCENES.map((s) => s.id).join(", ")).toEqual([...at].sort((a, b) => a - b));
  });

  it("name only words their own lesson has taught, in their beats and on their cards", () => {
    for (const scene of LESSON_SCENES) {
      const list = new Set(scene.lemmas);
      for (const beat of scene.beats) {
        const named = [
          ...beat.topic,
          ...(beat.says ?? []).flatMap((part) => ("lemma" in part ? [part.lemma] : [])),
          ...leafNeeds(beat.needs).flatMap(({ need }) =>
            need.kind === "lemma" ? need.oneOf : need.kind === "case" ? [need.lemma] : []),
        ];
        for (const lemma of named) expect(list.has(lemma), `${scene.id}/${beat.id} names ${lemma}`).toBe(true);
      }
      for (const prop of scene.props) {
        if (prop.kind !== "word") continue;
        for (const lemma of prop.oneOf) expect(list.has(lemma), `${scene.id} deals ${lemma}`).toBe(true);
      }
    }
  });

  /*
    A word the card deals is a word the marker has to recognize, and it can
    only recognize an entry the dictionary holds. `Ukraina` is taught by the
    lessons as a spelling and has no entry, so a card that dealt it asked the
    learner to say something no answer could ever meet.
  */
  it("deal only words the dictionary holds an entry for, and require none it does not", () => {
    const entries = new Set(ROWS.map((r) => r.lemma));
    for (const scene of LESSON_SCENES) {
      // `normaalselt`, `vasakule` and `paremale` are taught and have no entry, so a beat requiring them could never be met by them.
      for (const beat of scene.beats) {
        for (const { need } of leafNeeds(beat.needs)) {
          const named = need.kind === "lemma" ? need.oneOf : need.kind === "case" ? [need.lemma] : [];
          for (const lemma of named) expect(entries.has(lemma), `${scene.id}/${beat.id} requires ${lemma}, which has no entry`).toBe(true);
        }
      }
      for (const prop of scene.props) {
        if (prop.kind !== "word") continue;
        for (const lemma of prop.oneOf) expect(entries.has(lemma), `${scene.id} deals ${lemma}, which has no entry`).toBe(true);
      }
    }
  });

  /*
    What the learner may pick to say is held to the lesson as firmly as what
    the other side says: a pick is a sentence the learner reads, and a word in
    it nobody has taught is the fault the lessons exist to stop.
  */
  it("offer picks made only of words the lesson has taught", () => {
    for (const scene of LESSON_SCENES) {
      const ledger = ledgerThrough(LESSONS, scene.lesson!)!;
      for (const beat of scene.beats) {
        for (const spec of pickSpecsFor(scene, beat.id)) {
          const literal = literalOf(spec.et);
          const names = new Set<string>(NAMES);
          for (const [at, w] of wordsOf(literal).entries()) if (at > 0 && /^\p{Lu}/u.test(w.raw)) names.add(w.raw);
          expect(uncovered(literal, ledger, names), `${scene.id}/${beat.id} offers "${spec.et}"`).toEqual([]);
        }
      }
    }
  });

  it("bank every beat a line, or say it off the card", () => {
    for (const scene of LESSON_SCENES) {
      for (const beat of scene.beats) {
        const banked = BANK.some((row) => row.scene === scene.id && (row.beat === beat.id || row.beat === `answer:${beat.id}`));
        expect(banked || Boolean(beat.says), `${scene.id}/${beat.id} has nothing to say`).toBe(true);
      }
    }
  });

  it("refuse, at the gate, a line reaching past the lesson", () => {
    const scene = sceneById("a1-kohvik")!;
    const lemmas = sceneLemmas(scene);
    const context = contextFromRows(scene, ROWS.filter((r) => lemmas.has(r.lemma)), "A1");
    // Made to fail on the real rule: a word the part does not teach, in an otherwise ordinary line.
    expect(context.gate.untaught?.("Tere! Mida soovite?")).toEqual([]);
    expect(context.gate.untaught?.("Tere! Mida te täna sooviksite?")).toContain("sooviksite");
  });

  for (const scene of LESSON_SCENES) {
    const ledger = ledgerThrough(LESSONS, scene.lesson!)!;
    for (const seed of ["one", "two", "three"]) {
      for (const [name, learner] of Object.entries(LEARNERS)) {
        it(`${scene.id}, played by a learner who is ${name} (${seed}), says only what lesson ${scene.lesson} has taught`, async () => {
          const { events } = await play(scene, seed, learner);
          const said = events.flatMap((e) => (e.kind === "them" && isSpokenEstonian(e.line.provenance) ? [e.line.text] : []));
          expect(said.length, "the other side said nothing at all").toBeGreaterThan(0);
          // A name is a capital past the first word of a sentence; the cast's names and the shared ones are let through.
          const names = new Set<string>(NAMES);
          for (const text of said) {
            for (const sentence of text.split(/[.!?]+/)) {
              for (const [at, w] of wordsOf(sentence).entries()) if (at > 0 && /^\p{Lu}/u.test(w.raw)) names.add(w.raw);
            }
          }
          for (const text of said) expect(uncovered(text, ledger, names), `${scene.id} said "${text}"`).toEqual([]);
          expect(events.some((e) => e.kind === "over"), `${scene.id} never ended`).toBe(true);
          if (name === "plain") {
            const over = events.find((e): e is Extract<Event, { kind: "over" }> => e.kind === "over")!;
            for (const beat of scene.beats.filter((b) => b.required)) {
              expect(over.done, `${scene.id}: answering as asked left ${beat.id} undone`).toContain(beat.id);
            }
          }
        });
      }
    }
  }
});

describe("a scene of a lesson still in preview", () => {
  it("is told apart from the course's, so beginSceneFor keeps it to a reviewer", () => {
    // A scene is a preview one exactly where its lesson is still in preview (`lib/course/lessons/preview.ts`).
    for (const scene of LESSON_SCENES) expect(isPreviewScene(scene), scene.id).toBe(PREVIEW_LESSONS.some((l) => l.id === scene.lesson));
    for (const scene of SCENES) expect(isPreviewScene(scene), scene.id).toBe(false);
    expect(isPreviewScene({ lesson: "b2-01-not-in-the-course" })).toBe(true);
    expect(isPreviewScene({ lesson: undefined })).toBe(false);
  });
});
