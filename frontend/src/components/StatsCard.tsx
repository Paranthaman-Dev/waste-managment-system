type Tone = 'primary' | 'emerald' | 'amber' | 'violet' | 'slate';
const toneMap: Record<Tone, { dot: string; bg: string; ring: string }> = {
  primary: { dot: 'bg-primary', bg: 'bg-blue-50', ring: 'ring-blue-100' },
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
  amber: { dot: 'bg-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-100' },
  violet: { dot: 'bg-violet-500', bg: 'bg-violet-50', ring: 'ring-violet-100' },
  slate: { dot: 'bg-slate-800', bg: 'bg-slate-50', ring: 'ring-slate-200' },
};

// Map legacy tones to new elegant tones
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
}: {
  title: string;
  value: string | number;
  description: string;
  tone?: Tone | string;
  trend?: string;
}) {
  const normalized = (legacyToneMap[tone as string] as Tone) ?? (tone as Tone) ?? 'slate';
  const t = toneMap[normalized] ?? toneMap.slate;

  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 shadow-soft hover:shadow-card hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.bg} ring-1 ${t.ring}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{title}</p>
      <p className="mt-1 font-sans text-[28px] font-bold tracking-tight text-slate-900 leading-none">{value}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-500 line-clamp-2">{description}</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
