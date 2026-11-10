import { receiptFileProblem, receiptSuggestions } from './receipt-photo';
import { readReceipt } from './receipt-ocr';
import './receipt-photo.css';

export function bindReceiptPhoto() {
  const dialog = document.querySelector<HTMLDialogElement>('#manual-dialog');
  const form = document.querySelector<HTMLFormElement>('#manual-form');
  const open = document.querySelector<HTMLButtonElement>('#photo-open');
  if (!dialog || !form || !open) return;
  const panel = document.createElement('section');
  panel.className = 'receipt-photo';
  panel.setAttribute('aria-labelledby', 'receipt-photo-title');
  panel.innerHTML = [
    '<h2 id="receipt-photo-title">Read a receipt photo</h2>',
    '<p class="receipt-help">Use a clear, upright photo with the whole receipt in frame. English printed text; check every detail before saving.</p>',
    '<label class="receipt-file-label" for="receipt-photo-file">Choose a receipt photo</label>',
    '<input id="receipt-photo-file" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="receipt-photo-privacy">',
    '<p id="receipt-photo-privacy" class="receipt-help">Read on this device. The photo and raw text are cleared on reload. Unfinished fields recover in this tab until you save or discard them.</p>',
    '<div id="receipt-photo-source" hidden><div class="receipt-photo-toolbar"><button id="receipt-rotate" type="button">Rotate 90°</button><button id="receipt-clear" type="button">Remove photo</button></div>',
    '<div class="receipt-photo-zoom"><label for="receipt-photo-zoom">Zoom photo</label><input id="receipt-photo-zoom" type="range" min="1" max="3" step="0.25" value="1"><output id="receipt-zoom-value" for="receipt-photo-zoom">100%</output></div>',
    '<div class="receipt-canvas-wrap"><canvas id="receipt-photo-canvas" aria-label="Selected receipt photo"></canvas></div>',
    '<div class="receipt-photo-actions"><button id="receipt-read" type="button" class="button button-primary">Read this receipt</button><button id="receipt-stop" type="button" class="button button-link" hidden>Stop reading</button></div></div>',
    '<p id="receipt-photo-status" role="status" aria-live="polite"></p><progress id="receipt-photo-progress" max="1" value="0" hidden aria-label="Receipt reading progress"></progress>',
    '<details id="receipt-photo-text" hidden><summary>See the text read from this photo</summary><pre></pre></details>',
  ].join('');
  const navigation = document.createElement('nav');
  navigation.className = 'receipt-review-nav';
  navigation.setAttribute('aria-label', 'Receipt review');
  navigation.innerHTML = '<button type="button" id="receipt-show-photo" aria-pressed="true">Photo</button><button type="button" id="receipt-show-details" aria-pressed="false">Details</button><button type="button" id="receipt-close-top">Close</button>';
  dialog.insertBefore(navigation, form);
  dialog.insertBefore(panel, form);
  const view = (name: 'photo' | 'details') => {
    dialog.dataset.receiptView = name;
    navigation.querySelector('#receipt-show-photo')!.setAttribute('aria-pressed', String(name === 'photo'));
    navigation.querySelector('#receipt-show-details')!.setAttribute('aria-pressed', String(name === 'details'));
    if (window.matchMedia('(max-width: 680px)').matches) dialog.scrollTop = 0;
  };
  view('photo');
  navigation.querySelector('#receipt-show-photo')!.addEventListener('click', () => view('photo'));
  navigation.querySelector('#receipt-show-details')!.addEventListener('click', () => view('details'));
  navigation.querySelector('#receipt-close-top')!.addEventListener('click', () => dialog.close());

  const $ = <T extends HTMLElement>(selector: string) => panel.querySelector<T>(selector)!;
  const fileInput = $<HTMLInputElement>('#receipt-photo-file');
  const source = $('#receipt-photo-source');
  const zoom = $<HTMLInputElement>('#receipt-photo-zoom');
  const zoomValue = $('#receipt-zoom-value');
  const canvas = $<HTMLCanvasElement>('#receipt-photo-canvas');
  const status = $('#receipt-photo-status');
  const reviewNote = document.createElement('p');
  reviewNote.id = 'receipt-review-note';
  reviewNote.className = 'receipt-review-note';
  reviewNote.setAttribute('role', 'status');
  reviewNote.hidden = true;
  form.insertBefore(reviewNote, form.querySelector('label'));
  const setStatus = (message: string) => {
    status.textContent = message;
    reviewNote.textContent = message;
    reviewNote.hidden = !message;
  };
  const progress = $<HTMLProgressElement>('#receipt-photo-progress');
  const read = $<HTMLButtonElement>('#receipt-read');
  const rotate = $<HTMLButtonElement>('#receipt-rotate');
  const clear = $<HTMLButtonElement>('#receipt-clear');
  const stop = $<HTMLButtonElement>('#receipt-stop');
  const text = $<HTMLDetailsElement>('#receipt-photo-text');
  let image: ImageBitmap | undefined;
  let quarterTurns = 0;
  let generation = 0;
  let controller: AbortController | undefined;
  const field = (name: string) => form.querySelector<HTMLInputElement>('[name="' + name + '"]')!;
  const busy = (value: boolean) => {
    read.disabled = value;
    rotate.disabled = value;
    fileInput.disabled = value;
    clear.disabled = value;
    stop.hidden = !value;
    progress.hidden = !value;
    panel.setAttribute('aria-busy', String(value));
  };
  const applyZoom = () => {
    const percent = Math.round(Number(zoom.value) * 100);
    canvas.style.width = percent + '%';
    zoomValue.textContent = percent + '%';
  };
  zoom.addEventListener('input', applyZoom);
  const endReading = () => {
    generation++;
    controller?.abort();
    controller = undefined;
    busy(false);
  };
  const paint = () => {
    if (!image) return;
    const scale = Math.min(1, 2600 / Math.max(image.width, image.height));
    const w = Math.round(image.width * scale), h = Math.round(image.height * scale);
    canvas.width = quarterTurns % 2 ? h : w;
    canvas.height = quarterTurns % 2 ? w : h;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(quarterTurns * Math.PI / 2);
    context.drawImage(image, -w / 2, -h / 2, w, h);
  };
  const discardPhoto = () => {
    endReading();
    image?.close();
    image = undefined;
    canvas.width = canvas.height = 0;
    source.hidden = true;
    text.hidden = true;
    text.querySelector('pre')!.textContent = '';
    fileInput.value = '';
    setStatus('');
  };
  open.addEventListener('click', () => {
    dialog.classList.add('has-receipt-photo');
    if (!image) view('photo');
    if (!dialog.open) dialog.showModal();
    if (dialog.dataset.receiptView === 'photo') fileInput.focus();
  });
  document.querySelector('#manual-open')?.addEventListener('click', () => {
    if (image) dialog.classList.add('has-receipt-photo');
    else dialog.classList.remove('has-receipt-photo');
  });
  fileInput.addEventListener('change', async () => {
    const selected = fileInput.files?.[0];
    if (!selected) return;
    const problem = receiptFileProblem(selected);
    if (problem) { setStatus(problem); fileInput.value = ''; return; }
    const token = ++generation;
    setStatus('Opening photo…');
    try {
      const next = await createImageBitmap(selected);
      if (token !== generation) { next.close(); return; }
      if (next.width * next.height > 60_000_000) {
        next.close();
        throw new Error('This photo is too large to read here. Choose a smaller copy.');
      }
      image?.close();
      image = next;
      quarterTurns = 0;
      zoom.value = '1'; applyZoom();
      paint();
      source.hidden = false;
      text.hidden = true;
      text.querySelector('pre')!.textContent = '';
      setStatus('Make the text upright, then choose Read this receipt. Your entered fields stay unchanged until it finishes.');
    } catch (error) {
      if (token !== generation) return;
      setStatus(error instanceof Error && error.message.startsWith('This photo')
        ? error.message : 'This photo could not be opened. Try a JPG or PNG, or enter the purchase manually.');
    }
  });
  rotate.addEventListener('click', () => {
    quarterTurns = (quarterTurns + 1) % 4;
    paint();
    setStatus('Photo rotated. Choose Read this receipt when the text is upright.');
  });
  clear.addEventListener('click', () => {
    discardPhoto();
    setStatus('Photo removed. Your entered purchase details are kept.');
    fileInput.focus();
  });
  stop.addEventListener('click', () => {
    endReading();
    setStatus('Reading stopped. Your purchase details are unchanged. You can try again or enter them manually.');
    read.focus();
  });
  dialog.addEventListener('close', () => {
    if (controller) {
      endReading();
      setStatus('Reading stopped when you closed the receipt. Reopen it to try again.');
    } else generation++;
  });
  form.addEventListener('reset', () => {
    discardPhoto();
    dialog.classList.remove('has-receipt-photo');
  });
  read.addEventListener('click', async () => {
    if (!image || controller) return;
    if (['merchant', 'orderDate', 'orderNo', 'total', 'windowDays', 'windowStartDate', 'fixedDeadline'].some(name => field(name).value.trim()) &&
        !window.confirm('Replace the entered purchase details with suggestions from this photo? The previous window, exact deadline and confirmed start will be cleared so you can check the return rule for this receipt.')) return;
    controller = new AbortController();
    const signal = controller.signal;
    const token = ++generation;
    const before = Object.fromEntries(['merchant', 'orderDate', 'orderNo', 'total', 'windowDays', 'windowStartDate', 'fixedDeadline'].map(name => [name, field(name).value]));
    busy(true);
    progress.value = 0;
    setStatus('Preparing the local receipt reader…');
    try {
      const recognized = await readReceipt(canvas, signal, (fraction, stage) => {
        if (token !== generation) return;
        if (stage === 'recognizing text') {
          progress.value = fraction;
          setStatus('Reading receipt… ' + Math.round(fraction * 100) + '%');
        }
      });
      if (token !== generation) return;
      if (!recognized.trim()) {
        setStatus('No readable text was found. Try a brighter, closer photo, rotate it, or enter the details yourself.');
        return;
      }
      text.querySelector('pre')!.textContent = recognized;
      text.hidden = false;
      // A user can keep editing while the worker runs. Do not replace that work.
      if (Object.entries(before).some(([name, value]) => field(name).value !== value)) {
        setStatus('Text is ready below. You edited the purchase while it was being read, so your fields were kept. Copy the details you need from the photo or extracted text.');
        return;
      }
      form.dispatchEvent(new Event('returnby:purchase-replaced'));
      const result = receiptSuggestions(recognized);
      for (const name of ['merchant', 'orderDate', 'orderNo', 'total'] as const) field(name).value = result[name];
      field('windowDays').value = '';
      field('windowStartDate').value = '';
      form.dispatchEvent(new Event('input', { bubbles: true }));
      view('details');
      setStatus('Text read. These are suggestions: check each field against the photo. Enter the return window you confirmed with the store. ' + result.notes.join(' '));
      field(result.merchant ? (result.orderDate ? 'windowDays' : 'orderDate') : 'merchant').focus();
    } catch (error) {
      if (token !== generation || signal.aborted) return;
      setStatus('The receipt could not be read. Your fields are unchanged. Try again, or enter the details from the photo. If the reader files are missing, download the complete ReturnBy ZIP.');
    } finally {
      if (token === generation) { controller = undefined; busy(false); }
    }
  });
}
