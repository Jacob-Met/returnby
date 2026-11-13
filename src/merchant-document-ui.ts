import type { Order } from './store';
import {
  readMerchantDocument, saveMerchantDocument, removeMerchantDocument, supportedMerchantFile,
  type MerchantDocument,
} from './receipt-photo-archive';
import './receipt-photo.css';

// Merchant-issued proof is never synthesized from a URL or a guessed QR payload.
let dialog: HTMLDialogElement | undefined;
let active: Pick<Order,'id'|'createdAt'|'merchant'> | undefined;
let record: MerchantDocument | undefined;
let revision = 0;
let previewUrl: string | undefined;
function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
}
function ensureDialog(): HTMLDialogElement {
  if (dialog) return dialog;
  const modal = document.createElement('dialog');
  modal.className = 'receipt-proof-dialog merchant-document-dialog';
  modal.setAttribute('aria-labelledby','merchant-document-title');
  modal.innerHTML = [
    '<div class="receipt-proof-head"><div><p class="receipt-proof-eyebrow">MERCHANT RETURN DOCUMENT</p><h2 id="merchant-document-title"></h2></div><button type="button" class="receipt-proof-close">Close</button></div>',
    '<p class="receipt-proof-message" role="status" aria-live="polite"></p>',
    '<div class="merchant-document-preview" hidden></div>',
    '<div class="receipt-proof-tools"><button type="button" data-merchant-download hidden>Save a copy</button><button type="button" data-merchant-remove hidden>Remove document</button></div>',
    '<label class="receipt-proof-input">Add or replace merchant QR code or return label<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"></label>',
    '<p class="receipt-proof-privacy">Attach the file sent by the retailer, not an invented authorization. Stored privately on this device and included in your ReturnBy backup and offline trip sheet. The merchant decides whether it is valid.</p>',
  ].join('');
  document.body.append(modal);
  const heading=modal.querySelector<HTMLElement>('#merchant-document-title')!;
  const message=modal.querySelector<HTMLElement>('.receipt-proof-message')!;
  const frame=modal.querySelector<HTMLElement>('.merchant-document-preview')!;
  const input=modal.querySelector<HTMLInputElement>('input[type=file]')!;
  const download=modal.querySelector<HTMLButtonElement>('[data-merchant-download]')!;
  const remove=modal.querySelector<HTMLButtonElement>('[data-merchant-remove]')!;
  async function paint() {
    clearPreview();
    frame.replaceChildren();
    frame.hidden = download.hidden = remove.hidden = !record;
    if(!record) return;
    const file=record.file;
    previewUrl=URL.createObjectURL(file);
    if(file.type==='application/pdf'){
      const link=document.createElement('a');
      link.href=previewUrl;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='Open supplied PDF label';
      frame.append(link);
      const note=document.createElement('p');
      note.textContent='If the browser cannot display the PDF here, choose Save a copy to open or print it separately.';
      frame.append(note);
    } else {
      const image=document.createElement('img');
      image.src=previewUrl;image.alt='Original merchant-issued return label or QR code';
      image.style.cssText='display:block;max-width:100%;max-height:65vh;object-fit:contain;margin:auto';
      frame.append(image);
    }
  }
  async function refresh(order: Pick<Order,'id'|'createdAt'>, ticket: number) {
    try {
      const found=await readMerchantDocument(order);
      if(!modal.open || revision!==ticket || active?.id!==order.id || active.createdAt!==order.createdAt)return;
      record=found;
      await paint();
      message.textContent=found
        ? 'Merchant document saved on this device. Check its return instructions and validity with the retailer.'
        : 'No merchant-issued QR code or label saved. Attach the real file before setting out.';
    } catch {
      if(revision===ticket) message.textContent='Cannot read the saved document. Keep the retailer original and check local browser storage.';
    }
  }
  modal.querySelector<HTMLButtonElement>('.receipt-proof-close')!.onclick=()=>modal.close();
  modal.addEventListener('close',()=>{revision++;clearPreview();record=undefined;active=undefined;input.value='';});
  input.addEventListener('change',async()=>{
    const file=input.files?.[0],order=active,ticket=revision;
    if(!file || !order)return;
    if(!await supportedMerchantFile(file)){
      message.textContent='Choose the real JPG, PNG, WebP or PDF file, up to 16 MB. This file cannot be saved.';
      input.value='';return;
    }
    input.disabled=true;message.textContent='Saving the merchant document to this browser…';
    try {
      await saveMerchantDocument(order,file,file.name);
      await refresh(order,ticket);
    } catch(error) {if(revision===ticket)message.textContent=error instanceof Error?error.message:'Could not save this file. Keep the merchant original.';}
    finally {input.disabled=false;input.value='';}
  });
  download.onclick=()=>{
    if(!record)return;
    const url=URL.createObjectURL(record.file);
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download=record.name;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),10_000);
  };
  remove.onclick=async()=>{
    if(!record || !active || !window.confirm('Remove the merchant return document saved on this device? The return deadline will stay.'))return;
    const order=active,ticket=revision;
    try {await removeMerchantDocument(order);await refresh(order,ticket);}
    catch{if(revision===ticket)message.textContent='Could not remove this document. Try again.';}
  };
  // Heading is filled when the saved order is opened, not when this dialog is built.
  void heading;
  dialog=modal;
  return modal;
}

export async function openMerchantDocument(order: Pick<Order,'id'|'createdAt'|'merchant'>): Promise<void> {
  const modal=ensureDialog();
  active=order;record=undefined;
  const ticket=++revision;
  modal.querySelector<HTMLElement>('#merchant-document-title')!.textContent=order.merchant||'Saved return';
  modal.querySelector<HTMLElement>('.receipt-proof-message')!.textContent='Opening saved merchant document…';
  clearPreview();
  modal.querySelector<HTMLElement>('.merchant-document-preview')!.hidden=true;
  modal.querySelector<HTMLButtonElement>('[data-merchant-download]')!.hidden=true;
  modal.querySelector<HTMLButtonElement>('[data-merchant-remove]')!.hidden=true;
  modal.showModal();
  try {
    const found=await readMerchantDocument(order);
    if(!modal.open || revision!==ticket || active.id!==order.id || active.createdAt!==order.createdAt)return;
    record=found;
    const frame=modal.querySelector<HTMLElement>('.merchant-document-preview')!;
    frame.replaceChildren();
    frame.hidden=!found;
    modal.querySelector<HTMLButtonElement>('[data-merchant-download]')!.hidden=!found;
    modal.querySelector<HTMLButtonElement>('[data-merchant-remove]')!.hidden=!found;
    if(found){
      previewUrl=URL.createObjectURL(found.file);
      if(found.file.type==='application/pdf') {
        const link=document.createElement('a');link.href=previewUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open supplied PDF return label';frame.append(link);
      } else {
        const image=document.createElement('img');image.src=previewUrl;image.alt='Saved merchant-issued QR code or shipping label';image.style.cssText='display:block;max-width:100%;max-height:65vh;object-fit:contain;margin:auto';frame.append(image);
      }
    }
    modal.querySelector<HTMLElement>('.receipt-proof-message')!.textContent=found
      ? 'Merchant-issued document is ready to open or save. Confirm its expiry and acceptance with the retailer.'
      : 'No merchant-issued return QR code or label saved. Attach the actual file before your trip.';
  } catch {if(revision===ticket)modal.querySelector<HTMLElement>('.receipt-proof-message')!.textContent='Saved merchant document storage is unavailable. Keep the original file.';}
}
