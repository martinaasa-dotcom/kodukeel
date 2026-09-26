import { ImageResponse } from "next/og";

/**
 * The picture a link to this app shows when somebody shares it.
 *
 * WHAT A SHARED LINK LOOKED LIKE, WHICH NOBODY HERE HAD EVER SEEN.
 *
 * The layout already set `openGraph` title and description, so a link pasted
 * into a message carried two lines of text and no picture at all: the card
 * fell back to `twitter:card = summary`, which is the small grey one with a
 * favicon on it. That is the whole of what a teacher sending this to a class
 * group, or somebody answering "what are you using for Estonian", hands over.
 * An app that expects to travel by one person telling another has no cheaper
 * thing to fix.
 *
 * Drawn rather than shipped as a file, for the reason `apple-icon.tsx` is
 * drawn: the mark is a gradient and a tilde, the wording is the landing page's
 * own, and a PNG checked into the repository is a second copy of both that
 * goes stale the first time either changes.
 *
 * Nothing on it is about a learner. This is the front of the site, requested
 * by a crawler with no session, and it must read the same for everybody:
 * `/api/share` is the one that draws a person's own figures, and it is
 * `private, no-store` precisely because it does.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kodukeel. Estonian that finally sticks";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128">
  <circle cx="32" cy="40" r="15" fill="none" stroke="#ffd23f" stroke-width="8.5" stroke-dasharray="23.562 70.686" transform="rotate(-90 32 40)"/>
  <circle cx="32" cy="40" r="15" fill="none" stroke="#ff3d8b" stroke-width="8.5" stroke-dasharray="23.562 70.686" transform="rotate(0 32 40)"/>
  <circle cx="32" cy="40" r="15" fill="none" stroke="#5b2eff" stroke-width="8.5" stroke-dasharray="23.562 70.686" transform="rotate(90 32 40)"/>
  <circle cx="32" cy="40" r="15" fill="none" stroke="#17bfd9" stroke-width="8.5" stroke-dasharray="23.562 70.686" transform="rotate(180 32 40)"/>
  <path d="M20 15.5q6 -7 12 0t12 0" fill="none" stroke="#0f1233" stroke-width="5.2" stroke-linecap="round"/>
</svg>`;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fcfbf7",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`} width={128} height={128} alt="" />
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, color: "#0f1233" }}>Kodukeel</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#0f1233", lineHeight: 1.05 }}>
            Estonian that finally sticks
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#3e4166", lineHeight: 1.35, maxWidth: 940 }}>
            Practice that sticks, a conversation to rehearse, and one thing to say to a real person today.
          </div>
        </div>

        {/*
          The three claims a stranger is actually deciding on, and each is one
          this repository can stand behind rather than a slogan: the dictionary
          is Ekilex's, the app is free, and none of the Estonian is generated.
        */}
        <div style={{ display: "flex", gap: 18, fontSize: 27, color: "#3e4166" }}>
          <div style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: "#ece5ff" }}>Free</div>
          <div style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: "#ece5ff" }}>Works offline</div>
          <div style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: "#ece5ff" }}>
            Every form from a dictionary, never from a model
          </div>
        </div>
      </div>
    ),
    size,
  );
}
