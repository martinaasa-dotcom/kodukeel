/*
  THE BROWSERS A LEARNER ASKED TO BE REMINDED ON.

  The database half of VB-10; `lib/push/` is the half with no database in it.
  Every function here takes an owner id from its caller, so none of it may be
  an export of a `"use server"` file: the Server Actions resolve the owner with
  `requireUserId()` and hand it in.
*/
import { prisma } from "@/lib/db";
import type { DeviceKeys } from "@/lib/push/subscription";

/**
 * How many browsers one learner may be reminded on.
 *
 * A home computer, a work one, a laptop and a phone with the app installed is
 * four, and ten is room for a reinstall or two before the old address has been
 * reported gone. It is also the bound on what one run posts for one learner,
 * which is the reason it exists: without it an account could register
 * thousands of addresses and turn each reminder into thousands of requests.
 */
export const MAX_DEVICES = 10;

export interface Device extends DeviceKeys {
  readonly id: string;
}

/**
 * Keep a browser's address and keys for this learner.
 *
 * An upsert on the address, because the address belongs to one browser
 * profile: on a shared computer, whoever last turned reminders on is who that
 * browser reminds, and the row moves to them rather than reminding two people
 * on one screen. Past `MAX_DEVICES` the oldest of this learner's browsers is
 * let go, inside the same transaction so two presses cannot both slip past the
 * count.
 */
export async function rememberDevice(ownerId: string, device: DeviceKeys): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`push:${ownerId}`}, 0))`;
    await tx.pushSubscription.upsert({
      where: { endpoint: device.endpoint },
      create: { ownerId, endpoint: device.endpoint, p256dh: device.p256dh, auth: device.auth },
      // Turned on again is turned on now: the oldest let go below is the one least recently asked for.
      update: { ownerId, p256dh: device.p256dh, auth: device.auth, createdAt: new Date() },
    });
    const surplus = await tx.pushSubscription.findMany({
      where: { ownerId },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: MAX_DEVICES,
      select: { id: true },
    });
    if (surplus.length > 0) {
      await tx.pushSubscription.deleteMany({ where: { id: { in: surplus.map((row) => row.id) } } });
    }
  });
}

/** Stop reminding one of this learner's browsers. True where there was one to stop. */
export async function forgetDevice(ownerId: string, endpoint: string): Promise<boolean> {
  const { count } = await prisma.pushSubscription.deleteMany({ where: { ownerId, endpoint } });
  return count > 0;
}

/** Whether this learner is reminded on the browser with this address. */
export async function deviceKnown(ownerId: string, endpoint: string): Promise<boolean> {
  const row = await prisma.pushSubscription.findFirst({ where: { ownerId, endpoint }, select: { id: true } });
  return row !== null;
}

/** Whether this learner has asked to be reminded on any browser at all. */
export async function hasDevice(ownerId: string): Promise<boolean> {
  const row = await prisma.pushSubscription.findFirst({ where: { ownerId }, select: { id: true } });
  return row !== null;
}

/** This learner's browsers, newest first, at most `MAX_DEVICES` of them. */
export async function devicesFor(ownerId: string): Promise<Device[]> {
  return prisma.pushSubscription.findMany({
    where: { ownerId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAX_DEVICES,
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
}

/** A browser its push service says no longer exists. */
export async function dropDevice(id: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { id } });
}
