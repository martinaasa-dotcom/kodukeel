#!/usr/bin/env python3
"""
Which of two words was said? A forced choice, scored by TalTech's xls-r.

    python3 scripts/asr-verdict.py build    # the test sets, TartuNLP voices (free, cached)
    python3 scripts/asr-verdict.py run      # letter probabilities for every clip (cached)
    python3 scripts/asr-verdict.py report   # the verdict tables
    python3 scripts/asr-verdict.py say      # "did they say this word", both models

`scripts/asr-experiments.py` asked whether a recognizer *writes down* a
mispronounced word as it was said, and neither model does often enough for
feedback about sounds (docs/39-speech.md section 3.5). This asks an easier
question, the one a minimal-pairs exercise actually needs: the screen already
knows the two candidates, `linna` and `lina`, so score the recording against
both spellings and say which fits better. That is a forced alignment, the
standard technique in pronunciation training, and it runs on the device.

Local only. TartuNLP's free public voices make the clips; nothing here can
reach a paid model. Every clip is synthetic: a native voice reading a
misspelled word is a cleaner mistake than a learner's half-way sound, so this
narrows what SP-0 has to settle and does not replace it.

Held out on purpose: the threshold is chosen on the voices `mari` and `tambet`
and reported on `kalev` and `liivika`, which it never saw.
"""
import json
import os
import re
import sys
import time
import urllib.request

import numpy as np

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
EXP = os.path.join(ROOT, "experiments")
OUT = os.path.join(ROOT, "verdict")
RATE = 16_000
TTS = "https://api.tartunlp.ai/text-to-speech/v2"
DEV = ("mari", "tambet")
HELD = ("kalev", "liivika")
ROOMS = ("clean", "babble10", "phone")
MODEL = "TalTechNLP/xls-r-300m-et"

os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.dirname(__file__))


def experiments():
    """The sibling script's helpers: its TartuNLP cache, its mistakes, its rooms."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("asr_experiments", os.path.join(os.path.dirname(__file__), "asr-experiments.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


X = experiments()


def letters(text):
    """What the model's vocabulary spells: lower case letters, `|` between words."""
    return "|".join(X.words(text))


# ------------------------------------------------------------------ build

def build():
    rows = []
    for t in X.base_sentences():
        for kind, wrong, ok, bad in X.mistakes(t):
            for v in DEV + HELD:
                rows.append({"text": t, "said": wrong, "kind": kind, "ok": ok, "bad": bad, "voice": v,
                             "right_file": X.tartu(t, v), "wrong_file": X.tartu(wrong, v)})
    print("sentence pairs", len(rows), file=sys.stderr)
    words = []
    corpus = json.load(open(os.path.join(ROOT, "corpus.json")))
    for c in corpus:
        if c["kind"] != "word":
            continue
        for v in DEV + HELD:
            f = c["file"] if v == c["voice"] else X.tartu(c["text"], v)
            words.append({"text": c["text"], "partner": c["partner"], "contrast": c["contrast"], "voice": v, "file": f})
    print("words", len(words), file=sys.stderr)
    others = [X.load(c["file"]) for c in corpus if c["kind"] == "sentence"]
    for room in ROOMS[1:]:
        d = os.path.join(OUT, "rooms", room)
        os.makedirs(d, exist_ok=True)
        for r in rows:
            for key in ("right_file", "wrong_file"):
                target = os.path.join(d, os.path.basename(r[key]))
                if not os.path.exists(target):
                    X.save(target, X.condition(room, X.load(r[key]), others))
        for w in words:
            target = os.path.join(d, "w_" + os.path.basename(w["file"]))
            if not os.path.exists(target):
                X.save(target, X.condition(room, X.load(w["file"]), others))
    json.dump({"sentences": rows, "words": words}, open(os.path.join(OUT, "sets.json"), "w"), ensure_ascii=False)


def room_file(path, room, word=False):
    if room == "clean":
        return path
    return os.path.join(OUT, "rooms", room, ("w_" if word else "") + os.path.basename(path))


# ------------------------------------------------------------------ run

class Model:
    def __init__(self, model_id=MODEL):
        import torch
        from transformers import AutoModelForCTC, AutoProcessor
        torch.set_num_threads(os.cpu_count() or 4)
        self.torch = torch
        self.proc = AutoProcessor.from_pretrained(model_id)
        self.model = AutoModelForCTC.from_pretrained(model_id).eval()
        self.vocab = self.proc.tokenizer.get_vocab()

    def logprobs(self, audio):
        inputs = self.proc(audio, sampling_rate=RATE, return_tensors="pt")
        with self.torch.inference_mode():
            logits = self.model(**inputs).logits[0]
        return self.torch.log_softmax(logits.float(), -1).numpy().astype(np.float16)


def cache_path(path):
    return os.path.join(OUT, "lp", re.sub(r"[^\w]+", "_", path[len(ROOT):])[-150:] + ".npy")


def run():
    sets = json.load(open(os.path.join(OUT, "sets.json")))
    files = []
    for room in ROOMS:  # clean first, so a report can be read before the rooms are done
        for r in sets["sentences"]:
            files += [room_file(r["right_file"], room), room_file(r["wrong_file"], room)]
        files += [room_file(w["file"], room, word=True) for w in sets["words"]]
    files = list(dict.fromkeys(files))
    os.makedirs(os.path.join(OUT, "lp"), exist_ok=True)
    todo = [f for f in files if not os.path.exists(cache_path(f))]
    print(len(files), "clips,", len(todo), "to hear", file=sys.stderr)
    if not todo:
        return
    m = Model()
    t0 = time.time()
    for k, f in enumerate(todo):
        np.save(cache_path(f), m.logprobs(X.load(f)))
        if k % 50 == 0:
            print(k, f"{time.time() - t0:.0f}s", file=sys.stderr, flush=True)


# ------------------------------------------------------------------ scoring

VOCAB = None


def vocab():
    global VOCAB
    if VOCAB is None:
        from huggingface_hub import snapshot_download
        d = snapshot_download(MODEL, allow_patterns=["vocab.json"])
        VOCAB = json.load(open(os.path.join(d, "vocab.json")))
    return VOCAB


def ctc_nll(lp, text):
    """Negative log likelihood of `text` given the frames, CTC with blank 0. Pure numpy."""
    v = vocab()
    ids = [v[ch] for ch in text if ch in v]
    ext = [0]
    for i in ids:
        ext += [i, 0]
    S, T = len(ext), lp.shape[0]
    lp = lp.astype(np.float64)
    alpha = np.full(S, -np.inf)
    alpha[0] = lp[0, ext[0]]
    if S > 1:
        alpha[1] = lp[0, ext[1]]
    skip = np.array([s >= 2 and ext[s] != 0 and ext[s] != ext[s - 2] for s in range(S)])
    for t in range(1, T):
        a1 = np.concatenate([[-np.inf], alpha[:-1]])
        a2 = np.where(skip, np.concatenate([[-np.inf, -np.inf], alpha[:-2]]), -np.inf)
        alpha = np.logaddexp(np.logaddexp(alpha, a1), a2) + lp[t, ext]
    return -np.logaddexp(alpha[-1], alpha[-2] if S > 1 else -np.inf)


def margin(lp, a, b):
    """How much better spelling `b` explains the audio than `a`, in nats. Positive means `b`."""
    return ctc_nll(lp, a) - ctc_nll(lp, b)


def load_lp(path):
    return np.load(cache_path(path)).astype(np.float32)


def scores(room):
    """Every comparison as (voice, kind, margin toward the wrong spelling, truth: was the wrong one said)."""
    sets = json.load(open(os.path.join(OUT, "sets.json")))
    out = []
    for r in sets["sentences"]:
        ok_text, bad_text = letters(r["text"]), letters(r["said"])
        for key, said_wrong in (("right_file", False), ("wrong_file", True)):
            lp = load_lp(room_file(r[key], room))
            out.append({"voice": r["voice"], "kind": r["kind"], "unit": "sentence",
                        "m": margin(lp, ok_text, bad_text), "wrong": said_wrong})
    for w in sets["words"]:
        # Each clip is a correct saying of `text`. Asked as "did they say partner?" it is a right
        # answer (no false alarm wanted); asked as the partner's exercise it is a caught mistake.
        lp = load_lp(room_file(w["file"], room, word=True))
        m = margin(lp, letters(w["partner"]), letters(w["text"]))
        out.append({"voice": w["voice"], "kind": w["contrast"], "unit": "word", "m": -m, "wrong": False})
        out.append({"voice": w["voice"], "kind": w["contrast"], "unit": "word", "m": m, "wrong": True})
    return out


def rates(rows, tau):
    wrong = [r for r in rows if r["wrong"]]
    right = [r for r in rows if not r["wrong"]]
    caught = sum(r["m"] > tau for r in wrong)
    false = sum(r["m"] > tau for r in right)
    return caught, len(wrong), false, len(right)


def ready(room):
    sets = json.load(open(os.path.join(OUT, "sets.json")))
    files = [room_file(r[k], room) for r in sets["sentences"] for k in ("right_file", "wrong_file")]
    files += [room_file(w["file"], room, word=True) for w in sets["words"]]
    return all(os.path.exists(cache_path(f)) for f in files)


def report():
    rooms = [room for room in ROOMS if ready(room)]
    cache = {room: scores(room) for room in rooms}
    dev = [r for room in rooms for r in cache[room] if r["voice"] in DEV]
    # The threshold that keeps false alarms on the development voices at or under 1%, then catches most.
    best = None
    for tau in np.arange(-5, 15, 0.1):
        c, nw, f, nr = rates(dev, tau)
        if f / nr <= 0.01 and (best is None or c > best[1]):
            best = (tau, c)
    tau = best[0]
    print(f"threshold chosen on {', '.join(DEV)}, every room: {tau:.1f} nats\n")
    print(f"{'set':42} {'caught':>14} {'false alarm':>16}")
    for room in rooms:
        for unit in ("sentence", "word"):
            for voices, label in ((DEV, "dev"), (HELD, "held out")):
                rows = [r for r in cache[room] if r["unit"] == unit and r["voice"] in voices]
                c, nw, f, nr = rates(rows, tau)
                print(f"{room + ' ' + unit + ' ' + label:42} {c:4}/{nw:<4} {100 * c / nw:5.1f}% {f:4}/{nr:<4} {100 * f / nr:5.1f}%")
    print("\nheld out, by kind of mistake, every room")
    held = [r for room in rooms for r in cache[room] if r["voice"] in HELD]
    for kind in sorted({r["kind"] for r in held}):
        c, nw, f, nr = rates([r for r in held if r["kind"] == kind], tau)
        print(f"  {kind:40} {c:4}/{nw:<4} {100 * c / nw:5.1f}% {f:4}/{nr:<4} {100 * f / nr:5.1f}%")


# ------------------------------------------------------------------ did they say this word

def free_text(lp):
    """Greedy CTC: what the letters alone say, with no list of words behind them."""
    inv = {i: ch for ch, i in vocab().items()}
    best = lp.argmax(-1)
    out, prev = [], None
    for i in best:
        if i != prev and i != 0:
            out.append(inv.get(int(i), ""))
        prev = i
    return "".join(ch for ch in out if ch == "|" or ch.isalpha()).lower().strip("|")


def edit_ratio(a, b):
    return X.edit(list(a), list(b)) / max(len(a), 1)


def zipformer_heard(room):
    path = os.path.join(OUT, f"zipformer_words_{room}.json")
    if os.path.exists(path):
        return json.load(open(path))
    sets = json.load(open(os.path.join(OUT, "sets.json")))
    z = X.Zipformer()
    out = {w["file"]: z.hear(X.load(room_file(w["file"], room, word=True)), lead=0.5) for w in sets["words"]}
    json.dump(out, open(path, "w"), ensure_ascii=False)
    return out


def say():
    """A clip of word w, checked against: w itself (accept), its contrast partner (near), and
    every other word of the corpus (reject). Two engines: xls-r scoring, and the Zipformer's text."""
    sets = json.load(open(os.path.join(OUT, "sets.json")))
    allwords = sorted({w["text"] for w in sets["words"]})
    for room in ROOMS:
        heard = zipformer_heard(room)
        res = {"x": {"self": [], "near": [], "other": []}, "z": {"self": [], "near": [], "other": []}}
        for w in sets["words"]:
            lp = load_lp(room_file(w["file"], room, word=True))
            free = free_text(lp)
            base = ctc_nll(lp, free) if free else ctc_nll(lp, "a")
            z = " ".join(X.words(heard[w["file"]]["text"])).replace(" ", "")
            for target, bucket in [(w["text"], "self"), (w["partner"], "near")] + [(o, "other") for o in allwords if o not in (w["text"], w["partner"])][::7]:
                gap = (ctc_nll(lp, letters(target)) - base) / max(len(target), 1)
                res["x"][bucket].append(gap)
                res["z"][bucket].append(edit_ratio(target, z))
        for eng, name in (("x", "xls-r, nats a letter over the free reading"), ("z", "Zipformer, edit distance a letter")):
            r = res[eng]
            # The cut-off is the loosest that still rejects 99% of other words.
            other = np.sort(r["other"])
            cut = other[int(len(other) * 0.01)]
            acc = np.mean(np.array(r["self"]) < cut)
            near = np.mean(np.array(r["near"]) < cut)
            print(f"{room:9} {name:44} cut {cut:5.2f}: accept the word {100 * acc:5.1f}%, accept its pair {100 * near:5.1f}%, accept another word 1.0%")


if __name__ == "__main__":
    {"build": build, "run": run, "report": report, "say": say}[sys.argv[1] if len(sys.argv) > 1 else "report"]()
