import { icon as iconFor } from "@/components/icons";
import { sceneryFor, type Ambience } from "@/lib/scenes/scenery";

/**
 * The room, drawn.
 *
 * `lib/scenes/scenery.ts` says what kind of place a scene is and how that
 * place moves; this is the one component that turns either into something on
 * the screen. It is a badge with the place's icon in it and one small movement
 * around it, and it is deliberately not an illustration: there is no artwork in
 * this app and there will not be, for the licence reason `lib/collections/scenes.ts`
 * already gives about the picture round.
 *
 * IT IS DECORATION AND IT SAYS SO. Everything it carries is said in words
 * beside it, which is what makes it safe to hide from a screen reader entirely.
 * The design system's rule about a colour never carrying a distinction on its
 * own is the same rule one step further out: a drawing may not either.
 *
 * The accent and nothing else. The five hues in this app have fixed meanings
 * and mint on a café would spend "you got it" on a coffee cup.
 */
export function SceneMotif({ sceneId, size = "lg" }: {
  sceneId: string;
  /** `lg` on a briefing, where there is room to be pleased about it. `sm` in a bar or on a tile. */
  size?: "lg" | "sm";
}) {
  const room = sceneryFor(sceneId);
  const Icon = iconFor(room.icon);
  const big = size === "lg";
  const box = big ? "h-24 w-24" : "h-10 w-10";

  return (
    <span aria-hidden className="relative inline-flex shrink-0 items-center justify-center">
      {big && <Ambience kind={room.ambience} />}
      <span
        className={`relative z-10 inline-flex ${box} items-center justify-center rounded-full`}
        style={{
          background: "var(--surface)",
          boxShadow: big ? "var(--shadow)" : "var(--shadow-sm)",
          color: "var(--accent-deep)",
        }}
      >
        <Icon size={big ? 38 : 18} strokeWidth={big ? 1.6 : 2} aria-hidden />
      </span>
    </span>
  );
}

/**
 * One movement, drawn around the badge rather than inside it.
 *
 * Absolutely placed and `pointer-events-none`, so nothing here can take a tap
 * meant for what it sits behind, and every piece is a plain span: an ambience
 * that needed a canvas would be an ambience that costs a frame budget on the
 * one screen where a reply is being composed.
 */
function Ambience({ kind }: { kind: Ambience }) {
  const soft = { background: "var(--accent-soft)" } as const;

  if (kind === "queue") {
    // Three ahead of you, each one stepping up in turn.
    return (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((at) => (
          <span
            key={at}
            className={`amb-queue amb-${at} absolute h-2 w-2 rounded-full`}
            style={{ background: "var(--accent)", opacity: 0, left: "-6px" }}
          />
        ))}
      </span>
    );
  }

  if (kind === "ring") {
    // Going out from the middle, and gone.
    return (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((at) => (
          <span
            key={at}
            className={`amb-ring amb-${at} absolute h-24 w-24 rounded-full border-2`}
            style={{ borderColor: "var(--accent)", opacity: 0 }}
          />
        ))}
      </span>
    );
  }

  if (kind === "travel") {
    // A road under it, and something going along the road.
    return (
      <span className="pointer-events-none absolute inset-0 flex items-end justify-center pb-1">
        <span className="relative block h-1 w-28 rounded-full" style={soft}>
          {[1, 2].map((at) => (
            <span
              key={at}
              className={`amb-travel amb-${at} absolute -top-1 left-1/2 h-3 w-3 rounded-full`}
              style={{ background: "var(--accent)", opacity: 0 }}
            />
          ))}
        </span>
      </span>
    );
  }

  if (kind === "steam") {
    // Warmth coming off it, leaning as it goes.
    return (
      <span className="pointer-events-none absolute inset-0 flex items-start justify-center">
        {[1, 2, 3].map((at) => (
          <span
            key={at}
            className={`amb-steam amb-${at} absolute h-6 w-1.5 rounded-full`}
            style={{ background: "var(--accent)", opacity: 0, top: -6, left: `calc(50% + ${(at - 2) * 12}px)` }}
          />
        ))}
      </span>
    );
  }

  // A room that is simply breathing, because somebody in it is looking at you.
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="amb-attend absolute h-28 w-28 rounded-full" style={soft} />
    </span>
  );
}
