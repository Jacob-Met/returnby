import { ChecklistError, type TripChecklist } from './trip-checklist';

export const MAX_TRIP_NOTE_CHARACTERS = 1000;

/** Match textarea line endings; keep the person's remaining literal text. */
export function normalizeTripNotes(value: string): string {
  if (typeof value !== 'string') {
    throw new ChecklistError('Trip notes must be ordinary text.', 'data');
  }
  const text = value.replace(/\r\n?/g, '\n');
  if (Array.from(text).length > MAX_TRIP_NOTE_CHARACTERS) {
    throw new ChecklistError('Keep trip notes to 1,000 characters or fewer before previewing.', 'data');
  }
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if ((code < 32 && code !== 9 && code !== 10) || (code >= 127 && code <= 159)
      || (code >= 0xd800 && code <= 0xdfff)) {
      throw new ChecklistError('Use ordinary text, tabs and line breaks for trip notes.', 'data');
    }
  }
  return text;
}

export function withTripNotes(checklist: TripChecklist, value: string): TripChecklist {
  const notes = normalizeTripNotes(value);
  return Object.freeze({ ...checklist, tripNotes: notes || undefined });
}
