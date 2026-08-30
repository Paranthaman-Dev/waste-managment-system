import React, { FormEvent, useEffect, useState } from 'react';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  EmptyState,
  Pagination,
  Modal,
  Switch,
  Textarea,
  useAuth,
  useToast,
  getAllVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getRedemptions,
  updateRedemptionStatus,
} from '@wm/shared';
import type { Voucher, RewardRedemption } from '@wm/shared';
import { Gift, PlusCircle, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  description: '',
  cost_points: 10,
  active: true,
  valid_until: '',
};

export function VouchersSection() {
  const { token } = useAuth();
  const { success, error: toastError } = useToast();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [redTotal, setRedTotal] = useState(0);
  const [redPage, setRedPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Voucher | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<number | null>(null);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const [v, r] = await Promise.all([
        getAllVouchers(token),
        getRedemptions(token, { page: redPage, page_size: 12 }),
      ]);
      setVouchers(v);
      setRedemptions(r.items);
      setRedTotal(r.total);
    } catch (e) {
      toastError('Load Error', e instanceof Error ? e.message : 'Could not load vouchers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redPage]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(v: Voucher) {
    setEditing(v);
    setForm({
      title: v.title,
      description: v.description ?? '',
      cost_points: v.cost_points,
      active: v.active,
      valid_until: v.valid_until ? v.valid_until.slice(0, 16) : '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
  }

  async function saveVoucher(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.title.trim()) return toastError('Validation Error', 'Voucher title is required.');
    if (form.cost_points <= 0) return toastError('Validation Error', 'Cost must be greater than 0 points.');

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      cost_points: form.cost_points,
      active: form.active,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
    };

    try {
      if (editing) {
        await updateVoucher(token, editing.id, payload);
        success('Voucher Updated', `"${payload.title}" is now live.`);
      } else {
        await createVoucher(token, payload);
        success('Voucher Created', `"${payload.title}" posted for redemption.`);
      }
      setEditing(null);
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      toastError('Save Failed', err instanceof Error ? err.message : 'Could not save voucher.');
    } finally {
      setSaving(false);
    }
  }

  async function removeVoucher(v: Voucher) {
    if (!token) return;
    if (!confirm(`Delete voucher "${v.title}"? Existing redemptions are preserved.`)) return;
    try {
      await deleteVoucher(token, v.id);
      success('Voucher Deleted', `"${v.title}" removed from the catalogue.`);
      await loadData();
    } catch (e) {
      toastError('Delete Failed', e instanceof Error ? e.message : 'Could not delete voucher.');
    }
  }

  async function setRedemptionStatus(r: RewardRedemption, status: string) {
    if (!token) return;
    setActing(r.id);
    try {
      await updateRedemptionStatus(token, r.id, status);
      success(status === 'issued' ? 'Voucher Issued' : 'Redemption Cancelled', `Refunded ${r.points_spent} pts to user.`);
      await loadData();
    } catch (e) {
      toastError('Update Failed', e instanceof Error ? e.message : 'Could not update redemption.');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Voucher Catalogue ({vouchers.length})
            </CardTitle>
            <CardDescription>Post redeemable vouchers residents can spend reward points on</CardDescription>
          </div>
          <Button size="sm" onClick={openNew}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" /> New Voucher
          </Button>
        </CardHeader>

        {loading ? (
          <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-[12px] bg-surface-muted" aria-hidden />
            ))}
          </div>
        ) : vouchers.length === 0 ? (
          <EmptyState
            title="No vouchers posted"
            description="Create your first reward voucher so residents can redeem points."
            icon={<Gift className="h-5 w-5 text-muted-foreground" />}
          />
        ) : (
          <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((v) => (
              <div key={v.id} className="rounded-[12px] border border-border bg-surface p-3.5 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground leading-snug truncate">{v.title}</p>
                    {v.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{v.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-lg bg-surface-muted border border-border px-2 py-0.5 font-mono text-xs font-bold text-primary">
                    {v.cost_points} pts
                  </span>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={v.active ? 'sage' : 'neutral'} dot>
                      {v.active ? 'Active' : 'Hidden'}
                    </Badge>
                    {v.valid_until && (
                      <span className="text-[10px] text-muted-foreground">
                        until {new Date(v.valid_until).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(v)} aria-label={`Edit ${v.title}`}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeVoucher(v)} className="text-red-600 hover:bg-red-50" aria-label={`Delete ${v.title}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Redemption Queue ({redTotal})
            </CardTitle>
            <CardDescription>Issue or cancel vouchers residents have redeemed with points</CardDescription>
          </div>
        </CardHeader>

        {loading ? (
          <div className="space-y-2 p-4 pt-0">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-muted" aria-hidden />
            ))}
          </div>
        ) : redemptions.length === 0 ? (
          <EmptyState
            title="No redemptions in queue"
            description="When residents spend points on vouchers, they appear here for fulfilment."
            icon={<Gift className="h-5 w-5 text-muted-foreground" />}
          />
        ) : (
          <>
            <div className="space-y-2 p-4 pt-0">
              {redemptions.map((r) => (
                <div
                  key={r.id}
                  className="rounded-[12px] border border-border bg-surface p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {r.voucher_title ?? `Voucher #${r.voucher_id}`}
                      </span>
                      <Badge tone={r.status === 'issued' ? 'sage' : r.status === 'pending' ? 'amber' : 'neutral'}>
                        {r.status}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                        {r.points_spent} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {r.username ?? `User #${r.user_id}`} • Redeemed {new Date(r.redeemed_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setRedemptionStatus(r, 'issued')}
                          loading={acting === r.id}
                          disabled={acting !== null}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Issue Voucher
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRedemptionStatus(r, 'cancelled')}
                          loading={acting === r.id}
                          disabled={acting !== null}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </>
                    )}
                    {r.status !== 'pending' && (
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                        {r.status === 'issued' ? 'Dispatched' : 'Closed'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pb-4">
              <Pagination page={redPage} totalPages={Math.ceil(redTotal / 12) || 1} onPageChange={setRedPage} />
            </div>
          </>
        )}
      </Card>

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? `Edit Voucher: ${editing.title}` : 'New Voucher'}
        description="Residents spend reward points to redeem these vouchers"
      >
        <form onSubmit={saveVoucher} className="space-y-3.5">
          <div className="space-y-1">
            <Label htmlFor="voucher-title">Title</Label>
            <Input
              id="voucher-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 20% off Evergreen Groceries"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="voucher-desc">Description</Label>
            <Textarea
              id="voucher-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this voucher offer?"
              rows={2}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="voucher-cost">Cost (points)</Label>
              <Input
                id="voucher-cost"
                type="number"
                min="1"
                value={form.cost_points}
                onChange={(e) => setForm({ ...form, cost_points: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="voucher-valid">Valid Until (optional)</Label>
              <Input
                id="voucher-valid"
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-surface-muted">
            <div>
              <p className="text-xs font-bold text-foreground">Visible to residents</p>
              <p className="text-[10px] text-muted-foreground">Hidden vouchers stay in the catalogue but can't be redeemed</p>
            </div>
            <Switch
              checked={form.active}
              onChange={(v) => setForm({ ...form, active: v })}
              label={form.active ? 'Active' : 'Hidden'}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              {editing ? 'Save Voucher' : 'Post Voucher'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}