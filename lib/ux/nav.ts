/**
 * Every destination in the app, and which of five places it lives in.
 *
 * FIVE ROWS, BECAUSE A RAIL IS READ AT A GLANCE AND NOT LEARNED.
 *
 * The rail used to list fourteen destinations under four headings. Every one of
 * them was a true answer to "where do I go for this", and together they were a
 * column somebody had to read before they could press anything, which was
 * reported plainly as too busy by the person using it. Most of those rows are
 * opened once a month: a calendar, a mock paper, a list of decks. A row that is
 * pressed once a month is a row read past every other evening.
 *
 * So the rail holds the five places an evening actually goes, Today, Learn,
 * Practice, Dictionary and Progress, and everything else carries `within` and
 * lives on the screen of the place it belongs to, where
 * `components/InsideHere.tsx` lists it. Nothing is deleted and nothing is behind
 * a button marked "More": the command palette still finds every destination,
 * the phone sheet lists them all under their five homes, and a learner who
 * does open the calendar every morning pins it back into the rail from the
 * menu under their name (`lib/ux/navOrder.ts`). That is the difference from
 * the disclosure this module was written to remove: a pin is a choice somebody
 * made about their own column, where "More" was the app choosing to hide half
 * of itself from everybody.
 *
 * Nothing here decides *whether* to show a destination. That question is
 * `lib/ux/disclosure.ts`, it is about what a screen leads with, and it is a
 * different question from where a thing lives.
 *
 * One table, read by three surfaces: the desktop rail, the phone sheet and the
 * command palette. Three copies of a list of screens is how a screen ends up
 * reachable from two of them and missing from the third.
 *
 * Pure: strings in, strings out. The icon is a lucide *name* and
 * `components/icons.tsx` is the only place that turns one into a component,
 * which is what keeps this file importable by a unit test.
 */

/** A hue from the palette. Five of them, and each one means something. */
export type Tone = "accent" | "sky" | "butter" | "blush" | "ink";

export interface Destination {
  /** Where it goes. The rail matches the current path against this. */
  href: string;
  /** What it is called, everywhere it appears. */
  label: string;
  /** One line saying what it is for. The sheet and the palette show it. */
  blurb: string;
  /** A lucide icon name. See components/icons.tsx. */
  icon: string;
  /** The dot behind the icon when the destination is current. */
  tone: Tone;
  /** Words somebody might type when looking for it. */
  keywords: string;
  /**
   * In the phone bar, which holds four destinations and a button for the rest.
   * Four rather than five because a thumb needs 44px and the fifth cell is how
   * you reach everything else.
   */
  bar?: boolean;
  /**
   * Reached from somewhere else, so the rail does not carry a row for it.
   *
   * Never "hidden": each of these is on the screen it belongs to, in the place
   * a learner is already standing when they want it, and all of them stay in
   * the command palette. The rail is a list of *places*; this is for the ones
   * that are really a part of another place.
   *
   *   - `/tutor` — Anu sits in the bottom right corner of every signed-in
   *     screen (`components/anu/AnuFab.tsx`, mounted in the layout), so a row
   *     marked "Ask Anu" was a second door onto a room whose door is always
   *     open. The page stays a destination because the grammar pages, the leech
   *     clinic and a review card all link to it with a question already written.
   *   - `/scan` — a way of getting words *in*, which is what the dictionary is
   *     for. It sat under "Look it up", which is not what it does.
   *   - `/dictionary/common` — the commonest words are a way *into* the
   *     dictionary rather than a place beside it, and the screen somebody is
   *     standing on when they want a list of words to learn is the one with a
   *     search box on it.
   *   - `/course` — the planned evening, which is where the Learn row goes
   *     and is the list every one of its steps hangs under, so Learn is its
   *     home row. The card at the top of Today opens it too.
   *   - `/situations` — a conversation is one more way of using a word, and
   *     it is on Practice beside the rounds.
   *   - `/calendar` — how the weeks are going, so it is under Progress; a
   *     learner who opens it daily pins it back into the rail.
   *   - `/words/mastery` — a reading of how it is going, under Progress.
   *   - `/words/decks` — the learner's own shelves, under Progress beside the
   *     deck they file.
   *   - `/grammar` — the rule behind a word, reached from the page you look
   *     the word up on.
   *   - `/review` — the schedule working, which is one of the ways Practice
   *     asks a word you have already learned rather than a place beside it.
   *     It leads that page, because on a day with cards due it is the thing to
   *     press.
   *
   * The value is where it is reached from, so this file says so rather than
   * leaving the next reader to find out, and it names a place the rail lists.
   * One level in is a signpost on the screen you are standing on; two is
   * nowhere, which is what `/words/mastery` was for a while by pointing at
   * `/words`, itself reached from `/progress`. Asserted in `nav.test.ts`.
   */
  within?: string;
}

export interface NavSection {
  id: string;
  /** The heading over the group. */
  title: string;
  /** Why these belong together. Shown in the phone sheet, under the heading. */
  blurb: string;
  items: Destination[];
}

/**
 * The four questions, in the order a day asks them, and then the app itself.
 *
 * `app` is last and is the only group the rail pins to the bottom, because
 * settings and the honest description of what this thing cannot do are not
 * somewhere you go, they are somewhere you end up.
 */
export const SECTIONS: NavSection[] = [
  {
    id: "daily",
    title: "Every day",
    blurb: "Learn new words, keep the old ones fresh, and try them out.",
    items: [
      {
        href: "/", label: "Today", blurb: "What's waiting for you today, and your streak", icon: "Sun", tone: "butter",
        keywords: "home dashboard streak quest goal errand word of the day", bar: true,
      },
      /*
        WHERE THE "REVIEW" ROW USED TO BE, AND WHY IT IS NOT THAT ANY MORE.

        The daily row said Review, and what it opened was everything at once:
        the cards that were due, and a trickle of words the learner had never
        seen, taught in among them. That is one screen answering two questions.
        Reviewing is keeping a memory alive and needs a schedule; learning a
        word is building one and needs to be walked up, met, then picked out of
        four, then produced in a sentence.

        So the daily row is Learn, and it goes to the ladder and to the course
        the words come out of. What is due is Practice's, which is where every
        other way of asking a word you already know already lived.
      */
      /*
        THE PLANNED EVENING LIVES UNDER LEARN.

        It had a row of its own under Today, and the row and the card said the
        same thing twice on the one screen everybody opens, so it went inside
        Today. That made the list light Today while every step on it lit
        Learn, with today's steps hung under that row
        (`components/Sidebar.tsx`), so pressing a step moved the rail's marker
        from one row to another for a screen that had not changed place. The
        evening is the course and Learn is the course's row, so Learn lights on
        the list as it does on each step. Today's card still opens it.
      */
      {
        href: "/course", label: "Today's module", blurb: "Today's words and games, already picked for you",
        icon: "CalendarCheck", tone: "accent",
        keywords: "course planned programme a1 module day guided plan lesson schedule step by step",
        within: "/learn",
      },
      {
        href: "/learn", label: "Learn", blurb: "New words, five at a time, straight from the course",
        icon: "Sparkles", tone: "sky",
        keywords: "new words learn course units path lessons syllabus vocabulary teach",
        bar: true,
      },
      {
        href: "/practice", label: "Practice", blurb: "What's due, plus sprints, matching, sentences and games",
        icon: "Swords", tone: "blush", keywords: "games modes drill weakest case review due srs flashcards",
        bar: true,
      },
      /*
        Reached from Practice rather than standing beside it, and this is the
        one row that moved rather than being renamed. `/review` is the schedule
        working: it asks the words a learner has already produced once, at the
        moment they are about to forget them. Every other way of asking those
        same words is already on Practice, so a row of its own put the daily
        loop in two places and left the learner to work out which was which.
      */
      {
        href: "/review", label: "Review", blurb: "Everything due, right before you'd forget it",
        icon: "GraduationCap", tone: "accent", keywords: "flashcards srs study due schedule",
        within: "/practice",
      },
      /*
        On Practice beside the rounds, because a conversation is the fourth
        thing you do with a word: use it on somebody who wants something from
        you. A five to eight minute sitting rather than a daily obligation, so
        it is not a row of its own.
      */
      {
        href: "/situations", label: "Situations", blurb: "Book a doctor, order a coffee, call your landlord",
        icon: "MessagesSquare", tone: "sky",
        keywords: "conversation scene role play speaking doctor counter landlord",
        within: "/practice",
      },
    ],
  },
  {
    id: "lookup",
    title: "Look it up",
    blurb: "Any word, any ending, and why it works that way.",
    items: [
      {
        href: "/dictionary", label: "Dictionary", blurb: "Look up any word, in any form", icon: "BookOpen",
        tone: "sky", keywords: "search lookup declension cases forms", bar: true,
      },
      {
        href: "/grammar", label: "Grammar", blurb: "What each of the fourteen cases is for", icon: "Languages",
        tone: "butter", keywords: "cases reference partitive genitive inessive endings rules seesutlev",
        within: "/dictionary",
      },
      {
        /*
          Where the endings start, which is the screen before the reference.
          A part of the grammar pages rather than a place beside them: it
          walks one word through the system the fourteen cards explain, and it
          is the first thing on the top of that page.
        */
        href: "/grammar/build-a-word", label: "Build a word",
        blurb: "Learn three forms of a word and get eleven more for free", icon: "Puzzle",
        tone: "butter", within: "/dictionary",
        keywords: "cases introduction beginner stem genitive omastav endings how it works walkthrough learn system",
      },
      {
        /*
          Where the endings stop being predictable. A part of the grammar
          reference rather than a place beside it: the whole point of the area
          is what it says about the pattern that page teaches, and it is linked
          from the top of it. See `lib/estonian/exceptions.ts`.
        */
        href: "/grammar/exceptions", label: "Exceptions",
        blurb: "The words that break the usual rules", icon: "TriangleAlert",
        tone: "butter", within: "/dictionary",
        keywords: "irregular exception gradation stem change tuppa illative unpredictable memorize astmevaheldus",
      },
      {
        href: "/dictionary/common", label: "Commonest words",
        blurb: "The 400 words Estonians use most, in four lists", icon: "TrendingUp",
        tone: "sky", within: "/dictionary",
        keywords: "frequency common most used top 100 hundred subtitles corpus first learn order",
      },
      {
        href: "/scan", label: "Scan a page", blurb: "Photograph a word list and turn it into cards",
        icon: "Camera", tone: "sky", within: "/dictionary",
        keywords: "camera photo picture ocr homework textbook handout import paper digitize digitize",
      },
      {
        href: "/tutor", label: "Ask Anu", blurb: "Ask your tutor anything about Estonian", icon: "MessageCircleQuestion",
        tone: "blush", keywords: "ai chat grammar help tutor explain",
        within: "the button in the corner of every screen",
      },
    ],
  },
  {
    id: "course",
    title: "How it's going",
    blurb: "Your week ahead, and how far you've come.",
    items: [
      /*
        Under Progress, because a calendar is how the weeks are going. Somebody
        who opens it before anything else pins it into their own rail.
      */
      {
        href: "/calendar", label: "Calendar", blurb: "Your classes, study times and what's due",
        icon: "CalendarDays", tone: "sky",
        keywords: "calendar week class schedule timetable homework reminder due plan tasks",
        within: "/progress",
      },
      {
        href: "/class", label: "Classes", blurb: "Teach a class, or join one", icon: "School", tone: "sky",
        keywords: "classroom teacher students join code school",
        within: "/progress",
      },

      {
        href: "/progress", label: "Progress", blurb: "What's sticking, what isn't, and when you study", icon: "ChartNoAxesColumn",
        tone: "accent", keywords: "stats charts history retention leaderboard",
      },
      /*
        These four are all readings of the same question and Progress is where
        it is asked, so they are reached from there rather than standing beside
        it as four more rows. Each was already linked from that page or is now:
        the deck under what has stuck, the level check under the CEFR reach it
        reports, the mock exam under both, and a class beside the leaderboard
        that only a class makes sense of.
      */
      {
        href: "/words", label: "My words", blurb: "Every word you're learning, card by card", icon: "Layers", tone: "sky",
        keywords: "deck cards suspend delete lapses",
        within: "/progress",
      },
      {
        /*
          Which words are known, which are nearly, and which keep going wrong.
          It had a row of its own for a while, after two placements left it
          three steps down a column that never mentioned it. It lives under
          Progress now, one level in, which is what `nav.test.ts` asks of every
          `within`: Progress lists it on its own screen, and a learner who looks
          at it every day pins it back into the rail.
        */
        href: "/words/mastery", label: "Word mastery",
        blurb: "Your favorites, what you've mastered and what needs work", icon: "Trophy", tone: "sky",
        // The starred words are on this page too, and a learner looking for
        // them types "favorites" rather than "mastery".
        keywords: "mastered known struggling almost progress words list stuck weak "
          + "favorites favorites starred star saved bookmarks kept",
        within: "/progress",
      },
      {
        /*
          A learner's own named shelves over the one review pool: playlists
          for a single library rather than a second copy of it. Reached from
          `/words`, where "add words" already lives, and no `within` of its
          own for the reason `/words/mastery` states above it: `/words` is
          one level in already, and a second `within` on top of it is a
          signpost nothing lists.
        */
        href: "/words/decks", label: "Decks",
        blurb: "Make your own word lists and add to them as you go", icon: "Library",
        tone: "sky",
        keywords: "deck decks playlist playlists shelf shelves organize organise folder collection",
        within: "/progress",
      },
      {
        /*
          Which of the course's situations you could follow, take part in or
          lead. A reading of "how am I doing" in the terms somebody outside
          the app asks it, so it lives under Progress with the other three.
        */
        href: "/progress/readiness", label: "In real life",
        blurb: "Which real conversations you could follow, join or lead", icon: "Footprints", tone: "sky",
        keywords: "readiness situations conversation real life ready lead follow take part speak counter shop doctor",
        within: "/progress",
      },
      {
        href: "/assess", label: "Level check", blurb: "Find out your level in reading, listening, writing and speaking",
        icon: "Compass", tone: "blush",
        keywords: "assessment placement cefr level a1 a2 b1 b2 c1 goal plan timeline",
        within: "/progress",
      },
      {
        href: "/exam", label: "Mock exam", blurb: "A practice run at the state language exam",
        icon: "ClipboardCheck", tone: "blush",
        keywords: "tasemeeksam a2 b1 b2 c1 citizenship certificate ready confidence",
        within: "/progress",
      },
    ],
  },
  {
    id: "app",
    title: "This app",
    blurb: "Your settings, and the fixes you've suggested.",
    items: [
      {
        href: "/settings", label: "Settings", blurb: "Your goal, how cards ask you, sound and backups", icon: "Settings", tone: "ink",
        keywords: "backup export import goal preferences delete account theme",
      },
      /*
        The learner's own reports, and the door to the review queue for whoever
        reviews them. Everybody gets this entry rather than only admins, and
        that is a decision about cost as much as about design: `isAdmin` asks
        Supabase who is signed in, and gating a rail link on it would spend
        that call on every page in the app to decide whether to draw one link.
        The queue is one click from here, and the page is worth having for
        everybody anyway, since "what happened to the thing I reported" is the
        question that decides whether anybody reports a second one.
      */
      {
        href: "/suggestions", label: "Suggested fixes",
        blurb: "What you've reported, and what happened next",
        icon: "MessageSquareWarning", tone: "blush",
        keywords: "report wrong mistake feedback correction missing word fix suggest admin review",
      },
    ],
  },
];

/**
 * The sections the rail draws: the places, minus the ones that live inside a
 * place.
 *
 * `app` is the footer rather than somewhere you go, and a `within` destination
 * is reached from the screen it belongs to. Both stay in `SECTIONS`, so the
 * command palette finds them; neither earns a row in a column somebody reads
 * top to bottom.
 */
export const PLACES = SECTIONS
  .filter((s) => s.id !== "app")
  .map((s) => ({ ...s, items: s.items.filter((i) => !i.within) }))
  .filter((s) => s.items.length > 0);

/** Every destination, flat, in the order the sections put them in. */
export const DESTINATIONS: Destination[] = SECTIONS.flatMap((s) => s.items);

/** Everything the rail and the phone sheet list, as opposed to everything there is. */
export const LISTED: Destination[] = DESTINATIONS.filter((d) => !d.within);

/** The four in the phone bar. Everything else is one press away in the sheet. */
export const BAR = DESTINATIONS.filter((d) => d.bar);

/**
 * Whether a path is inside a destination.
 *
 * Root is exact or every page would be "Today"; everything else matches its
 * subtree, so a unit page lights Course and a sprint lights Review.
 */
export function isUnder(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The five rows every rail starts with, in the order the sections give them.
 *
 * Read off `PLACES` rather than typed, so a place added to the table arrives
 * here by existing. These are the rows a learner can reorder and cannot
 * remove: a rail with no way back to Today is a rail somebody gets lost in.
 */
export const CORE: Destination[] = PLACES.flatMap((s) => s.items);

/**
 * What may be pinned into the rail: every place that lives inside one of the
 * five, and nothing that is a control rather than a page. Anu's `within` is a
 * sentence about a button, so she is not on it.
 */
export const PINNABLE: Destination[] = DESTINATIONS.filter((d) => d.within?.startsWith("/"));

/**
 * Which row of a rail lights for the page somebody is on.
 *
 * The row whose own page it is, or else the row the page lives inside, so a
 * learner on the grammar reference still sees that they are in the dictionary
 * and one in a sprint that they are in Practice. The longest match wins, which
 * is what lets a pinned Grammar row light for `/grammar` rather than its home.
 * Null on a page no row names, which is Settings and the reports, reached from
 * the menu under the learner's name.
 */
export function litRow(rows: readonly Destination[], pathname: string): string | null {
  const hrefs = new Set(rows.map((r) => r.href));
  let best: { href: string; length: number } | null = null;
  const consider = (row: string, matched: string) => {
    if (!hrefs.has(row)) return;
    if (!best || matched.length > best.length) best = { href: row, length: matched.length };
  };
  for (const d of DESTINATIONS) {
    if (!isUnder(d.href, pathname)) continue;
    consider(d.href, d.href);
    if (d.within?.startsWith("/")) consider(d.within, d.href);
  }
  // A row the table does not hold, which is a class the learner belongs to
  // (`lib/ux/classRows.ts`), lights for its own page and everything under it.
  for (const r of rows) if (isUnder(r.href, pathname)) consider(r.href, r.href);
  return (best as { href: string } | null)?.href ?? null;
}
