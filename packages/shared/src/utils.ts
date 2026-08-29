export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDateShort(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

export function truncate(text: string, n: number) {
  return text.length > n ? text.slice(0, n) + '…' : text;
}

export const wasteTypeOptions = ['organic', 'plastic', 'e-waste', 'metal', 'paper', 'glass'] as const;

export type Tone = 'sage' | 'amber' | 'stone' | 'error' | 'info' | 'neutral' | 'success';

export function statusTone(status: string): Tone {
  if (['collected', 'completed', 'accepted'].includes(status)) return 'sage';
  if (['pending', 'requested', 'available', 'assigned', 'en_route', 'processing'].includes(status)) return 'amber';
  if (['declined', 'cancelled'].includes(status)) return 'error';
  return 'stone';
}

// Pretty "kg" — lowercase, grouped with Indian digit grouping.
export function formatKg(value?: number | null) {
  if (value == null) return '0 kg';
  return `${value.toLocaleString('en-IN')} kg`;
}
