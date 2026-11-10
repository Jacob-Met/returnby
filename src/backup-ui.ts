import { itemSummary } from './order-items';
import { bindTripLibraryRestore } from './trip-library-backup-ui';
import { readTripLibrary, TripLibraryError, type TripLibrary } from './trip-library';
import {readPending,writePending,planPendingRestore,type PendingPurchase} from './pending-delivery';
import { planResolvedImport, backupFieldLabel, backupFieldValue, type BackupChoice, type ResolvedImportPlan } from './backup-resolution';
import { BackupError, exportBackup, MAX_BACKUP_BYTES, parseBackupDocument } from './backup';
import { returnDueDate } from './deadline';
import { completionLabel } from './completion';
import type { Order } from './store';
import { parsePortableTrip, prepareTripRestore, TripBackupError } from './trip-backup';
import { readTripPlan, saveTripPlan, TripPlanError, type TripPlan } from './trip-plan';

type Tracker = { read: () => unknown; commit: (orders: Order[]) => boolean };
const PAGE_SIZE = 25;

export function bindBackup(tracker: Tracker) {
  const get = <T extends HTMLElement>(id: string) => document.querySelector(`#${id}`) as T;
  const fileInput = get<HTMLInputElement>('backup-file');
  const panel = get<HTMLElement>('backup-preview');
  const summary = get<HTMLElement>('backup-summary');
  const rows = get<HTMLUListElement>('backup-rows');
  const message = get<HTMLElement>('backup-message');
  const apply = get<HTMLButtonElement>('backup-apply');
  const previous = get<HTMLButtonElement>('backup-previous');
  const next = get<HTMLButtonElement>('backup-next');
  let incoming: Order[] | null = null;
  let incomingLibrary:TripLibrary|null=null;
  const libraryRestore=bindTripLibraryRestore(get<HTMLElement>('backup-trip-library'),tell);
  let incomingPending:PendingPurchase[]=[];
  let pendingExpected:string|null=null;
  const pendingPanel=get<HTMLElement>('backup-pending');
  function showPending(){
    pendingPanel.hidden=!incomingPending.length;
    if(!incomingPending.length)return;
    pendingPanel.replaceChildren();
    const saved=readPending(localStorage);pendingExpected=saved.token;
    const plan=planPendingRestore(saved.rows,incomingPending);
    const title=document.createElement('h3');title.textContent='Purchases awaiting delivery';
    const description=document.createElement('p');description.textContent=plan.additions.length+' to add; '+plan.conflicts.length+' with changed details. These have no deadline until delivery is confirmed.';
    const list=document.createElement('ul');for(const row of incomingPending){const li=document.createElement('li');li.textContent=(row.fields.merchant||'Purchase')+(row.fields.orderNo?' #'+row.fields.orderNo:'')+' — ordered '+(row.fields.orderDate||'date to review');list.append(li);}
    const restore=document.createElement('button');restore.type='button';restore.className='button';restore.textContent='Restore pending purchases';restore.disabled=!!plan.conflicts.length||!plan.additions.length;
    restore.onclick=()=>{try{const now=readPending(localStorage);if(now.token!==pendingExpected){showPending();tell('Pending purchases changed. Review the refreshed list before restoring.',true);return;}const latest=planPendingRestore(now.rows,incomingPending);if(latest.conflicts.length)throw Error('Pending details differ. Review current pending purchases before restoring this file.');writePending(localStorage,latest.next,now.token);window.dispatchEvent(new Event('returnby-pending-changed'));showPending();tell('Pending purchases restored. Confirm delivery before creating their deadlines.');}catch(e){tell(errorText(e),true);}};
    pendingPanel.append(title,description,list,restore);
  }


  let preview: ResolvedImportPlan | null = null;
  const choices = new Map<string, BackupChoice>();
  let generation = 0;
  let page = 0;


  const tripPanel=get<HTMLElement>('backup-trip');
  const tripSummary=get<HTMLElement>('backup-trip-summary');
  const tripRows=get<HTMLElement>('backup-trip-orders');
  const tripNote=get<HTMLElement>('backup-trip-note');
  const tripRestore=get<HTMLButtonElement>('backup-trip-restore');
  const tripReplace=get<HTMLInputElement>('backup-trip-replace');
  const tripReplaceLabel=get<HTMLElement>('backup-trip-replace-label');
  let incomingTrip:TripPlan|null=null;
  let tripExpectedRaw:string|null=null;
  let tripNeedsReplacement=false;
  let tripAvailable=false;

  function showTrip() {
    tripPanel.hidden=!incomingTrip;
    tripRestore.disabled=true;tripAvailable=false;tripReplace.checked=false;
    if(!incomingTrip || !incoming)return;
    try {
      const current=planResolvedImport(tracker.read(),incoming,choices);
      const prepared=prepareTripRestore(incomingTrip,current.next);
      const saved=readTripPlan(localStorage);
      tripExpectedRaw=saved.raw;
      const same=saved.plan && JSON.stringify(parsePortableTrip(saved.plan))===JSON.stringify(prepared.plan);
      tripNeedsReplacement=!!saved.plan&&!same;
      tripReplaceLabel.hidden=!tripNeedsReplacement;
      tripSummary.textContent=(incomingTrip.tripDate || 'Date not chosen')+' · '+prepared.selected+' selected '+(prepared.selected===1?'order':'orders')+' · '+incomingTrip.orders.filter(o=>o.notes).length+' packing notes';
      tripRows.replaceChildren(...incomingTrip.orders.map(entry=>{
        const li=document.createElement('li');
        li.textContent=(entry.merchant || 'Unknown store')+(entry.orderNo?' #'+entry.orderNo:'')+' — '+(entry.selected?'Selected':'Not selected')+
          '; '+[entry.packed?'item packed':'item not packed',entry.receiptReady?'receipt ready':'receipt not ready',entry.instructionsChecked?'instructions checked':'instructions not checked'].join(', ')+(entry.notes?'. Notes: '+entry.notes:'');
        return li;
      }));
      const changes=prepared.changed.length?' Changed order details will require checking store instructions again.':'';
      const unavailable=prepared.unavailable.length?' '+prepared.unavailable.length+' unavailable orders will stay unselected; their notes are kept.':'';
      if(current.conflicts)tripNote.textContent='Resolve the conflicting order IDs before restoring this trip. Your current trip will stay.';
      else if(current.added||current.replaced)tripNote.textContent='First import the reviewed orders above. Then restore this trip in a separate step.'+changes+unavailable;
      else if(same)tripNote.textContent='This trip is already saved in this browser.';
      else {
        tripAvailable=true;tripRestore.disabled=tripNeedsReplacement;
        tripNote.textContent=(tripNeedsReplacement?'This browser already has a different trip. Confirm replacement below, or leave it unchanged.':'Your current orders are ready. Restore the date, packing checks and notes when you are ready.')+changes+unavailable;
      }
    } catch(error) {tripNote.textContent=error instanceof Error?error.message:'The saved trip could not be read.';}
  }
  tripReplace.addEventListener('change',()=>{tripRestore.disabled=!tripAvailable||(tripNeedsReplacement&&!tripReplace.checked);});
  tripRestore.addEventListener('click',()=>{
    if(!incomingTrip||!incoming||!tripAvailable||(tripNeedsReplacement&&!tripReplace.checked))return;
    try {
      const current=planResolvedImport(tracker.read(),incoming,choices);
      if(current.conflicts||current.added||current.replaced){show(current);tell('Saved orders changed. Review and import them before restoring the trip.',true);return;}
      const saved=readTripPlan(localStorage);
      if(saved.raw!==tripExpectedRaw){showTrip();tripNote.textContent='The saved trip changed in another tab. Review it again before choosing replacement.';tell(tripNote.textContent,true);return;}
      const prepared=prepareTripRestore(incomingTrip,current.next);
      saveTripPlan(localStorage,prepared.plan,tripExpectedRaw);
      incomingTrip=null;tripRestore.disabled=true;tripReplaceLabel.hidden=true;
      tripNote.textContent='Trip restored on this device. Open the planner to review current deadlines before travelling.';
      tell('Trip restored. Your packing notes and checks are ready in the return-trip planner.');
    } catch(error) {tripNote.textContent=error instanceof Error?error.message:'The trip could not be restored. Your review is still open.';tell(tripNote.textContent,true);}
  });

  function tell(value: string, error = false) {
    message.textContent = value;
    message.hidden = !value;
    message.setAttribute('role', error ? 'alert' : 'status');
  }

  function errorText(error: unknown) {
    return (error instanceof BackupError || error instanceof TripBackupError || error instanceof TripPlanError || error instanceof TripLibraryError) ? error.message : "Couldn't read saved returns or this file. Check browser storage and try again.";
  }

  function reset() {
    generation++;
    incoming = null;
    incomingLibrary=null;libraryRestore.show(null);
    incomingPending=[];pendingPanel.hidden=true;
    choices.clear();
    incomingTrip = null;
    tripPanel.hidden = true;
    preview = null;
    panel.hidden = true;
    apply.disabled = true;
    fileInput.value = '';
  }

  function renderPage() {
    if (!preview) return;
    const start = page * PAGE_SIZE;
    rows.replaceChildren(...preview.rows.slice(start, start + PAGE_SIZE).map(row => {
      const li = document.createElement('li');
      const o = row.action === 'keep' && row.current ? row.current : row.order;
      const action = ({add:'Add',skip:'Already saved',conflict:'Choose a version',keep:'Keep current',replace:'Use backup'})[row.action];
      const source = o.windowSource === 'policy' ? 'saved store policy' : o.windowSource === 'default' ? 'saved fallback' : 'your saved rule';
      const lifecycle = o.completedAt === undefined ? 'Open' : `${completionLabel(o)} ${o.completedAt.slice(0, 10)}`;
      const changed = row.changedFields.map(backupFieldLabel);
      li.textContent = `${action}: ${o.merchant || 'Unknown store'}${o.orderNo ? ` #${o.orderNo}` : ''}${o.total ? ` · ${o.total}` : ''} — ${lifecycle}; ordered ${o.orderDate}, ${o.completedAt === undefined ? 'return by' : 'original return-by'} ${returnDueDate(o)} (${o.windowDays} days${o.windowStartDate ? ` from confirmed start ${o.windowStartDate}` : ''}; ${source})${changed.length ? `. Different fields: ${changed.join(', ')}.` : ''}`;
      if (o.items) {
        const detail = document.createElement('details');
        const heading = document.createElement('summary');
        heading.textContent = 'Items: ' + itemSummary(o);
        const itemList = document.createElement('ul');
        for (const item of o.items) {
          const entry = document.createElement('li');
          entry.textContent = item.name + ' — bought ' + item.quantity + ', returned ' + item.returned + ', kept ' + item.kept + ', still open ' + (item.quantity - item.returned - item.kept) + '.';
          itemList.append(entry);
        }
        detail.append(heading, itemList);
        li.append(detail);
      }
      if (row.current) {
        const comparison = document.createElement('div');
        comparison.className = 'backup-comparison';
        for (const key of row.changedFields) {
          const field = document.createElement('section');
          const label = document.createElement('strong'); label.textContent = backupFieldLabel(key);
          const current = document.createElement('p'); current.textContent = 'Current: ' + backupFieldValue(row.current, key);
          const backup = document.createElement('p'); backup.textContent = 'Backup: ' + backupFieldValue(row.order, key);
          field.append(label, current, backup); comparison.append(field);
        }
        const label = document.createElement('label'); label.className = 'backup-choice';
        label.textContent = 'Which complete purchase should this browser keep?';
        const select = document.createElement('select'); select.dataset.backupChoice = o.id;
        for (const [value,text] of [['','Choose a version'],['keep','Keep current purchase'],['replace','Use purchase from backup']]) {
          const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
        }
        select.value = choices.get(o.id) || '';
        select.addEventListener('change', () => {
          const value = select.value;
          if (value === 'keep' || value === 'replace') choices.set(o.id, value); else choices.delete(o.id);
          if (!incoming || !preview) return;
          try {
            const current = planResolvedImport(tracker.read(), incoming, choices);
            if (current.snapshot !== preview.snapshot) { choices.clear(); show(planResolvedImport(tracker.read(), incoming)); tell('Saved purchases changed. Compare the current values and choose again.', true); return; }
            show(current, false);
            for (const control of Array.from(rows.querySelectorAll<HTMLSelectElement>('select'))) if (control.dataset.backupChoice === o.id) control.focus();
          } catch (error) { tell(errorText(error), true); }
        });
        label.append(select); li.append(comparison, label);
      }
      return li;
    }));
    get('backup-page').textContent = preview.rows.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, preview.rows.length)} of ${preview.rows.length} orders` : 'No orders in this backup';
    previous.disabled = page === 0;
    next.disabled = start + PAGE_SIZE >= preview.rows.length;
  }

  function show(plan: ResolvedImportPlan, focus = true) {
    preview = plan;
    if (focus) page = 0;
    summary.textContent = [[plan.added, 'to add'], [plan.replaced, 'to update'], [plan.kept, 'keep current'], [plan.skipped, 'already saved'], [plan.conflicts, 'need a choice']].filter(([count]) => Number(count) > 0).map(([count, label]) => count + ' ' + label).join(' · ') || 'No purchases in this backup';
    apply.textContent = `Apply ${plan.added} additions and ${plan.replaced} updates`;
    apply.disabled = plan.added + plan.replaced === 0;
    panel.hidden = false;
    renderPage();
    showTrip();
    libraryRestore.show(incomingLibrary);
    if (plan.conflicts) tell('Compare the current and backup values before choosing a version. Unreviewed differences stay current; you can apply the new purchases and chosen updates without replacing them.');
    else if (!plan.added && !plan.replaced && plan.kept) tell(incomingTrip ? 'Your current purchase versions will stay. Review the trip separately below.' : 'Your current purchase versions will stay. No additions or updates are selected.');
    else if (!plan.added && !plan.replaced) tell(incomingLibrary?.trips.length?'Purchases need no changes. Review the named trip plans separately below.':incomingPending.length?'Saved deadlines need no changes. Review the pending purchases below before restoring them.':incomingTrip?'All orders are already saved. Review the trip below before restoring it.':'Everything in this backup is already saved, or the backup is empty. Nothing will change.');
    else tell('Review additions and updates below, then choose Apply. Only purchases you chose from the backup will replace current details.');
    if (focus) summary.focus();
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    reset();
    if (!file) { tell(''); return; }
    const ticket = generation;
    tell('Reading backup…');
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new BackupError('Choose a backup no larger than 5 MiB.');
      const contents = await file.text();
      if (ticket !== generation) return;
      const parsed = parseBackupDocument(contents);
      incoming = parsed.orders;
      incomingTrip = parsed.trip;
      incomingPending=parsed.pending||[];
      incomingLibrary=parsed.tripLibrary||null;
      show(planResolvedImport(tracker.read(), incoming, choices));
      showPending();
    } catch (error) {
      if (ticket !== generation) return;
      reset();
      tell(errorText(error), true);
    }
  });

  get('backup-cancel').addEventListener('click', () => { reset(); tell('Import cancelled. Your tracker is unchanged.'); });
  previous.addEventListener('click', () => { if (page > 0) { page--; renderPage(); } });
  next.addEventListener('click', () => { if (preview && (page + 1) * PAGE_SIZE < preview.rows.length) { page++; renderPage(); } });

  apply.addEventListener('click', () => {
    if (!incoming || !preview) return;
    try {
      // Read again at commitment: another save or tab may have changed the list
      // while the user reviewed the file. A changed plan needs fresh review.
      const current = planResolvedImport(tracker.read(), incoming, choices);
      if (current.snapshot !== preview.snapshot) {
        choices.clear();
        show(planResolvedImport(tracker.read(), incoming));
        tell('Saved returns changed since the preview. Review this updated plan before importing.', true);
        return;
      }
      if (!current.added && !current.replaced) return;
      if (!tracker.commit(current.next)) {
        tell("The backup wasn't imported because browser storage refused the change. Your preview is kept so you can try again.", true);
        return;
      }
      if(incomingTrip || current.conflicts || incomingPending.length || incomingLibrary){show(planResolvedImport(tracker.read(),incoming,choices));showPending();}else reset();
      tell(`Added ${current.added} purchases and updated ${current.replaced}. Kept ${current.kept + current.conflicts} current versions; ${current.skipped} were already saved.${current.conflicts ? ' Differences above still need your choice.' : ''}${incomingTrip ? ' Review the trip separately below.' : ''}`);
    } catch (error) { tell(errorText(error), true); }
  });

  get('backup-export').addEventListener('click', () => {
    let url: string | undefined;
    try {
      const now = new Date();
      const trip = readTripPlan(localStorage).plan;
      const library=readTripLibrary(localStorage).library;
      const content = exportBackup(tracker.read(), now, trip,readPending(localStorage).rows,library);
      url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `returnby-backup-${now.toISOString().slice(0, 10)}.json`;
      link.click();
      tell(library.trips.length?'Backup download requested with '+library.trips.length+' named trip plans, your working trip, purchases and pending reviews. Keep private packing notes secure.':trip?'Backup download requested with your saved orders and trip, including private packing notes.':'Backup download requested. Keep this file private: it contains your saved order details.');
    } catch (error) { tell(errorText(error), true); }
    finally {
      // Let the browser start its download before releasing the object URL.
      if (url) {
        const downloaded = url;
        setTimeout(() => URL.revokeObjectURL(downloaded), 1000);
      }
    }
  });
}
