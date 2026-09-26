import { ImageResponse } from "next/og";

/**
 * The home-screen icon on iOS.
 *
 * iOS ignores the SVG in the manifest and wants a PNG at a fixed size, so this
 * draws the same mark at 180×180: the same face, the same tilde clear of it,
 * on the same night tile. It used to draw a bare õ glyph in a serif instead, so the
 * browser tab, the Android launcher and the iOS home screen each showed a
 * different thing and one of the three was a letter nobody had drawn.
 *
 * No rounded corners of its own. iOS applies its own superellipse mask and
 * composites the result on black wherever the source is transparent, so the
 * background is painted square and edge to edge and the system does the
 * rounding. That mask crops far less than Android's circle, which is why this
 * carries the mark at full size and `public/app-icon-maskable.svg` does not.
 *
 * The mark is handed over as a data URI rather than rebuilt out of divs,
 * because a tilde is a curve and satori's box model has no way to draw one.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="180" height="180">
  <rect width="64" height="64" fill="#0f1233"/>
  <g transform="translate(3.2 0.6) scale(0.9)">
  <circle cx="32" cy="40" r="15" fill="none" stroke="#ffd23f" stroke-width="8.5" stroke-dasharray="23.562 70.686" transform="rotate(-90 32 40)"/>
  <circle cx="32" cy="40" r="15" fill="none" stroke="#ff3d8b" stroke-width="8.5" stroke-dasharray="23.562 70.686" transform="rotate(0 32 40)"/>
  <circle cx="32" cy="40" r="15" fill="none" stroke="#7b5bff" stroke-width="8.5" stroke-dasharray="23.562 70.686" transform="rotate(90 32 40)"/>
  <circle cx="32" cy="40" r="15" fill="none" stroke="#17bfd9" stroke-width="8.5" stroke-dasharray="23.562 70.686" transform="rotate(180 32 40)"/>
  <path d="M20 15.5q6 -7 12 0t12 0" fill="none" stroke="#ffffff" stroke-width="5.2" stroke-linecap="round"/>
  </g>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <img
          width={size.width}
          height={size.height}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`}
          alt=""
        />
      </div>
    ),
    size,
  );
}
