import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../components/BinMap';
import { buttonClass, Card, Field, inputClass } from '../components/Layout';
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
    load().catch((error) => setMessage(error.message));
  }, [filter]);

  async function submitPickup(event: FormEvent) {
    event.preventDefault();
    await apiRequest<PickupRequest>('/user/pickups', {
      method: 'POST',
      body: JSON.stringify({ waste_type: wasteType, quantity_kg: quantityKg, location }),
    }, token);
    setMessage('Pickup request created.');
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="grid gap-6">
        <Card title="Request Pickup">
          <form onSubmit={submitPickup} className="grid gap-4">
            <Field label="Waste type"><input className={inputClass} value={wasteType} onChange={(e) => setWasteType(e.target.value)} /></Field>
            <Field label="Quantity kg"><input className={inputClass} type="number" min="0.1" step="0.1" value={quantityKg} onChange={(e) => setQuantityKg(Number(e.target.value))} /></Field>
            <Field label="Location"><input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
            <button className={buttonClass}>Create pickup</button>
          </form>
          {message && <p className="mt-3 text-sm font-semibold text-leaf">{message}</p>}
        </Card>
        <Card title="Pickup History">
          <div className="grid gap-3">
            {pickups.map((pickup) => (
              <article key={pickup.id} className="rounded-2xl bg-moss p-4">
                <p className="font-bold text-earth">{pickup.waste_type} · {pickup.quantity_kg} kg</p>
                <p className="text-sm text-earth/70">{pickup.location} · {pickup.status}</p>
              </article>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Public Bin Map">
        <Field label="Filter by waste type"><input className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="plastic, organic..." /></Field>
        <div className="mt-4"><BinMap bins={bins} /></div>
      </Card>
    </div>
  );
}
