import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  tone?: 'cyan' | 'pink' | 'amber' | 'ink';
  trend?: string;
}

// Luxury Cybercore HUD Stat – Y2K chrome, sketch grid, mono
export const StatsCard: React.FC<StatsCardProps> = ({ title, value, description, tone = 'cyan', trend }) => {
  const toneMap: Record<string, string> = {
    cyan: 'from-neon-cyan/20 to-teal-600/20 border-neon-cyan/30 text-neon-cyan shadow-neon-cyan',
    pink: 'from-neon-pink/20 to-purple-600/20 border-neon-pink/30 text-neon-pink shadow-neon-pink',
    amber: 'from-amber-400/20 to-orange-600/20 border-amber-400/30 text-amber-500',
    ink: 'from-white to-chrome-100 border-chrome-300 text-ink',
  };

  return (
    <section
      aria-labelledby={`stats-${title}`}
      className="relative overflow-hidden rounded-[20px] border bg-white p-4 shadow-hud flex flex-col gap-3"
    >
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${toneMap[tone]} opacity-60`} />
      <div className="flex items-start justify-between gap-2">
        <h3 id={`stats-${title}`} className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-900/55">
          {title}
        </h3>
        <span className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${toneMap[tone]} border text-[11px] font-mono font-bold`}>
          ◆
        </span>
      </div>
      <p className="font-display text-3xl font-black tracking-tighter text-ink leading-none">
        {value}
        {trend && <span className="ml-2 font-mono text-xs font-semibold tracking-normal text-emerald-600">{trend}</span>}
      </p>
      {description && <p className="font-mono text-xs leading-relaxed text-teal-900/45">{description}</p>}
      {/* sketch tick */}
      <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b border-r border-teal-900/10 rounded-br-lg" />
    </section>
  );
};
