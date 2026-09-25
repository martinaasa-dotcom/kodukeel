"use client";

import { useEffect, useState } from "react";

/**
 * A date written the way the reader writes dates.
 *
 * `lib/time/clock.ts` says only the hour is pinned, and that "date order and
 * month names still come from the reader's own locale, because those are
 * genuinely theirs". That is true of the four places this app formats a date
 * in a client component and was false of the two that do it on the server,
 * where `toLocaleDateString(undefined, …)` reads the *deployment's* locale.
 * On a machine set to en-US, Today's greeting line said "Sunday, August 30" to
 * a learner in Tartu who writes "pühapäev, 30. august" — the same class of
 * mistake as the day boundary, one notch less severe because it is only ever
 * the shape of a reading rather than which day it names.
 *
 * AND A CLIENT COMPONENT IS RENDERED ON THE SERVER FIRST, which the paragraph
 * above missed. Three of those "four places" formatted in render, so the
 * server wrote "Sep 24" and a browser set to Estonian wrote "24. sept" over
 * it during hydration: React 19 reported error #418 on Today and threw the
 * server's HTML away, for exactly the readers this app is for. A date in a
 * client component goes through this module now, as `LocalDate` for text and
 * `useReaderDate` where it has to be a string, and both write `stableDate`
 * until the browser has mounted.
 *
 * The server renders one shape and the browser swaps in its own on mount, so
 * there is no hydration mismatch to warn about and no blank while it waits:
 * the server's rendering is a perfectly readable date, it is just not
 * necessarily the reader's. `suppressHydrationWarning` is not used and is not
 * needed, because the first client render matches the server's and only the
 * effect changes it.
 *
 * The zone comes from the caller, because on the server it is the learner's
 * stored zone (see `lib/progress/dayClock.ts`) and in the browser leaving it
 * undefined is already right.
 */
export interface LocalDateProps {
  /** The instant, as an ISO string, because a Date cannot cross to a client component. */
  iso: string;
  /** What the server already rendered, so the first paint is never empty. */
  fallback: string;
  /** IANA zone, or undefined for the reader's own. */
  zone?: string;
  options: Intl.DateTimeFormatOptions;
}

/**
 * One shape of a date that the server and the first client render agree on,
 * whatever either is set to: British English and UTC, pinned. It is only ever
 * on screen until the browser has mounted and swapped in the reader's own.
 */
export function stableDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
}

/**
 * The same promise as `LocalDate` where a date has to be a string, such as in
 * an attribute or inside a loop: `stableDate` until the browser has mounted,
 * then the reader's own locale and zone.
 */
export function useReaderDate(): (date: Date, options: Intl.DateTimeFormatOptions) => string {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (date, options) => {
    if (!mounted) return stableDate(date, options);
    try {
      return new Intl.DateTimeFormat(undefined, options).format(date);
    } catch {
      return stableDate(date, options);
    }
  };
}

export function LocalDate({ iso, fallback, zone, options }: LocalDateProps) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    try {
      setText(new Intl.DateTimeFormat(undefined, { timeZone: zone, ...options }).format(new Date(iso)));
    } catch {
      // A zone the browser will not take leaves the server's rendering, which
      // is a readable date rather than nothing.
    }
    // `options` is an object literal at every call site, so it is a new
    // reference on each render; the primitives inside it are what actually
    // decide the output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, zone, JSON.stringify(options)]);

  return <>{text}</>;
}
