import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { Card, Field, inputClass, buttonClass, ghostButtonClass } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { PaginatedResponse, PickupRequest, PublicBin } from '../types/api';

export function UserPanel() {
  const { token } = useAuth();
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [wasteType, setWasteType] = useState('organic');
  const [quantityKg, setQuantityKg] = useState(5);
  const [location, setLocation] = useState('Chennai');
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const binPath = filter ? `/user/bins?waste_type=${encodeURIComponent(filter)}` : '/user/bins';
    const [binData, pickupData] = await Promise.all([
      apiRequest<PublicBin[]>(binPath, {}, token),
      apiRequest<PaginatedResponse<PickupRequest>>('/user/pickups', {}, token),
    ]);
    setBins(binData);
    setPickups(pickupData.items);
  }

  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, [filter]);

  async function submitPickup(e: FormEvent) {
    e.preventDefault();
    await apiRequest<PickupRequest>('/user/pickups', {
      method: 'POST',
      body: JSON.stringify({ waste_type: wasteType, quantity_kg: quantityKg, location }),
    }, token);
    setMessage('Pickup request created — HUD synced.');
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
      {/* Left – Request + History – Bento */}
      <div className="grid gap-6 content-start">
        <Card
          title="Request Pickup"
          action={<span className="hidden sm:inline-flex rounded-full bg-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan">USER HUD</span>}
        >
          <form onSubmit={submitPickup} className="grid gap-4">
            <Field label="Waste type" hint="organic · plastic · e-waste · metal"><input className={inputClass} value={wasteType} onChange={(e) => setWasteType(e.target.value)} placeholder="organic" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity kg"><input className={inputClass} type="number" min="0.1" step="0.1" value={quantityKg} onChange={(e) => setQuantityKg(Number(e.target.value))} /></Field>
              <Field label="Location"><input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Chennai" /></Field>
            </div>
            <button className={buttonClass}>Create pickup — Y2K Chrome →</button>
          </form>
          {message && <p className="mt-3 rounded-xl border border-teal-300/30 bg-teal-50 px-3 py-2 font-mono text-xs font-semibold text-teal-800">{message}</p>}
        </Card>

        <Card title="Pickup History" action={<span className="font-mono text-[11px] uppercase tracking-widest text-ink/40">{pickups.length} records</span>}>
          {pickups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/15 bg-skin-paper p-8 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-ink/40">No pickups — sketch grid empty</p>
              <p className="mt-1 font-serif text-sm text-ink/60">Create your first request to see HUD timeline.</p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-[420px] overflow-auto pr-1">
              {pickups.map((p) => (
                <article key={p.id} className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-gradient-to-br from-white to-skin-paper p-4 hover:border-neon-cyan/30 hover:shadow-neon-cyan transition-all">
                  <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-neon-cyan to-teal-600 opacity-60 group-hover:opacity-100" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-black tracking-tight text-ink">{p.waste_type} <span className="font-mono text-xs font-medium text-ink/40">· {p.quantity_kg} kg</span></p>
                      <p className="font-mono text-xs text-ink/60">{p.location} · <span className="inline-flex rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-white">{p.status}</span></p>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink/30">#{p.id}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Right – Map – HUD */}
      <Card title="Public Bin Map" action={<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-cyan">READ ONLY — CYBERCORE</span>}>
        <Field label="Filter by waste type" hint="plastic, organic, e-waste… leave empty for all">
          <input className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="plastic, organic..." />
        </Field>
        <div className="mt-4 overflow-hidden rounded-[16px] border border-white/10 shadow-hud">
          <BinMap bins={bins} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['plastic', 'organic', 'e-waste', 'metal', ''].map((v) => (
            <button key={v || 'all'} onClick={() => setFilter(v)} className={v === filter ? buttonClass : ghostButtonClass + ' !min-h-[36px] !px-3 !py-1.5 text-[11px]'}>
              {v || 'All'}
            </button>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-ink/30">{bins.length} bins · conceptual sketch grid 24 · HUD layer 02</p>
      </Card>
    </div>
  );
}
