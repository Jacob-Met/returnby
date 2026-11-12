import type { Worker } from 'tesseract.js';
import { enhanceFaintReceipt } from './receipt-image';
import { receiptSuggestions } from './receipt-photo';

export type ReceiptReading = { text: string; recoveredText?: string; enhancedImage?: HTMLCanvasElement };

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
    return { text: original, recoveredText, enhancedImage: enhanced };
  };
  try {
    return await Promise.race([work(), abort]);
  } finally {
    signal.removeEventListener('abort', stop);
    if (worker) await worker.terminate();
  }
}
