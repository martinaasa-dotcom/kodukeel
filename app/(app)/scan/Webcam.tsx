"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/Button";
import { useT } from "@/components/Locale";
import { MAX_EDGE } from "@/lib/scan/image";

/**
 * A PHOTO FROM THE COMPUTER'S OWN CAMERA (docs/41-fifth-batch.md, VB-13, D25).
 *
 * On a phone the file input opens the camera; on a desktop it opens a file
 * picker and nothing else, so a learner at a computer had no way to show the
 * scanner what is on their desk. This is the desktop's equivalent: the webcam
 * in a frame, one press to take the picture, and the stream closed the moment
 * it is taken, canceled or the screen goes.
 *
 * VIDEO ONLY, AND SAID SO IN THE REQUEST. The microphone is opened by the
 * speech engine and nothing else (D5), so this asks for `audio: false`, which
 * `scripts/invariants/one-microphone.ts` reads. The frame is drawn to a canvas
 * at the scanner's own size and handed over as a JPEG; nothing is recorded and
 * nothing is kept, which is the scanner's rule for every photo.
 */
export function Webcam({ onTaken, onClose }: {
  readonly onTaken: (dataUrl: string) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"starting" | "live" | "refused" | "none">("starting");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const live = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) {
          for (const track of live.getTracks()) track.stop();
          return;
        }
        stream.current = live;
        if (video.current) {
          video.current.srcObject = live;
          await video.current.play().catch(() => undefined);
        }
        setState("live");
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setState(name === "NotAllowedError" || name === "SecurityError" ? "refused" : "none");
      }
    })();
    return () => {
      cancelled = true;
      for (const track of stream.current?.getTracks() ?? []) track.stop();
      stream.current = null;
    };
  }, []);

  const take = () => {
    const el = video.current;
    if (!el || el.videoWidth === 0) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(el.videoWidth, el.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(el.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(el.videoHeight * scale));
    canvas.getContext("2d")?.drawImage(el, 0, 0, canvas.width, canvas.height);
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
    onTaken(canvas.toDataURL("image/jpeg", 0.82));
  };

  return (
    <div className="flex flex-col gap-3" data-webcam>
      <div className="relative overflow-hidden rounded-[var(--r-lg)]" style={{ background: "var(--raised)", aspectRatio: "4 / 3" }}>
        <video ref={video} playsInline muted className="h-full w-full object-cover" aria-label={t("What your camera sees")} />
        {state !== "live" && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm" style={{ color: "var(--ink-2)" }} role="status">
            {state === "starting"
              ? t("Starting the camera")
              : state === "refused"
                ? t("The camera is blocked for this site. You can allow it in your browser's site settings, or choose a picture instead.")
                : t("No camera was found. You can choose a picture instead.")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onClose}>
          <X size={15} aria-hidden /> {t("Cancel")}
        </Button>
        <Button variant="primary" onClick={take} disabled={state !== "live"}>
          <Camera size={15} aria-hidden /> {t("Take the photo")}
        </Button>
      </div>
    </div>
  );
}
