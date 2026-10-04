---
doc: spec
status: approved
---

# ReturnBy — Technical Spec

## How This Works, In Plain Language
One web page running entirely in the browser. A **parser** picks out store, date and order number with pattern rules. A **policy table** (JSON) gives each store's return window. A **deadline calculator** adds days to the order date. A **store** saves orders in localStorage. An **exporter** writes an `.ics` calendar file. No server.

## The Core Journey Through the System
paste → `parse.ts` → `policy.ts` (fallback 30) → `deadline.ts` → preview in `main.ts` → Save → `store.ts` → list sorted by days left → `ics.ts` → Blob download. PRD ref: `prd.md > The Core Journey`.

## Stack
TypeScript 5 + Vite 5, vanilla DOM; Vitest for unit tests; no runtime dependencies; plain CSS. Node 20+.

## Where It Runs and How Someone Tries It
`npm install && npm run dev` → http://localhost:5173. `npm test` runs tests. `npm run build` → static `dist/` deployed to GitHub Pages by `.github/workflows/pages.yml`.

## Components
- `parse.ts` — regex extraction + date normalization + per-field found flags. PRD: Parsing.
- `policy.ts` + `data/policies.json` — alias match → window days. PRD: Deadlines.
- `deadline.ts` — `dueDate`, `daysLeft`, `status`. PRD: Deadlines.
- `store.ts` — `Order[]` under `returnby.v1`. PRD: States and Boundaries.
- `ics.ts` — RFC 5545 all-day VEVENT, `VALARM TRIGGER:-P3D`, CRLF, stable UID. PRD: List and export.
- `main.ts` — wires paste box, preview, list; `samples.ts` holds fictional demo emails.

## Data Model
```ts
type Order = { id: string; merchant: string; orderNo?: string; total?: string;
  orderDate: string; windowDays: number; windowSource: 'policy'|'default'|'user'; createdAt: string };
```
Days left are recomputed on every render.

## File Structure
`index.html`, `src/{main,parse,policy,deadline,ics,store,samples}.ts`, `src/style.css`, `data/policies.json`, `tests/core.test.ts`, `devpost/`, `README.md`, `LICENSE` (MIT).

## External Services and Dependencies
None at runtime. Dev-only: vite, typescript, vitest.

## Important Failure Modes
- Unusual format → blank fields highlighted for manual entry.
- Ambiguous `03/10` → US order assumed, shown clearly, editable.
- Outdated policy days → "default; verify with store" label.

## Decisions and Open Issues
- MIT license (GitHub-detected).
- Policy table uses fictional merchants only.
