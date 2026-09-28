"use client";

import { SCREEN_LIMITS, type ScreenContext } from "@/lib/tutor/screen";

/**
 * What is open on the page behind Anu, read the moment a question is sent.
 *
 * Generic on purpose. A context each screen registered by hand would be forty
 * screens remembering to do it and the forty-first forgetting, and the fault
 * would look exactly like Anu being obtuse. The page already says what it is
 * showing in the one way every screen here has to: an `h1`, the Estonian marked
 * `lang="et"` because a screen reader needs it, and the text a person can see.
 * So those are what is read, and only inside `#main`, so the rail, the phone
 * bar and Anu's own panel are never part of it.
 *
 * Read at send rather than on open, since the panel stays open while somebody
 * flips to the next card and asks about that one. What is sent and what is
 * done with it is `lib/tutor/screen.ts`.
 */
export function readScreen(pathname: string): ScreenContext | null {
  if (typeof document === "undefined") return null;
  const main = document.getElementById("main");
  if (!main) return null;

  const estonian: string[] = [];
  for (const el of Array.from(main.querySelectorAll<HTMLElement>('[lang="et"]'))) {
    // The outermost run only, or a sentence and every word inside it arrive separately.
    if (el.parentElement?.closest('[lang="et"]')) continue;
    if (!shown(el)) continue;
    const text = flat(el.innerText);
    if (text && !estonian.includes(text)) estonian.push(text);
    if (estonian.length >= SCREEN_LIMITS.estonianLines) break;
  }

  const typed: string[] = [];
  for (const el of Array.from(main.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"))) {
    if (el instanceof HTMLInputElement && !["text", "search", ""].includes(el.type)) continue;
    if (!shown(el)) continue;
    const text = flat(el.value);
    if (text) typed.push(text);
    if (typed.length >= SCREEN_LIMITS.typedLines) break;
  }

  return {
    path: pathname,
    title: flat(main.querySelector("h1")?.textContent ?? document.title),
    selection: currentSelection(pathname),
    estonian,
    visible: visibleText(main),
    typed,
  };
}

function flat(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Drawn, and somewhere in the window the learner is looking through. */
function shown(el: Element): boolean {
  if (el.closest('[aria-hidden="true"], [hidden], [data-chrome]')) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

/**
 * The text a reader can see in the window, in document order, one run per
 * element that holds it. `innerText` of the whole page would carry what is
 * scrolled away three screens down, which is not "this".
 */
function visibleText(main: HTMLElement): string {
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  const runs: string[] = [];
  let length = 0;
  let last: Element | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, noscript, .sr-only")) continue;
    const text = flat(node.textContent);
    if (!text) continue;
    if (parent !== last && !shown(parent)) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === "hidden" || style.display === "none") continue;
    last = parent;
    runs.push(text);
    length += text.length + 1;
    if (length > SCREEN_LIMITS.visible) break;
  }
  return runs.join(" ");
}

/*
  THE HIGHLIGHT IS REMEMBERED, BECAUSE ASKING ABOUT IT CLEARS IT.

  Pressing into Anu's box moves the caret there, and a browser collapses the
  page's selection when a field takes focus, so reading the selection at send
  would always find nothing. The last one made on the page is kept instead,
  and let go the moment the learner clears it on the page itself or moves to
  another screen. A selection inside Anu's own panel is not the page's.
*/
let remembered: { text: string; path: string } | null = null;

function currentSelection(pathname: string): string {
  const live = flat(pageSelection());
  if (live) return live;
  return remembered && remembered.path === pathname ? remembered.text : "";
}

function pageSelection(): string {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return "";
  const anchor = selection.anchorNode;
  const el = anchor instanceof Element ? anchor : anchor?.parentElement;
  if (!el || !el.closest("#main") || el.closest("[data-chrome]")) return "";
  return selection.toString();
}

/** Keeps the last highlight made on the page; returns the way to stop. */
export function watchSelection(pathname: () => string): () => void {
  const onChange = () => {
    const text = flat(pageSelection());
    if (text) {
      remembered = { text, path: pathname() };
      return;
    }
    // A highlight somewhere else (inside Anu's own reply, say) is not the
    // learner letting go of this one, and nor is a collapse caused by focus
    // going into a field, Anu's box among them. A click on the page is.
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    const active = document.activeElement;
    const intoField = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
    if (intoField || active?.closest("[data-chrome]")) return;
    remembered = null;
  };
  document.addEventListener("selectionchange", onChange);
  return () => document.removeEventListener("selectionchange", onChange);
}
