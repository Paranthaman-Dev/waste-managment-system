import React from 'react';
import { Badge } from '../ui/primitives';
import { MapPin, Clock, Calendar } from 'lucide-react';
import type { PickupRequest } from '../../types/api';
import { cn } from '../../utils';

type Tone = 'sage' | 'amber' | 'stone' | 'error' | 'info' | 'neutral' | 'success';

function defaultPickupTone(status: string): Tone {
  return status === 'collected' ? 'sage' : status === 'en_route' ? 'info' : status === 'assigned' ? 'amber' : 'neutral';
}

export interface PickupCardProps {
  pickup: PickupRequest;
  variant?: 'compact' | 'detailed';
  badgeTone?: Tone;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
}

export function PickupCard({ pickup: p, variant = 'compact', badgeTone, tone, onClick, className }: PickupCardProps) {
  const resolvedTone = (badgeTone ?? tone ?? defaultPickupTone(p.status)) as Tone;

  if (variant === 'detailed') {
    return (
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={cn(
          'rounded-[12px] border border-border bg-surface p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-border-strong transition-all',
          onClick && 'cursor-pointer',
          className,
        )}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-xs capitalize text-foreground">
              {p.waste_type} • {p.quantity_kg} kg
            </span>
            <Badge tone={resolvedTone} dot>
              {p.status.replace('_', ' ')}
            </Badge>
            <span className="text-[10px] font-mono text-muted-foreground">#{p.id}</span>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.location}</span>
          </p>

          {p.preferred_time && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              Preferred: {new Date(p.preferred_time).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
          <Calendar className="h-3 w-3" />
          <span>Requested {new Date(p.requested_at).toLocaleDateString()}</span>
        </div>
      </div>
    );
  }

  // compact variant — for Recent Activity
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'rounded-[12px] border border-border bg-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-border-strong transition-colors',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-foreground capitalize">
            {p.waste_type} • {p.quantity_kg} kg
          </span>
          <Badge tone={resolvedTone} dot>
            {p.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          {p.location}
        </p>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {new Date(p.requested_at).toLocaleDateString()}
      </span>
    </div>
  );
}

export default PickupCard;
