import { useAuth, AuthPage, AppShell, NavItem } from '@wm/shared';
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

import { ResidentDashboard } from './features/resident/ResidentDashboard';
import { CollectorDashboard } from './features/collector/CollectorDashboard';
import { RecyclerDashboard } from './features/recycler/RecyclerDashboard';
import { ManagementDashboard } from './features/admin/ManagementDashboard';

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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-paper grid place-items-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">Loading Reclaim…</p>
      </div>
    </div>
  );
}

export function App() {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user || !role) return <AuthPage />;

  if (role === 'user') {
    return (
      <AppShell navItems={residentNav} brand={{ name: 'Reclaim', mark: '♻', sub: 'RESIDENT PORTAL' }} meta="Resident">
        <ResidentDashboard />
      </AppShell>
    );
  }

  if (role === 'collector') {
    return (
      <AppShell navItems={collectorNav} brand={{ name: 'Reclaim', mark: '♻', sub: 'COLLECTOR PORTAL' }} meta="Collector">
        <CollectorDashboard />
      </AppShell>
    );
  }

  if (role === 'recycler') {
    return (
      <AppShell navItems={recyclerNav} brand={{ name: 'Reclaim', mark: '♻', sub: 'RECYCLER PORTAL' }} meta="Recycler">
        <RecyclerDashboard />
      </AppShell>
    );
  }

  if (role === 'management') {
    return (
      <AppShell navItems={adminNav} brand={{ name: 'Reclaim', mark: '♻', sub: 'ADMIN PORTAL' }} meta="Admin">
        <ManagementDashboard />
      </AppShell>
    );
  }

  return <AuthPage />;
}
