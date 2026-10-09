"use client";

import { useId } from "react";
import { useT } from "@/components/Locale";
import type { MapScene } from "@/lib/games/map";

/**
 * THE PICTURE A MAP QUESTION IS ABOUT.
 *
 * Eight drawings for eleven cases, and none per word, which is what makes the
 * round possible to ship: a case is a direction or a having or a becoming, and
 * a house is a house whichever word is in it. Strokes and the app's own tokens
 * only, so both themes work and nothing is shipped. A book is the thing that
 * moves, because it is the one object that is as plausible going onto a table
 * as into a house or to a person, and it is drawn as shapes rather than set as
 * an emoji, which this app does not use in copy.
 *
 * It says nothing in words. The English question sits above the options and the
 * word under the picture, and the SVG carries a description for somebody who
 * cannot see it. It does not animate: an arrow that draws itself is a second
 * thing to read on a screen whose job is one.
 */

const INK = "var(--ink-3)";
const ARROW = "var(--accent-deep)";

function Book({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="var(--accent-soft)" stroke="var(--accent-deep)"
      strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M-20 -11 Q-10 -16 0 -9 Q10 -16 20 -11 V12 Q10 7 0 14 Q-10 7 -20 12 Z" />
      <path d="M0 -9 V14" fill="none" />
    </g>
  );
}

function Arrow({ d, marker }: { d: string; marker: string }) {
  return (
    <path d={d} fill="none" stroke={ARROW} strokeWidth="3" strokeDasharray="2 7"
      strokeLinecap="round" markerEnd={`url(#${marker})`} />
  );
}

const solid = { fill: "var(--raised)", stroke: INK, strokeWidth: 2.5, strokeLinejoin: "round" as const };
const empty = { fill: "none", stroke: INK, strokeWidth: 2.5, strokeDasharray: "6 6", strokeLinejoin: "round" as const };

export function MapPicture({ scene }: { scene: MapScene }) {
  const t = useT();
  const marker = useId().replace(/:/g, "");
  const { kind, stage } = scene;
  return (
    <svg viewBox="0 0 360 210" role="img" aria-label={t(scene.alt)} className="h-auto w-full">
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1 1 L9 5 L1 9" fill="none" stroke={ARROW} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <line x1="20" y1="180" x2="340" y2="180" stroke={INK} strokeWidth="2" strokeLinecap="round" />

      {kind === "container" && (<>
        <g {...solid}>
          <path d="M120 180 V92 L180 52 L240 92 V180" />
          <path d="M170 180 V138 a10 10 0 0 1 20 0 V180" />
        </g>
        {stage === "rest" && <Book x={180} y={118} />}
        {stage === "leave" && (<><Book x={300} y={158} /><Arrow marker={marker} d="M200 140 C 230 150, 250 150, 272 152" /></>)}
        {stage === "arrive" && (<><Book x={50} y={158} /><Arrow marker={marker} d="M78 152 C 110 150, 130 148, 160 146" /></>)}
      </>)}

      {kind === "surface" && (<>
        <g {...solid}>
          <rect x="120" y="116" width="120" height="12" rx="4" />
          <rect x="132" y="128" width="10" height="52" rx="2" />
          <rect x="218" y="128" width="10" height="52" rx="2" />
        </g>
        {stage === "rest" && <Book x={180} y={98} />}
        {stage === "leave" && (<><Book x={290} y={58} /><Arrow marker={marker} d="M200 106 C 230 60, 250 56, 268 66" /></>)}
        {stage === "arrive" && (<><Book x={70} y={58} /><Arrow marker={marker} d="M96 66 C 120 50, 150 52, 168 92" /></>)}
      </>)}

      {kind === "person" && (<>
        <g {...solid}>
          <circle cx="180" cy="70" r="16" />
          <path d="M180 86 V138 M180 138 L164 180 M180 138 L196 180 M180 100 L158 124 M180 100 L202 124" fill="none" />
        </g>
        {stage === "rest" && <Book x={180} y={118} />}
        {stage === "leave" && (<><Book x={300} y={108} /><Arrow marker={marker} d="M210 112 C 240 100, 258 100, 272 106" /></>)}
        {stage === "arrive" && (<><Book x={60} y={108} /><Arrow marker={marker} d="M88 106 C 110 96, 130 98, 150 112" /></>)}
      </>)}

      {kind === "change" && (<>
        <Book x={80} y={140} />
        <rect x="250" y="100" width="76" height="68" rx="12" {...empty} />
        <Arrow marker={marker} d="M112 130 C 150 96, 200 96, 238 128" />
      </>)}

      {kind === "limit" && (<>
        <line x1="40" y1="172" x2="256" y2="172" stroke={INK} strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" />
        <Book x={70} y={150} />
        <Arrow marker={marker} d="M100 150 L236 150" />
        <g {...solid}>
          <path d="M270 172 V84" />
          <path d="M270 84 L318 100 L270 116 Z" fill="var(--accent-soft)" />
        </g>
      </>)}

      {kind === "role" && (<>
        <rect x="140" y="136" width="80" height="44" rx="6" {...solid} />
        <Book x={180} y={112} />
        <rect x="140" y="38" width="80" height="30" rx="8" {...empty} />
        <path d="M160 68 L172 94 M200 68 L188 94" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      </>)}

      {kind === "lack" && (<>
        <Book x={110} y={150} />
        <rect x="212" y="112" width="76" height="68" rx="12" {...empty} />
        <path d="M232 132 L268 160 M268 132 L232 160" stroke={ARROW} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </>)}

      {kind === "together" && (<>
        <Book x={112} y={150} />
        <rect x="214" y="118" width="72" height="62" rx="12" {...solid} />
        <path d="M140 150 H214" stroke={ARROW} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="140" cy="150" r="4" fill={ARROW} />
        <circle cx="214" cy="150" r="4" fill={ARROW} />
      </>)}
    </svg>
  );
}
