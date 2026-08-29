import { useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { buttonClass, Card, Field, inputClass } from '../components/Layout';
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
    load().catch((error) => setMessage(error.message));
  }, [filter]);

  async function accept(id: number) {
    await apiRequest(`/collector/pickups/${id}/accept`, { method: 'POST' }, token);
    setMessage('Pickup accepted.');
    await load();
  }

  async function updateStatus(id: number, status: string) {
    await apiRequest(`/collector/pickups/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, token);
    setMessage(`Pickup marked ${status}.`);
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Available Pickups">
        {message && <p className="mb-3 text-sm font-semibold text-leaf">{message}</p>}
        <div className="grid gap-3">
          {available.map((pickup) => (
            <article key={pickup.id} className="rounded-2xl bg-moss p-4">
              <p className="font-bold text-earth">{pickup.waste_type} · {pickup.quantity_kg} kg</p>
              <p className="text-sm text-earth/70">{pickup.location}</p>
              <button className={`${buttonClass} mt-3`} onClick={() => accept(pickup.id)}>Accept</button>
            </article>
          ))}
        </div>
      </Card>
      <Card title="Assigned Pickups">
        <div className="grid gap-3">
          {assigned.map((pickup) => (
            <article key={pickup.id} className="rounded-2xl bg-white p-4 ring-1 ring-earth/10">
              <p className="font-bold text-earth">{pickup.waste_type} · {pickup.status}</p>
              <p className="text-sm text-earth/70">{pickup.location}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={buttonClass} onClick={() => updateStatus(pickup.id, 'en_route')}>En route</button>
                <button className={buttonClass} onClick={() => updateStatus(pickup.id, 'collected')}>Collected</button>
              </div>
            </article>
          ))}
        </div>
      </Card>
      <Card title="Public Bins">
        <Field label="Filter by waste type"><input className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)} /></Field>
        <div className="mt-4"><BinMap bins={bins} /></div>
      </Card>
    </div>
  );
}
