import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { Card, Field, inputClass, buttonClass, ghostButtonClass, secondaryButtonClass } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { PaginatedResponse, PublicBin, Role, User } from '../types/api';
import { StatsCard } from '../components/StatsCard';

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

  async function load() {
    const [s, u, b] = await Promise.all([
      apiRequest<DashboardSummary>('/management/dashboard/summary', {}, token),
      apiRequest<PaginatedResponse<User>>('/management/users', {}, token),
      apiRequest<PublicBin[]>('/management/bins', {}, token),
    ]);
    setSummary(s);
    setUsers(u.items);
    setBins(b);
  }
  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, []);

  function chooseBin(bin: PublicBin | null) {
    setSelectedBin(bin);
    if (bin) setBinForm({ name: bin.name, latitude: bin.latitude, longitude: bin.longitude, accepted_waste_types: bin.accepted_waste_types.join(','), capacity_kg: bin.capacity_kg });
  }

  async function saveBin(e: FormEvent) {
    e.preventDefault();
    const payload = { ...binForm, accepted_waste_types: binForm.accepted_waste_types.split(',').map((s) => s.trim()).filter(Boolean) };
    if (selectedBin) {
      await apiRequest(`/management/bins/${selectedBin.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      setMessage('Bin updated successfully.');
    } else {
      await apiRequest('/management/bins', { method: 'POST', body: JSON.stringify(payload) }, token);
      setMessage('Bin created — visible on all maps.');
    }
    chooseBin(null);
    await load();
  }
  async function deleteBin(id: number) {
    await apiRequest(`/management/bins/${id}`, { method: 'DELETE' }, token);
    setMessage('Bin deleted.');
    chooseBin(null);
    await load();
  }
  async function dragBin(bin: PublicBin, lat: number, lng: number) {
    await apiRequest(`/management/bins/${bin.id}`, { method: 'PUT', body: JSON.stringify({ latitude: lat, longitude: lng }) }, token);
    setMessage('Bin location updated via drag.');
    await load();
  }
  async function createUser(e: FormEvent) {
    e.preventDefault();
    await apiRequest('/management/users', { method: 'POST', body: JSON.stringify(userForm) }, token);
    setMessage('User created — they can now sign in.');
    setUserForm({ username: '', email: '', password: '', phone: '', role: 'user' });
    await load();
  }
  async function generateReport(type: string) {
    await apiRequest(`/management/reports/${type}`, { method: 'POST' }, token);
    setMessage(`${type} report generated — download from server.`);
  }

  const totalUsers = summary ? Object.values(summary.users).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="grid gap-6">
      {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{message}</div>}

      {/* Stats – elegant SaaS bento */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total users" value={totalUsers} description={`${summary?.users.user ?? 0} residents • ${summary?.users.collector ?? 0} collectors • ${summary?.users.recycler ?? 0} recyclers`} tone="slate" />
        <StatsCard title="Pending pickups" value={summary?.pickup_pipeline.pending ?? 0} description={`${summary?.pickup_pipeline.assigned ?? 0} assigned • ${summary?.pickup_pipeline.collected ?? 0} collected`} tone="primary" trend="Live" />
        <StatsCard title="Waste volume" value={`${summary?.total_waste_kg ?? 0} kg`} description={`${summary?.batches.available ?? 0} batches available • ${summary?.batches.completed ?? 0} completed`} tone="amber" />
        <StatsCard title="Public bins" value={summary?.public_bins ?? 0} description={`${bins.length} geo-pinned • drag to reposition`} tone="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Card
          title={selectedBin ? 'Edit bin' : 'Create bin'}
          subtitle={selectedBin ? `Editing #${selectedBin.id} — update fields or delete` : 'Add a new public bin — appears on all maps'}
          action={<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{bins.length} total</span>}
        >
          <form onSubmit={saveBin} className="grid gap-4">
            <Field label="Name">
              <input className={inputClass} value={binForm.name} onChange={(e) => setBinForm({ ...binForm, name: e.target.value })} placeholder="MG Road Bin 01" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude">
                <input className={inputClass} type="number" step="0.000001" value={binForm.latitude} onChange={(e) => setBinForm({ ...binForm, latitude: Number(e.target.value) })} />
              </Field>
              <Field label="Longitude">
                <input className={inputClass} type="number" step="0.000001" value={binForm.longitude} onChange={(e) => setBinForm({ ...binForm, longitude: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Accepted waste types" hint="Comma separated — e.g. organic, plastic, e-waste">
              <input className={inputClass} value={binForm.accepted_waste_types} onChange={(e) => setBinForm({ ...binForm, accepted_waste_types: e.target.value })} />
            </Field>
            <Field label="Capacity (kg)">
              <input className={inputClass} type="number" value={binForm.capacity_kg} onChange={(e) => setBinForm({ ...binForm, capacity_kg: Number(e.target.value) })} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass}>{selectedBin ? 'Update bin' : 'Create bin →'}</button>
              {selectedBin && (
                <button type="button" onClick={() => deleteBin(selectedBin.id)} className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
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
          <div className="mt-5 grid max-h-[200px] gap-2 overflow-auto pr-1">
            {bins.map((b) => (
              <button
                key={b.id}
                onClick={() => chooseBin(b)}
                className={`text-left rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${selectedBin?.id === b.id ? 'border-primary bg-blue-50 text-slate-900 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
              >
                <span className="font-semibold tracking-tight text-slate-900">{b.name}</span> <span className="text-slate-400">· {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</span>
              </button>
            ))}
            {bins.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No bins yet — create the first one.</p>}
          </div>
        </Card>

        <Card
          title="Bin map — control center"
          subtitle="Click map to set coordinates. Drag a marker to persist."
          action={<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Draggable • Click to set</span>}
        >
          <div>
            <BinMap bins={bins} editable onPick={(lat, lng) => setBinForm({ ...binForm, latitude: lat, longitude: lng })} onDrag={dragBin} />
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-400">Tip: click empty area to autofill lat/lng in the form → save.</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Create user" subtitle="Add residents, collectors, recyclers or admins">
          <form onSubmit={createUser} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username">
                <input className={inputClass} value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required />
              </Field>
              <Field label="Email">
                <input className={inputClass} type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password">
                <input className={inputClass} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} placeholder="+91…" />
              </Field>
            </div>
            <Field label="Role">
              <select className={inputClass} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}>
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
          title="Users & reports"
          subtitle="Roster and on-demand exports"
          action={
            <span className="hidden sm:inline text-[11px] font-semibold tracking-wide text-slate-400">
              {users.length} users
            </span>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {(['users', 'pickups', 'batches', 'bins'] as const).map((t) => (
              <button key={t} onClick={() => generateReport(t)} className={secondaryButtonClass + ' !h-9 !px-3.5 !text-xs capitalize'}>
                {t} report
              </button>
            ))}
          </div>
          <div className="grid max-h-[300px] gap-2 overflow-auto pr-1">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 transition-colors">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-slate-900">
                    {u.username}
                    <span className="ml-2 inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white capitalize">{u.role}</span>
                  </p>
                  <p className="text-xs font-medium text-slate-500">{u.email}</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
              </div>
            ))}
            {users.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No users yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
