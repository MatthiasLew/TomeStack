export function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}
export function isValidIsbn(value: string): boolean {
  const isbn = normalizeIsbn(value);
  if (/^\d{9}[\dX]$/.test(isbn)) {
    return Array.from(isbn).reduce((sum, c, i) => sum + (c === 'X' ? 10 : Number(c)) * (10 - i), 0) % 11 === 0;
  }
  return /^(978|979)\d{10}$/.test(isbn) && Array.from(isbn).reduce((sum, c, i) => sum + Number(c) * (i % 2 ? 3 : 1), 0) % 10 === 0;
}
export function parseSearchLimit(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 40 ? Number(value) : null;
}
