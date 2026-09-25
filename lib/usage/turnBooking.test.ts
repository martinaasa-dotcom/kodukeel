import { describe, expect, it } from "vitest";
import { turnBooking } from "./turnBooking";
import type { Reservation } from "./ledger";

const booked: Reservation = { id: "r1", ownerId: "o1", kind: "SCENE", micros: 1_000 };

/** What `recordUsage` files for one report: the difference against the booking it is handed. */
const filed = (actual: number, against: Reservation) => actual - against.micros;

describe("one booking settled by several calls", () => {
  it("comes out at what the calls cost, however many there were", () => {
    const booking = turnBooking(booked);
    const actuals = [120, 90, 150];
    const rows = [booked.micros, ...actuals.map((a) => filed(a, booking.settle()))];
    expect(rows.reduce((a, b) => a + b, 0)).toBe(120 + 90 + 150);
  });

  it("settles the booking itself on the first report and nothing after", () => {
    const booking = turnBooking(booked);
    expect(booking.settled).toBe(false);
    expect(booking.settle()).toBe(booked);
    expect(booking.settled).toBe(true);
    expect(booking.settle()).toEqual({ ...booked, micros: 0 });
  });

  it("leaves an unreported booking unsettled, which is the one a release may hand back", () => {
    expect(turnBooking(booked).settled).toBe(false);
  });
});
