import { describe, expect, it } from 'vitest';
import { validReceiptCorners } from '../src/receipt-image';

describe('paper outline geometry', () => {
  const corners = [
    { x: .1, y: .05 }, { x: .9, y: .12 },
    { x: .85, y: .92 }, { x: .16, y: .9 },
  ];
  it('accepts a steep but usable four-corner perspective outline', () => {
    expect(validReceiptCorners(corners)).toBe(true);
  });
  it('rejects corners that cross or are outside the image', () => {
    expect(validReceiptCorners([corners[0], corners[2], corners[1], corners[3]])).toBe(false);
    expect(validReceiptCorners([corners[0], { x: 1.1, y: 0 }, corners[2], corners[3]])).toBe(false);
  });
  it('rejects collapsed and almost-empty outlines', () => {
    expect(validReceiptCorners(corners.map(p => ({ x: p.x * .05, y: p.y * .05 })))).toBe(false);
    expect(validReceiptCorners(corners.slice(0, 3))).toBe(false);
  });
});
