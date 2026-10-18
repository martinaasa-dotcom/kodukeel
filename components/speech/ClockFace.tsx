/**
 * A CLOCK ON THE WALL, FOR THE NUMBERS ROUND (docs/41-fifth-batch.md, VB-7).
 *
 * A small analogue face drawn in the app's own tokens, which is the one
 * drawing D17 allows this batch: not a room, no new typeface, no new units.
 * Twelve ticks, the four quarters marked heavier, an hour hand and a minute
 * hand. No numerals on the face: an Estonian kitchen clock rarely has them
 * and the question is reading the hands.
 *
 * An analogue clock cannot say whether it is morning or afternoon, which is
 * why the round accepts either reading under it (`lib/games/numbers.ts`).
 *
 * For a screen reader it is an image labelled with the time in digits, the
 * same question a sighted learner reads off the hands. A server component:
 * nothing on it moves.
 */
export function ClockFace({ hour, minute, label, size = 168 }: {
  /** 0 to 23; drawn on twelve hours. */
  readonly hour: number;
  readonly minute: number;
  /** What a screen reader is told, with the time in digits. */
  readonly label: string;
  readonly size?: number;
}) {
  // The hour hand moves through the hour, as a real one does: half past two is halfway to three.
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="clock-face shrink-0"
      data-clock={`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
    >
      <circle cx="50" cy="50" r="46" fill="var(--surface)" stroke="var(--rule)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="41" fill="var(--raised)" />
      {ticks.map((i) => {
        const quarter = i % 3 === 0;
        return (
          <line
            key={i}
            x1="50"
            y1={quarter ? 12.5 : 13.5}
            x2="50"
            y2={quarter ? 20 : 17.5}
            stroke={quarter ? "var(--ink-2)" : "var(--ink-3)"}
            strokeWidth={quarter ? 3 : 1.6}
            strokeLinecap="round"
            transform={`rotate(${i * 30} 50 50)`}
          />
        );
      })}
      <line
        x1="50" y1="54" x2="50" y2="29"
        stroke="var(--ink)" strokeWidth="5" strokeLinecap="round"
        transform={`rotate(${hourAngle} 50 50)`}
        data-hand="hour"
      />
      <line
        x1="50" y1="56" x2="50" y2="17"
        stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round"
        transform={`rotate(${minuteAngle} 50 50)`}
        data-hand="minute"
      />
      <circle cx="50" cy="50" r="4" fill="var(--accent-deep)" stroke="var(--surface)" strokeWidth="1.5" />
    </svg>
  );
}
