import { useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { Card, Field, inputClass, buttonClass, ghostButtonClass } from '../components/Layout';
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

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [filter]);

  async function accept(id: number) {
    await apiRequest(`/collector/pickups/${id}/accept`, { method: 'POST' }, token);
    setMessage('Pickup accepted — HUD updated.');
    await load();
  }
  async function updateStatus(id: number, status: string) {
    await apiRequest(`/collector/pickups/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, token);
    setMessage(`Pickup marked ${status}.`);
    await load();
  }

  return (
    <div className="grid gap-6">
      {/* Bento 2-col */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Available Pickups" action={<span className="rounded-full bg-neon-cyan px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">{available.length} queue</span>}>
          {message && <p className="mb-3 rounded-xl border border-teal-300/30 bg-teal-50 px-3 py-2 font-mono text-xs font-semibold text-teal-800">{message}</p>}
          {available.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/15 bg-skin-paper p-8 text-center font-mono text-xs uppercase tracking-widest text-ink/40">No pending — Y2K glossy idle</div>
          ) : (
            <div className="grid gap-3 max-h-[420px] overflow-auto pr-1">
              {available.map((p) => (
                <article key={p.id} className="rounded-2xl border border-ink/10 bg-white p-4 hover:border-neon-pink/30 hover:shadow-neon-pink transition-all">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-black tracking-tight text-ink">{p.waste_type} <span className="font-mono text-xs font-medium text-ink/40">· {p.quantity_kg} kg</span></p>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink/30">#{p.id}</span>
                  </div>
                  <p className="font-mono text-xs text-ink/60 mt-1">{p.location}</p>
                  <button className={`${buttonClass} mt-3 w-full`} onClick={() => accept(p.id)}>Accept — Chrome →</button>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card title="Assigned Pickups" action={<span className="font-mono text-[11px] uppercase tracking-widest text-ink/40">{assigned.length} active</span>}>
          <div className="grid gap-3 max-h-[420px] overflow-auto pr-1">
            {assigned.map((p) => (
              <article key={p.id} className="rounded-2xl border border-teal-900/10 bg-gradient-to-br from-white to-skin-paper p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-black tracking-tight text-ink">{p.waste_type} <span className="inline-flex ml-2 rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-neon-cyan">{p.status}</span></p>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink/30">#{p.id}</span>
                </div>
                <p className="font-mono text-xs text-ink/60 mt-1">{p.location}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={buttonClass} onClick={() => updateStatus(p.id, 'en_route')}>En route</button>
                  <button className="inline-flex min-h-[44px] items-center justify-center rounded-xl chrome px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-ink" onClick={() => updateStatus(p.id, 'collected')}>Collected</button>
                </div>
              </article>
            ))}
            {assigned.length === 0 && <p className="font-mono text-xs uppercase tracking-widest text-ink/30 text-center py-8">No assigned — ready for dispatch</p>}
          </div>
        </Card>
      </div>

      <Card title="Public Bins — Collector Read-Only" action={<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan">HUD MAP</span>}>
        <Field label="Filter by waste type"><input className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="plastic..." /></Field>
        <div className="mt-4 overflow-hidden rounded-[16px] border border-white/10 shadow-hud"><BinMap bins={bins} /></div>
        <div className="mt-2 flex gap-2">
          {['plastic', 'organic', ''].map((v) => (
            <button key={v || 'all'} onClick={() => setFilter(v)} className={v === filter ? buttonClass : ghostButtonClass + ' !min-h-[36px] text-[11px]'}>{v || 'All'}</button>
          ))}
        </div>
      </Card>
    </div>
  );
}
