import { qrMatrix, qrPath } from "@/lib/classroom/qr";

/**
 * The join link as a square a phone camera reads.
 *
 * Drawn on the server as one SVG path, so nothing is scripted and nothing is
 * injected. It is black on white in both themes and on paper by color keyword
 * rather than by token, and that is the one place a hue may not follow the
 * theme: a camera looks for dark modules on a light ground, and a QR drawn in
 * the dark theme's light ink on its dark card is a square many readers refuse.
 * The white is part of the code too, since the quiet zone round the edge is
 * how a reader finds the corners.
 *
 * Hidden from a screen reader, because the link it encodes is printed in words
 * beside it and a square of modules says nothing aloud.
 */
export function JoinQr({ link, className }: { link: string; className?: string }) {
  const { side, d } = qrPath(qrMatrix(link));
  return (
    <svg
      viewBox={`0 0 ${side} ${side}`}
      className={className}
      role="presentation"
      aria-hidden
      shapeRendering="crispEdges"
      data-join-qr={link}
    >
      <rect width={side} height={side} fill="white" />
      <path d={d} fill="black" />
    </svg>
  );
}
