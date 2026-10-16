#!/usr/bin/env python3
"""
Teach TalTech's xls-r to write down what was said, mistakes included, on a CPU.

    python3 scripts/asr-finetune.py data     # training clips, TartuNLP voices (free, cached)
    python3 scripts/asr-finetune.py train    # fine-tune the top layers (hours on four cores)
    python3 scripts/asr-finetune.py eval     # before and after, on voices and sentences it never saw
    python3 scripts/asr-finetune.py verdict  # the minimal-pair verdict of asr-verdict.py, on the tuned model

The Zipformer cannot be trained here: TalTech publish it as ONNX only, and a
fine-tune needs their PyTorch checkpoint and Icefall recipe (docs/39-speech.md
section 9). xls-r is published as PyTorch, so it is the model this recipe can
move, and it is the one SP-6 would use.

What it is taught:

  FAITHFUL   a sentence said with a learner's mistake (a long sound short, a
             stop voiced, an õ said as o, an h dropped) is labelled with the
             misspelling, so the model learns to stop correcting
  ROBUST     half the clips go through a room (babble, phone line, echo,
             white noise) on the way in, so the room is not what it learns

Held out on purpose: no test sentence and no test voice is in training. The
test voices are the four `scripts/asr-verdict.py` uses; the test sentences are
the corpus's own. This is the recipe SP-9's real recordings drop into: the
`data` step is the only part that changes.

Local only, synthetic voices: what it shows is whether the recipe moves the
model in the right direction without breaking it, not how a learner's accent
will be heard.
"""
import importlib.util
import json
import os
import random
import re
import sys
import time

import numpy as np

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
OUT = os.path.join(ROOT, "finetune")
TRAIN_VOICES = ("vesta", "peeter", "albert", "indrek", "meelis", "kylli")
SENTENCES = 300
MODEL = "TalTechNLP/xls-r-300m-et"

spec = importlib.util.spec_from_file_location("asr_experiments", os.path.join(os.path.dirname(__file__), "asr-experiments.py"))
X = importlib.util.module_from_spec(spec)
spec.loader.exec_module(X)
RATE = X.RATE
os.makedirs(OUT, exist_ok=True)


# ------------------------------------------------------------------ mistakes, anywhere in a sentence

def change(kind, w):
    if kind == "length" and re.search(r"([a-zõäöü])\1", w):
        return re.sub(r"(.)\1", r"\1", w, count=1)
    if kind == "voicing":
        spots = [k for k, ch in enumerate(w) if k > 0 and ch in "bdgptk"]
        if spots:
            k = spots[0]
            ch = w[k]
            return w[:k] + X.VOICE.get(ch, X.DEVOICE.get(ch, ch)) + w[k + 1:]
    if kind == "vowel":
        for ch in w:
            if ch in X.VOWELS:
                return w.replace(ch, X.VOWELS[ch], 1)
    if kind == "h-drop" and w.startswith("h") and len(w) > 3:
        return w[1:]
    return None


def with_mistake(sentence, kind, rng):
    toks = sentence.split()
    spots = []
    for i, tok in enumerate(toks):
        core = re.sub(r"[^\wõäöüšž]", "", tok).lower()
        if len(core) >= 3 and change(kind, core):
            spots.append(i)
    if not spots:
        return None
    i = rng.choice(spots)
    core = re.sub(r"[^\wõäöüšž]", "", toks[i]).lower()
    bad = change(kind, core)
    toks[i] = toks[i].lower().replace(core, bad)
    return " ".join(toks)


# ------------------------------------------------------------------ data

def pick_sentences():
    """Attested sentences with an English line, short, plain, and none of the test corpus."""
    test = set(X.base_sentences())
    pool = json.load(open(os.path.join("prisma", "data", "example-english.json")))
    rows = [k for k in pool if 4 <= len(k.split()) <= 9 and k not in test
            and not re.search(r"[0-9/()\[\]…\"“”„«»:;\u2013\u2014]|\.\.", k) and k[:1].isupper()]
    rng = random.Random(39)
    rng.shuffle(rows)
    return rows[:SENTENCES]


def data():
    rng = random.Random(7)
    rows = []
    sentences = pick_sentences()
    for i, t in enumerate(sentences):
        voice = TRAIN_VOICES[i % len(TRAIN_VOICES)]
        rows.append({"label": t, "said_right": True, "voice": voice, "file": X.tartu(t, voice)})
        for kind in ("length", "voicing", "vowel", "h-drop"):
            wrong = with_mistake(t, kind, rng)
            if wrong:
                v2 = TRAIN_VOICES[(i + 1 + len(rows)) % len(TRAIN_VOICES)]
                rows.append({"label": wrong, "said_right": False, "kind": kind, "voice": v2, "file": X.tartu(wrong, v2)})
        if i % 20 == 0:
            print(i, len(rows), file=sys.stderr, flush=True)
    json.dump(rows, open(os.path.join(OUT, "train.json"), "w"), ensure_ascii=False)
    print(len(rows), "training clips from", len(sentences), "sentences", file=sys.stderr)


# ------------------------------------------------------------------ train

ROOMS = ("babble10", "phone", "echo", "white10")


def train(steps=800, batch=4, lr=3e-5, unfrozen=8, every=100):
    """Resumable: the trainable weights and the optimizer are saved every `every` steps, and a run
    started again picks up there. Each step draws its batch from a generator seeded by the step, so
    a resumed run sees the same batches an unbroken one would."""
    import torch
    from transformers import AutoModelForCTC, AutoProcessor
    torch.set_num_threads(os.cpu_count() or 4)
    torch.manual_seed(0)
    rows = json.load(open(os.path.join(OUT, "train.json")))
    proc = AutoProcessor.from_pretrained(MODEL)
    model = AutoModelForCTC.from_pretrained(MODEL, ctc_loss_reduction="mean")
    model.freeze_feature_encoder()
    layers = model.wav2vec2.encoder.layers
    for p in model.parameters():
        p.requires_grad = False
    for layer in layers[-unfrozen:]:
        for p in layer.parameters():
            p.requires_grad = True
    for p in model.lm_head.parameters():
        p.requires_grad = True
    model.train()
    trainable = [p for p in model.parameters() if p.requires_grad]
    names = [n for n, p in model.named_parameters() if p.requires_grad]
    opt = torch.optim.AdamW(trainable, lr=lr)
    ckpt = os.path.join(OUT, "checkpoint.pt")
    start = 0
    if os.path.exists(ckpt):
        state = torch.load(ckpt, weights_only=False)
        params = dict(model.named_parameters())
        with torch.no_grad():
            for n in names:
                params[n].copy_(state["weights"][n])
        opt.load_state_dict(state["optimizer"])
        start = state["step"]
        print(f"resumed at step {start}", file=sys.stderr, flush=True)
    others = [X.load(c["file"]) for c in json.load(open(os.path.join(ROOT, "corpus.json"))) if c["kind"] == "sentence"]
    audio = {r["file"]: X.load(r["file"]) for r in rows}
    vocab = proc.tokenizer.get_vocab()
    t0 = time.time()
    for step in range(start, steps):
        rng = random.Random(1000 + step)
        sample = rng.sample(rows, batch)
        waves, labels = [], []
        for r in sample:
            a = audio[r["file"]]
            if rng.random() < 0.5:
                a = X.condition(rng.choice(ROOMS), a, others)
            waves.append(a)
            labels.append([vocab[ch] for ch in "|".join(X.words(r["label"])) if ch in vocab])
        inputs = proc(waves, sampling_rate=RATE, return_tensors="pt", padding=True)
        width = max(len(l) for l in labels)
        lab = torch.full((batch, width), -100, dtype=torch.long)
        for k, l in enumerate(labels):
            lab[k, : len(l)] = torch.tensor(l)
        loss = model(input_values=inputs.input_values, attention_mask=inputs.get("attention_mask"), labels=lab).loss
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        for g in opt.param_groups:
            g["lr"] = lr * min(1.0, (step + 1) / 100)
        opt.step()
        opt.zero_grad()
        if step % 25 == 0:
            print(f"step {step} loss {loss.item():.3f} {time.time() - t0:.0f}s", file=sys.stderr, flush=True)
        if (step + 1) % every == 0 and step + 1 < steps:
            params = dict(model.named_parameters())
            tmp = ckpt + ".tmp"
            torch.save({"step": step + 1, "weights": {n: params[n].detach() for n in names},
                        "optimizer": opt.state_dict()}, tmp)
            os.replace(tmp, ckpt)
            print(f"checkpoint at step {step + 1}", file=sys.stderr, flush=True)
    model.save_pretrained(os.path.join(OUT, "model"))
    proc.save_pretrained(os.path.join(OUT, "model"))
    if os.path.exists(ckpt):
        os.remove(ckpt)
    print("saved", file=sys.stderr)


# ------------------------------------------------------------------ eval

def evaluate():
    """The same questions round two asked, before and after: plain accuracy, and the mistakes written as said."""
    import torch
    from transformers import AutoModelForCTC, AutoProcessor
    torch.set_num_threads(os.cpu_count() or 4)
    sets = json.load(open(os.path.join(ROOT, "verdict", "sets.json")))["sentences"]
    held = [r for r in sets if r["voice"] in ("kalev", "liivika")]
    clean = {(r["text"], r["voice"]): r["right_file"] for r in held}
    for name, mid in (("before", MODEL), ("after", os.path.join(OUT, "model"))):
        path = os.path.join(OUT, f"eval_{name}.json")
        if not os.path.exists(path):
            proc = AutoProcessor.from_pretrained(mid)
            model = AutoModelForCTC.from_pretrained(mid).eval()

            def hear(f):
                inputs = proc(X.load(f), sampling_rate=RATE, return_tensors="pt")
                with torch.inference_mode():
                    return proc.batch_decode(model(**inputs).logits.argmax(-1))[0]
            out = {"right": {f"{t}|{v}": hear(f) for (t, v), f in clean.items()},
                   "wrong": [hear(r["wrong_file"]) for r in held]}
            json.dump(out, open(path, "w"), ensure_ascii=False)
        out = json.load(open(path))
        w = X.wer([(t, out["right"][f"{t}|{v}"]) for (t, v) in clean])
        stats = {}
        for r, h in zip(held, out["wrong"]):
            hw = X.words(h)
            s = stats.setdefault(r["kind"], [0, 0, 0])
            s[0] += r["bad"] in hw
            s[1] += r["ok"] in hw
            s[2] += 1
        print(f"{name:7} sentences said right, word errors {w:5.1f}%")
        for kind, (bad, ok, n) in sorted(stats.items()):
            print(f"        {kind:8} wrote the mistake {bad:3}/{n}, corrected it {ok:3}/{n}")


def verdict():
    """The single-word forced choice of scripts/asr-verdict.py, held-out voices, clean and babble, before and after."""
    import torch
    from transformers import AutoModelForCTC, AutoProcessor
    torch.set_num_threads(os.cpu_count() or 4)
    spec = importlib.util.spec_from_file_location("asr_verdict", os.path.join(os.path.dirname(__file__), "asr-verdict.py"))
    V = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(V)
    sets = json.load(open(os.path.join(V.OUT, "sets.json")))
    refs = json.load(open(os.path.join(V.OUT, "refs.json")))
    words = [w for w in sets["words"] if w["voice"] in V.HELD]
    mid = os.path.join(OUT, "model")
    proc = AutoProcessor.from_pretrained(mid)
    model = AutoModelForCTC.from_pretrained(mid).eval()
    cache = os.path.join(OUT, "lp")
    os.makedirs(cache, exist_ok=True)

    def lp(path):
        f = os.path.join(cache, os.path.basename(V.cache_path(path)))
        if not os.path.exists(f):
            inputs = proc(X.load(path), sampling_rate=RATE, return_tensors="pt")
            with torch.inference_mode():
                out = torch.log_softmax(model(**inputs).logits[0].float(), -1).numpy().astype(np.float16)
            np.save(f, out)
        return np.load(f).astype(np.float32)

    for room in ("clean", "babble10"):
        for name, load in (("before", V.load_lp), ("after", lp)):
            rows = []
            for w in words:
                a, b = V.letters(w["text"]), V.letters(w["partner"])
                ra = np.mean([V.margin(load(f), a, b) for f in refs["words"][w["text"]].values()])
                rb = np.mean([V.margin(load(f), a, b) for f in refs["words"][w["partner"]].values()])
                if abs(rb - ra) < V.SEPARATION:
                    continue
                m = V.margin(load(V.room_file(w["file"], room, word=True)), a, b)
                rows.append(((m - ra) / (rb - ra), (m - rb) / (ra - rb)))
            n = len(rows)
            caught = sum(x[1] > 0.65 for x in rows)
            false = sum(x[0] > 0.65 for x in rows)
            again = sum(0.35 <= x[0] <= 0.65 for x in rows) + sum(0.35 <= x[1] <= 0.65 for x in rows)
            print(f"{room:9} {name:7} words {n}: caught {100 * caught / n:5.1f}%  false alarm {100 * false / n:4.1f}%  asked again {100 * again / (2 * n):4.1f}%", flush=True)


if __name__ == "__main__":
    {"data": data, "train": train, "eval": evaluate, "verdict": verdict}[sys.argv[1] if len(sys.argv) > 1 else "eval"]()
