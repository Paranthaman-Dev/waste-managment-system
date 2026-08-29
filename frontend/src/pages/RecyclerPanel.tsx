import { ChangeEvent, useEffect, useState } from 'react';
import { Card, buttonClass, ghostButtonClass } from '../components/Layout';
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
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  async function requestBatch(id: number) {
    await apiRequest(`/recycler/batches/${id}/request`, { method: 'POST' }, token);
    setMessage('Batch requested — Y2K chrome queued.');
    await load();
  }
  async function acceptBatch(id: number) {
    await apiRequest(`/recycler/batches/${id}/accept`, { method: 'POST' }, token);
    setMessage('Batch accepted — HUD processing.');
    await load();
  }
  async function uploadProof(id: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    await apiRequest(`/recycler/batches/${id}/proof`, { method: 'POST', body: form }, token);
    setMessage('Proof uploaded — sketch archived.');
    await load();
  }

  return (
    <div className="grid gap-6">
      {message && <p className="rounded-xl border border-teal-300/30 bg-teal-50 px-3 py-2 font-mono text-xs font-semibold text-teal-800">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Available Batches" action={<span className="rounded-full bg-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan">{available.length} open</span>}>
          <div className="grid gap-3 max-h-[520px] overflow-auto pr-1">
            {available.map((b) => (
              <article key={b.id} className="rounded-2xl border border-ink/10 bg-white p-4 hover:shadow-neon-cyan hover:border-neon-cyan/30 transition-all">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-black tracking-tight text-ink">Batch #{b.id} <span className="font-mono text-xs font-medium text-ink/40">· Pickup #{b.pickup_request_id}</span></p>
                  <span className="rounded-full bg-skin-paper border border-ink/10 px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">{b.status}</span>
                </div>
                <button className={`${buttonClass} mt-3 w-full`} onClick={() => requestBatch(b.id)}>Request batch — Chrome</button>
              </article>
            ))}
            {available.length === 0 && <p className="text-center font-mono text-xs uppercase tracking-widest text-ink/30 py-8">No available batches — waiting for collector handover</p>}
          </div>
        </Card>

        <Card title="My Batches" action={<span className="font-mono text-[11px] uppercase tracking-widest text-ink/40">{mine.length} assigned</span>}>
          <div className="grid gap-3 max-h-[520px] overflow-auto pr-1">
            {mine.map((b) => (
              <article key={b.id} className="rounded-2xl bg-gradient-to-br from-white to-skin-paper border border-teal-900/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-black tracking-tight text-ink">Batch #{b.id}</p>
                  <span className="inline-flex rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-neon-pink">{b.status}</span>
                </div>
                <p className="font-mono text-xs text-ink/60 mt-1">Pickup #{b.pickup_request_id}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={buttonClass} onClick={() => acceptBatch(b.id)}>Accept</button>
                  <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl chrome px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-ink">
                    Upload proof
                    <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadProof(b.id, e)} />
                  </label>
                  {b.proof_url && <a href={b.proof_url} target="_blank" rel="noreferrer" className={ghostButtonClass + ' !min-h-[36px] text-[11px]'}>View proof</a>}
                </div>
              </article>
            ))}
            {mine.length === 0 && <p className="text-center font-mono text-xs uppercase tracking-widest text-ink/30 py-8">No batches yet — request from available</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
