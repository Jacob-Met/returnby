import { describe, expect, it } from 'vitest';
import { createOrderMatcher } from '../src/order-search';

describe('saved-order lookup', () => {
  const order = Object.freeze({ merchant: 'North   Star Outfitters', orderNo: 'NS-10.42',
    total: '$999.00', orderDate: '2026-10-08', id: 'private-identity' });

  it.each(['', '  \t\n', 'NORTH', '  north\tSTAR  ', 'outfit', 'ns-10', '#NS-10.42', '#  ns-10.42', '10.42'])
  ('matches literal store or order-number text for %j', query => {
    expect(createOrderMatcher(query)(order)).toBe(true);
  });

  it.each(['South', '.*', '10X42', '#', '#   ', '$999.00', '2026-10-08', 'private-identity', 'outfitters NS-10'])
  ('does not expand syntax, search unrelated fields or join fields for %j', query => {
    expect(createOrderMatcher(query)(order)).toBe(false);
  });

  it('matches literal Unicode and markup without fuzzy accent or punctuation changes', () => {
    const item = { merchant: 'Étoile <Shop> 家具', orderNo: 'RX[12]' };
    for (const query of ['éTOILE', '<shop>', '家具', '[12]']) expect(createOrderMatcher(query)(item)).toBe(true);
    for (const query of ['etoile', 'RX12', '[.*]']) expect(createOrderMatcher(query)(item)).toBe(false);
  });

  it('lets a user find the Unknown store label and keeps empty numbers from matching a bare #', () => {
    const item = { merchant: '', orderNo: '' };
    expect(createOrderMatcher('unknown store')(item)).toBe(true);
    expect(createOrderMatcher('#')(item)).toBe(false);
    expect(createOrderMatcher('missing')(item)).toBe(false);
  });

  it('accepts saved records with an omitted optional order number', () => {
    const item = { merchant: 'North Star' };
    expect(createOrderMatcher('unmatched')(item)).toBe(false);
    expect(createOrderMatcher('#')(item)).toBe(false);
    expect(createOrderMatcher('north')(item)).toBe(true);
    expect(createOrderMatcher('')(item)).toBe(true);
  });

  it('finds an individual record in a 10,000-order list without changing its order, identities or fields', () => {
    const items = Array.from({ length: 10_000 }, (_, index) => Object.freeze({
      merchant: index % 2 ? 'North Star' : 'South Shop', orderNo: `ORDER-${String(index).padStart(5, '0')}`,
      id: `saved-${index}`, total: '$5.00',
    }));
    Object.freeze(items);
    expect(items.filter(createOrderMatcher('#ORDER-09999'))).toEqual([items[9999]]);
    const stores = items.filter(createOrderMatcher('north star'));
    expect(stores).toHaveLength(5_000);
    expect(stores[0]).toBe(items[1]);
    expect(stores[4999]).toBe(items[9999]);
    expect(items.filter(createOrderMatcher(''))).toEqual(items);
    expect(items[9999]).toEqual({ merchant: 'North Star', orderNo: 'ORDER-09999', id: 'saved-9999', total: '$5.00' });
  });
});
