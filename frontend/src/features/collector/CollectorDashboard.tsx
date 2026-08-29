import { useEffect, useState } from 'react';
import { BinMap } from '../../components/map/BinMap';
import { Button, Card, CardHeader, CardTitle, CardDescription, Badge, EmptyState, Skeleton, SimpleTabs, Pagination, Alert, Input, Label, Select } from '../../components/ui/primitives';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import type { PaginatedResponse, PickupRequest, PublicBin, Collector } from '../../types/api';

export function CollectorDashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState('queue');
  const [assigned, setAssigned] = useState<PickupRequest[]>([]);
  const [available, setAvailable] = useState<PickupRequest[]>([]);
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [collector, setCollector] = useState<Collector | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<PickupRequest[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  async function load() {
    setLoading(true);
    try {
      const binPath = filter ? `/collector/bins?waste_type=${encodeURIComponent(filter)}` : '/collector/bins';
      const [assignedData, availableData, binData, col] = await Promise.all([
        apiRequest<PaginatedResponse<PickupRequest>>(`/collector/pickups?page=${page}&page_size=20`, {}, token),
        apiRequest<PickupRequest[]>('/collector/pickups/available', {}, token).catch(() => [] as PickupRequest[]),
        apiRequest<PublicBin[]>(binPath, {}, token),
        apiRequest<Collector>('/collector/profile', {}, token).catch(() => null),
      ]);
      setAssigned(assignedData.items);
      setTotal(assignedData.total);
      setAvailable(availableData);
      setBins(binData);
      setCollector(col);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, filter]);

  async function accept(id: number) {
    setActing(id);
    try {
      await apiRequest(`/collector/pickups/${id}/accept`, { method: 'POST' }, token);
      setMessage('Pickup accepted — added to your route.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Accept failed');
    } finally {
      setActing(null);
    }
  }

  async function updateStatus(id: number, status: string) {
    setActing(id);
    try {
      await apiRequest(`/collector/pickups/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, token);
      setMessage(`Marked as ${status.replace('_', ' ')}.`);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setActing(null);
    }
  }

  async function toggleAvailability() {
    if (!collector) return;
    try {
      const updated = await apiRequest<Collector>('/collector/profile', { method: 'PUT', body: JSON.stringify({ is_available: !collector.is_available }) }, token);
      setCollector(updated);
      setMessage(updated.is_available ? 'You are now available for assignments.' : 'You are now unavailable.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function loadSchedule() {
    if (!dateFrom || !dateTo) return setMessage('Select both dates for schedule');
    try {
      const data = await apiRequest<PickupRequest[]>(`/collector/schedule?date_from=${dateFrom}&date_to=${dateTo}`, {}, token);
      setSchedule(data);
      setMessage(`Schedule loaded — ${data.length} pickups between ${dateFrom} and ${dateTo}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Schedule failed');
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-display">Collector workspace</h1>
          <p className="text-sm text-muted-foreground">Queue → route → collected. Availability, schedule, and bins.</p>
        </div>
        <SimpleTabs tabs={[{ id: 'queue', label: 'Queue' }, { id: 'assigned', label: 'My Route' }, { id: 'schedule', label: 'Schedule' }, { id: 'bins', label: 'Bins' }]} active={tab} onChange={setTab} />
      </div>

      {collector && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Service area: {collector.service_area || 'Not set'}</p>
              <p className="text-xs text-muted-foreground">Availability controls whether you appear in assignment.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={collector.is_available ? 'sage' : 'amber'}>{collector.is_available ? 'Available' : 'Unavailable'}</Badge>
              <Button variant="secondary" size="sm" onClick={toggleAvailability}>
                {collector.is_available ? 'Go unavailable' : 'Go available'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {message && <Alert variant="success">{message}</Alert>}

      {tab === 'queue' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Available pickups</CardTitle>
              <CardDescription>Pending • unassigned • oldest first</CardDescription>
            </div>
            <Badge tone="amber">{available.length} waiting</Badge>
          </CardHeader>
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : available.length === 0 ? (
            <EmptyState title="No pending pickups" description="New resident requests will appear here. Check back or adjust availability." />
          ) : (
            <div className="grid gap-3">
              {available.map((p) => (
                <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold capitalize">
                      {p.waste_type} • {p.quantity_kg} kg <Badge tone="amber">{p.status}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.location} • {new Date(p.requested_at).toLocaleString()} {p.preferred_time && `• Preferred ${new Date(p.preferred_time).toLocaleString()}`}
                    </p>
                  </div>
                  <Button onClick={() => accept(p.id)} loading={acting === p.id} disabled={!collector?.is_available}>
                    Accept →
                  </Button>
                </div>
              ))}
            </div>
          )}
          {!collector?.is_available && <p className="mt-3 text-xs font-medium text-amber-700">You are unavailable — toggle availability to accept.</p>}
        </Card>
      )}

      {tab === 'assigned' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>My route</CardTitle>
              <CardDescription>Assigned to you — update status: assigned → en_route → collected</CardDescription>
            </div>
            <Badge tone="info">{total} total</Badge>
          </CardHeader>
          {loading ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : assigned.length === 0 ? (
            <EmptyState title="No assignments" description="Accept pickups from Queue — they will appear here." />
          ) : (
            <>
              <div className="grid gap-3">
                {assigned.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-muted p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold capitalize">
                        {p.waste_type} <Badge tone={p.status === 'collected' ? 'sage' : p.status === 'en_route' ? 'info' : 'amber'}>{p.status}</Badge>
                      </p>
                      <span className="text-xs font-semibold text-muted-foreground">#{p.id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.location} • {p.quantity_kg} kg • {new Date(p.requested_at).toLocaleString()}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => updateStatus(p.id, 'en_route')} loading={acting === p.id} disabled={p.status !== 'assigned'}>
                        En route
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(p.id, 'collected')} loading={acting === p.id} disabled={p.status !== 'en_route'}>
                        Mark collected
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(p.id, 'declined')} disabled={p.status === 'collected'}>
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={page} totalPages={Math.ceil(total / 20) || 1} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}

      {tab === 'schedule' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Filter your assigned pickups by preferred_time range</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <div className="grid gap-1.5">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={loadSchedule} className="w-full sm:w-auto">
                Load schedule
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {schedule.length === 0 ? (
              <EmptyState title="No schedule loaded" description="Pick a date range and load — shows only your assigned pickups in that window." />
            ) : (
              schedule.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-white p-3 text-sm">
                  <p className="font-semibold capitalize">
                    {p.waste_type} • {p.quantity_kg} kg • {p.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.location} • Preferred {p.preferred_time ? new Date(p.preferred_time).toLocaleString() : '—'}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {tab === 'bins' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Bins map</CardTitle>
              <CardDescription>Reference — read-only, filter by type</CardDescription>
            </div>
          </CardHeader>
          <div className="mb-3 flex items-center gap-2">
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by waste type (organic, plastic…)" className="max-w-sm" />
            {filter && (
              <Button variant="ghost" size="sm" onClick={() => setFilter('')}>
                Clear
              </Button>
            )}
          </div>
          <BinMap bins={bins} height={460} />
        </Card>
      )}
    </div>
  );
}
