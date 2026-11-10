export const REFUND_CURRENCIES = ['USD','EUR','GBP','CAD','AUD','NZD','CHF'] as const;
export type RefundCurrency = typeof REFUND_CURRENCIES[number];
export type RefundCredit = {id:string;date:string;amountCents:number;note:string};
export type RefundPayments = {currency:RefundCurrency;expectedCents:number;credits:RefundCredit[]};
export function parseRefundMoney(value:string):number {
 if(!/^\d{1,9}(?:\.\d{1,2})?$/.test(value.trim()))throw Error('Enter an amount with at most two decimal places, without a currency symbol or separators.');
 const [whole,fraction='']=value.trim().split('.');
 const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents<=0)throw Error('Enter an amount greater than zero.');
 return cents;
}
export const refundDecimal=(cents:number)=>String(Math.floor(cents/100))+'.'+String(cents%100).padStart(2,'0');
export const refundMoney=(currency:string,cents:number)=>currency+' '+refundDecimal(cents);
function validDay(value:unknown):boolean {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1000-01-01')return false;
 const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function validRefundPayments(value:unknown):value is RefundPayments {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as RefundPayments;
 if(Object.keys(p).some(k=>!['currency','expectedCents','credits'].includes(k))||!REFUND_CURRENCIES.includes(p.currency)||!Number.isSafeInteger(p.expectedCents)||p.expectedCents<=0||p.expectedCents>99999999999||!Array.isArray(p.credits)||p.credits.length>100)return false;
 const ids=new Set<string>();
 return p.credits.every(c=>{
  if(!c||typeof c!=='object'||Object.keys(c).some(k=>!['id','date','amountCents','note'].includes(k))||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id)||!validDay(c.date)||!Number.isSafeInteger(c.amountCents)||c.amountCents<=0||c.amountCents>99999999999||typeof c.note!=='string'||c.note.length>500)return false;
  ids.add(c.id);return true;
 });
}
export function refundBalance(p:RefundPayments){
 const received=p.credits.reduce((sum,c)=>sum+c.amountCents,0);
 return {received,remaining:Math.max(0,p.expectedCents-received),extra:Math.max(0,received-p.expectedCents)};
}
