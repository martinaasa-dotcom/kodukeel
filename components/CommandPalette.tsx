"use client";

import { fold } from "@/lib/estonian/fold";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PRACTICE_MODES } from "@/lib/ux/modes";
import { SECTIONS } from "@/lib/ux/nav";
import { SHORTCUTS_EVENT } from "@/components/Shortcuts";
import { KeyCap } from "@/components/ui";
import { useModalFocus } from "@/components/useModalFocus";

interface Command {
  id: string;
  label: string;
  hint: string;
  /** The heading it appears under. Results are grouped by it. */
  group: string;
  /** Where it goes. Empty for a command that acts instead of navigating. */
  href: string;
  keywords: string;
  /** Run instead of navigating. Used by the one command that opens a dialog. */
  run?: () => void;
}

/*
  Built from the same tables the rail and the practice hub read, rather than
  typed out again here. This list had drifted: it offered six practice modes
  and the hub offers eleven, so Verb government and the Leech clinic were
  reachable from one screen and unfindable from the box that promises to go
  anywhere. It also carried its own wording for every destination, which is how
  a screen ends up called two things.
*/
const PLACE_COMMANDS: Command[] = SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    id: `place-${item.href}`,
    label: item.label,
    hint: item.blurb,
    group: section.title,
    href: item.href,
    keywords: item.keywords,
  })),
);

const MODE_COMMANDS: Command[] = PRACTICE_MODES.map((mode) => ({
  id: `mode-${mode.href}`,
  label: mode.title,
  hint: mode.subtitle,
  group: "Practice",
  href: mode.href,
  keywords: `${mode.subtitle} ${mode.blurb} practice mode game drill`,
}));

const COMMANDS: Command[] = [
  ...PLACE_COMMANDS,
  ...MODE_COMMANDS,
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    hint: "Everything you can do without the mouse",
    group: "This app",
    href: "",
    keywords: "keys hotkeys bindings help question mark",
    run: () => window.dispatchEvent(new Event(SHORTCUTS_EVENT)),
  },
];

/*
  The whole course, in every unit's own words: about 20KB gzipped, and useful
  only once somebody has actually opened this box and typed something. Loaded
  from `lib/collections/syllabus` on first open rather than imported at the
  top of the file, so it is not in the bundle every signed-in page ships
  whether or not anybody ever presses the key that opens it.
*/
let unitCommands: Command[] | null = null;
function loadUnitCommands(): Promise<Command[]> {
  if (unitCommands) return Promise.resolve(unitCommands);
  return import("@/lib/collections/syllabus").then(({ PATH }) => {
    unitCommands = PATH.map((u) => ({
      id: `unit-${u.id}`,
      label: `${u.title}, ${u.subtitle}`,
      hint: u.cefr,
      group: "Units",
      href: `/learn/${u.id}`,
      keywords: `${u.lemmas.join(" ")} unit ${u.cefr}`,
    }));
    return unitCommands;
  });
}

/**
 * ⌘K / Ctrl-K.
 *
 * Two things, in one box: jump to any screen, or look a word up. The second is
 * the one that matters — the app's center of gravity is the dictionary, and
 * getting there should never cost a click, a page load and a focus hunt when
 * you are mid-sentence in your homework.
 *
 * Results carry the heading of the section they live in, so the box teaches
 * the same map the rail does rather than answering with a flat list of
 * twenty-eight things that all look alike.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [units, setUnits] = useState<Command[] | null>(unitCommands);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-${i}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The caret goes to the box and back to wherever it was when ⌘K was
  // pressed, which used to be the body: closing the palette sent a keyboard
  // to the top of the page it had been working halfway down.
  useModalFocus(open, dialogRef, { initial: inputRef });

  useEffect(() => {
    if (!open) return;
    // Tab is the one way focus can leave the palette: nothing inside it
    // after the input is tabbable (the result rows carry tabIndex={-1}), so
    // a stray Tab moves focus straight onto whatever page is behind the
    // backdrop, and every key typed there afterward would bubble to window
    // uncaught, since the input's own onKeyDown never sees an event whose
    // target isn't itself. This is the backstop for exactly that: capture,
    // ahead of every bubble-phase listener, and it only swallows a key
    // whose target has already escaped this dialog's own DOM — anything
    // still inside it is left alone here, since the input's own handler
    // already deals with those and needs the event to actually reach it.
    const onKey = (e: KeyboardEvent) => {
      // Escape and Cmd/Ctrl-K are the palette's own open/close keys, read by
      // the plain listener above regardless of where focus is. Swallowing
      // those here too, on top of a target that has already escaped the
      // dialog, would leave somebody stuck unable to close it with the
      // keyboard at all once focus had wandered past it.
      const closesIt = e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k");
      if (closesIt) return;
      if (!(e.target instanceof Node) || !dialogRef.current?.contains(e.target)) {
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  // Fetched once, the first time the box actually opens, and kept in the
  // module-level cache above so a second open in the same session is free.
  useEffect(() => {
    if (open && !units) loadUnitCommands().then(setUnits);
  }, [open, units]);

  const results = useMemo(() => {
    /*
      FOLDED, BECAUSE THE PLACES IN THIS BOX WITH ESTONIAN NAMES WERE
      UNREACHABLE FROM IT.

      A plain `includes` over the label meant typing `sonad` found nothing, and
      Sõnad was missing from the box that promises to go anywhere, for exactly
      the learner `lib/ux/letterBar.ts` exists for, who has no õ key and cannot
      type the name. The dictionary has folded a search since it was written;
      this is the same six letters from the same table. Ristsõna is the second
      such name and inherits all of it without being mentioned here, which is
      the point of folding rather than listing.

      Folding the haystack as well as the query, since it is the label that
      carries the diacritic. A learner who *can* type õ is unaffected: `sõnad`
      folds to `sonad` on both sides and still matches.
    */
    const q = fold(query.trim());
    if (!q) {
      /*
        Nothing typed: every place, under its heading, in the order the rail
        puts them in. Not a cut of seven off the top of a flat list, which is
        what this used to be, and which meant the box that says it goes
        anywhere opened on a sample. Sixteen rows under five headings scroll,
        and the first keystroke narrows them anyway. The modes and the units
        stay out of it, since those are what searching is for.
      */
      return PLACE_COMMANDS;
    }
    const pool = [...COMMANDS, ...(units ?? [])];
    const matches = pool
      .filter((c) => fold(`${c.label} ${c.keywords}`).includes(q))
      .slice(0, 8);
    // The dictionary can answer for a word nothing here matches, so it is always
    // offered rather than leaving a dead end.
    return [
      ...matches,
      {
        id: "search",
        label: `Look up “${query.trim()}” in the dictionary`,
        hint: "Estonian or English, other word forms included",
        group: "Look it up",
        href: `/dictionary?q=${encodeURIComponent(query.trim())}`,
        keywords: "",
      },
    ];
  }, [query, units]);

  /*
    Grouped for the eye, flat for the keyboard. The arrow keys walk `results`
    in order and the index into it has to keep meaning the same row, so the
    headings are drawn from a walk over that same array rather than from a
    second pass that regroups it.
  */
  const rows = results.map((command, index) => ({
    command,
    index,
    heading: command.group !== results[index - 1]?.group ? command.group : null,
  }));

  if (!open) return null;

  /*
    What the list now holds, said once it changes. The rows are a listbox the
    caret never enters, so a screen reader hears the active one through
    `aria-activedescendant` and would otherwise never hear that typing had
    narrowed sixteen places to two, or to none. The dictionary row is always
    there once something is typed and is not counted as a match.
  */
  const matched = query.trim() ? results.length - 1 : results.length;
  const heard = matched === 0
    ? "Nothing matches that. The dictionary can still look it up."
    : `${matched} ${matched === 1 ? "match" : "matches"}.`;

  const go = (command: Command) => {
    setOpen(false);
    if (command.run) { command.run(); return; }
    router.push(command.href);
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: "rgb(0 0 0 / 0.35)" }}
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[var(--r-xl)] border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Search size={17} aria-hidden style={{ color: "var(--ink-3)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              // Modal: nothing behind the palette should react. The review,
              // lesson and ladder sessions bind Enter, the digits and u
              // straight onto window, so a letter typed here, or Escape, or
              // Cmd/Ctrl-K to close it again, used to still reach whatever
              // card those sessions had open behind it. stopPropagation
              // keeps every key inside the palette; never preventDefault
              // beyond what each branch already claimed, so anything not
              // handled here (a plain letter, building the query) still
              // reaches the input normally.
              e.stopPropagation();
              if (e.key === "Escape") { setOpen(false); return; }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen(false);
                return;
              }
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter") {
                e.preventDefault();
                const target = results[active];
                if (target) go(target);
              }
            }}
            placeholder="Jump to a screen, or type a word to look up…"
            aria-label="Search commands and words"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results[active] ? optionId(active) : undefined}
            className="w-full bg-transparent text-base"
            style={{ color: "var(--ink)" }}
          />
          <KeyCap className="shrink-0">Esc</KeyCap>
        </div>
        <p className="sr-only" role="status">{heard}</p>
        <ul id={listId} role="listbox" aria-label="Results" className="scroll-host max-h-[52vh] py-1">
          {rows.map(({ command: c, index: i, heading }) => (
            <li key={c.id} role="presentation">
              {/* A listbox holds options and nothing else, so the heading is
                  for the eye; the hint on each row says what it is. */}
              {heading && (
                <p aria-hidden className="label-xs px-4 pb-1 pt-2.5" style={{ color: "var(--ink-3)" }}>{heading}</p>
              )}
              <button
                type="button"
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                // Keyboard focus never leaves the input: arrow keys move
                // `active` and Enter selects it, the same combobox pattern
                // the ARIA guide describes. Without this, Tab could land
                // real DOM focus on a row that has no keydown handling of
                // its own, and every key pressed there would bubble past
                // this dialog uncaught.
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(c)}
                className="flex w-full items-baseline gap-3 px-4 py-2.5 text-left"
                style={{ background: i === active ? "var(--accent-soft)" : "transparent" }}
              >
                {/* The label keeps its width and the hint gives way, which is
                    what `truncate` on the hint is for. Both shrinking together
                    left "Practice" 41px at 360, drawn across two lines. */}
                <span className="max-w-[75%] shrink-0 text-base" style={{ color: i === active ? "var(--accent-deep)" : "var(--ink)" }}>
                  {c.label}
                </span>
                <span className="ml-auto truncate text-xs" style={{ color: "var(--ink-3)" }}>{c.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        {results.length === 0 && (
          <p aria-hidden className="px-4 py-6 text-center text-sm" style={{ color: "var(--ink-3)" }}>
            Nothing matches that.
          </p>
        )}
      </div>
    </div>
  );
}
