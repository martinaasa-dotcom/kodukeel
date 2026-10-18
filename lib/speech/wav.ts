/**
 * A WAV file as samples, and samples as a WAV file, for the two places this
 * batch handles one without a browser's decoder: the two-second clip the
 * device check decodes, and the fixture clips the tests and the browser suites
 * play into a fake microphone. Mono only, 16-bit PCM or 32-bit float, which is
 * every file this app writes or ships. Pure.
 */

export interface Pcm {
  readonly samples: Float32Array;
  readonly rate: number;
}

/** Read a mono WAV: 16-bit PCM or 32-bit float. Anything else is refused by name. */
export function readWav(bytes: Uint8Array): Pcm {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(bytes[at]!, bytes[at + 1]!, bytes[at + 2]!, bytes[at + 3]!);
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("not a WAV file");
  let format = 0;
  let channels = 0;
  let rate = 0;
  let bits = 0;
  let at = 12;
  while (at + 8 <= bytes.length) {
    const id = tag(at);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === "fmt ") {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      rate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === "data") {
      if (channels !== 1) throw new Error(`a WAV with ${channels} channels; only mono is read`);
      const end = Math.min(bytes.length, body + size);
      if (format === 1 && bits === 16) {
        const samples = new Float32Array((end - body) >> 1);
        for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(body + i * 2, true) / 32768;
        return { samples, rate };
      }
      if (format === 3 && bits === 32) {
        const samples = new Float32Array((end - body) >> 2);
        for (let i = 0; i < samples.length; i++) samples[i] = view.getFloat32(body + i * 4, true);
        return { samples, rate };
      }
      throw new Error(`a WAV of format ${format} at ${bits} bits; only 16-bit PCM and 32-bit float are read`);
    }
    at = body + size + (size % 2);
  }
  throw new Error("a WAV with no audio in it");
}

/** Write mono 16-bit PCM, which is what a fake microphone and a small committed file both want. */
export function writeWav({ samples, rate }: Pcm): Uint8Array {
  const out = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(out.buffer);
  const put = (at: number, text: string) => { for (let i = 0; i < 4; i++) out[at + i] = text.charCodeAt(i); };
  put(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  put(8, "WAVE");
  put(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, Math.round(v < 0 ? v * 32768 : v * 32767), true);
  }
  return out;
}
