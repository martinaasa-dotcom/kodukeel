/**
 * WHAT EACH STORE ASKS FOR, WITH WHERE IT SAYS SO AND THE DAY IT WAS READ.
 *
 * Read on 2026-10-24 for R-2 of docs/44-sixth-batch.md, and read by
 * `scripts/build-store-icons.mjs` and `scripts/shoot.mjs --store`, so a size
 * lives here once rather than once per script. A store changes these without
 * telling anybody: before a submission, open each `source`, and where it
 * disagrees, change the figure here and run both scripts again.
 *
 * `reread` says whether the figure was checked against its page on that day.
 * Where it is false the page did not say it in words we could read, and the
 * figure is what is generally known; `note` says which part.
 */
export const READ_ON = "2026-10-24";

export const SOURCES = {
  appleIcon: "https://developer.apple.com/design/human-interface-guidelines/app-icons",
  appleShots: "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications",
  androidAdaptive: "https://developer.android.com/develop/ui/views/launch/icon_design_adaptive",
  playAssets: "https://support.google.com/googleplay/android-developer/answer/9866151",
  webManifest: "https://web.dev/articles/add-manifest",
};

/** Every icon file the build writes, in the order it writes them. */
export const ICONS = [
  {
    file: "store/icons/ios-app-store-1024.png",
    width: 1024, height: 1024, alpha: false, square: true,
    for: "The App Store icon, and the one Xcode builds every home-screen size from",
    source: SOURCES.appleIcon, reread: true,
    note: "The page's table gives 1024x1024 px, square, with the system adding the rounded corners, and asks for an opaque full-bleed background. That App Store Connect refuses an icon carrying an alpha channel was not re-read; the file has none either way.",
  },
  {
    file: "store/icons/android-adaptive-foreground-432.png",
    width: 432, height: 432, alpha: true, safeZone: 264,
    for: "The Android adaptive icon's foreground layer: the tilde on transparency",
    source: SOURCES.androidAdaptive, reread: true,
    note: "Each layer is 108 by 108 dp and the inner 66 by 66 dp is never clipped. The page gives dp only; 432 and 264 are those at xxxhdpi, four times mdpi. The same file is the monochrome layer, as the page's own example does.",
  },
  {
    file: "store/icons/android-adaptive-background-432.png",
    width: 432, height: 432, alpha: false,
    for: "The Android adaptive icon's background layer: the violet tile, full bleed",
    source: SOURCES.androidAdaptive, reread: true,
    note: "A background layer may be a plain fill with no logo, which is what the page's own example is.",
  },
  {
    file: "store/icons/play-store-512.png",
    width: 512, height: 512, alpha: true, square: true,
    for: "The Google Play listing icon",
    source: SOURCES.playAssets, reread: true,
    note: "512 by 512, a 32-bit PNG with alpha allowed, at most 1024 KB. Drawn square and opaque, since Play rounds the corners itself.",
    maxBytes: 1024 * 1024,
  },
  {
    file: "store/icons/play-feature-graphic-1024x500.png",
    width: 1024, height: 500, alpha: false,
    for: "The Google Play feature graphic: the mark and the name on the night ground",
    source: SOURCES.playAssets, reread: true,
    note: "1024 by 500, JPEG or a 24-bit PNG with no alpha.",
  },
  {
    file: "public/app-icon-192.png",
    width: 192, height: 192, alpha: true,
    for: "The web manifest's 192 icon, for launchers that read no SVG",
    source: SOURCES.webManifest, reread: false,
    note: "192 and 512 are the two sizes Chrome's install criteria have asked for; not re-read on the day. Served from public/ because app/manifest.ts names it.",
  },
  {
    file: "public/app-icon-512.png",
    width: 512, height: 512, alpha: true,
    for: "The web manifest's 512 icon, and the splash screen an installed app opens on",
    source: SOURCES.webManifest, reread: false,
    note: "As above.",
  },
];

/**
 * The two phones a store screenshot is taken on. The viewport is CSS pixels
 * and the scale turns it into the pixels a store asks for, so the app is laid
 * out exactly as it is on that phone rather than drawn large.
 */
export const SHOT_PRESETS = {
  iphone69: {
    label: "iPhone, 6.9-inch display",
    viewport: { width: 440, height: 956 }, scale: 3,
    pixels: { width: 1320, height: 2868 },
    source: SOURCES.appleShots, reread: true,
    note: "The page names it 'iPhone with Dynamic Island (large display)', 1320 x 2868 portrait, up to ten per size, JPEG or PNG with no alpha channel. Only the medium display is strictly required, and App Store Connect scales the large set down for it.",
  },
  android: {
    label: "Android phone",
    viewport: { width: 360, height: 640 }, scale: 3,
    pixels: { width: 1080, height: 1920 },
    source: SOURCES.playAssets, reread: true,
    note: "320 to 3840 px a side with the longer side at most twice the shorter, so a 1080 x 2400 phone's own screen is refused. 1080 x 1920 is the 9:16 the page asks for before an app can be shown in its recommendation formats, which also wants at least four. Two to eight a device type, JPEG or a 24-bit PNG with no alpha.",
  },
};

/**
 * The screens a listing shows, in the order a reader meets them. Every one
 * is the demo learner from scripts/demo-data.ts, never a real person.
 */
export const STORE_SCREENS = [
  { name: "01-lesson", route: "/course/lessons/a1-08-neighbour", shows: "Today's lesson: a conversation to listen to before anything is asked" },
  { name: "02-review", route: "/review", shows: "A review card, with its answer shown" },
  { name: "03-conversation", route: "/situations/kohvikus", shows: "A conversation in progress, at a café counter" },
  { name: "04-dictionary", route: "/dictionary?q=tuba", shows: "A dictionary entry, with its forms and a sentence" },
  { name: "05-progress", route: "/progress", shows: "Progress, read off the learner's own answers" },
  { name: "06-check", route: "/course/check/check-a1.1", shows: "A part check, marked" },
];

/** The app's screens are in these languages; Estonian is for the public pages alone (D16). */
export const SHOT_LOCALES = ["en", "ru", "uk"];
