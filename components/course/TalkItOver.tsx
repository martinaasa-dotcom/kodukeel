import { MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/ui";
import { tr, type Locale } from "@/lib/copy/locale";

/**
 * "TALK IT OVER", AFTER AN EVENING THAT MET AT LEAST THREE NEW WORDS
 * (docs/41-fifth-batch.md, VB-11).
 *
 * Offered beside "Today's module is done" and never as a step: the evening is
 * finished whether or not anybody presses this, which is why it sits under
 * the card that says so rather than inside the checklist, and why it is the
 * quiet button on a screen whose loud one goes back to Today. The page draws
 * it only where `chatFits` says yes, so a deployment with no model never
 * shows it and an evening that ends exactly as it did before is the default.
 *
 * A server component: it reads nothing and holds no state, so it costs a page
 * nothing but its markup.
 */
export function TalkItOver({ locale }: { locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  return (
    <Card className="talk-it-over">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-talk-it-over="">
        {/* The icon stands beside the heading rather than beside the paragraph, so on a phone the paragraph has the card's whole width. */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
              style={{ background: "var(--sky-soft)", color: "var(--sky-ink)" }}
            >
              <MessageCircle size={18} />
            </span>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: "var(--ink)" }}>
              {t("Talk it over")}
            </h2>
          </div>
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("A short chat with your neighbor, who asks about the things today's words are for. Say your answers out loud or type them.")}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            {t("Optional. Today's module is already done.")}
          </p>
        </div>
        <ButtonLink href="/course/chat" className="shrink-0 self-start sm:self-center">
          {t("Talk it over")}
        </ButtonLink>
      </div>
    </Card>
  );
}
