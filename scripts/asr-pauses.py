#!/usr/bin/env python3
"""
A beginner says one word, stops, thinks, says the next. What does the Zipformer make of it?

    python3 scripts/asr-pauses.py build     # word-by-word clips, three voices (TartuNLP, free, cached)
    python3 scripts/asr-pauses.py run       # every way of feeding them to the model (cached)
    python3 scripts/asr-pauses.py report

The first set of these (`scripts/asr-experiments.py`, `wordbyword`) cut each
word at a hard amplitude line, which shaves a soft onset like the `v` of
`vastuvõtule` and blamed the model for it. This one trims by frame energy
relative to the word's own peak with a margin either side, the way
`lib/audio/wav.ts` trims a clip, puts a pause of 0.3 to 1.5 seconds between
words (a seeded draw, so every run builds the same set), and in one variant
says a hesitation `ee` in some of the gaps, which is what a learner does.

What is tried on them:

  as said      the recording, 0.5 s of silence before it
  squeezed     every pause longer than `GAP` cut down to `KEEP`, measured
               against the clip's own loudest frame, nothing inside a word touched
  no ee        squeezed, and every stretch between two pauses that the model
               hears on its own as nothing but a hesitation taken out first
  and every transcript is read again with the hesitation marks taken out
  (`clean`): the model writes an `ee` down as `e`, `e-` or glued to a word
  continuous   the same sentences said normally, as the floor to aim at

Local only; every clip is a synthetic native voice.
"""
import importlib.util
import json
import os
import re
import sys

import numpy as np

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
OUT = os.path.join(ROOT, "pauses")
VOICES = ("mari", "tambet", "kalev")
GAP = 0.25     # a quiet run at least this long is a pause between words
KEEP = 0.15    # what is left of it
QUIET_DB = -40  # quiet is this far under the clip's loudest 10 ms

spec = importlib.util.spec_from_file_location("asr_experiments", os.path.join(os.path.dirname(__file__), "asr-experiments.py"))
X = importlib.util.module_from_spec(spec)
spec.loader.exec_module(X)
RATE = X.RATE
os.makedirs(OUT, exist_ok=True)


def energy(a, ms=10):
    frame = int(RATE * ms / 1000)
    n = len(a) // frame
    e = np.sqrt(np.mean(a[: n * frame].reshape(n, frame) ** 2, axis=1)) + 1e-9
    return 20 * np.log10(e / e.max()), frame


def trim(a, db=-45, margin=0.05):
    """The word alone: from 50 ms before its first frame above `db` to 50 ms after its last."""
    level, frame = energy(a)
    on = np.where(level > db)[0]
    if not len(on):
        return a
    start = max(0, on[0] * frame - int(RATE * margin))
    end = min(len(a), (on[-1] + 1) * frame + int(RATE * margin))
    return a[start:end]


def squeeze(a, keep=KEEP, gap=GAP, db=QUIET_DB):
    """Every pause between words cut down to `keep` seconds; the edges and the words left alone."""
    level, frame = energy(a)
    quiet = level < db
    n = len(quiet)
    out, i = [], 0
    while i < n:
        j = i
        while j < n and quiet[j] == quiet[i]:
            j += 1
        seg = a[i * frame: j * frame]
        if quiet[i] and (j - i) * frame >= gap * RATE and i > 0 and j < n:
            k = int(RATE * keep / 2)
            seg = np.concatenate([seg[:k], seg[-k:]])
        out.append(seg)
        i = j
    out.append(a[n * frame:])
    return np.concatenate(out).astype(np.float32)


FILLER = re.compile(r"^(e+|ö+|õ+|m+|hm+|ah+|eh+|äh+)$")


def clean(text):
    """A transcript without the hesitations the model wrote down: `e`, `ee`, `öö`, and `e-` before a word."""
    text = re.sub(r"(?i)\be-+\s*", " ", text)
    return " ".join(w for w in text.split() if not FILLER.match(re.sub(r"[^\wõäöü]", "", w.lower())))


def islands(a, gap=GAP, db=QUIET_DB):
    """The stretches of sound between pauses, as (start, end) sample offsets."""
    level, frame = energy(a)
    quiet = level < db
    out, start, run = [], None, 0
    for k, q in enumerate(quiet):
        if not q:
            if start is None:
                start = k
            run = 0
        elif start is not None:
            run += 1
            if run * frame >= gap * RATE:
                out.append((start * frame, (k - run + 1) * frame))
                start, run = None, 0
    if start is not None:
        out.append((start * frame, len(a)))
    return out


def without_hesitations(a, z, keep=KEEP):
    """Hear each stretch alone; drop the ones that are only a hesitation; join the rest with short pauses."""
    kept = []
    for s, e in islands(a):
        piece = a[max(0, s - RATE // 20): min(len(a), e + RATE // 20)]
        if clean(z.hear(piece, lead=0.3)["text"]):
            kept.append(piece)
    if not kept:
        return a
    gap = np.zeros(int(RATE * keep), dtype=np.float32)
    out = []
    for k, piece in enumerate(kept):
        out += [piece] + ([gap] if k < len(kept) - 1 else [])
    return np.concatenate(out)


def build():
    rng = np.random.default_rng(39)
    sentences = X.base_sentences()
    filler = {v: trim(X.load(X.tartu("ee", v))) for v in VOICES}
    rows = []
    for v in VOICES:
        for i, t in enumerate(sentences):
            parts, hesitant = [], []
            for w in t.split():
                core = w.strip(".,!?;:")
                parts.append(trim(X.load(X.tartu(core, v))))
            for name, with_filler in (("plain", False), ("ee", True)):
                path = os.path.join(OUT, f"{name}_{v}_{i}.wav")
                if not os.path.exists(path):
                    audio = []
                    for k, p in enumerate(parts):
                        audio.append(p)
                        if k < len(parts) - 1:
                            pause = rng.uniform(0.3, 1.5)
                            if with_filler and rng.random() < 0.4:
                                half = np.zeros(int(RATE * pause / 2), dtype=np.float32)
                                audio += [half, filler[v], half]
                            else:
                                audio.append(np.zeros(int(RATE * pause), dtype=np.float32))
                    X.save(path, np.concatenate(audio))
                rows.append({"text": t, "voice": v, "set": name, "file": path,
                             "continuous": X.tartu(t, v)})
        print(v, file=sys.stderr, flush=True)
    json.dump(rows, open(os.path.join(OUT, "sets.json"), "w"), ensure_ascii=False)
    print(len(rows), "clips", file=sys.stderr)


VARIANTS = {
    "as said": lambda a: a,
    "squeezed": squeeze,
}


def run():
    rows = json.load(open(os.path.join(OUT, "sets.json")))
    path = os.path.join(OUT, "heard.json")
    heard = json.load(open(path)) if os.path.exists(path) else {}
    models = {}
    for model, mid in (("large", X.LARGE), ("small", "TalTechNLP/streaming-zipformer.et-en")):
        for r in rows:
            for name, fn in VARIANTS.items():
                key = f"{model}|{name}|{r['file']}"
                if key not in heard:
                    if model not in models:
                        models[model] = X.Zipformer(mid)
                    heard[key] = models[model].hear(fn(X.load(r["file"])), lead=0.5)["text"]
            key = f"{model}|no ee|{r['file']}"
            if key not in heard:
                if model not in models:
                    models[model] = X.Zipformer(mid)
                heard[key] = models[model].hear(without_hesitations(X.load(r["file"]), models[model]), lead=0.5)["text"]
            key = f"{model}|continuous|{r['continuous']}"
            if key not in heard:
                if model not in models:
                    models[model] = X.Zipformer(mid)
                heard[key] = models[model].hear(X.load(r["continuous"]), lead=0.5)["text"]
        json.dump(heard, open(path, "w"), ensure_ascii=False)
        print(model, file=sys.stderr, flush=True)


def report():
    rows = json.load(open(os.path.join(OUT, "sets.json")))
    heard = json.load(open(os.path.join(OUT, "heard.json")))
    n = sum(len(X.words(r["text"])) for r in rows if r["set"] == "plain")
    print(f"{len(rows)} clips, {n} words a set, voices {', '.join(VOICES)}\n")
    for model in ("large", "small"):
        cont = [(r["text"], heard[f"{model}|continuous|{r['continuous']}"]) for r in rows if r["set"] == "plain"]
        print(f"{model:6} said normally                      {X.wer(cont):5.1f}%")
        for s in ("plain", "ee"):
            for name in list(VARIANTS) + ["no ee"]:
                pairs = [(r["text"], heard[f"{model}|{name}|{r['file']}"]) for r in rows if r["set"] == s]
                print(f"{model:6} word by word{', with ee' if s == 'ee' else '         '} {name:12} {X.wer(pairs):5.1f}%"
                      f"   cleaned {X.wer([(a, clean(b)) for a, b in pairs]):5.1f}%")
        print()


if __name__ == "__main__":
    {"build": build, "run": run, "report": report}[sys.argv[1] if len(sys.argv) > 1 else "report"]()
