import { useAuth, AuthPage, AppShell, NavItem } from '@wm/shared';
import { Leaf, Truck, MapPin, User as UserIcon, PlusCircle, Gift } from 'lucide-react';
import { ResidentDashboard } from './ResidentDashboard';

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/', icon: <Leaf className="h-4 w-4" /> },
  { id: 'new', label: 'New Request', href: '/new', icon: <PlusCircle className="h-4 w-4" /> },
  { id: 'requests', label: 'My Requests', href: '/requests', icon: <Truck className="h-4 w-4" /> },
  { id: 'rewards', label: 'My Rewards', href: '/rewards', icon: <Gift className="h-4 w-4" /> },
  { id: 'bins', label: 'Disposal Sites', href: '/bins', icon: <MapPin className="h-4 w-4" /> },
  { id: 'account', label: 'Account', href: '/account', icon: <UserIcon className="h-4 w-4" /> },
];

export function ResidentApp() {
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

  if (!user || !role || role !== 'user') return <AuthPage />;

  return (
    <AppShell navItems={navItems} brand={{ name: 'Reclaim', mark: '♻', sub: 'RESIDENT PORTAL' }} meta="Resident">
      <ResidentDashboard />
    </AppShell>
  );
}
