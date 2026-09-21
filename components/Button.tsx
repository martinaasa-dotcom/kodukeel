"use client";

import { PrefetchLink as Link } from "@/components/PrefetchLink";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

/**
 * Buttons are fully rounded, and only the primary one carries the gradient —
 * one loud action per screen, everything else quiet. `press` gives every button
 * the same small physical dip on click, which is most of what makes the app feel
 * responsive rather than merely fast.
 */
const STYLES: Record<Variant, CSSProperties & { className?: string }> = {
  primary: {
    color: "var(--accent-ink)",
    borderColor: "transparent",
    boxShadow: "var(--shadow-accent)",
    className: "grad-accent",
  },
  secondary: { background: "var(--surface)", color: "var(--ink)", borderColor: "var(--rule)", boxShadow: "var(--shadow-sm)" },
  soft: { background: "var(--accent-soft)", color: "var(--accent-deep)", borderColor: "transparent" },
  ghost: { background: "transparent", color: "var(--ink-2)", borderColor: "transparent" },
  danger: { background: "var(--again-soft)", color: "var(--again-ink)", borderColor: "transparent" },
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  /*
    `lg` is a hero action — the one loud button on a screen like Today's
    module card — and it was one fixed size for every window: px-6/py-3.5 at
    text-base (17px), about 56px tall, whatever the viewport. That is the
    right size for a phone held at arm's length and too much on an ordinary
    laptop tab, where it read as oversized next to everything around it.

    So it steps up with the window rather than sitting at one size: compact
    by default, the same size as `md` in effect, and only reaches its full
    size at `2xl` (1536px), which is roughly where a maximized window on a
    larger laptop display sits rather than a 13-inch one. A narrower window —
    most laptops, most of the time — gets the smaller, calmer button; a wide
    one gets the size the hero card was designed at.

    THE FLOOR IS NOT A `min-h-*` UTILITY HERE, AND THAT WAS TRIED TWICE
    BEFORE THIS COMMENT EXISTED. `app/globals.css` already carries a
    coarse-pointer rule, `button:not(.inline-edit) { min-height: 2.75rem }`,
    and that selector (a type selector plus a `:not()` class) outranks a
    bare `.min-h-*` utility class in CSS specificity. So a `min-h-11`
    (44px) and then a `min-h-12` (48px) added here each measured *exactly*
    the same real height in `scripts/test-signin.mjs` as a plain browser —
    the global rule was silently winning and clamping this button straight
    back to 44px both times, landing a hair under it in real sub-pixel
    layout (which `Math.round` was displaying as a clean, misleading "44"
    in the failure log) rather than at whatever this component asked for.

    So the floor here is padding, not a competing min-height: `py-3.5` is
    the same vertical padding the original 56px button used, kept exactly
    as it was rather than shrunk, with only the horizontal padding and text
    size stepping down at the compact size. That is comfortably clear of
    44px on its own, with no min-height utility in the running to lose a
    specificity fight it cannot win.
  */
  lg: "px-5 py-3.5 text-sm 2xl:px-6 2xl:text-base",
};

const base =
  "press inline-flex items-center justify-center gap-2 rounded-full border font-semibold " +
  "transition-ui hover:brightness-[1.04] hover:-translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-45";

function split(variant: Variant) {
  const { className = "", ...style } = STYLES[variant];
  return { extraClass: className, style: style as CSSProperties };
}

export function Button({
  variant = "secondary", size = "md", className = "", children, ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; children: ReactNode }) {
  const { extraClass, style } = split(variant);
  return (
    <button {...rest} className={`${base} ${SIZES[size]} ${extraClass} ${className}`} style={style}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary", size = "md", className = "", children, href, target, rel,
}: {
  variant?: Variant; size?: Size; className?: string; children: ReactNode;
  href: string; target?: string; rel?: string;
}) {
  const { extraClass, style } = split(variant);
  return (
    <Link href={href} target={target} rel={rel} className={`${base} ${SIZES[size]} ${extraClass} ${className}`} style={style}>
      {children}
    </Link>
  );
}
