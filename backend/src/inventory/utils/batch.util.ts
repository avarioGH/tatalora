export function normalizeBatch(batch?: string | null): string {
  if (batch === null || batch === undefined) {
    return 'UNKNOWN';
  }
  const str = String(batch).trim();
  if (str === '') {
    return 'UNKNOWN';
  }
  return str.toUpperCase();
}
