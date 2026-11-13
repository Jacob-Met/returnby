export type ReceiptCorner = { x: number; y: number };

/** Coordinates are fractions of the upright source image, not the screen. */
export function validReceiptCorners(points: readonly ReceiptCorner[]): boolean {
  if (points.length !== 4 || points.some(p =>
    !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
    p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1
  )) return false;
  const cross = points.map((p, i) => {
    const b = points[(i + 1) % 4]!, c = points[(i + 2) % 4]!;
    return (b.x - p.x) * (c.y - b.y) - (b.y - p.y) * (c.x - b.x);
  });
  const area = points.reduce((sum, p, i) => {
    const q = points[(i + 1) % 4]!;
    return sum + p.x * q.y - q.x * p.y;
  }, 0) / 2;
  return area > 0.04 && cross.every(value => value > 0.002);
}

const distance = (a: ReceiptCorner, b: ReceiptCorner, w: number, h: number) =>
  Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);

/** Rectify an outlined paper quadrilateral without a service or image library. */
export function straightenReceipt(source: HTMLCanvasElement, points: readonly ReceiptCorner[]): HTMLCanvasElement {
  if (!validReceiptCorners(points)) throw Error('Corners must enclose the receipt without crossing.');
  const sw = source.width, sh = source.height;
  const width = (distance(points[0]!, points[1]!, sw, sh) +
    distance(points[3]!, points[2]!, sw, sh)) / 2;
  const height = (distance(points[0]!, points[3]!, sw, sh) +
    distance(points[1]!, points[2]!, sw, sh)) / 2;
  const scale = Math.min(1, 2200 / width, 2700 / height, Math.sqrt(4_000_000 / (width * height)));
  const dw = Math.max(2, Math.round(width * scale)), dh = Math.max(2, Math.round(height * scale));
  const dest = document.createElement('canvas');
  dest.width = dw; dest.height = dh;
  const src = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, sw, sh).data;
  const destContext = dest.getContext('2d')!;
  const output = destContext.createImageData(dw, dh);
  const dst = output.data;
  const [p0, p1, p2, p3] = points.map(p => ({ x: p.x * (sw - 1), y: p.y * (sh - 1) }));
  // Unit-square -> quadrilateral projective mapping; unlike bilinear interpolation,
  // this keeps straight paper edges and printed lines straight.
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const divisor = dx1 * dy2 - dx2 * dy1;
  let g = 0, h = 0;
  if (Math.abs(dx3) + Math.abs(dy3) > 0.001) {
    if (Math.abs(divisor) < 0.001) throw Error('The four corners cannot be straightened.');
    g = (dx3 * dy2 - dx2 * dy3) / divisor;
    h = (dx1 * dy3 - dx3 * dy1) / divisor;
  }
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y;
  for (let y = 0; y < dh; y++) {
    const v = y / (dh - 1);
    for (let x = 0; x < dw; x++) {
      const u = x / (dw - 1), denominator = 1 + g * u + h * v;
      if (denominator <= 0.00001) continue;
      const sx = Math.max(0, Math.min(sw - 1, (a * u + b * v + p0.x) / denominator));
      const sy = Math.max(0, Math.min(sh - 1, (d * u + e * v + p0.y) / denominator));
      const ix = Math.floor(sx), iy = Math.floor(sy), jx = Math.min(sw - 1, ix + 1), jy = Math.min(sh - 1, iy + 1);
      const tx = sx - ix, ty = sy - iy;
      const k = (y * dw + x) * 4;
      const q00 = (iy * sw + ix) * 4, q10 = (iy * sw + jx) * 4;
      const q01 = (jy * sw + ix) * 4, q11 = (jy * sw + jx) * 4;
      for (let channel = 0; channel < 3; channel++) {
        dst[k + channel] =
          src[q00 + channel] * (1 - tx) * (1 - ty) +
          src[q10 + channel] * tx * (1 - ty) +
          src[q01 + channel] * (1 - tx) * ty +
          src[q11 + channel] * tx * ty;
      }
      dst[k + 3] = 255;
    }
  }
  destContext.putImageData(output, 0, 0);
  return dest;
}

/** Local background subtraction makes faded thermal-print strokes more legible. */
export function enhanceFaintReceipt(source: HTMLCanvasElement): HTMLCanvasElement {
  const scale = Math.min(1, 1800 / Math.max(source.width, source.height), Math.sqrt(2_800_000 / (source.width * source.height)));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  const frame = ctx.getImageData(0, 0, w, h), pixels = frame.data;
  const stride = w + 1, integral = new Float64Array(stride * (h + 1));
  const grays = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x, j = i * 4;
      const gray = Math.round(0.299 * pixels[j] + 0.587 * pixels[j + 1] + 0.114 * pixels[j + 2]);
      grays[i] = gray;
      row += gray;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const radius = Math.max(12, Math.min(42, Math.round(Math.min(w, h) * 0.022)));
  for (let y = 0; y < h; y++) {
    const top = Math.max(0, y - radius), bottom = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const left = Math.max(0, x - radius), right = Math.min(w - 1, x + radius);
      const count = (right - left + 1) * (bottom - top + 1);
      const mean = (integral[(bottom + 1) * stride + right + 1] -
        integral[top * stride + right + 1] -
        integral[(bottom + 1) * stride + left] +
        integral[top * stride + left]) / count;
      const diff = mean - grays[y * w + x];
      // Background remains white; only locally darker strokes become dark.
      const ink = diff > 2 ? Math.min(245, (diff - 2) * 21) : 0;
      const value = Math.round(255 - ink), i = (y * w + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

/** Recover print from small, creased paper without mistaking the crease shadows for ink. */
export function enhanceWrinkledReceipt(source: HTMLCanvasElement, headerOnly = false): HTMLCanvasElement {
  const down = Math.min(1, 1600 / source.width, 2200 / source.height,
    Math.sqrt(2_800_000 / (source.width * source.height)));
  const w = Math.max(1, Math.round(source.width * down));
  const h = Math.max(1, Math.round(source.height * down));
  const work = document.createElement('canvas');
  work.width = w; work.height = h;
  const ctx = work.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  const frame = ctx.getImageData(0, 0, w, h);
  const pixels = frame.data, grays = new Uint8Array(w * h);
  const stride = w + 1, integral = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x, j = i * 4;
      const gray = Math.round(.299 * pixels[j] + .587 * pixels[j + 1] + .114 * pixels[j + 2]);
      grays[i] = gray;
      row += gray;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const radius = Math.max(12, Math.min(40, Math.round(Math.min(w, h) * (headerOnly ? .028 : .045))));
  for (let y = 0; y < h; y++) {
    const top = Math.max(0, y - radius), bottom = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const left = Math.max(0, x - radius), right = Math.min(w - 1, x + radius);
      const mean = (integral[(bottom + 1) * stride + right + 1] -
        integral[top * stride + right + 1] -
        integral[(bottom + 1) * stride + left] + integral[top * stride + left]) /
        ((right - left + 1) * (bottom - top + 1));
      const value = Math.max(0, 255 - Math.max(0, mean - grays[y * w + x] - 1) * 5);
      const j = (y * w + x) * 4;
      pixels[j] = pixels[j + 1] = pixels[j + 2] = value;
      pixels[j + 3] = 255;
    }
  }
  ctx.putImageData(frame, 0, 0);
  // A separate, top-of-paper read prevents distant line items and folds
  // overwhelming the store name on a compressed phone photograph.
  const sx = headerOnly ? Math.round(w * .06) : 0;
  const sy = headerOnly ? Math.round(h * .06) : 0;
  const cw = headerOnly ? Math.max(1, Math.round(w * .88)) : w;
  const ch = headerOnly ? Math.max(1, Math.round(h * .24)) : h;
  const scale = Math.min(headerOnly ? 3 : 2, 2200 / cw, 2800 / ch,
    Math.sqrt(4_000_000 / (cw * ch)));
  if (scale <= 1 && !headerOnly) return work;
  const enlarged = document.createElement('canvas');
  enlarged.width = Math.round(cw * Math.max(1, scale));
  enlarged.height = Math.round(ch * Math.max(1, scale));
  const out = enlarged.getContext('2d')!;
  out.imageSmoothingEnabled = !headerOnly;
  out.imageSmoothingQuality = 'high';
  out.drawImage(work, sx, sy, cw, ch, 0, 0, enlarged.width, enlarged.height);
  return enlarged;
}
