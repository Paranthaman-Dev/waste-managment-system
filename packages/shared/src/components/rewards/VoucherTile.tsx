import React from 'react';
import { Button, Badge } from '../ui/primitives';
import { formatPoints } from './RewardCard';
import type { Voucher } from '../../types/api';

export function VoucherTile({
  voucher,
  canRedeem,
  redeeming = false,
  disabledReason,
  onRedeem,
}: {
  voucher: Voucher;
  canRedeem: boolean;
  redeeming?: boolean;
  disabledReason?: string;
  onRedeem: (voucher: Voucher) => void;
}) {
  const expired =
    voucher.valid_until != null && new Date(voucher.valid_until).getTime() < Date.now();

  return (
    <div className="wm-card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-foreground leading-snug">{voucher.title}</h4>
        <span className="shrink-0 rounded-lg bg-surface-muted border border-border px-2 py-0.5 font-mono text-xs font-bold text-primary">
          {formatPoints(voucher.cost_points)} pts
        </span>
      </div>

      {voucher.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{voucher.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {expired ? (
          <Badge tone="neutral">Expired</Badge>
        ) : (
          <Badge tone="sage" dot>
            Redeem for voucher
          </Badge>
        )}
        <Button
          size="sm"
          variant={canRedeem ? 'primary' : 'outline'}
          disabled={!canRedeem || expired || redeeming}
          loading={redeeming}
          title={disabledReason ?? (expired ? 'Voucher has expired' : 'Insufficient points')}
          onClick={() => onRedeem(voucher)}
          aria-label={`Redeem ${voucher.title} for ${formatPoints(voucher.cost_points)} points`}
        >
          {canRedeem ? 'Redeem' : 'Need more pts'}
        </Button>
      </div>
    </div>
  );
}
