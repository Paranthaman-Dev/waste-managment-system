import { ChangeEvent, useEffect, useState } from 'react';
import { Card, buttonClass, secondaryButtonClass, ghostButtonClass } from '../components/Layout';
import { StatsCard } from '../components/StatsCard';
import { EmptyState, MiniAreaChart } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { PaginatedResponse, WasteBatch } from '../types/api';

export function RecyclerPanel() {
  const { token } = useAuth();
  const [available, setAvailable] = useState<WasteBatch[]>([]);
  const [mine, setMine] = useState<WasteBatch[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, m] = await Promise.all([
        apiRequest<PaginatedResponse<WasteBatch>>('/recycler/batches', {}, token),
        apiRequest<PaginatedResponse<WasteBatch>>('/recycler/batches/my', {}, token),
      ]);
      setAvailable(a.items);
      setMine(m.items);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function requestBatch(id: number) {
    setActingId(id);
    try {
      await apiRequest(`/recycler/batches/${id}/request`, { method: 'POST' }, token);
      setMessage('Batch request sent — awaiting handover.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setActingId(null);
    }
  }
  async function acceptBatch(id: number) {
    setActingId(id);
    try {
      await apiRequest(`/recycler/batches/${id}/accept`, { method: 'POST' }, token);
      setMessage('Batch accepted — you can now process it.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Accept failed');
    } finally {
      setActingId(null);
    }
  }
  async function uploadProof(id: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setActingId(id);
    try {
      await apiRequest(`/recycler/batches/${id}/proof`, { method: 'POST', body: form }, token);
      setMessage('Proof uploaded — audit trail updated.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed — use PNG/JPG/WebP');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Available" value={available.length} description="Collected waste ready for recycling" tone="amber" />
        <StatsCard title="My batches" value={mine.length} description="Assigned to you" tone="violet" progress={mine.length ? (mine.filter((b) => b.status === 'completed').length / mine.length) * 100 : 0} />
        <StatsCard title="Proofs uploaded" value={mine.filter((b) => b.proof_url).length} description="Audit-ready • Image proof" tone="emerald" />
        <StatsCard title="Completed" value={mine.filter((b) => b.status === 'completed').length} description="Processed • Closed" tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card title="Throughput — 7 days" subtitle="Available vs accepted — accessible legend">
          <div className="flex items-center gap-4">
            <MiniAreaChart data={[2, 4, 3, 5, 4, available.length, available.length + mine.length]} color="#7C3AED" />
            <div className="text-xs">
              <p className="font-semibold text-slate-900">{available.length + mine.length} batches this week</p>
              <div className="mt-1 flex gap-2 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> Available
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-violet-500" aria-hidden /> Mine
                </span>
              </div>
            </div>
          </div>
        </Card>
        <Card title="Audit" subtitle="Proof = image (PNG/JPG/WebP)">
          <p className="text-xs leading-relaxed text-slate-600">Every proof is stored, linked to batch, and visible to management. Color + text convey status.</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Audit trail preserved
          </div>
        </Card>
      </div>

      {message && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800" role="status" aria-live="polite">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          id="queue"
          title="Available batches"
          subtitle="Collected waste ready for recycling — request to claim"
          action={<span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{available.length} open</span>}
        >
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 skeleton" />
              ))}
            </div>
          ) : available.length === 0 ? (
            <EmptyState title="No available batches" description="Waiting for collector handover. New batches appear here instantly." />
          ) : (
            <div className="grid gap-3 max-h-[540px] overflow-auto pr-1">
              {available.map((b) => (
                <article key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold tracking-tight text-slate-900">
                      Batch #{b.id} <span className="font-medium text-slate-400">• Pickup #{b.pickup_request_id}</span>
                    </p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-600 capitalize">{b.status}</span>
                  </div>
                  <button className={`${buttonClass} mt-3 w-full`} onClick={() => requestBatch(b.id)} disabled={actingId === b.id} aria-busy={actingId === b.id}>
                    {actingId === b.id ? 'Requesting…' : 'Request batch →'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="My batches"
          subtitle="Assigned to you — accept, process, add proof"
          action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{mine.length} assigned</span>}
        >
          {loading ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 skeleton" />
              ))}
            </div>
          ) : mine.length === 0 ? (
            <EmptyState title="No batches yet" description="Request one from available — it will move here for processing." />
          ) : (
            <div className="grid gap-3 max-h-[540px] overflow-auto pr-1">
              {mine.map((b) => (
                <article key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold tracking-tight text-slate-900">Batch #{b.id}</p>
                    <span className="inline-flex rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white capitalize">{b.status}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500">Pickup #{b.pickup_request_id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className={buttonClass} onClick={() => acceptBatch(b.id)} disabled={actingId === b.id}>
                      Accept
                    </button>
                    <label className={`${secondaryButtonClass} cursor-pointer`} aria-label={`Upload proof for batch ${b.id}`}>
                      Upload proof
                      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadProof(b.id, e)} />
                    </label>
                    {b.proof_url && (
                      <a href={b.proof_url} target="_blank" rel="noreferrer" className={ghostButtonClass} aria-label={`View proof for batch ${b.id}`}>
                        View proof
                      </a>
                    )}
                  </div>
                  {b.proof_url && <p className="mt-2 text-[11px] font-medium text-emerald-700">✓ Proof attached • Audit-ready</p>}
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
