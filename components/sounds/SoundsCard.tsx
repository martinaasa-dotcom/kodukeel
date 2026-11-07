"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { ArrowRight } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { SoundKey } from "@/components/sounds/Native";

const HREF = "/grammar/sounds";

/** The four letters an English keyboard has no key for, each with the recording that says it. */
const LETTERS = [
  { clip: "sound-ou", glyph: "õ" },
  { clip: "sound-ae", glyph: "ä" },
  { clip: "sound-oe", glyph: "ö" },
  { clip: "sound-ue", glyph: "ü" },
] as const;

/**
 * THE CARD THAT OPENS THE SOUNDS, WITH FOUR LETTERS ON IT THAT PLAY.
 *
 * It said "Press a letter and hear it", and pressing one opened the module
 * without a sound, because the whole card was one link and the tiles were text
 * inside it. A button cannot sit inside a link, so the card is a box: the
 * title is the real link (keyboard, a screen reader, open in a new tab), the
 * letters are `SoundKey` buttons, and a press anywhere else on the box goes to
 * the same place.
 *
 * NOTHING IS LAID OVER ANYTHING. The first version stretched the link over the
 * card with a pseudo-element, which draws an anchor on top of the sentence and
 * the arrow, and the containment sweep rightly refuses that. The box answers
 * the press itself instead, and leaves it alone when the press landed on a
 * button or a link, whose own answer is the one wanted.
 */
export function SoundsCard({ title, blurb }: { title: string; blurb: string }) {
  const router = useRouter();
  const open = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    router.push(HREF);
  };
  return (
    <div
      onClick={open}
      className="lift flex cursor-pointer flex-wrap items-center gap-4 rounded-[var(--r-lg)] border p-5"
      style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
      data-sounds-link
    >
      <span className="flex shrink-0 gap-1.5">
        {LETTERS.map(({ clip, glyph }) => (
          <SoundKey key={clip} clip={clip} glyph={glyph} size="sm" />
        ))}
      </span>
      <span className="flex min-w-0 flex-[1_1_16rem] flex-col gap-0.5">
        <Link href={HREF} className="text-lg font-bold" style={{ color: "var(--ink)" }}>{title}</Link>
        <span className="text-md" style={{ color: "var(--ink-2)" }}>{blurb}</span>
      </span>
      <ArrowRight size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />
    </div>
  );
}
