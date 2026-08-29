import React, { FormEvent, useEffect, useState } from 'react';
import {
  BinMap,
  Button,
  Input,
  Select,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  EmptyState,
  Pagination,
  Modal,
  StatCard,
  Switch,
  SkeletonKPI,
  SkeletonTable,
  DonutChart,
  useAuth,
  useToast,
  useRouter,
  apiRequest,
} from '@wm/shared';
import type { PaginatedResponse, PublicBin, User, AuditLog, Report, DashboardSummary } from '@wm/shared';
import {
  LayoutDashboard,
  MapPin,
  Users,
  ShieldCheck,
  FileText,
  PlusCircle,
  Trash2,
  Edit2,
  Download,
  Search,
  Truck,
  Recycle,
  Sparkles,
  Gift,
} from 'lucide-react';
import { VouchersSection } from './VouchersSection';

interface Collector {
  id: number;
  user_id: number;
  service_area: string;
  is_available: boolean;
}

interface Recycler {
  id: number;
  user_id: number;
  accepted_waste_types: string[];
  capacity_kg: number;
  rating: number;
}

export function ManagementDashboard() {
  const { token } = useAuth();
  const { success, error: toastError } = useToast();
  const { pathname, navigate } = useRouter();

  const getTabFromPath = () => {
    if (pathname.includes('/sites')) return 'bins';
    if (pathname.includes('/users')) return 'users';
    if (pathname.includes('/vouchers')) return 'vouchers';
    if (pathname.includes('/audit')) return 'audit';
    if (pathname.includes('/reports')) return 'reports';
    return 'overview';
  };

  const [tab, setTab] = useState(getTabFromPath);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [loading, setLoading] = useState(true);

  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [selectedBin, setSelectedBin] = useState<PublicBin | null>(null);
  const [binForm, setBinForm] = useState({
    name: '',
    latitude: 13.0827,
    longitude: 80.2707,
    accepted_waste_types: 'organic, plastic',
    capacity_kg: 50,
  });
  const [savingBin, setSavingBin] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'user',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [savingUser, setSavingUser] = useState(false);

  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', href: '/' },
    { id: 'bins', label: 'Disposal Sites', href: '/sites' },
    { id: 'users', label: 'Users', href: '/users' },
    { id: 'audit', label: 'Audit Log', href: '/audit' },
    { id: 'reports', label: 'Generated Reports', href: '/reports' },
  ];

  useEffect(() => {
    setTab(getTabFromPath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function loadOverview() {
    try {
      const s = await apiRequest<DashboardSummary>('/management/dashboard/summary', {}, token);
      setSummary(s);
    } catch (e) {
      toastError('Summary Error', 'Could not load the management summary.');
    }
  }

  async function loadUsers() {
    const qp = new URLSearchParams({ page: String(userPage), page_size: '10' });
    if (roleFilter) qp.set('role', roleFilter);
    const data = await apiRequest<PaginatedResponse<User>>(`/management/users?${qp.toString()}`, {}, token);
    setUsers(data.items);
    setUserTotal(data.total);
  }

  async function loadBins() {
    const data = await apiRequest<PublicBin[]>('/management/bins', {}, token);
    setBins(data);
  }

  async function loadAudit() {
    const data = await apiRequest<PaginatedResponse<AuditLog>>('/management/audit-logs?page=1&page_size=15', {}, token);
    setAudit(data.items);
  }

  async function loadReports() {
    const data = await apiRequest<Report[]>('/management/reports', {}, token);
    setReports(data);
  }

  async function loadExtras() {
    const [c, r] = await Promise.all([
      apiRequest<PaginatedResponse<Collector>>('/management/collectors?page=1&page_size=10', {}, token).catch(() => ({
        items: [] as Collector[],
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 1,
      })),
      apiRequest<PaginatedResponse<Recycler>>('/management/recyclers?page=1&page_size=10', {}, token).catch(() => ({
        items: [] as Recycler[],
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 1,
      })),
    ]);
    setCollectors(c.items);
    setRecyclers(r.items);
  }

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadOverview(), loadUsers(), loadBins(), loadAudit(), loadReports(), loadExtras()]);
    } catch (e) {
      toastError('Load Error', 'Failed to fetch management data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadUsers().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage, roleFilter]);

  function selectBinForEditing(bin: PublicBin | null) {
    setSelectedBin(bin);
    if (bin) {
      setBinForm({
        name: bin.name,
        latitude: bin.latitude,
        longitude: bin.longitude,
        accepted_waste_types: bin.accepted_waste_types.join(', '),
        capacity_kg: bin.capacity_kg,
      });
    } else {
      setBinForm({
        name: '',
        latitude: 13.0827,
        longitude: 80.2707,
        accepted_waste_types: 'organic, plastic',
        capacity_kg: 50,
      });
    }
  }

  async function saveBin(e: FormEvent) {
    e.preventDefault();
    if (!binForm.name.trim()) return toastError('Validation Error', 'Bin name is required.');

    setSavingBin(true);
    const payload = {
      ...binForm,
      name: binForm.name.trim(),
      accepted_waste_types: binForm.accepted_waste_types
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (selectedBin) {
        await apiRequest(`/management/bins/${selectedBin.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
        success('Bin Updated', `Changes to "${payload.name}" published.`);
      } else {
        await apiRequest('/management/bins', { method: 'POST', body: JSON.stringify(payload) }, token);
        success('Bin Deployed', `New bin "${payload.name}" is active.`);
      }
      selectBinForEditing(null);
      await loadBins();
      await loadOverview();
    } catch (err) {
      toastError('Save Error', err instanceof Error ? err.message : 'Failed to save bin.');
    } finally {
      setSavingBin(false);
    }
  }

  async function deleteBin(id: number) {
    if (!confirm('Delete this public disposal bin?')) return;
    try {
      await apiRequest(`/management/bins/${id}`, { method: 'DELETE' }, token);
      success('Bin Removed', 'Bin deleted.');
      selectBinForEditing(null);
      await loadBins();
      await loadOverview();
    } catch (e) {
      toastError('Delete Failed', 'Could not delete bin.');
    }
  }

  async function dragBinToNewLocation(bin: PublicBin, lat: number, lng: number) {
    try {
      await apiRequest(`/management/bins/${bin.id}`, { method: 'PUT', body: JSON.stringify({ latitude: lat, longitude: lng }) }, token);
      success('Coordinates Updated', `Bin moved to (${lat.toFixed(4)}, ${lng.toFixed(4)}).`);
      await loadBins();
    } catch (e) {
      toastError('Move Failed', 'Failed to update bin coordinates.');
    }
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await apiRequest('/management/users', { method: 'POST', body: JSON.stringify(newUser) }, token);
      success('User Created', `Account for "${newUser.username}" created as ${newUser.role}.`);
      setNewUser({ username: '', email: '', password: '', phone: '', role: 'user' });
      await loadUsers();
      await loadOverview();
    } catch (err) {
      toastError('Creation Failed', err instanceof Error ? err.message : 'Could not create user.');
    } finally {
      setCreatingUser(false);
    }
  }

  async function saveEditingUser() {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      await apiRequest(
        `/management/users/${editingUser.id}`,
        { method: 'PUT', body: JSON.stringify({ phone: editPhone, is_active: editActive }) },
        token,
      );
      success('User Updated', `Settings saved for ${editingUser.username}.`);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      toastError('Update Failed', 'Failed to update user.');
    } finally {
      setSavingUser(false);
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user account? This cannot be undone.')) return;
    try {
      await apiRequest(`/management/users/${id}`, { method: 'DELETE' }, token);
      success('User Deleted', 'Account removed from system.');
      await loadUsers();
      await loadOverview();
    } catch (err) {
      toastError('Delete Failed', err instanceof Error ? err.message : 'You cannot delete yourself.');
    }
  }

  async function generateReport(type: string) {
    setGeneratingReport(type);
    try {
      await apiRequest<Report>(`/management/reports/${type}`, { method: 'POST' }, token);
      success('Report Ready', `Export for ${type} generated.`);
      await loadReports();
    } catch (e) {
      toastError('Export Error', 'Failed to compile report.');
    } finally {
      setGeneratingReport(null);
    }
  }

  const totalUsers = summary ? Object.values(summary.users).reduce((a, b) => a + b, 0) : 0;

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : users;

  const donutData =
    summary?.by_waste_type?.map((row) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">City Operations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Executive metrics, disposal sites, user directory, audit trail, and data exports.
          </p>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {loading ? (
            <SkeletonKPI count={6} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Registered Users"
                value={totalUsers}
                subtitle={`${summary?.users.users ?? 0} residents • ${summary?.users.collectors ?? 0} collectors • ${summary?.users.recyclers ?? 0} recyclers`}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                title="Pickup Pipeline"
                value={`${summary?.pickup_pipeline.pending ?? 0} Pending`}
                subtitle={`${summary?.pickup_pipeline.assigned ?? 0} en route • ${summary?.pickup_pipeline.collected ?? 0} collected`}
                icon={<Truck className="h-4 w-4" />}
                trend={{ value: 'Realtime', positive: true }}
              />
              <StatCard
                title="Total Waste Diverted"
                value={`${summary?.total_waste_kg ?? 0} kg`}
                subtitle={`${summary?.batches.completed ?? 0} batches closed`}
                icon={<Sparkles className="h-4 w-4" />}
              />
              <StatCard
                title="Public Bins Network"
                value={summary?.public_bins ?? bins.length}
                subtitle="Geo-pinned drop-off points"
                icon={<MapPin className="h-4 w-4" />}
              />
              <StatCard
                title="Reward Points Issued"
                value={(summary?.points_issued ?? 0).toLocaleString('en-IN')}
                subtitle="Awarded for collection & recycling"
                icon={<Gift className="h-4 w-4" />}
              />
              <StatCard
                title="Points Redeemed"
                value={(summary?.points_redeemed ?? 0).toLocaleString('en-IN')}
                subtitle="Spent on reward vouchers"
                icon={<Sparkles className="h-4 w-4" />}
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Material Stream Distribution</CardTitle>
                  <CardDescription>City-wide volume diverted by material category</CardDescription>
                </div>
              </CardHeader>

              {donutData.length > 0 ? (
                <DonutChart
                  data={donutData}
                  centerValue={`${summary?.total_waste_kg ?? 0} kg`}
                  centerLabel="Total Diverted"
                />
              ) : (
                <EmptyState
                  title="No waste collected yet"
                  description="As pickups are completed across the city, stream analytics will appear."
                />
              )}
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Network Operational Status</CardTitle>
                  <CardDescription>Live availability of collectors and partner processing plants</CardDescription>
                </div>
              </CardHeader>

              <div className="space-y-3">
                <div className="rounded-[12px] border border-border bg-surface p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Active Collector Fleets</p>
                      <p className="text-[11px] text-muted-foreground">
                        {collectors.filter((c) => c.is_available).length} online • {collectors.filter((c) => !c.is_available).length} paused
                      </p>
                    </div>
                  </div>
                  <Badge tone="sage">{collectors.length} Total</Badge>
                </div>

                <div className="rounded-[12px] border border-border bg-surface p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Recycle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Certified Recycling Plants</p>
                      <p className="text-[11px] text-muted-foreground">
                        {recyclers.length ? `${recyclers[0].capacity_kg} kg average capacity` : 'No plants registered'}
                      </p>
                    </div>
                  </div>
                  <Badge tone="sage">{recyclers.length} Certified</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'bins' && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr] animate-fade-in">
          <Card className="space-y-3.5">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {selectedBin ? `Edit Bin #${selectedBin.id}` : 'Deploy New Disposal Bin'}
                </CardTitle>
                <CardDescription>
                  {selectedBin ? 'Update coordinates or delete' : 'Click on map or fill fields to deploy'}
                </CardDescription>
              </div>
              <Badge tone="stone">{bins.length} Total</Badge>
            </CardHeader>

            <form onSubmit={saveBin} noValidate className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="bin-name">Bin Name</Label>
                <Input
                  id="bin-name"
                  value={binForm.name}
                  onChange={(e) => setBinForm({ ...binForm, name: e.target.value })}
                  placeholder="e.g. Marina Beach Bin 04"
                  required
                />
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="bin-lat">Latitude</Label>
                  <Input
                    id="bin-lat"
                    type="number"
                    step="0.000001"
                    value={binForm.latitude}
                    onChange={(e) => setBinForm({ ...binForm, latitude: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bin-lng">Longitude</Label>
                  <Input
                    id="bin-lng"
                    type="number"
                    step="0.000001"
                    value={binForm.longitude}
                    onChange={(e) => setBinForm({ ...binForm, longitude: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="bin-types">Accepted Streams</Label>
                <Input
                  id="bin-types"
                  value={binForm.accepted_waste_types}
                  onChange={(e) => setBinForm({ ...binForm, accepted_waste_types: e.target.value })}
                  placeholder="organic, plastic, e-waste"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bin-cap">Capacity (kg)</Label>
                <Input
                  id="bin-cap"
                  type="number"
                  value={binForm.capacity_kg}
                  onChange={(e) => setBinForm({ ...binForm, capacity_kg: Number(e.target.value) })}
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1.5">
                <Button type="submit" loading={savingBin}>
                  {selectedBin ? 'Save Bin' : 'Deploy Bin →'}
                </Button>
                {selectedBin && (
                  <>
                    <Button type="button" variant="destructive" onClick={() => deleteBin(selectedBin.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                    <Button type="button" variant="outline" onClick={() => selectBinForEditing(null)}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </form>

            <div className="pt-2.5 border-t border-border">
              <p className="text-xs font-bold text-foreground mb-1.5">Deployed Bins Roster</p>
              <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                {bins.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => selectBinForEditing(b)}
                    className={`w-full text-left rounded-lg p-2 border transition-all text-xs flex items-center justify-between ${
                      selectedBin?.id === b.id
                        ? 'border-primary bg-primary-muted text-foreground'
                        : 'border-border bg-surface hover:bg-surface-muted text-muted-foreground'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)} • {b.capacity_kg} kg
                      </p>
                    </div>
                    <Badge tone="sage">{b.accepted_waste_types.length} Streams</Badge>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <BinMap
              bins={bins}
              editable
              height={560}
              selectedBinId={selectedBin?.id}
              onPick={(lat, lng) => setBinForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
              onDrag={dragBinToNewLocation}
              onSelectBin={selectBinForEditing}
            />
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-primary" />
                  Provision Account
                </CardTitle>
                <CardDescription>Create Resident, Collector, Recycler, or Admin accounts directly</CardDescription>
              </div>
            </CardHeader>

            <form onSubmit={createUser} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Username</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Username"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="name@city.gov"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+91…"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="user">Resident</option>
                    <option value="collector">Collector</option>
                    <option value="recycler">Recycler</option>
                    <option value="management">Admin</option>
                  </Select>
                </div>
              </div>

              <Button type="submit" loading={creatingUser}>
                Create User Account →
              </Button>
            </form>
          </Card>

          <Card className="space-y-3.5">
            <CardHeader>
              <div>
                <CardTitle>User Directory ({userTotal})</CardTitle>
                <CardDescription>Filter, inspect, edit access permissions, or delete accounts</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users…"
                  leftIcon={<Search className="h-3 w-3" />}
                  className="h-9 text-xs max-w-[160px]"
                />

                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="h-9 rounded-[10px] border border-border bg-surface px-2.5 text-xs font-semibold text-foreground outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="user">Residents</option>
                  <option value="collector">Collectors</option>
                  <option value="recycler">Recyclers</option>
                  <option value="management">Admins</option>
                </select>
              </div>
            </CardHeader>

            {loading ? (
              <SkeletonTable rows={5} />
            ) : filteredUsers.length === 0 ? (
              <EmptyState title="No users found" description="Adjust your filter." />
            ) : (
              <>
                <div className="space-y-1.5">
                  {filteredUsers.map((u) => {
                    const roleTone =
                      u.role === 'management' ? 'info' : u.role === 'collector' ? 'amber' : u.role === 'recycler' ? 'sage' : 'neutral';

                    return (
                      <div
                        key={u.id}
                        className="rounded-[12px] border border-border bg-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">{u.username}</span>
                            <Badge tone={roleTone} dot>
                              {u.role === 'management' ? 'Admin' : u.role}
                            </Badge>
                            {!u.is_active && <Badge tone="error">Deactivated</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {u.email} {u.phone && `• ${u.phone}`} • Joined {new Date(u.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(u);
                              setEditPhone(u.phone ?? '');
                              setEditActive(u.is_active);
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(u.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Pagination page={userPage} totalPages={Math.ceil(userTotal / 10) || 1} onPageChange={setUserPage} />
              </>
            )}
          </Card>

          <Modal
            open={!!editingUser}
            onClose={() => setEditingUser(null)}
            title={`Edit Account: ${editingUser?.username}`}
            description="Modify contact details and account status"
          >
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91…"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-surface-muted">
                <div>
                  <p className="text-xs font-bold text-foreground">Account Status</p>
                  <p className="text-[10px] text-muted-foreground">Allow user to sign in</p>
                </div>
                <Switch checked={editActive} onChange={setEditActive} label={editActive ? 'Active' : 'Deactivated'} />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEditingUser} loading={savingUser}>
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'vouchers' && <VouchersSection />}

      {tab === 'audit' && (
        <Card className="animate-fade-in space-y-3.5">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                System Audit Log
              </CardTitle>
              <CardDescription>Security event trail of state changes and handovers</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadAudit}>
              Refresh Logs
            </Button>
          </CardHeader>

          {loading ? (
            <SkeletonTable rows={6} />
          ) : audit.length === 0 ? (
            <EmptyState title="No audit logs" description="System operations will be logged here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                    <th className="py-2 px-2.5">Timestamp</th>
                    <th className="py-2 px-2.5">Actor</th>
                    <th className="py-2 px-2.5">Action</th>
                    <th className="py-2 px-2.5">Entity</th>
                    <th className="py-2 px-2.5">Entity ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {audit.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-2.5 px-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 font-semibold text-foreground">User #{log.actor_user_id}</td>
                      <td className="py-2.5 px-2.5">
                        <Badge tone="info">{log.action}</Badge>
                      </td>
                      <td className="py-2.5 px-2.5 capitalize text-muted-foreground">{log.entity_type}</td>
                      <td className="py-2.5 px-2.5 font-mono font-semibold text-foreground">#{log.entity_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'reports' && (
        <Card className="animate-fade-in space-y-5">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Data Exports
              </CardTitle>
              <CardDescription>Generate verified exports of city datasets</CardDescription>
            </div>
          </CardHeader>

          <div className="grid gap-3 sm:grid-cols-4">
            {(['users', 'pickups', 'batches', 'bins'] as const).map((type) => (
              <div key={type} className="rounded-[12px] border border-border bg-surface p-3.5 space-y-2.5">
                <div>
                  <p className="text-xs font-bold capitalize text-foreground">{type} Export</p>
                  <p className="text-[11px] text-muted-foreground">Full dataset</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => generateReport(type)}
                  loading={generatingReport === type}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-foreground">Generated Reports</p>
            {reports.length === 0 ? (
              <EmptyState title="No exports generated yet" description="Click Export on any dataset above." />
            ) : (
              <div className="space-y-1.5">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-[12px] border border-border bg-surface p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs capitalize text-foreground">{r.report_type} Report</span>
                        <Badge tone="stone">{new Date(r.created_at).toLocaleDateString()}</Badge>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{r.file_url}</p>
                    </div>

                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-1 rounded-[10px] bg-primary-muted text-[#c73a00] px-2.5 text-xs font-semibold hover:bg-[#ffe7da] transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
