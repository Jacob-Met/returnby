/** Local, conservative MIME text/plain reader for exported .eml confirmations.
 * No HTML rendering, attachments, network access or persistence. */
export class EmlImportError extends Error {
  constructor(message: string) { super(message); this.name = 'EmlImportError'; }
}

function rawBytes(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return result;
}

function headersAndBody(raw: string) {
  const normalized = raw.replace(/\r\n?/g, '\n');
  const separator = normalized.indexOf('\n\n');
  if (separator < 0) throw new EmlImportError('Missing email header/body separator.');
  const lines = normalized.slice(0, separator).replace(/\n[ \t]+/g, ' ').split('\n');
  if (lines.length > 200) throw new EmlImportError('Too many email header lines.');
  const headers = new Map<string, string>();
  for (const line of lines) {
    const match = /^([A-Za-z0-9-]+):[ \t]*(.*)$/.exec(line);
    if (!match) throw new EmlImportError('Malformed email header.');
    const key = match[1].toLowerCase();
    if (headers.has(key) && ['content-type', 'content-disposition', 'content-transfer-encoding'].includes(key)) {
      throw new EmlImportError('Conflicting MIME headers.');
    }
    headers.set(key, match[2]);
  }
  return { headers, body: normalized.slice(separator + 2) };
}

function parameter(header: string, key: string): string | undefined {
  const match = new RegExp('(?:^|;)\\s*' + key + '\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))', 'i').exec(header);
  return match?.[1] ?? match?.[2];
}

function transferBytes(body: string, encoding: string): Uint8Array {
  const mode = encoding.trim().toLowerCase();
  if (mode === 'base64') {
    const data = body.replace(/[ \t\n]/g, '');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
      throw new EmlImportError('Invalid base64 email body.');
    }
    try { return Uint8Array.from(atob(data), char => char.charCodeAt(0)); }
    catch { throw new EmlImportError('Invalid base64 email body.'); }
  }
  if (mode === '' || mode === '7bit' || mode === '8bit' || mode === 'binary') {
    return Uint8Array.from(body, char => char.charCodeAt(0));
  }
  if (mode !== 'quoted-printable') throw new EmlImportError('Unsupported email transfer encoding: ' + mode);
  const bytes: number[] = [];
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '=' && body[i + 1] === '\n') { i++; continue; }
    if (body[i] === '=' && /^[A-F0-9]{2}$/i.test(body.slice(i + 1, i + 3))) {
      bytes.push(parseInt(body.slice(i + 1, i + 3), 16)); i += 2;
    } else bytes.push(body.charCodeAt(i));
  }
  return Uint8Array.from(bytes);
}

function decode(bytes: Uint8Array, charset: string): string {
  const name = charset.trim().toLowerCase();
  if (!['utf-8', 'utf8', 'us-ascii', 'ascii', 'iso-8859-1', 'windows-1252'].includes(name)) {
    throw new EmlImportError('Unsupported email charset ' + charset + '; export as UTF-8 text.');
  }
  if ((name === 'ascii' || name === 'us-ascii') && bytes.some(byte => byte > 127)) {
    throw new EmlImportError('Email declares ASCII but contains other bytes.');
  }
  try { return new TextDecoder(name === 'ascii' ? 'us-ascii' : name, { fatal: true }).decode(bytes); }
  catch { throw new EmlImportError('Email body does not match its declared charset.'); }
}

function multipart(body: string, boundary: string): string[] {
  if (!boundary || boundary.length > 70 || /[\r\n]/.test(boundary)) {
    throw new EmlImportError('Invalid MIME boundary.');
  }
  const parts: string[] = [];
  const begin = '--' + boundary;
  let current: string[] = [];
  let open = false, closed = false;
  for (const line of body.split('\n')) {
    const marker = line.replace(/[ \t]+$/, '');
    if (marker === begin || marker === begin + '--') {
      if (open) parts.push(current.join('\n'));
      current = [];
      if (marker.endsWith('--') && marker !== begin) { closed = true; break; }
      open = true;
    } else if (open) current.push(line);
  }
  if (!closed || !parts.length || parts.length > 40) throw new EmlImportError('Malformed or oversized multipart email.');
  return parts;
}

function extract(part: string, depth = 0): string | null {
  if (depth > 8) throw new EmlImportError('Too many nested MIME sections.');
  const { headers, body } = headersAndBody(part);
  const contentType = headers.get('content-type') || 'text/plain; charset=utf-8';
  const disposition = (headers.get('content-disposition') || '').toLowerCase();
  if (disposition.startsWith('attachment') || parameter(disposition, 'filename') ||
      parameter(contentType, 'name')) return null;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (mime.startsWith('multipart/')) {
    const boundary = parameter(contentType, 'boundary');
    if (!boundary) throw new EmlImportError('Multipart email is missing a boundary.');
    for (const child of multipart(body, boundary)) {
      const text = extract(child, depth + 1);
      if (text?.trim()) return text;
    }
    return null;
  }
  if (mime !== 'text/plain') return null;
  const bytes = transferBytes(body, headers.get('content-transfer-encoding') || '7bit');
  const text = decode(bytes, parameter(contentType, 'charset') || 'us-ascii').trim();
  if (text.includes('\u0000')) throw new EmlImportError('Email text contains null bytes.');
  return text || null;
}

export function extractEmlPlainText(bytes: Uint8Array): string {
  if (!bytes.length || bytes.length > 102400) throw new EmlImportError('Choose an .eml file up to 100 KiB.');
  const text = extract(rawBytes(bytes));
  if (!text) throw new EmlImportError('No plain-text body found. HTML-only messages and attachments are not imported; paste the confirmation text instead.');
  return text;
}
