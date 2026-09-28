import { prisma } from "@/lib/db";
import { sceneById } from "@/lib/scenes/catalogue";
import { planRun } from "@/lib/scenes/run";
import { seedFrom } from "@/lib/random/seeded";
import { caseKeyFor, type Lexicon } from "@/lib/scenes/lexicon";
import { outcomeOf } from "@/lib/scenes/state";
import type { CaseKey } from "@/lib/estonian/types";
import type { DerivedVerbCode } from "@/lib/estonian/conjugate";
import { knowing, replay, sceneContext, type SentTurn, type StoredDraw } from "@/lib/progress/scene";

/**
 * ONE CONVERSATION, PLAYABLE FROM THE LANDING PAGE WITH NO ACCOUNT, AND IT
 * CANNOT GO WRONG.
 *
 * The page says the app rehearses the conversation somebody is about to have,
 * and a visitor deciding whether to believe that is shown the café scene. It
 * used to take typing, which on a landing page is a stranger with no Estonian
 * guessing at a box, and the ladder then did what it does for a learner:
 * "raha" answered "Kas on kõik?", the beat was met, and the counter said
 * goodbye with nobody having paid. Right for a rehearsal, where a turn that
 * lands moves the scene on, and wrong for the one conversation a stranger
 * judges the whole app by. So here the visitor picks, and every pick is one
 * the conversation was built to take.
 *
 * NOTHING IN THIS FILE IS ESTONIAN WRITTEN BY HAND (ADR-005). Every option and
 * every line on the other side is a dictionary lemma, a form off the scene's
 * own case table or person table, or a line out of the bank a native speaker
 * has read, and a line whose form is missing is withheld rather than guessed.
 * The one thing added beyond the scene's five beats is the payment, since a
 * café where nobody says the price is the fault being fixed: `pay` is a step
 * of this page only, and its line is `see maksab N eurot` built the way the
 * `wrong-price` curveball builds it.
 *
 * AND THE APP'S OWN READER STILL MARKS EVERY PICK. The picks are sent through
 * `knowing` and `replay` exactly as typed turns are, so a visitor finishing
 * the scene has met the beats the scene says they met, and
 * `demoScene.itest.ts` walks every path through every seed and fails on one
 * that does not end with all five beats met.
 *
 * Stateless like the route: the browser sends the picks it has made and the
 * seed it was dealt, and the run is rebuilt. A pick that is not on offer, or
 * a step out of order, is refused outright, so nothing a stranger sends can
 * reach the marker as free text.
 */
export const DEMO_SCENE_ID = "kohvikus";
/** A beginner's evening, which is who this page is talking to. */
const LEVEL = "A1";

export const DEMO_STEPS = ["greet", "order", "size", "bill", "pay", "close"] as const;
export type DemoStep = (typeof DEMO_STEPS)[number];
/** One pick per step and no more. */
export const DEMO_MAX_TURNS = DEMO_STEPS.length;

/** What the visitor is doing at each step, in English. The beat's own goal where it is a beat. */
const PAY_GOAL = "Now pay for it.";

export interface DemoOption {
  /** What the browser sends back: never the text, which the server rebuilds. */
  readonly id: string;
  readonly et: string;
  readonly en: string;
}

export interface DemoLine {
  readonly text: string;
  /** A stage direction from the app rather than something anybody said. */
  readonly aside?: true;
}

export interface DemoMenuItem {
  readonly lemma: string;
  readonly en: string;
  readonly price: number;
}

export interface DemoReply {
  /** What the other side says to the last pick, newest last. */
  readonly lines: readonly DemoLine[];
  /** The step the next pick answers, or null once it is over. */
  readonly step: DemoStep | null;
  /** What the visitor is trying to do now, in English. */
  readonly goal: string | null;
  readonly options: readonly DemoOption[];
  /** The board over the counter: the scene's four drinks with a price each. */
  readonly menu: readonly DemoMenuItem[];
  /** The drink ordered so far, by lemma, so the board can light it. */
  readonly ordered: string | null;
  readonly over: boolean;
  readonly outcome: string | null;
  /** Beats the app's own reader counted as met. */
  readonly met: number;
  readonly beats: number;
  /** How far through the steps, for the meter. */
  readonly at: number;
}

export interface DemoTurn {
  readonly step: string;
  readonly option: string;
}

/** The seed a browser may send: a short opaque string, never anything else. */
export function demoSeed(input: unknown): string | null {
  return typeof input === "string" && /^[A-Za-z0-9-]{4,40}$/.test(input) ? input : null;
}

/** The picks a browser may send, checked for shape here and for content in `demoTurn`. */
export function demoTurns(input: unknown): DemoTurn[] | null {
  if (!Array.isArray(input) || input.length > DEMO_MAX_TURNS) return null;
  const out: DemoTurn[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const { step, option } = raw as Record<string, unknown>;
    if (typeof step !== "string" || typeof option !== "string") return null;
    if (step.length > 20 || option.length > 40) return null;
    out.push({ step, option });
  }
  return out;
}

type Part =
  | { readonly lemma: string; readonly inside?: true }
  | { readonly lemma: string; readonly grammCase: CaseKey }
  | { readonly lemma: string; readonly verb: DerivedVerbCode }
  | { readonly digits: number };

/**
 * A line said off the dictionary, with the punctuation between the pieces
 * given rather than spelled: punctuation is not a form. The same reading
 * `partsLine` does, with a comma and an exclamation mark it has no room for.
 * Withheld whole where any form is missing.
 */
function say(lexicon: Lexicon, pieces: readonly (Part | "," | "." | "!" | "?")[]): string | null {
  let out = "";
  for (const piece of pieces) {
    if (typeof piece === "string") { out += piece; continue; }
    let word: string | undefined;
    if ("digits" in piece) word = String(piece.digits);
    else if (!lexicon.byLemma.has(piece.lemma)) return null;
    else if ("grammCase" in piece) word = lexicon.caseForm.get(caseKeyFor(piece.lemma, piece.grammCase));
    else if ("verb" in piece) word = lexicon.persons.get(piece.lemma)?.get(piece.verb);
    // A phrase entry carries its own capital (`Palun`); inside a sentence it is lower case, and that is all.
    else word = "inside" in piece && piece.inside ? `${piece.lemma.charAt(0).toLowerCase()}${piece.lemma.slice(1)}` : piece.lemma;
    if (!word) return null;
    out += out === "" ? word : ` ${word}`;
  }
  const text = out.trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : null;
}

async function glossesOf(lemmas: readonly string[]): Promise<Map<string, string>> {
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: [...new Set(lemmas)] } },
    select: { lemma: true, translation: true },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  const out = new Map<string, string>();
  for (const row of rows) if (!out.has(row.lemma)) out.set(row.lemma, row.translation.split(/[,;]/)[0]!.trim());
  return out;
}

/** `palun` is stored as the phrase `Palun`, so it is asked for by that headword and lowered inside a sentence. */
const PLEASE = { lemma: "Palun", inside: true } as const;

const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/**
 * A line out of the bank for a beat, turned by the run's seed so two visits
 * differ, and narrowed where the picks only answer some of them: "Jah, see on
 * kõik" answers "is that everything?" and is the wrong answer to "anything
 * else?", so the bill is asked only by the lines that hold `kõik`.
 */
function banked(scripted: ReadonlyMap<string, readonly string[]>, beat: string, seed: string, holding?: string): string | null {
  const lines = (scripted.get(beat) ?? []).filter((l) => !holding || l.toLowerCase().split(/[^\p{L}]+/u).includes(holding));
  if (lines.length === 0) return null;
  return lines[seedFrom(`${beat}:${seed}`) % lines.length] ?? null;
}

interface Built {
  readonly options: readonly DemoOption[];
  readonly goal: string;
}

/** Every pick a step offers, built off the dictionary. A pick whose form is missing is not offered. */
function optionsFor(step: DemoStep, lexicon: Lexicon, menu: readonly DemoMenuItem[], goals: ReadonlyMap<string, string>): Built {
  const opt = (id: string, et: string | null, en: string): DemoOption[] => (et ? [{ id, et, en }] : []);
  const goal = goals.get(step) ?? PAY_GOAL;
  switch (step) {
    case "greet":
      return {
        goal,
        options: [
          ...opt("hello", say(lexicon, [{ lemma: "Tere!" }]), "Hello!"),
          ...opt("morning", say(lexicon, [{ lemma: "Tere hommikust!" }]), "Good morning!"),
        ],
      };
    case "order":
      return {
        goal,
        options: menu.flatMap((d) =>
          opt(d.lemma, say(lexicon, [{ lemma: d.lemma, grammCase: "PARTITIVE" }, ",", PLEASE, "."]), `${cap(d.en)}, please.`)),
      };
    case "size":
      return {
        goal,
        options: [
          ...opt("large", say(lexicon, [{ lemma: "suur" }, ",", PLEASE, "."]), "A large one, please."),
          ...opt("small", say(lexicon, [{ lemma: "väike" }, ",", PLEASE, "."]), "A small one, please."),
        ],
      };
    case "bill":
      return {
        goal,
        options: [
          ...opt("all", say(lexicon, [{ lemma: "jah" }, ",", { lemma: "see" }, { lemma: "olema", verb: "IndPrSg3" }, { lemma: "kõik" }, "."]), "Yes, that's everything."),
          ...opt("bill", say(lexicon, [{ lemma: "arve" }, ",", PLEASE, "."]), "The bill, please."),
        ],
      };
    case "pay":
      return {
        goal,
        options: [
          // Holding out a card: `Palun` is what anybody says as they hand something over.
          ...opt("card", say(lexicon, [{ lemma: "Palun" }, "."]), "Here you are. (You hold out your card.)"),
          ...opt("cash", say(lexicon, [{ lemma: "sularaha", grammCase: "COMITATIVE" }, ",", PLEASE, "."]), "In cash, please."),
        ],
      };
    case "close":
      return {
        goal,
        options: [
          ...opt("thanks", say(lexicon, [{ lemma: "Aitäh!" }, { lemma: "Head aega!" }]), "Thank you! Goodbye!"),
          ...opt("bye", say(lexicon, [{ lemma: "Nägemist!" }]), "Bye!"),
        ],
      };
  }
}

/*
  THE SCENE'S WORDS ARE A FACT ABOUT THE SHARED DICTIONARY, NOT ABOUT THE
  VISITOR, so they are read once a minute rather than once a pick: the same
  minute `lib/dict/facts.ts` holds its own facts for, and for its reason. A
  public page played six picks at a time was otherwise reading the scene's
  whole lexicon six times per visitor.
*/
const CONTEXT_TTL_MS = 60_000;
let held: { at: number; context: Promise<Awaited<ReturnType<typeof sceneContext>>> } | null = null;
function demoContext() {
  if (!held || Date.now() - held.at > CONTEXT_TTL_MS) {
    const context = sceneContext(DEMO_SCENE_ID, LEVEL);
    held = { at: Date.now(), context };
    // A failed read is not remembered, or one bad minute would last the whole minute.
    context.catch(() => { held = null; });
  }
  return held.context;
}

/** A pick that is not on offer, or out of order. */
export const REFUSED = "refused" as const;

export async function demoTurn(seed: string, sent: readonly DemoTurn[]): Promise<DemoReply | typeof REFUSED | null> {
  const scene = sceneById(DEMO_SCENE_ID);
  if (!scene) return null;
  const context = await demoContext();
  if (!context) return null;
  const { lexicon, scripted } = context;

  const drinkProp = scene.props.find((p) => p.slot === "drink");
  const drinks = drinkProp && drinkProp.kind === "word" ? drinkProp.oneOf : [];
  const glosses = await glossesOf(drinks);
  const menu: DemoMenuItem[] = drinks.map((lemma) => ({
    lemma,
    // The scene's own sense where it names one: `tee` is dealt as tea, and its first gloss is "road".
    en: (drinkProp && drinkProp.kind === "word" ? drinkProp.means?.[lemma] : undefined) ?? glosses.get(lemma) ?? lemma,
    price: 2 + (seedFrom(`${lemma}:${seed}`) % 3),
  }));
  const goals = new Map(scene.beats.map((b) => [b.id, b.goal] as const));

  // The picks, rebuilt from their ids against what each step offers. Anything else is refused.
  const picks: { step: DemoStep; option: DemoOption }[] = [];
  for (const [n, turn] of sent.entries()) {
    const step = DEMO_STEPS[n];
    if (!step || turn.step !== step) return REFUSED;
    const option = optionsFor(step, lexicon, menu, goals).options.find((o) => o.id === turn.option);
    if (!option) return REFUSED;
    picks.push({ step, option });
  }

  // The app's own reader, over every pick that answers a beat.
  const run = planRun(scene, seed, LEVEL, "textbook");
  const draw: StoredDraw = {
    persona: run.persona.id,
    card: run.card,
    curveballs: [],
    lines: "scripted",
    patience: run.patience,
  };
  const turns: SentTurn[] = picks
    .filter((p) => p.step !== "pay")
    .map((p) => ({ beatId: p.step, said: p.option.et, helped: false, heard: "" }));
  const marking = await knowing(context, turns.map((t) => t.said));
  const { state } = replay(marking, draw, turns);

  const ordered = picks.find((p) => p.step === "order")?.option.id ?? null;
  const price = menu.find((d) => d.lemma === ordered)?.price ?? null;
  const last = picks[picks.length - 1]?.step ?? null;
  const next = DEMO_STEPS[picks.length] ?? null;

  const lines: DemoLine[] = [];
  const add = (text: string | null) => { if (text) lines.push({ text }); };
  switch (last) {
    case null:
      add(say(lexicon, [{ lemma: "Tere!" }]));
      break;
    case "greet":
      add(banked(scripted, "order", seed));
      break;
    case "order": {
      // Their word back, the right way, then the next question in one breath.
      const echo = ordered ? say(lexicon, [{ lemma: ordered, grammCase: "PARTITIVE" }, "."]) : null;
      const ask = banked(scripted, "size", seed);
      add(echo && ask ? `${echo} ${ask}` : ask);
      break;
    }
    case "size": {
      const bill = scene.beats.find((b) => b.id === "bill");
      if (bill?.meanwhile) lines.push({ text: bill.meanwhile, aside: true });
      add(banked(scripted, "bill", seed, "kõik"));
      break;
    }
    case "bill":
      add(price === null ? null : say(lexicon, [
        { lemma: "see" }, { lemma: "maksma", verb: "IndPrSg3" }, { digits: price }, { lemma: "euro", grammCase: "PARTITIVE" }, ".",
      ]));
      break;
    case "pay":
      add(say(lexicon, [{ lemma: "Aitäh!" }, { lemma: "Head aega!" }]));
      break;
    case "close":
      break;
  }

  const over = next === null;
  const built = next ? optionsFor(next, lexicon, menu, goals) : null;
  return {
    lines,
    step: next,
    goal: built?.goal ?? null,
    options: built?.options ?? [],
    menu,
    ordered,
    over,
    outcome: over ? outcomeOf(scene, state)?.says ?? null : null,
    met: state.done.length,
    beats: scene.beats.length,
    at: picks.length,
  };
}
