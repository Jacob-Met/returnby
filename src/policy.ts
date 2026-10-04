import policies from '../data/policies.json';

type Policy = { name: string; days: number; aliases: string[] };
const table = policies as Record<string, Policy>;

export const knownMerchants = Object.values(table).flatMap((p) => [p.name, ...p.aliases]);

export function lookup(merchant: string): { days: number; source: 'policy' | 'default' } {
  const m = merchant.toLowerCase();
  if (m) for (const p of Object.values(table)) {
    if ([p.name, ...p.aliases].some((a) => m.includes(a.toLowerCase()))) return { days: p.days, source: 'policy' };
  }
  return { days: 30, source: 'default' };
}
