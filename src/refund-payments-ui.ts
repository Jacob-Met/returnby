import type {Order} from './store';
import {REFUND_CURRENCIES,parseRefundMoney,refundDecimal,refundMoney,refundBalance,validRefundPayments,type RefundPayments} from './refund-payments';
const escape=(v:string)=>v.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
function createRefundPayments(form:HTMLFormElement){
 const host=document.createElement('section');host.className='refund-payments';
 const amount=form.elements.namedItem('amount') as HTMLInputElement;
 amount.closest('label')!.after(host);
 let enabled=false,original:RefundPayments|undefined;
 const read=():RefundPayments|undefined=>{
  if(!enabled)return undefined;
  const currency=(host.querySelector('[data-currency]') as HTMLSelectElement).value as RefundPayments['currency'];
  const expectedCents=parseRefundMoney((host.querySelector('[data-expected]') as HTMLInputElement).value);
  const credits=Array.from(host.querySelectorAll<HTMLElement>('[data-credit]')).map(row=>({
   id:row.dataset.credit!,date:(row.querySelector('[data-date]') as HTMLInputElement).value,
   amountCents:parseRefundMoney((row.querySelector('[data-amount]') as HTMLInputElement).value),
   note:(row.querySelector('[data-note]') as HTMLInputElement).value.trim()
  }));
  const p={currency,expectedCents,credits};
  if(!validRefundPayments(p))throw Error('Choose a supported currency and check each payment date and amount.');
  return p;
 };
 const summary=()=>{
  const status=host.querySelector<HTMLElement>('[data-balance]');if(!status)return;
  try{const p=read()!,b=refundBalance(p);status.textContent='Received '+refundMoney(p.currency,b.received)+' · Still owed '+refundMoney(p.currency,b.remaining)+(b.extra?' · '+refundMoney(p.currency,b.extra)+' above expected':'');}
  catch{status.textContent='Complete the currency, expected amount and payment details to see the balance.';}
 };
 function row(id:string,date='',value='',note=''){
  const item=document.createElement('li');item.dataset.credit=id;
  item.innerHTML='<div class="credit-fields"><label>Date received<input data-date type="date" min="1000-01-01" max="9999-12-31" value="'+escape(date)+'"></label><label>Amount received<input data-amount inputmode="decimal" placeholder="0.00" value="'+escape(value)+'"></label></div><label>Reference or note (optional)<input data-note maxlength="500" value="'+escape(note)+'"></label><button class="button button-link" type="button" data-remove>Remove this payment</button>';
  item.querySelector('[data-remove]')!.addEventListener('click',()=>{item.remove();summary();host.querySelector<HTMLElement>('[data-add]')!.focus();});
  host.querySelector('[data-credits]')!.append(item);return item;
 }
 function render(){
  amount.readOnly=enabled;
  if(!enabled){host.innerHTML='<button class="button button-link" type="button" data-enable>Track partial payments</button><p class="list-note">Keep each credit you received and the amount still owed. Your existing amount and notes stay until you save changes.</p>';host.querySelector('[data-enable]')!.addEventListener('click',()=>{enabled=true;render();host.querySelector<HTMLElement>('[data-currency]')!.focus();});return;}
  host.innerHTML='<h3>Refund payments</h3><p>Record credits you checked yourself. This does not read your bank or confirm a merchant payment.</p><div class="credit-fields"><label>Currency<select data-currency><option value="">Choose currency</option>'+REFUND_CURRENCIES.map(c=>'<option>'+c+'</option>').join('')+'</select></label><label>Total refund expected<input data-expected inputmode="decimal" placeholder="0.00"></label></div><p class="list-note">Amounts use two decimal places. For another currency, keep a refund note instead.</p><p data-balance class="refund-balance" role="status" aria-live="polite"></p><ol data-credits></ol><button class="button button-link" type="button" data-add>Add a received payment</button><p class="list-note">Edits and removals take effect only when you choose Save refund. A zero balance does not automatically mark the refund received.</p>';
  const currency=host.querySelector<HTMLSelectElement>('[data-currency]')!;
  currency.value=original?.currency||'';currency.disabled=!!original?.credits.length;
  (host.querySelector('[data-expected]') as HTMLInputElement).value=original?refundDecimal(original.expectedCents):'';
  for(const credit of original?.credits||[])row(credit.id,credit.date,refundDecimal(credit.amountCents),credit.note);
  host.querySelector('[data-add]')!.addEventListener('click',()=>{const item=row(crypto.randomUUID());item.querySelector<HTMLElement>('[data-date]')!.focus();summary();});
  summary();
 }
 host.addEventListener('input',summary);host.addEventListener('change',summary);
 return {open(order:Order){original=order.refundPayments?structuredClone(order.refundPayments):undefined;enabled=!!original;render();},read};
}
export function refundPaymentSummary(order:Order):string {
 const p=order.refundPayments;if(!p)return '';
 const b=refundBalance(p);
 return '<p class="refund-balance">Received <strong>'+refundMoney(p.currency,b.received)+'</strong> · Still owed <strong>'+refundMoney(p.currency,b.remaining)+'</strong>'+(b.extra?' · '+refundMoney(p.currency,b.extra)+' above expected':'')+'</p>';
}

// Construct the optional editor when a refund is opened, not during tracker startup.
export function bindRefundPayments(form:HTMLFormElement){
 let editor:ReturnType<typeof createRefundPayments>|undefined;
 return {open(order:Order){editor??=createRefundPayments(form);editor.open(order);},read(){return editor?.read();}};
}
