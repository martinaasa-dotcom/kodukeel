import type { MetadataRoute } from "next";

/**
 * Installable as an app.
 *
 * Not decoration: review is the daily path and it has to survive a bus with no
 * signal (CLAUDE.md). Installed, Kodukeel opens straight into the review screen
 * from the home screen, the service worker has the shell cached, and grades made
 * offline wait in the device's outbox until there is a connection
 * (lib/offline/db.ts).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kodukeel. Estonian that finally sticks",
    short_name: "kodukeel",
    description:
      "Estonian you can use on somebody: practice that sticks, a conversation to rehearse, and one thing to say out loud today.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fcfbf7",
    theme_color: "#0f1233",
    lang: "en",
    categories: ["education"],
    icons: [
      { src: "/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      // A maskable icon is a separate drawing rather than the same file listed
      // twice. Android crops it to a circle 80% of the icon's width, so the
      // maskable drawing is square to the edge and its tilde is drawn smaller,
      // with its corners inside that circle.
      { src: "/app-icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Review", short_name: "Review", url: "/review" },
      { name: "The course", short_name: "Course", url: "/learn" },
      { name: "Situations", short_name: "Situations", url: "/situations" },
      { name: "Dictionary", short_name: "Dictionary", url: "/dictionary" },
    ],
  };
}
