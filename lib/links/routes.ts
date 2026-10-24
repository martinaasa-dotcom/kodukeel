/**
 * WHERE A LINK OPENS ON A PHONE: A NATIVE SCREEN, OR THE BROWSER.
 *
 * A native app meets links it did not make: the button in a letter, the path a
 * notification carries, an address somebody shared. For each it has to decide
 * whether one of its own screens answers or the browser does. The web knows its
 * routes and nothing said which of them a native app answers, so this is the
 * one table (docs/44-sixth-batch.md, R-4; docs/42-native-apps.md, section 3).
 *
 * Today's lesson, the review, a conversation, the dictionary and an entry,
 * Progress and Settings are native; so is the sign-in link, which is the one
 * path the app-link files claim before anything else. Everything else is the
 * browser until the native work order moves it, and moving one is a change to
 * this table and nothing else. `/course` and `/learn` lead to today's screen,
 * which is a lesson at A1 and the web above it (D15): the table says the
 * screen, and `/api/v1/today` says which.
 *
 * There is no row that matches everything. A path no row matches resolves to
 * null, and the unit test fails on every path a page, a letter or a
 * notification can produce that resolves to null, so a new letter cannot link
 * to a path nobody decided.
 *
 * Pure, and in the portable core a native app imports as it is
 * (`scripts/invariants/the-portable-core.ts`).
 */

/** The screens a native app has of its own. */
export const NATIVE_SCREENS = [
  "today", "lesson", "review", "conversation", "dictionary", "entry", "progress", "settings", "sign-in",
] as const;
export type NativeScreen = (typeof NATIVE_SCREENS)[number];

/** A native screen, or the browser. */
export type LinkHome = NativeScreen | "browser";

export interface RouteRow {
  /**
   * A web path in the shape the app's own folders spell it: `/course/lessons/[id]`
   * takes one segment as `id`, `/review/[...rest]` takes every segment after it.
   */
  readonly pattern: string;
  readonly home: LinkHome;
  /** Where a query parameter names a narrower screen: `/dictionary?q=lumi` is an entry. */
  readonly withQuery?: { readonly param: string; readonly home: NativeScreen };
}

/**
 * The table, first match wins. The native rows come first, so a catch-all for
 * the browser further down never takes a path a native screen answers.
 */
export const ROUTES: readonly RouteRow[] = [
  { pattern: "/course", home: "today" },
  { pattern: "/course/learn", home: "today" },
  { pattern: "/course/lessons", home: "today" },
  { pattern: "/course/lessons/[id]", home: "lesson" },
  { pattern: "/learn", home: "today" },
  { pattern: "/review", home: "review" },
  { pattern: "/situations/[id]", home: "conversation" },
  { pattern: "/dictionary", home: "dictionary", withQuery: { param: "q", home: "entry" } },
  { pattern: "/progress", home: "progress" },
  { pattern: "/settings", home: "settings" },
  { pattern: "/auth/callback", home: "sign-in" },
  { pattern: "/sign-in", home: "sign-in" },

  // The rest of the course and the rounds, on the web until a native screen exists.
  { pattern: "/course/[...rest]", home: "browser" },
  { pattern: "/learn/[...rest]", home: "browser" },
  { pattern: "/review/[...rest]", home: "browser" },
  { pattern: "/situations", home: "browser" },
  { pattern: "/dictionary/[...rest]", home: "browser" },
  { pattern: "/progress/[...rest]", home: "browser" },
  { pattern: "/words", home: "browser" },
  { pattern: "/words/[...rest]", home: "browser" },
  { pattern: "/practice", home: "browser" },
  { pattern: "/games", home: "browser" },
  { pattern: "/quest", home: "browser" },
  { pattern: "/sonad", home: "browser" },
  { pattern: "/crossword", home: "browser" },
  { pattern: "/read", home: "browser" },
  { pattern: "/scan", home: "browser" },
  { pattern: "/scan/[...rest]", home: "browser" },
  { pattern: "/tutor", home: "browser" },
  { pattern: "/grammar", home: "browser" },
  { pattern: "/grammar/[...rest]", home: "browser" },
  { pattern: "/exam", home: "browser" },
  { pattern: "/exam/[...rest]", home: "browser" },
  { pattern: "/assess", home: "browser" },
  { pattern: "/calendar", home: "browser" },
  { pattern: "/suggestions", home: "browser" },
  { pattern: "/start", home: "browser" },

  // A class, its board and its papers: a teacher's screens.
  { pattern: "/class", home: "browser" },
  { pattern: "/class/[...rest]", home: "browser" },

  // The public pages, read in a browser on any device.
  { pattern: "/", home: "browser" },
  { pattern: "/welcome", home: "browser" },
  { pattern: "/welcome/[...rest]", home: "browser" },
  { pattern: "/privacy", home: "browser" },
  { pattern: "/terms", home: "browser" },
  { pattern: "/trust", home: "browser" },
  { pattern: "/partners", home: "browser" },
  { pattern: "/accessibility", home: "browser" },
  { pattern: "/help", home: "browser" },
  { pattern: "/curriculum", home: "browser" },
  { pattern: "/how-we-know", home: "browser" },
  { pattern: "/impact", home: "browser" },
  { pattern: "/funding", home: "browser" },
  { pattern: "/pilots", home: "browser" },
  { pattern: "/teachers", home: "browser" },
  { pattern: "/state-exam", home: "browser" },
  { pattern: "/offline", home: "browser" },

  // The operator's screens.
  { pattern: "/admin/[...rest]", home: "browser" },
  { pattern: "/dev/[...rest]", home: "browser" },

  // Links that answer with a page of their own rather than a screen of the app.
  { pattern: "/api/email/unsubscribe", home: "browser" },
  { pattern: "/api/reminder", home: "browser" },
];

export interface Resolved {
  readonly home: LinkHome;
  /** The row that decided it, as the table spells it. */
  readonly pattern: string;
  /** The path's own segments a pattern names, by name; a catch-all is joined with `/`. */
  readonly params: Readonly<Record<string, string>>;
  /** The query, as the link carried it. */
  readonly query: Readonly<Record<string, string>>;
}

function segmentsOf(path: string): string[] {
  return path.split("/").filter((s) => s.length > 0);
}

function matchRow(pattern: string, segments: readonly string[]): Record<string, string> | null {
  const parts = segmentsOf(pattern);
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const rest = /^\[\.\.\.(\w+)\]$/.exec(part);
    if (rest) {
      if (segments.length <= i) return null;
      params[rest[1]!] = segments.slice(i).join("/");
      return params;
    }
    const one = /^\[(\w+)\]$/.exec(part);
    const segment = segments[i];
    if (segment === undefined) return null;
    if (one) params[one[1]!] = segment;
    else if (part !== segment) return null;
  }
  return segments.length === parts.length ? params : null;
}

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/**
 * Where a path opens on a phone, or null where no row decides it.
 *
 * Takes a path on this deployment (`/dictionary?q=lumi`), with or without its
 * query and fragment. A full address is for the caller to check first, with
 * `pathWithin` in `lib/push/notification.ts`, since a link to another site is
 * never this table's to answer.
 */
export function resolveLink(path: string): Resolved | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const withoutHash = path.split("#")[0]!;
  const at = withoutHash.indexOf("?");
  const pathname = at < 0 ? withoutHash : withoutHash.slice(0, at);
  const search = at < 0 ? "" : withoutHash.slice(at + 1);
  const query: Record<string, string> = {};
  for (const pair of search.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = decode((eq < 0 ? pair : pair.slice(0, eq)).replace(/\+/g, " "));
    query[key] = decode((eq < 0 ? "" : pair.slice(eq + 1)).replace(/\+/g, " "));
  }
  const segments = segmentsOf(pathname).map(decode);
  for (const row of ROUTES) {
    const params = matchRow(row.pattern, segments);
    if (!params) continue;
    const narrower = row.withQuery && query[row.withQuery.param] ? row.withQuery.home : null;
    return { home: narrower ?? row.home, pattern: row.pattern, params, query };
  }
  return null;
}
