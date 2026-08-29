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
    await apiRequest<PickupRequest>(
      '/user/pickups',
      {
        method: 'POST',
        body: JSON.stringify({ waste_type: wasteType, quantity_kg: quantityKg, location }),
      },
      token,
    );
    setMessage('Pickup request created — we’ll notify a collector nearby.');
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
      {/* Left – Request + History */}
      <div className="grid gap-6 content-start">
        <Card
          title="Request a pickup"
          subtitle="Choose waste type, weight, and precise location"
          action={<span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">Resident</span>}
        >
          <form onSubmit={submitPickup} className="grid gap-4">
            <Field label="Waste type" hint="organic · plastic · e-waste · metal">
              <select
                className={inputClass}
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
              >
                <option value="organic">Organic</option>
                <option value="plastic">Plastic</option>
                <option value="e-waste">E-waste</option>
                <option value="metal">Metal</option>
                <option value="paper">Paper</option>
                <option value="glass">Glass</option>
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity (kg)">
                <input className={inputClass} type="number" min="0.1" step="0.1" value={quantityKg} onChange={(e) => setQuantityKg(Number(e.target.value))} />
              </Field>
              <Field label="Location">
                <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Chennai, MG Road" />
              </Field>
            </div>
            <button className={buttonClass}>Create pickup request →</button>
            <p className="text-center text-[11px] font-medium text-slate-400">Collector assignment within 2h • Track in history</p>
          </form>
          {message && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">{message}</p>}
        </Card>

        <Card
          title="Pickup history"
          subtitle="Recent requests and their status"
          action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{pickups.length} records</span>}
        >
          {pickups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
              </div>
              <p className="mt-3 text-sm font-semibold tracking-tight text-slate-700">No pickups yet</p>
              <p className="text-xs leading-relaxed text-slate-500">Create your first request — it will appear here with live status.</p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-[420px] overflow-auto pr-1">
              {pickups.map((p) => (
                <article key={p.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold tracking-tight text-slate-900 capitalize">
                        {p.waste_type} <span className="font-medium text-slate-400">· {p.quantity_kg} kg</span>
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {p.location} •{' '}
                        <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white capitalize">{p.status}</span>
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide text-slate-400">#{p.id}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Right – Map */}
      <Card
        title="Public bins map"
        subtitle="Nearby collection points — filter by waste type"
        action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{bins.length} bins</span>}
      >
        <Field label="Filter by waste type" hint="plastic, organic, e-waste… leave empty for all">
          <div className="flex gap-2">
            <input className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="plastic, organic..." />
            {filter && (
              <button type="button" onClick={() => setFilter('')} className={ghostButtonClass}>
                Clear
              </button>
            )}
          </div>
        </Field>
        <div className="mt-4">
          <BinMap bins={bins} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['plastic', 'organic', 'e-waste', 'metal', ''].map((v) => (
            <button
              key={v || 'all'}
              onClick={() => setFilter(v)}
              className={v === filter ? buttonClass + ' !h-8 !px-3 !text-xs' : ghostButtonClass + ' !h-8 !px-3 !text-xs'}
            >
              {v || 'All'}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] font-medium tracking-wide text-slate-400">{bins.length} bins • Pinch to zoom • Click a pin for details</p>
      </Card>
    </div>
  );
}
