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

export function wasteTypeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function statusTone(status: string): 'sage' | 'amber' | 'stone' | 'error' {
  if (['collected', 'completed', 'accepted'].includes(status)) return 'sage';
  if (['pending', 'requested', 'available', 'assigned', 'en_route', 'processing'].includes(status)) return 'amber';
  if (['declined', 'cancelled'].includes(status)) return 'error';
  return 'stone';
}
