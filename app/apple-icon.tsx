import { ImageResponse } from "next/og";

/**
 * The home-screen icon on iOS.
 *
 * iOS ignores the SVG in the manifest and wants a PNG at a fixed size, so this
 * draws the same mark at 180×180: the same gold tile, the same ring and
 * tilde in ink, as every other place the mark appears (app/icon.svg,
 * public/app-icon.svg, public/app-icon-maskable.svg, components/brand.tsx).
 * It used to draw a bare õ glyph in a serif instead, so the browser tab, the
 * Android launcher and the iOS home screen each showed a different thing
 * and one of the three was a letter nobody had drawn.
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
  <rect width="64" height="64" fill="#ffd23f"/>
  <circle cx="32" cy="38" r="13" fill="none" stroke="#0f1233" stroke-width="7"/>
  <path d="M20 17q6-7 12 0t12 0" fill="none" stroke="#0f1233" stroke-width="6" stroke-linecap="round"/>
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
