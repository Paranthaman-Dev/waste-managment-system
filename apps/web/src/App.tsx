import { useAuth, AuthPage, AppShell, NavItem, LoadingScreen } from '@wm/shared';
import {
  Leaf,
  PlusCircle,
  Truck,
  Gift,
  MapPin,
  User as UserIcon,
  Layers,
  Calendar,
  Recycle,
  BarChart3,
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
} from 'lucide-react';

import React, { Suspense } from 'react';

const ResidentDashboard = React.lazy(() =>
  import('./features/resident/ResidentDashboard').then((m) => ({ default: m.ResidentDashboard })),
);
const CollectorDashboard = React.lazy(() =>
  import('./features/collector/CollectorDashboard').then((m) => ({ default: m.CollectorDashboard })),
);
const RecyclerDashboard = React.lazy(() =>
  import('./features/recycler/RecyclerDashboard').then((m) => ({ default: m.RecyclerDashboard })),
);
const ManagementDashboard = React.lazy(() =>
  import('./features/admin/ManagementDashboard').then((m) => ({ default: m.ManagementDashboard })),
);

// Simple ErrorBoundary — react-error-boundary not installed (checked package.json)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state: { hasError: boolean; error?: Error } = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm font-medium text-destructive">Something went wrong loading this section.</p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground mt-1">{this.state.error.message}</p>
            )}
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="mt-3 inline-flex items-center rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium hover:bg-surface-muted"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// Dedupe helper: single Suspense + ErrorBoundary wrapper per React docs
const withSuspense = (node: React.ReactNode) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingScreen />}>{node}</Suspense>
  </ErrorBoundary>
);

// Alternative wrapper component (also satisfies dedupe requirement)
function LazyLoad({ children }: { children: React.ReactNode }) {
  return withSuspense(children);
}

const residentNav: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/', icon: <Leaf className="h-4 w-4" /> },
  { id: 'new', label: 'New Request', href: '/new', icon: <PlusCircle className="h-4 w-4" /> },
  { id: 'requests', label: 'My Requests', href: '/requests', icon: <Truck className="h-4 w-4" /> },
  { id: 'rewards', label: 'My Rewards', href: '/rewards', icon: <Gift className="h-4 w-4" /> },
  { id: 'bins', label: 'Disposal Sites', href: '/bins', icon: <MapPin className="h-4 w-4" /> },
  { id: 'account', label: 'Account', href: '/account', icon: <UserIcon className="h-4 w-4" /> },
];

const collectorNav: NavItem[] = [
  { id: 'queue', label: 'Queue', href: '/queue', icon: <Layers className="h-4 w-4" /> },
  { id: 'assigned', label: 'My Route', href: '/route', icon: <Truck className="h-4 w-4" /> },
  { id: 'schedule', label: 'Schedule', href: '/schedule', icon: <Calendar className="h-4 w-4" /> },
];

const recyclerNav: NavItem[] = [
  { id: 'available', label: 'Available Batches', href: '/available', icon: <Layers className="h-4 w-4" /> },
  { id: 'mine', label: 'My Batches', href: '/my-batches', icon: <Recycle className="h-4 w-4" /> },
  { id: 'analytics', label: 'Plant Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
];

const adminNav: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'bins', label: 'Disposal Sites', href: '/sites', icon: <MapPin className="h-4 w-4" /> },
  { id: 'users', label: 'Users', href: '/users', icon: <Users className="h-4 w-4" /> },
  { id: 'vouchers', label: 'Rewards & Vouchers', href: '/vouchers', icon: <Gift className="h-4 w-4" /> },
  { id: 'audit', label: 'Audit Log', href: '/audit', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'reports', label: 'Generated Reports', href: '/reports', icon: <FileText className="h-4 w-4" /> },
];

export function App() {
  const { user, role, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen bg-paper grid place-items-center p-6">
        <LoadingScreen />
      </div>
    );
  if (!user || !role) return <AuthPage />;

  if (role === 'user') {
    return (
      <AppShell navItems={residentNav} brand={{ name: 'Reclaim', mark: '♻', sub: 'RESIDENT PORTAL' }} meta="Resident">
        {withSuspense(<ResidentDashboard />)}
      </AppShell>
    );
  }

  if (role === 'collector') {
    return (
      <AppShell navItems={collectorNav} brand={{ name: 'Reclaim', mark: '♻', sub: 'COLLECTOR PORTAL' }} meta="Collector">
        {withSuspense(<CollectorDashboard />)}
      </AppShell>
    );
  }

  if (role === 'recycler') {
    return (
      <AppShell navItems={recyclerNav} brand={{ name: 'Reclaim', mark: '♻', sub: 'RECYCLER PORTAL' }} meta="Recycler">
        {withSuspense(<RecyclerDashboard />)}
      </AppShell>
    );
  }

  if (role === 'management') {
    return (
      <AppShell navItems={adminNav} brand={{ name: 'Reclaim', mark: '♻', sub: 'ADMIN PORTAL' }} meta="Admin">
        {withSuspense(<ManagementDashboard />)}
      </AppShell>
    );
  }

  return <AuthPage />;
}
