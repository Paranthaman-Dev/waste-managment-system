import { ChangeEvent, useEffect, useState } from 'react';
import { buttonClass, Card } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { PaginatedResponse, WasteBatch } from '../types/api';

export function RecyclerPanel() {
  const { token } = useAuth();
  const [available, setAvailable] = useState<WasteBatch[]>([]);
  const [mine, setMine] = useState<WasteBatch[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const [availableData, mineData] = await Promise.all([
      apiRequest<PaginatedResponse<WasteBatch>>('/recycler/batches', {}, token),
      apiRequest<PaginatedResponse<WasteBatch>>('/recycler/batches/my', {}, token),
    ]);
    setAvailable(availableData.items);
    setMine(mineData.items);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  async function requestBatch(id: number) {
    await apiRequest(`/recycler/batches/${id}/request`, { method: 'POST' }, token);
    setMessage('Batch requested.');
    await load();
  }

  async function acceptBatch(id: number) {
    await apiRequest(`/recycler/batches/${id}/accept`, { method: 'POST' }, token);
    setMessage('Batch accepted.');
    await load();
  }

  async function uploadProof(id: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    await apiRequest(`/recycler/batches/${id}/proof`, { method: 'POST', body: form }, token);
    setMessage('Proof uploaded.');
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Available Batches">
        {message && <p className="mb-3 text-sm font-semibold text-leaf">{message}</p>}
        <div className="grid gap-3">
          {available.map((batch) => (
            <article key={batch.id} className="rounded-2xl bg-moss p-4">
              <p className="font-bold text-earth">Batch #{batch.id}</p>
              <p className="text-sm text-earth/70">Pickup #{batch.pickup_request_id} · {batch.status}</p>
              <button className={`${buttonClass} mt-3`} onClick={() => requestBatch(batch.id)}>Request batch</button>
            </article>
          ))}
        </div>
      </Card>
      <Card title="My Batches">
        <div className="grid gap-3">
          {mine.map((batch) => (
            <article key={batch.id} className="rounded-2xl bg-white p-4 ring-1 ring-earth/10">
              <p className="font-bold text-earth">Batch #{batch.id} · {batch.status}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button className={buttonClass} onClick={() => acceptBatch(batch.id)}>Accept</button>
                <label className={buttonClass}>
                  Upload proof
                  <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadProof(batch.id, event)} />
                </label>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
