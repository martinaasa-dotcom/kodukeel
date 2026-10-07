"use client";

import { CornerDownLeft } from "lucide-react";
import { KeyCap } from "@/components/ui";

/**
 * The Space bar, drawn as the key it is: the open box printed under the
 * letters on a keyboard. A glyph in a font would do it and would also come
 * out as an empty square in any face that lacks U+2423, so it is a path.
 */
export function SpaceKeyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 6.5v4h11v-4" />
    </svg>
  );
}

/** A key's cap with its icon, read as a picture by a screen reader: the button's own name carries the meaning. */
export function EnterKeyCap({ className = "" }: { className?: string }) {
  return (
    <KeyCap className={className}>
      <span aria-hidden="true" className="inline-flex"><CornerDownLeft size={13} aria-hidden /></span>
    </KeyCap>
  );
}

export function SpaceKeyCap({ className = "" }: { className?: string }) {
  return (
    <KeyCap className={className}>
      <span aria-hidden="true" className="inline-flex"><SpaceKeyIcon size={14} /></span>
    </KeyCap>
  );
}
