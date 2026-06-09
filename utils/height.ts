import { HEIGHT_OPTIONS, type HeightString } from '@/types/preferences';

export function parseFeetInchesToCm(height: string): number | null {
  const match = height.trim().match(/^(\d)'(\d{1,2})$/);
  if (!match) return null;

  const feet = Number.parseInt(match[1], 10);
  const inches = Number.parseInt(match[2], 10);
  if (!Number.isFinite(feet) || !Number.isFinite(inches) || inches >= 12) {
    return null;
  }

  return Math.round((feet * 12 + inches) * 2.54);
}

export function cmToHeightString(cm: number): HeightString | '' {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const candidate = `${feet}'${inches}` as HeightString;
  return HEIGHT_OPTIONS.some((option) => option.height === candidate) ? candidate : '';
}
