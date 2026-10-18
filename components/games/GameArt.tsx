import type { ReactNode } from "react";
import { Check, Mic, Play } from "lucide-react";
import { scoreGuess, SONAD_LENGTH } from "@/lib/games/sonad";
import { EMPTY, HUE, RING } from "@/components/sonad/look";
import { lettersOf } from "@/lib/games/letters";
import { PICTURES } from "@/lib/collections/pictures";
import { SceneVignette } from "@/components/scene/SceneVignette";
import { emojiFor } from "@/lib/collections/emoji";
import { BALL } from "@/lib/games/map";

/**
 * EVERY GAME, SHOWN AT A SMALL SCALE RATHER THAN DESCRIBED.
 *
 * The Games board and Practice's skill tiles draw a round by its own pieces,
 * the argument `components/SonadPreview.tsx` makes for Today's card:
 * a board partway to being solved says more than a sentence about one, and a
 * drawing made of the board's own circles cannot go stale the way a
 * screenshot does, and is right in both themes.
 *
 * Decorative, hidden from a screen reader by every caller: each tile says
 * what the round is in words beside it. Every Estonian word here is a headword of the shipped
 * dictionary or a form the dictionary holds, and nothing is graded.
 */

export type GameArtSize = "sm" | "md" | "lg";

const cell: Record<GameArtSize, string> = { sm: "h-6 w-6 text-xs", md: "h-8 w-8 text-sm", lg: "h-10 w-10 text-base" };

function Sonad({ size }: { size: GameArtSize }) {
  const guesses = ["leping", "kohvik", "lennuk"];
  return (
    <div className="flex flex-col items-center gap-1.5" lang="et">
      {guesses.map((guess) => {
        const marks = scoreGuess(guess, "lennuk");
        return (
          <div key={guess} className="flex gap-1.5">
            {[...guess].slice(0, SONAD_LENGTH).map((letter, i) => {
              const mark = marks[i]!;
              const hue = HUE[mark];
              return (
                <span
                  key={i}
                  className={`grid place-items-center rounded-full font-bold uppercase ${cell[size]}`}
                  style={{
                    background: hue.bg, color: hue.ink,
                    boxShadow: RING[mark] === "0" ? "none" : `inset 0 0 0 ${RING[mark]} ${hue.ring}`,
                  }}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        );
      })}
      <div className="flex gap-1.5">
        {Array.from({ length: SONAD_LENGTH }, (_, i) => (
          <span key={i} className={`rounded-full ${cell[size]}`} style={{ boxShadow: `inset 0 0 0 2px ${EMPTY.ring}` }} />
        ))}
      </div>
    </div>
  );
}

function Tahed({ size }: { size: GameArtSize }) {
  const letters = lettersOf("päike");
  return (
    <div className="flex flex-col items-center gap-2.5" lang="et">
      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--surface)", color: "var(--ink-2)" }}>sun</span>
      <div className="flex gap-1.5">
        {letters.map((l, i) => (
          <span
            key={i}
            className={`grid place-items-center rounded-[var(--r-sm)] border font-bold ${cell[size]}`}
            style={{
              borderColor: i < 2 ? "var(--edge)" : "var(--ink-3)", borderStyle: i < 2 ? "solid" : "dashed",
              background: i < 2 ? "var(--surface)" : "transparent", color: "var(--ink)",
            }}
          >
            {i < 2 ? l : ""}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        {["k", "e", "i"].map((l, i) => (
          <span
            key={l}
            className={`grid place-items-center rounded-full font-bold ${cell[size]}`}
            style={{ background: "var(--accent-soft)", color: "var(--accent-deep)", boxShadow: "inset 0 0 0 2px var(--accent)", transform: `rotate(${[-8, 6, -4][i]}deg)` }}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function Crossword({ size }: { size: GameArtSize }) {
  /* KOHV across, KASS down from its K, VESI down from its V. */
  const grid = [
    "KOHV",
    "A..E",
    "S..S",
    "S..I",
  ];
  const shown = new Set(["0,0", "0,1", "1,0", "0,3", "1,3"]);
  return (
    <div className="grid grid-cols-4 gap-1" lang="et">
      {grid.flatMap((row, r) => [...row].map((ch, c) => {
        if (ch === ".") return <span key={`${r},${c}`} className={cell[size]} />;
        const on = shown.has(`${r},${c}`);
        return (
          <span
            key={`${r},${c}`}
            className={`relative grid place-items-center rounded-[2px] border font-bold uppercase ${cell[size]}`}
            style={{ borderColor: "var(--butter-ink)", background: on ? "var(--butter)" : "var(--surface)", color: "var(--on-hue)" }}
          >
            {on ? ch : ""}
          </span>
        );
      }))}
    </div>
  );
}

function Match({ size }: { size: GameArtSize }) {
  const tiles: [string, "done" | "pick" | "rest", boolean][] = [
    ["kohv", "done", true], ["dog", "rest", false], ["maja", "pick", true],
    ["coffee", "done", false], ["koer", "rest", true], ["house", "rest", false],
  ];
  const pad = size === "lg" ? "px-3 py-2 text-sm" : "px-2 py-1.5 text-xs";
  /* A word on a tile is never broken across two lines. */
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {tiles.map(([word, state, et]) => (
        <span
          key={word}
          lang={et ? "et" : undefined}
          className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-[var(--r-sm)] font-semibold ${pad}`}
          style={state === "done"
            ? { background: "var(--sky)", color: "var(--on-sky)" }
            : state === "pick"
              ? { background: "var(--accent-soft)", color: "var(--accent-deep)", boxShadow: "inset 0 0 0 2px var(--accent)" }
              : { background: "var(--surface)", color: "var(--ink)", boxShadow: "0 0 0 1px var(--edge)" }}
        >
          {state === "done" && <Check size={12} aria-hidden />}{word}
        </span>
      ))}
    </div>
  );
}

function Wave({ bars = 18, tone = "var(--blush)", tall = 28 }: { bars?: number; tone?: string; tall?: number }) {
  return (
    <div className="flex items-center gap-[3px]" style={{ height: tall }}>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="w-[3px] rounded-full" style={{ height: `${25 + Math.abs(Math.sin(i * 1.7)) * 75}%`, background: tone }} />
      ))}
    </div>
  );
}

function Listening() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: "var(--blush)", color: "var(--on-hue)" }}>
          <Play size={18} aria-hidden fill="currentColor" />
        </span>
        <Wave />
      </div>
      <div className="flex gap-1.5">
        {["dog", "house", "bread"].map((w, i) => (
          <span key={w} className="rounded-full px-3 py-1 text-xs font-semibold" style={i === 0
            ? { background: "var(--sky)", color: "var(--on-sky)" }
            : { background: "var(--surface)", color: "var(--ink-2)", boxShadow: "0 0 0 1px var(--edge)" }}>
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

function Dictation() {
  return (
    <div className="flex w-full max-w-[13rem] flex-col items-stretch gap-2.5">
      <Wave bars={22} tone="var(--butter-ink)" tall={22} />
      <span className="rounded-[var(--r-sm)] px-3 py-2 text-sm font-semibold" lang="et" style={{ background: "var(--surface)", color: "var(--ink)", boxShadow: "0 0 0 1px var(--edge)" }}>
        Täna on kolm<span className="ml-px inline-block h-4 w-[2px] translate-y-0.5" style={{ background: "var(--accent)" }} />
      </span>
    </div>
  );
}

function Speaking() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "var(--sky)", color: "var(--on-sky)", boxShadow: "0 0 0 6px var(--sky-soft), 0 0 0 7px var(--sky)" }}>
        <Mic size={20} aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <Wave bars={14} tone="var(--sky-ink)" tall={18} />
        <Wave bars={14} tone="var(--accent)" tall={18} />
      </div>
    </div>
  );
}

function Quest() {
  return (
    <div className="relative grid place-items-center">
      {[96, 72, 48, 24].map((d, i) => (
        <span key={d} className="absolute rounded-full" style={{ width: d, height: d, background: i % 2 ? "var(--surface)" : "var(--accent)", opacity: 1 }} />
      ))}
      <span className="h-24 w-24" />
      {[["-sse", "-left-10 -top-1"], ["-st", "-right-9 top-2"], ["-le", "-bottom-2 -right-6"]].map(([e, pos]) => (
        <span key={e} lang="et" className={`absolute rounded-full px-2 py-0.5 text-xs font-bold ${pos}`} style={{ background: "var(--butter)", color: "var(--on-hue)" }}>{e}</span>
      ))}
    </div>
  );
}

function Tiles({ words, placed }: { words: string[]; placed: string[] }) {
  return (
    <div className="flex flex-col items-center gap-2.5" lang="et">
      <div className="flex gap-1.5">
        {placed.map((w, i) => (
          <span key={i} className="min-w-14 rounded-[var(--r-sm)] border-b-2 px-2 pb-1 text-center text-sm font-semibold" style={{ borderColor: "var(--accent)", color: w ? "var(--ink)" : "transparent" }}>{w || "_"}</span>
        ))}
      </div>
      <div className="flex gap-1.5">
        {words.map((w, i) => (
          <span key={w} className="rounded-[var(--r-sm)] px-2.5 py-1.5 text-sm font-semibold" style={{ background: "var(--surface)", color: "var(--ink)", boxShadow: "0 0 0 1px var(--edge), 0 2px 0 var(--edge)", transform: `rotate(${[-3, 2, -1][i % 3]}deg)` }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

function MapArt() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-20 w-20 place-items-center rounded-[var(--r)] text-5xl" style={{ background: "var(--surface)" }}>
        <span>{emojiFor("maja")}</span>
        <span className="absolute bottom-3 right-3 text-xl">{BALL}</span>
      </div>
      <div className="flex flex-col gap-1" lang="et">
        {["majas", "majast", "majja"].map((w, i) => (
          <span key={w} className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={i === 0
            ? { background: "var(--sky)", color: "var(--on-sky)" }
            : { background: "var(--surface)", color: "var(--ink-2)", boxShadow: "0 0 0 1px var(--edge)" }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

function Twins() {
  return (
    <div className="flex items-center gap-2" lang="et">
      <span className="rounded-[var(--r)] px-3 py-3 text-base font-bold" style={{ background: "var(--surface)", color: "var(--ink)", transform: "rotate(-4deg)", boxShadow: "0 0 0 1px var(--edge)" }}>algama</span>
      <span className="font-display text-2xl font-bold" style={{ color: "var(--blush-ink)" }}>≠</span>
      <span className="rounded-[var(--r)] px-3 py-3 text-base font-bold" style={{ background: "var(--surface)", color: "var(--ink)", transform: "rotate(4deg)", boxShadow: "0 0 0 1px var(--edge)" }}>alustama</span>
    </div>
  );
}

function Sayings() {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className="font-display text-2xl font-bold" lang="et" style={{ color: "var(--ink)" }}>läks katki</span>
      <span className="text-xs italic line-through" style={{ color: "var(--ink-3)" }}>&ldquo;went broken&rdquo;</span>
      <span className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: "var(--butter)", color: "var(--on-hue)" }}>it broke</span>
    </div>
  );
}

function Wordplay() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2 text-sm font-bold" lang="et" style={{ color: "var(--ink)" }}>
        <span className="rounded-[var(--r-sm)] px-2 py-1" style={{ background: "var(--surface)" }}>nahk</span>+
        <span className="rounded-[var(--r-sm)] px-2 py-1" style={{ background: "var(--surface)" }}>hiir</span>=
        <span className="text-3xl">{emojiFor("nahkhiir")}</span>
      </div>
      <span className="text-xs italic" style={{ color: "var(--ink-2)" }}>&ldquo;a leather mouse&rdquo;</span>
    </div>
  );
}

function Picture({ size }: { size: GameArtSize }) {
  const glyph = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-2xl";
  const beach = PICTURES.find((p) => p.id === "beach") ?? PICTURES[0]!;
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-[var(--r)] px-4 py-2" style={{ background: "var(--surface)" }}>
      {beach.rows.map((row) => (
        <span key={row} className={`${glyph} tracking-[0.2em]`}>{row.replaceAll(" ", "")}</span>
      ))}
    </div>
  );
}

function Twenty() {
  return (
    <div className="flex w-full max-w-[13rem] flex-col gap-1.5" lang="et">
      <span className="self-end rounded-[var(--r)] rounded-br-sm px-3 py-1.5 text-sm font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)", boxShadow: "inset 0 0 0 2px var(--accent)" }}>Kas see on loom?</span>
      <span className="self-start rounded-[var(--r)] rounded-bl-sm px-3 py-1.5 text-sm font-semibold" style={{ background: "var(--surface)", color: "var(--ink)" }}>Jah!</span>
      <span className="self-center text-xs font-bold tabular-nums" style={{ color: "var(--blush-ink)" }}>3 of 20</span>
    </div>
  );
}

function Openers() {
  return (
    <div className="flex flex-col items-center gap-2" lang="et">
      <span className="font-display text-xl font-bold" style={{ color: "var(--ink)" }}>Ma lähen …</span>
      <div className="flex gap-1.5">
        {["poodi", "poes", "poest"].map((w, i) => (
          <span key={w} className="rounded-full px-2.5 py-1 text-xs font-bold" style={i === 0
            ? { background: "var(--sky)", color: "var(--on-sky)" }
            : { background: "var(--surface)", color: "var(--ink-2)", boxShadow: "0 0 0 1px var(--edge)" }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

const ART: Record<string, (p: { size: GameArtSize }) => ReactNode> = {
  "/sonad": Sonad,
  "/review/letters": Tahed,
  "/crossword": Crossword,
  "/review/match": Match,
  "/review/listening": Listening,
  "/review/dictation": Dictation,
  "/review/speaking": Speaking,
  "/quest": Quest,
  "/review/sentences": () => <Tiles words={["kolmapäev.", "on"]} placed={["Täna", "", ""]} />,
  "/review/map": MapArt,
  "/review/twins": Twins,
  "/review/sayings": Sayings,
  "/review/wordplay": Wordplay,
  "/review/describe": Picture,
  "/review/twenty": Twenty,
  "/review/openers": Openers,
  "/situations": ({ size }) => <div className={size === "sm" ? "w-44" : size === "lg" ? "w-80" : "w-64"}><SceneVignette sceneId="kohvikus" /></div>,
};

/** The game, drawn. Nothing for a href this table does not know. */
export function GameArt({ href, size = "md" }: { href: string; size?: GameArtSize }) {
  const Draw = ART[href];
  return Draw ? <div aria-hidden className="pointer-events-none flex items-center justify-center">{Draw({ size })}</div> : null;
}
