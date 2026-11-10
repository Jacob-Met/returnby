type DateHit={date:string;index:number};
const numeric=/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
const iso=(y:number,m:number,d:number)=>{
 if(m<1||m>12||d<1||d>31)return '';
 const dt=new Date(y,m-1,d);
 return dt.getMonth()===m-1 ? String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'):'';
};
/** A slash token is resolved only when both conventions agree or only one is valid. */
export function numericDate(year:number,first:number,second:number):string {
 const monthFirst=iso(year,first,second),dayFirst=iso(year,second,first);
 return monthFirst&&dayFirst&&monthFirst!==dayFirst?'':monthFirst||dayFirst;
}
const purchasePrefix=(text:string,index:number)=>/\b(?:order(?:\s+date)?|purchased|ordered|placed)(?:\s+on)?\s*:?\s*$/i.test(text.slice(Math.max(0,index-50),index));
export function reviewNumericDate(text:string,selected:string,hits:DateHit[]):{date:string;warning?:string} {
 const ambiguous=[...text.matchAll(numeric)].filter(m=>{
  const a=iso(+m[3],+m[1],+m[2]),b=iso(+m[3],+m[2],+m[1]);return a&&b&&a!==b;
 });
 const explicit=ambiguous.find(m=>purchasePrefix(text,m.index));
 const safePurchase=hits.some(h=>h.date===selected&&purchasePrefix(text,h.index));
 const unresolved=explicit||(!safePurchase?ambiguous[0]:undefined);
 if(!unresolved)return {date:selected};
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const first=+unresolved[1],second=+unresolved[2],year=unresolved[3];
 return {date:'',warning:'Receipt date '+unresolved[0]+' could mean '+first+' '+months[second-1]+' '+year+' or '+second+' '+months[first-1]+' '+year+'. Choose the correct order date below before saving a deadline.'};
}
