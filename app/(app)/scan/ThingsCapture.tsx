"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, CloudOff, Image as ImageIcon, Loader2, Mic, Sparkles, Video, X } from "lucide-react";
import { saveScan } from "@/app/actions";
import { Button } from "@/components/Button";
import { useOffline } from "@/components/OfflineProvider";
import { useLocale, useT } from "@/components/Locale";
import { ReadAloud } from "@/components/speech/ReadAloud";
import { useSpeechConfig } from "@/components/speech/useSpeech";
import { Card, Note } from "@/components/ui";
import { MAX_THINGS, type Thing, type ThingEntry } from "@/lib/scan/things";
import { NOT_REACHED } from "@/lib/copy/values";
import { countOf, fill } from "@/lib/copy/locale";
import { defaultTitle, shrink } from "./ScanCapture";
import { Webcam } from "./Webcam";

/** A thing on the confirmation screen: which of its entries is chosen, and whether it is wanted. */
interface Row {
  readonly thing: Thing;
  readonly chosen: number;
  readonly keep: boolean;
}

type Phase = "idle" | "webcam" | "reading" | "review" | "saving" | "saved";

/** A computer rather than a phone: a fine pointer, where the webcam is offered (D25). */
function finePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches === true;
}

/**
 * THE THINGS AROUND YOU, IN ESTONIAN (docs/41-fifth-batch.md, VB-13).
 *
 * A photo of a room, a desk or a shelf goes through the scanner's own chain,
 * and the model is asked for the English names of what it can see and nothing
 * else. Each name is looked up on the dictionary's English side, and only an
 * entry the dictionary vouches for is offered, with its picture where the app
 * has one. Where a name could be more than one word ("table" is `laud` and
 * `tabel`), the others stay on the screen to be chosen, and nothing is picked
 * silently. A name with no entry is shown in English and offers nothing.
 *
 * Then it is the scanner's confirmation screen: tick what you want, and it
 * becomes a page and cards under the `SCAN` source, exactly as a photographed
 * list does. "Say them" runs the ticked words through `ReadAloud` once,
 * ungraded. The photo is never stored, which is the scanner's rule and its
 * invariant: it is shrunk on this device, read once and dropped.
 */
export function ThingsCapture() {
  const router = useRouter();
  const { online } = useOffline();
  const t = useT();
  const locale = useLocale();
  const speech = useSpeechConfig();
  const canSay = speech.modelBase !== null && speech.unavailable === null;

  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [readBy, setReadBy] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; words: number; cards: number; said: string } | null>(null);
  const [saying, setSaying] = useState(false);
  const [webcam, setWebcam] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => setWebcam(finePointer() && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia), []);

  const reset = () => {
    setPhase("idle");
    setPreview(null);
    setRows([]);
    setError(null);
    setReadBy(null);
    setSaved(null);
    setSaying(false);
  };

  const read = async (dataUrl: string) => {
    setError(null);
    setPhase("reading");
    setPreview(dataUrl);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl, mode: "things" }),
      });
      const body = (await response.json()) as { things?: Thing[]; error?: string };
      if (!response.ok) {
        setError(body.error ? t(body.error) : t("We couldn't read that photo."));
        setPhase("idle");
        return;
      }
      const things = body.things ?? [];
      if (things.length === 0) {
        setError(t("We couldn't make out any things in that photo. Try more light, and fewer things at once."));
        setPhase("idle");
        return;
      }
      setReadBy(`${response.headers.get("x-model-provider") ?? ""} ${response.headers.get("x-model-id") ?? ""}`.trim());
      setRows(things.map((thing) => ({ thing, chosen: 0, keep: thing.entries.length > 0 })));
      setTitle(defaultTitle(t("Things from {date}")));
      setPhase("review");
    } catch {
      setError(t("We couldn't send that photo. Check your connection and try again."));
      setPhase("idle");
    }
  };

  const fromFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(t("That isn't a picture. A photo from a camera or a phone works."));
      return;
    }
    try {
      await read(await shrink(file));
    } catch {
      setError(t("That picture couldn't be opened. Try another one."));
      setPhase("idle");
    }
  };

  // A photo dragged onto the page from the desktop is the desktop's way of sharing one (D25).
  useEffect(() => {
    if (phase !== "idle") return;
    const files = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    let depth = 0;
    const enter = (e: DragEvent) => { if (files(e)) { depth += 1; setDragging(true); } };
    const over = (e: DragEvent) => { if (files(e)) e.preventDefault(); };
    const leave = (e: DragEvent) => { if (files(e)) { depth = Math.max(0, depth - 1); if (depth === 0) setDragging(false); } };
    const drop = (e: DragEvent) => {
      if (!files(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void fromFile(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      setDragging(false);
    };
    // `fromFile` reads only setters and `read`, which are stable for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const kept = rows.filter((r) => r.keep && r.thing.entries[r.chosen]);
  const entryOf = (row: Row): ThingEntry => row.thing.entries[row.chosen]!;

  const save = (addCards: boolean) => {
    setPhase("saving");
    void (async () => {
      const seen = new Set<string>();
      const items = kept
        .map((row) => ({ row, entry: entryOf(row) }))
        .filter(({ entry }) => (seen.has(entry.lexemeId) ? false : (seen.add(entry.lexemeId), true)))
        .map(({ row, entry }) => ({
          et: entry.lemma, en: row.thing.english, lexemeId: entry.lexemeId, lemma: entry.lemma,
          translation: entry.translation, matchedAs: null, cefr: entry.cefr,
        }));
      const result = await saveScan({ title, items, addCards }).catch(() => null);
      if (!result || !result.ok) {
        setError(t(result ? result.error : NOT_REACHED));
        setPhase("review");
        return;
      }
      setSaved({ id: result.id, words: result.words, cards: result.cards, said: items.map((i) => i.et).join(", ") });
      setPhase("saved");
      router.refresh();
    })();
  };

  if (!online && phase === "idle") {
    return (
      <Card tone="sky">
        <div className="flex items-start gap-3">
          <CloudOff size={18} aria-hidden style={{ color: "var(--sky-ink)" }} />
          <div>
            <p className="font-semibold" style={{ color: "var(--ink)" }}>{t("Naming the things in a photo needs a connection.")}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              {t("Review still works offline, and so does everything already in your deck.")}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (phase === "saved" && saved) {
    return (
      <Card tone="sky" className="pop-in">
        <div className="flex items-start gap-3">
          <Check size={20} aria-hidden style={{ color: "var(--good-ink)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{fill(t("{title} is saved."), { title })}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              {saved.cards > 0
                ? fill(t("{words} on the page, and {cards} are in your deck."), {
                  words: countOf(locale, saved.words, "word"),
                  cards: countOf(locale, saved.cards, "card"),
                })
                : fill(t("{words} on the page. Nothing's been added to your deck yet."), { words: countOf(locale, saved.words, "word") })}
            </p>
            {canSay && (
              saying ? (
                <div className="mt-4 rounded-[var(--r-lg)] p-4" style={{ background: "var(--surface)" }} data-say-them>
                  <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
                    {t("Say them once, in this order. Nothing is marked: it's just the first time you say them.")}
                  </p>
                  <ReadAloud line={saved.said} label={t("Say them")} shortcut />
                </div>
              ) : (
                <div className="mt-4">
                  <Button variant="soft" onClick={() => setSaying(true)}>
                    <Mic size={15} aria-hidden /> {t("Say them")}
                  </Button>
                </div>
              )
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={reset}>
                <Camera size={15} aria-hidden /> {t("Another photo")}
              </Button>
              <Button
                variant="primary"
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a document load on purpose, as ScanCapture argues
                onClick={() => window.location.assign(`/scan/${saved.id}`)}
              >
                {t("Open the page")}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (phase === "review" || phase === "saving") {
    const found = rows.filter((r) => r.thing.entries.length > 0).length;
    return (
      <div className="flex flex-col gap-4" data-things>
        <Card>
          <label htmlFor="things-title" className="label-xs block" style={{ color: "var(--ink-3)" }}>
            {t("Give this page a name")}
          </label>
          <input
            id="things-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            className="field-lg mt-2 w-full text-base"
            style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
          />
          <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(t("{n} things seen, {found} found in the dictionary."), { n: rows.length, found })}
          </p>
          {readBy && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
              {fill(t("Named in English by {model}. Every Estonian word here is the dictionary's own."), { model: readBy })}
            </p>
          )}
        </Card>

        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li key={`${row.thing.english}-${index}`}>
              <ThingRow
                row={row}
                onToggle={() => setRows((all) => all.map((r, i) => (i === index ? { ...r, keep: !r.keep } : r)))}
                onChoose={(chosen) => setRows((all) => all.map((r, i) => (i === index ? { ...r, chosen, keep: true } : r)))}
              />
            </li>
          ))}
        </ul>

        {error && <Note tone="again">{error}</Note>}

        <Card className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={reset} disabled={phase === "saving"}>{t("Start again")}</Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={phase === "saving" || kept.length === 0}>
            {t("Just save the page")}
          </Button>
          <Button variant="primary" onClick={() => save(true)} disabled={phase === "saving" || kept.length === 0}>
            {phase === "saving" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
            {fill(kept.length === 1 ? t("Make {n} flashcard") : t("Make {n} flashcards"), { n: kept.length })}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {t("Photograph your kitchen, your desk or the street outside, and get the Estonian for what's in it. The things are named in English, and every Estonian word comes from the dictionary.")}
        </p>

        {phase === "reading" ? (
          <div className="mt-5 flex items-center gap-4">
            {preview && (
              // A data URL that exists in this tab for a few seconds; see ScanCapture.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-20 w-20 rounded-[var(--r)] object-cover" style={{ boxShadow: "var(--shadow-sm)" }} />
            )}
            <div>
              <p className="flex items-center gap-2 font-semibold" style={{ color: "var(--ink)" }}>
                <Loader2 size={16} className="animate-spin" aria-hidden /> {t("Looking at the photo")}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
                {t("This takes a few seconds. The picture is read once and then thrown away.")}
              </p>
            </div>
          </div>
        ) : phase === "webcam" ? (
          <div className="mt-5">
            <Webcam onClose={() => setPhase("idle")} onTaken={(url) => void read(url)} />
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            {webcam && (
              <Button variant="primary" size="lg" onClick={() => setPhase("webcam")}>
                <Video size={17} aria-hidden /> {t("Use the webcam")}
              </Button>
            )}
            {!webcam && (
              <PickPhoto label={t("Take a photo")} icon={<Camera size={17} aria-hidden />} capture primary onPick={(f) => void fromFile(f)} />
            )}
            <PickPhoto label={t("Choose a picture")} icon={<ImageIcon size={17} aria-hidden />} onPick={(f) => void fromFile(f)} />
          </div>
        )}

        <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
          {fill(t("Up to {n} things a photo. The photo is made smaller on your device before it's sent, and it's never saved anywhere."), { n: MAX_THINGS })}
          {webcam && <> {t("You can also drop a picture onto this page.")}</>}
        </p>
      </Card>

      {error && (
        <Note tone="again">
          <span className="flex items-start gap-2"><X size={15} aria-hidden className="mt-0.5 shrink-0" />{error}</span>
        </Note>
      )}
      {dragging && (
        <div className="recording-drop" aria-hidden>
          <span className="flex items-center gap-2 text-lg font-bold" style={{ color: "var(--accent-deep)" }}>
            <ImageIcon size={20} /> {t("Drop the picture to look at it")}
          </span>
        </div>
      )}
    </div>
  );
}

/** A labelled file input, as the page scanner's own (`ScanCapture`'s `PickFile`) argues. */
function PickPhoto({ label, icon, capture, primary, onPick }: {
  label: string;
  icon: ReactNode;
  capture?: boolean;
  primary?: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <label
      className={
        "press inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-base font-semibold " +
        "transition-ui hover:-translate-y-px hover:brightness-[1.04] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 " +
        (primary ? "grad-accent" : "")
      }
      style={primary
        ? { color: "var(--accent-ink)", borderColor: "transparent", boxShadow: "var(--shadow-accent)" }
        : { background: "var(--surface)", color: "var(--ink)", borderColor: "var(--rule)", boxShadow: "var(--shadow-sm)" }}
    >
      {icon}
      {label}
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: "environment" as const } : {})}
        className="sr-only"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) onPick(file);
        }}
      />
    </label>
  );
}

/**
 * One thing: its picture, the entry chosen for it, and the others it could be.
 * A thing the dictionary has no entry for is printed in English and cannot be
 * ticked, because there is nothing vouched for to make a card from.
 */
function ThingRow({ row, onToggle, onChoose }: {
  row: Row;
  onToggle: () => void;
  onChoose: (index: number) => void;
}) {
  const t = useT();
  const entry = row.thing.entries[row.chosen];
  const picture = row.thing.picture;
  return (
    <div
      className="rounded-[var(--r-lg)] border px-4 py-2 md:px-5"
      style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth-sm)" }}
    >
      {entry ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3" style={{ opacity: row.keep ? 1 : 0.5 }}>
          <input
            type="checkbox"
            checked={row.keep}
            onChange={onToggle}
            className="h-6 w-6 shrink-0 rounded-[var(--r-sm)]"
            style={{ accentColor: "var(--accent)" }}
          />
          <span aria-hidden className="w-8 shrink-0 text-center text-2xl leading-none">{picture ?? ""}</span>
          <span className="min-w-0 flex-1">
            <span lang="et" className="block text-base font-semibold" style={{ color: "var(--ink)" }}>{entry.lemma}</span>
            <span className="block text-sm" style={{ color: "var(--ink-3)" }}>{entry.translation}</span>
          </span>
        </label>
      ) : (
        <div className="flex min-h-11 items-center gap-3">
          <span className="h-6 w-6 shrink-0" aria-hidden />
          <span aria-hidden className="w-8 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-base" style={{ color: "var(--ink-2)" }}>{row.thing.english}</span>
            <span className="block text-sm" style={{ color: "var(--ink-3)" }}>{t("Not in the dictionary, so nothing is offered for it.")}</span>
          </span>
        </div>
      )}
      {row.thing.entries.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pb-2 pl-[5.75rem]" role="group" aria-label={fill(t("Other words for {thing}"), { thing: row.thing.english })}>
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>{fill(t("{thing} can also be:"), { thing: row.thing.english })}</span>
          {row.thing.entries.map((other, i) => i === row.chosen ? null : (
            <button
              key={other.lexemeId}
              type="button"
              onClick={() => onChoose(i)}
              className="choice-btn rounded-full border px-3 py-1 text-sm"
              aria-label={fill(t("Use {word}, {meaning}"), { word: other.lemma, meaning: other.translation })}
            >
              <span lang="et" className="font-semibold">{other.lemma}</span>
              <span style={{ color: "var(--ink-3)" }}>{`, ${other.translation}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
