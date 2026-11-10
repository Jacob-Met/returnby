import { describe, it, expect } from 'vitest';
import { decodeManualDraft } from '../src/manual-draft-recovery';
const fields = { merchant:'Paper & Pine', orderDate:'2026-11-10', windowStartDate:'', windowDays:'14', orderNo:'PP-904', total:'£42.50' };
describe('manual draft recovery boundary', () => {
  it('preserves raw unfinished fields without promoting them to a saved purchase', () => {
    expect(decodeManualDraft(JSON.stringify({version:1, fields:{...fields, windowDays:'', total:'12.'}}))).toEqual({...fields,windowDays:'',total:'12.'});
    expect(decodeManualDraft(null)).toBeNull();
  });
  it.each(['{', 'null', '[]', '{"version":2,"fields":{}}', JSON.stringify({version:1,fields:{...fields,total:12}}),JSON.stringify({version:1,fields:{...fields,total:'x'.repeat(10001)}})])('rejects unreadable or incompatible recovery rather than guessing fields', raw => {
    expect(()=>decodeManualDraft(raw)).toThrow();
  });
});
