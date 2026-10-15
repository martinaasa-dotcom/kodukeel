import qrcode from "qrcode-generator";

/**
 * A QR code for the join link, as data rather than as markup.
 *
 * The matrix is what a reader scans and what the test decodes, so it is built
 * here and drawn elsewhere: `qrMatrix` asks qrcode-generator for the modules,
 * and `qrPath` turns the dark ones into one SVG path, a square per module, with
 * a quiet zone of four modules round the edge because that is what the
 * standard asks for and what a phone camera needs to find the corners.
 *
 * Medium error correction, because a printed sheet gets folded and pinned and
 * the link is short enough that the extra modules cost nothing at the size the
 * poster prints it. Version zero lets the library choose the smallest size the
 * link fits in.
 */

export const QUIET_ZONE = 4;

export function qrMatrix(text: string): boolean[][] {
  const code = qrcode(0, "M");
  code.addData(text, "Byte");
  code.make();
  const size = code.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => code.isDark(row, col)),
  );
}

/** One path for every dark module, offset by the quiet zone, and the side of the whole square. */
export function qrPath(matrix: boolean[][], quiet: number = QUIET_ZONE): { side: number; d: string } {
  const parts: string[] = [];
  matrix.forEach((cells, row) => {
    cells.forEach((dark, col) => {
      if (dark) parts.push(`M${col + quiet} ${row + quiet}h1v1h-1z`);
    });
  });
  return { side: matrix.length + quiet * 2, d: parts.join("") };
}

/**
 * The address a join link opens, built from the deployment's own origin and the
 * code. Where the deployment names no canonical origin, the host the teacher
 * reached the poster on stands in, with the scheme the proxy says it used, and
 * https wherever it says nothing, except on a machine's own loopback where a
 * development server answers plain http.
 */
export function joinLink(
  code: string,
  where: { canonical: URL | null; host: string | null; proto: string | null },
): string | null {
  if (where.canonical) return `${where.canonical.origin}/class?join=${code}`;
  const host = where.host?.trim();
  if (!host) return null;
  const name = host.replace(/:\d+$/, "");
  const loopback = name === "localhost" || name === "127.0.0.1";
  const forwarded = where.proto?.split(",")[0]?.trim().toLowerCase();
  const scheme = forwarded === "http" || forwarded === "https" ? forwarded : loopback ? "http" : "https";
  return `${scheme}://${host}/class?join=${code}`;
}

/** The link as it is printed for somebody to type: no scheme. */
export function withoutScheme(link: string): string {
  return link.replace(/^https?:\/\//, "");
}
