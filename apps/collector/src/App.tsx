import { useAuth, AuthPage, AppShell, NavItem } from '@wm/shared';
import { Layers, Truck, Calendar, MapPin } from 'lucide-react';
import { CollectorDashboard } from './CollectorDashboard';

const navItems: NavItem[] = [
  { id: 'queue', label: 'Queue', href: '/queue', icon: <Layers className="h-4 w-4" /> },
  { id: 'assigned', label: 'My Route', href: '/route', icon: <Truck className="h-4 w-4" /> },
  { id: 'schedule', label: 'Schedule', href: '/schedule', icon: <Calendar className="h-4 w-4" /> },
  { id: 'bins', label: 'Drop-off Sites', href: '/sites', icon: <MapPin className="h-4 w-4" /> },
];

export function CollectorApp() {
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

  if (!user || !role || role !== 'collector') return <AuthPage />;

  return (
    <AppShell navItems={navItems} brand={{ name: 'Reclaim', mark: '♻', sub: 'COLLECTOR PORTAL' }} meta="Collector">
      <CollectorDashboard />
    </AppShell>
  );
}
