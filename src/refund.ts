import { validRefundPayments, refundBalance, type RefundPayments } from './refund-payments';
import type { Order } from './store';
export const REFUND_KEYS = ['refundState','refundAmount','refundFollowUpDate','refundNote','refundUpdatedAt','refundPayments'] as const;
export type RefundDraft = {state:'awaiting'|'received';amount:string;followUpDate:string;note:string;payments?:RefundPayments};
export function validRefundDate(v:unknown):v is string {
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number(v.slice(0,4))<1000)return false;
 const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;
}
export function hasValidRefund(r:Record<string,unknown>):boolean {
 if(r.refundState===undefined)return REFUND_KEYS.every(k=>r[k]===undefined);
 return (r.refundPayments===undefined||validRefundPayments(r.refundPayments)) && (r.refundState==='awaiting'||r.refundState==='received')&&typeof r.refundAmount==='string'&&r.refundAmount.length<=120&&typeof r.refundNote==='string'&&r.refundNote.length<=2000&&(r.refundFollowUpDate===''||validRefundDate(r.refundFollowUpDate))&&typeof r.refundUpdatedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(r.refundUpdatedAt)&&Number.isFinite(Date.parse(r.refundUpdatedAt));
}
export function planRefund(current:Order[],original:Order,draft:RefundDraft|null,now=new Date()):Order[] {
 const matches=current.filter(r=>r.id===original.id);
 if(matches.length!==1||JSON.stringify(matches[0])!==JSON.stringify(original))throw new Error('This purchase changed in another tab or was removed. Your draft is kept. Close and reopen the refund to review the latest saved details.');
 const next={...matches[0]};
 if(draft){if(draft.payments){if(!validRefundPayments(draft.payments))throw new Error('Check the expected amount and each received payment.');if(original.refundPayments?.credits.length&&original.refundPayments.currency!==draft.payments.currency)throw new Error('Keep the currency of existing payments. Remove them explicitly before changing currency.');if(draft.state==='received'&&refundBalance(draft.payments).remaining>0)throw new Error('Some of the expected refund is still outstanding. Keep Awaiting refund, or correct the expected amount or recorded payments.');next.refundPayments=structuredClone(draft.payments);}else if(original.refundPayments){throw new Error('Keep the recorded payments when editing this refund.');}Object.assign(next,{refundState:draft.state,refundAmount:draft.amount.trim(),refundFollowUpDate:draft.followUpDate,refundNote:draft.note.trim(),refundUpdatedAt:now.toISOString()});if(!hasValidRefund(next))throw new Error('Check the follow-up date and shorten the amount or notes before saving.');}
 else REFUND_KEYS.forEach(k=>delete next[k]);
 return current.map(r=>r.id===original.id?next:r);
}
