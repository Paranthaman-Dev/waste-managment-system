import React from 'react';

export function LoadingScreen({ label = 'Loading Reclaim…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
