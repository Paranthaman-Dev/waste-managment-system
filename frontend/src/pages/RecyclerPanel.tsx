import { ChangeEvent, useEffect, useState } from 'react';
import { Card, buttonClass, secondaryButtonClass, ghostButtonClass } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { PaginatedResponse, WasteBatch } from '../types/api';

export function RecyclerPanel() {
  const { token } = useAuth();
  const [available, setAvailable] = useState<WasteBatch[]>([]);
  const [mine, setMine] = useState<WasteBatch[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const [a, m] = await Promise.all([
      apiRequest<PaginatedResponse<WasteBatch>>('/recycler/batches', {}, token),
      apiRequest<PaginatedResponse<WasteBatch>>('/recycler/batches/my', {}, token),
    ]);
    setAvailable(a.items);
    setMine(m.items);
  }
  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, []);

  async function requestBatch(id: number) {
    await apiRequest(`/recycler/batches/${id}/request`, { method: 'POST' }, token);
    setMessage('Batch request sent — awaiting handover.');
    await load();
  }
  async function acceptBatch(id: number) {
    await apiRequest(`/recycler/batches/${id}/accept`, { method: 'POST' }, token);
    setMessage('Batch accepted — you can now process it.');
    await load();
  }
  async function uploadProof(id: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    await apiRequest(`/recycler/batches/${id}/proof`, { method: 'POST', body: form }, token);
    setMessage('Proof uploaded — kept for audit.');
    await load();
  }

  return (
    <div className="grid gap-6">
      {message && <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Available batches"
          subtitle="Collected waste ready for recycling"
          action={<span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{available.length} open</span>}
        >
          <div className="grid gap-3 max-h-[520px] overflow-auto pr-1">
            {available.map((b) => (
              <article key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold tracking-tight text-slate-900">
                    Batch #{b.id} <span className="font-medium text-slate-400">• Pickup #{b.pickup_request_id}</span>
                  </p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-600 capitalize">{b.status}</span>
                </div>
                <button className={`${buttonClass} mt-3 w-full`} onClick={() => requestBatch(b.id)}>
                  Request batch →
                </button>
              </article>
            ))}
            {available.length === 0 && <p className="py-10 text-center text-sm font-medium text-slate-400">No available batches — waiting for collector handover.</p>}
          </div>
        </Card>

        <Card
          title="My batches"
          subtitle="Batches assigned to you — add proof after processing"
          action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{mine.length} assigned</span>}
        >
          <div className="grid gap-3 max-h-[520px] overflow-auto pr-1">
            {mine.map((b) => (
              <article key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold tracking-tight text-slate-900">Batch #{b.id}</p>
                  <span className="inline-flex rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white capitalize">{b.status}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">Pickup #{b.pickup_request_id}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={buttonClass} onClick={() => acceptBatch(b.id)}>
                    Accept
                  </button>
                  <label className={`${secondaryButtonClass} cursor-pointer`}>
                    Upload proof
                    <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadProof(b.id, e)} />
                  </label>
                  {b.proof_url && (
                    <a href={b.proof_url} target="_blank" rel="noreferrer" className={ghostButtonClass}>
                      View proof
                    </a>
                  )}
                </div>
              </article>
            ))}
            {mine.length === 0 && <p className="py-10 text-center text-sm font-medium text-slate-400">No batches yet — request one from available.</p>}
          </div>
        </Card>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-600">Need help? Proof must be an image (PNG/JPG/WebP) — kept for audit trail.</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Audit-ready pipeline
        </span>
      </div>
    </div>
  );
}
