import type { Reservation } from "./ledger";

/**
 * ONE BOOKING, SEVERAL CALLS, AND THE LEDGER HAS TO COME OUT AT WHAT THEY COST.
 *
 * `recordUsage` files a settlement as `actual - reservation.micros`, which is
 * right for one call against one booking: the two rows together come to what
 * was spent. A scene turn books once and may then ask a model up to
 * `MAX_COMPOSE_ATTEMPTS` times, because a line the gate withholds is asked for
 * again. Every attempt was settled against the same booking, so each one took
 * the whole reserve off again: three attempts at a tenth of the reserve each
 * came to three tenths of it spent less twice the reserve, a turn that cost
 * money filed as money handed back. And where all three were withheld, the
 * route then released the booking as well, taking the reserve off a fourth
 * time for calls that had reached a provider and been billed. The daily
 * budget, which is the one hard ceiling on the bill, read every such turn as
 * a credit.
 *
 * So the first report settles the booking and every later one is filed as a
 * settlement against nothing: it adds its whole cost to the day's spend and,
 * being a `SETTLEMENT` rather than a `CALL`, nothing to the call counts, since
 * the turn was booked as one call and that is what the allowance counts. And a
 * booking that has been settled is not released, because a release says the
 * call reached nobody and these did.
 *
 * Pure: no database, no clock. `ledger.ts` is imported for its type alone.
 */
export interface TurnBooking {
  /** The reservation the next usage report settles. Call once per report, in the order they arrive. */
  settle(): Reservation;
  /** Whether any report has settled it, which is when it may no longer be released. */
  readonly settled: boolean;
}

export function turnBooking(reservation: Reservation): TurnBooking {
  let settled = false;
  return {
    settle() {
      if (settled) return { ...reservation, micros: 0 };
      settled = true;
      return reservation;
    },
    get settled() {
      return settled;
    },
  };
}
