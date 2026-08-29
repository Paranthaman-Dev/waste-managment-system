import { ChangeEvent, useEffect, useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardDescription, Badge, EmptyState, Skeleton, SimpleTabs, Pagination, Alert, Label, Select } from '../../components/ui/primitives';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import type { PaginatedResponse, WasteBatch, Recycler } from '../../types/api';

export function RecyclerDashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState<WasteBatch[]>([]);
  const [mine, setMine] = useState<WasteBatch[]>([]);
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [pageA, setPageA] = useState(1);
  const [pageM, setPageM] = useState(1);
  const [totalA, setTotalA] = useState(0);
  const [totalM, setTotalM] = useState(0);
  const [wasteFilter, setWasteFilter] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<{ total_batches: number; completed_batches: number; total_kg_processed: number; by_waste_type: { waste_type: string; total_kg: number; count: number }[] } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const qa = new URLSearchParams({ page: String(pageA), page_size: '20' });
      const qm = new URLSearchParams({ page: String(pageM), page_size: '20' });
      if (wasteFilter) qa.set('waste_type', wasteFilter);
      const [a, m, r, ana] = await Promise.all([
        apiRequest<PaginatedResponse<WasteBatch>>(`/recycler/batches?${qa.toString()}`, {}, token),
        apiRequest<PaginatedResponse<WasteBatch>>(`/recycler/batches/my?${qm.toString()}`, {}, token),
        apiRequest<Recycler>('/recycler/profile', {}, token).catch(() => null),
        apiRequest<{ total_batches: number; completed_batches: number; total_kg_processed: number; by_waste_type: { waste_type: string; total_kg: number; count: number }[] }>('/recycler/analytics/summary', {}, token).catch(() => null),
      ]);
      setAvailable(a.items);
      setTotalA(a.total);
      setMine(m.items);
      setTotalM(m.total);
      setRecycler(r);
      setAnalytics(ana);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [pageA, pageM, wasteFilter]);

  async function requestBatch(id: number) {
    setActing(id);
    try {
      await apiRequest(`/recycler/batches/${id}/request`, { method: 'POST' }, token);
      setMessage('Batch requested — now in your queue as requested.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setActing(null);
    }
  }
  async function acceptBatch(id: number) {
    setActing(id);
    try {
      await apiRequest(`/recycler/batches/${id}/accept`, { method: 'POST' }, token);
      setMessage('Batch accepted — handed over, you can now process.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Accept failed');
    } finally {
      setActing(null);
    }
  }
  async function uploadProof(id: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setActing(id);
    try {
      await apiRequest(`/recycler/batches/${id}/proof`, { method: 'POST', body: form }, token);
      setMessage('Proof uploaded — audit trail updated, batch completed if processing.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed — use PNG/JPG/WebP');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-display">Recycler operations</h1>
          <p className="text-sm text-muted-foreground">Batches from collected pickups — request, accept, proof.</p>
        </div>
        <SimpleTabs tabs={[{ id: 'available', label: 'Available' }, { id: 'mine', label: 'My batches' }, { id: 'analytics', label: 'Analytics' }]} active={tab} onChange={setTab} />
      </div>

      {recycler && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Capacity {recycler.capacity_kg} kg • Rating {recycler.rating.toFixed(1)} / 5</p>
              <p className="text-xs text-muted-foreground">Accepts: {recycler.accepted_waste_types?.join(', ') || 'Any'}</p>
            </div>
            <Badge tone="info">{mine.length} in possession</Badge>
          </div>
        </Card>
      )}

      {message && <Alert variant="success">{message}</Alert>}

      {tab === 'available' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Available batches</CardTitle>
              <CardDescription>From collected pickups — filter by waste type</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={wasteFilter} onChange={(e) => { setWasteFilter(e.target.value); setPageA(1); }}>
                <option value="">All types</option>
                <option value="organic">Organic</option>
                <option value="plastic">Plastic</option>
                <option value="e-waste">E-waste</option>
                <option value="metal">Metal</option>
              </Select>
            </div>
          </CardHeader>
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : available.length === 0 ? (
            <EmptyState title="No available batches" description="Waiting for collectors to hand over collected pickups." />
          ) : (
            <>
              <div className="grid gap-3">
                {available.map((b) => (
                  <div key={b.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold">
                        Batch #{b.id} <span className="font-medium text-muted-foreground">• Pickup #{b.pickup_request_id}</span> <Badge tone="amber">{b.status}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">Hand over pending • Proof not yet</p>
                    </div>
                    <Button onClick={() => requestBatch(b.id)} loading={acting === b.id}>
                      Request →
                    </Button>
                  </div>
                ))}
              </div>
              <Pagination page={pageA} totalPages={Math.ceil(totalA / 20) || 1} onPageChange={setPageA} />
            </>
          )}
        </Card>
      )}

      {tab === 'mine' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>My batches</CardTitle>
              <CardDescription>Requested → accepted → processing → completed + proof</CardDescription>
            </div>
            <Badge tone="info">{totalM} total</Badge>
          </CardHeader>
          {loading ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : mine.length === 0 ? (
            <EmptyState title="No batches yet" description="Request from available — they will appear here." />
          ) : (
            <>
              <div className="grid gap-3">
                {mine.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-border bg-muted p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">Batch #{b.id}</p>
                      <Badge tone={b.status === 'completed' ? 'sage' : b.status === 'accepted' ? 'info' : 'amber'}>{b.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Pickup #{b.pickup_request_id} {b.handed_over_at && `• Handed ${new Date(b.handed_over_at).toLocaleString()}`}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => acceptBatch(b.id)} loading={acting === b.id} disabled={b.status !== 'requested'}>
                        Accept
                      </Button>
                      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-white px-4 text-xs font-semibold hover:bg-muted">
                        Upload proof
                        <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadProof(b.id, e)} />
                      </label>
                      {b.proof_url && (
                        <a href={`${b.proof_url}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-xl border border-border bg-white px-4 text-xs font-semibold hover:bg-muted">
                          View proof
                        </a>
                      )}
                    </div>
                    {b.proof_url && <p className="mt-2 text-xs font-medium text-success">✓ Proof attached — {b.proof_url}</p>}
                    {b.processed_at && <p className="text-xs text-muted-foreground">Processed {new Date(b.processed_at).toLocaleString()}</p>}
                  </div>
                ))}
              </div>
              <Pagination page={pageM} totalPages={Math.ceil(totalM / 20) || 1} onPageChange={setPageM} />
            </>
          )}
        </Card>
      )}

      {tab === 'analytics' && (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-label text-muted-foreground">Total batches</p>
              <p className="mt-1 text-3xl font-bold">{analytics?.total_batches ?? 0}</p>
            </Card>
            <Card>
              <p className="text-label text-muted-foreground">Completed</p>
              <p className="mt-1 text-3xl font-bold">{analytics?.completed_batches ?? 0}</p>
            </Card>
            <Card>
              <p className="text-label text-muted-foreground">Kg processed</p>
              <p className="mt-1 text-3xl font-bold">{analytics?.total_kg_processed ?? 0} kg</p>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>By waste type</CardTitle>
                <CardDescription>Completed only — kg and count</CardDescription>
              </div>
            </CardHeader>
            {analytics?.by_waste_type && analytics.by_waste_type.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {analytics.by_waste_type.map((row) => (
                  <div key={row.waste_type} className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-sm font-bold capitalize">{row.waste_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.count} batches • {row.total_kg} kg
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No analytics yet" description="Complete batches to see breakdown by type." />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
