import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { Card, Field, inputClass, buttonClass, ghostButtonClass } from '../components/Layout';
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
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  function chooseBin(bin: PublicBin | null) {
    setSelectedBin(bin);
    if (bin) setBinForm({ name: bin.name, latitude: bin.latitude, longitude: bin.longitude, accepted_waste_types: bin.accepted_waste_types.join(','), capacity_kg: bin.capacity_kg });
  }

  async function saveBin(e: FormEvent) {
    e.preventDefault();
    const payload = { ...binForm, accepted_waste_types: binForm.accepted_waste_types.split(',').map((s) => s.trim()).filter(Boolean) };
    if (selectedBin) {
      await apiRequest(`/management/bins/${selectedBin.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      setMessage('Bin updated — sketch persisted.');
    } else {
      await apiRequest('/management/bins', { method: 'POST', body: JSON.stringify(payload) }, token);
      setMessage('Bin created — HUD added.');
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
    setMessage('Bin location updated — cybercore drag.');
    await load();
  }
  async function createUser(e: FormEvent) {
    e.preventDefault();
    await apiRequest('/management/users', { method: 'POST', body: JSON.stringify(userForm) }, token);
    setMessage('User created — luxury roster.');
    setUserForm({ username: '', email: '', password: '', phone: '', role: 'user' });
    await load();
  }
  async function generateReport(type: string) {
    await apiRequest(`/management/reports/${type}`, { method: 'POST' }, token);
    setMessage(`${type} report — chrome generated.`);
  }

  const totalUsers = summary ? Object.values(summary.users).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="grid gap-6">
      {message && <div className="rounded-xl border border-neon-cyan/30 bg-white px-4 py-3 font-mono text-xs font-semibold text-ink shadow-neon-cyan">{message}</div>}

      {/* HUD Stats – Bento 4 */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Total Users" value={totalUsers} description={`${summary?.users.user ?? 0} user · ${summary?.users.collector ?? 0} collector · ${summary?.users.recycler ?? 0} recycler`} tone="ink" />
        <StatsCard title="Pending Pickups" value={summary?.pickup_pipeline.pending ?? 0} description={`${summary?.pickup_pipeline.assigned ?? 0} assigned · ${summary?.pickup_pipeline.collected ?? 0} collected`} tone="cyan" trend="▲ HUD" />
        <StatsCard title="Waste (kg)" value={summary?.total_waste_kg ?? 0} description={`${summary?.batches.available ?? 0} available · ${summary?.batches.completed ?? 0} completed`} tone="amber" />
        <StatsCard title="Public Bins" value={summary?.public_bins ?? 0} description={`${bins.length} geo-fixed · sketch grid`} tone="pink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Card title={selectedBin ? 'Edit Bin — Sketch' : 'Create Bin — Y2K Chrome'} action={<span className="rounded-full bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan">{bins.length} total</span>}>
          <form onSubmit={saveBin} className="grid gap-4">
            <Field label="Name"><input className={inputClass} value={binForm.name} onChange={(e) => setBinForm({ ...binForm, name: e.target.value })} placeholder="MG Road Bin 01" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude"><input className={inputClass} type="number" step="0.000001" value={binForm.latitude} onChange={(e) => setBinForm({ ...binForm, latitude: Number(e.target.value) })} /></Field>
              <Field label="Longitude"><input className={inputClass} type="number" step="0.000001" value={binForm.longitude} onChange={(e) => setBinForm({ ...binForm, longitude: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Waste types" hint="comma separated — efficient, unambiguous"><input className={inputClass} value={binForm.accepted_waste_types} onChange={(e) => setBinForm({ ...binForm, accepted_waste_types: e.target.value })} /></Field>
            <Field label="Capacity kg"><input className={inputClass} type="number" value={binForm.capacity_kg} onChange={(e) => setBinForm({ ...binForm, capacity_kg: Number(e.target.value) })} /></Field>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass}>{selectedBin ? 'Update bin — Sketch' : 'Create bin — Chrome →'}</button>
              {selectedBin && <button type="button" onClick={() => deleteBin(selectedBin.id)} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-red-700">Delete</button>}
              {selectedBin && <button type="button" onClick={() => chooseBin(null)} className={ghostButtonClass}>New bin</button>}
            </div>
          </form>
          <div className="mt-5 grid max-h-[180px] gap-2 overflow-auto pr-1">
            {bins.map((b) => (
              <button
                key={b.id}
                onClick={() => chooseBin(b)}
                className={`text-left rounded-xl border px-3 py-2.5 font-mono text-xs font-semibold transition-all ${selectedBin?.id === b.id ? 'border-neon-cyan bg-neon-cyan/10 text-ink shadow-neon-cyan' : 'border-ink/10 bg-skin-paper hover:border-neon-cyan/30 hover:bg-white text-ink/70'}`}
              >
                <span className="font-display font-bold tracking-tight text-ink">{b.name}</span> <span className="text-ink/40">· {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Map — Management HUD" action={<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-pink">DRAG TO PERSIST — CYBERCORE</span>}>
          <p className="mb-3 font-mono text-xs leading-relaxed text-ink/60">Click map to set form location. Drag marker to persist new location — scanline grid confirms persistence.</p>
          <div className="overflow-hidden rounded-[16px] border border-white/10 shadow-hud">
            <BinMap bins={bins} editable onPick={(lat, lng) => setBinForm({ ...binForm, latitude: lat, longitude: lng })} onDrag={dragBin} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Create User — Luxury Roster">
          <form onSubmit={createUser} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username"><input className={inputClass} value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} /></Field>
              <Field label="Email"><input className={inputClass} type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password"><input className={inputClass} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></Field>
              <Field label="Phone"><input className={inputClass} value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} /></Field>
            </div>
            <Field label="Role"><select className={inputClass} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}>{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
            <button className={buttonClass}>Create user — Playfair →</button>
          </form>
        </Card>

        <Card title="Users & Reports — Chrome">
          <div className="mb-4 flex flex-wrap gap-2">
            {(['users', 'pickups', 'batches', 'bins'] as const).map((t) => (
              <button key={t} onClick={() => generateReport(t)} className="inline-flex min-h-[36px] items-center justify-center rounded-xl chrome px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
                {t} report
              </button>
            ))}
          </div>
          <div className="grid max-h-[280px] gap-2 overflow-auto pr-1">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white px-3 py-2.5">
                <div>
                  <p className="font-display text-sm font-bold tracking-tight text-ink">{u.username} <span className="ml-2 rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan">{u.role}</span></p>
                  <p className="font-mono text-xs text-ink/50">{u.email}</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
