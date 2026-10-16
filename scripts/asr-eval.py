#!/usr/bin/env python3
"""
The final comparison: every candidate for every job, on held-out real speech, with intervals.

    python3 scripts/asr-eval.py pick dev        # segments from TalTech's dev split (choices are made here)
    python3 scripts/asr-eval.py pick test       # and from its test split (reported once, at the end)
    python3 scripts/asr-eval.py babble dev      # the same segments with real background talkers under them
    python3 scripts/asr-eval.py hear dev        # every system on every condition (cached, resumable)
    python3 scripts/asr-eval.py report dev

Why this exists. Rounds three and four measured real speech on segments from the dataset's `train/`
split, which is what TalTech trained these models on, so the base models had heard them and every
"before" figure flattered them. The dataset's own `dev/` and `test/` splits are held out by TalTech
(the 2023 paper evaluates on them), so this script uses those and nothing else.

The protocol, fixed before any result was seen:

  * dev decides, test reports. A threshold, a recipe or a combination is chosen on dev; test is
    read once, after every choice is made, and nothing is changed because of it.
  * Every comparison is paired (same segments, two systems), with a 95% interval from resampling
    whole recordings, because segments of one speaker are not independent. The hand transcripts
    carry up to 5% errors of their own (the dataset's README), so a difference only counts where
    its interval excludes zero.
  * Noise is real: other segments of the same split, from other recordings, mixed under each
    segment at 10 and 5 dB. Synthetic babble made of TTS sentences flatters any trick that strips
    words two models disagree on.
  * Decision rules: a fine-tuned model replaces its base for a job only if the upper end of its
    real-speech word-error difference is under +0.5 points and its target metric improves with an
    interval that excludes zero. Two models run together only where the gain on real noise
    excludes zero.

Local only, free: the TalTech archive is read by HTTP range, the models run on the CPU.
"""
import importlib.util
import json
import os
import random
import re
import sys

import numpy as np

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
OUT = os.path.join(ROOT, "eval")
PER_RECORDING = 6
SNRS = (10,)  # 5 dB is a room the app asks the learner to leave

spec = importlib.util.spec_from_file_location("asr_hesitations", os.path.join(os.path.dirname(__file__), "asr-hesitations.py"))
H = importlib.util.module_from_spec(spec)
spec.loader.exec_module(H)
X = H.X
RATE = X.RATE
os.makedirs(OUT, exist_ok=True)


def subset(name):
    return name.split("/")[2]


# ------------------------------------------------------------------ the segments

def pick(split):
    """Up to PER_RECORDING segments from every recording of the split, 3 to 12 seconds, at least five
    scored words, no digits (the references write numbers as words)."""
    index = json.load(open(os.path.join(ROOT, "taltech", "index.json")))["members"]
    where = {n: (o, s) for n, o, s in index}
    audio = sorted(n for n in where if n.startswith(f"{split}/audio/") and n.endswith(".wav"))
    path = os.path.join(OUT, f"{split}.json")
    rows = json.load(open(path)) if os.path.exists(path) else []
    done = {r["source"] for r in rows}
    d = os.path.join(OUT, split)
    os.makedirs(d, exist_ok=True)
    rng = random.Random(f"kodukeel-{split}")
    for name in audio:
        if name in done:
            continue
        stm = name.replace(f"{split}/audio/", f"{split}/transcriptions/stm/")[:-4] + ".stm"
        if stm not in where:
            continue
        segs = []
        for line in H.fetch(*where[stm]).decode("utf-8", "replace").splitlines():
            parts = line.split(None, 6)
            if line.startswith(";;") or len(parts) < 7 or parts[2] == "inter_segment_gap":
                continue
            start, end = float(parts[3]), float(parts[4])
            text = re.sub(r"^<[^>]*>\s*", "", parts[6]).strip()
            n = sum(1 for _, o in H.ref_tokens(text) if not o)
            if 3.0 <= end - start <= 12.0 and n >= 5 and not re.search(r"\d", text):
                segs.append((start, end, text))
        if not segs:
            continue
        (rate, ch, bits), data = H.wav_layout(where[name][0])
        width = ch * bits // 8
        for start, end, text in rng.sample(segs, min(PER_RECORDING, len(segs))):
            raw = H.fetch(data + int(start * rate) * width, int((end - start) * rate) * width)
            a = np.frombuffer(raw, dtype="<i2" if bits == 16 else "<i4").astype(np.float32)
            a = a.reshape(-1, ch).mean(axis=1) / (2 ** (bits - 1))
            if rate != RATE:
                import librosa
                a = librosa.resample(a, orig_sr=rate, target_sr=RATE)
            f = os.path.join(d, f"{os.path.basename(name)[:-4]}_{start:.2f}.wav")
            X.save(f, a)
            rows.append({"file": f, "source": name, "subset": subset(name), "text": text,
                         "disfluent": H.disfluent(text)})
        json.dump(rows, open(path, "w"), ensure_ascii=False)
        print(split, len(rows), "segments,", len({r["source"] for r in rows}), "recordings", file=sys.stderr, flush=True)


def babble(split):
    """Each segment with three segments of other recordings of the same split under it, at each SNR.
    Seeded per segment, so every system hears the same mixture."""
    rows = json.load(open(os.path.join(OUT, f"{split}.json")))
    for r in rows:
        clean = X.load(r["file"])
        others = [o for o in rows if o["source"] != r["source"]]
        rng = random.Random(r["file"])
        talkers = [X.load(o["file"]) for o in rng.sample(others, 3)]
        bg = np.zeros_like(clean)
        for t in talkers:
            t = np.tile(t, int(np.ceil(len(clean) / len(t))))[: len(clean)]
            bg += t / (np.sqrt(np.mean(t ** 2)) + 1e-9)
        for snr in SNRS:
            f = r["file"][:-4] + f".babble{snr}.wav"
            if os.path.exists(f):
                continue
            p_s = np.mean(clean ** 2)
            p_n = np.mean(bg ** 2) + 1e-12
            mix = clean + bg * np.sqrt(p_s / (p_n * 10 ** (snr / 10)))
            X.save(f, mix / max(1.0, np.abs(mix).max()))
    print(split, "babble written for", len(rows), "segments", file=sys.stderr)


# ------------------------------------------------------------------ the systems

def conditions(r):
    return {"quiet": r["file"], **{f"babble{snr}": r["file"][:-4] + f".babble{snr}.wav" for snr in SNRS}}


def zipformer_onnx(d):
    import sherpa_onnx
    z = X.Zipformer.__new__(X.Zipformer)
    z.r = sherpa_onnx.OnlineRecognizer.from_transducer(
        tokens=f"{d}/tokens.txt", encoder=f"{d}/encoder.int8.onnx", decoder=f"{d}/decoder.onnx",
        joiner=f"{d}/joiner.int8.onnx", num_threads=os.cpu_count() or 4, sample_rate=RATE,
        feature_dim=80, decoding_method="greedy_search")
    return lambda f: z.hear(X.load(f), lead=0.5)["text"]


def zipformer_hf(mid):
    z = X.Zipformer(mid)
    return lambda f: z.hear(X.load(f), lead=0.5)["text"]


def xlsr(mid):
    import torch
    from transformers import AutoModelForCTC, AutoProcessor
    torch.set_num_threads(os.cpu_count() or 4)
    proc = AutoProcessor.from_pretrained(mid)
    model = AutoModelForCTC.from_pretrained(mid).eval()

    def hear(f):
        inputs = proc(X.load(f), sampling_rate=RATE, return_tensors="pt")
        with torch.inference_mode():
            return proc.batch_decode(model(**inputs).logits.argmax(-1))[0]
    return hear


ICE = os.path.join(ROOT, "icefall")
FT = os.path.join(ROOT, "finetune")
def onnx_system(d):
    return (lambda: zipformer_onnx(os.path.join(ICE, d)), lambda: os.path.isdir(os.path.join(ICE, d)))


# Every system that informs a decision, and nothing else. xls-r is not here because the app never uses
# it to write a transcript; its job, the pronunciation verdict, is measured by `falsealarm`.
SYSTEMS = {
    "zipformer large": (lambda: zipformer_hf(X.LARGE), lambda: True),
    "zipformer small": (lambda: zipformer_hf("TalTechNLP/streaming-zipformer.et-en"), lambda: True),
    "trainable zipformer": onnx_system("onnx-before"),
    "trainable zipformer, anchored": onnx_system("onnx-anchored"),
    "trainable zipformer, anchored, chunk 32": onnx_system("onnx-anchored-c32"),
    "trainable zipformer, anchored, chunk 64": onnx_system("onnx-anchored-c64"),
    "student": onnx_system("onnx-student"),
    "student, chunk 32": onnx_system("onnx-student-c32"),
    "student, chunk 64": onnx_system("onnx-student-c64"),
}


def hear(split, only=None):
    rows = json.load(open(os.path.join(OUT, f"{split}.json")))
    path = os.path.join(OUT, f"heard-{split}.json")
    heard = json.load(open(path)) if os.path.exists(path) else {}
    for name, (build, exists) in SYSTEMS.items():
        if (only and name not in only) or not exists():
            continue
        fn = None
        for k, r in enumerate(rows):
            for cond, f in conditions(r).items():
                key = f"{name}|{cond}|{r['file']}"
                if key not in heard:
                    fn = fn or build()
                    heard[key] = fn(f)
            if k % 25 == 0:
                json.dump(heard, open(path, "w"), ensure_ascii=False)
        json.dump(heard, open(path, "w"), ensure_ascii=False)
        print(split, name, file=sys.stderr, flush=True)


# ------------------------------------------------------------------ combining (scripts/asr-icefall.py rover, without the import)

def align(base, other):
    n, m = len(base), len(other)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (base[i - 1] != other[j - 1]))
    out, i, j = [None] * n, n, m
    while i > 0 and j > 0:
        if d[i][j] == d[i - 1][j - 1] + (base[i - 1] != other[j - 1]):
            out[i - 1] = other[j - 1]
            i, j = i - 1, j - 1
        elif d[i][j] == d[i - 1][j] + 1:
            i -= 1
        else:
            j -= 1
    return out


def both_heard(a, b):
    """`a`'s words, only where `b` also heard a word at that place."""
    base = X.words(a)
    return " ".join(w for w, x in zip(base, align(base, X.words(b))) if x is not None)


def vote(first, *rest):
    """A word of `first` changes only where every other hypothesis agrees on the same other word."""
    base = X.words(first)
    aligned = [align(base, X.words(h)) for h in rest]
    out = []
    for i, w in enumerate(base):
        alts = {a[i] for a in aligned}
        if len(alts) == 1 and (alt := next(iter(alts))) != w:
            if alt is not None:
                out.append(alt)
        else:
            out.append(w)
    return " ".join(out)


COMBINED = {
    "large, only words the anchored zipformer also heard": lambda h: both_heard(h["zipformer large"], h["trainable zipformer, anchored"]),
    "large, only words the student also heard": lambda h: both_heard(h["zipformer large"], h["student"]),
    "large, only words the small zipformer also heard": lambda h: both_heard(h["zipformer large"], h["zipformer small"]),
    "vote: large, anchored, small": lambda h: vote(h["zipformer large"], h["trainable zipformer, anchored"], h["zipformer small"]),
}


# ------------------------------------------------------------------ statistics

def per_segment(rows, heard, system, cond):
    """(errors, scored words) per segment, or None where the system has not heard it."""
    out = []
    for r in rows:
        if system in COMBINED:
            parts = {s: heard.get(f"{s}|{cond}|{r['file']}") for s in SYSTEMS}
            try:
                hyp = COMBINED[system](parts)
            except (TypeError, KeyError, AttributeError):
                return None
        else:
            hyp = heard.get(f"{system}|{cond}|{r['file']}")
            if hyp is None:
                return None
        out.append(H.errors(H.ref_tokens(r["text"]), hyp))
    return out


def bootstrap(rows, a, b=None, n=2000, seed=0):
    """Word error rate of `a` (or of `a` minus `b`, paired) with a 95% interval from resampling
    recordings, every segment of a drawn recording going in together."""
    by = {}
    for k, r in enumerate(rows):
        by.setdefault(r["source"], []).append(k)
    recs = list(by)
    rng = np.random.default_rng(seed)

    def rate(sel, s):
        e = sum(s[k][0] for k in sel)
        w = sum(s[k][1] for k in sel)
        return 100 * e / max(w, 1)
    allk = range(len(rows))
    point = rate(allk, a) - (rate(allk, b) if b else 0)
    draws = []
    for _ in range(n):
        pick = rng.integers(0, len(recs), len(recs))
        sel = [k for p in pick for k in by[recs[p]]]
        draws.append(rate(sel, a) - (rate(sel, b) if b else 0))
    lo, hi = np.percentile(draws, [2.5, 97.5])
    return point, lo, hi


def report(split):
    rows = json.load(open(os.path.join(OUT, f"{split}.json")))
    heard = json.load(open(os.path.join(OUT, f"heard-{split}.json")))
    words = sum(1 for r in rows for _, o in H.ref_tokens(r["text"]) if not o)
    print(f"{split}: {len(rows)} segments, {len({r['source'] for r in rows})} recordings, {words} scored words")
    print(f"subsets: {json.dumps({s: sum(1 for r in rows if r['subset'] == s) for s in sorted({r['subset'] for r in rows})})}\n")
    names = list(SYSTEMS) + list(COMBINED)
    base = {c: per_segment(rows, heard, "zipformer large", c) for c in ("quiet",) + tuple(f"babble{s}" for s in SNRS)}
    for cond in base:
        print(f"{cond}: words wrong, and the difference from the large zipformer (95% interval, by recording)")
        for name in names:
            s = per_segment(rows, heard, name, cond)
            if s is None:
                continue
            p, lo, hi = bootstrap(rows, s)
            line = f"  {name:52} {p:5.2f}% [{lo:5.2f}, {hi:5.2f}]"
            if name != "zipformer large" and base[cond]:
                d, dlo, dhi = bootstrap(rows, s, base[cond])
                mark = "  better" if dhi < 0 else ("  worse" if dlo > 0 else "")
                line += f"   {d:+5.2f} [{dlo:+5.2f}, {dhi:+5.2f}]{mark}"
            print(line)
        print()
    print("forgetting: each fine-tune against its own base, quiet real speech")
    for tuned, basis in (("trainable zipformer, anchored", "trainable zipformer"), ("student", "trainable zipformer, anchored"),
                         ("student", "zipformer small")):
        a, b = per_segment(rows, heard, tuned, "quiet"), per_segment(rows, heard, basis, "quiet")
        if a and b:
            d, dlo, dhi = bootstrap(rows, a, b)
            verdict = "passes" if dhi < 0.5 else "fails"
            print(f"  {tuned:34} vs {basis:20} {d:+5.2f} [{dlo:+5.2f}, {dhi:+5.2f}]  rule (upper end under +0.5): {verdict}")


# ------------------------------------------------------------------ the pronunciation verdict on real native speech

VOWEL_SWAP = {"õ": "o", "ä": "a", "ö": "o", "ü": "u", "o": "õ", "a": "ä", "u": "ü"}
VOICE_SWAP = {"b": "p", "p": "b", "d": "t", "t": "d", "g": "k", "k": "g"}
REF_VOICES = ("vesta", "peeter")
PAIRS_PER_SEGMENT = 3


def partners(w, forms):
    """Real words one learner's mistake away from `w`: a sound held or not held, a stop voiced or not,
    a vowel with or without its marks. Only spellings the forms list holds count as words."""
    out = set()
    for i in range(len(w)):
        ch = w[i]
        if i + 1 < len(w) and w[i + 1] == ch:
            out.add(("length", w[:i] + w[i + 1:]))
        elif ch.isalpha():
            out.add(("length", w[:i + 1] + ch + w[i + 1:]))
        if i > 0 and ch in VOICE_SWAP:
            out.add(("voicing", w[:i] + VOICE_SWAP[ch] + w[i + 1:]))
        if ch in VOWEL_SWAP:
            out.add(("vowel", w[:i] + VOWEL_SWAP[ch] + w[i + 1:]))
    return sorted((k, p) for k, p in out if p != w and p in forms)


CASE_ENDINGS = ("s", "st", "sse", "l", "lt", "le", "ks", "ni", "na", "ta", "ga")
PERSON_ENDINGS = ("n", "d", "b", "me", "te", "vad")


def dictionary_words():
    """The spellings a Kodukeel exercise could be built on: every word of the built dictionary, its
    stored forms, the ten cases on its genitive stem and the present persons on its first person (the
    rules `lib/estonian/gapForms.ts` applies). A pair whose partner is only a rare spelling in the
    5.7 million word forms list is a pair no exercise would ever use."""
    out = set()
    for e in json.load(open(os.path.join("prisma", "data", "expanded.json"))):
        out.add(e["lemma"].lower())
        f = {x["formType"]: x["value"].lower() for x in e.get("forms", [])}
        out.update(f.values())
        if "GEN_SG" in f:
            out.update(f["GEN_SG"] + end for end in CASE_ENDINGS)
        if "PRES_1SG" in f and f["PRES_1SG"].endswith("n"):
            out.update(f["PRES_1SG"][:-1] + end for end in PERSON_ENDINGS)
    return out


def pairs(split):
    """One word a segment with a partner, both words ones the app's dictionary reaches, the segment's
    text said both ways by two reference voices (TartuNLP, free, cached): the references the app
    would build for an exercise."""
    rows = json.load(open(os.path.join(OUT, f"{split}.json")))
    forms = X.forms() & dictionary_words()
    rng = random.Random(f"pairs-{split}")
    path = os.path.join(OUT, f"pairs-{split}.json")
    out = json.load(open(path)) if os.path.exists(path) else []
    done = {p["file"] for p in out}
    for r in rows:
        if r["file"] in done:
            continue
        text = r["text"].replace("(", "").replace(")", "")
        toks = text.split()
        cands = []
        for i, tok in enumerate(toks):
            core = re.sub(r"[^\wõäöüšž]", "", tok.lower())
            if len(core) >= 3 and core in forms:
                cands += [(i, core, k, p) for k, p in partners(core, forms)]
        if not cands:
            continue
        # Up to three different words a segment; the interval resamples whole recordings, so pairs from
        # one speaker are not counted as independent evidence.
        by_word = {}
        for c in cands:
            by_word.setdefault(c[0], []).append(c)
        for i in rng.sample(sorted(by_word), min(PAIRS_PER_SEGMENT, len(by_word))):
            _, core, kind, partner = rng.choice(by_word[i])
            wrong = list(toks)
            wrong[i] = toks[i].lower().replace(core, partner)
            wrong = " ".join(wrong)
            refs = {v: [X.tartu(text, v), X.tartu(wrong, v)] for v in REF_VOICES}
            out.append({"file": r["file"], "source": r["source"], "text": text, "wrong": wrong, "word": core,
                        "partner": partner, "kind": kind, "refs": refs})
        json.dump(out, open(path, "w"), ensure_ascii=False)
    print(split, len(out), "pairs from", len(rows), "segments", file=sys.stderr)


def xlsr_scorer(mid):
    spec = importlib.util.spec_from_file_location("asr_verdict", os.path.join(os.path.dirname(__file__), "asr-verdict.py"))
    V = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(V)
    import torch
    from transformers import AutoModelForCTC, AutoProcessor
    torch.set_num_threads(os.cpu_count() or 4)
    proc = AutoProcessor.from_pretrained(mid)
    model = AutoModelForCTC.from_pretrained(mid).eval()
    lps = {}

    def margin(f, a, b):
        if f not in lps:
            inputs = proc(X.load(f), sampling_rate=RATE, return_tensors="pt")
            with torch.inference_mode():
                lps[f] = torch.log_softmax(model(**inputs).logits[0].float(), -1).numpy()
        return V.margin(lps[f], V.letters(a), V.letters(b))
    return margin


def transducer_scorer(name):
    spec = importlib.util.spec_from_file_location("asr_icefall", os.path.join(os.path.dirname(__file__), "asr-icefall.py"))
    I = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(I)
    sc = I.Scorer(name)
    return sc.margin


SCORERS = {
    "xls-r": lambda: xlsr_scorer("TalTechNLP/xls-r-300m-et"),
    "xls-r, synthetic only": lambda: xlsr_scorer(os.path.join(FT, "model")),
    "xls-r, anchored": lambda: xlsr_scorer(os.path.join(FT, "model-anchored")),
    "trainable zipformer": lambda: transducer_scorer("before"),
    "trainable zipformer, anchored": lambda: transducer_scorer("anchored"),
}


def falsealarm(split, only=None):
    """Native speakers saying the word right, judged by each model: how often would it tell them
    they said the partner? Positions are on the exercise scale, 0 where the references say it right
    and 1 where they say it wrong; above 0.6 is a false alarm, 0.4 to 0.6 asks again."""
    ps = json.load(open(os.path.join(OUT, f"pairs-{split}.json")))
    path = os.path.join(OUT, f"verdict-{split}.json")
    res = json.load(open(path)) if os.path.exists(path) else {}
    for name, build in SCORERS.items():
        if only and name not in only:
            continue
        if name in res and len(res[name]) == len(ps):
            continue
        if "anchored" in name and not os.path.exists(os.path.join(FT, "model-anchored") if "xls" in name else os.path.join(ROOT, "icefall", "anchored.pt")):
            continue
        if name == "xls-r, synthetic only" and not os.path.isdir(os.path.join(FT, "model")):
            continue
        margin = build()
        rows = []
        for p in ps:
            rr = np.mean([margin(a, p["text"], p["wrong"]) for a, _ in p["refs"].values()])
            rw = np.mean([margin(b, p["text"], p["wrong"]) for _, b in p["refs"].values()])
            m = margin(p["file"], p["text"], p["wrong"])
            rows.append({"pos": (m - rr) / (rw - rr) if rw != rr else 0.0, "sep": float(rw - rr)})
        res[name] = rows
        json.dump(res, open(path, "w"))
        print(split, name, "scored", file=sys.stderr, flush=True)
    by = {}
    for k, p in enumerate(ps):
        by.setdefault(p["source"], []).append(k)
    recs = list(by)
    rng = np.random.default_rng(0)
    print(f"{split}: {len(ps)} native segments with a word that has a real partner, {len(recs)} recordings")
    print("kinds:", json.dumps({k: sum(1 for p in ps if p['kind'] == k) for k in ('length', 'voicing', 'vowel')}))
    for name, rows in res.items():
        for gate in (0.0, 5.0):
            keep = [k for k, x in enumerate(rows) if x["sep"] >= gate]
            if not keep:
                continue

            def rates(sel):
                sel = [k for k in sel if rows[k]["sep"] >= gate]
                n = max(len(sel), 1)
                return (100 * sum(rows[k]["pos"] > 0.6 for k in sel) / n,
                        100 * sum(0.4 <= rows[k]["pos"] <= 0.6 for k in sel) / n)
            fa, ag = rates(range(len(rows)))
            draws = []
            for _ in range(2000):
                pick = rng.integers(0, len(recs), len(recs))
                draws.append(rates([k for q in pick for k in by[recs[q]]])[0])
            lo, hi = np.percentile(draws, [2.5, 97.5])
            print(f"  {name:32} gate {gate:3.0f}: {len(keep):3} pairs  false alarm {fa:5.1f}% [{lo:4.1f}, {hi:4.1f}]  asked again {ag:5.1f}%")


def speed(split):
    """Seconds of decoding per second of audio on ONE core (a phone's big core is about this server's
    one), and what each system weighs on disk as the app would ship it."""
    import time
    rows = json.load(open(os.path.join(OUT, f"{split}.json")))[:40]
    audio = [X.load(r["file"]) for r in rows]
    total = sum(len(a) for a in audio) / RATE
    print(f"{len(rows)} segments, {total:.0f} s of audio, one thread\n")
    import sherpa_onnx
    from huggingface_hub import snapshot_download
    dirs = {"zipformer large": snapshot_download(X.LARGE, allow_patterns=["*.int8.onnx", "tokens.txt"]),
            "zipformer small": snapshot_download("TalTechNLP/streaming-zipformer.et-en", allow_patterns=["*.int8.onnx", "tokens.txt"])}
    for name, (_, exists) in SYSTEMS.items():
        if name.startswith(("trainable", "student")) and exists():
            dirs[name] = os.path.join(ICE, {"trainable zipformer": "onnx-before"}.get(name, "onnx-" + name.replace("trainable zipformer, ", "").replace(", chunk ", "-c")))
    for name, d in dirs.items():
        if not os.path.isdir(d):
            continue
        r = sherpa_onnx.OnlineRecognizer.from_transducer(
            tokens=f"{d}/tokens.txt", encoder=f"{d}/encoder.int8.onnx",
            decoder=f"{d}/decoder.onnx" if os.path.exists(f"{d}/decoder.onnx") else f"{d}/decoder.int8.onnx",
            joiner=f"{d}/joiner.int8.onnx", num_threads=1, sample_rate=RATE, feature_dim=80, decoding_method="greedy_search")
        t = time.time()
        for a in audio:
            st = r.create_stream()
            st.accept_waveform(RATE, np.concatenate([np.zeros(RATE // 2, np.float32), a, np.zeros(int(RATE * 0.8), np.float32)]))
            st.input_finished()
            while r.is_ready(st):
                r.decode_stream(st)
        rtf = (time.time() - t) / total
        size = sum(os.path.getsize(os.path.join(d, f)) for f in ("encoder.int8.onnx", "joiner.int8.onnx")) / 1e6
        size += os.path.getsize(f"{d}/decoder.onnx" if os.path.exists(f"{d}/decoder.onnx") else f"{d}/decoder.int8.onnx") / 1e6
        print(f"  {name:42} {size:6.0f} MB   {rtf:.3f} s per second of audio")


if __name__ == "__main__":
    cmd, split = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "dev")
    assert split in ("dev", "test"), "dev or test"
    {"pick": pick, "babble": babble, "hear": hear, "report": report, "pairs": pairs, "falsealarm": falsealarm, "speed": speed}[cmd](split)
