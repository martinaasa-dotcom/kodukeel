import type { DayBucket } from "@/lib/stats/history";

const LEVEL_COLOR: Record<number, string> = {
  /* A quiet day is barely there, and a busy one runs cyan to violet to
     blush: the night's colours as a ramp rather than one hue in four strengths. */
  0: "color-mix(in srgb, var(--ink) 6%, var(--surface))",
  1: "color-mix(in srgb, var(--sky) 45%, var(--surface))",
  2: "color-mix(in srgb, var(--accent) 50%, var(--surface))",
  3: "var(--accent)",
  4: "var(--blush)",
};

/**
 * A contribution grid of the last six months.
 *
 * Columns are weeks, rows are weekdays, starting on Monday — the Estonian week,
 * and the one on every school timetable here. The grid is padded at the front so
 * the first column lines up with the right weekday rather than starting wherever
 * the window happens to open.
 *
 * It scrolls horizontally inside its own box: a heatmap that makes the whole
 * page scroll sideways on a phone is worse than no heatmap.
 */
export function Heatmap({ days }: { days: DayBucket[] }) {
  const first = days[0];
  if (!first) return null;

  const firstDate = new Date(`${first.day}T00:00:00`);
  // getDay(): 0 is Sunday. Monday-first means Sunday sits at the bottom, row 6.
  const pad = (firstDate.getDay() + 6) % 7;
  const cells: (DayBucket | null)[] = [...Array<null>(pad).fill(null), ...days];
  const weeks: (DayBucket | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const active = days.filter((d) => d.count > 0).length;

  /*
    Months across the top, one label on the week each month starts in. Read off
    the day string rather than a Date, so no zone can move a label a column.
  */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthAt = weeks.map((week) => {
    const firstOfMonth = week.find((c) => c && c.day.endsWith("-01"));
    if (firstOfMonth) return MONTHS[Number(firstOfMonth.day.slice(5, 7)) - 1] ?? "";
    return "";
  });
  /* The window opens mid-month, so the first column names its month too,
     unless a label is due within three weeks and the two would collide. */
  const firstLabelAt = monthAt.findIndex((m) => m !== "");
  if (firstLabelAt === -1 || firstLabelAt >= 3) {
    const c = weeks[0]?.find(Boolean);
    if (c) monthAt[0] = MONTHS[Number(c.day.slice(5, 7)) - 1] ?? "";
  }

  return (
    <div>
      {/*
        The grid fills its card. It drew fixed 10px squares and so filled
        about half of it on a desktop, a small patch in a wide empty box; the
        columns are shares of the width now, square by their own aspect ratio,
        and never under 10px, where the box scrolls rather than squeezes.
      */}
      {/* A region a keyboard can reach, since on a phone it scrolls: a box
          that scrolls and cannot take focus is a box a keyboard cannot read. */}
      {/* Written right to left and read left to right, so a box that scrolls
          opens on this week rather than on the one six months ago: the edge a
          phone shows first is the edge anybody is looking for. */}
      <div dir="rtl" className="overflow-x-auto pb-1" tabIndex={0} role="region" aria-label="Reviews per day, last six months">
        <div dir="ltr" style={{ minWidth: weeks.length * 13 }}>
          <div
            aria-hidden
            className="mb-1.5 grid gap-[3px] text-2xs"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(10px, 1fr))`, color: "var(--ink-3)" }}
          >
            {/* Only the weeks that start a month get a label, placed on their
                own column: an empty span for every other week sat over the
                name spilling into it, so a hit test read the month as covered. */}
            {monthAt.map((m, i) => m && (
              <span key={i} className="overflow-visible whitespace-nowrap" style={{ gridColumnStart: i + 1, gridRowStart: 1 }}>{m}</span>
            ))}
          </div>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(10px, 1fr))`, gridTemplateRows: "repeat(7, auto)", gridAutoFlow: "column" }}
          >
            {weeks.flatMap((week, wi) =>
              Array.from({ length: 7 }, (_, di) => {
                const cell = week[di] ?? null;
                if (!cell) return <span key={`${wi}-${di}`} className="block aspect-square" aria-hidden />;
                return (
                  <span
                    key={`${wi}-${di}`}
                    /* 2px, not a token radius: anything larger rounds a small
                       cell into a dot and the grid stops reading as a
                       calendar. Data cells are the one exception (docs §2). */
                    className="heat-cell block aspect-square rounded-[2px]"
                    style={{ background: LEVEL_COLOR[cell.level] }}
                    title={`${cell.day}: ${cell.count} review${cell.count === 1 ? "" : "s"}`}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-2xs" style={{ color: "var(--ink-3)" }}>
        <span>{total} reviews on {active} days in the last {days.length}</span>
        <span className="ml-auto flex items-center gap-1.5">
          Quiet
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="block h-[10px] w-[10px] rounded-[2px]" style={{ background: LEVEL_COLOR[l] }} aria-hidden />
          ))}
          Busy
        </span>
      </div>
    </div>
  );
}
