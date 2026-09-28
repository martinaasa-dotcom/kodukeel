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
 * The mark is handed over as a data URI rather than rebuilt out of divs, so
 * the outline is the same path string as every other copy of the icon.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="180" height="180">
  <defs><linearGradient id="g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9c8cff"/><stop offset="1" stop-color="#5b2eff"/></linearGradient></defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <path d="M17 46.7H23.6V40.1H30.2V33.5H36.8H43.4V40.1H50V46.7H56.6V53.3H63.2H69.8V46.7H76.4V40.1H83V53.3H76.4V59.9H69.8V66.5H63.2H56.6V59.9H50V53.3H43.4V46.7H36.8H30.2V53.3H23.6V59.9H17Z" fill="#ffffff" transform="rotate(-7 50 50)"/>
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
