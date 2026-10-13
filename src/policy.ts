import policies from '../data/policies.json';

type Policy = { name: string; days: number; aliases: string[] };
const table = policies as Record<string, Policy>;

export const knownMerchants = Object.values(table).flatMap((p) => [p.name, ...p.aliases]);

function containsName(merchant: string, name: string): boolean {
  const escaped = name.toLowerCase().replace(/[.*+?^{}$()|[\]\\]/g, '\\$&');
  // Letters, combining marks, digits and underscores keep adjacent text in the same word.
  const boundary = '[^\\p{L}\\p{M}\\p{N}_]';
  return new RegExp('(?:^|' + boundary + ')' + escaped + '(?=$|' + boundary + ')', 'u').test(merchant);
}

export function lookup(merchant: string): { days: number; source: 'policy' | 'default' } {
  const m = merchant.toLowerCase();
  if (m) for (const p of Object.values(table)) {
    if ([p.name, ...p.aliases].some((a) => containsName(m, a))) return { days: p.days, source: 'policy' };
  }
  return { days: 30, source: 'default' };
}
