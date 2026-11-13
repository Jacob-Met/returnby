import { afterEach, describe, expect, it, vi } from 'vitest';

const ocr = vi.hoisted(() => ({
  reads: [] as string[],
  text: {} as Record<string, string>,
}));

vi.mock('../src/receipt-image', () => ({
  enhanceFaintReceipt: () => ({ pass: 'faint' }),
  enhanceWrinkledReceipt: (_image: unknown, headerOnly = false) =>
    ({ pass: headerOnly ? 'header' : 'shadow' }),
}));

vi.mock('tesseract.js', () => ({
  PSM: { AUTO: 'auto', SINGLE_BLOCK: 'block' },
  createWorker: async () => ({
    setParameters: async () => {},
    recognize: async (image: { pass?: string }) => {
      const pass = image.pass || 'original';
      ocr.reads.push(pass);
      return { data: { text: ocr.text[pass] || '' } };
    },
    terminate: async () => {},
  }),
}));

import { readReceipt } from '../src/receipt-ocr';

afterEach(() => { vi.unstubAllGlobals(); ocr.reads.length = 0; ocr.text = {}; });

describe('large phone receipt recovery', () => {
  it('reads the isolated merchant header of a 3024×4032 creased photograph', async () => {
    vi.stubGlobal('document', { baseURI: 'http://localhost:4173/' });
    ocr.text = {
      original: 'TOTAL $14.46\nwww.brixxpizza.com',
      faint: 'SUB-TOTAL $13.45',
      shadow: 'SUB-TOTAL $13.45\nTOTAL $14.46\nwww.brixxpizza.com',
      header: 'Brixx',
    };
    const source = { width: 3024, height: 4032, pass: 'original' } as unknown as HTMLCanvasElement;
    const result = await readReceipt(source, new AbortController().signal, () => {});
    expect(ocr.reads).toEqual(['original', 'faint', 'shadow', 'header']);
    expect(result.headerText).toBe('Brixx');
    expect(result.damagedText).toContain('TOTAL $14.46');
  });

  it('does not waste a header pass if the original photo already contains every field', async () => {
    vi.stubGlobal('document', { baseURI: 'http://localhost:4173/' });
    ocr.text.original = 'PAPER & PINE\nPurchase date: 2026-11-10\nTOTAL $15.12';
    const source = { width: 3024, height: 4032, pass: 'original' } as unknown as HTMLCanvasElement;
    await readReceipt(source, new AbortController().signal, () => {});
    expect(ocr.reads).toEqual(['original']);
  });
});
