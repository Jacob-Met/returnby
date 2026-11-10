import {expect,test} from 'vitest';
import {createSavedReturnsCsv} from '../src/saved-returns-csv';
const at = new Date('2026-11-10T12:00:00Z');
const order = (patch = {}) => ({id:'one',merchant:'Pine',orderNo:'00042',orderDate:'2026-11-01',windowDays:30,windowSource:'user',createdAt:at.toISOString(),...patch});
test('confirmed clock follows delivery date and excludes extra private email',()=>{
 const result=createSavedReturnsCsv([order({windowStartDate:'2026-11-08',originalEmail:'PRIVATE'})],at);
 expect(result.content).toContain('"2026-12-08","2026-11-08","Confirmed start date"');
 expect(result.content).not.toContain('PRIVATE');
 expect(result.content).toContain('"00042"');
});
test('formula-like and multiline merchant text stays literal with quoted CSV',()=>{
 const r=createSavedReturnsCsv([order({merchant:'=HYPERLINK("https://example.test")',total:'USD 4,200\nTax included'})],at);
 expect(r.protectedCells).toBe(1);
 expect(r.content).toContain("'=HYPERLINK");
 expect(r.content).toContain('"USD 4,200\nTax included"');
});
test('export sorts by confirmed deadline without changing saved records',()=>{
 const input=[order({id:'late',windowStartDate:'2026-11-08'}),order({id:'early'})];
 const snapshot=JSON.stringify(input);
 const r=createSavedReturnsCsv(input,at);
 expect(r.content.indexOf('"early"')).toBeLessThan(r.content.indexOf('"late"'));
 expect(JSON.stringify(input)).toBe(snapshot);
});
test('empty and invalid saved data refuse a misleading export',()=>{
 expect(()=>createSavedReturnsCsv([],at)).toThrow(/Save a return/);
 expect(()=>createSavedReturnsCsv([order({orderDate:'garbage'})],at)).toThrow();
});
test('leading BOM text survives and formula prefix remains protected',()=>{
 const r=createSavedReturnsCsv([order({merchant:'\ufeff=2+2'})],at);
 expect(r.protectedCells).toBe(1);
 expect(r.content).toContain("'\ufeff=2+2");
});

test('shopper-entered refund follow-through is exportable without private notes',()=>{
 const r=createSavedReturnsCsv([order({refundState:'awaiting',refundAmount:'EUR 42',refundFollowUpDate:'2026-11-20',refundNote:'private return note',refundUpdatedAt:at.toISOString()})],at);
 expect(r.content).toContain('"awaiting","EUR 42","2026-11-20"');
 expect(r.content).not.toContain('private return note');
});

test('partial quantities and mixed history remain intelligible in a spreadsheet',()=>{
 const items=[{id:'shirt',name:'Linen, blue',quantity:3,returned:1,kept:1}];
 const partial=createSavedReturnsCsv([order({items})],at);
 expect(partial.content).toContain('"Active","","2026-11-10T12:00:00.000Z","3","1","1","1","Linen, blue: 3 bought, 1 returned, 1 kept, 1 still open"');
 const done=createSavedReturnsCsv([order({items:[{...items[0],returned:2}],completionKind:'mixed',completedAt:at.toISOString()})],at);
 expect(done.content).toContain('"Returned & kept","2026-11-10T12:00:00.000Z","2026-11-10T12:00:00.000Z","3","2","1","0"');
});
test('older purchases do not invent item counts in a CSV',()=>{
 const result=createSavedReturnsCsv([order()],at);
 expect(result.content).toContain('"Active","","2026-11-10T12:00:00.000Z","","","","",""');
});
