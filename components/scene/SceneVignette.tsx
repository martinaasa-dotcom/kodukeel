import { sceneryFor, type Ambience } from "@/lib/scenes/scenery";

/**
 * THE SITUATION, DRAWN, IN FIVE STICK FIGURES AND A COUNTER.
 *
 * A scene is a place with somebody in it who wants something from you, and for
 * fourteen scenes that was a sentence and nothing else. An icon says what kind
 * of place; it does not say that there is a person on the other side of it,
 * which is the whole of what a situation is.
 *
 * WHY STICK FIGURES, WHICH IS A DECISION RATHER THAN A LIMIT. There is no
 * artwork in this app and there will not be: a drawing per scene is a licence
 * question nobody on this project can answer, fourteen files to ship, and
 * fourteen more the day somebody writes another scene. Everything here is
 * strokes in an SVG, drawn from the same handful of lines, so a fifteenth scene
 * costs a row in `lib/scenes/scenery.ts` and no file at all.
 *
 * OUTLINES, IN THE INK, IN NO HUE. The five colours in this app carry fixed
 * meanings and are not free for decoration: a café drawn in mint would spend
 * "you got it" on a coffee cup. These are `--ink-2` on whatever ground they sit
 * on, which is the same pair of tokens the prose beside them uses and flips
 * with the theme without being told to.
 *
 * DECORATION, AND IT SAYS SO. Everything it carries is written out beside it,
 * which is what lets the whole thing be hidden from a screen reader. A drawing
 * may not be the only thing carrying a distinction, exactly as a colour may
 * not.
 *
 * Five drawings for fourteen scenes, keyed on the same `Ambience` the small
 * mark uses, so a place moves and is drawn the one way. `scenery.test.ts`
 * fails on an ambience nothing names, which is what stops a sixth being added
 * for one scene and read by nobody.
 */
export function SceneVignette({ sceneId, className = "" }: { sceneId: string; className?: string }) {
  const kind = sceneryFor(sceneId).ambience;
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 120"
      className={`h-auto w-full max-w-[19rem] ${className}`}
      style={{ color: "var(--ink-2)" }}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The floor they are all standing on, quieter than they are. */}
      <path d="M 22 101 H 178" stroke="var(--rule)" strokeWidth={2} />
      <Drawing kind={kind} />
    </svg>
  );
}

/**
 * One person, from six lines.
 *
 * `x` is where they stand and everything is measured off a floor at 101, so a
 * figure can be put down anywhere along it without a second set of numbers.
 * `behind` leaves the legs off, which is what somebody standing behind a
 * counter looks like: the counter is drawn over them and a pair of legs
 * showing through it is the one thing that would give the whole drawing away.
 */
function Person({ x, arms = "down", behind, facing = "right", className }: {
  x: number;
  /** What their hands are doing: resting, gesturing at you, or holding a phone. */
  arms?: "down" | "out" | "phone";
  behind?: true;
  /**
   * Which way the raised hand goes.
   *
   * Everybody in these drawings is talking to somebody, and the first version
   * had the person on the right gesturing off the right-hand edge and holding
   * a phone to the far ear: two people in a conversation, both facing away
   * from it. It is one sign on the arm rather than a second set of paths.
   */
  facing?: "left" | "right";
  className?: string;
}) {
  const d = facing === "left" ? -1 : 1;
  const arm = arms === "phone"
    ? `M ${x - 11 * d} 79 L ${x} 67 L ${x + 8 * d} 58`
    : arms === "out"
      ? `M ${x - 11 * d} 75 L ${x} 67 L ${x + 14 * d} 70`
      : `M ${x - 11} 79 L ${x} 67 L ${x + 11} 79`;
  return (
    <g className={className}>
      <circle cx={x} cy={54} r={8} />
      <path d={`M ${x} 62 V ${behind ? 73 : 85}`} />
      <path d={arm} />
      {!behind && <path d={`M ${x - 9} 101 L ${x} 85 L ${x + 9} 101`} />}
    </g>
  );
}

/** A desk, a bar, a ticket window: the thing between the two of you. */
function Counter({ from, to }: { from: number; to: number }) {
  return <path d={`M ${from} 76 H ${to} V 101 M ${from} 76 V 101`} />;
}

function Drawing({ kind }: { kind: Ambience }) {
  if (kind === "queue") {
    // A counter, somebody behind it, and you in front of it. Nothing else.
    return (
      <>
        <Person x={58} />
        <Counter from={106} to={176} />
        <Person x={140} arms="out" behind facing="left" />
      </>
    );
  }

  if (kind === "steam") {
    // The same counter with something hot on it, which is the whole difference.
    return (
      <>
        <Person x={58} />
        <Counter from={106} to={176} />
        <Person x={140} arms="out" behind facing="left" />
        <path d="M 112 68 h 13 v 8 h -13 z" />
        <path d="M 125 70 a 4 4 0 0 1 0 5" />
        {[1, 2, 3].map((at) => (
          <path
            key={at}
            className={`stick-steam amb-${at}`}
            d={`M ${111 + at * 4} 64 v -8`}
            style={{ opacity: 0 }}
          />
        ))}
      </>
    );
  }

  if (kind === "ring") {
    /*
      Two people who cannot see each other, which is what makes a phone call
      the hardest of these: no face, no counter, nothing to point at. The
      hand at the ear is the phone; a drawn handset would be two more shapes
      saying what the arm already says.
    */
    return (
      <>
        <Person x={44} arms="phone" />
        {[1, 2, 3].map((at) => (
          <path
            key={at}
            className={`stick-arc amb-${at}`}
            d={`M ${84 + at * 10} ${50 - at * 3} a ${9 + at * 5} ${9 + at * 5} 0 0 1 0 ${18 + at * 6}`}
            style={{ opacity: 0 }}
          />
        ))}
        <Person x={162} arms="phone" facing="left" />
      </>
    );
  }

  if (kind === "travel") {
    // Somebody walking, and the somewhere they are walking to.
    return (
      <>
        <g className="stick-bob">
          <circle cx={62} cy={54} r={8} />
          <path d="M 62 62 V 85" />
          <path d="M 51 75 L 62 67 L 74 76" />
          <path className="stick-legs-a" d="M 52 101 L 62 85 L 72 101" />
          <path className="stick-legs-b" d="M 57 101 L 62 85 L 68 101" style={{ opacity: 0 }} />
        </g>
        <path d="M 156 101 V 48" />
        <path d="M 156 50 h 24 l -6 7 l 6 7 h -24" />
      </>
    );
  }

  /*
    Across a table, which is the shape of a classroom and of an interview: no
    counter to hide behind, and somebody looking straight at you.
  */
  return (
    <>
      <Person x={48} />
      <path d="M 78 78 H 122 M 84 78 V 101 M 116 78 V 101" />
      <Person x={152} arms="out" facing="left" className="stick-nod" />
    </>
  );
}
