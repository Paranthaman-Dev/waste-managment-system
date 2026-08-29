import React from 'react';

export function SkeletonKPI({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="wm-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="skeleton-box h-3.5 w-24" />
            <div className="skeleton-box h-10 w-10 rounded-xl" />
          </div>
          <div className="skeleton-box h-8 w-28" />
          <div className="skeleton-box h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="skeleton-box h-4 w-32" />
        <div className="skeleton-box h-9 w-44 rounded-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="skeleton-box h-4 w-40" />
                <div className="skeleton-box h-4 w-16 rounded-full" />
              </div>
              <div className="skeleton-box h-3 w-64" />
            </div>
            <div className="skeleton-box h-9 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="wm-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="skeleton-box h-4 w-32" />
            <div className="skeleton-box h-4 w-16 rounded-full" />
          </div>
          <div className="skeleton-box h-3 w-48" />
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div className="skeleton-box h-3 w-20" />
            <div className="skeleton-box h-9 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonMap({ height = 480 }: { height?: number | string }) {
  return (
    <div className="wm-card overflow-hidden" style={{ height } as React.CSSProperties}>
      <div className="h-11 border-b border-border bg-surface px-4 flex items-center justify-between">
        <div className="skeleton-box h-3.5 w-32" />
        <div className="skeleton-box h-6 w-20 rounded-lg" />
      </div>
      <div className="w-full h-full skeleton-box rounded-none" />
    </div>
  );
}
