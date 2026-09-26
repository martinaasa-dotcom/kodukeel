/*
  THE PALETTE, AS HEX, BECAUSE AN EMAIL CLIENT HAS NO CUSTOM PROPERTIES.

  Every screen in this app paints from a token in `app/globals.css` and an
  invariant fails on a raw hex in `app/` or `components/`. An email is the one
  surface where that rule cannot hold: `var(--accent)` resolves to nothing in
  Gmail, in Outlook and in every client that rewrites a `<style>` block, so the
  value has to be written out.

  Written out *once*, here, and checked against the stylesheet. A hex typed
  into a letter is a sixth meaning nobody agreed to, exactly as it would be in
  a component; a hex typed here and never compared with the app is a palette
  that drifts one release at a time until the email stops looking like the
  thing it links to. `palette.test.ts` reads `app/globals.css` and asserts
  every value below is the one the app actually paints.

  LIGHT ONLY, AND THAT IS A DECISION. The dark theme is a real palette here
  and `prefers-color-scheme` reaches Apple Mail, iOS Mail and Outlook.com but
  not Gmail, which is most of the audience. A letter that is beautiful in the
  clients that support it and unreadable in the one that does not is worse than
  a letter that is the same everywhere, so the dark values ride as an
  enhancement in `layout.ts` and nothing load-bearing depends on them.
*/

/** The light theme, as `app/globals.css` declares it. Asserted, value by value. */
export const PALETTE = {
  ground: "#fffbf2",
  /** The card a letter is drawn on, which is the app's own card colour. */
  surface: "#ffffff",
  raised: "#fff1d9",
  ink: "#0f1233",
  ink2: "#3e4166",
  ink3: "#585b80",

  accent: "#5b2eff",
  accentInk: "#ffffff",
  accentSoft: "#ece5ff",
  accentDeep: "#4719e0",

  mint: "#00c2a8",
  mintSoft: "#d6f7f1",
  mintInk: "#03695c",

  peach: "#ef3e36",
  peachSoft: "#ffe2df",
  peachInk: "#a81e18",

  butter: "#ffc400",
  butterSoft: "#fff3c2",
  butterInk: "#735000",
} as const;

/**
 * Which token in the stylesheet each of the above is, for the test to compare.
 *
 * A second table rather than a naming convention, because the mapping is not
 * mechanical: `ink2` is `--ink-2` and `accentSoft` is `--accent-soft`, and a
 * regex that guessed would pass on a key it guessed wrong about.
 */
export const TOKEN_OF: Readonly<Record<keyof typeof PALETTE, string>> = {
  ground: "--ground",
  surface: "--surface",
  raised: "--raised",
  ink: "--ink",
  ink2: "--ink-2",
  ink3: "--ink-3",
  accent: "--accent",
  accentInk: "--accent-ink",
  accentSoft: "--accent-soft",
  accentDeep: "--accent-deep",
  mint: "--mint",
  mintSoft: "--mint-soft",
  mintInk: "--mint-ink",
  peach: "--peach",
  peachSoft: "--peach-soft",
  peachInk: "--peach-ink",
  butter: "--butter",
  butterSoft: "--butter-soft",
  butterInk: "--butter-ink",
};

/**
 * The dark theme, for the `prefers-color-scheme` block alone.
 *
 * Only the handful a letter actually repaints. A letter is a card on a ground
 * with ink on it and one button, so five values cover it, and every one of
 * them is measured in the stylesheet against the same ground the app uses.
 */
export const DARK = {
  ground: "#080a1f",
  surface: "#101433",
  raised: "#1a1f4a",
  ink: "#f2f3ff",
  ink2: "#c4c8ec",
  accentSoft: "#26215c",
} as const;

export const DARK_TOKEN_OF: Readonly<Record<keyof typeof DARK, string>> = {
  ground: "--ground",
  surface: "--surface",
  raised: "--raised",
  ink: "--ink",
  ink2: "--ink-2",
  accentSoft: "--accent-soft",
};
