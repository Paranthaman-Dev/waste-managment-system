import React, { FormEvent, useEffect, useState } from 'react';
import {
  BinMap,
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  EmptyState,
  ErrorState,
  Pagination,
  Alert,
  StatCard,
  SkeletonKPI,
  SkeletonTable,
  DonutChart,
  RadialGauge,
  useAuth,
  useToast,
  useRouter,
  apiRequest,
  wasteTypeOptions,
} from '@wm/shared';
import type { PaginatedResponse, PickupRequest, PublicBin, UserAnalytics } from '@wm/shared';
import { RewardsSection } from './RewardsSection';
import {
  Truck,
  Leaf,
  MapPin,
  Sparkles,
  Calendar,
  Clock,
  PlusCircle,
  Search,
  Navigation,
  User as UserIcon,
  Mail,
  Phone,
  ArrowRight,
} from 'lucide-react';

export function ResidentDashboard() {
  const { token, user } = useAuth();
  const { success, error: toastError } = useToast();
  const { pathname, navigate } = useRouter();

  const getTabFromPath = () => {
    if (pathname.includes('/new')) return 'new';
    if (pathname.includes('/requests')) return 'requests';
    if (pathname.includes('/rewards')) return 'rewards';
    if (pathname.includes('/bins')) return 'bins';
    if (pathname.includes('/account')) return 'account';
    return 'overview';
  };

  const [tab, setTab] = useState(getTabFromPath);
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [wasteFilter, setWasteFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedBinId, setSelectedBinId] = useState<number | null>(null);

  const [wasteType, setWasteType] = useState('organic');
  const [quantity, setQuantity] = useState(10);
  const [location, setLocation] = useState('Chennai Central');
  const [preferredTime, setPreferredTime] = useState('');
  const [formError, setFormError] = useState('');

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    setTab(getTabFromPath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const binPath = wasteFilter ? `/user/bins?waste_type=${encodeURIComponent(wasteFilter)}` : '/user/bins';
      const qp = new URLSearchParams({ page: String(page), page_size: '15' });
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
      setError(e instanceof Error ? e.message : 'Failed to load the dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, wasteFilter]);

  const estimatedCO2 = (quantity * 1.75).toFixed(1);
  const estimatedTrees = (quantity * 0.08).toFixed(1);

  async function submitPickup(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (quantity <= 0) return setFormError('Quantity must be greater than 0 kg');
    if (!location.trim()) return setFormError('Location is required');

    setSubmitting(true);
    try {
      await apiRequest(
        '/user/pickups',
        {
          method: 'POST',
          body: JSON.stringify({
            waste_type: wasteType,
            quantity_kg: quantity,
            location: location.trim(),
            preferred_time: preferredTime || undefined,
          }),
        },
        token,
      );

      success('Pickup Scheduled', 'Dispatched to nearby available fleet collectors.');
      setPage(1);
      setQuantity(10);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create request.';
      setFormError(msg);
      toastError('Request Failed', msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateProfile(e: FormEvent) {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await apiRequest('/user/profile', { method: 'PUT', body: JSON.stringify({ email, phone }) }, token);
      success('Profile Saved', 'Your contact preferences have been updated.');
    } catch (err) {
      toastError('Update Failed', err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setUpdatingProfile(false);
    }
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      success('Location applied', 'Current device coordinates added.');
    });
  };

  const totalPages = Math.ceil(total / 15) || 1;

  const filteredPickups = searchQuery
    ? pickups.filter(
        (p) =>
          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.waste_type.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : pickups;

  const donutData =
    analytics?.by_waste_type?.map((row) => {
      const colors: Record<string, string> = {
        organic: '#10B981',
        plastic: '#3B82F6',
        'e-waste': '#8B5CF6',
        metal: '#F97316',
        paper: '#EAB308',
        glass: '#14B8A6',
      };
      return {
        label: row.waste_type,
        value: row.total_kg,
        color: colors[row.waste_type] || '#10B981',
      };
    }) || [];

  const pickupStatusTone = (s: string) =>
    s === 'collected' ? 'sage' : s === 'en_route' ? 'info' : s === 'assigned' ? 'amber' : 'neutral';

  const activeTab = tab || 'overview';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Welcome back{user?.username ? `, ${user.username}` : ''}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track your recycling impact and schedule household pickups.
          </p>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadData} />}

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {loading ? (
            <SkeletonKPI count={4} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Requests"
                value={analytics?.total_pickups ?? total}
                subtitle={`${analytics?.completed_pickups ?? 0} collected`}
                icon={<Truck className="h-4 w-4" />}
                trend={{ value: 'active', positive: true }}
              />
              <StatCard
                title="Waste Diverted"
                value={`${analytics?.total_kg_contributed ?? 0} kg`}
                subtitle="Sent to certified plants"
                icon={<Leaf className="h-4 w-4" />}
              />
              <StatCard
                title="Carbon Offset"
                value={`${((analytics?.total_kg_contributed ?? 0) * 1.8).toFixed(0)} kg`}
                subtitle="Avoided emissions"
                icon={<Sparkles className="h-4 w-4" />}
              />
              <StatCard
                title="Disposal Sites"
                value={bins.length}
                subtitle="Within local area"
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>
          )}

          {donutData.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Material Stream Distribution</CardTitle>
                  <CardDescription>Breakdown of recycled kilograms by stream</CardDescription>
                </div>
              </CardHeader>
              <div className="grid gap-6 md:grid-cols-[1.5fr_1fr] items-center">
                <DonutChart
                  data={donutData}
                  centerValue={`${analytics?.total_kg_contributed ?? 0} kg`}
                  centerLabel="Total Diverted"
                />
                <div className="flex flex-col items-center justify-center p-4 rounded-[12px] bg-surface-muted/60 border border-border/40 text-center space-y-2">
                  <RadialGauge value={analytics?.completed_pickups || 1} max={analytics?.total_pickups || 1} label="Completion Rate" />
                  <p className="text-xs text-muted-foreground">
                    {analytics?.completed_pickups ?? 0} of {analytics?.total_pickups ?? 0} requests verified
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Live status of your pickup requests</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/requests')}>
                View all ({total})
              </Button>
            </CardHeader>

            {loading ? (
              <SkeletonTable rows={3} />
            ) : pickups.length === 0 ? (
              <EmptyState
                title="No requests yet"
                description="Submit your first pickup to begin recycling!"
                icon={<Truck className="h-5 w-5 text-muted-foreground" />}
                action={
                  <Button size="sm" onClick={() => navigate('/new')}>
                    New Request
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {pickups.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[12px] border border-border bg-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-border-strong transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground capitalize">
                          {p.waste_type} • {p.quantity_kg} kg
                        </span>
                        <Badge tone={pickupStatusTone(p.status)} dot>
                          {p.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {p.location}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(p.requested_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'new' && (
        <Card className="max-w-2xl animate-fade-in">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-primary" />
                New Pickup
              </CardTitle>
              <CardDescription>Dispatch a request to verified local collectors</CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={submitPickup} noValidate className="space-y-3.5">
            <div className="space-y-1">
              <Label>Material</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {wasteTypeOptions.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setWasteType(type)}
                    className={`rounded-lg border p-2 text-xs font-semibold capitalize transition-all text-center ${
                      wasteType === type
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="quantity">Estimated Weight</Label>
                <span className="text-xs font-bold text-primary">{quantity} kg</span>
              </div>
              <div className="flex gap-1.5">
                {[5, 10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className={`flex-1 rounded-lg border py-1 text-xs font-semibold transition-all ${
                      quantity === preset
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {preset}kg
                  </button>
                ))}
              </div>
              <Input
                id="quantity"
                type="number"
                min="0.5"
                step="0.5"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="location">Pickup Address</Label>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="inline-flex items-center text-[11px] font-semibold text-primary hover:underline"
                >
                  <Navigation className="h-3 w-3 mr-1" /> Use my location
                </button>
              </div>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Search by address…"
                leftIcon={<MapPin className="h-3.5 w-3.5" />}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="time">Preferred Time (Optional)</Label>
              <Input
                id="time"
                type="datetime-local"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                leftIcon={<Calendar className="h-3.5 w-3.5" />}
              />
            </div>

            <div className="rounded-[12px] border border-emerald-500/20 bg-emerald-50/40 p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="text-emerald-900 text-[11px]">
                  ~{estimatedCO2} kg CO₂ saved • {estimatedTrees} trees equivalent
                </span>
              </div>
              <Badge tone="sage">Eco Impact</Badge>
            </div>

            {formError && <Alert variant="error">{formError}</Alert>}

            <Button type="submit" loading={submitting} className="w-full h-11 text-xs">
              Submit Request <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'requests' && (
        <Card className="animate-fade-in space-y-3.5">
          <CardHeader>
            <div>
              <CardTitle>My Requests ({total})</CardTitle>
              <CardDescription>Track status updates, assigned collectors, and collection dates</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by address…"
                leftIcon={<Search className="h-3 w-3" />}
                className="h-9 text-xs max-w-[160px]"
              />

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-[10px] border border-border bg-surface px-2.5 text-xs font-semibold text-foreground outline-none"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="en_route">En Route</option>
                <option value="collected">Collected</option>
              </select>
            </div>
          </CardHeader>

          {loading ? (
            <SkeletonTable rows={5} />
          ) : filteredPickups.length === 0 ? (
            <EmptyState
              title="No requests match your filter"
              description="Try adjusting the status filter or schedule a new pickup."
              action={
                <Button size="sm" onClick={() => navigate('/new')}>
                  New Request
                </Button>
              }
            />
          ) : (
            <>
              <div className="space-y-2">
                {filteredPickups.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[12px] border border-border bg-surface p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-border-strong transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs capitalize text-foreground">
                          {p.waste_type} • {p.quantity_kg} kg
                        </span>
                        <Badge tone={pickupStatusTone(p.status)} dot>
                          {p.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">#{p.id}</span>
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

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Requested {new Date(p.requested_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}

      {activeTab === 'rewards' && <RewardsSection />}

      {activeTab === 'bins' && (
        <div className="space-y-3.5 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">Disposal Sites</h3>
              <p className="text-xs text-muted-foreground">Filter by material or click pins to inspect drop-off points</p>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setWasteFilter('')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                  wasteFilter === ''
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Any material
              </button>
              {wasteTypeOptions.map((type) => (
                <button
                  key={type}
                  onClick={() => setWasteFilter(type)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize border transition-all ${
                    wasteFilter === type
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.8fr]">
            <Card className="p-3.5 max-h-[480px] overflow-y-auto space-y-1.5">
              <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                <span className="font-bold text-foreground">{bins.length} Locations</span>
                <span className="text-muted-foreground">10 km radius</span>
              </div>

              {bins.length === 0 ? (
                <EmptyState
                  title="No sites found"
                  description="Clear the material filter to view all locations."
                />
              ) : (
                bins.map((bin) => (
                  <button
                    key={bin.id}
                    onClick={() => setSelectedBinId(bin.id)}
                    className={`w-full text-left rounded-[12px] p-2.5 border transition-all space-y-0.5 ${
                      selectedBinId === bin.id
                        ? 'border-primary bg-primary-muted'
                        : 'border-border bg-surface hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-bold text-foreground">{bin.name}</p>
                      <Badge tone="sage">{bin.capacity_kg} kg</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Accepts: {bin.accepted_waste_types?.join(', ') || 'Any material'}
                    </p>
                  </button>
                ))
              )}
            </Card>

            <BinMap
              bins={bins}
              height={480}
              selectedBinId={selectedBinId}
              onSelectBin={(b) => setSelectedBinId(b.id)}
            />
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <Card className="max-w-md mx-auto animate-fade-in">
          <CardHeader>
            <div>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Update your notification and contact info</CardDescription>
            </div>
            <Badge tone="sage" dot>
              Resident
            </Badge>
          </CardHeader>

          <form onSubmit={updateProfile} className="space-y-3.5">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input value={user?.username ?? ''} disabled leftIcon={<UserIcon className="h-3.5 w-3.5" />} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-3.5 w-3.5" />}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone (SMS Updates)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…"
                leftIcon={<Phone className="h-3.5 w-3.5" />}
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                Joined {new Date(user?.created_at ?? '').toLocaleDateString()}
              </span>
              <Button type="submit" loading={updatingProfile}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
