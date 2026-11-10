import {bindRefundPayments,refundPaymentSummary} from './refund-payments-ui';
import {refundMoney} from './refund-payments';
import {load,type Order} from './store';
import {planRefund,type RefundDraft} from './refund';
import {todayISO} from './deadline';
import './refund.css';
import { bindRefundCalendar } from './refund-calendar-ui';
const h=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]!);
export function renderRefunds(orders:Order[],failed=false){
 const pending=orders.filter(o=>o.refundState==='awaiting').sort((a,b)=>(a.refundFollowUpDate||'9999').localeCompare(b.refundFollowUpDate||'9999'));
 const received=orders.filter(o=>o.refundState==='received').sort((a,b)=>(b.refundUpdatedAt||'').localeCompare(a.refundUpdatedAt||''));
 const jump=document.querySelector<HTMLElement>('#refund-jump');if(jump){jump.hidden=failed||!pending.length;jump.textContent=String(pending.length)+' refund'+(pending.length===1?'':'s')+' awaiting your check →';}
 document.querySelector('#refund-count')!.textContent=failed?'Unavailable':String(pending.length);
 const row=(o:Order)=>{const d=o.refundFollowUpDate;return '<li class="refund-row"><div><strong>'+h(o.merchant||'Unknown store')+'</strong><span class="refund-order">'+h(o.orderNo?'Order '+o.orderNo:'Purchased '+o.orderDate)+'</span></div><div class="refund-details"><strong>'+h(o.refundAmount||'Amount not recorded')+'</strong><span>'+(o.refundState==='received'?'Received · last updated '+h(o.refundUpdatedAt!.slice(0,10)):d?((d<=todayISO()?'Follow up now · ':'Follow up · ')+h(d)):'No follow-up date set')+'</span></div>'+refundPaymentSummary(o)+(o.refundNote?'<p class="refund-note">'+h(o.refundNote)+'</p>':'')+'<div class="refund-actions"><button type="button" class="button button-link" data-refund="'+h(o.id)+'">'+(o.refundState==='received'?'Review refund':'Review / mark received')+'</button>'+(o.refundState==='awaiting'?'<button type="button" class="button button-link" data-refund-calendar="'+h(o.id)+'">Set refund reminder</button>':'')+'</div></li>';};
 document.querySelector('#refund-pending')!.innerHTML=failed?'<li>Load your saved purchases to see refunds.</li>':pending.length?pending.map(row).join(''):'<li class="refund-empty">No refunds awaiting your check. After returning an item, choose “Track a refund” on its purchase.</li>';
 document.querySelector('#refund-received')!.innerHTML=received.map(row).join('');
 (document.querySelector('#refund-history') as HTMLDetailsElement).hidden=!received.length||failed;
 document.querySelector('#refund-history-count')!.textContent=String(received.length);
}
export function bindRefunds(options:{commit:(next:Order[])=>boolean}){
 bindRefundCalendar();
 const dialog=document.querySelector<HTMLDialogElement>('#refund-dialog')!,form=document.querySelector<HTMLFormElement>('#refund-form')!,error=document.querySelector<HTMLElement>('#refund-error')!;
 const payments=bindRefundPayments(form);
 let original:Order|null=null,opener:HTMLElement|null=null;
 const field=(name:string)=>form.elements.namedItem(name) as HTMLInputElement;
 const fail=(message:string)=>{error.textContent=message;error.hidden=false;error.focus();};
 function open(id:string,button:HTMLElement){try{
  const matches=load().filter(o=>o.id===id);if(matches.length!==1)throw new Error('This purchase is no longer available. Reload the tracker before trying again.');
  original=matches[0];opener=button;document.querySelector('#refund-purchase')!.textContent=original.merchant+(original.orderNo?' · Order '+original.orderNo:' · Purchased '+original.orderDate);
  field('state').value=original.refundState||'awaiting';field('amount').value=original.refundAmount||'';field('followUpDate').value=original.refundFollowUpDate||'';field('note').value=original.refundNote||'';
  (document.querySelector('#refund-stop') as HTMLButtonElement).hidden=!original.refundState;payments.open(original);error.hidden=true;dialog.showModal();
 }catch(e){document.querySelector('#refund-feedback')!.textContent=e instanceof Error?e.message:'Could not load this purchase.';}}
 document.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-refund]');if(b)open(b.dataset.refund!,b);});
 function close(){dialog.close();opener?.isConnected?opener.focus():document.querySelector<HTMLElement>('#refund-heading')!.focus();}
 document.querySelector('#refund-close')!.addEventListener('click',close);
 function commit(draft:RefundDraft|null){if(!original)return;try{
  const next=planRefund(load(),original,draft);if(!options.commit(next)){fail('Your refund change was not saved. The draft is kept here; try again when browser storage is available.');return;}
  document.querySelector('#refund-feedback')!.textContent=draft?(draft.state==='received'?'Refund recorded as received.':'Refund saved for follow-up.'):'Refund tracking removed. Purchase details are kept.';close();
 }catch(e){fail(e instanceof Error?e.message:'Could not save this refund. Your draft is kept.');}}
 form.addEventListener('submit',e=>{e.preventDefault();try{const recorded=payments.read();commit({state:field('state').value as RefundDraft['state'],amount:recorded?refundMoney(recorded.currency,recorded.expectedCents):field('amount').value,followUpDate:field('followUpDate').value,note:field('note').value,...(recorded?{payments:recorded}:{})});}catch(e){fail(e instanceof Error?e.message:'Check the payment details.');}});
 document.querySelector('#refund-stop')!.addEventListener('click',()=>{if(confirm(original?.refundPayments?'Remove this refund follow-up and its recorded payment history? The purchase stays saved.':'Remove this refund follow-up? The purchase stays saved.'))commit(null);});
}
