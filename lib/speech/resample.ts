/**
 * FROM THE DEVICE'S RATE TO THE MODEL'S, WITHOUT ALIASING.
 *
 * A microphone hands over 44.1 or 48 kHz and the model hears 16 kHz. Asking the
 * browser for a 16 kHz audio context would do this for us in Chrome and fail in
 * Firefox, which refuses to connect a microphone to a context at another rate,
 * so capture stays at the device's rate and this does the conversion
 * (docs/41-fifth-batch.md, VB-1).
 *
 * A windowed-sinc low-pass and interpolation in one step: every output sample
 * is a weighted sum of the input samples around the instant it stands for,
 * with the weights cutting off just below the new Nyquist frequency. Dropping
 * every third sample instead would fold everything between 8 and 24 kHz back
 * into the speech, which is the hiss a recognizer reads as `s` and `h`.
 *
 * Streaming: `StreamResampler` keeps the tail of the last chunk, so audio fed
 * in pieces comes out exactly as the same audio fed whole, which the test
 * asserts. Pure: no browser API, so the capture worklet and a native app both
 * run it.
 */

/** Taps either side of the center, at the slower of the two rates. */
const HALF_WIDTH = 16;
/** Where the low-pass cuts, as a share of the output's Nyquist frequency. */
const CUTOFF = 0.92;

function sinc(x: number): number {
  if (x === 0) return 1;
  const p = Math.PI * x;
  return Math.sin(p) / p;
}

/** A Blackman window over `[-1, 1]`, which keeps the ripple down where speech is. */
function blackman(t: number): number {
  if (t <= -1 || t >= 1) return 0;
  const x = (t + 1) / 2;
  return 0.42 - 0.5 * Math.cos(2 * Math.PI * x) + 0.08 * Math.cos(4 * Math.PI * x);
}

export class StreamResampler {
  private readonly ratio: number;
  private readonly scale: number;
  private readonly reach: number;
  /** Input not yet fully used, with its first sample's index in the whole stream. */
  private history: Float32Array = new Float32Array(0);
  private historyStart = 0;
  /** The input instant the next output sample stands for. */
  private nextAt = 0;

  constructor(readonly fromRate: number, readonly toRate: number) {
    if (!(fromRate > 0) || !(toRate > 0)) throw new RangeError("a sample rate must be positive");
    this.ratio = fromRate / toRate;
    // Below the input's own Nyquist when going down, at it when going up.
    this.scale = Math.min(1, toRate / fromRate) * CUTOFF;
    this.reach = Math.ceil(HALF_WIDTH / this.scale);
  }

  /** Feed the next piece of input; returns every output sample it completes. */
  push(input: Float32Array): Float32Array {
    if (this.fromRate === this.toRate) return input.slice();
    const joined = new Float32Array(this.history.length + input.length);
    joined.set(this.history, 0);
    joined.set(input, this.history.length);
    const end = this.historyStart + joined.length;
    const out: number[] = [];
    // An output sample can be made once every input it reaches is here.
    while (this.nextAt + this.reach < end) {
      out.push(this.sampleAt(joined, this.nextAt));
      this.nextAt += this.ratio;
    }
    // Keep what the next output samples still reach back to.
    const keepFrom = Math.max(this.historyStart, Math.floor(this.nextAt) - this.reach);
    this.history = joined.slice(keepFrom - this.historyStart);
    this.historyStart = keepFrom;
    return Float32Array.from(out);
  }

  /** No more input: make the last samples, treating what follows as silence. */
  flush(): Float32Array {
    if (this.fromRate === this.toRate) return new Float32Array(0);
    return this.push(new Float32Array(this.reach + 1));
  }

  private sampleAt(buffer: Float32Array, at: number): number {
    const centre = Math.floor(at);
    let sum = 0;
    for (let i = centre - this.reach + 1; i <= centre + this.reach; i++) {
      const local = i - this.historyStart;
      if (local < 0 || local >= buffer.length) continue;
      const distance = at - i;
      sum += buffer[local]! * sinc(distance * this.scale) * blackman(distance / (this.reach + 1));
    }
    return sum * this.scale;
  }
}

/** Resample a whole recording at once, which is the streaming path fed one piece. */
export function resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return samples.slice();
  const resampler = new StreamResampler(fromRate, toRate);
  const body = resampler.push(samples);
  const tail = resampler.flush();
  const expected = Math.round((samples.length * toRate) / fromRate);
  const out = new Float32Array(expected);
  out.set(body.subarray(0, Math.min(body.length, expected)), 0);
  if (body.length < expected) out.set(tail.subarray(0, expected - body.length), body.length);
  return out;
}
