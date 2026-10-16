#!/usr/bin/env python3
"""
TalTech's trainable Zipformer: decode it, measure it, and fine-tune it on a CPU.

    python3 scripts/asr-icefall.py eval before   # held-out voices, the large ONNX Zipformer beside it
    python3 scripts/asr-icefall.py train         # the asr-finetune.py recipe, as a transducer (resumable)
    python3 scripts/asr-icefall.py eval after
    python3 scripts/asr-icefall.py report

docs/39-speech.md section 9 says the Zipformer cannot be trained here, because
TalTech publish the large one as ONNX only. That is true of the large one.
`TalTechNLP/icefall_pruned_transducer_stateless7_streaming_et` is the same
architecture, smaller and older (about 800 hours of transcribed speech and
2,500 of TV transcribed automatically), published as an Icefall TorchScript
file with the training branch still inside it: `cpu_jit.pt` holds the encoder,
the stateless decoder, the joiner and both projections, and the encoder still
draws a random chunk size when it is put in training mode. So the recipe that
moved xls-r can be run on a Zipformer, and what it shows is what the same run
would do to the large one once TalTech hand over its checkpoint.

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
    if name == "large":
        z = X.Zipformer(X.LARGE)
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
                if name == "large":
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
            out[key] = z.hear(X.load(r["file"]), lead=0.5)["text"] if name == "large" else greedy(m, sp, X.load(r["file"]))
    json.dump(out, open(path, "w"), ensure_ascii=False)
    print(name, len(out), file=sys.stderr)


def train(steps=600, batch=4, lr=2e-5, every=50):
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
    ckpt = os.path.join(OUT, "checkpoint.pt")
    start = 0
    if os.path.exists(ckpt):
        state = torch.load(ckpt, weights_only=False)
        m.load_state_dict(state["weights"])
        opt.load_state_dict(state["optimizer"])
        start = state["step"]
        print(f"resumed at step {start}", file=sys.stderr, flush=True)
    others = [X.load(c["file"]) for c in json.load(open(os.path.join(ROOT, "corpus.json"))) if c["kind"] == "sentence"]
    audio = {r["file"]: X.load(r["file"]) for r in rows}
    m.train()
    t0 = time.time()
    for step in range(start, steps):
        rng = random.Random(1000 + step)
        sample = rng.sample(rows, batch)
        feats, ys = [], []
        for r in sample:
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
    m.save(os.path.join(OUT, "after.pt"))
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


def export(name):
    """A trained .pt as the three ONNX files sherpa-onnx reads, through icefall's own export code."""
    import importlib
    import torch
    _recipe()
    from decoder import Decoder
    from joiner import Joiner
    from model import Transducer
    from scaling_converter import convert_scaled_to_non_scaled
    from zipformer import Zipformer
    ex = importlib.import_module("export-onnx")
    m, _ = model_and_pieces(None if name == "before" else os.path.join(OUT, f"{name}.pt"))
    encoder = Zipformer(num_features=80, output_downsampling_factor=2,
                        zipformer_downsampling_factors=(1, 2, 4, 8, 2), encoder_dims=(384,) * 5,
                        attention_dim=(192,) * 5, encoder_unmasked_dims=(256,) * 5, nhead=(8,) * 5,
                        feedforward_dim=(1024, 1024, 2048, 2048, 1024), cnn_module_kernels=(31,) * 5,
                        num_encoder_layers=(2, 4, 3, 2, 4), num_left_chunks=4, short_chunk_size=50,
                        decode_chunk_size=16)
    model = Transducer(encoder=encoder, decoder=Decoder(vocab_size=1000, decoder_dim=512, blank_id=0, context_size=2),
                       joiner=Joiner(encoder_dim=384, decoder_dim=512, joiner_dim=512, vocab_size=1000),
                       encoder_dim=384, decoder_dim=512, joiner_dim=512, vocab_size=1000)
    # TalTech's file was scripted after icefall's own inference conversion (balancers and whitening
    # gone, each norm's learned epsilon folded into a constant), so the conversion comes first here,
    # then the weights, then the constants read off the scripted norms one by one.
    model.eval()
    convert_scaled_to_non_scaled(model, inplace=True)
    model.load_state_dict(m.state_dict(), strict=True)
    scripted = dict(m.named_modules())
    folded = 0
    for path, mod in model.named_modules():
        if hasattr(mod, "eps_exp"):
            mod.eps_exp = float(scripted[path].eps_exp)
            folded += 1
    print("norm constants copied:", folded, file=sys.stderr)
    d = os.path.join(OUT, f"onnx-{name}")
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


def report():
    rows = held()
    for name in ("large", "before", "after"):
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
    elif cmd == "export":
        export(sys.argv[2] if len(sys.argv) > 2 else "after")
    else:
        {"train": train, "report": report}[cmd]()
