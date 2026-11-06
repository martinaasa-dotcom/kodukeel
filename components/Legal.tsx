import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { LanguageSwitcher, TranslationNotice } from "@/components/PublicLanguage";
import { PUBLIC_LOCALES, tr, type PublicLocale } from "@/lib/copy/locale";
import { LANDING_HREF, localeHref, signInHref } from "@/lib/copy/publicLocale";
import { resolveOperator } from "@/lib/legal/operator";
import { impactIsListed } from "@/lib/progress/impactListed";
import { BrandLink } from "@/components/BrandLink";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/Button";

/**
 * "2 September 2026" in the page's language. The months are a table in the
 * legal area (`September@date`), so the date reads as a person writes it in
 * Russian or Ukrainian, in the genitive, and the English stays exactly as typed.
 * Estonian writes the day with a stop and the month in the adessive after
 * "Uuendatud", "2. septembril 2026".
 */
export function updatedIn(updated: string, locale: PublicLocale): string {
  if (locale === "en") return updated;
  const m = /^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/.exec(updated);
  if (!m) return updated;
  const month = tr(locale, m[2]!, "date");
  return locale === "et" ? `${m[1]}. ${month} ${m[3]}` : `${m[1]} ${month} ${m[3]}`;
}

/** The addresses this page lives at, one per language it is drawn in, for the switcher. */
export function switcherHrefs(path: string, drawnIn: readonly PublicLocale[] = PUBLIC_LOCALES): Partial<Record<PublicLocale, string>> {
  return Object.fromEntries(drawnIn.map((l) => [l, localeHref(path, l, true)])) as Partial<Record<PublicLocale, string>>;
}

/**
 * Shared shell for the policy pages, which are reachable without a session.
 *
 * Drawn in English, Russian, Ukrainian or Estonian (lib/copy/publicLocale.ts):
 * the page hands in the language it resolved, whether the address asked for
 * it, and its own path, so the switcher and every link at the foot stay in the
 * language the reader chose. `legal` is the two pages whose translation has to
 * say that the English prevails.
 */
export function Legal({ title, updated, children, locale = "en", explicit = false, path, legal = false, drawnIn = PUBLIC_LOCALES }: {
  title: string;
  updated: string;
  children: ReactNode;
  locale?: PublicLocale;
  explicit?: boolean;
  /** This page's own address, for the language switcher. */
  path: string;
  legal?: boolean;
  /** The languages this page is drawn in, which are all it offers. */
  drawnIn?: readonly PublicLocale[];
}) {
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  /*
    A `main`, because /privacy and /terms are outside both route groups and so
    inherit neither the signed-in shell's landmark nor the landing page's.
    They were the two pages in the app with no landmark on them at all, which
    is the wrong pair to lose: they are the public ones, and the only ones
    somebody might be reading because they have a question about their rights.
  */
  return (
    <main lang={locale} className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-16">
      <PublicHeader locale={locale} path={path} drawnIn={drawnIn} />
      <h1
        className="mt-8 text-3xl font-bold leading-tight tracking-tight"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
        {t("Last updated")} {updatedIn(updated, locale)}
      </p>
      <TranslationNotice locale={locale} legal={legal} className="mt-5" />
      <Contents label={t("On this page")}>{children}</Contents>
      <div className="mt-8 space-y-4">{children}</div>
      <PublicFooter locale={locale} explicit={explicit} href={href} />
    </main>
  );
}

/**
 * THE TOP OF A PUBLIC PAGE: THE PRODUCT, THE LANGUAGE, AND ONE WAY IN.
 *
 * These are the pages a funder, a school and a ministry reader open, and their
 * header was the word "Kodukeel" in small gray capitals: no mark, no sign of
 * the product, nothing to press. It is the landing page's own lockup now,
 * linking home, the language switcher beside it, and one quiet button to start.
 * Quiet on purpose: the page is a document and the reader's one job on it is
 * reading, so the loud action stays the landing page's.
 */
export function PublicHeader({ locale, path, drawnIn }: {
  locale: PublicLocale;
  path: string;
  /**
   * The languages the page is drawn in, said by every caller: the grammar
   * reference is drawn in the three interface languages and never Estonian,
   * and a page built on `Legal` in whichever of the four it has.
   */
  drawnIn: readonly PublicLocale[];
}) {
  const t = (english: string) => tr(locale, english);
  return (
    /*
      On a phone the mark and the button share the first row and the switcher
      takes the second, so the header is two rows rather than three; the button
      says "Start" there, as the landing page's own does under 420.
    */
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <BrandLink href={LANDING_HREF[locale]} label={t("Kodukeel, home")} className="flex min-h-11 items-center">
        <Wordmark size={28} />
      </BrandLink>
      <LanguageSwitcher
        locale={locale}
        hrefs={switcherHrefs(path, drawnIn)}
        drawnIn={drawnIn}
        className="order-3 w-full sm:order-2 sm:ml-auto sm:w-auto"
      />
      <ButtonLink
        href={signInHref(locale)}
        variant="secondary"
        size="sm"
        className="order-2 sm:order-3"
      >
        <span className="max-sm:hidden">{t("Start free")}</span>
        {/* The short word for the eye, and the whole one for whoever reads the
            link out of context: "Start" alone is the link text a crawler and a
            screen reader's list of links both call meaningless. */}
        <span className="sm:hidden" aria-hidden>{tr(locale, "Start", "begin")}</span>
        <span className="sr-only sm:hidden">{t("Start free")}</span>
      </ButtonLink>
    </header>
  );
}

/**
 * The links at the foot of every public page, in the page's language.
 *
 * /impact joins them only once its headline clears the research floors
 * (`impactIsListed`, docs/38-third-batch.md D3): before that it is a page of
 * "not enough data yet", and a footer link to it would send every reader there.
 */
export async function PublicFooter({ locale, href, short = false }: {
  locale: PublicLocale;
  explicit?: boolean;
  href: (to: string) => string;
  /** The state examination's page carries four of them rather than seven. */
  short?: boolean;
}) {
  const t = (english: string) => tr(locale, english);
  const contact = resolveOperator().email;
  const links: readonly (readonly [string, string])[] = short
    ? [["/privacy", "Privacy"], ["/terms", "Terms"], ["/accessibility", "Accessibility"]]
    : [
        ["/privacy", "Privacy"], ["/terms", "Terms"], ["/funding", "Funding"], ["/trust", "Trust"], ["/teachers", "For teachers"], ["/pilots", "Running a pilot"],
        ["/accessibility", "Accessibility"], ["/state-exam", "The state examination"], ["/help", "Help"],
        ...(await impactIsListed() ? [["/impact", "What this installation has done"] as const] : []),
      ];
  return (
    <p className="mt-14 text-sm" style={{ color: "var(--ink-3)" }}>
      {links.map(([to, label]) => (
        <span key={to}>
          <Link href={href(to)} className="underline underline-offset-2">{t(label)}</Link>
          {", "}
        </span>
      ))}
      <Link href={signInHref(locale)} className="underline underline-offset-2">
        {t("Sign in")}
      </Link>
      {/*
        A way to write to whoever runs this copy, where they have said who they
        are. Where nobody is named there is nothing to print, rather than an
        address that reaches nobody: the rule /trust follows for the same field.
      */}
      {contact && (
        <>
          {", "}
          <a href={`mailto:${contact}`} className="underline underline-offset-2">{t("Contact")}</a>
        </>
      )}
    </p>
  );
}

/**
 * A PUBLIC PAGE IN PIECES, NOT ONE COLUMN OF PROSE.
 *
 * These pages are long by nature, a privacy notice has to say everything it
 * says, and they were drawn as one column of gray paragraphs under small
 * headings, which was reported as a wall of text that puts a reader off before
 * they find the one thing they came for. Nothing is cut. Each section is a card
 * of its own, the page opens on a list of its sections that jumps to each, and
 * a paragraph that opens on a bold label ("**Your identity.** ...") gets the
 * label as a heading of its own line, so a reader scans the labels and reads
 * the paragraph under the one they want.
 */
function Contents({ label, children }: { label: string; children: ReactNode }) {
  const titles = sectionTitles(children);
  if (titles.length < 3) return null;
  return (
    <nav aria-label={label} className="mt-8" data-legal-contents>
      <p className="label-xs" style={{ color: "var(--ink-3)" }}>{label}</p>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {titles.map(({ title, id }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="pill tap-tint inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold"
              style={{ borderColor: "var(--edge)", background: "var(--surface)", color: "var(--ink-2)" }}
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Every `S` among the children, however deep in a fragment or a conditional. */
function sectionTitles(children: ReactNode): { title: string; id: string }[] {
  const out: { title: string; id: string }[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ title?: string; id?: string; children?: ReactNode }>;
      if (el.type === S && typeof el.props.title === "string") {
        out.push({ title: el.props.title, id: el.props.id ?? sectionId(el.props.title) });
        return;
      }
      walk(el.props.children);
    });
  };
  walk(children);
  return out;
}

/** An anchor from a heading, in any script, so the contents can jump to it. */
export function sectionId(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}

export function S({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section
      id={id ?? sectionId(title)}
      className="scroll-mt-6 rounded-[var(--r-xl)] border p-4 md:p-7"
      style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth-sm)" }}
    >
      <h2 className="flex items-center gap-2.5 text-lg font-semibold" style={{ color: "var(--ink)" }}>
        <span aria-hidden className="h-5 w-1 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
        {title}
      </h2>
      {/* Labeled paragraphs are tiles, two to a row on a wide screen; anything else spans the row. */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:[&>*:not([data-legal-lead])]:col-span-2">{children}</div>
    </section>
  );
}

/**
 * A paragraph, and where it opens on a bold label the label goes on a line of
 * its own (`rich` draws `**label.**` as a `strong`, so it is the first element
 * of the children). Everything else is the paragraph as written.
 */
export function P({ children }: { children: ReactNode }) {
  const lead = leadOf(children);
  if (lead) {
    return (
      <div className={TILE} style={{ background: "var(--raised)" }} data-legal-lead>
        <LeadBody lead={lead.label} rest={lead.rest} />
      </div>
    );
  }
  return (
    <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
      {children}
    </p>
  );
}

/** A list of labeled points, drawn as the same tiles as a labeled paragraph. */
export function Tiles({ children, ...data }: { children: ReactNode; [hook: `data-${string}`]: string | undefined }) {
  return <ul {...data} className="grid grid-cols-1 gap-3 md:grid-cols-2" data-legal-tiles>{children}</ul>;
}

/** One point of `Tiles`: a tile where it opens on a bold label, a plain row of the list where it does not. */
export function Tile({ children }: { children: ReactNode }) {
  const lead = leadOf(children);
  return (
    <li className={`${TILE} md:[&:only-child]:col-span-2`} style={{ background: "var(--raised)" }} data-legal-lead={lead ? "" : undefined}>
      {lead ? <LeadBody lead={lead.label} rest={lead.rest} /> : <Folded nodes={Children.toArray(children)} />}
    </li>
  );
}

const TILE = "flex min-w-0 flex-col gap-1 rounded-[var(--r-lg)] p-3.5 md:p-4";

/** The bold label a paragraph opens on, and what follows it, or null. */
function leadOf(children: ReactNode): { label: ReactNode; rest: ReactNode[] } | null {
  const parts = Children.toArray(children);
  const first = parts.findIndex((c) => !(typeof c === "string" && c.trim() === "") && !(isValidElement(c) && isEmptyFragment(c)));
  const lead = first >= 0 ? parts[first] : undefined;
  if (!isValidElement(lead) || lead.type !== "strong") return null;
  // Only a label that ends its own sentence: "**Your identity.**", never a bold
  // opening that the sentence carries on from.
  if (!/[.:!?]["”»]?\s*$/.test(textOf(lead))) return null;
  return { label: lead, rest: trimStart(parts.slice(first + 1)) };
}

/** The label on its own line, the first sentence, and the rest behind "Read more" where it is long. */
function LeadBody({ lead, rest }: { lead: ReactNode; rest: ReactNode[] }) {
  return (
    <>
      <p className="text-base font-semibold leading-snug [&_strong]:font-semibold" style={{ color: "var(--ink)" }}>{lead}</p>
      <Folded nodes={rest} />
    </>
  );
}

/** The first sentence on screen and the rest behind "Read more" where the rest is long. */
function Folded({ nodes }: { nodes: ReactNode[] }) {
  const [opening, more] = splitFirstSentence(nodes);
  return (
    <>
      <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{opening}</p>
      {more.length > 0 && (
        <details className="explain legal-more">
          <summary>
            {PUBLIC_LOCALES.map((l) => (
              <span key={l} data-more-in={l}>{tr(l, "Read more")}</span>
            ))}
          </summary>
          <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{more}</p>
        </details>
      )}
    </>
  );
}

function isEmptyFragment(el: ReactElement): boolean {
  const kids = (el.props as { children?: ReactNode }).children;
  return typeof kids === "string" && kids.trim() === "";
}

/** The plain text of a node, for measuring and testing it. */
function textOf(n: ReactNode): string {
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join("");
  if (isValidElement(n)) return Children.toArray((n.props as { children?: ReactNode }).children).map(textOf).join("");
  return "";
}

/** Below this, the rest of a tile is short enough to stay on screen. */
const MORE_AFTER = 160;

/**
 * A tile's first sentence, and the rest behind "Read more" where the rest is
 * long enough to be worth folding. Split inside the first plain string that
 * holds a full stop followed by a space; a bold phrase or a link stays whole.
 */
function splitFirstSentence(nodes: ReactNode[]): [ReactNode[], ReactNode[]] {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const text = typeof node === "string" ? node
      : isValidElement(node) && node.type !== "strong" && node.type !== "code" && typeof (node.props as { children?: ReactNode }).children === "string"
        ? (node.props as { children: string }).children : null;
    if (text === null) continue;
    const m = /[.!?]\s+(?=\S)/.exec(text);
    if (!m) continue;
    const cut = m.index + 1;
    const head = [...nodes.slice(0, i), text.slice(0, cut)];
    const tail = [text.slice(cut).replace(/^\s+/, ""), ...nodes.slice(i + 1)];
    if (tail.map(textOf).join("").length < MORE_AFTER) return [nodes, []];
    return [head, tail];
  }
  return [nodes, []];
}

/** The text after a lifted label, without the space that followed it. */
function trimStart(nodes: ReactNode[]): ReactNode[] {
  const [head, ...tail] = nodes;
  if (isValidElement(head)) {
    const kids = (head.props as { children?: ReactNode }).children;
    if (typeof kids === "string") return [kids.replace(/^\s+/, ""), ...tail];
  }
  if (typeof head === "string") return [head.replace(/^\s+/, ""), ...tail];
  return nodes;
}
