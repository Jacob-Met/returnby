import { describe, it, expect } from 'vitest';
import { extractEmlPlainText } from '../src/eml';

const bytes = (text: string) => new TextEncoder().encode(text);
const common = 'From: orders@example.test\r\nSubject: Confirmation\r\nMIME-Version: 1.0\r\n';

describe('exported .eml plain text import', () => {
  it('extracts the body without accidentally parsing email routing headers', () => {
    const text = extractEmlPlainText(bytes(common + '\r\nStore: Contoso\r\nOrder #A-123\r\nOrder date: 2026-11-01'));
    expect(text).toContain('Order #A-123');
    expect(text).not.toContain('orders@example.test');
  });

  it('prefers text/plain in nested alternatives and skips attachments', () => {
    const email = common +
      'Content-Type: multipart/mixed; boundary="outer"\r\n\r\n' +
      '--outer\r\nContent-Type: multipart/alternative; boundary="inner"\r\n\r\n' +
      '--inner\r\nContent-Type: text/html\r\n\r\n<b>Wrong order</b>\r\n' +
      '--inner\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nOrder #RIGHT\r\n' +
      '--inner--\r\n' +
      '--outer\r\nContent-Type: text/plain; name="attachment.txt"\r\n' +
      'Content-Disposition: attachment; filename="attachment.txt"\r\n\r\nOrder #WRONG\r\n' +
      '--outer--\r\n';
    expect(extractEmlPlainText(bytes(email))).toBe('Order #RIGHT');
  });

  it('decodes quoted-printable UTF-8 including folded lines', () => {
    const email = common + 'Content-Type: text/plain; charset=utf-8\r\n' +
      'Content-Transfer-Encoding: quoted-printable\r\n\r\nCaf=C3=A9 order=\r\n #42';
    expect(extractEmlPlainText(bytes(email))).toBe('Café order #42');
  });

  it('decodes base64 UTF-8 without losing Japanese characters', () => {
    const binary = Array.from(new TextEncoder().encode('注文 #42')).map(byte => String.fromCharCode(byte)).join('');
    const email = common + 'Content-Type: text/plain; charset=utf-8\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' + btoa(binary);
    expect(extractEmlPlainText(bytes(email))).toBe('注文 #42');
  });

  it('rejects HTML-only messages and disguised text attachments', () => {
    expect(() => extractEmlPlainText(bytes(common + 'Content-Type: text/html\r\n\r\n<html>Wrong</html>')))
      .toThrow(/No plain-text body/);
    expect(() => extractEmlPlainText(bytes(common + 'Content-Disposition: attachment\r\n\r\nOrder #1')))
      .toThrow(/No plain-text body/);
  });

  it('rejects malformed MIME instead of guessing from partial bytes', () => {
    expect(() => extractEmlPlainText(bytes(common + 'Content-Type: multipart/mixed; boundary=x\r\n\r\n--x\r\nContent-Type: text/plain\r\n\r\npartial')))
      .toThrow(/Malformed/);
    expect(() => extractEmlPlainText(bytes(common + 'Content-Transfer-Encoding: base64\r\n\r\n$$invalid')))
      .toThrow(/Invalid base64/);
    expect(() => extractEmlPlainText(bytes(common + 'Content-Transfer-Encoding: x-weird\r\n\r\nbody')))
      .toThrow(/Unsupported/);
  });

  it('refuses conflicting headers and unsupported charsets', () => {
    expect(() => extractEmlPlainText(bytes(common + 'Content-Type: text/plain\r\nContent-Type: text/html\r\n\r\nbody')))
      .toThrow(/Conflicting/);
    expect(() => extractEmlPlainText(bytes(common + 'Content-Type: text/plain; charset=shift_jis\r\n\r\nbody')))
      .toThrow(/Unsupported email charset/);
  });

  it('enforces the same per-file bound as ordinary confirmation text', () => {
    const large = new Uint8Array(102401);
    expect(() => extractEmlPlainText(large)).toThrow(/100 KiB/);
    expect(() => extractEmlPlainText(new Uint8Array())).toThrow(/100 KiB/);
  });
});
