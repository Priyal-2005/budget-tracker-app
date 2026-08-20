import type { ThemeColor } from '@/constants/theme';

export type BufferStatus = 'unset' | 'healthy' | 'low' | 'over';

// Warn once a fifth or less of the buffer is left — enough runway to notice
// before the next craving takes it negative.
export const LOW_BUFFER_FRACTION = 0.2;

export function getBufferStatus(remaining: number, allotted: number): BufferStatus {
  if (allotted <= 0) return 'unset';
  if (remaining < 0) return 'over';
  if (remaining <= allotted * LOW_BUFFER_FRACTION) return 'low';
  return 'healthy';
}

export function bufferStatusColor(status: BufferStatus): ThemeColor {
  if (status === 'over') return 'danger';
  if (status === 'low') return 'warning';
  return 'primary';
}

export function bufferStatusLabel(status: BufferStatus): string | null {
  if (status === 'over') return 'Over your buffer';
  if (status === 'low') return 'Running low';
  return null;
}
