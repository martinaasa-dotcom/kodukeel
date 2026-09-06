import { sceneryFor, type Setting } from "@/lib/scenes/scenery";

/**
 * THE ROOM A CONVERSATION HAPPENS IN, DRAWN.
 *
 * A scene is a place with somebody in it who wants something from you, and for
 * fourteen scenes that was a sentence and nothing else. An icon says what kind
 * of place; it does not say there is a person on the other side of a counter,
 * which is the whole of what a situation is.
 *
 * ONE ROOM PER PLACE. The first version of this shared five drawings out among
 * fourteen scenes by mood, so a pharmacy and a health centre were the same
 * picture and so were a bus station and a street corner. A mood is a category,
 * and the category is already in the scene's title; what a learner does not
 * have is the room. So a pharmacy has a cross over the counter and a bottle on
 * it, a bus station has a bus in it, a restaurant has a plate on the table, and
 * a stairwell has stairs.
 *
 * WHY STICK FIGURES, WHICH IS A DECISION RATHER THAN A LIMIT. There is no
 * artwork in this app and there will not be: a drawing per scene is a licence
 * question nobody on this project can answer, and a file per scene to carry.
 * Everything here is strokes, built out of the same three parts, so a fifteenth
 * room costs a branch and no file at all.
 *
 * OUTLINES, IN THE INK, IN NO HUE. The five colours in this app carry fixed
 * meanings and are not free for decoration: a café drawn in mint would spend
 * "you got it" on a coffee cup. These are `--ink-2` on whatever ground they sit
 * on, which is the pair of tokens the prose beside them uses and flips with the
 * theme without being told to.
 *
 * DECORATION, AND IT SAYS SO. Everything it carries is written out beside it,
 * which is what lets the whole thing be hidden from a screen reader. A drawing
 * may not be the only thing carrying a distinction, exactly as a colour may
 * not.
 *
 * Every room moves once, and only once: somebody nods, steam comes off
 * something, a queue steps up, a phone rings out, a bus idles. Slow and out of
 * phase with the rest, because this sits above a sentence somebody is reading
 * and a drawing that ticks at the speed of a cursor gets read instead of it.
 */
export function SceneVignette({ sceneId, setting, className = "" }: {
  sceneId: string;
  /**
   * The room to draw, where the caller knows it. A scene can walk somebody out
   * of one room and into another, so the conversation carries which one it is
   * in now (`SceneSession`); without it this is the room the scene opens in.
   */
  setting?: Setting;
  className?: string;
}) {
  const room = setting ?? sceneryFor(sceneId).setting;
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
      <Room of={room} />
    </svg>
  );
}

/**
 * One person, from six lines.
 *
 * `x` is where they stand and everything is measured off a floor at 101, so a
 * figure can be put down anywhere along it without a second set of numbers.
 * `behind` leaves the legs off, which is what somebody standing behind a
 * counter looks like: the counter is drawn over them and a pair of legs showing
 * through it is the one thing that would give the whole drawing away.
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
   * had the person on the right gesturing off the right-hand edge and holding a
   * phone to the far ear: two people in a conversation, both facing away from
   * it. It is one sign on the arm rather than a second set of paths.
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
function Counter({ from = 106, to = 178 }: { from?: number; to?: number } = {}) {
  return <path d={`M ${from} 76 H ${to} V 101 M ${from} 76 V 101`} />;
}

/** Warmth coming off something, in the drawing's own units. */
function Steam({ x, y }: { x: number; y: number }) {
  return (
    <>
      {[1, 2, 3].map((at) => (
        <path
          key={at}
          className={`stick-steam amb-${at}`}
          d={`M ${x + at * 4} ${y} v -8`}
          style={{ opacity: 0 }}
        />
      ))}
    </>
  );
}

/** A line going out, which is a telephone seen from the outside. */
function Ringing({ x, y }: { x: number; y: number }) {
  return (
    <>
      {[1, 2, 3].map((at) => (
        <path
          key={at}
          className={`stick-arc amb-${at}`}
          d={`M ${x + at * 10} ${y - at * 3} a ${9 + at * 5} ${9 + at * 5} 0 0 1 0 ${18 + at * 6}`}
          style={{ opacity: 0 }}
        />
      ))}
    </>
  );
}

function Room({ of }: { of: Setting }) {
  switch (of) {
    case "clinic":
      // A reception desk, and the chairs you wait in to reach it.
      return (
        <>
          <path d="M 20 101 V 89 h 11 V 101 M 20 89 V 79" />
          <path d="M 38 101 V 89 h 11 V 101 M 38 89 V 79" />
          <Person x={76} />
          <Counter />
          <Person x={142} arms="out" behind facing="left" className="stick-nod" />
        </>
      );

    case "pharmacy":
      // The same counter with a cross over it, a bottle on it, and somebody
      // waiting behind you, which is what makes a pharmacy a pharmacy.
      return (
        <>
          <Person x={26} className="amb-queue" />
          <Person x={70} />
          <path d="M 154 28 v 16 M 146 36 h 16" />
          <Counter />
          <path d="M 112 64 h 9 v 12 h -9 z M 114 64 v -3 h 5 v 3" />
          <Person x={142} arms="out" behind facing="left" />
        </>
      );

    case "office":
      // A counter, and the piece of paper the whole conversation is about.
      return (
        <>
          <Person x={58} />
          <Counter />
          <path d="M 112 62 h 16 v 14 h -16 z M 115 67 h 10 M 115 71 h 10" />
          <Person x={142} arms="out" behind facing="left" className="stick-nod" />
        </>
      );

    case "cafe":
      // A counter with something hot on it, which is the whole difference.
      return (
        <>
          <Person x={58} />
          <Counter />
          <path d="M 112 68 h 13 v 8 h -13 z M 125 70 a 4 4 0 0 1 0 5" />
          <Steam x={110} y={64} />
          <Person x={142} arms="out" behind facing="left" />
        </>
      );

    case "restaurant":
      // A table with a plate on it and somebody standing over it, which is a
      // restaurant rather than a counter: you sit and they come to you.
      return (
        <>
          <Person x={40} />
          <path d="M 72 78 H 138 M 78 78 V 101 M 132 78 V 101" />
          <ellipse cx={104} cy={75} rx={11} ry={3.5} />
          <Steam x={96} y={70} />
          <Person x={166} arms="out" facing="left" className="stick-nod" />
        </>
      );

    case "shop":
      // Shelves, and you in among them with a phone to your ear, which is where
      // this errand actually happens.
      return (
        <>
          <Person x={44} arms="phone" />
          <Ringing x={72} y={48} />
          <path d="M 112 34 V 70 M 184 34 V 70 M 112 50 H 184 M 112 70 H 184" />
          <path d="M 118 40 h 12 v 10 h -12 z M 138 42 h 10 v 8 h -10 z M 156 38 h 14 v 12 h -14 z" />
          <path d="M 118 60 h 14 v 10 h -14 z M 142 62 h 11 v 8 h -11 z" />
        </>
      );

    case "returns":
      // A counter with the thing you are bringing back sitting on it.
      return (
        <>
          <Person x={58} />
          <Counter />
          <path d="M 112 60 h 20 v 16 h -20 z M 122 60 v 16" />
          <Person x={144} arms="out" behind facing="left" className="stick-nod" />
        </>
      );

    case "bus":
      // A bus, idling, and you on the pavement beside the window.
      return (
        <>
          <Person x={44} />
          <g className="stick-bob">
            <path d="M 96 58 h 84 v 36 h -84 z" />
            <path d="M 102 64 h 20 v 12 h -20 z M 128 64 h 20 v 12 h -20 z" />
            <path d="M 156 64 h 18 v 30 h -18 z" />
            <circle cx={114} cy={95} r={6} />
            <circle cx={164} cy={95} r={6} />
          </g>
        </>
      );

    case "street":
      // A pavement, a lamp post, and somebody who lives here.
      return (
        <>
          <Person x={54} />
          <Person x={122} arms="out" facing="left" className="stick-nod" />
          <path d="M 172 101 V 38 M 165 38 h 14 v 7 h -14 z" />
        </>
      );

    case "stairwell":
      // The stairs in your own building, which is where you meet a neighbour.
      return (
        <>
          <Person x={36} />
          <Person x={84} arms="out" facing="left" className="stick-nod" />
          <path d="M 112 101 h 18 v -13 h 18 v -13 h 18 v -13 h 16" />
        </>
      );

    case "walking":
      // On your way, with the phone still to your ear: the two legs take it in
      // turns, because a scissor is four lines and a walk cycle is a project.
      return (
        <>
          <g className="stick-bob">
            <circle cx={62} cy={54} r={8} />
            <path d="M 62 62 V 85" />
            <path d="M 51 79 L 62 67 L 70 58" />
            <path className="stick-legs-a" d="M 52 101 L 62 85 L 72 101" />
            <path className="stick-legs-b" d="M 57 101 L 62 85 L 68 101" style={{ opacity: 0 }} />
          </g>
          <Ringing x={92} y={48} />
          <path d="M 168 101 V 38 M 161 38 h 14 v 7 h -14 z" />
        </>
      );

    case "classroom":
      // A board on the wall and somebody teaching in front of it.
      return (
        <>
          <Person x={56} />
          <path d="M 108 14 h 78 v 30 h -78 z M 116 24 h 50 M 116 34 h 32" />
          <Person x={150} arms="out" facing="left" className="stick-nod" />
        </>
      );

    case "home_phone":
      // Your own place, and somebody on the other end of a line.
      return (
        <>
          <path d="M 20 101 V 60 L 62 34 L 104 60 V 101" />
          <Person x={62} arms="phone" />
          <Ringing x={122} y={48} />
        </>
      );

    case "meeting":
      /*
        Across a table, which is the shape of an interview: no counter to hide
        behind, a sheet of paper with your name on it, and somebody looking
        straight at you.
      */
      return (
        <>
          <Person x={48} />
          <path d="M 78 78 H 126 M 84 78 V 101 M 120 78 V 101" />
          <path d="M 94 70 h 16 v 8 h -16 z" />
          <Person x={156} arms="out" facing="left" className="stick-nod" />
        </>
      );
  }
}
