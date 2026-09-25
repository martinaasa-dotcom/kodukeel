# UX, Information Architecture and Accessibility

v4.0 specified "sidebar navigation with tabs" and nothing else: no default view, no keyboard model,
no empty states, no accessibility, and no answer to the daily friction of typing `õäöü` on a US
keyboard.

## 1. Information architecture

The first version of this page drew a sidebar of eight tabs. What the app has instead is one table,
`SECTIONS` in `lib/ux/nav.ts`, grouped by the question each place answers. The desktop rail draws
all of it and the phone bar draws the places marked `bar`, with the rest one press away under the
same headings. As built:

```
Every day         Today (default route), Today's module, Learn, Practice, Situations
How it is going   Calendar, Progress, Word mastery, Decks
Look it up        Dictionary, Grammar
This app          Settings, Suggested fixes
```

Anu is not a row: her button is in the corner of every signed-in screen. A place that lives inside
another (the scanner, the deck, a practice mode) carries `within` and is linked from the screen
somebody is standing on when they want it.

**Today is the default route**, not Tasks. This is the fix for audit gap D2: a dashboard whose front
door is a list of tabs makes the user decide what to do before they have done anything. Today answers
"what now": the one thing to do today, what the evening holds, and one button to start.

## 2. Cross-cutting interactions

**`+ Add to Deck` is everywhere.** Dictionary entry, individual example, Anu message, import row,
selected text. Same component, same confirmation, provenance recorded. This is the interaction that
makes the dashboard more than six tabs in a trench coat.

**Command palette (`Cmd/Ctrl-K`).** Search a word or jump to any screen, including every place the
rail does not list. For a power tool used daily by one person, the palette is faster than any navigation.

**Global keyboard map.** `components/Shortcuts.tsx` is the list, and the sheet it draws is the
reference. Three keys work anywhere:

| Key | Action |
|---|---|
| `Cmd/Ctrl-K` | Command palette |
| `?` | Keyboard shortcut help |
| `Esc` | Close whatever is open |

A `g`-prefixed jump map, `/` to focus search and `n` for a new task were planned here and not built:
the palette reaches every one of those in two keystrokes. Review-session keys, undo among them, are
in `07-srs.md` §3.

## 3. Estonian text input (audit C9)

A daily friction point v4.0 does not mention. Typing `õ ä ö ü š ž` on a US layout is slow, and a
learner will avoid features that require it.

Two affordances were built and one was not:

1. **A letter bar** under every Estonian text input: `õ ä ö ü š ž` as click-to-insert buttons.
   On a computer only, and only for somebody who wants it. A phone keyboard already has these
   letters and the row costs it the scarce thing; an Estonian keyboard has them as keys and the row
   is a line of buttons that will never be pressed. Asked on the first screen of first run,
   reversible from Settings and from the row itself. See `lib/ux/letterBar.ts`.
2. **Repeat-key expansion** (pressing `o` twice to get `õ`) was planned and not built. A phone
   keyboard already has a long press for these letters, and the letter bar covers a desktop.
3. **Diacritic-insensitive search**: typing `sona` finds `sõna`; `raamat` matches regardless.
   The SQL narrows with `translate()` over a folded lemma and `lib/estonian/fold.ts` holds the one
   table of which letters fold, so the query and the code that decides cannot drift.

Answer checking in review is **diacritic-strict by default**: `sona` is not `sõna` and accepting it
teaches the wrong spelling, with a "close, check the diacritics" hint rather than a bare wrong mark.

## 4. States

Every view specifies four states. v4.0 specified none (audit C6).

| View | Empty | Loading | Error | Offline |
|---|---|---|---|---|
| Today | "Nothing due. Add words or review ahead" + actions | Skeleton tiles | Section-level, others render | Fully functional |
| Dictionary | Search prompt + recent searches | Skeleton entry | "Ekilex unavailable, showing cached" | Cached entries open |
| Review | "Nothing due" + what to do instead | Instant (local) | n/a | Fully functional, grades queue (ADR-015) |
| Anu | Persona intro + chips | Streaming cursor | Typed error + retry, message preserved | "Anu needs a connection" |
| Calendar | An empty week with a way to add a class or a study slot | Skeleton grid | Page-level | Cached page |
| Import (in Settings) | Paste area with format examples | Parse progress | Row-level errors, partial import allowed | Needs a connection to save |

### 4a. The screen a round opens on

A round is a fifth thing, and it is not a state: before any of it is drawn, a
screen says what will be on the screen and what the learner does about it, and
they press through it. `lib/copy/briefings.ts` is the copy and the argument;
`components/round/Briefing.tsx` is the drawing.

Two sentences, because they answer different questions. What will be there (the
pictures, the clock, the box) and what to do with it. The count of cards is
handed in by the page rather than written into the copy, because how many are
due tonight is a fact about one deck.

It is wired at the **page**, with the round as a child, so the round is not
mounted while the briefing is up: no clock has started and no clip has played
behind the screen somebody is reading. The page is also what knows whether
there is a round at all, so a view with nothing to do reaches its own empty
state above and draws no briefing.

Five rounds opened on a start screen of their own before this existed and keep
it, reading the same two sentences so the wording is one table's. Four screens
are exempt in `lib/copy/briefingCoverage.ts`, every one of them a screen that
already opens on a briefing of its own, and a sweep over the filesystem fails
on a round that opens cold.

## 5. Accessibility (audit C8)

Target **WCAG 2.2 AA**. Not aspiration. This app is used for an hour a day.

- **Full keyboard operation.** Every action reachable without a mouse; visible focus rings; logical
  tab order; no keyboard traps.
- **Screen reader.** Semantic landmarks, labelled controls, `aria-live="polite"` on streaming tutor
  responses and on review grading feedback.
- **Contrast** ≥ 4.5:1 for text, ≥ 3:1 for UI boundaries, verified in both themes.
- **Never colour alone.** A marked answer, a rating and a state all carry a word, an icon or a
  different kind of object as well as a colour (`14-design-system.md` §1).
- **`prefers-reduced-motion`** respected, so card flip animations become instant.
- **Text scaling** to 200% without loss of function.
- **Audio never required.** Listening cards always offer a text alternative, and when the TTS
  proxy cannot produce any, Listening and Dictation say so and show the word rather than leaving a
  silent exercise with no question in it.
- **Shortcuts are documented, not folklore.** `?` anywhere opens the shortcut sheet
  (`components/Shortcuts.tsx`), which lists every binding the app actually implements. It stays out
  of the way while a field has focus, because `?` is a character before it is a command. Nothing is
  keyboard-only: the sheet is a shortcut to what the tab order already reaches.

## 6. Visual design

> Superseded in detail by `14-design-system.md` (2026-08). The principles below still hold; the
> palette, type and shape they are implemented with now live there.

- Light and dark themes. Light is the default for everybody and dark is the reader's own choice,
  stored by the toggle; the OS preference is not followed (see CLAUDE.md).
- One accent colour. Case colour-coding was planned here and was not built: the five hues carry
  fixed meanings (recalled, nearly, missed) and a case needs fourteen, so a case is named by its
  Estonian name and the question it answers instead.
- Estonian text in a font with proper `õ ä ö ü` rendering; forms in a slightly larger size than UI
  chrome, since they are the content.
- Density: comfortable in Dictionary and Anu, compact in Progress.

## 7. Responsive

Both a laptop at a desk and a phone on a bus, measured at 360, 390, 430, 768 and 1280
(`scripts/test-mobile.mjs`):

- The rail becomes a bottom bar under 768 px, and a More sheet with the same headings.
- **Review must be fully usable on a phone**, with large tap targets replacing the number keys. Ten
  minutes of reviews on a bus is a real use case even when authoring is not.
- Dictionary tables scroll horizontally inside their own container; the page body never scrolls
  sideways.
