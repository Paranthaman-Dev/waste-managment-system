import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { buttonClass, Card, Field, inputClass } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { PaginatedResponse, PublicBin, Role, User } from '../types/api';
import { StatsCard } from '../components/StatsCard'; // New reusable stats card

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
    const [summaryData, userData, binData] = await Promise.all([
      apiRequest<DashboardSummary>('/management/dashboard/summary', {}, token),
      apiRequest<PaginatedResponse<User>>('/management/users', {}, token),
      apiRequest<PublicBin[]>('/management/bins', {}, token),
    ]);
    setSummary(summaryData);
    setUsers(userData.items);
    setBins(binData);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  function chooseBin(bin: PublicBin | null) {
    setSelectedBin(bin);
    if (bin) {
      setBinForm({
        name: bin.name,
        latitude: bin.latitude,
        longitude: bin.longitude,
        accepted_waste_types: bin.accepted_waste_types.join(','),
        capacity_kg: bin.capacity_kg,
      });
    }
  }

  async function saveBin(event: FormEvent) {
    event.preventDefault();
    const payload = {
      ...binForm,
      accepted_waste_types: binForm.accepted_waste_types.split(',').map((item) => item.trim()).filter(Boolean),
    };
    if (selectedBin) {
      await apiRequest(`/management/bins/${selectedBin.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      setMessage('Bin updated.');
    } else {
      await apiRequest('/management/bins', { method: 'POST', body: JSON.stringify(payload) }, token);
      setMessage('Bin created.');
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

  async function dragBin(bin: PublicBin, latitude: number, longitude: number) {
    await apiRequest(`/management/bins/${bin.id}`, {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude }),
    }, token);
    setMessage('Bin location updated.');
    await load();
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    await apiRequest('/management/users', { method: 'POST', body: JSON.stringify(userForm) }, token);
    setMessage('User created.');
    setUserForm({ username: '', email: '', password: '', phone: '', role: 'user' });
    await load();
  }

  async function generateReport(type: string) {
    await apiRequest(`/management/reports/${type}`, { method: 'POST' }, token);
    setMessage(`${type} report generated.`);
  }

  return (
    <div className="grid gap-6">
      {message && <p className="rounded-2xl bg-moss px-4 py-3 font-semibold text-earth">{message}</p>}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Updated stats using the new StatsCard component */}
        <StatsCard title="Users" value={summary ? Object.values(summary.users).reduce((a, b) => a + b, 0) : 0} />
        <StatsCard title="Pending pickups" value={summary?.pickup_pipeline.pending ?? 0} />
        <StatsCard title="Waste kg" value={summary?.total_waste_kg ?? 0} />
        <StatsCard title="Bins" value={summary?.public_bins ?? 0} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card title={selectedBin ? 'Edit Public Bin' : 'Create Public Bin'}>
          <form onSubmit={saveBin} className="grid gap-4">
            <Field label="Name"><input className={inputClass} value={binForm.name} onChange={(e) => setBinForm({ ...binForm, name: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude"><input className={inputClass} type="number" step="0.000001" value={binForm.latitude} onChange={(e) => setBinForm({ ...binForm, latitude: Number(e.target.value) })} /></Field>
              <Field label="Longitude"><input className={inputClass} type="number" step="0.000001" value={binForm.longitude} onChange={(e) => setBinForm({ ...binForm, longitude: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Waste types"><input className={inputClass} value={binForm.accepted_waste_types} onChange={(e) => setBinForm({ ...binForm, accepted_waste_types: e.target.value })} /></Field>
            <Field label="Capacity kg"><input className={inputClass} type="number" value={binForm.capacity_kg} onChange={(e) => setBinForm({ ...binForm, capacity_kg: Number(e.target.value) })} /></Field>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass}>{selectedBin ? 'Update bin' : 'Create bin'}</button>
              {selectedBin && <button className="min-h-11 rounded-xl bg-red-700 px-4 py-2 font-bold text-white" type="button" onClick={() => deleteBin(selectedBin.id)}>Delete bin</button>}
              {selectedBin && <button className="min-h-11 rounded-xl bg-earth px-4 py-2 font-bold text-white" type="button" onClick={() => chooseBin(null)}>New bin</button>}
            </div>
          </form>
          <div className="mt-5 grid gap-2">
            {bins.map((bin) => (
              <button key={bin.id} className="rounded-xl bg-moss px-3 py-2 text-left font-semibold text-earth" onClick={() => chooseBin(bin)}>{bin.name}</button>
            ))}
          </div>
        </Card>
        <Card title="Map Management">
          <p className="mb-3 text-sm text-earth/70">Click the map to set the form location. Drag an existing marker to persist a new location.</p>
          <BinMap bins={bins} editable onPick={(latitude, longitude) => setBinForm({ ...binForm, latitude, longitude })} onDrag={dragBin} />
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Create User">
          <form onSubmit={createUser} className="grid gap-4">
            <Field label="Username"><input className={inputClass} value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} /></Field>
            <Field label="Email"><input className={inputClass} type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></Field>
            <Field label="Password"><input className={inputClass} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputClass} value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} /></Field>
            <Field label="Role"><select className={inputClass} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></Field>
            <button className={buttonClass}>Create user</button>
          </form>
        </Card>
        <Card title="Users And Reports">
          <div className="mb-4 flex flex-wrap gap-2">
            {['users', 'pickups', 'batches', 'bins'].map((type) => (
              <button key={type} className={buttonClass} onClick={() => generateReport(type)}>{type} report</button>
            ))}
          </div>
          <div className="grid gap-2">
            {users.map((user) => (
              <p key={user.id} className="rounded-xl bg-moss px-3 py-2 text-sm font-semibold text-earth">
                {user.username} · {user.role} · {user.email}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-earth p-5 text-white shadow-sm">
      <p className="text-sm uppercase tracking-[0.2em] text-moss">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
