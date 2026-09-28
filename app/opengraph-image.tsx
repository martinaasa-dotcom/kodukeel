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
 * drawn: the mark is the pixel tilde on its violet tile, the wording is the
 * landing page's own, and a PNG checked into the repository is a second copy
 * of both that goes stale the first time either changes.
 *
 * Nothing on it is about a learner. This is the front of the site, requested
 * by a crawler with no session, and it must read the same for everybody:
 * `/api/share` is the one that draws a person's own figures, and it is
 * `private, no-store` precisely because it does.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "kodukeel. Estonian that finally sticks";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="128" height="128">
  <defs><linearGradient id="g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9c8cff"/><stop offset="1" stop-color="#5b2eff"/></linearGradient></defs>
  <rect width="100" height="100" rx="23" fill="url(#g)"/>
  <path d="M17 46.7H23.6V40.1H30.2V33.5H36.8H43.4V40.1H50V46.7H56.6V53.3H63.2H69.8V46.7H76.4V40.1H83V53.3H76.4V59.9H69.8V66.5H63.2H56.6V59.9H50V53.3H43.4V46.7H36.8H30.2V53.3H23.6V59.9H17Z" fill="#ffffff" transform="rotate(-7 50 50)"/>
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
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, color: "#0f1233" }}>kodukeel</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#0f1233", lineHeight: 1.05 }}>
            Estonian that finally sticks
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#3e4166", lineHeight: 1.35, maxWidth: 940 }}>
            Fifteen minutes an evening, a conversation to rehearse, and one small thing to say to a real person today.
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
            Every form from a dictionary, never from AI
          </div>
        </div>
      </div>
    ),
    size,
  );
}
