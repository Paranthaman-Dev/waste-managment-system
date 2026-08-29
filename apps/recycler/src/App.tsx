import { useAuth, AuthPage, AppShell, NavItem } from '@wm/shared';
import { Layers, Recycle, BarChart3 } from 'lucide-react';
import { RecyclerDashboard } from './RecyclerDashboard';

const navItems: NavItem[] = [
  { id: 'available', label: 'Available Batches', href: '/available', icon: <Layers className="h-4 w-4" /> },
  { id: 'mine', label: 'My Batches', href: '/my-batches', icon: <Recycle className="h-4 w-4" /> },
  { id: 'analytics', label: 'Plant Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
];

export function RecyclerApp() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper grid place-items-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">Loading Reclaim…</p>
        </div>
      </div>
    );
  }

  if (!user || !role || role !== 'recycler') return <AuthPage />;

  return (
    <AppShell navItems={navItems} brand={{ name: 'Reclaim', mark: '♻', sub: 'RECYCLER PORTAL' }} meta="Recycler">
      <RecyclerDashboard />
    </AppShell>
  );
}
