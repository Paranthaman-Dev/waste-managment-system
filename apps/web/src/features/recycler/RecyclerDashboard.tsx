import React, { ChangeEvent, useEffect, useState, Suspense } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  EmptyState,
  Pagination,
  Modal,
  StatCard,
  SkeletonKPI,
  SkeletonTable,
  SkeletonGrid,
  SkeletonMap,
  useAuth,
  useToast,
  useRouter,
  apiRequest,
} from '@wm/shared';
import type { PaginatedResponse, WasteBatch, Recycler } from '@wm/shared';
import {
  Recycle,
  Layers,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Eye,
  FileImage,
  RefreshCw,
} from 'lucide-react';

// True lazy for charts — splits into dedicated chunk per vite.config manualChunks
const LazyDonutChart = React.lazy(() => import('@wm/shared/charts').then((m) => ({ default: m.DonutChart })));

class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { hasError: boolean; error?: Error }> {
  state: { hasError: boolean; error?: Error } = { hasError: false, error: undefined };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center" role="alert">
          <p className="text-sm font-medium text-destructive">Something went wrong loading this section.</p>
          {this.state.error?.message && <p className="text-xs text-muted-foreground mt-1">{this.state.error.message}</p>}
          <button type="button" onClick={() => this.setState({ hasError: false, error: undefined })} className="mt-3 inline-flex items-center rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium hover:bg-surface-muted">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Extracted batch cards — deduplicate picnic-style batch row JSX
function AvailableBatchCard({ b, acting, onClaim }: { b: WasteBatch; acting: number | null; onClaim: (id: number) => void }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-3.5 flex flex-col justify-between gap-2.5 hover:border-border-strong transition-all">
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-foreground">Batch #{b.id}</span>
          <Badge tone="amber" dot>{b.status}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">Origin: Pickup Request <span className="font-mono font-semibold text-foreground">#{b.pickup_request_id}</span></p>
      </div>
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Ready for transfer</span>
        <Button size="sm" onClick={() => onClaim(b.id)} loading={acting === b.id}>Claim Batch <ArrowRight className="h-3 w-3 ml-1" /></Button>
      </div>
    </div>
  );
}

function MineBatchRow({
  b,
  acting,
  onAccept,
  onUpload,
  onInspect,
}: {
  b: WasteBatch;
  acting: number | null;
  onAccept: (id: number) => void;
  onUpload: (id: number, e: ChangeEvent<HTMLInputElement>) => void;
  onInspect: (b: WasteBatch) => void;
}) {
  const statusTone = b.status === 'completed' ? 'sage' : b.status === 'accepted' || b.status === 'processing' ? 'info' : 'amber';
  return (
    <div className="rounded-[12px] border border-border bg-surface p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-xs text-foreground">Batch #{b.id}</span>
          <Badge tone={statusTone as any} dot>{b.status}</Badge>
          <span className="text-[10px] text-muted-foreground font-mono">Pickup #{b.pickup_request_id}</span>
        </div>
        {b.handed_over_at && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />Handed over: {new Date(b.handed_over_at).toLocaleString()}</p>
        )}
        {b.proof_url && (
          <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Verified proof attached</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {b.status === 'requested' && <Button size="sm" onClick={() => onAccept(b.id)} loading={acting === b.id}>Confirm Handover</Button>}
        {b.status !== 'completed' && (
          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface-muted px-2.5 text-[11px] font-semibold text-foreground hover:bg-stone transition-colors">
            <UploadCloud className="h-3.5 w-3.5 text-primary" /><span>Upload Proof</span>
            <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onUpload(b.id, e)} />
          </label>
        )}
        {b.proof_url && <Button size="sm" variant="outline" onClick={() => onInspect(b)}><Eye className="h-3 w-3 mr-1" />Inspect</Button>}
      </div>
    </div>
  );
}

export function RecyclerDashboard() {
  const { token } = useAuth();
  const { success, error: toastError } = useToast();
  const { pathname, navigate } = useRouter();

  const getTabFromPath = () => {
    if (pathname.includes('/my-batches')) return 'mine';
    if (pathname.includes('/analytics')) return 'analytics';
    return 'available';
  };

  const [tab, setTab] = useState(getTabFromPath);
  const [available, setAvailable] = useState<WasteBatch[]>([]);
  const [mine, setMine] = useState<WasteBatch[]>([]);
  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [pageA, setPageA] = useState(1);
  const [pageM, setPageM] = useState(1);
  const [totalA, setTotalA] = useState(0);
  const [totalM, setTotalM] = useState(0);
  const [wasteFilter, setWasteFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<{
    total_batches: number;
    completed_batches: number;
    total_kg_processed: number;
    by_waste_type: { waste_type: string; total_kg: number; count: number }[];
  } | null>(null);

  const [inspectedBatch, setInspectedBatch] = useState<WasteBatch | null>(null);

  useEffect(() => {
    setTab(getTabFromPath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function loadData() {
    setLoading(true);
    try {
      const qa = new URLSearchParams({ page: String(pageA), page_size: '15' });
      const qm = new URLSearchParams({ page: String(pageM), page_size: '15' });
      if (wasteFilter) qa.set('waste_type', wasteFilter);

      const [a, m, r, ana] = await Promise.all([
        apiRequest<PaginatedResponse<WasteBatch>>(`/recycler/batches?${qa.toString()}`, {}, token),
        apiRequest<PaginatedResponse<WasteBatch>>(`/recycler/batches/my?${qm.toString()}`, {}, token),
        apiRequest<Recycler>('/recycler/profile', {}, token).catch(() => null),
        apiRequest<{
          total_batches: number;
          completed_batches: number;
          total_kg_processed: number;
          by_waste_type: { waste_type: string; total_kg: number; count: number }[];
        }>('/recycler/analytics/summary', {}, token).catch(() => null),
      ]);

      setAvailable(a.items);
      setTotalA(a.total);
      setMine(m.items);
      setTotalM(m.total);
      setRecycler(r);
      setAnalytics(ana);
    } catch (e) {
      toastError('Load Failed', e instanceof Error ? e.message : 'Could not fetch batches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageA, pageM, wasteFilter]);

  async function requestBatch(id: number) {
    setActing(id);
    try {
      await apiRequest(`/recycler/batches/${id}/request`, { method: 'POST' }, token);
      success('Batch Claimed', 'Batch added to your claimed processing queue.');
      await loadData();
    } catch (e) {
      toastError('Claim Failed', 'Could not claim batch.');
    } finally {
      setActing(null);
    }
  }

  async function acceptBatch(id: number) {
    setActing(id);
    try {
      await apiRequest(`/recycler/batches/${id}/accept`, { method: 'POST' }, token);
      success('Handover Confirmed', 'Custody confirmed. Ready for recycling processing.');
      await loadData();
    } catch (e) {
      toastError('Handover Failed', 'Could not confirm handover.');
    } finally {
      setActing(null);
    }
  }

  async function uploadProof(id: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);
    setActing(id);

    try {
      await apiRequest(`/recycler/batches/${id}/proof`, { method: 'POST', body: form }, token);
      success('Proof Verified', 'Batch marked as complete and added to the audit log.');
      await loadData();
    } catch (err) {
      toastError('Upload Failed', 'Please upload a valid image (PNG, JPG, or WebP).');
    } finally {
      setActing(null);
    }
  }

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

  const bins = [
    { id: 'available', label: 'Available Batches', href: '/available' },
    { id: 'mine', label: 'My Batches', href: '/my-batches' },
    { id: 'analytics', label: 'Plant Analytics', href: '/analytics' },
  ];

  const setTabNav = (id: string) => {
    const t = bins.find((x) => x.id === id);
    if (t) navigate(t.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Processing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Claim collected waste batches, verify handovers, and submit photographic proof of processing.
          </p>
        </div>
      </div>

      {recycler && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Facility rating:</span>
                <span className="text-xs font-extrabold text-amber-500">★ {recycler.rating.toFixed(1)} / 5.0</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">Capacity: {recycler.capacity_kg} kg</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Accepted streams: {recycler.accepted_waste_types?.join(', ') || 'All recyclable streams'}
              </p>
            </div>

            <Badge tone="sage" dot>
              {mine.length} Active in Custody
            </Badge>
          </div>
        </Card>
      )}

      {tab === 'available' && (
        <Card className="animate-fade-in space-y-3.5">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Available Collected Batches ({totalA})
              </CardTitle>
              <CardDescription>Batches collected by city fleets ready for recycling processing</CardDescription>
            </div>
          </CardHeader>

          {loading ? (
            <SkeletonGrid cards={4} />
          ) : available.length === 0 ? (
            <EmptyState
              title="No batches available right now"
              description="As collectors finish pickups and mark them as collected, batches will appear here."
              icon={<Recycle className="h-5 w-5 text-muted-foreground" />}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {available.map((b) => (
                  <AvailableBatchCard key={b.id} b={b} acting={acting} onClaim={requestBatch} />
                ))}
              </div>

              <Pagination page={pageA} totalPages={Math.ceil(totalA / 15) || 1} onPageChange={setPageA} />
            </>
          )}
        </Card>
      )}

      {tab === 'mine' && (
        <Card className="animate-fade-in space-y-3.5">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Recycle className="h-4 w-4 text-primary" />
                My Batches ({totalM})
              </CardTitle>
              <CardDescription>Step 1: Confirm handover → Step 2: Upload proof to complete</CardDescription>
            </div>
            <Badge tone="info">{totalM} In Custody</Badge>
          </CardHeader>

          {loading ? (
            <SkeletonTable rows={4} />
          ) : mine.length === 0 ? (
            <EmptyState
              title="No batches in custody"
              description="Browse available batches to claim and process."
              action={
                <Button size="sm" onClick={() => setTabNav('available')}>
                  Browse Batches
                </Button>
              }
            />
          ) : (
            <>
              <div className="space-y-2">
                {mine.map((b) => (
                  <MineBatchRow key={b.id} b={b} acting={acting} onAccept={acceptBatch} onUpload={uploadProof} onInspect={setInspectedBatch} />
                ))}
              </div>

              <Pagination page={pageM} totalPages={Math.ceil(totalM / 15) || 1} onPageChange={setPageM} />
            </>
          )}
        </Card>
      )}

      {tab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Pull latest plant recovery metrics</p>
            <Button size="sm" variant="outline" onClick={loadData} disabled={loading} aria-label="Refresh analytics">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {loading ? (
            <SkeletonKPI count={3} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                title="Total Batches Processed"
                value={analytics?.total_batches ?? totalM}
                subtitle="Circular recovery closed"
                icon={<Recycle className="h-4 w-4" />}
              />
              <StatCard
                title="Completed Handovers"
                value={analytics?.completed_batches ?? 0}
                subtitle="With verified proof attached"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <StatCard
                title="Mass Recycled"
                value={`${analytics?.total_kg_processed ?? 0} kg`}
                subtitle="Diverted from municipal landfills"
                icon={<Sparkles className="h-4 w-4" />}
              />
            </div>
          )}

          {donutData.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Stream Breakdown & Recovery Volume</CardTitle>
                  <CardDescription>Processed volume by recycled material stream</CardDescription>
                </div>
              </CardHeader>

              <ErrorBoundary>
                <Suspense fallback={<SkeletonMap height={220} />}>
                  <div className="grid gap-6 md:grid-cols-[1.5fr_1fr] items-center">
                    <LazyDonutChart data={donutData} centerValue={`${analytics?.total_kg_processed ?? 0} kg`} centerLabel="Processed" />
                    <div className="space-y-2 p-3 rounded-[12px] bg-surface-muted/50 border border-border/40">
                      <p className="text-xs font-bold text-foreground">Material Categories</p>
                      {analytics?.by_waste_type.map((row) => (
                        <div key={row.waste_type} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-muted-foreground">{row.waste_type}</span>
                          <span className="font-semibold text-foreground">{row.total_kg} kg ({row.count} batches)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Suspense>
              </ErrorBoundary>
            </Card>
          )}
        </div>
      )}

      <Modal
        open={!!inspectedBatch}
        onClose={() => setInspectedBatch(null)}
        title={`Inspection: Batch #${inspectedBatch?.id}`}
        description="Photographic proof and custody certificate"
        maxWidth="max-w-xl"
      >
        {inspectedBatch && (
          <div className="space-y-3.5">
            <div className="overflow-hidden rounded-[12px] border border-border bg-black/5 max-h-[360px] flex items-center justify-center">
              {inspectedBatch.proof_url ? (
                <img
                  src={inspectedBatch.proof_url}
                  alt={`Proof for Batch #${inspectedBatch.id}`}
                  className="w-full h-full object-contain max-h-[340px]"
                />
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <FileImage className="h-8 w-8 mx-auto opacity-40 mb-1.5" />
                  <p className="text-xs">No image file found</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs rounded-[12px] bg-surface-muted p-2.5">
              <div>
                <p className="text-muted-foreground text-[11px]">Pickup Ref:</p>
                <p className="font-semibold text-foreground">#{inspectedBatch.pickup_request_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px]">Status:</p>
                <Badge tone="sage" dot>
                  {inspectedBatch.status}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              {inspectedBatch.proof_url && (
                <a
                  href={inspectedBatch.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
                >
                  <ExternalLink className="h-3 w-3" />
                  Full Resolution
                </a>
              )}
              <Button size="sm" onClick={() => setInspectedBatch(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
