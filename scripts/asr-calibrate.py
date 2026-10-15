#!/usr/bin/env python3
"""
Five sentences at setup: does tuning the "unsure word" line to one learner beat one line for everybody?

    python3 scripts/asr-calibrate.py run      # every learner's twenty sentences, heard (cached)
    python3 scripts/asr-calibrate.py report
    python3 scripts/asr-calibrate.py flags    # a better unsure-word signal than one log probability

The Zipformer gives every word a log probability, and docs/39-speech.md marks
a word unsure under -1.0, a line drawn on everybody's speech at once. A
learner with a noisy kitchen or a cheap microphone sits lower on that scale
across the board, so one line flags too much of what they say. Here a
"learner" is one of TartuNLP's ten voices in one of five rooms, fifty in all.
Each reads five sentences first (the calibration) and is then judged on the
other fifteen. Compared:

  global      -1.0 for everybody
  shifted     -1.0 moved by how far this learner's sure words sit from everybody's
  own line    the line that would have been best on this learner's five sentences

Local only; synthetic voices, synthetic rooms. A real learner's accent moves the
scale in ways a room does not, which SP-0 measures.
"""
import importlib.util
import json
import os
import re
import sys

import numpy as np

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
OUT = os.path.join(ROOT, "calibrate")
ROOMS = ("clean", "babble10", "phone", "echo", "white10")
SETUP = 5
GLOBAL = -1.0

spec = importlib.util.spec_from_file_location("asr_experiments", os.path.join(os.path.dirname(__file__), "asr-experiments.py"))
X = importlib.util.module_from_spec(spec)
spec.loader.exec_module(X)
os.makedirs(OUT, exist_ok=True)


def run(prefix="", model=None, method="greedy_search"):
    sets = json.load(open(os.path.join(X.EXP, "sets.json")))
    rows = sets["voices"]
    others = [X.load(c["file"]) for c in json.load(open(os.path.join(ROOT, "corpus.json"))) if c["kind"] == "sentence"]
    z = None
    for room in ROOMS:
        path = os.path.join(OUT, f"{prefix}{room}.json")
        if os.path.exists(path):
            continue
        z = z or X.Zipformer(model or X.LARGE, method=method)
        out = []
        for r in rows:
            a = X.load(r["file"])
            if room != "clean":
                a = X.condition(room, a, others)
            out.append(z.hear(a, lead=0.5))
        json.dump(out, open(path, "w"), ensure_ascii=False)
        print(room, file=sys.stderr, flush=True)


def word_scores(text, heard):
    """Each heard word with its lowest token log probability, and whether the sentence holds it."""
    ref = set(X.words(text))
    out, cur, lo = [], "", 0.0
    for tok, p in zip(heard["tokens"], heard["ys_probs"]):
        if tok.startswith(" ") and cur:
            out.append((lo, re.sub(r"[^\wõäöüšž]", "", cur.lower()) in ref))
            cur, lo = "", 0.0
        cur += tok.strip()
        lo = min(lo, p)
    if cur:
        out.append((lo, re.sub(r"[^\wõäöüšž]", "", cur.lower()) in ref))
    return out


def f1(words, cut):
    flagged = [ok for p, ok in words if p < cut]
    wrong = sum(1 for _, ok in words if not ok)
    caught = sum(1 for ok in flagged if not ok)
    prec = caught / len(flagged) if flagged else 1.0
    rec = caught / wrong if wrong else 1.0
    return (2 * prec * rec / (prec + rec)) if prec + rec else 0.0, caught, len(flagged), wrong


def report():
    rows = json.load(open(os.path.join(X.EXP, "sets.json")))["voices"]
    learners = {}
    for room in ROOMS:
        heard = json.load(open(os.path.join(OUT, f"{room}.json")))
        for r, h in zip(rows, heard):
            learners.setdefault((r["voice"], room), []).append(word_scores(r["text"], h))
    sure_all = [p for ls in learners.values() for s in ls[:SETUP] for p, ok in s if ok]
    pop_median = float(np.median(sure_all))
    totals = {"global": [0, 0, 0], "shifted": [0, 0, 0], "own line": [0, 0, 0]}
    per = []
    for key, sentences in sorted(learners.items()):
        setup = [w for s in sentences[:SETUP] for w in s]
        test = [w for s in sentences[SETUP:] for w in s]
        sure = [p for p, ok in setup if ok]
        shift = (float(np.median(sure)) - pop_median) if sure else 0.0
        own = max(np.arange(-4, 0.01, 0.1), key=lambda c: (f1(setup, c)[0], -abs(c - GLOBAL)))
        for name, cut in (("global", GLOBAL), ("shifted", GLOBAL + shift), ("own line", own)):
            _, caught, flagged, wrong = f1(test, cut)
            totals[name][0] += caught
            totals[name][1] += flagged
            totals[name][2] += wrong
        per.append((key, shift))
    print(f"{len(learners)} learners, {SETUP} setup sentences each, judged on the rest\n")
    for name, (caught, flagged, wrong) in totals.items():
        prec = caught / flagged if flagged else 1
        rec = caught / wrong if wrong else 1
        print(f"  {name:9} flags {flagged:4}, catches {caught:4} of {wrong} wrong words: precision {100 * prec:5.1f}%, recall {100 * rec:5.1f}%, F1 {200 * prec * rec / (prec + rec):5.1f}")
    print("\nhow far each room moves a learner's sure words (median log probability against everybody's)")
    for room in ROOMS:
        shifts = [s for (v, r), s in per if r == room]
        print(f"  {room:9} {np.mean(shifts):+.2f}")


# ------------------------------------------------------------------ a better unsure-word signal

def word_features(text, heard, forms):
    """Per heard word: lowest and mean token log probability, token count, letters, and whether
    the forms list (prisma/data/forms, the accept side of ADR-005) holds the spelling at all."""
    ref = set(X.words(text))
    out, cur, ps = [], "", []

    def close():
        w = re.sub(r"[^\wõäöüšž]", "", cur.lower())
        if w:
            out.append({"w": w, "min": min(ps), "mean": float(np.mean(ps)), "n": len(ps), "len": len(w),
                        "real": w in forms, "ok": w in ref})

    for tok, p in zip(heard["tokens"], heard["ys_probs"]):
        if tok.startswith(" ") and cur:
            close()
            cur, ps = "", []
        cur += tok.strip()
        ps.append(p)
    if cur:
        close()
    return out


def flags():
    """Train on five voices, judge on the other five, every room. A rule a phone can run in microseconds."""
    rows = json.load(open(os.path.join(X.EXP, "sets.json")))["voices"]
    forms = X.forms()
    data = []
    for room in ROOMS:
        heard = json.load(open(os.path.join(OUT, f"{room}.json")))
        small_path = os.path.join(OUT, f"small_{room}.json")
        small = json.load(open(small_path)) if os.path.exists(small_path) else [None] * len(heard)
        beam_path = os.path.join(OUT, f"beam_{room}.json")
        beam = json.load(open(beam_path)) if os.path.exists(beam_path) else [None] * len(heard)
        for r, h, s, b in zip(rows, heard, small, beam):
            second = set(X.words(s["text"])) if s else None
            other_way = set(X.words(b["text"])) if b else None
            for f in word_features(r["text"], h, forms):
                f["voice"] = r["voice"]
                f["agree"] = second is None or f["w"] in second
                f["beam"] = other_way is None or f["w"] in other_way
                data.append(f)
    train_voices = set(X.VOICES[::2])
    train = [d for d in data if d["voice"] in train_voices]
    test = [d for d in data if d["voice"] not in train_voices]

    def judge(name, rule):
        flagged = [d for d in test if rule(d)]
        caught = sum(1 for d in flagged if not d["ok"])
        wrong = sum(1 for d in test if not d["ok"])
        prec = caught / len(flagged) if flagged else 1
        rec = caught / wrong if wrong else 1
        f = 2 * prec * rec / (prec + rec) if prec + rec else 0
        print(f"  {name:44} flags {len(flagged):4}, catches {caught:4} of {wrong}: precision {100 * prec:5.1f}%, recall {100 * rec:5.1f}%, F1 {100 * f:5.1f}")

    def feats(d):
        return [d["min"], d["mean"], np.log(d["n"]), np.log(d["len"]), 0.0 if d["real"] else 1.0,
                0.0 if d["agree"] else 1.0, 0.0 if d["beam"] else 1.0, 1.0]

    # Logistic regression by plain gradient descent: six weights, nothing to ship but the weights.
    A = np.array([feats(d) for d in train])
    y = np.array([0.0 if d["ok"] else 1.0 for d in train])
    w = np.zeros(A.shape[1])
    for _ in range(4000):
        p = 1 / (1 + np.exp(-A @ w))
        w -= 0.05 * (A.T @ (p - y) / len(y) + 1e-3 * w)
    print(f"{len(test)} heard words on the held-out voices, {sum(1 for d in test if not d['ok'])} of them wrong\n")
    judge("lowest log probability under -1.0", lambda d: d["min"] < -1.0)
    judge("not a word the forms list holds", lambda d: not d["real"])
    judge("either of those", lambda d: d["min"] < -1.0 or not d["real"])
    judge("the small model heard something else", lambda d: not d["agree"])
    judge("not a word, or the small model disagrees", lambda d: not d["real"] or not d["agree"])
    judge("small disagrees and lowest under -0.5", lambda d: not d["agree"] and d["min"] < -0.5)
    judge("small disagrees or lowest under -2.0", lambda d: not d["agree"] or d["min"] < -2.0)
    judge("beam search on the large model disagrees", lambda d: not d["beam"])
    judge("beam disagrees and lowest under -0.5", lambda d: not d["beam"] and d["min"] < -0.5)
    print("\n  two tiers a phone can run with one model, and with the small one beside it")
    judge("sure: not a word, or beam disagrees", lambda d: not d["real"] or not d["beam"])
    judge("maybe: lowest under -1.0, not already sure", lambda d: d["real"] and d["beam"] and d["min"] < -1.0)
    judge("sure or maybe, one model", lambda d: not d["real"] or not d["beam"] or d["min"] < -1.0)
    judge("maybe with the small model: small disagrees, not sure", lambda d: d["real"] and d["beam"] and not d["agree"])
    judge("sure or maybe, two models", lambda d: not d["real"] or not d["beam"] or not d["agree"])
    for cut in (0.3, 0.4, 0.5):
        judge(f"combined weights, chance over {cut}", lambda d, c=cut: 1 / (1 + np.exp(-np.dot(feats(d), w))) > c)
    print("\n  weights (min, mean, log tokens, log letters, not a word, small disagrees, beam disagrees, bias):", " ".join(f"{x:+.2f}" for x in w))


if __name__ == "__main__":
    {"run": run, "small": lambda: run("small_", "TalTechNLP/streaming-zipformer.et-en"),
     "beam": lambda: run("beam_", X.LARGE, "modified_beam_search"),
     "report": report, "flags": flags}[sys.argv[1] if len(sys.argv) > 1 else "report"]()
