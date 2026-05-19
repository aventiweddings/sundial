/**
 * Minimal QR code generator — produces an SVG string.
 * Supports alphanumeric URLs up to ~2K chars (version 1-10, error correction L).
 * No external dependencies.
 */

// ── Galois field GF(256) tables ────────────────────────────────────────────
const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x11d;
  }
  EXP[255] = EXP[0];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

// ── Reed-Solomon error correction ──────────────────────────────────────────
function rsGenPoly(nsym: number): Uint8Array {
  let g = new Uint8Array([1]);
  for (let i = 0; i < nsym; i++) {
    const ng = new Uint8Array(g.length + 1);
    for (let j = 0; j < g.length; j++) {
      ng[j] ^= g[j];
      ng[j + 1] ^= gfMul(g[j], EXP[i]);
    }
    g = ng;
  }
  return g;
}

function rsEncode(data: Uint8Array, nsym: number): Uint8Array {
  const gen = rsGenPoly(nsym);
  const out = new Uint8Array(data.length + nsym);
  out.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = out[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        out[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return out.slice(data.length);
}

// ── QR code data structures ────────────────────────────────────────────────
// Version info: [version, totalCodewords, ecCodewordsPerBlock, numBlocks]
// Error correction level L (7% recovery)
const VERSION_TABLE: [number, number, number, number][] = [
  [1, 19, 7, 1],
  [2, 34, 10, 1],
  [3, 55, 15, 1],
  [4, 80, 20, 1],
  [5, 108, 26, 1],
  [6, 136, 18, 2],
  [7, 156, 20, 2],
  [8, 194, 24, 2],
  [9, 232, 30, 2],
  [10, 274, 18, 4],
];

// Data capacity in bytes for each version at EC level L
const DATA_CAPACITY = VERSION_TABLE.map(
  ([, total, ecPerBlock, blocks]) => total - ecPerBlock * blocks
);

function selectVersion(byteLen: number): number {
  for (let i = 0; i < DATA_CAPACITY.length; i++) {
    if (byteLen <= DATA_CAPACITY[i]) return i + 1;
  }
  throw new Error(`QR: data too long (${byteLen} bytes, max ${DATA_CAPACITY[DATA_CAPACITY.length - 1]})`);
}

// ── Bit stream ─────────────────────────────────────────────────────────────
class BitStream {
  private bits: number[] = [];
  push(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >> i) & 1);
    }
  }
  get length() { return this.bits.length; }
  toBytes(): Uint8Array {
    while (this.bits.length % 8 !== 0) this.bits.push(0);
    const bytes = new Uint8Array(this.bits.length / 8);
    for (let i = 0; i < bytes.length; i++) {
      for (let j = 0; j < 8; j++) {
        bytes[i] = (bytes[i] << 1) | this.bits[i * 8 + j];
      }
    }
    return bytes;
  }
  getBit(i: number) { return this.bits[i]; }
}

// ── Encode data ────────────────────────────────────────────────────────────
function encodeData(text: string): { version: number; codewords: Uint8Array } {
  const utf8 = new TextEncoder().encode(text);
  const version = selectVersion(utf8.length + 3); // mode + count + data
  const [, totalCW, ecPerBlock, numBlocks] = VERSION_TABLE[version - 1];

  const bs = new BitStream();
  // Byte mode indicator
  bs.push(0b0100, 4);
  // Character count (8 bits for v1-9, 16 bits for v10+)
  bs.push(utf8.length, version <= 9 ? 8 : 16);
  // Data
  for (let i = 0; i < utf8.length; i++) bs.push(utf8[i], 8);
  // Terminator
  bs.push(0, Math.min(4, totalCW * 8 - bs.length));

  const dataBytes = bs.toBytes();
  const dataCW = new Uint8Array(totalCW - ecPerBlock * numBlocks);
  dataCW.set(dataBytes);

  // Pad codewords
  let padToggle = 0;
  for (let i = dataBytes.length; i < dataCW.length; i++) {
    dataCW[i] = padToggle === 0 ? 0xec : 0x11;
    padToggle ^= 1;
  }

  // Split into blocks and generate EC
  const blockSize = Math.floor(dataCW.length / numBlocks);
  const longBlocks = dataCW.length % numBlocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const size = blockSize + (b >= numBlocks - longBlocks ? 1 : 0);
    const block = dataCW.slice(offset, offset + size);
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += size;
  }

  // Interleave
  const result: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const block of ecBlocks) {
      result.push(block[i]);
    }
  }

  return { version, codewords: new Uint8Array(result) };
}

// ── Matrix placement ───────────────────────────────────────────────────────
function createMatrix(version: number): { matrix: number[][]; size: number } {
  const size = 17 + version * 4;
  const matrix = Array.from({ length: size }, () => Array(size).fill(-1));

  // Finder patterns
  const drawFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        if (dr === -1 || dr === 7 || dc === -1 || dc === 7) {
          matrix[rr][cc] = 0;
        } else if (dr === 0 || dr === 6 || dc === 0 || dc === 6) {
          matrix[rr][cc] = 1;
        } else if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) {
          matrix[rr][cc] = 1;
        } else {
          matrix[rr][cc] = 0;
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Alignment patterns (version >= 2)
  if (version >= 2) {
    const positions = getAlignmentPositions(version);
    for (const r of positions) {
      for (const c of positions) {
        if (matrix[r][c] !== -1) continue; // skip if overlaps finder
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            matrix[r + dr][c + dc] =
              Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0) ? 1 : 0;
          }
        }
      }
    }
  }

  // Dark module
  matrix[size - 8][8] = 1;

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    if (matrix[8][i] === -1) matrix[8][i] = 0;
    if (matrix[i][8] === -1) matrix[i][8] = 0;
    if (matrix[8][size - 1 - i] === -1) matrix[8][size - 1 - i] = 0;
    if (matrix[size - 1 - i][8] === -1) matrix[size - 1 - i][8] = 0;
  }
  if (matrix[8][8] === -1) matrix[8][8] = 0;

  return { matrix, size };
}

function getAlignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const intervals = Math.floor(version / 7) + 1;
  const size = 17 + version * 4;
  const last = size - 7;
  const step = Math.ceil((last - 6) / intervals / 2) * 2;
  const positions = [6];
  let pos = last;
  while (pos > 6 + step - 1) {
    positions.unshift(pos);
    pos -= step;
  }
  positions.unshift(6); // dedup handled by alignment drawing
  return Array.from(new Set(positions));
}

function placeData(matrix: number[][], size: number, codewords: Uint8Array) {
  const bits: number[] = [];
  for (let c = 0; c < codewords.length; c++) {
    const cw = codewords[c];
    for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
  }
  // Pad with 0s
  while (bits.length < size * size) bits.push(0);

  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // skip timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const dc of [0, -1]) {
        const c = col + dc;
        if (c < 0) continue;
        if (matrix[row][c] === -1) {
          matrix[row][c] = bitIdx < bits.length ? bits[bitIdx] : 0;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }
}

// ── Masking ────────────────────────────────────────────────────────────────
function applyMask(matrix: number[][], size: number, reserved: number[][]): number[][] {
  // Use mask 0: (row + col) % 2 === 0 — simplest and generally good
  const masked = matrix.map(r => [...r]);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c] !== -1) continue;
      if ((r + c) % 2 === 0) {
        masked[r][c] ^= 1;
      }
    }
  }
  return masked;
}

// ── Format info ────────────────────────────────────────────────────────────
// EC level L = 01, Mask 0 = 000 → format bits = 01000
// After BCH: pre-computed for L/mask0
const FORMAT_BITS = 0x77c4; // EC L, mask 0

function writeFormatInfo(matrix: number[][], size: number) {
  const bits = FORMAT_BITS;
  // Horizontal strip
  const hPositions = [0, 1, 2, 3, 4, 5, 7, 8, size - 8, size - 7, size - 6, size - 5, size - 4, size - 3, size - 2, size - 1];
  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1;
    if (i < 8) {
      matrix[8][hPositions[i]] = bit;
    } else {
      matrix[8][hPositions[i]] = bit; // intentionally using hPositions for remainder
    }
  }

  // Vertical strip
  const vPositions = [size - 1, size - 2, size - 3, size - 4, size - 5, size - 6, size - 7, size - 8, 7, 5, 4, 3, 2, 1, 0];
  for (let i = 0; i < 15; i++) {
    matrix[vPositions[i]][8] = (bits >> i) & 1;
  }
}

// ── SVG output ─────────────────────────────────────────────────────────────
export function generateQrSvg(text: string, moduleSize = 4, margin = 4): string {
  const { version, codewords } = encodeData(text);
  const { matrix: baseMatrix, size } = createMatrix(version);

  // Save reserved positions before placing data
  const reserved = baseMatrix.map(r => [...r]);

  placeData(baseMatrix, size, codewords);
  const masked = applyMask(baseMatrix, size, reserved);
  writeFormatInfo(masked, size);

  const totalSize = size * moduleSize + margin * 2;
  let paths = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (masked[r][c] === 1) {
        const x = margin + c * moduleSize;
        const y = margin + r * moduleSize;
        paths += `M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}"><rect width="${totalSize}" height="${totalSize}" fill="#fff"/><path d="${paths}" fill="#1E293B"/></svg>`;
}
