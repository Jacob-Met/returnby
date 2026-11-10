import { mergeTripLibraries, readTripLibrary, saveTripLibrary, type TripLibrary } from './trip-library';

export function bindTripLibraryRestore(host: HTMLElement | null, tell:(text:string,error?:boolean)=>void) {
  let incoming:TripLibrary|null=null;
  let expected:string|null=null;
  function show(value:TripLibrary|null) {
    incoming=value;
    if(!host)return;
    host.hidden=!incoming?.trips.length;
    host.replaceChildren();
    if(!incoming?.trips.length)return;
    try {
      const current=readTripLibrary(localStorage);expected=current.raw;
      const plan=mergeTripLibraries(current.library,incoming);
      const heading=document.createElement('h3');heading.textContent='Named trip plans';
      const summary=document.createElement('p');summary.textContent=plan.added+' new copies; '+plan.skipped+' already saved'+(plan.conflicts.length?'; '+plan.conflicts.length+' changed copies will stay as they are in this browser.':'.');
      const note=document.createElement('p');note.textContent='Restoring copies leaves your working trip and purchases unchanged. Import the purchases above before opening a plan on a new browser. Current dates are checked when you open a saved copy.';
      const list=document.createElement('ul');
      for(const trip of incoming.trips) {
        const item=document.createElement('li');
        const details=document.createElement('details');
        const title=document.createElement('summary');title.textContent=trip.name+' · '+(trip.plan.tripDate||'Date not chosen')+' · '+trip.plan.orders.filter(row=>row.selected).length+' selected orders';
        details.append(title);
        const orders=document.createElement('ul');
        for(const row of trip.plan.orders) {
          const order=document.createElement('li');
          order.textContent=(row.merchant||'Unnamed store')+(row.orderNo?' #'+row.orderNo:'')+' — '+(row.selected?'Selected':'Not selected')+
            (row.notes?'; Notes: '+row.notes:'; No notes');
          orders.append(order);
        }
        details.append(orders);item.append(details);list.append(item);
      }
      const restore=document.createElement('button');restore.type='button';restore.className='button button-primary';restore.id='backup-trip-library-restore';
      restore.textContent='Add '+plan.added+' named '+(plan.added===1?'plan':'plans');restore.disabled=!plan.added;
      restore.addEventListener('click',()=>{
        if(!incoming)return;
        try {
          const fresh=readTripLibrary(localStorage);
          if(fresh.raw!==expected){show(incoming);tell('Named plans changed since the preview. Review the refreshed list before restoring.',true);return;}
          const latest=mergeTripLibraries(fresh.library,incoming);
          if(!latest.added)return;
          saveTripLibrary(localStorage,latest.next,fresh.raw);
          show(incoming);
          tell('Added '+latest.added+' named trip '+(latest.added===1?'plan.':'plans.')+' Existing copies, your working trip and purchases were kept.');
        }catch(error){tell(error instanceof Error?error.message:'Saved plans could not be restored. Your review is still open.',true);}
      });
      host.append(heading,summary,note,list,restore);
    }catch(error){tell(error instanceof Error?error.message:'Saved plans could not be read.',true);}
  }
  return {show};
}
