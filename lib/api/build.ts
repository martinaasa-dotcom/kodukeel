import { apiError } from "./errors";

/**
 * WHICH NATIVE BUILD IS ASKING, AND WHETHER IT IS STILL ALLOWED TO.
 *
 * A native app ships through a store and stays on a phone for months, so a
 * build that corrupts grades cannot be withdrawn by a deploy. The operator
 * sets the oldest build each platform may still use (`NATIVE_MIN_BUILD_IOS`,
 * `NATIVE_MIN_BUILD_ANDROID`), and every v1 route reads the header a native
 * app sends with every request, `X-Kodukeel-Build: ios/42`, and answers 426
 * `too_old` below that minimum. Stopping the build on the server is the point:
 * a build that is broken is exactly the build that cannot be trusted to read
 * `/api/v1/meta` and stop itself.
 *
 * A request carrying no header is not a native build (the mock, a test, a
 * script) and passes, and an unset minimum means any build. A header that
 * names a platform this list does not know, or no number, is refused as
 * invalid rather than waved through, since it is a native client that got
 * its own header wrong.
 *
 * The environment is a parameter rather than read here, so this layer stays
 * pure and a test can state the deployment it is about.
 */
export const BUILD_HEADER = "x-kodukeel-build";

export const NATIVE_PLATFORMS = ["ios", "android"] as const;
export type NativePlatform = (typeof NATIVE_PLATFORMS)[number];

export interface NativeBuild {
  platform: NativePlatform;
  build: number;
}

/** `ios/42` read as a platform and a build number, or null where it is not one. */
export function parseBuild(value: string | null | undefined): NativeBuild | null {
  const match = /^\s*(ios|android)\s*\/\s*(\d{1,9})\s*$/i.exec(value ?? "");
  if (!match) return null;
  return { platform: match[1]!.toLowerCase() as NativePlatform, build: Number(match[2]) };
}

/** The oldest build each platform may use, or null for any. */
export function minimumBuilds(env: Readonly<Record<string, string | undefined>>): Record<NativePlatform, number | null> {
  const read = (raw: string | undefined): number | null => {
    const value = raw?.trim();
    if (!value || !/^\d{1,9}$/.test(value)) return null;
    return Number(value);
  };
  return { ios: read(env.NATIVE_MIN_BUILD_IOS), android: read(env.NATIVE_MIN_BUILD_ANDROID) };
}

/**
 * The one build check every v1 route runs before anything else: a refusal to
 * return, or null to carry on. `requireBearerUser` calls it, so every route
 * that resolves an owner runs it, and `/api/v1/meta` calls it on its own.
 */
export function refuseOldBuild(
  request: { headers: { get(name: string): string | null } },
  env: Readonly<Record<string, string | undefined>>,
): Response | null {
  const raw = request.headers.get(BUILD_HEADER);
  if (raw === null || raw.trim() === "") return null;
  const build = parseBuild(raw);
  if (!build) return apiError("invalid", { message: "That app sent a build number this server cannot read." });
  const minimum = minimumBuilds(env)[build.platform];
  if (minimum !== null && build.build < minimum) return apiError("too_old");
  return null;
}
