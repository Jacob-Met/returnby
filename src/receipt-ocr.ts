import type { Worker } from 'tesseract.js';
import { enhanceFaintReceipt, enhanceWrinkledReceipt } from './receipt-image';
import { receiptSuggestions, mergeReceiptSuggestions, damagedReceiptSuggestions } from './receipt-photo';

export type ReceiptReading = { text: string; recoveredText?: string; enhancedImage?: HTMLCanvasElement; damagedText?: string; headerText?: string };

export async function readReceipt(
  image: HTMLCanvasElement,
  signal: AbortSignal,
  progress: (fraction: number, status: string) => void,
): Promise<ReceiptReading> {
  let worker: Worker | undefined;
  const stopped = new DOMException('Receipt reading stopped.', 'AbortError');
  const check = () => { if (signal.aborted) throw stopped; };
  check();
  const { createWorker, PSM } = await import('tesseract.js');
  check();
  const base = new URL('receipt-ocr/', document.baseURI).href;
  let rejectAbort: (reason: Error) => void = () => {};
  const abort = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const stop = () => { rejectAbort(stopped); if (worker) void worker.terminate(); };
  signal.addEventListener('abort', stop, { once: true });
  const work = async (): Promise<ReceiptReading> => {
    worker = await createWorker('eng', 1, {
      workerPath: base + 'worker.min.js',
      corePath: base + 'core',
      langPath: base + 'lang',
      cacheMethod: 'none',
      workerBlobURL: false,
      logger: message => {
        if (!signal.aborted) progress(message.progress || 0, message.status);
      },
    });
    if (signal.aborted) { await worker.terminate(); throw stopped; }
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: '1' });
    check();
    const original = (await worker.recognize(image)).data.text;
    check();
    const fields = receiptSuggestions(original);
    if (fields.merchant && fields.orderDate && fields.total) return { text: original };
    progress(0, 'recovering faint print');
    // Keep the original pass as source of truth. An enhancement is a second,
    // independently visible suggestion, never an undisclosed replacement.
    const enhanced = enhanceFaintReceipt(image);
    check();
    const recoveredText = (await worker.recognize(enhanced)).data.text;
    check();
    const combined = mergeReceiptSuggestions(fields, receiptSuggestions(recoveredText));
    if (combined.merchant && combined.total) return { text: original, recoveredText, enhancedImage: enhanced };
    progress(0, 'recovering wrinkled print');
    const shadow = enhanceWrinkledReceipt(image);
    check();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' });
    const damagedText = (await worker.recognize(shadow)).data.text;
    check();
    let headerText: string | undefined;
    if (!mergeReceiptSuggestions(combined, damagedReceiptSuggestions(damagedText)).merchant &&
        image.width < 1300 && image.height < 2600) {
      progress(0, 'reading store header');
      const header = enhanceWrinkledReceipt(image, true);
      check();
      headerText = (await worker.recognize(header)).data.text;
      check();
    }
    const damaged = damagedReceiptSuggestions((headerText ? headerText + '\n' : '') + damagedText);
    return { text: original, recoveredText, damagedText, headerText,
      enhancedImage: (damaged.merchant || damaged.total) ? shadow : enhanced };
  };
  try {
    return await Promise.race([work(), abort]);
  } finally {
    signal.removeEventListener('abort', stop);
    if (worker) await worker.terminate();
  }
}
