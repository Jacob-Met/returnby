import './trip-library.css';
import { captureTrip, readTripLibrary, saveTripLibrary, TRIP_LIBRARY_KEY, type TripLibrary } from './trip-library';
import type { TripPlan } from './trip-plan';

export function bindTripLibrary(options: { current: () => TripPlan; open: (plan: TripPlan) => void }) {
  const panel = document.querySelector<HTMLElement>('#trip-library');
  if (!panel) return;
  const input = panel.querySelector<HTMLInputElement>('#trip-copy-name')!;
  const save = panel.querySelector<HTMLButtonElement>('#save-trip-copy')!;
  const list = panel.querySelector<HTMLElement>('#saved-trip-list')!;
  const status = panel.querySelector<HTMLElement>('#trip-library-status')!;
  const count = panel.querySelector<HTMLElement>('#saved-trip-count')!;
  const retry = panel.querySelector<HTMLButtonElement>('#reload-trip-library')!;
  const storage = { getItem:(key:string)=>localStorage.getItem(key), setItem:(key:string,value:string)=>localStorage.setItem(key,value) };
  let library: TripLibrary = {version:1,trips:[]};
  let raw: string | null = null;
  let readable = false;

  function message(text:string,error=false) {
    status.textContent=text;
    status.classList.toggle('error',error);
  }
  function render() {
    count.textContent=String(library.trips.length);
    list.replaceChildren();
    if(!library.trips.length) {
      const empty=document.createElement('p');
      empty.className='trip-library-empty';
      empty.textContent='No named plans yet. Keep different errands here without replacing their packing notes.';
      list.append(empty);
    }
    for(const trip of [...library.trips].reverse()) {
      const row=document.createElement('li');
      const info=document.createElement('div');
      const name=document.createElement('strong');name.textContent=trip.name;
      const detail=document.createElement('p');
      const n=trip.plan.orders.filter(order=>order.selected).length;
      detail.textContent=(trip.plan.tripDate || 'Date not chosen')+' · '+n+(n===1?' selected order':' selected orders')+' · copy saved '+trip.savedAt.slice(0,10);
      info.append(name,detail);
      const actions=document.createElement('div');actions.className='saved-trip-actions';
      const open=document.createElement('button');open.type='button';open.className='text-button';open.textContent='Open plan';
      open.setAttribute('aria-label','Open '+trip.name);open.dataset.tripLibraryOpen=trip.id;
      open.addEventListener('click',()=>{
        try {
          if(!isCurrent())return;
          const current=options.current();
          if(current.orders.length && JSON.stringify(current)!==JSON.stringify(trip.plan) &&
             !window.confirm('Open “'+trip.name+'” and replace the current working trip? Save a named copy of the current trip first if you need its checks or notes.'))return;
          options.open(trip.plan);
          message('Opened “'+trip.name+'”. Current order details were checked again. The saved copy stays unchanged.');
          document.querySelector<HTMLInputElement>('#trip-date')?.focus();
        }catch(error){message(error instanceof Error?error.message:'The plan could not be opened. Your current trip is unchanged.',true);}
      });
      const rename=document.createElement('button');rename.type='button';rename.className='text-button';rename.textContent='Rename';
      rename.setAttribute('aria-label','Rename '+trip.name);
      rename.addEventListener('click',()=>{
        const next=window.prompt('Name this saved trip plan',trip.name);
        if(next===null)return;
        try {
          if(!isCurrent())return;
          const updated={...library,trips:library.trips.map(value=>value.id===trip.id?{...value,name:next}:value)};
          raw=saveTripLibrary(storage,updated,raw);
          library=readTripLibrary(storage).library;
          render();message('Saved plan renamed.');
        }catch(error){message(error instanceof Error?error.message:'The name could not be saved.',true);}
      });
      actions.append(open,rename);row.append(info,actions);list.append(row);
    }
  }
  function load() {
    try {
      const saved=readTripLibrary(storage);library=saved.library;raw=saved.raw;readable=true;
      save.disabled=false;retry.hidden=true;render();message('');
    }catch(error){readable=false;save.disabled=true;retry.hidden=false;message(error instanceof Error?error.message:'Saved plans could not be read.',true);}
  }
  function isCurrent():boolean {
    const saved=readTripLibrary(storage);
    if(saved.raw===raw)return true;
    library=saved.library;raw=saved.raw;render();
    message('Saved plans changed in another tab. The list is refreshed; choose your action again.',true);
    return false;
  }
  save.addEventListener('click',()=>{
    if(!input.reportValidity() || !readable)return;
    try {
      if(!isCurrent())return;
      const trip=captureTrip(input.value,options.current(),crypto.randomUUID(),new Date().toISOString());
      if(library.trips.some(value=>value.name.toLocaleLowerCase()===trip.name.toLocaleLowerCase())) {
        message('There is already a plan with this name. Choose another name so the copies are easy to distinguish.',true);input.focus();return;
      }
      const next:TripLibrary={version:1,trips:[...library.trips,trip]};
      raw=saveTripLibrary(storage,next,raw);library=next;input.value='';render();
      message('“'+trip.name+'” saved as a separate copy. Continue working on your current trip.');
    }catch(error){message(error instanceof Error?error.message:'The plan copy could not be saved.',true);}
  });
  retry.addEventListener('click',load);
  window.addEventListener('storage',event=>{if(event.key===TRIP_LIBRARY_KEY || event.key===null)load();});
  load();
}
