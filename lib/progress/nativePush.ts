/*
  THE PHONES A LEARNER ASKED TO BE REMINDED ON (N-9).

  The database half of native notifications; `lib/push/native.ts` and
  `lib/push/fcm.ts` are the halves with no database in them. Every function
  here takes the owner from its caller, which is `POST` and `DELETE
  /api/v1/push-devices` after the bearer check, and the mailout.

  The shape is `lib/progress/push.ts`'s for a browser: a token belongs to one
  install, so registering it moves it to whoever registered it last, and a
  learner's phones are bounded so one account cannot turn a reminder into a
  thousand requests.
*/
import { prisma } from "@/lib/db";
import type { NativePlatform } from "@/lib/push/native";

/**
 * How many phones one learner may be reminded on. A phone, a tablet and a
 * reinstall or two before Firebase has reported the old token gone.
 */
export const MAX_NATIVE_DEVICES = 10;

export interface NativeDeviceRow {
  readonly id: string;
  readonly token: string;
  readonly platform: NativePlatform;
}

/**
 * Keep a phone's token for this learner, or note that it was seen again.
 *
 * An upsert on the token, inside the learner's own advisory lock so two
 * launches at once cannot both slip past the count, and past
 * `MAX_NATIVE_DEVICES` the phone seen least recently is let go.
 */
export async function registerNativeDevice(
  ownerId: string,
  device: { token: string; platform: NativePlatform; appBuild: string | null },
  now: Date = new Date(),
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`native-push:${ownerId}`}, 0))`;
    await tx.nativePushDevice.upsert({
      where: { token: device.token },
      create: { ownerId, token: device.token, platform: device.platform, appBuild: device.appBuild, createdAt: now, lastSeenAt: now },
      update: { ownerId, platform: device.platform, appBuild: device.appBuild, lastSeenAt: now },
    });
    const surplus = await tx.nativePushDevice.findMany({
      where: { ownerId },
      orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
      skip: MAX_NATIVE_DEVICES,
      select: { id: true },
    });
    if (surplus.length > 0) {
      await tx.nativePushDevice.deleteMany({ where: { id: { in: surplus.map((row) => row.id) } } });
    }
  });
}

/** Stop reminding one of this learner's phones. True where there was one to stop. */
export async function forgetNativeDevice(ownerId: string, token: string): Promise<boolean> {
  const { count } = await prisma.nativePushDevice.deleteMany({ where: { ownerId, token } });
  return count > 0;
}

/** Whether this learner has a phone to remind at all. */
export async function hasNativeDevice(ownerId: string): Promise<boolean> {
  const row = await prisma.nativePushDevice.findFirst({ where: { ownerId }, select: { id: true } });
  return row !== null;
}

/** This learner's phones, seen most recently first, at most `MAX_NATIVE_DEVICES` of them. */
export async function nativeDevicesFor(ownerId: string): Promise<NativeDeviceRow[]> {
  const rows = await prisma.nativePushDevice.findMany({
    where: { ownerId },
    orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
    take: MAX_NATIVE_DEVICES,
    select: { id: true, token: true, platform: true },
  });
  // The column is a string; a row from some other writer naming neither platform is skipped.
  return rows.filter((r): r is NativeDeviceRow => r.platform === "ios" || r.platform === "android");
}

/** A phone Firebase says no longer exists. */
export async function dropNativeDevice(id: string): Promise<void> {
  await prisma.nativePushDevice.deleteMany({ where: { id } });
}
