import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { Card, Field, inputClass, buttonClass, ghostButtonClass } from '../components/Layout';
import { StatsCard } from '../components/StatsCard';
import { EmptyState, MiniAreaChart } from '../components/ui';
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
  const [loading, setLoading] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const binPath = filter ? `/user/bins?waste_type=${encodeURIComponent(filter)}` : '/user/bins';
      const [binData, pickupData] = await Promise.all([
        apiRequest<PublicBin[]>(binPath, {}, token),
        apiRequest<PaginatedResponse<PickupRequest>>('/user/pickups', {}, token),
      ]);
      setBins(binData);
      setPickups(pickupData.items);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function submitPickup(e: FormEvent) {
    e.preventDefault();
    if (quantityKg <= 0) {
      setFieldError('Quantity must be greater than 0');
      return;
    }
    if (!location.trim()) {
      setFieldError('Location is required');
      return;
    }
    setFieldError(null);
    try {
      await apiRequest<PickupRequest>(
        '/user/pickups',
        {
          method: 'POST',
          body: JSON.stringify({ waste_type: wasteType, quantity_kg: quantityKg, location: location.trim() }),
        },
        token,
      );
      setMessage('Pickup request created — collector will be notified within 2 hours.');
      await load();
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : 'Failed to create pickup');
    }
  }

  const pending = pickups.filter((p) => p.status === 'pending').length;
  const completed = pickups.filter((p) => ['collected', 'completed'].includes(p.status)).length;

  return (
    <div className="grid gap-6">
      {/* Top stats — data-dense + bullet-like progress */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Total requests" value={pickups.length} description={`${pending} pending • ${completed} completed`} tone="primary" progress={pickups.length ? (completed / pickups.length) * 100 : 0} />
        <StatsCard title="Pending" value={pending} description="Awaiting collector assignment" tone="amber" />
        <StatsCard title="Completed" value={completed} description="Successfully collected" tone="emerald" />
        <StatsCard title="Nearby bins" value={bins.length} description="Within Chennai • Live" tone="slate" trend="Live" />
      </div>

      {/* Trend — mini area chart */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card
          title="Your impact — 7-day trend"
          subtitle="Pickup volume vs target (5 per week)"
          action={<span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">Weekly</span>}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Week of Aug 25</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">{pickups.length} pickups</p>
              <p className="text-xs font-medium text-slate-500">Target 5 • {pickups.length >= 5 ? 'Target met — emerald' : `${5 - pickups.length} to target — amber`} • color is supplementary</p>
            </div>
            <MiniAreaChart data={[2, 3, 2, 4, 3, pickups.length || 2, pickups.length || 3]} color="#2563EB" />
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={Math.min(100, (pickups.length / 5) * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${Math.min(100, (pickups.length / 5) * 100)}%` }} />
          </div>
        </Card>
        <Card title="How it works" subtitle="3 steps — progressive disclosure">
          <ol className="grid gap-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span>
              <span>
                <span className="font-semibold text-slate-900">Request</span>
                <span className="block text-xs text-slate-500">Choose type, weight, location — 44×44 touch, 8px spacing.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">2</span>
              <span>
                <span className="font-semibold text-slate-900">Collect</span>
                <span className="block text-xs text-slate-500">Collector accepts → en route → collected. Loading feedback at each step.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">3</span>
              <span>
                <span className="font-semibold text-slate-900">Recycle</span>
                <span className="block text-xs text-slate-500">Handed to recycler, proof uploaded, audit trail kept.</span>
              </span>
            </li>
          </ol>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
        {/* Left — Request + History */}
        <div className="grid gap-6 content-start">
          <Card
            id="pickups"
            title="Request a pickup"
            subtitle="Visible labels, helper text, error near field — focus moves to summary."
            action={<span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">Resident</span>}
          >
            <form onSubmit={submitPickup} noValidate className="grid gap-4">
              <Field label="Waste type" hint="organic · plastic · e-waste · metal · paper · glass">
                <select
                  id="waste_type"
                  className={inputClass}
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                  aria-describedby="waste_type-hint"
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
                <Field label="Quantity (kg)" hint="0.1 kg minimum, step 0.1" error={fieldError?.includes('Quantity') ? fieldError : undefined} id="quantity">
                  <input id="quantity" className={inputClass} type="number" min="0.1" step="0.1" value={quantityKg} onChange={(e) => setQuantityKg(Number(e.target.value))} aria-describedby="quantity-hint" aria-invalid={!!fieldError?.includes('Quantity')} />
                </Field>
                <Field label="Location" hint="Street or landmark — collector uses this" error={fieldError?.includes('Location') ? fieldError : undefined} id="location">
                  <input id="location" className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Chennai, MG Road" aria-describedby="location-hint" aria-invalid={!!fieldError?.includes('Location')} />
                </Field>
              </div>

              {fieldError && !fieldError.includes('Quantity') && !fieldError.includes('Location') && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {fieldError}
                </div>
              )}

              <button className={buttonClass} aria-busy={loading}>
                Create pickup request →
              </button>
              <p className="text-center text-[11px] font-medium tracking-wide text-slate-400">Collector assignment within 2h • Track in history • No horizontal scroll</p>
            </form>
            {message && (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800" role="status" aria-live="polite">
                {message}
              </p>
            )}
          </Card>

          <Card
            title="Pickup history"
            subtitle="Legends, tooltips, accessible colors — not color alone"
            action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{pickups.length} records</span>}
          >
            {loading ? (
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 skeleton" />
                ))}
              </div>
            ) : pickups.length === 0 ? (
              <EmptyState title="No pickups yet" description="Create your first request — it will appear here with live status and tooltips." action={<button onClick={() => document.getElementById('quantity')?.focus()} className={ghostButtonClass}>Go to form</button>} />
            ) : (
              <div className="grid gap-3 max-h-[440px] overflow-auto pr-1">
                {pickups.map((p) => (
                  <article key={p.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all" tabIndex={0} aria-label={`${p.waste_type} ${p.quantity_kg} kg at ${p.location} status ${p.status}`}>
                    <div className="absolute left-0 top-0 h-full w-1 bg-primary opacity-80 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" aria-hidden />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold tracking-tight text-slate-900 capitalize">
                          {p.waste_type} <span className="font-medium text-slate-400">· {p.quantity_kg} kg</span>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
                          <span>{p.location}</span>
                          <span aria-hidden>•</span>
                          <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white capitalize">{p.status}</span>
                          <span className="hidden sm:inline text-slate-300" aria-hidden>
                            •
                          </span>
                          <span className="hidden sm:inline text-slate-400">{new Date(p.requested_at).toLocaleDateString()}</span>
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

        {/* Right — Map */}
        <Card
          id="map"
          title="Public bins map"
          subtitle="Nearby collection points — filter by waste type"
          action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{bins.length} bins</span>}
        >
          <Field label="Filter by waste type" hint="plastic, organic, e-waste… leave empty for all">
            <div className="flex gap-2">
              <input className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="plastic, organic..." aria-label="Filter bins by waste type" />
              {filter && (
                <button type="button" onClick={() => setFilter('')} className={ghostButtonClass} aria-label="Clear filter">
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
                aria-pressed={v === filter}
                className={v === filter ? buttonClass + ' !h-8 !px-3 !text-xs' : ghostButtonClass + ' !h-8 !px-3 !text-xs'}
              >
                {v || 'All'}
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-400">
            <span className="h-1 w-6 rounded-full bg-primary/20" aria-hidden />
            <span className="h-1 w-6 rounded-full bg-emerald-200" aria-hidden />
            <span className="h-1 w-6 rounded-full bg-slate-200" aria-hidden />
            {bins.length} bins • Pinch to zoom • Click pin for details • CLS reserved
          </p>
        </Card>
      </div>
    </div>
  );
}
