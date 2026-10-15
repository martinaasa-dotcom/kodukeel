import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { joinLink, qrMatrix, qrPath, QUIET_ZONE, withoutScheme } from "./qr";

/**
 * Renders the matrix the poster draws into pixels and reads it back with a QR
 * decoder, which is the only way to know the printed square scans. Each module
 * is four pixels, white round the edge for the quiet zone.
 */
function decode(text: string): string | null {
  const matrix = qrMatrix(text);
  const scale = 4;
  const side = (matrix.length + QUIET_ZONE * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  matrix.forEach((cells, row) => {
    cells.forEach((dark, col) => {
      if (!dark) return;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const px = ((row + QUIET_ZONE) * scale + y) * side + (col + QUIET_ZONE) * scale + x;
          pixels[px * 4] = 0;
          pixels[px * 4 + 1] = 0;
          pixels[px * 4 + 2] = 0;
        }
      }
    });
  });
  return jsQR(pixels, side, side)?.data ?? null;
}

describe("the join poster's QR code", () => {
  it("scans to exactly the link it was made from", () => {
    for (const link of [
      "https://kodukeel.ee/class?join=ABC234",
      "http://localhost:3000/class?join=XYZ789",
      "https://a-much-longer-deployment-name.example.org/class?join=PQRS23",
    ]) {
      expect(decode(link)).toBe(link);
    }
  });

  it("draws one square per dark module, inside the quiet zone", () => {
    const matrix = qrMatrix("https://kodukeel.ee/class?join=ABC234");
    const dark = matrix.flat().filter(Boolean).length;
    const { side, d } = qrPath(matrix);
    expect(side).toBe(matrix.length + QUIET_ZONE * 2);
    expect(dark).toBeGreaterThan(0);
    expect(d.match(/M/g)?.length).toBe(dark);
    const starts = [...d.matchAll(/M(\d+) (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(starts.length).toBe(dark);
    for (const [x, y] of starts) {
      expect(x).toBeGreaterThanOrEqual(QUIET_ZONE);
      expect(y).toBeGreaterThanOrEqual(QUIET_ZONE);
      expect(x).toBeLessThan(side - QUIET_ZONE);
      expect(y).toBeLessThan(side - QUIET_ZONE);
    }
  });
});

describe("joinLink", () => {
  it("uses the canonical origin where the deployment names one", () => {
    expect(joinLink("ABC234", { canonical: new URL("https://kodukeel.ee"), host: "kodukeel.vercel.app", proto: "https" }))
      .toBe("https://kodukeel.ee/class?join=ABC234");
  });

  it("otherwise takes the host and the scheme the proxy reports", () => {
    expect(joinLink("ABC234", { canonical: null, host: "school.example", proto: "http" }))
      .toBe("http://school.example/class?join=ABC234");
    expect(joinLink("ABC234", { canonical: null, host: "school.example", proto: "https, http" }))
      .toBe("https://school.example/class?join=ABC234");
  });

  it("defaults to https, except on loopback", () => {
    expect(joinLink("ABC234", { canonical: null, host: "school.example", proto: null }))
      .toBe("https://school.example/class?join=ABC234");
    expect(joinLink("ABC234", { canonical: null, host: "localhost:3000", proto: null }))
      .toBe("http://localhost:3000/class?join=ABC234");
    expect(joinLink("ABC234", { canonical: null, host: "127.0.0.1", proto: "nonsense" }))
      .toBe("http://127.0.0.1/class?join=ABC234");
  });

  it("gives nothing without a host to name", () => {
    expect(joinLink("ABC234", { canonical: null, host: null, proto: null })).toBeNull();
    expect(joinLink("ABC234", { canonical: null, host: " ", proto: null })).toBeNull();
  });

  it("prints without its scheme", () => {
    expect(withoutScheme("https://kodukeel.ee/class?join=ABC234")).toBe("kodukeel.ee/class?join=ABC234");
  });
});
