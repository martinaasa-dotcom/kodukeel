"use client";

import type { ReactNode } from "react";
import { Volume2 } from "lucide-react";
import { Speak } from "@/components/Speak";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";

/**
 * THE SINGULAR AND PLURAL TABLE A LESSON DRAWS, ONE DRAWING FOR EVERY STEP.
 *
 * A row per case (or per form, for a verb), a singular column and a plural
 * column, each form a chip you press to hear, its case's Estonian name under
 * it, and whatever the row wants under that (the Words step puts the lesson's
 * own sentence there). One grid template for every card on a page, so the
 * labels and both columns sit on the same vertical lines however many cards
 * there are, and on a phone each row stacks with the column named beside the
 * chip. New-tonight forms wear the accent; a form shown only for its place in
 * the table sits quietly in white.
 *
 * Shared by design (operator's call, 2026-11-06): the How it works step's
 * table is to be drawn with this too, so a lesson has one look for a word's
 * forms rather than two.
 */
export interface GridCell {
  readonly et: string;
  readonly fresh: boolean;
  /** The case's Estonian name under the chip ("osastav", "mitmuse osastav"); empty for none. */
  readonly name?: string;
  /** A short English note after the name ("the endings go on it"). */
  readonly note?: string;
  /** A person or a gloss beside the form inside the chip ("I", "he, she"). */
  readonly who?: string;
}

export interface GridRow {
  readonly key: string;
  readonly label: ReactNode;
  /** A small line under the label, for a row whose forms are not cases ("lihtminevik"). */
  readonly sub?: ReactNode;
  readonly sg?: GridCell;
  readonly pl?: GridCell;
  /** A row of forms side by side, where the word does not decline. */
  readonly forms?: readonly GridCell[];
  readonly below?: ReactNode;
}

/** One template for every grid on the page: the label, then singular and plural. */
export const FORM_GRID_COLUMNS = "sm:grid-cols-[13.5rem_minmax(0,1fr)_minmax(0,1fr)]";

/** One form, as one chip you press to hear. */
export function FormChip({ cell }: { cell: GridCell }) {
  const t = useT();
  return (
    <Speak
      text={cell.et}
      label={fill(t("Hear {word}"), { word: cell.et })}
      className="tap-tint inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5"
      style={{
        background: cell.fresh ? "var(--accent-soft)" : "var(--surface)",
        boxShadow: cell.fresh ? "none" : "inset 0 0 0 1px var(--edge)",
      }}
    >
      <Volume2 size={14} aria-hidden style={{ color: cell.fresh ? "var(--accent-deep)" : "var(--ink-3)" }} />
      <span lang="et" className="text-base font-semibold" style={{ color: cell.fresh ? "var(--accent-deep)" : "var(--ink)" }}>{cell.et}</span>
      {cell.who && <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>{cell.who}</span>}
    </Speak>
  );
}

function Cell({ cell }: { cell: GridCell }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <FormChip cell={cell} />
      {(cell.name || cell.note) && (
        <span className="pl-1 text-sm leading-snug" style={{ color: "var(--ink-3)" }}>
          {cell.name && <span lang="et">{cell.name}</span>}
          {cell.name && cell.note ? ": " : null}
          {cell.note}
        </span>
      )}
    </span>
  );
}

function ColumnName({ children, phone }: { children: ReactNode; phone?: boolean }) {
  return <span className={`label-xs ${phone ? "w-16 shrink-0 sm:hidden" : ""}`} style={{ color: "var(--ink-3)" }}>{children}</span>;
}

/**
 * The grid itself. `plural` draws the plural column; a word that declines but
 * whose rows tonight are all singular draws one column rather than an empty
 * second one. `forms` rows (a verb's) span both columns.
 */
export function FormGrid({ rows, plural, columns = true }: { rows: readonly GridRow[]; plural: boolean; columns?: boolean }) {
  const t = useT();
  const declines = rows.some((r) => r.sg || r.pl);
  return (
    <div>
      {columns && declines && (
        <div className={`hidden gap-x-4 px-4 pb-2 sm:grid ${FORM_GRID_COLUMNS}`}>
          <span />
          <ColumnName>{t("Singular")}</ColumnName>
          {plural && <ColumnName>{t("Plural")}</ColumnName>}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.key} className="rounded-[var(--r-sm)] px-4 py-3" style={{ background: "var(--raised)" }} data-form-row>
            <div className={`grid grid-cols-1 items-center gap-x-4 gap-y-2 ${FORM_GRID_COLUMNS}`}>
              <div>
                <p className="text-base font-semibold leading-snug" style={{ color: "var(--ink)" }}>{r.label}</p>
                {r.sub && <p className="text-sm leading-snug" style={{ color: "var(--ink-3)" }}>{r.sub}</p>}
              </div>
              {r.forms ? (
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  {r.forms.map((c) => <Cell key={c.et} cell={c} />)}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {plural && r.sg && <ColumnName phone>{t("Singular")}</ColumnName>}
                    {r.sg && <Cell cell={r.sg} />}
                  </div>
                  {plural && (
                    <div className="flex items-center gap-2">
                      {r.pl && <><ColumnName phone>{t("Plural")}</ColumnName><Cell cell={r.pl} /></>}
                    </div>
                  )}
                </>
              )}
            </div>
            {r.below && <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--edge)" }}>{r.below}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
