import { FormEvent, useEffect, useState } from 'react';
import { BinMap } from '../../components/map/BinMap';
import { Button, Input, Select, Label, Card, CardHeader, CardTitle, CardDescription, Badge, EmptyState, Skeleton, SimpleTabs, Pagination, Alert, Modal } from '../../components/ui/primitives';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import type { PaginatedResponse, PublicBin, User, AuditLog, Report, DashboardSummary } from '../../types/api';

type Collector = { id: number; user_id: number; service_area: string; is_available: boolean };
type Recycler = { id: number; user_id: number; accepted_waste_types: string[]; capacity_kg: number; rating: number };

export function ManagementDashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [bins, setBins] = useState<PublicBin[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // users pagination
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  // bins
  const [selectedBin, setSelectedBin] = useState<PublicBin | null>(null);
  const [binForm, setBinForm] = useState({ name: '', latitude: 13.0827, longitude: 80.2707, accepted_waste_types: 'organic,plastic', capacity_kg: 50 });
  const [binError, setBinError] = useState('');
  // create user
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', phone: '', role: 'user' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editActive, setEditActive] = useState(true);

  async function loadOverview() {
    try {
      const s = await apiRequest<DashboardSummary>('/management/dashboard/summary', {}, token);
      setSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
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
    const data = await apiRequest<PaginatedResponse<AuditLog>>('/management/audit-logs?page=1&page_size=10', {}, token);
    setAudit(data.items);
  }
  async function loadReports() {
    const data = await apiRequest<Report[]>('/management/reports', {}, token);
    setReports(data);
  }
  async function loadExtras() {
    const c = await apiRequest<PaginatedResponse<Collector>>('/management/collectors?page=1&page_size=10', {}, token).catch(() => ({ items: [] as Collector[], total: 0, page: 1, page_size: 10, total_pages: 1 }));
    const r = await apiRequest<PaginatedResponse<Recycler>>('/management/recyclers?page=1&page_size=10', {}, token).catch(() => ({ items: [] as Recycler[], total: 0, page: 1, page_size: 10, total_pages: 1 }));
    setCollectors(c.items);
    setRecyclers(r.items);
  }

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadOverview(), loadUsers(), loadBins(), loadAudit(), loadReports(), loadExtras()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);
  useEffect(() => {
    loadUsers().catch(() => {});
  }, [userPage, roleFilter]);

  function chooseBin(bin: PublicBin | null) {
    setSelectedBin(bin);
    setBinError('');
    if (bin) setBinForm({ name: bin.name, latitude: bin.latitude, longitude: bin.longitude, accepted_waste_types: bin.accepted_waste_types.join(','), capacity_kg: bin.capacity_kg });
    else setBinForm({ name: '', latitude: 13.0827, longitude: 80.2707, accepted_waste_types: 'organic,plastic', capacity_kg: 50 });
  }

  async function saveBin(e: FormEvent) {
    e.preventDefault();
    if (!binForm.name.trim()) return setBinError('Name is required');
    const payload = { ...binForm, name: binForm.name.trim(), accepted_waste_types: binForm.accepted_waste_types.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      if (selectedBin) {
        await apiRequest(`/management/bins/${selectedBin.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
        setMessage('Bin updated — live on all maps.');
      } else {
        await apiRequest('/management/bins', { method: 'POST', body: JSON.stringify(payload) }, token);
        setMessage('Bin created — visible to all roles.');
      }
      chooseBin(null);
      await loadBins();
      await loadOverview();
    } catch (err) {
      setBinError(err instanceof Error ? err.message : 'Save failed');
    }
  }
  async function deleteBin(id: number) {
    if (!confirm('Delete this bin?')) return;
    await apiRequest(`/management/bins/${id}`, { method: 'DELETE' }, token);
    setMessage('Bin deleted.');
    chooseBin(null);
    await loadBins();
  }
  async function dragBin(bin: PublicBin, lat: number, lng: number) {
    await apiRequest(`/management/bins/${bin.id}`, { method: 'PUT', body: JSON.stringify({ latitude: lat, longitude: lng }) }, token);
    setMessage(`Bin "${bin.name}" moved — persisted.`);
    await loadBins();
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    try {
      await apiRequest('/management/users', { method: 'POST', body: JSON.stringify(newUser) }, token);
      setMessage(`User "${newUser.username}" created as ${newUser.role}.`);
      setNewUser({ username: '', email: '', password: '', phone: '', role: 'user' });
      await loadUsers();
      await loadOverview();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Create failed');
    }
  }

  async function saveEditingUser() {
    if (!editingUser) return;
    try {
      await apiRequest(`/management/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify({ phone: editPhone, is_active: editActive }) }, token);
      setMessage('User updated.');
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await apiRequest(`/management/users/${id}`, { method: 'DELETE' }, token);
      setMessage('User deleted.');
      await loadUsers();
      await loadOverview();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed — you cannot delete yourself');
    }
  }

  async function genReport(type: string) {
    try {
      const r = await apiRequest<Report>(`/management/reports/${type}`, { method: 'POST' }, token);
      setMessage(`${type} report generated — ${r.file_url}`);
      await loadReports();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Report failed');
    }
  }

  const totalUsers = summary ? Object.values(summary.users).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-display">Control center</h1>
          <p className="text-sm text-muted-foreground">Overview, bins, users, audit, and reports — one paper.</p>
        </div>
        <SimpleTabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'bins', label: 'Bins' }, { id: 'users', label: 'Users' }, { id: 'audit', label: 'Audit' }, { id: 'reports', label: 'Reports' }]} active={tab} onChange={setTab} />
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {tab === 'overview' && (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <p className="text-label text-muted-foreground">Total users</p>
              <p className="mt-1 text-3xl font-bold">{loading ? '—' : totalUsers}</p>
              <p className="text-xs text-muted-foreground">{summary?.users.users ?? 0} residents • {summary?.users.collectors ?? 0} collectors • {summary?.users.recyclers ?? 0} recyclers</p>
            </Card>
            <Card>
              <p className="text-label text-muted-foreground">Pipeline</p>
              <p className="mt-1 text-3xl font-bold">{summary?.pickup_pipeline.pending ?? 0} pending</p>
              <p className="text-xs text-muted-foreground">{summary?.pickup_pipeline.assigned ?? 0} assigned • {summary?.pickup_pipeline.collected ?? 0} collected</p>
            </Card>
            <Card>
              <p className="text-label text-muted-foreground">Waste</p>
              <p className="mt-1 text-3xl font-bold">{summary?.total_waste_kg ?? 0} kg</p>
              <p className="text-xs text-muted-foreground">{summary?.batches.available ?? 0} available • {summary?.batches.completed ?? 0} completed</p>
            </Card>
            <Card>
              <p className="text-label text-muted-foreground">Bins</p>
              <p className="mt-1 text-3xl font-bold">{summary?.public_bins ?? 0}</p>
              <p className="text-xs text-muted-foreground">{bins.length} geo-pinned</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>By waste type</CardTitle>
                  <CardDescription>Collected kilograms — sustainable palette</CardDescription>
                </div>
              </CardHeader>
              {loading ? (
                <div className="grid gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : summary?.by_waste_type && summary.by_waste_type.length > 0 ? (
                <div className="grid gap-3">
                  {summary.by_waste_type.map((row) => (
                    <div key={row.waste_type} className="flex items-center justify-between rounded-xl border border-border bg-muted p-3">
                      <span className="text-sm font-semibold capitalize">{row.waste_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.count} pickups • {row.total_kg} kg
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No data yet" description="Collected pickups will populate this breakdown." />
              )}
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Operational extras</CardTitle>
                  <CardDescription>Collectors and recyclers roster</CardDescription>
                </div>
              </CardHeader>
              <div className="grid gap-3">
                <div className="rounded-xl border border-border bg-white p-3">
                  <p className="text-sm font-bold">Collectors ({collectors.length})</p>
                  <p className="text-xs text-muted-foreground">{collectors.filter((c) => c.is_available).length} available • {collectors.filter((c) => !c.is_available).length} unavailable</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-3">
                  <p className="text-sm font-bold">Recyclers ({recyclers.length})</p>
                  <p className="text-xs text-muted-foreground">{recyclers.length ? `${recyclers[0].capacity_kg} kg capacity • rating ${recyclers[0].rating}` : 'No recyclers yet'}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'bins' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{selectedBin ? `Edit bin #${selectedBin.id}` : 'Create bin'}</CardTitle>
                <CardDescription>{selectedBin ? 'Update fields or delete' : 'Appears on all maps for all roles'}</CardDescription>
              </div>
              <Badge tone="stone">{bins.length} total</Badge>
            </CardHeader>
            <form onSubmit={saveBin} noValidate className="grid gap-4">
              {binError && <Alert variant="error">{binError}</Alert>}
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input value={binForm.name} onChange={(e) => setBinForm({ ...binForm, name: e.target.value })} placeholder="MG Road Bin 01" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Latitude</Label>
                  <Input type="number" step="0.000001" value={binForm.latitude} onChange={(e) => setBinForm({ ...binForm, latitude: Number(e.target.value) })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Longitude</Label>
                  <Input type="number" step="0.000001" value={binForm.longitude} onChange={(e) => setBinForm({ ...binForm, longitude: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Accepted waste types</Label>
                <Input value={binForm.accepted_waste_types} onChange={(e) => setBinForm({ ...binForm, accepted_waste_types: e.target.value })} placeholder="organic, plastic, e-waste" />
              </div>
              <div className="grid gap-1.5">
                <Label>Capacity (kg)</Label>
                <Input type="number" value={binForm.capacity_kg} onChange={(e) => setBinForm({ ...binForm, capacity_kg: Number(e.target.value) })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">{selectedBin ? 'Update bin' : 'Create bin →'}</Button>
                {selectedBin && (
                  <>
                    <Button type="button" variant="destructive" onClick={() => deleteBin(selectedBin.id)}>
                      Delete
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => chooseBin(null)}>
                      New bin
                    </Button>
                  </>
                )}
              </div>
            </form>
            <div className="mt-5 grid max-h-[260px] gap-2 overflow-auto pr-1">
              {loading ? (
                <Skeleton className="h-20" />
              ) : bins.length === 0 ? (
                <EmptyState title="No bins yet" description="Create the first bin — it will appear on all maps." />
              ) : (
                bins.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => chooseBin(b)}
                    className={`text-left rounded-xl border px-3 py-2.5 text-sm ${selectedBin?.id === b.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-white hover:bg-muted text-muted-foreground'}`}
                    aria-pressed={selectedBin?.id === b.id}
                  >
                    <span className="font-semibold text-foreground">{b.name}</span> <span className="text-muted-foreground">• {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</span>
                    <span className="block text-xs">{b.accepted_waste_types.join(', ') || 'Any'} • {b.capacity_kg}kg</span>
                  </button>
                ))
              )}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Bin map — control center</CardTitle>
                <CardDescription>Click to set lat/lng • Drag to persist</CardDescription>
              </div>
              <Badge tone="amber">Draggable</Badge>
            </CardHeader>
            <BinMap bins={bins} editable onPick={(lat, lng) => setBinForm({ ...binForm, latitude: lat, longitude: lng })} onDrag={dragBin} height={520} />
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Create user</CardTitle>
                <CardDescription>Resident, collector, recycler, or admin — sets role and phone</CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={createUser} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Username</Label>
                  <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
                </div>
                <div className="grid gap-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Password</Label>
                  <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                </div>
                <div className="grid gap-1.5">
                  <Label>Phone</Label>
                  <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+91…" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Role</Label>
                <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as string })}>
                  <option value="user">Resident</option>
                  <option value="collector">Collector</option>
                  <option value="recycler">Recycler</option>
                  <option value="management">Admin</option>
                </Select>
              </div>
              <Button type="submit">Create user →</Button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>Paginated • filter by role • edit phone/active • delete</CardDescription>
              </div>
              <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setUserPage(1); }} className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold">
                <option value="">All roles</option>
                <option value="user">Residents</option>
                <option value="collector">Collectors</option>
                <option value="recycler">Recyclers</option>
                <option value="management">Admins</option>
              </select>
            </CardHeader>
            {loading ? (
              <div className="grid gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <EmptyState title="No users" description="Adjust filter or create a new user." />
            ) : (
              <>
                <div className="grid gap-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold">
                          {u.username} <Badge tone={u.role === 'management' ? 'info' : u.role === 'collector' ? 'amber' : u.role === 'recycler' ? 'sage' : 'stone'}>{u.role}</Badge>{' '}
                          {!u.is_active && <Badge tone="error">inactive</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {u.email} {u.phone && `• ${u.phone}`} • Joined {new Date(u.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingUser(u);
                            setEditPhone(u.phone ?? '');
                            setEditActive(u.is_active);
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteUser(u.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination page={userPage} totalPages={Math.ceil(userTotal / 10) || 1} onPageChange={setUserPage} />
              </>
            )}
          </Card>

          <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit ${editingUser?.username ?? ''}`}>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+91…" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
                Active
              </label>
              <div className="flex gap-2">
                <Button onClick={saveEditingUser}>Save changes</Button>
                <Button variant="ghost" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Audit logs</CardTitle>
              <CardDescription>Actor, action, entity — paginated, filtered by management</CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={loadAudit}>
              Refresh
            </Button>
          </CardHeader>
          {audit.length === 0 ? (
            <EmptyState title="No audit logs" description="Actions will appear here as users interact with the system." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">When</th>
                    <th className="py-2">Actor</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((l) => (
                    <tr key={l.id} className="border-b border-border/60">
                      <td className="py-2.5 text-xs text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</td>
                      <td className="py-2.5 font-medium">#{l.actor_user_id}</td>
                      <td className="py-2.5">
                        <Badge tone="stone">{l.action}</Badge>
                      </td>
                      <td className="py-2.5 text-xs">
                        {l.entity_type} #{l.entity_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'reports' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Generate CSV — users, pickups, batches, bins — list existing</CardDescription>
            </div>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {(['users', 'pickups', 'batches', 'bins'] as const).map((t) => (
              <Button key={t} variant="secondary" size="sm" onClick={() => genReport(t)} className="capitalize">
                Generate {t}
              </Button>
            ))}
          </div>
          <div className="mt-6 grid gap-2">
            {reports.length === 0 ? (
              <EmptyState title="No reports yet" description="Generate one — CSV will be saved to /uploads/reports and listed here." />
            ) : (
              reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-muted p-3">
                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {r.report_type} <Badge tone="stone">{new Date(r.created_at).toLocaleDateString()}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">{r.file_url}</p>
                  </div>
                  <a href={r.file_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-xl border border-border bg-white px-4 text-xs font-semibold hover:bg-muted">
                    Open
                  </a>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
