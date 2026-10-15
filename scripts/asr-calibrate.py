#!/usr/bin/env python3
"""
Five sentences at setup: does tuning the "unsure word" line to one learner beat one line for everybody?

    python3 scripts/asr-calibrate.py run      # every learner's twenty sentences, heard (cached)
    python3 scripts/asr-calibrate.py report

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


def run():
    sets = json.load(open(os.path.join(X.EXP, "sets.json")))
    rows = sets["voices"]
    others = [X.load(c["file"]) for c in json.load(open(os.path.join(ROOT, "corpus.json"))) if c["kind"] == "sentence"]
    z = None
    for room in ROOMS:
        path = os.path.join(OUT, f"{room}.json")
        if os.path.exists(path):
            continue
        z = z or X.Zipformer()
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


if __name__ == "__main__":
    {"run": run, "report": report}[sys.argv[1] if len(sys.argv) > 1 else "report"]()
