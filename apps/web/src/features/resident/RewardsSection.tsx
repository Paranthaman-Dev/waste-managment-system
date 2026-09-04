import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  EmptyState,
  ErrorState,
  Pagination,
  Modal,
  useAuth,
  useToast,
  getRewardBalance,
  getRewardRates,
  getRewardHistory,
  getVouchers,
  getMyRedemptions,
  redeemVoucher,
  RewardCard,
  VoucherTile,
  wasteTypeOptions,
} from '@wm/shared';
import type { RewardBalance, RewardRates, RewardLedger, Voucher, RewardRedemption } from '@wm/shared';
import { Gift, History, Sparkles } from 'lucide-react';

export function RewardsSection() {
  const { token, role } = useAuth();
  const { success, error: toastError } = useToast();

  const [balance, setBalance] = useState<RewardBalance | null>(null);
  const [rates, setRates] = useState<RewardRates | null>(null);
  const [history, setHistory] = useState<RewardLedger[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeeming, setRedeeming] = useState<Voucher | null>(null);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  async function loadRewards() {
    if (!token) return;
    // Only residents have balance/history/voucher redemption; other roles see rates only
    if (role && role !== 'user') {
      setLoading(true);
      setError('');
      try {
        const rate = await getRewardRates(token);
        setRates(rate);
      } catch (e) {
        toastError('Load Error', e instanceof Error ? e.message : 'Could not load reward rates.');
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Fetch each resource independently so one 403/422 doesn't wipe the whole dashboard.
      // getRewardRates is public (any role) and should never block voucher/history.
      const results = await Promise.allSettled([
        getRewardBalance(token),
        getRewardRates(token),
        getRewardHistory(token, { page, page_size: 10 }),
        getVouchers(token),
        getMyRedemptions(token),
      ]);
      const [balR, rateR, histR, vocR, redR] = results;
      if (balR.status === 'fulfilled') setBalance(balR.value);
      else {
        const msg = balR.reason instanceof Error ? balR.reason.message : String(balR.reason);
        // 403 means not resident – don't show ErrorState, just toast
        if (msg.includes('403') || msg.includes('Not enough permissions')) toastError('Balance unavailable', msg);
        else setError(msg || 'Could not load balance.');
      }
      if (rateR.status === 'fulfilled') setRates(rateR.value);
      else toastError('Rates unavailable', rateR.reason instanceof Error ? rateR.reason.message : String(rateR.reason));
      if (histR.status === 'fulfilled') {
        setHistory(histR.value.items);
        setHistoryTotal(histR.value.total);
      } else if (histR.status === 'rejected') {
        const m = histR.reason instanceof Error ? histR.reason.message : String(histR.reason);
        if (!m.includes('403')) setError(m);
      }
      if (vocR.status === 'fulfilled') setVouchers(vocR.value);
      else {
        const m = vocR.reason instanceof Error ? vocR.reason.message : String(vocR.reason);
        // 403 here would mean token is management trying to use resident endpoint – surface as toast not crash
        if (m.includes('403') || m.includes('Not enough permissions')) toastError('Vouchers unavailable', m);
        else toastError('Vouchers unavailable', m);
        setVouchers([]);
      }
      if (redR.status === 'fulfilled') setRedemptions(redR.value);
      else if (redR.status === 'rejected') {
        const m = redR.reason instanceof Error ? redR.reason.message : String(redR.reason);
        if (!m.includes('403')) toastError('Redemptions unavailable', m);
      }
      // if all rejected and no partial data, surface generic error
      const anyOk = results.some((r) => r.status === 'fulfilled');
      if (!anyOk) setError((results.find((r) => r.status === 'rejected') as PromiseRejectedResult)?.reason?.message ?? 'Could not load rewards.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rewards.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token, role]);

  async function confirmRedeem() {
    if (!token || !redeeming) return;
    setRedeemingId(redeeming.id);
    try {
      const red = await redeemVoucher(token, redeeming.id);
      success('Redeemed!', `${redeeming.title} (${
        typeof red.points_spent === 'number' ? red.points_spent : redeeming.cost_points
      } pts) queued for fulfilment.`);
      setRedeeming(null);
      await loadRewards();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not redeem voucher.';
      // Map backend statuses to friendly copy without exposing raw 422/409
      let friendly = raw;
      if (raw.includes('Insufficient')) friendly = raw; // already friendly from backend 409
      else if (raw.includes('expired') || raw.includes('no longer active')) friendly = 'This voucher is no longer available.';
      else if (raw.includes('422')) friendly = 'Invalid request – please refresh and try again.';
      toastError('Redemption Failed', friendly);
    } finally {
      setRedeemingId(null);
    }
  }

  const rateRows = Object.entries(rates?.rates ?? {});
  const totalPages = Math.ceil(historyTotal / 10) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <ErrorState message={error} onRetry={loadRewards} />}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <RewardCard balance={balance} loading={loading} />

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Reward Rates
              </CardTitle>
              <CardDescription>Points earned per kilogram collected</CardDescription>
            </div>
          </CardHeader>
          {loading ? (
            <div className="space-y-2 p-4 pt-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-7 animate-pulse rounded-md bg-surface-muted" aria-hidden />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 p-4 pt-0">
              {wasteTypeOptions.map((type) => {
                const pts = rates?.rates?.[type] ?? rates?.default ?? 0;
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between rounded-[10px] border border-border bg-surface px-2.5 py-2"
                  >
                    <span className="text-xs font-semibold text-foreground capitalize">{type}</span>
                    <span className="font-mono text-xs font-bold text-primary">{pts} pts/kg</span>
                  </div>
                );
              })}
              {rateRows.length > 0 && (
                <div className="col-span-2 mt-0.5 flex items-center justify-between rounded-[10px] border border-border bg-surface px-2.5 py-2">
                  <span className="text-xs font-semibold text-foreground">Other materials</span>
                  <span className="font-mono text-xs font-bold text-primary">{rates?.default ?? 0} pts/kg</span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Redeem Vouchers
            </CardTitle>
            <CardDescription>
              Spend your reward points on vouchers posted by the municipality
            </CardDescription>
          </div>
        </CardHeader>

        {loading ? (
          <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-[12px] bg-surface-muted" aria-hidden />
            ))}
          </div>
        ) : vouchers.length === 0 ? (
          <EmptyState
            title="No vouchers right now"
            description="The municipality hasn't posted any redeemable vouchers yet. Check back soon."
            icon={<Gift className="h-5 w-5 text-muted-foreground" />}
          />
        ) : (
          <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((v) => {
              const canRedeem = (balance?.balance ?? 0) >= v.cost_points;
              return (
                <VoucherTile
                  key={v.id}
                  voucher={v}
                  canRedeem={canRedeem}
                  redeeming={redeemingId === v.id}
                  onRedeem={(voucher) => setRedeeming(voucher)}
                />
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Points History
              </CardTitle>
              <CardDescription>Every credit you've earned from verified collections</CardDescription>
            </div>
          </CardHeader>
          {loading ? (
            <div className="space-y-2 p-4 pt-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-surface-muted" aria-hidden />
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              title="No points earned yet"
              description="Complete a pickup and your points will show up here."
              icon={<Sparkles className="h-5 w-5 text-muted-foreground" />}
            />
          ) : (
            <>
              <div className="space-y-2 p-4 pt-0">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-[10px] border border-border bg-surface px-3 py-2.5"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground capitalize">
                        {entry.waste_type.replace('_', ' ')} • {entry.weight_kg} kg
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                        {entry.pickup_id ? ` • Pickup #${entry.pickup_id}` : entry.batch_id ? ` • Batch #${entry.batch_id}` : ''}
                      </p>
                    </div>
                    <Badge tone="sage">+{entry.points}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex justify-center pb-4">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>My Redemptions</CardTitle>
              <CardDescription>Vouchers you've spent points on</CardDescription>
            </div>
          </CardHeader>
          {loading ? (
            <div className="space-y-2 p-4 pt-0">
              {[0, 1].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-surface-muted" aria-hidden />
              ))}
            </div>
          ) : redemptions.length === 0 ? (
            <EmptyState
              title="No redemptions yet"
              description="Redeem a voucher above and track it here."
              icon={<Gift className="h-5 w-5 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-2 p-4 pt-0">
              {redemptions.map((r) => (
                <div
                  key={r.id}
                  className="rounded-[10px] border border-border bg-surface px-3 py-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{r.voucher_title ?? `Voucher #${r.voucher_id}`}</p>
                    <Badge tone={r.status === 'issued' ? 'sage' : r.status === 'pending' ? 'amber' : 'neutral'}>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.redeemed_at).toLocaleDateString()} • {r.points_spent} pts
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!redeeming}
        onClose={() => setRedeeming(null)}
        title="Confirm redemption"
        description={
          redeeming
            ? `Spend ${redeeming.cost_points} pts to redeem “${redeeming.title}”. Points are deducted now; the voucher is issued once the municipality confirms it.`
            : undefined
        }
      >
        {redeeming && (
          <div className="flex items-center justify-between gap-2 rounded-[12px] border border-border bg-surface-muted p-3">
            <div>
              <p className="text-sm font-bold text-foreground">{redeeming.title}</p>
              {redeeming.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{redeeming.description}</p>
              )}
            </div>
            <span className="shrink-0 font-mono text-lg font-bold text-primary">{redeeming.cost_points} pts</span>
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setRedeeming(null)}>
            Cancel
          </Button>
          <Button
            loading={redeemingId !== null}
            onClick={confirmRedeem}
            aria-label={redeeming ? `Confirm redeem ${redeeming.title}` : 'Confirm redeem'}
          >
            Confirm Redemption
          </Button>
        </div>
      </Modal>
    </div>
  );
}