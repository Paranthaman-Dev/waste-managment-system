// Single source of truth for waste-type colors, labels, and thresholds.
// All dashboards and the BinMap should import from here (no scattered maps).

export const WASTE_TYPE_COLORS: Record<string, string> = {
  organic: '#10B981',
  plastic: '#3B82F6',
  'e-waste': '#8B5CF6',
  ewaste: '#8B5CF6',
  metal: '#F97316',
  paper: '#EAB308',
  glass: '#14B8A6',
  general: '#A8A29E',
  hazardous: '#EF4444',
  recyclable: '#22C55E',
};

export function wasteColor(type: string): string {
  return WASTE_TYPE_COLORS[(type || '').toLowerCase()] ?? '#10B981';
}

export function wasteTypeLabel(type: string): string {
  return (type || '')
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export type WasteStream = { label: string; value: number; color: string };

export function toDonutData(
  rows: Array<{ waste_type: string; total_kg: number }> | undefined | null,
  fallbackColor = '#10B981',
): WasteStream[] {
  return (rows ?? []).map((row) => ({
    label: wasteTypeLabel(row.waste_type),
    value: row.total_kg,
    color: wasteColor(row.waste_type) || fallbackColor,
  }));
}
