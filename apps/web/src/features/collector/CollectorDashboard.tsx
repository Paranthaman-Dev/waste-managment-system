import React, { useEffect, useState } from 'react';
import {
  RouteMap,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  EmptyState,
  Pagination,
  Alert,
  Input,
  Label,
  Switch,
  SkeletonGrid,
  SkeletonTable,
  useAuth,
  useToast,
  useRouter,
  apiRequest,
} from '@wm/shared';
import type { PaginatedResponse, PickupRequest, PublicBin, Collector } from '@wm/shared';
import {
  Truck,
  Layers,
  Calendar,
  MapPin,
  CheckCircle2,
  Navigation,
  Clock,
  ArrowRight,
  Check,
} from 'lucide-react';

export function CollectorDashboard() {
  const { token } = useAuth();
  const { success, error: toastError } = useToast();
  const { pathname, navigate } = useRouter();

  const getTabFromPath = () => {
    if (pathname.includes('/route')) return 'assigned';
    if (pathname.includes('/schedule')) return 'schedule';
    return 'queue';
  };

  const [tab, setTab] = useState(getTabFromPath);
  const [assigned, setAssigned] = useState<PickupRequest[]>([]);
  const [available, setAvailable] = useState<PickupRequest[]>([]);
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [collector, setCollector] = useState<Collector | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<PickupRequest[]>([]);
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    if (pathname.includes('/sites')) {
      navigate('/route');
      return;
    }
    setTab(getTabFromPath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function loadData() {
    setLoading(true);
    try {
      const binPath = '/collector/bins';
      const [assignedData, availableData, binData, col] = await Promise.all([
        apiRequest<PaginatedResponse<PickupRequest>>(`/collector/pickups?page=${page}&page_size=15`, {}, token),
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
      toastError('Load Error', e instanceof Error ? e.message : 'Failed to load the queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function acceptPickup(id: number) {
    setActing(id);
    try {
      await apiRequest(`/collector/pickups/${id}/accept`, { method: 'POST' }, token);
      success('Task Added', 'Pickup added to your active route.');
      await loadData();
    } catch (e) {
      toastError('Add Failed', e instanceof Error ? e.message : 'Could not accept task.');
    } finally {
      setActing(null);
    }
  }

  async function updateStatus(id: number, status: string) {
    setActing(id);
    try {
      const res = await apiRequest<{ points_earned: number }>(
        `/collector/pickups/${id}/status`,
        { method: 'PUT', body: JSON.stringify({ status }) },
        token,
      );
      success(
        'Handover Confirmed',
        status === 'collected'
          ? `Collected. Resident rewarded +${res.points_earned ?? 0} pts.`
          : `Task marked as ${status.replace('_', ' ')}.`,
      );
      await loadData();
    } catch (e) {
      toastError('Update Failed', 'Failed to update pickup status.');
    } finally {
      setActing(null);
    }
  }

  async function toggleAvailability() {
    if (!collector) return;
    try {
      const updated = await apiRequest<Collector>(
        '/collector/profile',
        { method: 'PUT', body: JSON.stringify({ is_available: !collector.is_available }) },
        token,
      );
      setCollector(updated);
      success(
        updated.is_available ? 'You are Available' : 'Availability Paused',
        updated.is_available ? 'Ready to receive requests.' : 'Dispatches paused.',
      );
    } catch (e) {
      toastError('Error', 'Failed to toggle availability.');
    }
  }

  async function loadScheduleData() {
    if (!dateFrom || !dateTo) return toastError('Dates Required', 'Select start and end dates.');
    setLoadingSchedule(true);
    try {
      const data = await apiRequest<PickupRequest[]>(
        `/collector/schedule?date_from=${dateFrom}&date_to=${dateTo}`,
        {},
        token,
      );
      setSchedule(data);
      success('Schedule Loaded', `Found ${data.length} assigned pickups.`);
    } catch (e) {
      toastError('Schedule Error', 'Failed to load schedule.');
    } finally {
      setLoadingSchedule(false);
    }
  }

  const tabs = [
    { id: 'queue', label: 'Queue', href: '/queue' },
    { id: 'assigned', label: 'My Route', href: '/route' },
    { id: 'schedule', label: 'Schedule', href: '/schedule' },
  ];

  const setTabNav = (id: string) => {
    const t = tabs.find((x) => x.id === id);
    if (t) navigate(t.href);
  };

  function parseLatLng(location: string): { lat: number; lng: number } | null {
    if (!location || typeof location !== 'string') return null;
    const m = location.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[3]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  const pickupsWithCoords = assigned
    .map((p) => {
      if (p.latitude != null && p.longitude != null && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) return p;
      const parsed = parseLatLng(p.location);
      if (parsed) return { ...p, latitude: parsed.lat, longitude: parsed.lng };
      return p;
    })
    .filter((p) => p.latitude != null && p.longitude != null && Number.isFinite(p.latitude as number) && Number.isFinite(p.longitude as number));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Collection Operations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accept resident requests and manage collection route progression.
          </p>
        </div>
      </div>

      {collector && (
        <Card className="p-4 bg-surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-[12px] border ${
                  collector.is_available
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                }`}
              >
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground">
                    Zone: {collector.service_area || 'Metropolitan Core'}
                  </p>
                  <Badge tone={collector.is_available ? 'sage' : 'amber'} dot>
                    {collector.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {collector.is_available ? 'Ready to accept incoming requests' : 'Unavailable'}
                </p>
              </div>
            </div>

            <Switch
              checked={collector.is_available}
              onChange={toggleAvailability}
              label={collector.is_available ? 'Online' : 'Offline'}
            />
          </div>
        </Card>
      )}

      {tab === 'queue' && (
        <Card className="animate-fade-in space-y-3.5">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" />
                Available Requests ({available.length})
              </CardTitle>
              <CardDescription>Requests ready for route assignment</CardDescription>
            </div>
            <Badge tone="amber">{available.length} Waiting</Badge>
          </CardHeader>

          {available.length > 0 && !loading && <RouteMap bins={bins} pickups={available} height={340} />}

          {loading ? (
            <SkeletonGrid cards={4} />
          ) : available.length === 0 ? (
            <EmptyState
              title="No pending requests"
              description="New resident requests will appear here automatically."
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {available.map((p) => (
                <div
                  key={p.id}
                  className="rounded-[12px] border border-border bg-surface p-3.5 flex flex-col justify-between gap-2.5 hover:border-border-strong transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-xs capitalize text-foreground">
                          {p.waste_type} Stream
                        </span>
                        <p className="text-[11px] text-primary font-semibold">{p.quantity_kg} kg estimated</p>
                      </div>
                      <Badge tone="amber" dot>
                        {p.status}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {p.location}
                    </p>

                    {p.preferred_time && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        Preferred: {new Date(p.preferred_time).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(p.requested_at).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => acceptPickup(p.id)}
                      loading={acting === p.id}
                      disabled={!collector?.is_available}
                    >
                      Add to Route <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!collector?.is_available && (
            <Alert variant="warning">
              You are currently <strong>Unavailable</strong>. Toggle availability above to add tasks.
            </Alert>
          )}
        </Card>
      )}

      {tab === 'assigned' && (
        <Card className="animate-fade-in space-y-3.5">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                My Route ({total})
              </CardTitle>
              <CardDescription>Advance tasks: Assigned → En Route → Collected</CardDescription>
            </div>
            <Badge tone="info">{total} Active</Badge>
          </CardHeader>

          {loading ? (
            <SkeletonTable rows={4} />
          ) : assigned.length === 0 ? (
            <EmptyState
              title="No active route tasks"
              description="Accept pending pickups from the queue to build your route."
              action={
                <Button size="sm" onClick={() => setTabNav('queue')}>
                  View Queue
                </Button>
              }
            />
          ) : (
            <>
              <div className="space-y-2">
                {assigned.map((p) => {
                  const statusTone =
                    p.status === 'collected' ? 'sage' : p.status === 'en_route' ? 'info' : p.status === 'assigned' ? 'amber' : 'stone';

                  return (
                    <div
                      key={p.id}
                      className="rounded-[12px] border border-border bg-surface p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs capitalize text-foreground">
                            {p.waste_type} • {p.quantity_kg} kg
                          </span>
                          <Badge tone={statusTone} dot>
                            {p.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">#{p.id}</span>
                        </div>

                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {p.location}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(p.id, 'en_route')}
                          loading={acting === p.id}
                          disabled={p.status !== 'assigned'}
                          className={p.status === 'en_route' ? 'border-blue-500 text-blue-600' : ''}
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          En Route
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => updateStatus(p.id, 'collected')}
                          loading={acting === p.id}
                          disabled={p.status !== 'en_route'}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Confirm handover
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus(p.id, 'declined')}
                          disabled={p.status === 'collected'}
                          className="text-[11px] text-red-600 hover:bg-red-50"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Pagination page={page} totalPages={Math.ceil(total / 15) || 1} onPageChange={setPage} />
              <div className="pt-2">
                {assigned.length > 0 && <RouteMap bins={bins} pickups={assigned} height={380} />}
              </div>
            </>
          )}
        </Card>
      )}

      {tab === 'schedule' && (
        <Card className="animate-fade-in space-y-3.5">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Schedule
              </CardTitle>
              <CardDescription>Filter your upcoming assignments by preferred pickup date</CardDescription>
            </div>
          </CardHeader>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end p-3 rounded-[12px] bg-surface-muted border border-border">
            <div className="space-y-1">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={loadScheduleData} loading={loadingSchedule}>
              Load Schedule
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            {schedule.length === 0 ? (
              <EmptyState
                title="No schedule loaded"
                description="Select a date range to filter your upcoming pickup appointments."
              />
            ) : (
              schedule.map((p) => (
                <div key={p.id} className="rounded-[12px] border border-border bg-surface p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold capitalize text-foreground">
                      {p.waste_type} • {p.quantity_kg} kg <Badge tone="info">{p.status}</Badge>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {p.location} • Preferred: {p.preferred_time ? new Date(p.preferred_time).toLocaleString() : 'Standard'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

    </div>
  );
}
