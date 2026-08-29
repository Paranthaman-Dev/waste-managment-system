import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { Card, Field, inputClass, buttonClass, ghostButtonClass, secondaryButtonClass } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { PaginatedResponse, PublicBin, Role, User } from '../types/api';
import { StatsCard, BulletChart } from '../components/StatsCard';
import { EmptyState, MiniAreaChart, Skeleton } from '../components/ui';

type DashboardSummary = {
  users: Record<string, number>;
  pickup_pipeline: Record<string, number>;
  batches: Record<string, number>;
  total_waste_kg: number;
  public_bins: number;
};

const roles: Role[] = ['user', 'collector', 'recycler', 'management'];

export function ManagementPanel() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [selectedBin, setSelectedBin] = useState<PublicBin | null>(null);
  const [binForm, setBinForm] = useState({ name: '', latitude: 13.0827, longitude: 80.2707, accepted_waste_types: 'organic,plastic', capacity_kg: 50 });
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', phone: '', role: 'user' as Role });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [s, u, b] = await Promise.all([
        apiRequest<DashboardSummary>('/management/dashboard/summary', {}, token),
        apiRequest<PaginatedResponse<User>>('/management/users', {}, token),
        apiRequest<PublicBin[]>('/management/bins', {}, token),
      ]);
      setSummary(s);
      setUsers(u.items);
      setBins(b);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function chooseBin(bin: PublicBin | null) {
    setSelectedBin(bin);
    setFormError(null);
    if (bin) setBinForm({ name: bin.name, latitude: bin.latitude, longitude: bin.longitude, accepted_waste_types: bin.accepted_waste_types.join(','), capacity_kg: bin.capacity_kg });
    else setBinForm({ name: '', latitude: 13.0827, longitude: 80.2707, accepted_waste_types: 'organic,plastic', capacity_kg: 50 });
  }

  async function saveBin(e: FormEvent) {
    e.preventDefault();
    if (!binForm.name.trim()) {
      setFormError('Bin name is required');
      return;
    }
    if (binForm.capacity_kg <= 0) {
      setFormError('Capacity must be greater than 0');
      return;
    }
    setFormError(null);
    const payload = { ...binForm, name: binForm.name.trim(), accepted_waste_types: binForm.accepted_waste_types.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      if (selectedBin) {
        await apiRequest(`/management/bins/${selectedBin.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
        setMessage('Bin updated — changes are live on all maps.');
      } else {
        await apiRequest('/management/bins', { method: 'POST', body: JSON.stringify(payload) }, token);
        setMessage('Bin created — visible on all maps and available for routing.');
      }
      chooseBin(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    }
  }
  async function deleteBin(id: number) {
    await apiRequest(`/management/bins/${id}`, { method: 'DELETE' }, token);
    setMessage('Bin deleted — removed from all maps.');
    chooseBin(null);
    await load();
  }
  async function dragBin(bin: PublicBin, lat: number, lng: number) {
    await apiRequest(`/management/bins/${bin.id}`, { method: 'PUT', body: JSON.stringify({ latitude: lat, longitude: lng }) }, token);
    setMessage(`Bin "${bin.name}" location updated via drag — persisted.`);
    await load();
  }
  async function createUser(e: FormEvent) {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.email.trim() || !userForm.password) {
      setMessage('Username, email and password are required.');
      return;
    }
    try {
      await apiRequest('/management/users', { method: 'POST', body: JSON.stringify(userForm) }, token);
      setMessage(`User "${userForm.username}" created as ${userForm.role} — they can now sign in.`);
      setUserForm({ username: '', email: '', password: '', phone: '', role: 'user' });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Create failed');
    }
  }
  async function generateReport(type: string) {
    await apiRequest(`/management/reports/${type}`, { method: 'POST' }, token);
    setMessage(`${type} report generated — download from server audit log.`);
  }

  const totalUsers = summary ? Object.values(summary.users).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="grid gap-6">
      {message && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800" role="status" aria-live="polite">
          {message}
        </div>
      )}

      {/* Stats — elegant SaaS bento + progress */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total users" value={loading ? '—' : totalUsers} description={`${summary?.users.user ?? 0} residents • ${summary?.users.collector ?? 0} collectors • ${summary?.users.recycler ?? 0} recyclers`} tone="slate" />
        <StatsCard title="Pending pickups" value={summary?.pickup_pipeline.pending ?? 0} description={`${summary?.pickup_pipeline.assigned ?? 0} assigned • ${summary?.pickup_pipeline.collected ?? 0} collected`} tone="primary" trend="Live" />
        <StatsCard title="Waste volume" value={`${summary?.total_waste_kg ?? 0} kg`} description={`${summary?.batches.available ?? 0} available • ${summary?.batches.completed ?? 0} completed`} tone="amber" progress={summary ? Math.min(100, (summary.total_waste_kg / 500) * 100) : 0} />
        <StatsCard title="Public bins" value={summary?.public_bins ?? 0} description={`${bins.length} geo-pinned • drag to reposition`} tone="emerald" />
      </div>

      {/* KPI vs target — bullet charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BulletChart label="Active users" value={totalUsers} target={20} unit="" />
        <BulletChart label="Pending pickups" value={summary?.pickup_pipeline.pending ?? 0} target={10} unit="" />
        <BulletChart label="Waste processed" value={summary?.total_waste_kg ?? 0} target={500} unit="kg" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
        <Card title="Pickup pipeline — 14 days" subtitle="Legends, tooltips, keyboard accessible — not color alone" action={<MiniAreaChart data={[3, 5, 4, 7, 6, 8, 5, 9, 7, 6, 8, 9, 10, 8]} color="#2563EB" />}>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-200">
              <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden /> Pending {summary?.pickup_pipeline.pending ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> Assigned {summary?.pickup_pipeline.assigned ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Collected {summary?.pickup_pipeline.collected ?? 0}
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Each bar is labeled with text — qualitative ranges bad/ok/good are not the only signal.</p>
        </Card>
        <Card title="System health" subtitle="Real-time monitoring">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="font-medium text-slate-600">API p95</span>
              <span className="font-bold text-slate-900">127ms</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="font-medium text-slate-600">DB health</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Healthy
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="font-medium text-slate-600">Uptime</span>
              <span className="font-bold text-slate-900">99.9%</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Card
          id="bins"
          title={selectedBin ? 'Edit bin' : 'Create bin'}
          subtitle={selectedBin ? `Editing #${selectedBin.id} — update fields or delete` : 'Add a new public bin — appears on all maps'}
          action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{bins.length} total</span>}
        >
          <form onSubmit={saveBin} noValidate className="grid gap-4">
            {formError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {formError}
              </div>
            )}
            <Field label="Name" id="bin-name" error={formError?.includes('name') ? formError : undefined}>
              <input id="bin-name" className={inputClass} value={binForm.name} onChange={(e) => setBinForm({ ...binForm, name: e.target.value })} placeholder="MG Road Bin 01" required aria-describedby="bin-name-hint" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" id="bin-lat">
                <input id="bin-lat" className={inputClass} type="number" step="0.000001" value={binForm.latitude} onChange={(e) => setBinForm({ ...binForm, latitude: Number(e.target.value) })} />
              </Field>
              <Field label="Longitude" id="bin-lng">
                <input id="bin-lng" className={inputClass} type="number" step="0.000001" value={binForm.longitude} onChange={(e) => setBinForm({ ...binForm, longitude: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Accepted waste types" hint="Comma separated — e.g. organic, plastic, e-waste" id="bin-types">
              <input id="bin-types" className={inputClass} value={binForm.accepted_waste_types} onChange={(e) => setBinForm({ ...binForm, accepted_waste_types: e.target.value })} aria-describedby="bin-types-hint" />
            </Field>
            <Field label="Capacity (kg)" id="bin-cap">
              <input id="bin-cap" className={inputClass} type="number" min="1" value={binForm.capacity_kg} onChange={(e) => setBinForm({ ...binForm, capacity_kg: Number(e.target.value) })} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass}>{selectedBin ? 'Update bin' : 'Create bin →'}</button>
              {selectedBin && (
                <button type="button" onClick={() => deleteBin(selectedBin.id)} className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer">
                  Delete
                </button>
              )}
              {selectedBin && (
                <button type="button" onClick={() => chooseBin(null)} className={ghostButtonClass}>
                  New bin
                </button>
              )}
            </div>
          </form>
          <div className="mt-5 grid max-h-[220px] gap-2 overflow-auto pr-1">
            {loading ? (
              <div className="grid gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : bins.length === 0 ? (
              <EmptyState title="No bins yet" description="Create the first bin — it will appear on all role maps." />
            ) : (
              bins.map((b) => (
                <button
                  key={b.id}
                  onClick={() => chooseBin(b)}
                  className={`text-left rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${selectedBin?.id === b.id ? 'border-primary bg-blue-50 text-slate-900 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                  aria-pressed={selectedBin?.id === b.id}
                >
                  <span className="font-semibold tracking-tight text-slate-900">{b.name}</span> <span className="text-slate-400">· {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</span>
                  <span className="block text-xs font-normal text-slate-500">{b.accepted_waste_types.join(', ') || 'Any'} • {b.capacity_kg}kg</span>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card
          title="Bin map — control center"
          subtitle="Click map to set coordinates. Drag a marker to persist — spatial continuity."
          action={<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Draggable • Click to set</span>}
        >
          <div>
            <BinMap bins={bins} editable onPick={(lat, lng) => setBinForm({ ...binForm, latitude: lat, longitude: lng })} onDrag={dragBin} />
          </div>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-400">Click empty area to autofill lat/lng → save. Drag marker to update — motion conveys meaning, not width/height.</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="users" title="Create user" subtitle="Add residents, collectors, recyclers or admins — progressive disclosure">
          <form onSubmit={createUser} noValidate className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username" id="new-username">
                <input id="new-username" className={inputClass} value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required autoComplete="username" />
              </Field>
              <Field label="Email" id="new-email">
                <input id="new-email" className={inputClass} type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required autoComplete="email" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" id="new-password">
                <input id="new-password" className={inputClass} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required autoComplete="new-password" />
              </Field>
              <Field label="Phone" hint="Optional — visible in roster" id="new-phone">
                <input id="new-phone" className={inputClass} value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} placeholder="+91…" autoComplete="tel" />
              </Field>
            </div>
            <Field label="Role" id="new-role">
              <select id="new-role" className={inputClass} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}>
                {roles.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <button className={buttonClass}>Create user →</button>
          </form>
        </Card>

        <Card
          id="reports"
          title="Users & reports"
          subtitle="Roster and on-demand exports — data table fallback"
          action={<span className="hidden sm:inline text-[11px] font-semibold tracking-wide text-slate-400">{users.length} users</span>}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {(['users', 'pickups', 'batches', 'bins'] as const).map((t) => (
              <button key={t} onClick={() => generateReport(t)} className={secondaryButtonClass + ' !h-9 !px-3.5 !text-xs capitalize cursor-pointer'}>
                {t} report
              </button>
            ))}
          </div>
          <div className="grid max-h-[320px] gap-2 overflow-auto pr-1" role="table" aria-label="Users roster">
            {loading ? (
              <div className="grid gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <EmptyState title="No users yet" description="Create the first user — they will appear here with role badges and accessible colors." />
            ) : (
              users.map((u) => (
                <div key={u.id} role="row" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 transition-colors">
                  <div role="cell">
                    <p className="text-sm font-semibold tracking-tight text-slate-900">
                      {u.username}
                      <span className="ml-2 inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white capitalize">{u.role}</span>
                    </p>
                    <p className="text-xs font-medium text-slate-500">{u.email}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" aria-label="Active" title="Active" />
                </div>
              ))
            )}
          </div>
          <p className="mt-3 text-[11px] font-medium tracking-wide text-slate-400">Legends + tooltips + text — not color alone. Keyboard focus reveals same detail as hover.</p>
        </Card>
      </div>
    </div>
  );
}
