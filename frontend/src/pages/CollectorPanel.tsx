import { useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { Card, Field, inputClass, buttonClass, ghostButtonClass, secondaryButtonClass } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { PaginatedResponse, PickupRequest, PublicBin } from '../types/api';

export function CollectorPanel() {
  const { token } = useAuth();
  const [assigned, setAssigned] = useState<PickupRequest[]>([]);
  const [available, setAvailable] = useState<PickupRequest[]>([]);
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const binPath = filter ? `/collector/bins?waste_type=${encodeURIComponent(filter)}` : '/collector/bins';
    const [assignedData, availableData, binData] = await Promise.all([
      apiRequest<PaginatedResponse<PickupRequest>>('/collector/pickups', {}, token),
      apiRequest<PickupRequest[]>('/collector/pickups/available', {}, token).catch(() => []),
      apiRequest<PublicBin[]>(binPath, {}, token),
    ]);
    setAssigned(assignedData.items);
    setAvailable(availableData);
    setBins(binData);
  }

  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, [filter]);

  async function accept(id: number) {
    await apiRequest(`/collector/pickups/${id}/accept`, { method: 'POST' }, token);
    setMessage('Pickup accepted — added to your route.');
    await load();
  }
  async function updateStatus(id: number, status: string) {
    await apiRequest(`/collector/pickups/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, token);
    setMessage(`Marked as ${status.replace('_', ' ')}.`);
    await load();
  }

  return (
    <div className="grid gap-6">
      {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Available pickups"
          subtitle="New requests near you — accept to assign"
          action={<span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">{available.length} in queue</span>}
        >
          {available.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-sm font-semibold text-slate-600">No pending pickups</p>
              <p className="text-xs text-slate-500">New requests will appear here instantly.</p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-[440px] overflow-auto pr-1">
              {available.map((p) => (
                <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold tracking-tight text-slate-900 capitalize">
                      {p.waste_type} <span className="font-medium text-slate-400">· {p.quantity_kg} kg</span>
                    </p>
                    <span className="text-[11px] font-semibold tracking-wide text-slate-400">#{p.id}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {p.location}
                  </p>
                  <button className={`${buttonClass} mt-3 w-full`} onClick={() => accept(p.id)}>
                    Accept pickup →
                  </button>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Assigned pickups"
          subtitle="Your active route — update status as you go"
          action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{assigned.length} active</span>}
        >
          <div className="grid gap-3 max-h-[440px] overflow-auto pr-1">
            {assigned.map((p) => (
              <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold tracking-tight text-slate-900 capitalize">
                    {p.waste_type}
                    <span className="ml-2 inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white capitalize">{p.status.replace('_', ' ')}</span>
                  </p>
                  <span className="text-[11px] font-semibold tracking-wide text-slate-400">#{p.id}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">{p.location} • {p.quantity_kg} kg</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={buttonClass} onClick={() => updateStatus(p.id, 'en_route')}>
                    En route
                  </button>
                  <button className={secondaryButtonClass} onClick={() => updateStatus(p.id, 'collected')}>
                    Mark collected
                  </button>
                </div>
              </article>
            ))}
            {assigned.length === 0 && <p className="py-10 text-center text-sm font-medium text-slate-400">No assigned pickups — accept from the queue.</p>}
          </div>
        </Card>
      </div>

      <Card
        title="Public bins — map"
        subtitle="Reference map for drop-offs (read-only)"
        action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{bins.length} bins</span>}
      >
        <Field label="Filter by waste type">
          <input className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="plastic, organic..." />
        </Field>
        <div className="mt-4">
          <BinMap bins={bins} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['plastic', 'organic', ''].map((v) => (
            <button key={v || 'all'} onClick={() => setFilter(v)} className={v === filter ? buttonClass + ' !h-8 !px-3 !text-xs' : ghostButtonClass + ' !h-8 !px-3 !text-xs'}>
              {v || 'All'}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
