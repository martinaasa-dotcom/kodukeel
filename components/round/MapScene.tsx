"use client";

import { useT } from "@/components/Locale";
import type { MapScene, SceneGlyph } from "@/lib/games/map";

/**
 * THE PICTURE A MAP QUESTION IS ABOUT.
 *
 * A row of emoji: the word's own, a companion, and an arrow emoji where the
 * ending is a direction (`sceneFor` in `lib/games/map.ts` decides which). The
 * word's own emoji sits on the accent tint, so the learner can see which of
 * the pictures the three forms are about. Emoji are drawn by the reader's own
 * font, so nothing is shipped and both themes work.
 *
 * It says nothing in words. The English question sits under it and the word
 * under that, and the row carries a description for somebody who cannot see
 * it. The emoji themselves are hidden from a screen reader, which would
 * otherwise read "person walking facing right, right arrow, house" before the
 * sentence that says the same thing. It does not animate: an arrow that moves
 * is a second thing to read on a screen whose job is one.
 */

function Glyph({ glyph, word }: SceneGlyph) {
  return word
    ? (
      <span className="grid size-24 shrink-0 place-items-center rounded-full text-6xl leading-none sm:size-28 sm:text-7xl"
        style={{ background: "var(--accent-soft)" }}>
        {glyph}
      </span>
    )
    : <span className="shrink-0 text-5xl leading-none sm:text-6xl">{glyph}</span>;
}

export function MapPicture({ scene }: { scene: MapScene }) {
  const t = useT();
  const { layout } = scene;
  return (
    <div role="img" aria-label={t(scene.alt)} className="flex min-h-44 items-center justify-center gap-3 py-5 sm:gap-5">
      <span aria-hidden className="contents">
        {layout.kind === "row" && layout.parts.map((p, i) => <Glyph key={i} {...p} />)}
        {layout.kind === "inside" && (
          <span className="relative grid place-items-center">
            <Glyph glyph={layout.host} word />
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-3xl leading-none sm:bottom-4 sm:text-4xl">{layout.guest}</span>
          </span>
        )}
        {layout.kind === "on" && (
          <span className="flex flex-col items-center">
            <span className="-mb-3 text-5xl leading-none sm:text-6xl">{layout.guest}</span>
            <Glyph glyph={layout.host} word />
          </span>
        )}
      </span>
    </div>
  );
}
