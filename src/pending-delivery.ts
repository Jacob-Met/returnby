export type PendingPurchase = { id:string; updatedAt:string|null; fields:Record<string,string> };
export const PENDING_KEY='returnby.pending-deliveries';
const LEGACY='returnby.pending-delivery';
const KEYS=['merchant','orderDate','orderNo','total','windowStartDate','windowDays'];
type StoragePort=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function portablePending(input:unknown):PendingPurchase[] {
 if(!Array.isArray(input)||input.length>100)throw Error('Keep at most 100 purchases pending delivery.');
 const ids=new Set<string>();
 return input.map(value=>{
  if(!value||typeof value!=='object'||typeof value.id!=='string'||!value.id||value.id.length>128||ids.has(value.id)||(value.updatedAt!==null&&(typeof value.updatedAt!=='string'||!Number.isFinite(Date.parse(value.updatedAt)))))throw Error('Pending purchase identity or saved time is invalid.');
  ids.add(value.id);
  if(!value.fields||typeof value.fields!=='object'||Array.isArray(value.fields))throw Error('Pending purchase details are invalid.');
  const fields:Record<string,string>={};
  for(const key of KEYS){const v=value.fields[key]??'';if(typeof v!=='string'||v.length>4096)throw Error('Pending purchase details are too long.');fields[key]=v;}
  return {id:value.id,updatedAt:value.updatedAt,fields};
 });
}
export function readPending(storage:StoragePort):{rows:PendingPurchase[];token:string} {
 const raw=storage.getItem(PENDING_KEY),legacy=storage.getItem(LEGACY);
 const token=JSON.stringify([raw,legacy]);
 if(raw!==null){const doc=JSON.parse(raw);if(doc.version!==1)throw Error('Pending purchase format is not supported.');return {rows:portablePending(doc.purchases),token};}
 if(legacy!==null)return {rows:portablePending([{id:'legacy-pending-delivery',updatedAt:null,fields:JSON.parse(legacy)}]),token};
 return {rows:[],token};
}
export function writePending(storage:StoragePort,rows:PendingPurchase[],expected:string) {
 if(readPending(storage).token!==expected)throw Error('Pending purchases changed in another tab. Reopen the purchase before changing it.');
 const clean=portablePending(rows);
 storage.setItem(PENDING_KEY,JSON.stringify({version:1,purchases:clean}));
 // The new collection is authoritative even if old-key cleanup is unavailable.
 try{storage.removeItem(LEGACY);}catch{}
 return readPending(storage);
}
export function planPendingRestore(current:PendingPurchase[],incoming:PendingPurchase[]){
 const byId=new Map(current.map(x=>[x.id,x]));
 const conflicts=incoming.filter(x=>byId.has(x.id)&&JSON.stringify(byId.get(x.id))!==JSON.stringify(x));
 const additions=incoming.filter(x=>!byId.has(x.id));
 return {conflicts,additions,next:portablePending([...current,...additions])};
}
