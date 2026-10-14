import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { CSSProperties } from "react";
import { OfflineProvider } from "@/components/OfflineProvider";
import { OpenOnArrival } from "@/components/OpenOnArrival";
import { PlayOnce } from "@/components/motion/PlayOnce";
import { canonicalOrigin } from "@/lib/auth/canonical";
import { LOOP_SYNC_SCRIPT } from "@/lib/ux/loopSync";
import "./globals.css";

/**
 * Onest for all of the reading, Schibsted Grotesk for the few words set large.
 *
 * Onest carries Cyrillic as well as Latin Extended, and that decided it: most
 * people learning Estonian here read Russian or Ukrainian first, and an
 * interface in either would otherwise fall back to a different face mid-page.
 * It was Plus Jakarta Sans, which is also the face of a great many product
 * templates, and a page that looks like a template is read like one.
 *
 * Schibsted Grotesk is for display sizes alone (`--font-display`): the
 * wordmark, headings and the word set large on a card. It is a Nordic
 * newspaper grotesque, compact and confident, and unlike Anybody and
 * Bricolage Grotesque before it, its lowercase t ends in a real curved tail
 * rather than a flat cut, which is the whole reason it replaced them.
 * Schibsted Grotesk has no Cyrillic, so the stack falls back to Onest for a
 * headline in Russian rather than to a system face, exactly as before.
 *
 * Every subset Google serves is declared below with its unicode-range, so õ ä
 * ö ü š ž never fall back to a different face mid-word, which is the fault this
 * rule exists to prevent. What `preload` decides is which files are
 * *preloaded*, and that is a cost paid on every first screen: õ ä ö and ü are
 * in the basic Latin file, and only š and ž (and the letters of other
 * languages) need Latin Extended, which no first screen draws. So Latin
 * Extended is fetched the moment a glyph asks for it rather than ahead of the
 * page, which took 49 KB out of what a phone downloads before it can paint. Estonian and the English around it stay in one face, since a
 * prompt in one typeface and its four answers in another is most of this
 * app.
 */
/*
  THE FACES ARE FILES IN THIS REPOSITORY, SO A BUILD NEVER ASKS GOOGLE FOR THEM.

  They were loaded through `next/font/google`, which downloads both faces from
  fonts.googleapis.com during every `next build`. A build that cannot reach
  Google fails outright ("There was an issue establishing a connection while
  requesting https://fonts.googleapis.com/..."), measured here by building
  with the network cut. The sign-in suite's hosted build has no cache to fall
  back on, so on CI it was the build most exposed to a slow minute at Google,
  and a deployment's own build was exposed the same way. The files in
  `app/fonts/` are exactly what Google serves, one per subset, with the
  unicode-range Google gives each. They were downloaded once, sit beside their
  OFL licences, and change only when somebody replaces them on purpose.

  One call per subset, because `localFont` puts one unicode-range on every
  face a call declares: so each subset is its own family, and the stacks below
  put them back together as one face. A glyph is fetched only when a subset
  covers it, exactly as before. What is preloaded is unchanged: Onest's Latin
  and Cyrillic and Schibsted's Latin, for the reasons above. Cyrillic stays
  preloaded because every first screen draws some: the language switcher
  names Русский and Українська, and without the preload that file was found
  only after the first layout and held the first text back by most of a
  hundred milliseconds. Math and symbols are kept because `→`, on many card
  fronts, is in no other subset.

  The Latin call carries the size-adjusted Arial fallback next/font measures
  from the file, so text does not jump when the face arrives; it goes at the
  very end of the stack, because a fallback with no unicode-range ahead of a
  subset would draw that subset's letters in Arial.
*/
const onestLatin = localFont({
  src: "./fonts/onest-latin.woff2",
  weight: "100 900",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const onestLatinExt = localFont({
  src: "./fonts/onest-latin-ext.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

const onestCyrillic = localFont({
  src: "./fonts/onest-cyrillic.woff2",
  weight: "100 900",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116" }],
});

const onestCyrillicExt = localFont({
  src: "./fonts/onest-cyrillic-ext.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F" }],
});

const onestVietnamese = localFont({
  src: "./fonts/onest-vietnamese.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB" }],
});

const onestMath = localFont({
  src: "./fonts/onest-math.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0302-0303, U+0305, U+0307-0308, U+0310, U+0312, U+0315, U+031A, U+0326-0327, U+032C, U+032F-0330, U+0332-0333, U+0338, U+033A, U+0346, U+034D, U+0391-03A1, U+03A3-03A9, U+03B1-03C9, U+03D1, U+03D5-03D6, U+03F0-03F1, U+03F4-03F5, U+2016-2017, U+2034-2038, U+203C, U+2040, U+2043, U+2047, U+2050, U+2057, U+205F, U+2070-2071, U+2074-209F, U+20D0-20DC, U+20E1, U+20E5-20EF, U+2100-2112, U+2114-2115, U+2117-2121, U+2123-214F, U+2190, U+2192, U+2194-21AE, U+21B0-21E5, U+21F1-21F2, U+21F4-2211, U+2213-2214, U+2216-22FF, U+2308-230B, U+2310, U+2319, U+231C-2321, U+2336-237A, U+237C, U+2395, U+239B-23B7, U+23D0, U+23DC-23E1, U+2474-2475, U+25AF, U+25B3, U+25B7, U+25BD, U+25C1, U+25CA, U+25CC, U+25FB, U+266D-266F, U+27C0-27FF, U+2900-2AFF, U+2B0E-2B11, U+2B30-2B4C, U+2BFE, U+3030, U+FF5B, U+FF5D, U+1D400-1D7FF, U+1EE00-1EEFF" }],
});

const onestSymbols = localFont({
  src: "./fonts/onest-symbols.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0001-000C, U+000E-001F, U+007F-009F, U+20DD-20E0, U+20E2-20E4, U+2150-218F, U+2190, U+2192, U+2194-2199, U+21AF, U+21E6-21F0, U+21F3, U+2218-2219, U+2299, U+22C4-22C6, U+2300-243F, U+2440-244A, U+2460-24FF, U+25A0-27BF, U+2800-28FF, U+2921-2922, U+2981, U+29BF, U+29EB, U+2B00-2BFF, U+4DC0-4DFF, U+FFF9-FFFB, U+10140-1018E, U+10190-1019C, U+101A0, U+101D0-101FD, U+102E0-102FB, U+10E60-10E7E, U+1D2C0-1D2D3, U+1D2E0-1D37F, U+1F000-1F0FF, U+1F100-1F1AE, U+1F1E6-1F1FF, U+1F30D-1F30F, U+1F315, U+1F31C, U+1F31E, U+1F320-1F32C, U+1F336, U+1F378, U+1F37D, U+1F382, U+1F393-1F39F, U+1F3A7-1F3A8, U+1F3AC-1F3AF, U+1F3C2, U+1F3C4-1F3C6, U+1F3CA-1F3CE, U+1F3D4-1F3E0, U+1F3ED, U+1F3F1-1F3F3, U+1F3F5-1F3F7, U+1F408, U+1F415, U+1F41F, U+1F426, U+1F43F, U+1F441-1F442, U+1F444, U+1F446-1F449, U+1F44C-1F44E, U+1F453, U+1F46A, U+1F47D, U+1F4A3, U+1F4B0, U+1F4B3, U+1F4B9, U+1F4BB, U+1F4BF, U+1F4C8-1F4CB, U+1F4D6, U+1F4DA, U+1F4DF, U+1F4E3-1F4E6, U+1F4EA-1F4ED, U+1F4F7, U+1F4F9-1F4FB, U+1F4FD-1F4FE, U+1F503, U+1F507-1F50B, U+1F50D, U+1F512-1F513, U+1F53E-1F54A, U+1F54F-1F5FA, U+1F610, U+1F650-1F67F, U+1F687, U+1F68D, U+1F691, U+1F694, U+1F698, U+1F6AD, U+1F6B2, U+1F6B9-1F6BA, U+1F6BC, U+1F6C6-1F6CF, U+1F6D3-1F6D7, U+1F6E0-1F6EA, U+1F6F0-1F6F3, U+1F6F7-1F6FC, U+1F700-1F80B, U+1F810-1F847, U+1F850-1F859, U+1F860-1F887, U+1F890-1F8AD, U+1F8B0-1F8BB, U+1F8C0-1F8C1, U+1F8D0-1F8D8, U+1F900-1F90B, U+1F93B, U+1F946, U+1F984, U+1F996, U+1F9E9, U+1FA00-1FA6F, U+1FA70-1FA7C, U+1FA80-1FAC6, U+1FAC8, U+1FACC-1FADD, U+1FADF-1FAEB, U+1FAEF-1FAFA, U+1FB00-1FBFF" }],
});

const schibstedLatin = localFont({
  src: "./fonts/schibsted-grotesk-latin.woff2",
  weight: "600 800",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const schibstedLatinExt = localFont({
  src: "./fonts/schibsted-grotesk-latin-ext.woff2",
  weight: "600 800",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

/** A face's subsets as one family: every subset, then the Latin call's size-adjusted fallback. */
function stack(lead: { style: { fontFamily: string } }, ...rest: { style: { fontFamily: string } }[]) {
  const [face, ...fallback] = lead.style.fontFamily.split(/,\s*/);
  return [face, ...rest.map((font) => font.style.fontFamily), ...fallback].join(", ");
}

const FONT_VARIABLES = {
  "--font-onest": stack(onestLatin, onestLatinExt, onestCyrillic, onestCyrillicExt, onestVietnamese, onestMath, onestSymbols),
  "--font-schibsted": stack(schibstedLatin, schibstedLatinExt),
} as CSSProperties;

export const metadata: Metadata = {
  /*
    WHERE THE ABSOLUTE URLS IN THE TAGS BELOW ARE MEASURED FROM.

    `openGraph` was set and the share image it needs was not, and without a
    base neither the image nor `og:url` can be written at all: a share card
    wants absolute URLs and a page has no way to know its own host. This is
    the same `NEXT_PUBLIC_SITE_URL` the sign-in redirect is anchored on
    (lib/auth/canonical.ts), read through the same function, because a
    deployment cannot be canonical for sign-in and anonymous for the link
    somebody pastes into a message.

    Null where nobody set it, which is a fork running on its own domain. Next
    then leaves the URLs relative, exactly as it did before this existed, so
    the unset case is no worse than it was rather than wrong.
  */
  ...(canonicalOrigin() ? { metadataBase: canonicalOrigin()! } : {}),
  /*
    A title per screen, and a template so none of them has to remember the
    app's name.

    Thirty-four of the forty-five routes here set nothing, so every one of them
    was called "Kodukeel. Estonian that finally sticks" — the landing page's
    marketing line, in the browser tab, in the history and in the bookmark, on
    /review and /settings and /progress alike. Somebody with the review screen
    and the dictionary open side by side had two identical tabs, and somebody
    reading their history back had a column of the same sentence. The three
    pages that did set one each did it a different way ("Grammar · käänded",
    "What this app is · Kodukeel", "Offline. Kodukeel"), which is what a
    template is for.

    `default` is what a route without its own title gets, which is the landing
    page and nothing else worth naming.
  */
  title: {
    default: "kodukeel. Estonian that finally sticks",
    template: "%s | kodukeel",
  },
  description:
    "Estonian for the shop counter, the doctor's and the neighbor on the stairs. Fifteen minutes an " +
    "evening, conversations you can rehearse first, and one small thing to say out loud today.",
  icons: { icon: "/icon.svg" },
  applicationName: "kodukeel",
  appleWebApp: { capable: true, title: "kodukeel", statusBarStyle: "default" },
  openGraph: {
    title: "kodukeel. Estonian that finally sticks",
    description:
      "Fifteen minutes an evening, a conversation to rehearse, and one small thing to say to a real person today.",
    type: "website",
    siteName: "kodukeel",
    /*
      The app is written in English about Estonian, and it is read in Estonia.
      A share card says which language it is in so a reader in a Russian or
      Ukrainian speaking household is not shown it as though it were theirs.
    */
    locale: "en_EE",
    url: "/welcome",
  },
  /*
    THE BIG CARD RATHER THAN THE SMALL ONE.

    Without a declared card type this fell to `summary`, which is the narrow
    grey row with a favicon on it, and that is what a link to this app looked
    like in every message anybody has ever sent about it. `app/opengraph-image.tsx`
    is the picture; this is the line that asks for it to be shown at full size.
  */
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  /*
    One color, the light ground. The palette no longer follows the system
    (see the note over `[data-theme="dark"]` in globals.css), so a media query
    here would paint the browser chrome for a theme the page is not wearing.
    The toggle in the rail rewrites this tag when somebody chooses dark.
  */
  themeColor: "#fcfbf7",
  // The review screen is thumb-driven; zoom stays enabled because disabling it
  // is an accessibility failure, not a polish detail.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/*
  THE THEME, DECIDED BEFORE THE FIRST PAINT RATHER THAN AFTER IT.

  `ThemeToggle` writes `data-theme` on <html> from a `useEffect`, which runs
  after React has hydrated, which is after the browser has already painted.
  So a learner who chose dark got a full frame of the light palette on every
  single page load: a white flash, at whatever hour somebody who chose dark is
  most likely to be reviewing.

  There is no way to read `localStorage` from the server, so the only thing
  that can answer before paint is a blocking inline script. It is three lines,
  it runs once, and `suppressHydrationWarning` on <html> is what lets it write
  an attribute React did not render without React objecting on arrival.

  Nothing stored means nothing written, and bare `:root` in globals.css is the
  light palette, which is the default for everybody: the system's own dark
  setting is deliberately not read. A `try` around it because Safari throws on
  `localStorage` outright in private browsing rather than returning null, and
  a theme is not worth a blank page.
*/
const THEME_SCRIPT =
  "try{var t=localStorage.getItem('theme');" +
  "if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The font variable goes on <html>, not <body>: `--font-sans` is declared on
    // :root and references `--font-onest`, and a custom property is
    // substituted where it is *declared*, so the face has to be in scope there.
    <html lang="en" style={FONT_VARIABLES} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* The brand's idle loops on one clock, so a reload or a new page
            picks them up where they were (lib/ux/loopSync.ts). */}
        <script dangerouslySetInnerHTML={{ __html: LOOP_SYNC_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        {/* Registers the service worker and drains the offline grade queue, so
            it has to sit above both route groups — the offline fallback is
            reachable from either. */}
        <OfflineProvider>{children}</OfflineProvider>
        <OpenOnArrival />
        {/* One listener that lets every one-shot flourish land (components/motion/PlayOnce.tsx). */}
        <PlayOnce />
        {/*
          NO ANALYTICS SCRIPT, BECAUSE /privacy SAYS THERE IS NONE.

          Vercel Analytics was mounted here for every visitor of the hosted
          build. It posts the path of each page opened, the referrer and a
          derived visitor id to a company outside the European Economic Area,
          and it reaches signed-in learners as readily as strangers. The
          deployment's own notice says, in the section headed what is not
          stored: "No analytics, no advertising identifiers, no third-party
          trackers", and the generated recipients list, which exists so a
          reader is told which companies see what, never named Vercel. Two of
          the three could have been changed to make the third true. This app
          is for people whose data is the reason they are careful, and
          /api/metrics already answers whether anybody comes back, from this
          deployment's own database, which is what the notice describes.
        */}
      </body>
    </html>
  );
}
