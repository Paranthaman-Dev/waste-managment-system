// Shared UI primitives — accessible, 44px, glass, enterprise SaaS
export function Badge({ children, tone = 'slate', className = '' }: { children: React.ReactNode; tone?: 'slate' | 'primary' | 'emerald' | 'amber' | 'violet' | 'red'; className?: string }) {
  const map: Record<string, string> = {
    slate: 'bg-slate-900 text-white',
    primary: 'bg-primary text-white',
    emerald: 'bg-emerald-600 text-white',
    amber: 'bg-amber-500 text-white',
    violet: 'bg-violet-600 text-white',
    red: 'bg-red-600 text-white',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${map[tone]} ${className}`}>{children}</span>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden />
      </div>
      <p className="mt-3 text-sm font-semibold tracking-tight text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed text-slate-500">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// Mini area chart — SVG, accessible, no deps, shows 7-day trend
export function MiniAreaChart({ data = [4, 6, 5, 8, 7, 9, 6], color = '#2563EB' }: { data?: number[]; color?: string }) {
  const w = 120;
  const h = 40;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  });
  const polygon = `0,${h} ${points.join(' ')} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="7-day trend" className="overflow-visible">
      <polygon points={polygon} fill={color} opacity={0.08} />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((_, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((data[i] - min) / range) * (h - 8) - 4;
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />;
      })}
    </svg>
  );
}
