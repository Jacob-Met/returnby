const urls = new Set<string>();
let listening = false;

/** Keep Blob URLs alive through native browser download admission. */
export function downloadCalendar(calendar: string, filename: string): void {
  if (!listening) {
    window.addEventListener('pagehide', () => { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); });
    listening = true;
  }
  const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar' }));
  urls.add(url);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  document.body.append(anchor);
  try { anchor.click(); } catch (error) { URL.revokeObjectURL(url); urls.delete(url); throw error; }
  finally { anchor.remove(); }
  window.setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 30_000);
}
