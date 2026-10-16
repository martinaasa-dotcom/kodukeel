#!/usr/bin/env python3
"""
TalTech's trainable Zipformer: decode it, fine-tune it on a CPU, and export what Kodukeel ships.

The model docs/39-speech.md section 3.8 chose (D1), rebuilt from nothing:

    python3 scripts/asr-finetune.py data                   # the synthetic clips, said right and with mistakes
    python3 scripts/asr-icefall.py anchor                  # real TalTech segments to train beside them
    python3 scripts/asr-icefall.py train-anchored          # half of every batch real speech (resumable)
    ICEFALL=<icefall checkout> CHUNK=32 python3 scripts/asr-icefall.py export anchored
    python3 scripts/asr-eval.py hear dev                   # the held-out comparison of section 3.8

Also here, as the record of what was tried:

    python3 scripts/asr-icefall.py eval before|after|anchored|anchored-c32-onnx
    python3 scripts/asr-icefall.py train                   # synthetic only: it forgets real speech
    ICEFALL=... CHUNK=32 python3 scripts/asr-icefall.py student   # half the layers: far worse, dropped
    python3 scripts/asr-icefall.py verdict anchored        # the pair verdict on the synthetic sets
    python3 scripts/asr-icefall.py report

TalTech publish their large Zipformer as ONNX only, so it cannot be trained.
`TalTechNLP/icefall_pruned_transducer_stateless7_streaming_et` is the same
architecture, smaller and older (about 800 hours of transcribed speech and
2,500 of TV transcribed automatically, CC BY-SA 4.0), published as an Icefall
TorchScript file with the training branch still inside it: `cpu_jit.pt` holds
the encoder, the stateless decoder, the joiner and both projections, and the
encoder still draws a random chunk size when it is put in training mode.

What is measured is what `scripts/asr-finetune.py eval` measures, on the same
held-out voices (kalev and liivika) and the same sentences:

  right      word errors on sentences said correctly
  faithful   a sentence said with a learner's mistake: did the model write
             the mistake (`adress`) or correct it back (`aadress`)?

Decoding is greedy, which is what a phone runs. Features are 80 log mel bins,
Kaldi's, with no dither and no edge snipping, which is the Lhotse front end the
model was trained on. Local only, synthetic voices.
"""
import glob
import importlib.util
import json
import os
import random
import re
import sys
import time

import numpy as np

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
OUT = os.path.join(ROOT, "icefall")
SNAP = (glob.glob(os.path.expanduser(
    "~/.cache/huggingface/hub/models--TalTechNLP--icefall_pruned_transducer_stateless7_streaming_et/snapshots/*/")) or [""])[0]
HELD = ("kalev", "liivika")
ROOMS = ("babble10", "phone", "echo", "white10")
LOG_EPS = -23.0259  # what Lhotse pads a feature matrix with
REAL = 200          # real segments read before and after

spec = importlib.util.spec_from_file_location("asr_experiments", os.path.join(os.path.dirname(__file__), "asr-experiments.py"))
X = importlib.util.module_from_spec(spec)
spec.loader.exec_module(X)
RATE = X.RATE
os.makedirs(OUT, exist_ok=True)


def model_and_pieces(path=None):
    import sentencepiece as spm
    import torch
    m = torch.jit.load(path or os.path.join(SNAP, "exp", "1d", "cpu_jit.pt"), map_location="cpu")
    sp = spm.SentencePieceProcessor(model_file=os.path.join(SNAP, "data", "lang_bpe_1000", "bpe.model"))
    return m, sp


def fbank(audio):
    import torch
    import torchaudio.compliance.kaldi as K
    x = torch.from_numpy(np.asarray(audio, dtype=np.float32)).unsqueeze(0)
    return K.fbank(x, num_mel_bins=80, dither=0.0, snip_edges=False, sample_frequency=RATE, high_freq=-400)


def label(text):
    """The way the model writes: lower case, a punctuation mark as a word of its own."""
    t = re.sub(r"([.,!?;:])", r" \1 ", text.lower())
    return " ".join(t.split())


def greedy(m, sp, audio, lead=0.3, tail=0.8):
    """One symbol at most three times per frame, the way Icefall's greedy search runs."""
    import torch
    pad = np.zeros(int(RATE * lead), dtype=np.float32)
    end = np.zeros(int(RATE * tail), dtype=np.float32)
    f = fbank(np.concatenate([pad, audio, end]))
    with torch.inference_mode():
        enc, _ = m.encoder(f.unsqueeze(0), torch.tensor([f.shape[0]]))
        enc = m.joiner.encoder_proj(enc)
        hyp = [0, 0]
        dout = m.joiner.decoder_proj(m.decoder(torch.tensor([hyp[-2:]]), need_pad=False)).squeeze(1)
        for t in range(enc.shape[1]):
            for _ in range(3):
                k = int(m.joiner(enc[:, t], dout, project_input=False).argmax(-1))
                if k == 0:
                    break
                hyp.append(k)
                dout = m.joiner.decoder_proj(m.decoder(torch.tensor([hyp[-2:]]), need_pad=False)).squeeze(1)
    return sp.decode(hyp[2:])


def held():
    sets = json.load(open(os.path.join(ROOT, "verdict", "sets.json")))["sentences"]
    return [r for r in sets if r["voice"] in HELD]


def evaluate(name):
    import torch
    torch.set_num_threads(os.cpu_count() or 4)
    rows = held()
    path = os.path.join(OUT, f"eval_{name}.json")
    out = json.load(open(path)) if os.path.exists(path) else {}
    if name == "large" or name.endswith("-onnx"):
        # The large model, or one of ours as exported: the int8 files sherpa-onnx runs on a device.
        if name == "large":
            z = X.Zipformer(X.LARGE)
        else:
            import sherpa_onnx
            d = os.path.join(OUT, "onnx-" + name[: -len("-onnx")])
            z = X.Zipformer.__new__(X.Zipformer)
            z.r = sherpa_onnx.OnlineRecognizer.from_transducer(
                tokens=f"{d}/tokens.txt", encoder=f"{d}/encoder.int8.onnx", decoder=f"{d}/decoder.onnx",
                joiner=f"{d}/joiner.int8.onnx", num_threads=os.cpu_count() or 4, sample_rate=RATE,
                feature_dim=80, decoding_method="greedy_search")
        hear = lambda f: z.hear(X.load(f), lead=0.5)["text"]
    else:
        m, sp = model_and_pieces(None if name == "before" else os.path.join(OUT, f"{name}.pt"))
        m.eval()
        hear = lambda f: greedy(m, sp, X.load(f))
    others = [X.load(c["file"]) for c in json.load(open(os.path.join(ROOT, "corpus.json"))) if c["kind"] == "sentence"]
    for r in rows:
        for which in ("right_file", "wrong_file"):
            key = r[which]
            if key not in out:
                out[key] = hear(key)
            noisy = "babble10|" + key
            if which == "right_file" and noisy not in out:
                if name == "large" or name.endswith("-onnx"):
                    out[noisy] = z.hear(X.condition("babble10", X.load(key), others), lead=0.5)["text"]
                else:
                    out[noisy] = greedy(m, sp, X.condition("babble10", X.load(key), others))
        json.dump(out, open(path, "w"), ensure_ascii=False)
    # Real speech, which no step of the recipe has seen: TalTech's own interviews, talk shows, news and
    # Riigikogu (scripts/asr-hesitations.py picks them), so a fine-tune that forgets shows up here.
    real = os.path.join(ROOT, "taltech", "hesitations", "sets.json")
    for r in (json.load(open(real)) if os.path.exists(real) else [])[:REAL]:
        key = "real|" + r["file"]
        if key not in out:
            out[key] = z.hear(X.load(r["file"]), lead=0.5)["text"] if (name == "large" or name.endswith("-onnx")) else greedy(m, sp, X.load(r["file"]))
    json.dump(out, open(path, "w"), ensure_ascii=False)
    print(name, len(out), file=sys.stderr)

ANCHOR = int(os.environ.get("ANCHOR", "1200"))  # 3600 for the stronger run


def anchor():
    """Real native speech to train beside the synthetic clips, so the model keeps what it knew.

    Segments out of the TalTech corpus by the same byte-range reading `scripts/asr-hesitations.py`
    does, from recordings none of the 200 real test segments come from (no speaker, no programme
    and no session is on both sides). The label is the hand transcript with sclite's brackets taken
    off: a bracketed word was said, so it is what the model should write."""
    spec = importlib.util.spec_from_file_location("asr_hesitations", os.path.join(os.path.dirname(__file__), "asr-hesitations.py"))
    H = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(H)
    test = {r["source"] for r in json.load(open(os.path.join(ROOT, "taltech", "hesitations", "sets.json")))[:REAL]}
    index = json.load(open(os.path.join(ROOT, "taltech", "index.json")))["members"]
    where = {n: (o, sz) for n, o, sz in index}
    audio = [n for n in where if n.startswith("train/audio/") and n.endswith(".wav") and n not in test]
    rng = random.Random(40)
    rng.shuffle(audio)
    d = os.path.join(OUT, "anchor")
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, "rows.json")
    rows = json.load(open(path)) if os.path.exists(path) else []
    done = {r["source"] for r in rows}
    for name in audio:
        if len(rows) >= ANCHOR:
            break
        if name in done:
            continue
        stm = name.replace("train/audio/", "train/transcriptions/stm/")[:-4] + ".stm"
        if stm not in where:
            continue
        segs = []
        for line in H.fetch(*where[stm]).decode("utf-8", "replace").splitlines():
            parts = line.split(None, 6)
            if line.startswith(";;") or len(parts) < 7 or parts[2] == "inter_segment_gap":
                continue
            start, end = float(parts[3]), float(parts[4])
            text = re.sub(r"^<[^>]*>\s*", "", parts[6]).strip()
            if 2.0 <= end - start <= 8.0 and len(text.split()) >= 3 and not re.search(r"\d", text):
                segs.append((start, end, text.replace("(", "").replace(")", "")))
        if not segs:
            continue
        try:
            (rate, ch, bits), data = H.wav_layout(where[name][0])
        except (AssertionError, ValueError):
            continue
        width = ch * bits // 8
        for start, end, text in rng.sample(segs, min(8, len(segs))):
            raw = H.fetch(data + int(start * rate) * width, int((end - start) * rate) * width)
            a = np.frombuffer(raw, dtype="<i2" if bits == 16 else "<i4").astype(np.float32)
            a = a.reshape(-1, ch).mean(axis=1) / (2 ** (bits - 1))
            if rate != RATE:
                import librosa
                a = librosa.resample(a, orig_sr=rate, target_sr=RATE)
            f = os.path.join(d, f"{os.path.basename(name)[:-4]}_{start:.2f}.wav")
            X.save(f, a)
            rows.append({"label": text, "file": f, "source": name})
        json.dump(rows, open(path, "w"), ensure_ascii=False)
        print(len(rows), file=sys.stderr, flush=True)


def train(name="after", steps=600, batch=4, lr=2e-5, every=50, anchored=0):
    """The asr-finetune.py data and rooms, a transducer loss in place of CTC, every weight trainable.

    Resumable like the xls-r run: weights and optimizer saved every `every` steps, the batch of a
    step drawn from a generator seeded by the step."""
    import torch
    import torchaudio.functional as F
    torch.set_num_threads(os.cpu_count() or 4)
    torch.manual_seed(0)
    m, sp = model_and_pieces()
    rows = json.load(open(os.path.join(ROOT, "finetune", "train.json")))
    params = [p for p in m.parameters()]
    for p in params:
        p.requires_grad = True
    opt = torch.optim.AdamW(params, lr=lr, weight_decay=0.0)
    ckpt = os.path.join(OUT, f"checkpoint-{name}.pt")
    real = json.load(open(os.path.join(OUT, "anchor", "rows.json"))) if anchored else []
    start = 0
    if os.path.exists(ckpt):
        state = torch.load(ckpt, weights_only=False)
        m.load_state_dict(state["weights"])
        opt.load_state_dict(state["optimizer"])
        start = state["step"]
        print(f"resumed at step {start}", file=sys.stderr, flush=True)
    others = [X.load(c["file"]) for c in json.load(open(os.path.join(ROOT, "corpus.json"))) if c["kind"] == "sentence"]
    audio = {r["file"]: X.load(r["file"]) for r in rows + real}
    m.train()
    t0 = time.time()
    for step in range(start, steps):
        rng = random.Random(1000 + step)
        sample = rng.sample(rows, batch - anchored) + rng.sample(real, anchored)
        feats, ys = [], []
        for k, r in enumerate(sample):
            a = audio[r["file"]]
            if k < batch - anchored and rng.random() < 0.5:
                a = X.condition(rng.choice(ROOMS), a, others)
            a = np.concatenate([np.zeros(int(RATE * 0.3), np.float32), a, np.zeros(int(RATE * 0.5), np.float32)])
            feats.append(fbank(a))
            ys.append(sp.encode(label(r["label"])))
        lens = torch.tensor([f.shape[0] for f in feats])
        x = torch.full((batch, int(lens.max()), 80), LOG_EPS)
        for k, f in enumerate(feats):
            x[k, : f.shape[0]] = f
        enc, enc_lens = m.encoder(x, lens)
        u = max(len(y) for y in ys)
        y = torch.zeros((batch, u), dtype=torch.long)
        for k, t in enumerate(ys):
            y[k, : len(t)] = torch.tensor(t)
        sos = torch.cat([torch.zeros((batch, 1), dtype=torch.long), y], dim=1)
        dec = m.decoder(sos, need_pad=True)
        logits = m.joiner.output_linear(torch.tanh(
            m.joiner.encoder_proj(enc).unsqueeze(2) + m.joiner.decoder_proj(dec).unsqueeze(1)))
        loss = F.rnnt_loss(logits, y.int(), enc_lens.int(), torch.tensor([len(t) for t in ys], dtype=torch.int32),
                           blank=0, reduction="mean")
        loss.backward()
        torch.nn.utils.clip_grad_norm_(params, 5.0)
        for g in opt.param_groups:
            g["lr"] = lr * min(1.0, (step + 1) / 50)
        opt.step()
        opt.zero_grad()
        if step % 10 == 0:
            print(f"step {step} loss {loss.item():.3f} {time.time() - t0:.0f}s", file=sys.stderr, flush=True)
        if (step + 1) % every == 0 and step + 1 < steps:
            tmp = ckpt + ".tmp"
            torch.save({"step": step + 1, "weights": m.state_dict(), "optimizer": opt.state_dict()}, tmp)
            os.replace(tmp, ckpt)
            print(f"checkpoint at step {step + 1}", file=sys.stderr, flush=True)
    m.eval()
    m.save(os.path.join(OUT, f"{name}.pt"))
    if os.path.exists(ckpt):
        os.remove(ckpt)
    print("saved", file=sys.stderr)


def _recipe():
    """Icefall's own recipe modules, from a checkout named by ICEFALL, with the parts it imports and
    an export does not need (k2, lhotse, the training loop) stood in for. The four functions
    `icefall.utils` is asked for are read out of the checkout's own source, not rewritten."""
    import ast
    import types
    root = os.environ.get("ICEFALL") or os.path.expanduser("~/icefall")
    recipe = os.path.join(root, "egs", "librispeech", "ASR", "pruned_transducer_stateless7_streaming")
    assert os.path.isdir(recipe), f"set ICEFALL to a checkout of k2-fsa/icefall (no {recipe})"

    class Stub(types.ModuleType):
        def __getattr__(self, name):
            if name.startswith("__"):
                raise AttributeError(name)
            return Stub(name)

        def __call__(self, *a, **k):
            return Stub("call")
    for name in ("k2", "k2.version", "lhotse", "kaldialign", "train", "icefall.checkpoint"):
        sys.modules.setdefault(name, Stub(name))
    src = open(os.path.join(root, "icefall", "utils.py")).read()
    wanted = {"torch_autocast", "make_pad_mask", "subsequent_chunk_mask", "get_onnx_export_kwargs",
              "str2bool", "add_sos"}
    tree = ast.parse(src)
    keep = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in wanted]
    utils = Stub("icefall.utils")
    utils.__dict__.update({"torch": __import__("torch"), "contextlib": __import__("contextlib"),
                           "argparse": __import__("argparse"), "contextmanager": __import__("contextlib").contextmanager,
                           "version": __import__("packaging.version", fromlist=["version"]), "Optional": None, "Union": None, "Any": None,
                           "List": list, "Stub": Stub})
    utils.TORCH_VERSION = utils.version.parse(utils.torch.__version__)
    for n in keep:
        n.returns = None
        for a in n.args.args + n.args.kwonlyargs:
            a.annotation = None
    exec(compile(ast.Module(body=keep, type_ignores=[]), "icefall/utils.py", "exec"), utils.__dict__)
    utils.add_sos = getattr(utils, "add_sos", Stub("add_sos"))
    pkg = types.ModuleType("icefall")
    pkg.utils = utils
    sys.modules["icefall"] = pkg
    sys.modules["icefall.utils"] = utils
    sys.path.insert(0, recipe)
    return recipe


FULL = (2, 4, 3, 2, 4)          # encoder layers per stack, as TalTech trained it
KEEP = {(1, 2, 2, 1, 2): ((1,), (1, 3), (0, 2), (1,), (1, 3))}  # which teacher layers a student starts from


def eager(name="before", layers=FULL, chunk=16):
    """The model as Icefall's own Python modules, weights loaded: from TalTech's TorchScript file or a
    fine-tune of it (`name`), or from a student's saved state (`student*`). A student keeps every other
    layer of each stack (`KEEP`), so it starts from the teacher's own weights rather than from nothing.

    TalTech's file was scripted after Icefall's inference conversion (balancers and whitening gone,
    each norm's learned epsilon folded into a constant), so the conversion comes first, then the
    weights, then the constants."""
    _recipe()
    from decoder import Decoder
    from joiner import Joiner
    from model import Transducer
    from scaling_converter import convert_scaled_to_non_scaled
    from zipformer import Zipformer
    encoder = Zipformer(num_features=80, output_downsampling_factor=2,
                        zipformer_downsampling_factors=(1, 2, 4, 8, 2), encoder_dims=(384,) * 5,
                        attention_dim=(192,) * 5, encoder_unmasked_dims=(256,) * 5, nhead=(8,) * 5,
                        feedforward_dim=(1024, 1024, 2048, 2048, 1024), cnn_module_kernels=(31,) * 5,
                        num_encoder_layers=layers, num_left_chunks=4, short_chunk_size=50,
                        decode_chunk_size=chunk)
    model = Transducer(encoder=encoder, decoder=Decoder(vocab_size=1000, decoder_dim=512, blank_id=0, context_size=2),
                       joiner=Joiner(encoder_dim=384, decoder_dim=512, joiner_dim=512, vocab_size=1000),
                       encoder_dim=384, decoder_dim=512, joiner_dim=512, vocab_size=1000)
    model.eval()
    convert_scaled_to_non_scaled(model, inplace=True)
    if name.startswith("student"):
        import torch
        state = torch.load(os.path.join(OUT, f"{name}.sd.pt"), weights_only=False)
        model.load_state_dict(state["weights"], strict=True)
        eps = state["eps"]
    else:
        m, _ = model_and_pieces(None if name == "before" else os.path.join(OUT, f"{name}.pt"))
        sd = m.state_dict()
        eps = {p: float(mod.eps_exp) for p, mod in m.named_modules() if hasattr(mod, "eps_exp")}
        if layers != FULL:
            sd, eps = _prune(sd, eps, KEEP[layers])
        model.load_state_dict(sd, strict=True)
    for path, mod in model.named_modules():
        if hasattr(mod, "eps_exp"):
            mod.eps_exp = eps[path]
    return model


def _layer_prefix(stack):
    return f"encoder.encoders.{stack}.layers." if stack == 0 else f"encoder.encoders.{stack}.encoder.layers."


def _prune(sd, eps, keep):
    """The teacher's state with only the kept layers of each stack, renumbered from 0."""
    out, out_eps = {}, {}
    for table, dst in ((sd, out), (eps, out_eps)):
        for k, v in table.items():
            for stack, kept in enumerate(keep):
                pre = _layer_prefix(stack)
                if k.startswith(pre):
                    i, rest = k[len(pre):].split(".", 1) if "." in k[len(pre):] else (k[len(pre):], "")
                    if int(i) in kept:
                        dst[pre + str(kept.index(int(i))) + ("." + rest if rest else "")] = v
                    break
            else:
                dst[k] = v
    return out, out_eps


def export(name):
    """A model as the three int8 ONNX files sherpa-onnx reads, through Icefall's own export code.
    CHUNK (frames of 10 ms halved, default 16) is the decoding chunk; a student also reads LAYERS."""
    import importlib
    chunk = int(os.environ.get("CHUNK", "16"))
    layers = tuple(int(x) for x in os.environ.get("LAYERS", ",".join(map(str, FULL))).split(","))
    model = eager(name, layers, chunk)
    ex = importlib.import_module("export-onnx")
    d = os.path.join(OUT, f"onnx-{name}" + (f"-c{chunk}" if chunk != 16 else ""))
    os.makedirs(d, exist_ok=True)
    ex.export_encoder_model_onnx(ex.OnnxEncoder(encoder=model.encoder, encoder_proj=model.joiner.encoder_proj),
                                 os.path.join(d, "encoder.onnx"), opset_version=13)
    ex.export_decoder_model_onnx(ex.OnnxDecoder(decoder=model.decoder, decoder_proj=model.joiner.decoder_proj),
                                 os.path.join(d, "decoder.onnx"), opset_version=13)
    ex.export_joiner_model_onnx(ex.OnnxJoiner(output_linear=model.joiner.output_linear),
                                os.path.join(d, "joiner.onnx"), opset_version=13)
    from onnxruntime.quantization import QuantType, quantize_dynamic
    for part in ("encoder", "decoder", "joiner"):
        quantize_dynamic(os.path.join(d, f"{part}.onnx"), os.path.join(d, f"{part}.int8.onnx"),
                         op_types_to_quantize=["MatMul"], weight_type=QuantType.QInt8)
    import shutil
    shutil.copy(os.path.join(SNAP, "data", "lang_bpe_1000", "tokens.txt"), os.path.join(d, "tokens.txt"))
    print("exported", d, file=sys.stderr)


# ------------------------------------------------------------------ the pronunciation verdict, by the transducer

class Scorer:
    """How well a transcript explains a recording, as the transducer's own negative log likelihood.

    The same question `scripts/asr-verdict.py` asks of xls-r with CTC: the recording is scored against
    the two spellings of a pair and placed between native references of each. If a Zipformer can do
    this as well as xls-r, the app ships one model instead of two."""

    def __init__(self, name):
        import torch
        torch.set_num_threads(os.cpu_count() or 4)
        self.torch = torch
        if name.startswith("student"):
            # a student is saved as Icefall's own modules; it is scored at the chunk it was trained at
            state = torch.load(os.path.join(OUT, f"{name}.sd.pt"), weights_only=False)
            self.m = eager(name, tuple(state["layers"]), int(os.environ.get("CHUNK", "32")))
            _, self.sp = model_and_pieces()
        elif os.environ.get("CHUNK"):
            # scored at the chunk the app would ship, not the one TalTech's file was scripted at
            self.m = eager(name, FULL, int(os.environ["CHUNK"]))
            _, self.sp = model_and_pieces()
        else:
            self.m, self.sp = model_and_pieces(None if name == "before" else os.path.join(OUT, f"{name}.pt"))
        self.m.eval()
        self.enc = {}
        chunk = os.environ.get("CHUNK")
        path = os.path.join(OUT, f"nll-{name}{'-c' + chunk if chunk and not name.startswith('student') else ''}.json")
        self.path = path
        self.cache = json.load(open(path)) if os.path.exists(path) else {}

    def encode(self, f):
        if f not in self.enc:
            if len(self.enc) > 64:
                self.enc.clear()
            a = np.concatenate([np.zeros(int(RATE * 0.3), np.float32), X.load(f), np.zeros(int(RATE * 0.8), np.float32)])
            feat = fbank(a)
            with self.torch.inference_mode():
                e, el = self.m.encoder(feat.unsqueeze(0), self.torch.tensor([feat.shape[0]]))
                self.enc[f] = (self.m.joiner.encoder_proj(e), el)
        return self.enc[f]

    def nll(self, f, text):
        key = f"{f}|{text}"
        if key not in self.cache:
            import torchaudio.functional as F
            torch = self.torch
            e, el = self.encode(f)
            y = self.sp.encode(label(text))
            with torch.inference_mode():
                sos = torch.tensor([[0] + y])
                dec = self.m.joiner.decoder_proj(self.m.decoder(sos, need_pad=True))
                logits = self.m.joiner.output_linear(torch.tanh(e.unsqueeze(2) + dec.unsqueeze(1)))
                loss = F.rnnt_loss(logits, torch.tensor([y], dtype=torch.int32), el.int(),
                                   torch.tensor([len(y)], dtype=torch.int32), blank=0, reduction="sum")
            self.cache[key] = float(loss)
        return self.cache[key]

    def margin(self, f, a, b):
        """How much better spelling `b` explains the audio than `a`, in nats. Positive means `b`."""
        return self.nll(f, a) - self.nll(f, b)

    def save(self):
        json.dump(self.cache, open(self.path, "w"), ensure_ascii=False)


def verdict(name):
    """The table `scripts/asr-verdict.py judge` prints for xls-r, from the transducer, same pairs, same
    references, same 5-nat gate, same unsure bands."""
    spec = importlib.util.spec_from_file_location("asr_verdict", os.path.join(os.path.dirname(__file__), "asr-verdict.py"))
    V = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(V)
    sc = Scorer(name)
    sets = json.load(open(os.path.join(V.OUT, "sets.json")))
    r = json.load(open(os.path.join(V.OUT, "refs.json")))
    for room in ("clean", "babble10", "phone"):
        rows = []
        for k, row in enumerate(sets["sentences"]):
            ok, bad = row["text"], row["said"]
            ref = r["sentences"][f"{row['text']}|{row['said']}"]
            rr = np.mean([sc.margin(a, ok, bad) for a, _ in ref.values()])
            rw = np.mean([sc.margin(b, ok, bad) for _, b in ref.values()])
            scale = (lambda m, rr=rr, rw=rw: (m - rr) / (rw - rr) if rw != rr else 0.0)
            rows.append(("sentence", scale(sc.margin(V.room_file(row["right_file"], room), ok, bad)),
                         scale(sc.margin(V.room_file(row["wrong_file"], room), ok, bad)), rw - rr))
            if k % 50 == 0:
                sc.save()
        for w in sets["words"]:
            a, b = w["text"], w["partner"]
            ra = np.mean([sc.margin(f, a, b) for f in r["words"][w["text"]].values()])
            rb = np.mean([sc.margin(f, a, b) for f in r["words"][w["partner"]].values()])
            m = sc.margin(V.room_file(w["file"], room, word=True), a, b)
            rows.append(("word", (m - ra) / (rb - ra) if rb != ra else 0.0, (m - rb) / (ra - rb) if ra != rb else 0.0, abs(rb - ra)))
        sc.save()
        for unit, band in (("word", (0.35, 0.65)), ("sentence", (0.4, 0.6))):
            for gate in (0, V.SEPARATION):
                sub = [x for x in rows if x[0] == unit and x[3] >= gate]
                n, whole = len(sub), sum(1 for x in rows if x[0] == unit)
                lo, hi = band
                caught = sum(x[2] > hi for x in sub)
                false = sum(x[1] > hi for x in sub)
                again = sum(lo <= x[1] <= hi for x in sub) + sum(lo <= x[2] <= hi for x in sub)
                print(f"{name:10} {room:9} {unit:8} gate {gate:3.0f}: {n:3} of {whole} pairs  caught {100 * caught / max(n, 1):5.1f}%  "
                      f"false alarm {100 * false / max(n, 1):4.1f}%  asked again {100 * again / max(2 * n, 1):4.1f}%", flush=True)


# ------------------------------------------------------------------ a smaller, faster student

def student(name="student", layers=(1, 2, 2, 1, 2), teacher="anchored", steps=2000, batch=4, lr=5e-5, every=100):
    """A Zipformer with about half the encoder layers, taught by the full one.

    The recipe is the standard way to shrink a speech model without starting over:

      * start from the teacher's own weights, every other layer of each stack (`KEEP`), so the
        student begins close to a working model;
      * distillation: the student's encoder output is pulled toward the teacher's on the same audio
        (mean squared error, frame by frame), which carries far more than a transcript does;
      * the transducer loss on the transcripts, so it stays a recognizer in its own right;
      * the data the app needs: half of every batch real native speech (TalTech's train split, from
        recordings no dev or test segment comes from), half Kodukeel's own dictionary sentences said
        right and with learner mistakes (scripts/asr-finetune.py data), a room on half of all of it,
        the babble in those rooms made of real talkers.

    Both models run at the decoding chunk the app will use (CHUNK), in inference mode for the masks,
    so what is learned is what is deployed. Resumable: weights, optimizer and step every `every`."""
    import torch
    import torchaudio.functional as F
    torch.set_num_threads(os.cpu_count() or 4)
    torch.manual_seed(0)
    chunk = int(os.environ.get("CHUNK", "16"))
    _, sp = model_and_pieces()
    t = eager(teacher, FULL, chunk)
    for p in t.parameters():
        p.requires_grad = False
    sm = eager(teacher, layers, chunk)
    params = [p for p in sm.parameters()]
    for p in params:
        p.requires_grad = True
    opt = torch.optim.AdamW(params, lr=lr, weight_decay=0.0)
    eps = {p: float(m.eps_exp) for p, m in sm.named_modules() if hasattr(m, "eps_exp")}
    ckpt = os.path.join(OUT, f"checkpoint-{name}.pt")
    start, scale = 0, None
    if os.path.exists(ckpt):
        state = torch.load(ckpt, weights_only=False)
        sm.load_state_dict(state["weights"])
        opt.load_state_dict(state["optimizer"])
        start, scale = state["step"], state["scale"]
        print(f"resumed at step {start}", file=sys.stderr, flush=True)
    synth = json.load(open(os.path.join(ROOT, "finetune", "train.json")))
    real = json.load(open(os.path.join(OUT, "anchor", "rows.json")))
    # Background talkers are real speech from the train split, never TTS: the anchored run learned to
    # ignore TTS babble and gained nothing on real babble (scripts/asr-eval.py, dev). The test noise is
    # other dev and test recordings, so training and test noise never share a source.
    others = [X.load(r["file"]) for r in random.Random(9).sample(real, 300)]
    audio = {}
    t0 = time.time()
    for step in range(start, steps):
        rng = random.Random(5000 + step)
        sample = rng.sample(synth, batch // 2) + rng.sample(real, batch - batch // 2)
        feats, ys = [], []
        for r in sample:
            if r["file"] not in audio:
                audio[r["file"]] = X.load(r["file"])
            a = audio[r["file"]]
            if rng.random() < 0.5:
                a = X.condition(rng.choice(ROOMS), a, others)
            a = np.concatenate([np.zeros(int(RATE * 0.3), np.float32), a, np.zeros(int(RATE * 0.5), np.float32)])
            feats.append(fbank(a))
            ys.append(sp.encode(label(r["label"])))
        lens = torch.tensor([f.shape[0] for f in feats])
        x = torch.full((batch, int(lens.max()), 80), LOG_EPS)
        for k, f in enumerate(feats):
            x[k, : f.shape[0]] = f
        with torch.no_grad():
            te, _ = t.encoder(x, lens)
        enc, enc_lens = sm.encoder(x, lens)
        mask = (torch.arange(enc.shape[1])[None, :] < enc_lens[:, None]).float().unsqueeze(-1)
        distil = (((enc - te) ** 2) * mask).sum() / (mask.sum() * enc.shape[-1])
        u = max(len(y) for y in ys)
        y = torch.zeros((batch, u), dtype=torch.long)
        for k, tt in enumerate(ys):
            y[k, : len(tt)] = torch.tensor(tt)
        sos = torch.cat([torch.zeros((batch, 1), dtype=torch.long), y], dim=1)
        dec = sm.decoder(sos)
        logits = sm.joiner.output_linear(torch.tanh(sm.joiner.encoder_proj(enc).unsqueeze(2)
                                                    + sm.joiner.decoder_proj(dec).unsqueeze(1)))
        rnnt = F.rnnt_loss(logits, y.int(), enc_lens.int(), torch.tensor([len(tt) for tt in ys], dtype=torch.int32),
                           blank=0, reduction="mean")
        if scale is None:
            # the two losses weighted equally at the start, and the weight fixed from then on
            scale = float(rnnt.detach() / max(distil.detach(), 1e-6))
        loss = rnnt + scale * distil
        loss.backward()
        torch.nn.utils.clip_grad_norm_(params, 5.0)
        warm = min(1.0, (step + 1) / 100)
        decay = 0.5 * (1 + np.cos(np.pi * step / steps))
        for g in opt.param_groups:
            g["lr"] = lr * warm * max(decay, 0.05)
        opt.step()
        opt.zero_grad()
        if step % 20 == 0:
            print(f"step {step} rnnt {rnnt.item():.3f} distil {distil.item():.4f} {time.time() - t0:.0f}s", file=sys.stderr, flush=True)
        if (step + 1) % every == 0 and step + 1 < steps:
            tmp = ckpt + ".tmp"
            torch.save({"step": step + 1, "weights": sm.state_dict(), "optimizer": opt.state_dict(), "scale": scale}, tmp)
            os.replace(tmp, ckpt)
            print(f"checkpoint at step {step + 1}", file=sys.stderr, flush=True)
    torch.save({"weights": sm.state_dict(), "eps": eps, "layers": layers}, os.path.join(OUT, f"{name}.sd.pt"))
    if os.path.exists(ckpt):
        os.remove(ckpt)
    print("saved", file=sys.stderr)


def report():
    rows = held()
    for name in ("large", "before", "after", "anchored", "anchored-onnx", "anchored-c32-onnx"):
        path = os.path.join(OUT, f"eval_{name}.json")
        if not os.path.exists(path):
            continue
        out = json.load(open(path))
        right = {(r["text"], r["voice"]): r["right_file"] for r in rows}
        w = X.wer([(t, out[f]) for (t, _), f in right.items()])
        wn = X.wer([(t, out["babble10|" + f]) for (t, _), f in right.items()])
        print(f"{name:7} said right: word errors {w:5.1f}%, in babble {wn:5.1f}%")
        real = os.path.join(ROOT, "taltech", "hesitations", "sets.json")
        if os.path.exists(real):
            spec = importlib.util.spec_from_file_location("asr_hesitations", os.path.join(os.path.dirname(__file__), "asr-hesitations.py"))
            H = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(H)
            e = n = 0
            for r in json.load(open(real))[:REAL]:
                if "real|" + r["file"] in out:
                    a, b = H.errors(H.ref_tokens(r["text"]), out["real|" + r["file"]])
                    e, n = e + a, n + b
            print(f"        real native speech (TalTech corpus, {n} words): word errors {100 * e / max(n, 1):5.1f}%")
        stats = {}
        for r in rows:
            hw = X.words(out[r["wrong_file"]])
            s = stats.setdefault(r["kind"], [0, 0, 0])
            s[0] += r["bad"] in hw
            s[1] += r["ok"] in hw
            s[2] += 1
        for kind, (bad, ok, n) in sorted(stats.items()):
            print(f"        {kind:8} wrote the mistake {bad:3}/{n}, corrected it {ok:3}/{n}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "report"
    if cmd == "eval":
        evaluate(sys.argv[2] if len(sys.argv) > 2 else "before")
    elif cmd == "verdict":
        verdict(sys.argv[2] if len(sys.argv) > 2 else "before")
    elif cmd == "export":
        export(sys.argv[2] if len(sys.argv) > 2 else "after")
    else:
        {"train": train, "report": report, "anchor": anchor,
         # the same recipe, half of every batch real native speech, at half the learning rate
         "train-anchored": lambda: train("anchored", lr=1e-5, anchored=2),
         # a half-size student distilled from the anchored model (section 3.8: far worse, dropped)
         "student": lambda: student()}[cmd]()
