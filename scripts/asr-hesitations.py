#!/usr/bin/env python3
"""
Real hesitations: what the word-by-word preparation does to Estonian people actually said.

    python3 scripts/asr-hesitations.py pick      # segments out of the TalTech speech dataset, by byte range
    python3 scripts/asr-hesitations.py run       # every preparation, both Zipformers (cached)
    python3 scripts/asr-hesitations.py report

`scripts/asr-pauses.py` measured the preparation on a synthetic `ee` dropped
between words, and said itself why that is not enough: TartuNLP's `ee` is a
short word with intonation, not a held vowel. This is the same measurement on
real speech. The TalTech Estonian Speech Dataset 1.0 (CC BY-SA 4.0,
https://cs.taltech.ee/staff/tanel.alumae/data/est-pub-asr-data/) is 1,300
hours of broadcast, interviews and the Riigikogu, transcribed by hand, and its
scoring transcripts (STM) say two useful things:

  * filled pauses are not written at all, so the reference is what was meant
    rather than what was said, which is the target a learner's sentence is
    judged against too
  * a false start, a repeated word or a filler word kept in the text sits in
    brackets, `(mit)` or `(noh)`, which sclite reads as optional: present or
    absent, neither is an error

A segment is "disfluent" where its reference holds an optional word or a word
said twice in a row. The audio is fetched by HTTP range out of the 159 GB tar
(`.cache/asr/taltech/index.json`, written by an indexer that reads only the
headers), so nothing like the whole dataset is downloaded.

Speech here is native and mostly fluent; a learner hesitates longer and more
often. What this answers is whether the preparation that helped on synthetic
speech hurts real speech, and how the model writes a real hesitation down.
"""
import importlib.util
import json
import os
import random
import re
import struct
import sys
import urllib.request

import numpy as np

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
TAL = os.path.join(ROOT, "taltech")
OUT = os.path.join(TAL, "hesitations")
URL = "https://cs.taltech.ee/staff/tanel.alumae/data/est-pub-asr-data/taltech-asr-speech-dataset-1.0.tar"
PER_FILE = 4
PER_GROUP = 160

spec = importlib.util.spec_from_file_location("asr_pauses", os.path.join(os.path.dirname(__file__), "asr-pauses.py"))
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)
X = P.X
RATE = X.RATE
os.makedirs(OUT, exist_ok=True)


def group(name):
    """Which kind of speech a file holds, from where TalTech filed it."""
    if "/intervjuukorpus/" in name:
        return "interview"
    if "/Riigikogu" in name:
        return "parliament"
    base = os.path.basename(name).lower()
    if "aktuaalne-kaamera" in base or "uudised" in base:
        return "news"
    return "talk show"


def fetch(off, size):
    req = urllib.request.Request(URL, headers={"Range": f"bytes={off}-{off + size - 1}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def wav_layout(off):
    """Rate, channels, bits and where the samples start, read from the member's first bytes."""
    head = fetch(off, 65536)
    assert head[:4] == b"RIFF" and head[8:12] == b"WAVE", "not a wav"
    i, fmt = 12, None
    while i + 8 <= len(head):
        cid, size = head[i:i + 4], struct.unpack("<I", head[i + 4:i + 8])[0]
        if cid == b"fmt ":
            _, ch, rate, _, _, bits = struct.unpack("<HHIIHH", head[i + 8:i + 24])
            fmt = (rate, ch, bits)
        if cid == b"data":
            return fmt, off + i + 8
        i += 8 + size + (size & 1)
    raise ValueError("no data chunk in the first 64 KB")


def optional(tok):
    return tok.startswith("(") and tok.endswith(")")


def ref_tokens(text):
    """The STM line as (word, optional) pairs."""
    out = []
    for tok in text.split():
        opt = "(" in tok
        for w in X.words(tok):
            out.append((w, opt))
    return out


def disfluent(text):
    toks = ref_tokens(text)
    if any(o for _, o in toks):
        return True
    ws = [w for w, _ in toks]
    return any(a == b for a, b in zip(ws, ws[1:]))


def errors(ref, hyp):
    """Edit distance where an optional reference word may be left out for nothing."""
    h = X.words(hyp)
    d = [0] * (len(h) + 1)
    for j in range(len(h) + 1):
        d[j] = j
    for w, opt in ref:
        prev, d[0] = d[0], d[0] + (0 if opt else 1)
        for j in range(1, len(h) + 1):
            cur = min(d[j] + (0 if opt else 1), d[j - 1] + 1, prev + (0 if h[j - 1] == w else 1))
            prev, d[j] = d[j], cur
    return d[-1], sum(1 for _, o in ref if not o)


def pick():
    index = json.load(open(os.path.join(TAL, "index.json")))["members"]
    where = {n: (o, s) for n, o, s in index}
    audio = [n for n in where if n.startswith("train/audio/") and n.endswith(".wav")]
    rng = random.Random(39)
    rng.shuffle(audio)
    path = os.path.join(OUT, "sets.json")
    rows = json.load(open(path)) if os.path.exists(path) else []
    have = {r["file"] for r in rows}
    count = {}
    for r in rows:
        count[r["group"]] = count.get(r["group"], 0) + 1
    for name in audio:
        g = group(name)
        if count.get(g, 0) >= PER_GROUP:
            continue
        stm = name.replace("train/audio/", "train/transcriptions/stm/")[:-4] + ".stm"
        if stm not in where:
            continue
        lines = fetch(*where[stm]).decode("utf-8", "replace").splitlines()
        segs = []
        for line in lines:
            if line.startswith(";;"):
                continue
            parts = line.split(None, 6)
            if len(parts) < 7 or parts[2] == "inter_segment_gap":
                continue
            start, end = float(parts[3]), float(parts[4])
            text = re.sub(r"^<[^>]*>\s*", "", parts[6]).strip()
            n = sum(1 for _, o in ref_tokens(text) if not o)
            if 3.0 <= end - start <= 12.0 and n >= 5 and not re.search(r"\d", text):
                segs.append((start, end, text))
        if not segs:
            continue
        try:
            (rate, ch, bits), data = wav_layout(where[name][0])
        except (AssertionError, ValueError) as e:
            print("skip", name, e, file=sys.stderr)
            continue
        width = ch * bits // 8
        for start, end, text in rng.sample(segs, min(PER_FILE, len(segs))):
            file = os.path.join(OUT, f"{os.path.basename(name)[:-4]}_{start:.2f}.wav")
            if file not in have:
                raw = fetch(data + int(start * rate) * width, int((end - start) * rate) * width)
                a = np.frombuffer(raw, dtype="<i2" if bits == 16 else "<i4").astype(np.float32)
                a = a.reshape(-1, ch).mean(axis=1) / (2 ** (bits - 1))
                if rate != RATE:
                    import librosa
                    a = librosa.resample(a, orig_sr=rate, target_sr=RATE)
                X.save(file, a)
                rows.append({"file": file, "group": g, "text": text, "source": name, "disfluent": disfluent(text)})
                count[g] = count.get(g, 0) + 1
        json.dump(rows, open(path, "w"), ensure_ascii=False)
        print(g, count, file=sys.stderr, flush=True)
        if all(count.get(k, 0) >= PER_GROUP for k in ("interview", "parliament", "talk show", "news")):
            break


VARIANTS = {
    "as said": lambda a, z: a,
    "squeezed": lambda a, z: P.squeeze(a),
    "no ee": lambda a, z: P.without_hesitations(P.squeeze(a), z),
}


def run():
    rows = json.load(open(os.path.join(OUT, "sets.json")))
    path = os.path.join(OUT, "heard.json")
    heard = json.load(open(path)) if os.path.exists(path) else {}
    for model, mid in (("large", X.LARGE), ("small", "TalTechNLP/streaming-zipformer.et-en")):
        z = None
        for k, r in enumerate(rows):
            for name, fn in VARIANTS.items():
                key = f"{model}|{name}|{r['file']}"
                if key not in heard:
                    z = z or X.Zipformer(mid)
                    heard[key] = z.hear(fn(X.load(r["file"]), z), lead=0.5)["text"]
            if k % 50 == 0:
                json.dump(heard, open(path, "w"), ensure_ascii=False)
        json.dump(heard, open(path, "w"), ensure_ascii=False)
        print(model, file=sys.stderr, flush=True)


FILLERS = re.compile(r"^(e+|ee+|öö+|õõ+|ää+|ah+|äh+|eh+|öh+|mm+|hm+|mhm)$")


def report():
    rows = json.load(open(os.path.join(OUT, "sets.json")))
    heard = json.load(open(os.path.join(OUT, "heard.json")))
    groups = ("interview", "talk show", "parliament", "news")
    print(f"{len(rows)} segments; disfluent ones hold an optional word or a word said twice\n")
    for model in ("large", "small"):
        for g in groups + ("all",):
            for flu in ("all", "disfluent", "fluent"):
                sel = [r for r in rows if (g == "all" or r["group"] == g)
                       and (flu == "all" or r["disfluent"] == (flu == "disfluent"))]
                if not sel:
                    continue
                cells = []
                for name in VARIANTS:
                    for cleaned in (False, True):
                        e = n = 0
                        for r in sel:
                            h = heard.get(f"{model}|{name}|{r['file']}")
                            if h is None:
                                continue
                            a, b = errors(ref_tokens(r["text"]), P.clean(h) if cleaned else h)
                            e, n = e + a, n + b
                        cells.append(f"{100 * e / max(n, 1):5.1f}")
                print(f"{model:6} {g:10} {flu:9} n={len(sel):4}  " + "  ".join(
                    f"{nm}{' +clean' if c else ''} {v}" for (nm, c), v in zip(
                        [(nm, c) for nm in VARIANTS for c in (False, True)], cells)))
        print()
    fill = {}
    for k, h in heard.items():
        model, name, _ = k.split("|", 2)
        if name == "as said":
            for w in h.lower().replace("-", " ").split():
                w = re.sub(r"[^\wõäöü]", "", w)
                if FILLERS.match(w):
                    fill.setdefault(model, {}).setdefault(w, 0)
                    fill[model][w] += 1
    print("what each model writes for a hesitation, as said:", json.dumps(fill, ensure_ascii=False))


if __name__ == "__main__":
    {"pick": pick, "run": run, "report": report}[sys.argv[1] if len(sys.argv) > 1 else "report"]()
