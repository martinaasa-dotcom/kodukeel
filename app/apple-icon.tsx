import { ImageResponse } from "next/og";

/**
 * The home-screen icon on iOS.
 *
 * iOS ignores the SVG in the manifest and wants a PNG at a fixed size, so this
 * draws the same mark at 180×180: the same face, the same tilde clear of it,
 * on the same violet tile. It used to draw a bare õ glyph in a serif instead, so the
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
  <rect width="64" height="64" fill="#5b2eff"/>
  <circle cx="32" cy="40" r="18" fill="#ffd23f" stroke="#0f1233" stroke-width="2.6"/>
  <circle cx="25.6" cy="37.4" r="2.7" fill="#0f1233"/>
  <circle cx="38.4" cy="37.4" r="2.7" fill="#0f1233"/>
  <circle cx="26.5" cy="36.4" r="0.9" fill="#ffffff"/>
  <circle cx="39.3" cy="36.4" r="0.9" fill="#ffffff"/>
  <ellipse cx="21.4" cy="43.2" rx="3" ry="2" fill="#ff3d8b"/>
  <ellipse cx="42.6" cy="43.2" rx="3" ry="2" fill="#ff3d8b"/>
  <path d="M28.2 44.4c1.4 2.4 6.2 2.4 7.6 0" fill="none" stroke="#0f1233" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M21 15.15q5.5 -6.5 11 0t11 0" fill="none" stroke="#0f1233" stroke-width="7" stroke-linecap="round"/>
  <path d="M21 15.15q5.5 -6.5 11 0t11 0" fill="none" stroke="#17bfd9" stroke-width="4.2" stroke-linecap="round"/>
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
