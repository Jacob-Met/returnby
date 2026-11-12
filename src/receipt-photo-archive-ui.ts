import type { Order } from './store';
import { receiptFileProblem } from './receipt-photo';
import { readOriginalReceipt, removeOriginalReceipt, saveOriginalReceipt, type ReceiptPhoto } from './receipt-photo-archive';
import './receipt-photo.css';

let dialog: HTMLDialogElement | undefined;
let canvas: HTMLCanvasElement;
let message: HTMLParagraphElement;
let input: HTMLInputElement;
let remove: HTMLButtonElement;
let rotate: HTMLButtonElement;
let download: HTMLButtonElement;
let zoom: HTMLInputElement;
let zoomValue: HTMLOutputElement;
let heading: HTMLElement;
let activeOrder: Pick<Order, 'id' | 'createdAt' | 'merchant'>;
let activeRecord: ReceiptPhoto | undefined;
let imageGeneration = 0;

function ensureDialog(): HTMLDialogElement {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'receipt-proof-dialog';
  dialog.setAttribute('aria-labelledby', 'receipt-proof-heading');
  dialog.innerHTML = [
    '<div class="receipt-proof-head"><div><p class="receipt-proof-eyebrow">YOUR ORIGINAL RECEIPT</p><h2 id="receipt-proof-heading"></h2></div><button type="button" class="receipt-proof-close" aria-label="Close receipt">Close</button></div>',
    '<p class="receipt-proof-message" role="status" aria-live="polite"></p>',
    '<div class="receipt-proof-zoom" hidden><label for="receipt-proof-zoom-input">Receipt zoom</label><input type="range" id="receipt-proof-zoom-input" min="1" max="3" step="0.25" value="1"><output for="receipt-proof-zoom-input">100%</output></div>',
    '<div class="receipt-proof-image" hidden><canvas aria-label="Saved original receipt photograph"></canvas></div>',
    '<div class="receipt-proof-tools"><button type="button" data-proof="rotate" hidden>Rotate photo</button><button type="button" data-proof="download" hidden>Save original photo</button><button type="button" data-proof="remove" hidden>Remove photo</button></div>',
    '<label class="receipt-proof-input">Add or replace paper receipt<input type="file" accept="image/jpeg,image/png,image/webp"></label>',
    '<p class="receipt-proof-privacy">Stored on this device. Save a copy before switching browsers or devices; regular backups do not include photos.</p>',
  ].join('');
  document.body.append(dialog);
  heading = dialog.querySelector('#receipt-proof-heading')!;
  canvas = dialog.querySelector('canvas')!;
  zoom = dialog.querySelector('#receipt-proof-zoom-input')!;
  zoomValue = dialog.querySelector('.receipt-proof-zoom output')!;
  message = dialog.querySelector('.receipt-proof-message')!;
  input = dialog.querySelector('input')!;
  remove = dialog.querySelector('[data-proof=remove]')!;
  rotate = dialog.querySelector('[data-proof=rotate]')!;
  download = dialog.querySelector('[data-proof=download]')!;
  dialog.querySelector<HTMLButtonElement>('.receipt-proof-close')!.addEventListener('click', () => dialog!.close());
  zoom.addEventListener('input', () => {
    const percent = Math.round(Number(zoom.value) * 100);
    canvas.style.width = percent + '%';
    zoomValue.textContent = percent + '%';
  });
  dialog.addEventListener('close', () => { imageGeneration++; input.value = ''; activeRecord = undefined; });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const problem = receiptFileProblem(file);
    if (problem) { message.textContent = problem; input.value = ''; return; }
    const order = activeOrder;
    input.disabled = true;
    message.textContent = 'Saving original photo on this device…';
    try {
      const image = await createImageBitmap(file);
      const tooLarge = image.width * image.height > 60_000_000;
      image.close();
      if (tooLarge) throw new Error('This photo is too large to use safely.');
      if (!dialog?.open || activeOrder.id !== order.id || activeOrder.createdAt !== order.createdAt) return;
      await saveOriginalReceipt(order, file);
      if (!dialog?.open || activeOrder.id !== order.id || activeOrder.createdAt !== order.createdAt) return;
      activeRecord = await readOriginalReceipt(order);
      await paint();
      message.textContent = 'Original photo saved. Open it here at the return counter, even after reopening ReturnBy.';
    } catch {
      message.textContent = 'The original photo was not saved. Check browser storage and try another JPG or PNG; keep the paper receipt.';
    } finally {
      input.disabled = false; input.value = '';
    }
  });
  rotate.addEventListener('click', async () => {
    if (!activeRecord) return;
    const order = activeOrder;
    const photo = activeRecord.photo;
    const next = (activeRecord.rotation + 1) % 4;
    try {
      await saveOriginalReceipt(order, photo, next);
      if (!dialog?.open || activeOrder.id !== order.id || activeOrder.createdAt !== order.createdAt) return;
      activeRecord = await readOriginalReceipt(order);
      await paint();
    } catch { message.textContent = 'Could not save rotation. Your original photo was not changed.'; }
  });
  remove.addEventListener('click', async () => {
    if (!activeRecord || !window.confirm('Remove the saved receipt photo from this device? Your purchase and deadline will stay.')) return;
    const order = activeOrder;
    try {
      await removeOriginalReceipt(order);
      if (!dialog?.open || activeOrder.id !== order.id || activeOrder.createdAt !== order.createdAt) return;
      activeRecord = undefined;
      await paint();
      message.textContent = 'Receipt photo removed. Your purchase is still saved.';
    } catch { message.textContent = 'Could not remove the photo. Try again before clearing your browser data.'; }
  });
  download.addEventListener('click', () => {
    if (!activeRecord) return;
    const ext = activeRecord.photo.type === 'image/png' ? 'png' : activeRecord.photo.type === 'image/webp' ? 'webp' : 'jpg';
    const url = URL.createObjectURL(activeRecord.photo);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ReturnBy-receipt-' + activeOrder.id.slice(0, 8) + '.' + ext;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  });
  return dialog;
}

async function paint() {
  const token = ++imageGeneration;
  const frame = canvas.parentElement!;
  const hasRecord = !!activeRecord;
  document.querySelector<HTMLElement>('.receipt-proof-zoom')!.hidden = !hasRecord;
  remove.hidden = rotate.hidden = download.hidden = !hasRecord;
  frame.hidden = !hasRecord;
  if (!activeRecord) { canvas.width = canvas.height = 0; return; }
  const record = activeRecord;
  let image: ImageBitmap;
  try { image = await createImageBitmap(record.photo); }
  catch { message.textContent = 'The saved image could not be opened. Save a copy of the original and attach a new photo.'; return; }
  if (token !== imageGeneration) { image.close(); return; }
  const scale = Math.min(1, 2600 / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * scale)), h = Math.max(1, Math.round(image.height * scale));
  canvas.width = record.rotation % 2 ? h : w;
  canvas.height = record.rotation % 2 ? w : h;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(record.rotation * Math.PI / 2);
  context.drawImage(image, -w / 2, -h / 2, w, h);
  image.close();
}

export async function openReceiptProof(order: Pick<Order, 'id' | 'createdAt' | 'merchant'>): Promise<void> {
  const modal = ensureDialog();
  activeOrder = order;
  activeRecord = undefined;
  zoom.value = '1';
  zoom.dispatchEvent(new Event('input'));
  heading.textContent = order.merchant || 'Saved purchase';
  message.textContent = 'Opening local receipt photo…';
  modal.showModal();
  await paint();
  try {
    const record = await readOriginalReceipt(order);
    if (!modal.open || activeOrder.id !== order.id || activeOrder.createdAt !== order.createdAt) return;
    activeRecord = record;
    await paint();
    message.textContent = record
      ? 'Your original paper receipt is ready to show at the return counter.'
      : 'No paper receipt photo saved for this purchase on this device. Attach it now to have it ready at the counter.';
  } catch {
    if (modal.open) message.textContent = 'Saved photo storage is unavailable. Your purchase remains; keep the original paper receipt.';
  }
}
