import type { Worker } from 'tesseract.js';

export async function readReceipt(
  image: HTMLCanvasElement,
  signal: AbortSignal,
  progress: (fraction: number, status: string) => void,
): Promise<string> {
  let worker: Worker | undefined;
  const stopped = new DOMException('Receipt reading stopped.', 'AbortError');
  const check = () => { if (signal.aborted) throw stopped; };
  check();
  const { createWorker, PSM } = await import('tesseract.js');
  check();
  const base = new URL('receipt-ocr/', document.baseURI).href;
  let rejectAbort: (reason: Error) => void = () => {};
  const abort = new Promise<never>((_, reject) => { rejectAbort = reject; });
  // createWorker cannot be terminated until its initialization returns. The
  // signal still refuses its late result, and terminates it as soon as possible.
  const stop = () => { rejectAbort(stopped); if (worker) void worker.terminate(); };
  signal.addEventListener('abort', stop, { once: true });
  const work = async () => {
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
    const { data } = await worker.recognize(image);
    check();
    return data.text;
  };
  try {
    return await Promise.race([work(), abort]);
  } finally {
    signal.removeEventListener('abort', stop);
    if (worker) await worker.terminate();
  }
}
