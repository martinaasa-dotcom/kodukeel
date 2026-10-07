"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { addScanToDeck, deleteScan, renameScan } from "@/app/actions";
import { Button } from "@/components/Button";
import { NOT_REACHED } from "@/lib/copy/values";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill } from "@/lib/copy/locale";

/**
 * The three things you can do to a saved page: add its words, rename it, or
 * forget it.
 *
 * Deleting the page does not touch the cards it produced or a single review of
 * them. A page is a record of where some words came from, and losing that
 * record must never quietly take a fortnight of scheduling with it.
 */
export function ScanActions({ scanId, title, pending }: {
  scanId: string;
  title: string;
  /** Words on this page with nothing in the deck yet. */
  pending: number;
}) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [busy, start] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const add = () => {
    start(async () => {
      const result = await addScanToDeck(scanId).catch(() => null);
      if (!result) { setMessage(t(NOT_REACHED)); return; }
      setMessage(
        !result.ok
          ? result.error
          : result.added === 0
            ? t("Every word is already in your deck.")
            : fill(t("Added {cards}."), { cards: countOf(locale, result.added, "card") }),
      );
      router.refresh();
    });
  };

  const rename = () => {
    start(async () => {
      const result = await renameScan(scanId, draft).catch(() => null);
      if (!result || !result.ok) {
        setMessage(t(result ? result.error : NOT_REACHED));
        return;
      }
      setRenaming(false);
      router.refresh();
    });
  };

  const remove = () => {
    start(async () => {
      const result = await deleteScan(scanId).catch(() => null);
      if (!result || !result.ok) {
        setMessage(t(result ? result.error : NOT_REACHED));
        return;
      }
      router.push("/scan");
      router.refresh();
    });
  };

  if (renaming) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-64">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={80}
          aria-label={t("Page name")}
          autoFocus
          className="field-lg w-full text-base"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { setRenaming(false); setDraft(title); }}>
            {t("Cancel")}
          </Button>
          <Button variant="primary" onClick={rename} disabled={busy}>
            <Check size={15} aria-hidden />
            {t("Save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-52">
      <Button variant="primary" onClick={add} disabled={busy || pending === 0}>
        {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Plus size={15} aria-hidden />}
        {pending === 0 ? t("All in your deck") : fill(t("Add {n} to my deck"), { n: pending })}
      </Button>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setRenaming(true)} className="flex-1">
          <Pencil size={14} aria-hidden />
          {t("Rename")}
        </Button>
        <Button
          variant={confirming ? "danger" : "ghost"}
          onClick={() => (confirming ? remove() : setConfirming(true))}
          disabled={busy}
          className="flex-1"
        >
          <Trash2 size={14} aria-hidden />
          {confirming ? t("Really delete") : t("Delete")}
        </Button>
      </div>

      {message && (
        <p className="text-sm" style={{ color: "var(--good-ink)" }}>{message}</p>
      )}
      {confirming && (
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {t("Your cards and their history stay. Only the page itself goes.")}
        </p>
      )}
    </div>
  );
}
