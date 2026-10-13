import { describe, expect, it } from 'vitest';
import { lookup, knownMerchants } from '../src/policy';
import { parse } from '../src/parse';

describe('policy merchant-name boundaries', () => {
  it('leaves aliases embedded in a different word at the default', () => {
    for (const merchant of [
      'NotContoso', 'Contosocial', 'Fabrikamatic', 'Tailspinner',
      'AdventureWorksheets', 'Northwinded', '2Contoso', 'Contoso2',
      'ÉContoso', 'Contoso漢', 'Contoso\u0301x', '\u0301Contoso',
      'contoso_warehouse', 'new_contoso',
    ]) {
      expect(lookup(merchant), merchant).toEqual({ days: 30, source: 'default' });
    }
  });

  it('retains every existing full name and alias', () => {
    const groups: [number, string[]][] = [
      [30, ['Northwind Outfitters', 'northwind']],
      [15, ['Contoso Electronics', 'contoso']],
      [60, ['Fabrikam Home', 'fabrikam']],
      [90, ['Tailspin Toys', 'tailspin']],
      [45, ['Adventure Works', 'adventure works', 'adventureworks']],
    ];
    expect(knownMerchants).toEqual(groups.flatMap(([, names]) => names));
    for (const [days, names] of groups) {
      for (const name of names) {
        for (const merchant of [name, '  ' + name.toUpperCase() + '  ']) {
          expect(lookup(merchant), merchant).toEqual({ days, source: 'policy' });
        }
      }
    }
  });

  it('retains separated decorations and finds a later complete alias', () => {
    for (const merchant of [
      'Contoso - Outlet', "Contoso's Outlet", '(Contoso)',
      'Shop: Contoso Electronics', 'orders.contoso.example',
      'Contosocial / Contoso',
    ]) {
      expect(lookup(merchant), merchant).toEqual({ days: 15, source: 'policy' });
    }
    expect(lookup('Fabrikam Home (Online)')).toEqual({ days: 60, source: 'policy' });
    expect(lookup('Fabrikam + Contoso')).toEqual({ days: 15, source: 'policy' });
  });

  it('keeps empty and unknown names on the existing fallback', () => {
    for (const merchant of ['', '   ', 'Somewhere', 'Contosocial / Elsewhere']) {
      expect(lookup(merchant), merchant).toEqual({ days: 30, source: 'default' });
    }
  });

  it('does not assign a known policy to a different parsed From name', () => {
    const parsed = parse([
      'From: Contosocial <orders@contosocial.example>',
      'Order date: October 3, 2026',
      'Order # CS-12345',
      'Total: $55.00',
    ].join('\n'), knownMerchants);
    expect(parsed.merchant).toBe('Contosocial');
    expect(lookup(parsed.merchant)).toEqual({ days: 30, source: 'default' });
  });
});
