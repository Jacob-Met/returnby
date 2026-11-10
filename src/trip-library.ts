import { parsePortableTrip } from './trip-backup';
import type { TripPlan } from './trip-plan';

export const TRIP_LIBRARY_KEY = 'returnby.trip-library.v1';
export const MAX_TRIP_LIBRARY_BYTES = 2 * 1024 * 1024;
export type SavedTrip = { id: string; name: string; savedAt: string; plan: TripPlan };
export type TripLibrary = { version: 1; trips: SavedTrip[] };
type Reader = Pick<Storage, 'getItem'>;
type Writer = Pick<Storage, 'getItem' | 'setItem'>;

export class TripLibraryError extends Error {}

export function parseTripLibrary(value: unknown): TripLibrary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TripLibraryError('Saved trip plans are not readable.');
  const row = value as Record<string, unknown>;
  if (row.version !== 1 || !Array.isArray(row.trips) || row.trips.length > 200 ||
      Object.keys(row).some(key => !['version', 'trips'].includes(key))) throw new TripLibraryError('Saved trip plans use an unsupported format.');
  const ids = new Set<string>();
  const trips = row.trips.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TripLibraryError('A saved plan is not readable.');
    const trip = value as Record<string, unknown>;
    if (Object.keys(trip).some(key => !['id', 'name', 'savedAt', 'plan'].includes(key)) ||
        typeof trip.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(trip.id) || ids.has(trip.id) ||
        typeof trip.name !== 'string' || !trip.name.trim() || trip.name.length > 80 ||
        typeof trip.savedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(trip.savedAt) || !Number.isFinite(Date.parse(trip.savedAt))) {
      throw new TripLibraryError('A saved plan has an invalid name, date or identifier.');
    }
    ids.add(trip.id);
    return { id: trip.id, name: trip.name.trim(), savedAt: trip.savedAt, plan: parsePortableTrip(trip.plan) };
  });
  const library: TripLibrary = { version: 1, trips };
  if (new TextEncoder().encode(JSON.stringify(library)).byteLength > MAX_TRIP_LIBRARY_BYTES) {
    throw new TripLibraryError('Saved plan copies are larger than the 2 MiB limit. Keep a downloaded backup before adding more.');
  }
  return library;
}

export function captureTrip(name: string, plan: TripPlan, id: string, savedAt: string): SavedTrip {
  if (!plan.orders.some(order => order.selected)) throw new TripLibraryError('Choose at least one order before saving a named plan.');
  return parseTripLibrary({ version: 1, trips: [{ id, name, savedAt, plan }] }).trips[0];
}

export function readTripLibrary(reader: Reader): { library: TripLibrary; raw: string | null } {
  let raw: string | null;
  try { raw = reader.getItem(TRIP_LIBRARY_KEY); }
  catch { throw new TripLibraryError('Saved plan copies could not be read. Your current trip is still available; retry loading saved plans.'); }
  if (raw === null) return { library: { version: 1, trips: [] }, raw };
  try {
    if (new TextEncoder().encode(raw).byteLength > MAX_TRIP_LIBRARY_BYTES) throw new Error();
    return { library: parseTripLibrary(JSON.parse(raw)), raw };
  } catch {
    throw new TripLibraryError('Saved plan copies could not be opened. They have been left unchanged; retry loading them before saving another copy.');
  }
}

export function saveTripLibrary(writer: Writer, library: TripLibrary, expectedRaw: string | null): string {
  const clean = parseTripLibrary(library);
  let current: string | null;
  try { current = writer.getItem(TRIP_LIBRARY_KEY); }
  catch { throw new TripLibraryError('Saved plan copies could not be read. Keep this tab open and retry.'); }
  if (current !== expectedRaw) throw new TripLibraryError('Saved plans changed in another tab. Reload the list before changing it.');
  const raw = JSON.stringify(clean);
  try { writer.setItem(TRIP_LIBRARY_KEY, raw); }
  catch { throw new TripLibraryError('This plan copy was not saved. Its name and current packing work are still here; retry after checking browser storage.'); }
  return raw;
}

export function mergeTripLibraries(current: TripLibrary, incoming: TripLibrary) {
  const saved = parseTripLibrary(current);
  const imported = parseTripLibrary(incoming);
  const byId = new Map(saved.trips.map(trip => [trip.id, trip]));
  const additions: SavedTrip[] = [];
  const conflicts: SavedTrip[] = [];
  let skipped = 0;
  for (const trip of imported.trips) {
    const existing = byId.get(trip.id);
    if (!existing) additions.push(trip);
    else if (JSON.stringify(existing) === JSON.stringify(trip)) skipped++;
    else conflicts.push(trip);
  }
  return { next: parseTripLibrary({version:1,trips:[...saved.trips,...additions]}), added:additions.length, skipped, conflicts };
}
