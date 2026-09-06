import { icon as iconFor } from "@/components/icons";
import { sceneryFor } from "@/lib/scenes/scenery";

/**
 * The room's mark: small, on a bar and on a tile.
 *
 * `components/scene/SceneVignette.tsx` draws the room itself, which needs about
 * three hundred pixels to be a room at all. This is the same fact at eighteen,
 * where a stick figure is a smudge and an icon is not: it sits in the bar above
 * a conversation for the whole of it, and beside each of fourteen titles on the
 * chooser, which is a list somebody scans rather than reads.
 *
 * IT IS DECORATION AND IT SAYS SO. Everything it carries is printed beside it,
 * which is what lets it be hidden from a screen reader outright, and it is
 * drawn in the accent like everything else, because the other four hues in this
 * app mean something and a café is not "you got it".
 */
export function SceneMotif({ sceneId }: { sceneId: string }) {
  const Icon = iconFor(sceneryFor(sceneId).icon);
  return (
    <span
      aria-hidden
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)", color: "var(--accent-deep)" }}
    >
      <Icon size={18} aria-hidden />
    </span>
  );
}
