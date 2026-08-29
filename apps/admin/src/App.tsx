import { useAuth, AuthPage, AppShell, NavItem } from '@wm/shared';
import { LayoutDashboard, MapPin, Users, ShieldCheck, FileText, Gift } from 'lucide-react';
import { ManagementDashboard } from './ManagementDashboard';

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'bins', label: 'Disposal Sites', href: '/sites', icon: <MapPin className="h-4 w-4" /> },
  { id: 'users', label: 'Users', href: '/users', icon: <Users className="h-4 w-4" /> },
  { id: 'vouchers', label: 'Rewards & Vouchers', href: '/vouchers', icon: <Gift className="h-4 w-4" /> },
  { id: 'audit', label: 'Audit Log', href: '/audit', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'reports', label: 'Generated Reports', href: '/reports', icon: <FileText className="h-4 w-4" /> },
];

export function AdminApp() {
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

  if (!user || !role || role !== 'management') return <AuthPage />;

  return (
    <AppShell navItems={navItems} brand={{ name: 'Reclaim', mark: '♻', sub: 'ADMIN PORTAL' }} meta="Admin">
      <ManagementDashboard />
    </AppShell>
  );
}
