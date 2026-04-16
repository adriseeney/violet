/**
 * Formats a distance in miles for display (e.g. `0.2 mi`, `12 mi`).
 */
export function formatDistanceMiles(miles: number): string {
  if (!Number.isFinite(miles) || miles < 0) {
    return '—';
  }
  if (miles === 0) {
    return '0 mi';
  }
  if (miles < 0.05) {
    return '<0.1 mi';
  }
  if (miles < 10) {
    const roundedTenth = Math.round(miles * 10) / 10;
    if (roundedTenth >= 10) {
      return `${Math.round(roundedTenth)} mi`;
    }
    return Number.isInteger(roundedTenth)
      ? `${roundedTenth} mi`
      : `${roundedTenth.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}
