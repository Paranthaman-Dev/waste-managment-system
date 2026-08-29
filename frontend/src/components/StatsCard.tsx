type Tone = 'primary' | 'emerald' | 'amber' | 'violet' | 'slate';
const toneMap: Record<Tone, { dot: string; bg: string; ring: string; bar: string }> = {
  primary: { dot: 'bg-primary', bg: 'bg-blue-50', ring: 'ring-blue-100', bar: 'bg-primary' },
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-100', bar: 'bg-emerald-500' },
  amber: { dot: 'bg-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-100', bar: 'bg-amber-500' },
  violet: { dot: 'bg-violet-500', bg: 'bg-violet-50', ring: 'ring-violet-100', bar: 'bg-violet-500' },
  slate: { dot: 'bg-slate-800', bg: 'bg-slate-50', ring: 'ring-slate-200', bar: 'bg-slate-800' },
};

const legacyToneMap: Record<string, Tone> = {
  ink: 'slate',
  cyan: 'primary',
  amber: 'amber',
  pink: 'violet',
};

export function StatsCard({
  title,
  value,
  description,
  tone = 'slate',
  trend,
  progress,
}: {
  title: string;
  value: string | number;
  description: string;
  tone?: Tone | string;
  trend?: string;
  progress?: number; // 0-100 for bullet-like
}) {
  const normalized = (legacyToneMap[tone as string] as Tone) ?? (tone as Tone) ?? 'slate';
  const t = toneMap[normalized] ?? toneMap.slate;

  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 shadow-soft hover:shadow-card hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.bg} ring-1 ${t.ring}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} aria-hidden />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{title}</p>
      <p className="mt-1 font-sans text-[28px] font-bold tracking-tight text-slate-900 leading-none">{value}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-500 line-clamp-2">{description}</p>

      {typeof progress === 'number' && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-slate-400">
            <span>Progress</span>
            <span className="text-slate-700">{Math.round(progress)}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${title} progress`}>
            <div className={`h-full rounded-full ${t.bar} transition-all duration-700 ease-out`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// Bullet chart — compact KPI vs target, accessible
export function BulletChart({ label, value, target, unit = '' }: { label: string; value: number; target: number; unit?: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const status = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-xs font-medium text-slate-500">
          <span className="font-bold text-slate-900">{value}{unit}</span> / {target}{unit}
        </p>
      </div>
      <div className="mt-2 h-3 rounded-full bg-slate-100 relative overflow-hidden">
        {/* qualitative ranges — bad/ok/good  */}
        <div className="absolute inset-0 grid grid-cols-3">
          <div className="bg-red-50" aria-hidden />
          <div className="bg-amber-50" aria-hidden />
          <div className="bg-emerald-50" aria-hidden />
        </div>
        <div className={`absolute left-0 top-0 h-full rounded-full ${status} transition-all duration-700`} style={{ width: `${pct}%` }} />
        {/* target marker */}
        <div className="absolute top-0 h-full w-0.5 bg-slate-900" style={{ left: '100%' }} aria-hidden />
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-400">
        {pct >= 100 ? 'Target met' : `${Math.round(100 - pct)}% to target`} • color is supplementary, text conveys status
      </p>
    </div>
  );
}
