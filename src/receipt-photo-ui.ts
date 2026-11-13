import { receiptFileProblem, receiptSuggestions, mergeReceiptSuggestions, damagedReceiptSuggestions } from './receipt-photo';
import { readReceipt } from './receipt-ocr';
import { straightenReceipt, validReceiptCorners, type ReceiptCorner } from './receipt-image';
import './receipt-photo.css';

let selectedOriginal: { file: File; rotation: number } | undefined;
/** The original file remains temporary until the shopper saves the reviewed purchase. */
export function receiptPhotoDraft(): { file: File; rotation: number } | undefined {
  return selectedOriginal && { ...selectedOriginal };
}

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
    '<p id="receipt-photo-privacy" class="receipt-help">Read on this device. The original photo is saved with the purchase on this device. Raw recognized text is cleared on reload. Unfinished fields recover in this tab until you save or discard them.</p>',
    '<div id="receipt-photo-source" hidden><div class="receipt-photo-toolbar"><button id="receipt-rotate" type="button">Rotate 90°</button><button id="receipt-outline" type="button" aria-pressed="false">Outline paper</button><button id="receipt-original-view" type="button" hidden>Original view</button><button id="receipt-clear" type="button">Remove photo</button></div>',
    '<div class="receipt-photo-zoom"><label for="receipt-photo-zoom">Zoom photo</label><input id="receipt-photo-zoom" type="range" min="1" max="3" step="0.25" value="1"><output id="receipt-zoom-value" for="receipt-photo-zoom">100%</output></div>',
    '<div class="receipt-canvas-wrap"><div id="receipt-canvas-stage"><canvas id="receipt-photo-canvas" aria-label="Selected receipt photo"></canvas><div id="receipt-corners" hidden><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon id="receipt-corner-polygon"></polygon></svg><button type="button" data-corner="0" aria-label="Top left paper corner">1</button><button type="button" data-corner="1" aria-label="Top right paper corner">2</button><button type="button" data-corner="2" aria-label="Bottom right paper corner">3</button><button type="button" data-corner="3" aria-label="Bottom left paper corner">4</button></div></div></div>',
    '<div id="receipt-corner-instructions" class="receipt-help" hidden>Drag the four numbered points onto the paper corners. Arrow keys move a selected point. The saved original is never changed.</div>',
    '<button id="receipt-straighten" type="button" hidden>Use straightened photo</button>',
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
  const stage = $('#receipt-canvas-stage');
  const overlay = $('#receipt-corners');
  const polygon = panel.querySelector<SVGPolygonElement>('#receipt-corner-polygon')!;
  const cornerButtons = Array.from(overlay.querySelectorAll<HTMLButtonElement>('button[data-corner]'));
  const outline = $<HTMLButtonElement>('#receipt-outline');
  const originalView = $<HTMLButtonElement>('#receipt-original-view');
  const straighten = $<HTMLButtonElement>('#receipt-straighten');
  const cornerHelp = $('#receipt-corner-instructions');
  let corners: ReceiptCorner[] = [];
  let upright: HTMLCanvasElement | undefined;
  let corrected: HTMLCanvasElement | undefined;
  const refreshCorners = () => {
    cornerButtons.forEach((button, i) => {
      const corner = corners[i]!;
      button.style.left = (corner.x * 100) + '%';
      button.style.top = (corner.y * 100) + '%';
    });
    polygon.setAttribute('points', corners.map(p => (100 * p.x) + ',' + (100 * p.y)).join(' '));
    straighten.disabled = !validReceiptCorners(corners);
  };
  const editingCorners = () => !overlay.hidden;
  const showCornerEditor = (visible: boolean) => {
    overlay.hidden = !visible;
    cornerHelp.hidden = !visible;
    straighten.hidden = !visible;
    zoom.disabled = visible;
    outline.setAttribute('aria-pressed', String(visible));
    read.disabled = !!controller || visible;
    if (visible) {
      // A complete sheet, including its bottom corners, fits on the phone.
      const height = window.matchMedia('(max-width: 680px)').matches ? 285 : 425;
      const available = stage.parentElement!.clientWidth;
      stage.style.width = Math.min(available, height * canvas.width / canvas.height) + 'px';
      refreshCorners();
    } else {
      stage.style.width = Math.round(Number(zoom.value) * 100) + '%';
    }
  };
  const displayCanvas = (imageCanvas: HTMLCanvasElement) => {
    canvas.width = imageCanvas.width;
    canvas.height = imageCanvas.height;
    canvas.getContext('2d')!.drawImage(imageCanvas, 0, 0);
  };
  const resetCorrection = () => {
    corrected = undefined;
    originalView.hidden = true;
    showCornerEditor(false);
  };
  const updateCorner = (index: number, x: number, y: number) => {
    corners[index] = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    refreshCorners();
  };
  cornerButtons.forEach((button, i) => {
    button.addEventListener('pointerdown', event => {
      if (controller) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', event => {
      if (!button.hasPointerCapture(event.pointerId)) return;
      const rect = stage.getBoundingClientRect();
      updateCorner(i, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    });
    button.addEventListener('keydown', event => {
      const step = event.shiftKey ? 0.02 : 0.005;
      const shift: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      const delta = shift[event.key];
      if (!delta) return;
      event.preventDefault();
      updateCorner(i, corners[i]!.x + delta[0], corners[i]!.y + delta[1]);
    });
  });
  outline.addEventListener('click', () => {
    if (!upright || controller) return;
    if (editingCorners()) { showCornerEditor(false); return; }
    corrected = undefined;
    originalView.hidden = true;
    displayCanvas(upright);
    corners = [{ x: .05, y: .05 }, { x: .95, y: .05 }, { x: .95, y: .95 }, { x: .05, y: .95 }];
    showCornerEditor(true);
    setStatus('Move the four points to the paper corners, then use the straightened photo.');
  });
  straighten.addEventListener('click', () => {
    if (!upright || !validReceiptCorners(corners) || controller) return;
    try {
      corrected = straightenReceipt(upright, corners);
      displayCanvas(corrected);
      showCornerEditor(false);
      originalView.hidden = false;
      setStatus('Photo straightened for reading. The original receipt is unchanged and will be saved with your purchase.');
    } catch {
      setStatus('Those corners cannot be straightened. Move them apart or return to the original photo.');
    }
  });
  originalView.addEventListener('click', () => {
    if (!upright || controller) return;
    resetCorrection();
    displayCanvas(upright);
    setStatus('Original photo shown. You can outline the paper again or read it directly.');
  });
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
    read.disabled = value || editingCorners();
    rotate.disabled = value;
    outline.disabled = value;
    originalView.disabled = value;
    straighten.disabled = value || !validReceiptCorners(corners);
    fileInput.disabled = value;
    clear.disabled = value;
    stop.hidden = !value;
    progress.hidden = !value;
    panel.setAttribute('aria-busy', String(value));
  };
  const applyZoom = () => {
    const percent = Math.round(Number(zoom.value) * 100);
    stage.style.width = percent + '%';
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
    upright = document.createElement('canvas');
    upright.width = quarterTurns % 2 ? h : w;
    upright.height = quarterTurns % 2 ? w : h;
    const context = upright.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, upright.width, upright.height);
    context.translate(upright.width / 2, upright.height / 2);
    context.rotate(quarterTurns * Math.PI / 2);
    context.drawImage(image, -w / 2, -h / 2, w, h);
    resetCorrection();
    displayCanvas(upright);
  };
  const discardPhoto = () => {
    endReading();
    image?.close();
    image = undefined;
    upright = undefined;
    resetCorrection();
    selectedOriginal = undefined;
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
      selectedOriginal = { file: selected, rotation: 0 };
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
    if (selectedOriginal) selectedOriginal.rotation = quarterTurns;
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
        if (stage === 'recovering faint print' || stage === 'recovering wrinkled print' || stage === 'reading store header') {
          progress.value = 0;
          setStatus(stage === 'recovering faint print' ? 'Trying to recover faint printed words on this device…' :
            'Trying to read print distorted by paper creases on this device…');
        } else if (stage === 'recognizing text') {
          progress.value = fraction;
          setStatus('Reading receipt… ' + Math.round(fraction * 100) + '%');
        }
      });
      if (token !== generation) return;
      if (!recognized.text.trim() && !recognized.recoveredText?.trim() && !recognized.damagedText?.trim()) {
        setStatus('No readable text was found. Try outlining the paper corners or enter the details yourself.');
        return;
      }
      text.querySelector('pre')!.textContent = recognized.text +
        (recognized.recoveredText ? '\n--- Faint-print recovery ---\n' + recognized.recoveredText : '') +
        (recognized.damagedText ? '\n--- Creased-paper recovery ---\n' + recognized.damagedText : '') +
        (recognized.headerText ? '\n--- Store-header recovery ---\n' + recognized.headerText : '');
      if (recognized.enhancedImage) {
        // The reviewer sees the same locally enhanced pixels the worker read.
        // The saved receipt is still the exact original file.
        corrected = recognized.enhancedImage;
        displayCanvas(corrected);
        originalView.hidden = false;
      }
      text.hidden = false;
      // A user can keep editing while the worker runs. Do not replace that work.
      if (Object.entries(before).some(([name, value]) => field(name).value !== value)) {
        setStatus('Text is ready below. You edited the purchase while it was being read, so your fields were kept. Copy the details you need from the photo or extracted text.');
        return;
      }
      form.dispatchEvent(new Event('returnby:purchase-replaced'));
      const originalFields = receiptSuggestions(recognized.text);
      const recoveredFields = recognized.recoveredText ? receiptSuggestions(recognized.recoveredText) : undefined;
      const faded = mergeReceiptSuggestions(originalFields, recoveredFields);
      const damaged = recognized.damagedText
        ? damagedReceiptSuggestions((recognized.headerText ? recognized.headerText + '\n' : '') + recognized.damagedText)
        : undefined;
      const result = mergeReceiptSuggestions(faded, damaged);
      const recoveredCount = faded.recoveredCount + result.recoveredCount;
      for (const name of ['merchant', 'orderDate', 'orderNo', 'total'] as const)
        field(name).value = result[name];
      field('windowDays').value = '';
      field('windowStartDate').value = '';
      form.dispatchEvent(new Event('input', { bubbles: true }));
      view('details');
      setStatus('Text read.' + (recoveredCount ? ' Photo recovery suggested ' + recoveredCount + ' additional field(s).' : '') +
        ' Check every suggestion against the photo' + (recognized.enhancedImage ? ' (Photo shows a brighter, enhanced view; Original view restores the source)' : '') + '. Enter the return window you confirmed with the store. ' +
        result.notes.join(' '));
      field(result.merchant ? (result.orderDate ? 'windowDays' : 'orderDate') : 'merchant').focus();
    } catch (error) {
      if (token !== generation || signal.aborted) return;
      setStatus('The receipt could not be read. Your fields are unchanged. Try again, or enter the details from the photo. If the reader files are missing, download the complete ReturnBy ZIP.');
    } finally {
      if (token === generation) { controller = undefined; busy(false); }
    }
  });
}
