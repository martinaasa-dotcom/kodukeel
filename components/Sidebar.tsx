"use client";

import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { usePathname, useRouter } from "next/navigation";
import { Check, LogOut, MessageSquareWarning, MoreHorizontal, Moon, Settings, SlidersHorizontal, Sun, X } from "lucide-react";
import { type CSSProperties, Fragment, useCallback, useEffect, useRef, useState } from "react";
import { supabaseConfigured } from "@/lib/auth/mode";
import { useDockClearance } from "@/lib/layout/dockClearance";
import { useNavMarker } from "@/lib/layout/navMarker";
import { useOffline } from "@/components/OfflineProvider";
import { outboxSize } from "@/lib/offline/db";
import { forgetThisDevice } from "@/lib/offline/forget";
import { BAR, CORE, DESTINATIONS, isUnder, litRow, PINNABLE, SECTIONS, type Destination, type NavSection } from "@/lib/ux/nav";
import { isCoreRow, railRows } from "@/lib/ux/navOrder";
import { classRows, type RailClass } from "@/lib/ux/classRows";
import { NavEditor } from "@/components/nav/NavEditor";
import { NavMarker } from "@/components/NavMarker";
import { Wordmark } from "@/components/brand";
import { BrandLink } from "@/components/BrandLink";
import { NamedIcon } from "@/components/icons";
import { useModalFocus } from "@/components/useModalFocus";
import { useModuleFocus, useModuleSteps, type ModuleStepRow } from "@/components/course/moduleFocus";

/**
 * The rail, and the phone bar under it.
 *
 * Every destination is on the rail, all the time, under the heading for the
 * question it answers. There is no "More" here and there is nothing behind it.
 *
 * There used to be. Four links were promoted, the other twelve sat behind a
 * disclosure, and it had a bug you only met once you used the app: the group
 * opened itself whenever the current page was inside it, so on Practice or
 * Progress or Grammar the button read "Less" and pressing it did nothing.
 * `showRest` was `railOpen || secondaryActive`, the click flipped `railOpen`,
 * and the second half of that held the rail open regardless.
 *
 * Fixing the toggle was the small half of the fix. Sixteen links behind a
 * button marked "More" are not fewer links, they are the same links somewhere
 * you have to remember; four headings over the same sixteen are four short
 * answers to "where do I go for this", and they cost nothing to read past.
 * `lib/ux/nav.ts` is the one table of what goes where, and the phone sheet and
 * the command palette read it too, so a new screen cannot arrive on two of the
 * three surfaces.
 *
 * Routes that own the whole screen — the landing page, sign-in, first-run
 * setup — live in `app/(chromeless)/` and never render this at all, which is
 * why there is no path list here to keep in sync.
 */
export function Sidebar({ order: stored, name, classes = [] }: {
  order: readonly string[]; name: string | null; classes?: readonly RailClass[];
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  /*
    The learner's own order, held here so a change in the editor moves the
    rail under their hand rather than on the next page. The layout's value
    replaces it whenever the server sends a new one.
  */
  const [order, setOrder] = useState<readonly string[]>(stored);
  const storedKey = stored.join(" ");
  useEffect(() => setOrder(storedKey.split(" ")), [storedKey]);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bar, setBar] = useState<HTMLElement | null>(null);
  /*
    One pill per surface, traveling from the place you left to the place you
    asked for. The rail runs down its column and the bar runs across, which is
    the only difference between the two: `lib/layout/navMarker.ts` measures the
    cells and `app/nav.css` says how a pane behaves once it has been placed.
  */
  const railMarker = useNavMarker("rail", "y");
  const barMarker = useNavMarker("bar", "x");

  // Published on <html> so the offline banner, the install prompt and the
  // toasts can sit clear of this bar rather than each guessing its height.
  useDockClearance(bar);

  useEffect(() => { setMoreOpen(false); setMenuOpen(false); }, [pathname]);

  /*
    The sheet takes the caret on the cross in its corner rather than on the
    scrim, which is the first thing in it and is a close target with nothing to
    read. Tab stays inside, and closing hands the caret back to More, which
    stays on the bar the whole time.
  */
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetClose = useRef<HTMLButtonElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  useModalFocus(moreOpen, sheetRef, { initial: sheetClose, fallback: moreButton });

  // Escape closes the sheet. A sheet with no way out but a small X in its
  // corner is a sheet somebody taps around the edges of.
  useEffect(() => {
    if (!moreOpen) return;
    // The review, lesson and ladder sessions bind Enter, the digits and u
    // straight onto window, so any of those pressed with a Bluetooth
    // keyboard while this sheet is open used to still reach whatever card
    // was open behind it. Capturing here, ahead of those bubble-phase
    // listeners, and stopPropagation rather than preventDefault is what
    // blocks that while leaving native link and button activation, and the
    // sheet's own scrolling, untouched.
    const onKey = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [moreOpen]);

  const measure = useCallback((node: HTMLElement | null) => setBar(node), []);

  const active = (href: string) => isUnder(href, pathname);
  const rows = railRows(order);
  /*
    The classes the learner is in, under their own rows. Not part of `order`,
    because they are not a choice about the column: they arrive when somebody
    joins and go when they leave or the class is archived.
  */
  /*
    INSIDE TODAY'S MODULE THE RAIL IS THE SAME RAIL, WITH LEARN LIT AND THE
    EVENING HUNG UNDER IT.

    A step opens a practice round, a grammar page or the review queue, and
    lighting the row those live under would say the learner had wandered off to
    Practice in the middle of an evening they are walking. So Learn is lit,
    whatever the path, and today's steps are listed under it. The class group
    is not drawn: nothing about tonight is in it, and a column that grows a
    second section during a module is a column with more in it than the room
    it is in.
  */
  const focus = useModuleFocus();
  const tonight = useModuleSteps();
  const classLinks = focus ? [] : classRows(classes);
  const lit = focus ? LEARN_HREF : litRow([...rows, ...classLinks], pathname);
  /*
    The phone sheet is every place under the five homes, whether or not the
    learner pinned it: the rail is a column somebody chose, and the sheet is
    where a phone goes looking for everything else. A home that sits in the
    bar heads its group without repeating its own link.
  */
  const sheet: NavSection[] = CORE.map((place) => ({
    id: place.href,
    title: place.label,
    blurb: "",
    items: [
      ...(place.bar ? [] : [place]),
      ...PINNABLE.filter((d) => d.within === place.href),
    ],
  })).filter((section) => section.items.length > 0);
  const app = SECTIONS.find((s) => s.id === "app")?.items ?? [];
  const barLit = litRow(BAR, pathname);
  const today = BAR.find((d) => d.href === "/");
  const others = BAR.filter((d) => d.href !== "/");
  const dock = today ? [...others.slice(0, 2), today, ...others.slice(2)] : BAR;
  const restActive = barLit === null && DESTINATIONS.some((d) => active(d.href));

  return (
    <>
      {/*
        The desktop rail. Two boxes rather than one, and the split is the
        whole point.

        Every destination plus four headings and a rule comes to more than a
        laptop is tall, so this column has always scrolled. The scroll was on
        the nav itself, which meant the wordmark went with it: reach the
        bottom of the list and the app's own name has left the screen, and the
        one fixed thing in the layout is the piece that moved. It stays put
        now. The nav holds the height and no longer scrolls, the wordmark is
        its first child, and the list below it is the scroll container.

        Split rather than `position: sticky` on the wordmark, because a sticky
        header has to hide what passes beneath it and there is nothing here to
        hide it with. This rail is transparent over the fixed pastel wash, so a
        solid fill behind the wordmark would be a flat rectangle sitting on a
        gradient, and the one thing that hides a moving backdrop without a fill
        is a `backdrop-filter`, which this app does not put over moving content
        (see the phone bar below). A second scroll container costs none of
        that: the rows are simply clipped at its top edge, which is what every
        other scroller in the app already does.
      */}
      {/*
        MARKED SO A CONVERSATION CAN TAKE IT OFF THE SCREEN.

        `data-chrome` is the one hook `:root[data-scene]` hides by, and it is an
        attribute here rather than a selector guessing at this markup: a rule
        written against a shape stops matching the day somebody moves a div, and
        it fails by quietly leaving the website drawn around a screen that is
        supposed to be a room (app/globals.css, components/scene/SceneStage.tsx).
      */}
      <nav
        data-chrome="rail"
        aria-label="Main"
        className="rail sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r px-4 pb-4 pt-6 md:flex"
        style={{ borderColor: "var(--rule-soft)" }}
      >
        {/*
          A link to Today, and the largest thing in the column on purpose: the
          name of the app is the one object on every screen, and at the size a
          row is drawn it read as one more row. See `.brand-tap` in
          app/globals.css for the tint and the growth.
        */}
        <BrandLink
          href="/"
          title="Today"
          className="brand-tap tap-tint mb-7 mr-1 block shrink-0 cursor-pointer rounded-[var(--r)] px-2 py-2"
        >
          <span className="brand-mark">
            <Wordmark size={48} subtitle="Estonian, daily" />
          </span>
        </BrandLink>

        {/*
          FIVE ROWS AND WHATEVER THE LEARNER PINNED, IN THE ORDER THEY SET.

          No headings and nothing to open. Fourteen rows under four headings
          were four short answers to "where do I go for this", and together a
          column somebody had to read before pressing anything. Five rows are
          read at a glance, and everything else is inside one of them
          (`lib/ux/nav.ts`), on the screen of the place it belongs to. The page
          you are on lights its home row, so the grammar reference still says
          you are in the dictionary.

          The well is still the offset parent the marker measures from, and
          still a scroller, though at five rows and at most four pins it fits
          any laptop: the scroll is the backstop for a window somebody has
          dragged short, not the design.
        */}
        {/*
          Room on every side for the marker's ring and its shadow. This is a
          scroll container, so it clips whatever is drawn past its padding
          box: with none above the first row, the 1px outline round Today was
          cut off along its top, in both themes. The negative margins give the
          room back so the rows stay where they were.
        */}
        <div
          ref={railMarker.ref}
          data-nav-marked={railMarker.mark ? "" : undefined}
          className="scroll-host relative isolate -ml-2 -mr-4 -mt-2 -mb-3 flex min-h-0 flex-1 flex-col gap-1 pb-3 pl-2 pr-4 pt-2"
          style={
            {
              "--nav-marker-bg": "var(--surface)",
              "--nav-marker-shadow": "0 0 0 1px var(--edge), var(--depth-sm)",
            } as CSSProperties
          }
        >
          <NavMarker state={railMarker} />
          {rows.map((item) => (
            <Fragment key={item.href}>
              <RailLink item={item} active={lit === item.href} pinned={!isCoreRow(item.href)} />
              {focus && item.href === LEARN_HREF && <TonightRows steps={tonight} at={focus.stepId} />}
            </Fragment>
          ))}
          {classLinks.length > 0 && (
            <div
              role="group"
              aria-labelledby="rail-classes"
              data-rail-classes
              className="mt-2 flex flex-col gap-1 border-t pt-3"
              style={{ borderColor: "var(--rule-soft)" }}
            >
              <span id="rail-classes" className="px-3.5 text-xs font-semibold" style={{ color: "var(--ink-3)" }}>
                {classLinks.length === 1 ? "Your class" : "Your classes"}
              </span>
              {classLinks.map((item) => (
                <RailLink key={item.href} item={item} active={lit === item.href} pinned={false} classRow />
              ))}
            </div>
          )}
        </div>

        {/*
          Everything that is about the learner rather than about Estonian, under
          their name: pinning and ordering this column, Settings, what they have
          reported, the theme and signing out. They are opened a few times a
          year, and a row each was most of the old column's clutter.
        */}
        <div className="relative mt-3 border-t pt-3" style={{ borderColor: "var(--rule-soft)" }}>
          {menuOpen && (
            <AccountMenu
              onClose={() => setMenuOpen(false)}
              onEdit={() => { setMenuOpen(false); setEditing(true); }}
              active={active}
            />
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-account
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="tap-tint flex min-w-0 flex-1 items-center gap-3 rounded-[var(--r)] px-2 py-2 text-left"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
              >
                {(name ?? "You").trim().charAt(0).toUpperCase() || "Y"}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {name ?? "You"}
                </span>
                <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                  Settings
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit sidebar"
              title="Edit sidebar"
              className="tap-tint flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ color: "var(--ink-3)" }}
            >
              <SlidersHorizontal size={17} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      </nav>

      {editing && <NavEditor order={order} onChange={setOrder} onClose={() => setEditing(false)} />}

      {/*
        Phone bar: four destinations plus everything else behind one button, so
        no tap target is smaller than a thumb. Floating, so it reads as a
        control rather than the edge of the page.

        This one keeps its "More" and the rail does not, because the constraint
        is different: a rail is a column with a screen of height in it and a bar
        is five cells across a phone. What the button opens is not a heap
        though. It is the same sections the rail shows, with the same headings,
        so the two surfaces answer "where does this live" the same way.

        NO BACKDROP FILTER ON IT, AND THAT IS THE WHOLE REASON IT IS OPAQUE.
        An element that is `position: fixed`, carries a `backdrop-filter` and
        sits over content that moves has to re-filter its backdrop on every
        frame of every scroll, and the bottom band of the window is exactly
        where new content arrives while somebody is scrolling. Upside Lab
        measured the same pairing on its landing page at 412x915 with the CPU
        throttled ten times: one pass down the page presented 42 frames the
        compositor had to repaint, the worst of them with 38% of the bottom
        eighth of the screen not yet caught up with where the page actually
        was. Hiding that one element took the same scroll to 9 frames, every
        one of them pixel-identical to the settled page.

        So the rule is the pair rather than either half: nothing in this app
        may be fixed over the content and carry a backdrop filter. The bar
        reads the same at a solid fill, since what was behind it was a pastel
        wash rather than anything to be read through.

        The bottom offset is `env(safe-area-inset-bottom)` and not a number:
        installed to a home screen this app runs under the notch and over the
        home indicator (`viewport-fit=cover` in app/layout.tsx asks for that),
        and `bottom-3` put the bar on top of the indicator.
      */}
      <nav
        ref={measure}
        data-chrome="dock"
        aria-label="Main"
        /*
          The raised Today button stands up out of this box rather than being
          measured into it. Padding here for it was tried: it put a 36px
          strip across the whole width into the clearance `useDockClearance`
          publishes, which lifted Anu's button, the toasts and the offline
          banner by the same 36px at the edges, where nothing stands up at
          all, and set Anu's button over the hero's own button at 360. The
          overhang is 2.25rem wide of a whole screen, so it is `.dock-pad`
          that makes room for it, at the foot of a page, which is the only
          place something could end up under it.
        */
        className="fixed left-3 right-3 z-40 md:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {/*
          THE CAPSULE IS INSIDE THE NAV RATHER THAN BEING IT, AND THAT IS WHAT
          KEEPS THE BREATH FROM LYING TO THE MEASUREMENT. `useDockClearance`
          reads a bounding rectangle, which a transform changes: the bar
          swelling three percent while the window happened to be resizing
          would publish a clearance three percent too tall to everything that
          sits clear of it. The nav lays out and is measured, the capsule
          inside it is what scales, and the two are the same size whenever
          anybody asks.

          `isolate` is load-bearing too. The panes sit at a negative z-index
          so the cells can stay unpositioned and keep reporting their offsets
          against this element; with no stacking context here they would fall
          behind the capsule's own fill and never be seen again.
        */}
        <div
          ref={barMarker.ref}
          data-nav-marked={barMarker.mark ? "" : undefined}
          className="relative isolate flex items-end justify-around rounded-full border px-1.5 py-1.5"
          style={
            {
              borderColor: "var(--edge)",
              background: "var(--surface)",
              boxShadow: "var(--depth)",
              /* On Today the raised gold button is the marker, so the pill
                 stands down there rather than drawing a second one behind it,
                 and fades back in as it travels off. */
              "--nav-marker-bg": barLit === "/" ? "transparent" : "var(--accent-soft)",
            } as CSSProperties
          }
        >
          <NavMarker state={barMarker} />
          {/*
            A cell is as wide as its label plus an equal share of what is left,
            not a fifth of the bar. Equal fifths gave "Dictionary" 64px at 360
            for a word 70px wide, and `overflow-wrap: anywhere` broke it into
            "Dictionar / y" on every screen. The five labels need 240px and
            the bar has 284 at 320, so sized to content they fit on one line
            down to the narrowest phone sold, and the narrowest cell is still
            44px wide. Measured in `scripts/test-mobile.mjs`.
          */}
          {/*
            TODAY IN THE MIDDLE, RAISED, AND GOLD.

            Home is the one cell a thumb should never have to look for, so it
            sits where the thumb already rests and stands up out of the bar as
            the app's own gold, the colour of the mark and of every primary
            button. The other three keep the quiet glyph and the travelling
            pill. Order is Learn, Practice, Today, Dictionary, then More, which
            is the table's four read with home moved to the centre.
          */}
          {dock.map((item) => {
            const on = barLit === item.href;
            const home = item.href === "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                data-nav-cell
                data-nav-goes
                data-hop-on="hover"
                data-hop-end="nav-bob"
                data-nav-on={on ? "" : undefined}
                aria-current={on ? "page" : undefined}
                className={`nav-cell flex flex-auto flex-col items-center gap-1 whitespace-nowrap rounded-full py-1.5 text-2xs font-semibold ${home ? "dock-home" : ""}`}
                style={{ color: on ? "var(--ink)" : "var(--ink-3)" }}
              >
                {home ? (
                  <span aria-hidden className="dock-sun nav-glyph flex items-center justify-center rounded-full">
                    <NamedIcon name={item.icon} size={24} strokeWidth={2.5} aria-hidden />
                  </span>
                ) : (
                  <span
                    className="nav-glyph flex h-7 w-7 items-center justify-center rounded-full"
                    style={{
                      background: on ? "var(--accent)" : "transparent",
                      color: on ? "var(--surface)" : "var(--ink-3)",
                    }}
                  >
                    <NamedIcon name={item.icon} size={16} strokeWidth={2.2} aria-hidden />
                  </span>
                )}
                {item.label}
              </Link>
            );
          })}
          {/*
            A cell the marker may stand on and never travels to on a press,
            because it opens a sheet rather than a page and there is nothing
            for a bet to be right about. `data-nav-goes` is what says a cell
            goes somewhere, and this one deliberately does not carry it.
          */}
          <button
            ref={moreButton}
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            data-nav-cell
            data-hop-on="hover"
            data-hop-end="nav-bob"
            data-nav-on={restActive ? "" : undefined}
            className="nav-cell flex flex-auto flex-col items-center gap-1 whitespace-nowrap rounded-full py-1.5 text-2xs font-semibold"
            style={{ color: restActive ? "var(--ink)" : "var(--ink-3)" }}
          >
            <span
              className="nav-glyph flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: restActive ? "var(--accent)" : "transparent",
                color: restActive ? "var(--surface)" : "var(--ink-3)",
              }}
            >
              <MoreHorizontal size={16} strokeWidth={2.2} aria-hidden />
            </span>
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          ref={sheetRef}
          /*
            Above Anu's floating button, which sits at z-90 and was drawing on
            top of this sheet, and below the command palette at 120.
          */
          className="fixed inset-0 z-[100] flex flex-col justify-end md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More places to go"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
            className="flex-1"
            style={{ background: "rgb(20 16 32 / 0.4)" }}
          />
          <div
            className="scroll-host max-h-[82vh] overflow-y-auto rounded-t-[var(--r-xl)] p-5"
            style={{
              background: "var(--surface)",
              boxShadow: "var(--shadow-lg)",
              // Over the home indicator otherwise, on every phone that has one.
              paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>More</h2>
              <button
                ref={sheetClose}
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="press rounded-full p-1.5"
                style={{ color: "var(--ink-3)", background: "var(--raised)" }}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-5">
              {classLinks.length > 0 && (
                <section aria-labelledby="sheet-classes" data-sheet-classes>
                  <h3 id="sheet-classes" className="text-sm font-semibold" style={{ color: "var(--ink-3)" }}>
                    {classLinks.length === 1 ? "Your class" : "Your classes"}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {classLinks.map((item) => <SheetLink key={item.href} item={item} active={active(item.href)} />)}
                  </div>
                </section>
              )}
              {sheet.map((section) => (
                <section key={section.id} aria-labelledby={`sheet-${section.id}`}>
                  <h3 id={`sheet-${section.id}`} className="text-sm font-semibold" style={{ color: "var(--ink-3)" }}>
                    {section.title}
                  </h3>
                  {section.blurb && (
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
                      {section.blurb}
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {section.items.map((item) => <SheetLink key={item.href} item={item} active={active(item.href)} />)}
                  </div>
                </section>
              ))}
            </div>
            <section aria-labelledby="sheet-app" className="mt-5">
              <h3 id="sheet-app" className="text-sm font-semibold" style={{ color: "var(--ink-3)" }}>You</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {app.map((item) => <SheetLink key={item.href} item={item} active={active(item.href)} />)}
              </div>
            </section>
            <div className="mt-4 flex flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--rule-soft)" }}>
              <ThemeChoice />
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * One row of the desktop rail: a dot and a word.
 *
 * It paints no background of its own. The card the current row wears is one
 * pane that the marker places, and a row that also painted itself would be a
 * second answer to the same question arriving a beat later. What is left here
 * is what a pane cannot say: which row is bold, and which dot wears its hue.
 *
 * A dot rather than an icon, and that was chosen rather than settled for.
 * Five glyphs down a column are five small pictures to decode, where five
 * words are read at a glance; the dot is what still marks a row as a place,
 * round for the five and square for a pin. Today's is always gold because it
 * is home, the row you are on wears the accent, and no row wears a hue that
 * means something elsewhere: peach is "missed" on every other screen, and a
 * red dot beside Practice read as an error. The words carry the meaning.
 *
 * The ink reads `--nav-ink` rather than naming its resting color, because an
 * inline style beats a class hover, silently. `app/nav.css` spends it when
 * the pointer's pane arrives underneath.
 */
function RailLink({ item, active, pinned, classRow = false }: {
  item: Destination; active: boolean; pinned: boolean; classRow?: boolean;
}) {
  const home = item.href === "/";
  return (
    <Link
      href={item.href}
      data-nav-cell
      data-nav-goes
      data-hop-on="hover"
      data-hop-end="nav-bob"
      data-nav-on={active ? "" : undefined}
      aria-current={active ? "page" : undefined}
      title={item.blurb}
      className="nav-cell flex min-h-12 items-center gap-3.5 rounded-[var(--r)] px-3.5 py-2.5 text-base"
      style={{
        color: active ? "var(--ink)" : "var(--nav-ink, var(--ink-2))",
        fontWeight: active ? 700 : 600,
      }}
    >
      <span
        aria-hidden
        className="nav-glyph h-2.5 w-2.5 shrink-0 transition-colors"
        style={{
          // A class is a diamond: neither one of the five nor a pin.
          borderRadius: pinned || classRow ? "2px" : "50%",
          transform: classRow ? "rotate(45deg) scale(0.85)" : undefined,
          background: home ? "var(--butter)" : active ? "var(--accent)" : "color-mix(in oklab, var(--ink-3) 42%, transparent)",
          boxShadow: active ? `0 0 0 4px color-mix(in oklab, var(${home ? "--butter" : "--accent"}) 24%, transparent)` : undefined,
        }}
      />
      <span className="min-w-0">{item.label}</span>
      {pinned && <span className="sr-only">, pinned</span>}
    </Link>
  );
}

/** The row today's module hangs off. */
const LEARN_HREF = "/learn";

/**
 * TODAY'S STEPS, NESTED UNDER LEARN.
 *
 * A thread down the left edge rather than a card of its own, so it reads as
 * part of the Learn row above it. Each step is a link carrying the module's
 * marker, so pressing one opens it inside the evening; the one open now says
 * "now" in words and carries `aria-current="step"`, and one behind the learner
 * carries a tick and says done to a reader. None of them is a `data-nav-cell`,
 * because the marker pane belongs to the five places and this list is inside
 * one of them.
 */
function TonightRows({ steps, at }: { steps: readonly ModuleStepRow[]; at: string }) {
  if (steps.length === 0) return null;
  return (
    <ol
      aria-label="Today's module"
      data-rail-tonight=""
      className="mb-1.5 ml-[1.1875rem] mt-0.5 flex flex-col gap-0.5 border-l-2 py-1 pl-3"
      style={{ borderColor: "color-mix(in oklab, var(--accent) 28%, transparent)" }}
    >
      {steps.map((step) => {
        const now = step.id === at;
        return (
          <li key={step.id}>
            <Link
              href={step.href}
              aria-current={now ? "step" : undefined}
              className="tap-tint flex min-h-9 items-center gap-2 rounded-[var(--r-sm)] px-2.5 text-sm"
              style={{
                color: now ? "var(--accent-deep)" : "var(--ink-2)",
                fontWeight: now ? 600 : 500,
                background: now ? "var(--accent-soft)" : undefined,
              }}
            >
              <span className="min-w-0 flex-1 py-1.5">{step.title}</span>
              {now ? (
                <span className="shrink-0 text-xs font-medium">now</span>
              ) : step.done ? (
                <>
                  <Check size={14} aria-hidden className="shrink-0" style={{ color: "var(--good-ink)" }} />
                  <span className="sr-only">, done</span>
                </>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The menu under the learner's name.
 *
 * A popover rather than a page, because everything in it is one press: edit
 * the column above it, open Settings or your reports, switch the theme, sign
 * out. Escape and a press outside close it, and it takes the caret on open so
 * a keyboard lands inside rather than behind it.
 */
function AccountMenu({ onClose, onEdit, active }: {
  onClose: () => void; onEdit: () => void; active: (href: string) => boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (box.current && !box.current.contains(target) && !(target as HTMLElement).closest?.("[data-account]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [onClose]);
  const item = "tap-tint flex w-full items-center gap-3 rounded-[var(--r)] px-3 py-2.5 text-left text-sm font-semibold";
  return (
    <div
      ref={box}
      role="group"
      aria-label="You"
      className="menu-pop absolute bottom-full left-0 z-50 mb-2 w-72 rounded-[var(--r-lg)] border p-2"
      style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--shadow-lg)" }}
    >
      <button type="button" onClick={onEdit} className={item} style={{ color: "var(--ink)" }}>
        <SlidersHorizontal size={16} strokeWidth={2} aria-hidden style={{ color: "var(--ink-3)" }} />
        Edit sidebar
      </button>
      <Link href="/settings" className={item} aria-current={active("/settings") ? "page" : undefined} style={{ color: "var(--ink)" }}>
        <Settings size={16} strokeWidth={2} aria-hidden style={{ color: "var(--ink-3)" }} />
        Settings
      </Link>
      <Link href="/suggestions" className={item} aria-current={active("/suggestions") ? "page" : undefined} style={{ color: "var(--ink)" }}>
        <MessageSquareWarning size={16} strokeWidth={2} aria-hidden style={{ color: "var(--ink-3)" }} />
        Suggested fixes
      </Link>
      <div className="my-1 border-t" style={{ borderColor: "var(--rule-soft)" }} />
      <ThemeChoice />
      <SignOutButton />
    </div>
  );
}

/**
 * One tile in the phone sheet: an icon and a name, two to a row.
 *
 * It used to carry the destination's blurb as well, which made the sheet
 * nineteen cards of two-line prose: the busy rail again, one surface over.
 * The desktop rail answers with a word per row and the sheet does the same,
 * grouped under the five homes so the heading is the explanation. The blurb
 * is still the tile's `title` and still what the command palette searches.
 */
function SheetLink({ item, active }: { item: Destination; active: boolean }) {
  return (
    <Link
      href={item.href}
      title={item.blurb}
      aria-current={active ? "page" : undefined}
      className="choice-btn flex min-h-12 items-center gap-2 rounded-[var(--r)] border px-3 py-2 text-sm font-semibold"
      style={{
        color: active ? "var(--accent-deep)" : "var(--ink)",
        borderColor: active ? "var(--accent)" : "var(--edge)",
        ["--choice-bg" as string]: active ? "var(--accent-soft)" : "var(--surface)",
      } as CSSProperties}
    >
      <NamedIcon
        name={item.icon}
        size={16}
        strokeWidth={2.2}
        aria-hidden
        style={{ color: active ? "var(--accent-deep)" : "var(--ink-3)" }}
      />
      <span className="min-w-0">{item.label}</span>
    </Link>
  );
}


/**
 * Signing out leaves the device the way a stranger should find it.
 *
 * The outbox gets one last chance to reach the server, then the pages the
 * worker cached, the stashed session and any unfinished exam paper are
 * removed (`lib/offline/forget.ts`), and only then does the cookie go. A grade
 * that still could not land is the one thing this cannot keep and cannot
 * quietly drop, so it asks: the person pressing this on a train may prefer to
 * stay signed in until the tunnel ends.
 */
function SignOutButton() {
  const router = useRouter();
  const { flush } = useOffline();
  // Local installs have no accounts to sign out of — see lib/auth/mode.ts.
  if (!supabaseConfigured()) return null;

  const signOut = async () => {
    await flush();
    const stranded = await outboxSize();
    if (stranded > 0) {
      const grades = stranded === 1 ? "1 answer" : `${stranded} answers`;
      const ok = window.confirm(
        `${grades} on this device ${stranded === 1 ? "hasn't" : "haven't"} reached your account yet. If you sign out now, ${stranded === 1 ? "it will be" : "they will be"} lost. Sign out anyway?`,
      );
      if (!ok) return;
    }
    // The session goes first and the device is forgotten only once it has:
    // a sign-out that could not reach the service leaves the cookie in place,
    // and forgetting the outbox before that would lose the grades for nothing.
    //
    // The client is fetched here rather than imported at the top, because this
    // button is in the rail on every signed-in page and the Supabase browser
    // client is 254 KB with the Buffer polyfill it brings: every page was
    // downloading it for a press most visits never make. A load that fails is
    // the service not being reached, and is answered the same way.
    let error: unknown = null;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      ({ error } = await createClient().auth.signOut());
    } catch (failed) {
      error = failed;
    }
    if (error) {
      window.alert("We couldn't reach the sign-in service, so you're still signed in. Try again once you're back online.");
      return;
    }
    await forgetThisDevice();
    router.push("/welcome");
    router.refresh();
  };
  return (
    <button
      type="button"
     
      onClick={() => void signOut()}
      className="tap-tint flex w-full items-center gap-3 rounded-[var(--r)] px-3 py-2.5 text-left text-sm font-semibold"
      style={{ color: "var(--ink)" }}
    >
      <LogOut size={16} strokeWidth={2} aria-hidden style={{ color: "var(--ink-3)" }} />
      Sign out
    </button>
  );
}

/*
  Light unless somebody chose dark. The toggle used to read the system's own
  preference when nothing was stored, and the palette followed it too, so half
  the people who opened the app met a theme nobody had picked. Now nothing
  stored means light, the same answer globals.css gives, and the only way to
  dark is this button. The browser chrome's color is rewritten with it, since
  `themeColor` in app/layout.tsx is a single light value for the same reason,
  and the value written here is read off the stylesheet once the attribute has
  flipped, so the tag says whatever `--ground` says and no hex is typed twice.
*/

function applyTheme(next: "light" | "dark") {
  document.documentElement.dataset.theme = next;
  const ground = getComputedStyle(document.documentElement).getPropertyValue("--ground").trim();
  if (ground) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ground);
  try {
    window.localStorage.setItem("theme", next);
  } catch {
    // Private browsing in Safari throws here; the theme still applies for
    // this page and simply is not remembered.
  }
}


/**
 * Light or dark, as two halves of one control rather than a button whose
 * label never says which it is on. The same storage and the same rewrite of
 * the browser's own colour as the toggle, through `applyTheme`.
 */
function ThemeChoice() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    // Read after mount: the server cannot see localStorage, and the page's
    // own inline script has already painted whichever this says.
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const pick = (next: "light" | "dark") => { setTheme(next); applyTheme(next); };
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Theme</span>
      <span role="radiogroup" aria-label="Theme" className="flex rounded-full p-1" style={{ background: "var(--raised)" }}>
        {(["light", "dark"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={theme === option}
            onClick={() => pick(option)}
            className="tap-tint flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold"
            style={{
              background: theme === option ? "var(--surface)" : undefined,
              color: theme === option ? "var(--ink)" : "var(--ink-3)",
              boxShadow: theme === option ? "var(--depth-sm)" : undefined,
            }}
          >
            {option === "light" ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
            {option === "light" ? "Light" : "Dark"}
          </button>
        ))}
      </span>
    </div>
  );
}
