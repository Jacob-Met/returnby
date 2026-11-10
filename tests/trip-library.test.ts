import { describe, it, expect } from 'vitest';
import { captureTrip, readTripLibrary, saveTripLibrary, TRIP_LIBRARY_KEY } from '../src/trip-library';
import { emptyTripPlan, planOrder, alignTripPlan } from '../src/trip-plan';
import type { Order } from '../src/store';
const order: Order = {id:'coat', merchant:'Cedar', orderNo:'C-18', orderDate:'2026-11-01', windowDays:30, windowSource:'user', createdAt:'2026-11-01T12:00:00Z'};
const plan = () => ({...emptyTripPlan('2026-11-15'), orders:[{...planOrder(order), packed:true, instructionsChecked:true, notes:'Locker 12; bring QR'}]});
const stamp = '2026-11-10T12:00:00Z';
describe('separate named return trips', () => {
  it('keeps separate immutable packing copies without writing the active trip or orders', () => {
    const original=plan(), first=captureTrip('Friday lockers',original,'fri',stamp);
    original.orders[0].notes='Changed active note';
    const second=captureTrip('Next week shops',{...original,tripDate:'2026-11-22'},'next',stamp);
    let raw:string|null=null;const keys:string[]=[];
    const storage={getItem:()=>raw,setItem:(key:string,value:string)=>{keys.push(key);raw=value;}};
    saveTripLibrary(storage,{version:1,trips:[first,second]},null);
    expect(readTripLibrary(storage).library.trips.map(t=>[t.name,t.plan.tripDate,t.plan.orders[0].notes])).toEqual([
      ['Friday lockers','2026-11-15','Locker 12; bring QR'],['Next week shops','2026-11-22','Changed active note']]);
    expect(keys).toEqual([TRIP_LIBRARY_KEY]);
  });
  it('reopens a copy using current dates and requires instruction review after order edits', () => {
    const copy=captureTrip('Friday',plan(),'fri',stamp);
    const aligned=alignTripPlan(copy.plan,{raw:null,orders:[{...order,windowStartDate:'2026-11-06',windowDays:14}]});
    expect(aligned.changed).toEqual(['Cedar']);
    expect(aligned.plan.orders[0]).toMatchObject({packed:true,instructionsChecked:false,notes:'Locker 12; bring QR'});
    expect(copy.plan.orders[0].instructionsChecked).toBe(true);
  });
  it('keeps unavailable-order notes but excludes the order when reopening', () => {
    const aligned=alignTripPlan(captureTrip('Friday',plan(),'fri',stamp).plan,{raw:null,orders:[]});
    expect(aligned.plan.orders[0]).toMatchObject({selected:false,notes:'Locker 12; bring QR'});
    expect(aligned.unavailable).toHaveLength(1);
  });
  it('refuses stale library writes and leaves newer plans intact', () => {
    let writes=0;
    expect(()=>saveTripLibrary({getItem:()=>'{newer}',setItem:()=>{writes++;}},{version:1,trips:[]},null)).toThrow('another tab');
    expect(writes).toBe(0);
  });
  it('reports failed writes without changing the caller plan', () => {
    const copy=captureTrip('Friday',plan(),'fri',stamp);
    expect(()=>saveTripLibrary({getItem:()=>null,setItem:()=>{throw Error();}},{version:1,trips:[copy]},null)).toThrow('not saved');
    expect(copy.plan.orders[0].notes).toBe('Locker 12; bring QR');
  });
  it('does not replace unreadable history and refuses empty plans', () => {
    expect(()=>readTripLibrary({getItem:()=>'{broken'})).toThrow('left unchanged');
    expect(()=>captureTrip('Friday',emptyTripPlan(),'fri',stamp)).toThrow('Choose at least one');
  });
});

describe('named plans travel with the supported tracker backup', () => {
  it('adds copies without replacing a changed local version or duplicating identical copies', async () => {
    const {mergeTripLibraries}=await import('../src/trip-library');
    const first=captureTrip('Friday',plan(),'fri',stamp), other=captureTrip('Saturday',plan(),'sat',stamp);
    const result=mergeTripLibraries({version:1,trips:[first]},{version:1,trips:[{...first,name:'Different name'},other]});
    expect(result.added).toBe(1);expect(result.conflicts).toHaveLength(1);
    expect(result.next.trips[0].name).toBe('Friday');
    expect(mergeTripLibraries(result.next,{version:1,trips:[first,other]})).toMatchObject({added:0,skipped:2,conflicts:[]});
  });
  it('round trips named copies alongside the working trip and order while retaining legacy formats', async () => {
    const {exportBackup,parseBackupDocument}=await import('../src/backup');
    const library={version:1 as const,trips:[captureTrip('Friday',plan(),'fri',stamp)]};
    const exported=exportBackup([order],new Date(stamp),plan(),[],library);
    expect(JSON.parse(exported).version).toBe(4);
    const parsed=parseBackupDocument(exported);
    expect(parsed.tripLibrary).toEqual(library);expect(parsed.trip?.tripDate).toBe('2026-11-15');expect(parsed.orders[0].id).toBe('coat');
    expect(parseBackupDocument(exportBackup([order],new Date(stamp))).orders).toHaveLength(1);
    expect(JSON.parse(exportBackup([order],new Date(stamp),plan())).version).toBe(2);
  });
});
