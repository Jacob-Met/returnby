/** A shopper-supplied link to a merchant's receipt, return label or QR code. */
export function validReturnEvidenceUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048 || !/^https:\/\//i.test(value) ||
      /[\u0000-\u001f\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}
