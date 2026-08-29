import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../../components/map/BinMap';
import { Button, Input, Select, Label, Card, CardHeader, CardTitle, CardDescription, Badge, EmptyState, ErrorState, Skeleton, SimpleTabs, Pagination, Alert } from '../../components/ui/primitives';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import type { PaginatedResponse, PickupRequest, PublicBin, UserAnalytics } from '../../types/api';
import { wasteTypeOptions } from '../../lib/utils';

export function UserDashboard() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [wasteFilter, setWasteFilter] = useState('');
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // form
  const [wasteType, setWasteType] = useState('organic');
  const [quantity, setQuantity] = useState(5);
  const [location, setLocation] = useState('Chennai');
  const [preferredTime, setPreferredTime] = useState('');
  const [formError, setFormError] = useState('');

  // profile
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const binPath = wasteFilter ? `/user/bins?waste_type=${encodeURIComponent(wasteFilter)}` : '/user/bins';
      const qp = new URLSearchParams({ page: String(page), page_size: '20' });
      if (statusFilter) qp.set('status_filter', statusFilter);
      const [binData, pickupData, ana] = await Promise.all([
        apiRequest<PublicBin[]>(binPath, {}, token),
        apiRequest<PaginatedResponse<PickupRequest>>(`/user/pickups?${qp.toString()}`, {}, token),
        apiRequest<UserAnalytics>('/user/analytics/summary', {}, token).catch(() => null),
      ]);
      setBins(binData);
      setPickups(pickupData.items);
      setTotal(pickupData.total);
      setAnalytics(ana);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, statusFilter, wasteFilter]);

  async function submitPickup(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (quantity <= 0) return setFormError('Quantity must be > 0');
    if (!location.trim()) return setFormError('Location is required');
    try {
      await apiRequest('/user/pickups', { method: 'POST', body: JSON.stringify({ waste_type: wasteType, quantity_kg: quantity, location: location.trim(), preferred_time: preferredTime || undefined }) }, token);
      setMessage('Pickup requested — collector will be notified.');
      setPage(1);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function updateProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await apiRequest('/user/profile', { method: 'PUT', body: JSON.stringify({ email, phone }) }, token);
      setMessage('Profile updated.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    }
  }

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-display">Good morning, {user?.username}</h1>
          <p className="text-sm text-muted-foreground">Request pickups, track status, and find nearby bins — all in one paper.</p>
        </div>
        <SimpleTabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'requests', label: 'Requests' }, { id: 'bins', label: 'Bins' }, { id: 'profile', label: 'Profile' }]} active={tab} onChange={setTab} />
      </div>

      {message && (
        <Alert variant="success" role="status" aria-live="polite">
          {message}
        </Alert>
      )}
      {error && <ErrorState message={error} onRetry={load} />}

      {tab === 'overview' && (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-label text-muted-foreground">Total requests</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{analytics?.total_pickups ?? total}</p>
              <p className="text-xs text-muted-foreground">{analytics?.completed_pickups ?? 0} completed</p>
            </Card>
            <Card>
              <p className="text-label text-muted-foreground">Kg contributed</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{analytics?.total_kg_contributed ?? 0} kg</p>
              <p className="text-xs text-muted-foreground">Collected only</p>
            </Card>
            <Card>
              <p className="text-label text-muted-foreground">Nearby bins</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{bins.length}</p>
              <p className="text-xs text-muted-foreground">Within 10 km • Filter by type</p>
            </Card>
          </div>

          {analytics?.by_waste_type && analytics.by_waste_type.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>By waste type</CardTitle>
                  <CardDescription>Collected kilograms per type — not color alone</CardDescription>
                </div>
              </CardHeader>
              <div className="grid gap-3 md:grid-cols-3">
                {analytics.by_waste_type.map((row) => (
                  <div key={row.waste_type} className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-sm font-bold capitalize">{row.waste_type}</p>
                    <p className="text-xs text-muted-foreground">{row.count} pickups • {row.total_kg} kg</p>
                    <div className="mt-2 h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (row.total_kg / (analytics.total_kg_contributed || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Request a pickup</CardTitle>
                  <CardDescription>Type, weight, location — 30 seconds</CardDescription>
                </div>
              </CardHeader>
              <form onSubmit={submitPickup} noValidate className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Waste type</Label>
                  <Select value={wasteType} onChange={(e) => setWasteType(e.target.value)}>
                    {wasteTypeOptions.map((o) => (
                      <option key={o} value={o} className="capitalize">
                        {o}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Quantity (kg)</Label>
                    <Input type="number" min="0.1" step="0.1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Preferred time</Label>
                    <Input type="datetime-local" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Chennai, MG Road" />
                </div>
                {formError && <Alert variant="error">{formError}</Alert>}
                <Button type="submit">Create request →</Button>
              </form>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recent requests</CardTitle>
                  <CardDescription>Latest 3 — see all in Requests tab</CardDescription>
                </div>
              </CardHeader>
              {loading ? (
                <div className="grid gap-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : pickups.length === 0 ? (
                <EmptyState title="No requests yet" description="Create your first pickup — it will appear here." />
              ) : (
                <div className="grid gap-3">
                  {pickups.slice(0, 3).map((p) => (
                    <div key={p.id} className="rounded-2xl border border-border bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold capitalize">
                          {p.waste_type} • {p.quantity_kg} kg
                        </p>
                        <Badge tone={p.status === 'collected' ? 'sage' : p.status === 'pending' ? 'amber' : 'stone'}>{p.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.location} • {formatDate(p.requested_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>All requests</CardTitle>
              <CardDescription>Filter, paginate, and inspect each pickup</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold">
                <option value="">All status</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="en_route">En route</option>
                <option value="collected">Collected</option>
              </select>
            </div>
          </CardHeader>
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : pickups.length === 0 ? (
            <EmptyState title="No results" description="Try clearing filters or create a new request." />
          ) : (
            <>
              <div className="grid gap-3">
                {pickups.map((p) => (
                  <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold capitalize">
                        {p.waste_type} • {p.quantity_kg} kg • <Badge tone={p.status === 'pending' ? 'amber' : p.status === 'collected' ? 'sage' : 'stone'}>{p.status}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.location} {p.latitude ? `• ${p.latitude.toFixed(3)}, ${p.longitude?.toFixed(3)}` : ''} • {new Date(p.requested_at).toLocaleString()}
                      </p>
                      {p.preferred_time && <p className="text-xs text-muted-foreground">Preferred: {new Date(p.preferred_time).toLocaleString()}</p>}
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">#{p.id}</span>
                  </div>
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}

      {tab === 'bins' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Bins near you</CardTitle>
              <CardDescription>Filter by waste type • 10 km radius</CardDescription>
            </div>
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold">{bins.length} bins</span>
          </CardHeader>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Label>Filter</Label>
            <select value={wasteFilter} onChange={(e) => setWasteFilter(e.target.value)} className="h-9 rounded-xl border border-border bg-white px-3 text-sm">
              <option value="">All</option>
              {wasteTypeOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {wasteFilter && (
              <Button variant="ghost" size="sm" onClick={() => setWasteFilter('')}>
                Clear
              </Button>
            )}
          </div>
          <BinMap bins={bins} height={460} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {wasteTypeOptions.map((w) => (
              <button key={w} onClick={() => setWasteFilter(w)} aria-pressed={wasteFilter === w} className={`rounded-full border px-3 py-1 text-xs font-semibold ${wasteFilter === w ? 'bg-primary text-white border-primary' : 'bg-white border-border text-muted-foreground'}`}>
                {w}
              </button>
            ))}
          </div>
        </Card>
      )}

      {tab === 'profile' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update email or phone — username is fixed</CardDescription>
            </div>
            <Badge tone="sage">{user?.role}</Badge>
          </CardHeader>
          <form onSubmit={updateProfile} className="grid max-w-lg gap-4">
            <div className="grid gap-1.5">
              <Label>Username</Label>
              <Input value={user?.username ?? ''} disabled />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Save changes</Button>
              <span className="rounded-xl bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">Joined {new Date(user?.created_at ?? '').toLocaleDateString()}</span>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

function formatDate(v: string) {
  return new Date(v).toLocaleString();
}
