import React from 'react';
import { Badge } from '../ui/primitives';
import type { RewardBalance } from '../../types/api';

export function formatPoints(value: number): string {
  return value.toLocaleString('en-IN');
}

export function RewardCard({
  balance,
  loading = false,
  className,
}: {
  balance?: RewardBalance | null;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`wm-card relative overflow-hidden p-6 ${className ?? ''}`}
      style={{
        background:
          'radial-gradient(1200px 400px at 85% -20%, rgba(255,77,0,0.12), transparent 55%), linear-gradient(180deg, #fffdfb, #fff7f0)',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Reward Balance
        </p>
        <Badge tone="error" dot>
          Points
        </Badge>
      </div>

      {loading ? (
        <div className="mt-2 h-12 w-40 animate-pulse rounded-lg bg-surface-muted" aria-hidden />
      ) : (
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-5xl font-bold tracking-tight font-mono text-foreground">
            {formatPoints(balance?.balance ?? 0)}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">pts</span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span>1 kg = 3–15 pts</span>
        <span className="text-border-strong">•</span>
        <span>
          Lifetime earned: <span className="font-mono font-bold text-foreground">{formatPoints(balance?.lifetime_earned ?? 0)}</span>
        </span>
      </div>
    </div>
  );
}
