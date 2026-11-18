import type { Worker } from 'tesseract.js';
import { agreedPrintedFields, readPrintedFields, type PrintedFields } from './receipt-layout';
import { enhanceFaintReceipt, enhanceWrinkledReceipt } from './receipt-image';
import { receiptSuggestions, mergeReceiptSuggestions, damagedReceiptSuggestions } from './receipt-photo';

export type ReceiptReading = { text: string; recoveredText?: string; enhancedImage?: HTMLCanvasElement; damagedText?: string; headerText?: string; printedFields?: PrintedFields };

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
    const originalPage = (await worker.recognize(image, {}, { text: true, blocks: true })).data;
    const original = originalPage.text;
    check();
    const fields = receiptSuggestions(original);
    if (fields.merchant && fields.orderDate && fields.total) return { text: original };
    progress(0, 'recovering faint print');
    // Keep the original pass as source of truth. An enhancement is a second,
    // independently visible suggestion, never an undisclosed replacement.
    const enhanced = enhanceFaintReceipt(image);
    check();
    const enhancedPage = (await worker.recognize(enhanced, {}, { text: true, blocks: true })).data;
    const recoveredText = enhancedPage.text;
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
    // The header enhancer caps both its work image and OCR crop. Large
    // phone photos need this focused read too: source dimensions are not
    // evidence that a creased store name was successfully recognized.
    if (!mergeReceiptSuggestions(combined, damagedReceiptSuggestions(damagedText)).merchant) {
      progress(0, 'reading store header');
      const header = enhanceWrinkledReceipt(image, true);
      check();
      headerText = (await worker.recognize(header)).data.text;
      check();
    }
    const damaged = damagedReceiptSuggestions((headerText ? headerText + '\n' : '') + damagedText);
    let printedFields: PrintedFields | undefined;
    const interpreted = mergeReceiptSuggestions(combined, damaged);
    if ((!interpreted.merchant || !interpreted.total) && originalPage.blocks?.length) {
      const views = [readPrintedFields(originalPage.blocks), readPrintedFields(enhancedPage.blocks)];
      const agreed = agreedPrintedFields(views);
      if ((!interpreted.merchant && !agreed.merchant) || (!interpreted.total && !agreed.total)) {
        const scale = Math.min(3, 1700 / image.width, 2600 / image.height,
          Math.sqrt(4_000_000 / (image.width * image.height)));
        const enlarged = document.createElement('canvas');
        enlarged.width = Math.max(1, Math.round(image.width * scale));
        enlarged.height = Math.max(1, Math.round(image.height * scale));
        const context = enlarged.getContext('2d')!;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, enlarged.width, enlarged.height);
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1' });
        check();
        const spaced = (await worker.recognize(enlarged, {}, { text: true, blocks: true })).data;
        check();
        views.push(readPrintedFields(spaced.blocks));
      }
      printedFields = agreedPrintedFields(views);
    }
    return { text: original, recoveredText, damagedText, headerText, printedFields,
      enhancedImage: (damaged.merchant || damaged.total) ? shadow : enhanced };
  };
  try {
    return await Promise.race([work(), abort]);
  } finally {
    signal.removeEventListener('abort', stop);
    if (worker) await worker.terminate();
  }
}
