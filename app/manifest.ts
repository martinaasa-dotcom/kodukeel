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
      "Estonian you can use with the people around you. Fifteen minutes an evening, conversations to rehearse, and one small thing to say out loud today.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    /*
      No orientation lock. "portrait" fixed an installed app upright, which is
      WCAG 1.3.4 (Orientation) failed for anybody whose phone is mounted on
      its side, and every screen here is measured at 844x390 anyway.
    */
    orientation: "any",
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
      // The same tile as PNGs, for the launchers and install prompts that read
      // no SVG. Rendered from public/app-icon.svg by `npm run store:icons`,
      // never drawn by hand, so the three can only differ by being stale.
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Review", short_name: "Review", url: "/review" },
      { name: "The course", short_name: "Course", url: "/learn" },
      { name: "Situations", short_name: "Situations", url: "/situations" },
      { name: "Dictionary", short_name: "Dictionary", url: "/dictionary" },
    ],
  };
}
