/*
  The questions about text fitting its box, asked in the page.

  These are the browser-side halves of `scripts/test-containment.mjs`, moved
  here so that `scripts/test-locales.mjs` asks the same questions of the same
  screens in Russian and Ukrainian rather than a second copy of them, which is
  where two copies of one measurement start disagreeing. Each function is handed
  to `page.evaluate`, so it may use nothing but the page: no import, no closure
  over anything in this file.
*/

/**
 * Everything this measures, in one function, because it runs in the page.
 *
 * With `stress` set it first rewrites every run of text into one of the same
 * length that cannot break. All of them change together and the page is
 * measured once, rather than one element at a time, which would be a reflow
 * each on a page with several hundred of them. Every one is put back before
 * this returns, so the two passes over a page are independent.
 */
export function survey({ stress }) {
  const EPS = 1.5;
  /** Text this size or larger is display type, where no word may break. */
  const DISPLAY_PX = 28;
  const originals = [];

  /*
    Whether this is actually painted, asked of the browser rather than worked
    out from three computed properties.

    The hand-rolled version checked `display`, `visibility` and `opacity`, and
    a closed `<details>` is none of those: Chromium skips its contents through
    `::details-content`, so the paragraphs inside still report full layout
    rects while nothing is drawn. That had this suite reporting the landing
    page's comparison panel as 79px of prose bleeding out of its own card, on
    a card that was shut. `checkVisibility` knows about skipped contents,
    `content-visibility`, `inert` and the rest, and it will keep knowing about
    whatever is added next.

    It throws rather than falling back, because a fallback that answers "not
    shown" for everything is a suite that measures nothing and prints a pass.
  */
  if (typeof document.body.checkVisibility !== "function") {
    throw new Error("this browser has no Element.checkVisibility, so nothing below can tell drawn from skipped");
  }

  const shown = (el) => {
    if (!el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0.5 || r.height > 0.5;
  };

  const named = (el) => {
    const cls = String(el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 22);
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`;
  };

  /*
    Elements carrying their own words, every lucide icon, and everything that
    arrives with a width of its own.

    That third group is here because it is the one thing neither of the CSS
    rules above can save: a replaced element is laid out from its own content
    and no wrapping rule reaches it. `<input type="file">` is the example that
    put it on this list, at 336px inside a 278px card.
  */
  const SIZED = "img, video, canvas, iframe, input, select, textarea";
  const textLeaves = [];
  const icons = [];
  const sized = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "NOSCRIPT") continue;
    if (el instanceof SVGElement) {
      if (el.tagName === "svg" && el.classList.contains("lucide")) icons.push(el);
      continue;
    }
    if (el.matches(SIZED)) sized.push(el);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (own) textLeaves.push(el);
  }

  if (stress) {
    /*
      The same run of text, the same number of characters, and nothing in it a
      browser will break on by itself: no space, no hyphen, no soft hyphen.
      The letters cycle through the alphabet rather than repeating one, so the
      run is about as wide as ordinary prose of that length rather than a wall
      of the widest glyph in the font.

      The whitespace on each end is kept, because it is doing layout: the
      arrow between a word and its translation is a text node whose spaces are
      the gap either side of it.
    */
    const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
    const unbreakable = (run) =>
      [...run].map((_, i) => (i === 0 ? ALPHABET[0].toUpperCase() : ALPHABET[i % ALPHABET.length])).join("");

    for (const el of textLeaves) {
      /*
        A `FitText` is left as it is. It answers a longer word by making the
        type smaller, which it does in an observer after the text changes, and
        this pass measures synchronously; `fitsAnyWord` asks it the same
        question the way it is built to answer, with a frame to answer in.
      */
      if (el.closest("[data-fit]")) continue;
      for (const node of el.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const [, before, run, after] = node.textContent.match(/^(\s*)([\s\S]*?)(\s*)$/);
        originals.push([node, node.textContent]);
        node.textContent = before + unbreakable(run) + after;
      }
    }
    // One forced layout, so everything below reads the stressed page.
    void document.documentElement.scrollWidth;
  }

  const overflowOn = (cs, axis) => (axis === "x" ? cs.overflowX : cs.overflowY);

  const hides = (cs, axis) => ["hidden", "clip"].includes(overflowOn(cs, axis));
  const scrolls = (cs, axis) => ["auto", "scroll"].includes(overflowOn(cs, axis));

  /**
   * The nearest ancestor that cuts this element off on an axis, or null.
   *
   * Three things end the search without being a fault, and each is a way out
   * rather than a loss. An ancestor that SCROLLS on the axis puts the rest of
   * the content one gesture away. An ancestor that ELIDES on the axis has said
   * in CSS that it is cutting the line short and drawing an ellipsis where it
   * did, which is a decision rather than an accident: `truncate` is how a deck
   * row keeps a long translation to one line. And `body` ends it because the
   * page's own sideways clip is what `test-mobile.mjs` measures, and reporting
   * the same pixel twice in different words helps nobody.
   */
  const clipperOf = (el, axis) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (scrolls(cs, axis)) return null;
      if (axis === "x" && cs.textOverflow.startsWith("ellipsis")) return null;
      if (hides(cs, axis)) return n;
    }
    return null;
  };

  /**
   * The nearest ancestor a reader can actually see the edge of: one that
   * paints a border or a fill. That is the box the ink belongs inside.
   *
   * Anything that clips or scrolls on the way up ends the search first,
   * because ink a clip has already taken away is not ink on the wrong side of
   * a line. Skipping that step is what had this suite reporting a translation
   * inside a `truncate` as 78px outside its own row, when what a reader saw
   * there was an ellipsis.
   */
  const boxOf = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (["x", "y"].some((a) => scrolls(cs, a) || hides(cs, a))) return null;
      const bordered = ["Top", "Right", "Bottom", "Left"].some(
        (s) => cs[`border${s}Style`] !== "none" && parseFloat(cs[`border${s}Width`]) > 0,
      );
      const filled = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
      if (bordered || filled) return n;
    }
    return null;
  };

  /** How far outside `box`'s padding box `el` reaches, in px, on the given axes. */
  const overshoot = (el, box, axes) => {
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const cs = getComputedStyle(box);
    const edge = {
      left: b.left + parseFloat(cs.borderLeftWidth),
      right: b.right - parseFloat(cs.borderRightWidth),
      top: b.top + parseFloat(cs.borderTopWidth),
      bottom: b.bottom - parseFloat(cs.borderBottomWidth),
    };
    let out = 0;
    if (axes.includes("x")) out = Math.max(out, edge.left - r.left, r.right - edge.right);
    if (axes.includes("y")) out = Math.max(out, edge.top - r.top, r.bottom - edge.bottom);
    return out;
  };

  const cut = [];
  const bled = [];
  const deformed = [];
  const collided = [];

  /*
    An absolutely positioned element was put where it is on purpose — a corner
    badge, a floating action, a decorative wash — so its own placement is not
    this suite's business. Its descendants still are, and they are reached
    anyway, because skipping an element is not skipping the walk.
  */
  const placed = (el) => ["absolute", "fixed"].includes(getComputedStyle(el).position);

  for (const el of [...textLeaves, ...icons, ...sized]) {
    if (!shown(el) || placed(el)) continue;
    /*
      Inside a visually hidden box is text a reader hears and nobody sees,
      clipped to a pixel on purpose. The box itself is skipped as placed; a
      word inside it marked with its own `lang` is a child of it and was being
      reported as cut off, which is the one-pixel clip doing its job. The
      word-splitting check below skips the same boxes for the same reason.
    */
    if (el.closest(".sr-only")) continue;

    for (const axis of ["x", "y"]) {
      const clip = clipperOf(el, axis);
      if (!clip) continue;
      const over = overshoot(el, clip, [axis]);
      if (over > EPS) cut.push(`${named(el)} ${Math.round(over)}px past ${named(clip)}`);
    }

    const box = boxOf(el);
    if (box) {
      const over = overshoot(el, box, ["x", "y"]);
      if (over > EPS) bled.push(`${named(el)} ${Math.round(over)}px outside ${named(box)}`);
    }
  }

  /*
    AND NOTHING IS DRAWN ON TOP OF ANYTHING ELSE.

    Not out of a box: into one. Something laid over text that is otherwise
    perfectly inside its card, which every check above passes happily because
    both elements are where they belong and one of them simply cannot be read.

    ASKED BY HIT-TESTING RATHER THAN BY COMPARING RECTANGLES, and that was
    arrived at the hard way. Comparing sibling rectangles reported three
    things and none of them was this fault. An inline element that wraps has
    one bounding rectangle spanning every line it touches, so a span before it
    on line one and a span after it on line two overlap on paper with no ink
    in common at all. `getClientRects` fixes that and uncovers the next one: an
    inline whose text changes font mid-run, which here is any Estonian prompt
    with an arrow in it, reports a fragment rectangle per run plus one
    covering the lot, and those overlap each other by a pixel or ten. Excluding
    inline-level elements clears both and leaves the check blind, because the
    painted text in this app is nearly all inline: a 30px negative margin
    forced into a deck row went unreported.

    `elementFromPoint` asks the browser what is actually on top at a point,
    which is the question all along. It ignores anything `pointer-events:
    none`, so the three pastel washes behind every page are not a finding, and
    a hit on the element itself or on something it is inside is the ordinary
    answer.

    The point has to be somewhere the element is ACTUALLY PAINTED, which is
    not the same as somewhere it is laid out, and two things stood between
    those. A deck row keeps its translation to one line with `truncate`, and
    the part past the ellipsis still has a rectangle: hit-testing that
    reported the row's level chip as drawn over a translation it merely sits
    beside, so the rectangle is intersected with every ancestor that clips.
    And an inline element's own rectangle is its inline box, which for a run
    that changes font mid-way (any Estonian prompt with an arrow in it) is
    reported in fragments that reach past where the text ends. A Range over
    the text node is where the letters are, which is what this is asking
    about.

    Text inside an ELLIPSIS is left out of this one, for the same reason it is
    left out of "cut off" above: the box has said in CSS that it is stopping
    the line short, and right at that boundary the browser's own geometry for
    the runs either side of it stops agreeing with itself. A deck row's word
    and its translation are reported as occupying the same eleven pixels
    there, which is not something any markup could fix and not something a
    reader can see.

    The page is walked a screenful at a time, because a point below the fold
    cannot be hit-tested at all, and the scroll is put back afterwards so both
    passes over a page start where the last one did.

    Made to fail once, which is the only way anybody knows what a quiet check
    is saying: an absolutely positioned block was appended over one deck row
    in the browser, and this reported six things covered by it and nothing
    anywhere else on the page.
  */
  /**
   * Whether this is chrome: something the page is meant to scroll underneath.
   *
   * `fixed` is the phone bar and the desktop rail. `sticky` is the
   * examination paper's own header, which holds the clock and the part number
   * and is pinned there precisely so that the paper passes under it. Neither
   * is a fault. What keeps the *end* of a page clear of the bar is
   * `.dock-pad`, which `scripts/test-mobile.mjs` measures.
   */
  const chrome = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const position = getComputedStyle(n).position;
      if (position === "fixed" || position === "sticky") return true;
    }
    return false;
  };

  /** Whether anything above this has declared it is cutting the line short. */
  const elided = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).textOverflow.startsWith("ellipsis")) return true;
    }
    return false;
  };

  /** The first rectangle of the letters themselves, or of an icon's own box. */
  const inkOf = (el) => {
    const text = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!text) return [...el.getClientRects()][0] ?? null;
    const range = document.createRange();
    range.selectNodeContents(text);
    return [...range.getClientRects()][0] ?? null;
  };

  /**
   * What is left of `rect` once everything that clips it has had its say.
   *
   * Starting at the element rather than its parent, because the commonest
   * thing here that clips is `sr-only`: a one-pixel box with `overflow:
   * hidden` holding a whole sentence, which a Range reports at its full
   * unclipped width. The skip link at the top of every signed-in page is one,
   * and it was being reported as covered by the page it is hidden behind.
   */
  const painted = (el, rect) => {
    let box = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (!["x", "y"].some((a) => hides(cs, a) || scrolls(cs, a))) continue;
      const r = n.getBoundingClientRect();
      box = {
        left: Math.max(box.left, r.left),
        right: Math.min(box.right, r.right),
        top: Math.max(box.top, r.top),
        bottom: Math.min(box.bottom, r.bottom),
      };
    }
    return box;
  };

  const startedAt = window.scrollY;
  const step = Math.max(200, window.innerHeight - 80);

  /*
    Each candidate is sorted into the one screenful that will hold it, so the
    whole list is walked once rather than once per screenful. The first
    version scrolled and then re-read every element on the page at every stop,
    which on `/learn` is 498 candidates times a dozen screenfuls of
    `getComputedStyle`: the same 470 checks took nine minutes that way and
    take 106 seconds this way, which is the difference between a suite CI runs
    and one somebody eventually takes out of CI.

    `placed` is here for the reason it is used above: something positioned
    absolutely was put where it is on purpose, and that includes being put
    behind something. The landing page's step numerals are the case that made
    this explicit, a 92px figure sitting behind each card as ornament, which
    `scripts/test-invariants.ts` names as the one thing deliberately off the
    type scale.
  */
  const screenfuls = new Map();
  for (const el of [...textLeaves, ...icons]) {
    if (!shown(el) || placed(el) || elided(el)) continue;
    const first = inkOf(el);
    if (!first) continue;
    const at = Math.max(0, Math.floor((first.top + window.scrollY) / step) * step);
    if (!screenfuls.has(at)) screenfuls.set(at, []);
    screenfuls.get(at).push(el);
  }

  for (const [at, group] of [...screenfuls].sort((a, b) => a[0] - b[0])) {
    window.scrollTo(0, at);
    for (const el of group) {
      const first = inkOf(el);
      if (!first) continue;
      const rect = painted(el, first);
      const w = rect.right - rect.left, h = rect.bottom - rect.top;
      if (w < 2 || h < 2) continue;
      const x = rect.left + Math.min(6, w / 2);
      const y = rect.top + h / 2;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;

      const hit = document.elementFromPoint(x, y);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue;
      /*
        The phone bar and the desktop rail are drawn over the page on purpose
        and the page scrolls under them, so a point beneath one of them is
        layering rather than a fault. What keeps the *end* of a page clear of
        the bar is `.dock-pad`, which `scripts/test-mobile.mjs` measures.
      */
      if (chrome(hit)) continue;
      collided.push(`${named(hit)} is drawn over ${named(el)}`);
    }
  }
  window.scrollTo(0, startedAt);

  /*
    AN ORDINARY WORD DRAWN A FEW LETTERS A LINE.

    The four questions above cannot see this, and that is the reason it is a
    fifth. `overflow-wrap: anywhere` is what keeps a long word inside its box,
    and it does it by letting any word break anywhere once the box is too
    narrow for it, so a box squeezed to 13px holds its text perfectly and
    reads "see / süt / lev". Nothing is cut, nothing bleeds, nothing collides.
    It was found on Progress, where five tiles forced across a phone drew
    "NOT STA RTE D", and then on a dozen screens at 768, where the rail
    leaves 368px of content and every `sm:`/`md:` grid still splits it.

    The test is the longest ordinary word of an element's own text against
    the width it was given. Ordinary means thirteen letters or fewer: an
    Estonian compound or a pasted address longer than that is exactly what the
    rule above exists to break, and breaking it is the page working. Only the
    text as written, never the stressed pass, whose words are made unbreakable
    on purpose. An inline element wraps inside the block it sits in, so the
    block is what is measured; a `nowrap` run cannot break at all; and
    anything a reader is not shown is not asked about.
  */
  const split = [];
  if (!stress) {
    const probe = document.createElement("span");
    probe.style.cssText = "white-space:nowrap;position:absolute;visibility:hidden;left:0;top:0";
    for (const el of textLeaves) {
      if (!shown(el)) continue;
      /*
        Not `aria-hidden`: that hides a thing from a screen reader and leaves
        it on the screen. The landing page's hero card is aria-hidden, since
        one static sentence says the same thing aloud, and it drew
        `raamatusse` as `raamatuss / e` to every sighted visitor while this
        check looked away.
      */
      if (el.closest("table, pre, code, .sr-only")) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "inline" || cs.whiteSpace.startsWith("nowrap") || cs.whiteSpace === "pre") continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ");
      /*
        At display size no word is long enough to be broken: a word set that
        big is a headword or a form the reader takes in at a glance, and it
        goes through `components/FitText.tsx`, which makes the type smaller
        instead. The thirteen-letter allowance is for running text.
      */
      const display = parseFloat(cs.fontSize) >= DISPLAY_PX;
      const words = own.split(/\s+/).filter((w) =>
        display ? /^[\p{L}'’.,:;!?()-]{2,}$/u.test(w) : /^[\p{L}'’.,:;!?()-]{2,13}$/u.test(w));
      if (!words.length) continue;
      const box = el.getBoundingClientRect().width
        - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
      if (box <= 0) continue;
      el.appendChild(probe);
      let widest = "", wide = 0;
      for (const w of words) {
        probe.textContent = w;
        const x = probe.getBoundingClientRect().width;
        if (x > wide) { wide = x; widest = w; }
      }
      probe.remove();
      if (wide > box + EPS) split.push(`"${widest}" needs ${Math.round(wide)}px and ${named(el)} has ${Math.round(box)}`);
    }
  }


  for (const svg of icons) {
    if (!shown(svg)) continue;
    const want = { w: parseFloat(svg.getAttribute("width")), h: parseFloat(svg.getAttribute("height")) };
    if (!Number.isFinite(want.w) || !Number.isFinite(want.h)) continue;
    const r = svg.getBoundingClientRect();
    if (Math.abs(r.width - want.w) > 1 || Math.abs(r.height - want.h) > 1) {
      deformed.push(`${named(svg)} drawn ${Math.round(r.width)}x${Math.round(r.height)}, declared ${want.w}x${want.h}`);
    }
  }

  const doc = document.documentElement;
  const sideways = Math.round(doc.scrollWidth - doc.clientWidth);

  for (const [node, text] of originals) node.textContent = text;

  // Deduplicated: one broken row in a list of forty is one fault, not forty.
  const first = (list) => [...new Set(list)].slice(0, 3).join(" · ");
  return {
    cut: [...new Set(cut)].length,
    bled: [...new Set(bled)].length,
    deformed: [...new Set(deformed)].length,
    collided: [...new Set(collided)].length,
    split: [...new Set(split)].length,
    sideways,
    say: { cut: first(cut), bled: first(bled), deformed: first(deformed), collided: first(collided), split: first(split) },
    counted: textLeaves.length + icons.length + sized.length,
  };
}

/**
 * EVERY WORD A `FitText` COULD BE HANDED, NOT ONLY THE ONE IT HOLDS NOW.
 *
 * The hero card on the landing page turns through a word's cases every 1.7
 * seconds and the sweep above sees whichever form was up when it looked, so a
 * card that breaks on `raamatusse` passes on `raamatus`. What
 * `components/FitText.tsx` promises is about any word, so that is what is
 * asked: each one on the page is handed a compound longer than any form this
 * app draws large, and has to hold it on one line inside its box. The text
 * nodes are swapped rather than the element's contents replaced, so React's
 * own nodes are the ones put back.
 */
export async function fitsAnyWord() {
  const LONG = "sünnipäevakingitustega";
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const broken = [];
  for (const el of document.querySelectorAll("[data-fit]")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    if (!nodes.length) continue;
    const before = nodes.map((n) => n.textContent);
    nodes.forEach((n, i) => { n.textContent = i === 0 ? LONG : ""; });
    /*
      Asked until it settles rather than after a fixed frame, with a ceiling:
      the refit runs in an observer, a page can still be laying out, and the
      landing page's hero swaps its word every couple of seconds, so one read
      can land mid-change. A word that is still over after half a second has
      not been fitted, and that is the fault.
    */
    let over = 0, lines = 1, size = 0;
    for (let tries = 0; tries < 30; tries++) {
      await frame();
      if (!el.isConnected || !el.contains(nodes[0])) break;
      const cs = getComputedStyle(el);
      size = parseFloat(cs.fontSize);
      const lineHeight = parseFloat(cs.lineHeight) || size * 1.3;
      over = el.scrollWidth - el.clientWidth;
      lines = Math.round(el.getBoundingClientRect().height / lineHeight);
      if (over <= 1 && lines <= 1) break;
    }
    if (over > 1 || lines > 1) {
      const name = typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(".") : "";
      broken.push(`${el.tagName.toLowerCase()}.${name} ${over > 1 ? `overflows by ${over}px` : `took ${lines} lines`} at ${size}px`);
    }
    nodes.forEach((n, i) => { n.textContent = before[i]; });
    await frame();
  }
  return { broken };
}

/**
 * A WORD IS DRAWN ON ONE LINE, AND A BUTTON'S LABEL IS DRAWN WHOLE.
 *
 * The width comparison in `survey` asks whether a block is wide enough for its
 * longest word, and it cannot see two things. An inline run is skipped there,
 * since it wraps inside its block. And a button is only measured where it is
 * rendered: "Learn 5 phrases" on the Learn page was drawn five letters a line
 * at 44px wide from 1024 up, because the heading beside it squeezed the button
 * row down to one letter under `overflow-wrap: anywhere`, and the demo deck
 * held no phrase, so the button was never on a page this suite opened.
 *
 * So this asks the browser rather than working it out: every ordinary word on
 * the page (two to thirteen letters, the same bound as above, since a longer
 * compound breaking is the rule doing its job) is measured as a Range, and a
 * word whose letters sit on two lines is a word broken, whatever element it is
 * in. And every `.btn`, whose label `components/Button.tsx` keeps on one line,
 * is asked whether the label is wider than the button, which is what a row
 * with no room for it now does instead of folding it up.
 */
export function wholeWords() {
  const broken = [];
  const overflowing = [];
  const shown = (el) => el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true });
  const named = (el) => {
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
    return `${el.tagName.toLowerCase()}${text ? ` "${text}"` : ""}`;
  };
  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let words = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    // Not `aria-hidden`: hidden from a screen reader is still on the screen,
    // and the landing page's hero card, which is aria-hidden, is where a
    // display word was broken in two with nothing measuring it.
    if (!el || el.closest("script, style, noscript, table, pre, code, textarea, .sr-only")) continue;
    if (!shown(el)) continue;
    const text = node.textContent;
    // At display size no word is long enough to be allowed to break.
    const display = parseFloat(getComputedStyle(el).fontSize) >= 28;
    // Whole words first, then the length: `\p{L}{2,13}` alone matches
    // thirteen-letter pieces inside a longer compound, whose breaking is the
    // rule doing its job, and reported a 23-letter fixture word as broken.
    for (const m of text.matchAll(/\p{L}+/gu)) {
      if (m[0].length < 2 || (m[0].length > 13 && !display)) continue;
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const tops = new Set();
      for (const r of range.getClientRects()) if (r.width > 0.5) tops.add(Math.round(r.top / 3));
      words += 1;
      if (tops.size > 1) broken.push(`"${m[0]}" is broken across ${tops.size} lines in ${named(el)}`);
    }
  }
  for (const btn of document.querySelectorAll(".btn")) {
    if (!shown(btn)) continue;
    if (btn.scrollWidth > btn.clientWidth + 1) {
      overflowing.push(`${named(btn)} needs ${btn.scrollWidth}px and has ${btn.clientWidth}`);
    }
  }
  const first = (list) => [...new Set(list)].slice(0, 3).join(" · ");
  return {
    words,
    broken: [...new Set(broken)].length,
    overflowing: [...new Set(overflowing)].length,
    say: { broken: first(broken), overflowing: first(overflowing) },
  };
}
