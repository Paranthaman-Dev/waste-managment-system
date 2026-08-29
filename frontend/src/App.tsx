import { useAuth } from './lib/auth';
import { AuthPage } from './features/auth/AuthPage';
import { AppShell } from './components/layout/AppShell';
import { UserDashboard } from './features/user/UserDashboard';
import { CollectorDashboard } from './features/collector/CollectorDashboard';
import { RecyclerDashboard } from './features/recycler/RecyclerDashboard';
import { ManagementDashboard } from './features/management/ManagementDashboard';

export function App() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">Loading Reclaim…</p>
        </div>
      </div>
    );
  }

  if (!user || !role) return <AuthPage />;

  return (
    <AppShell>
      {role === 'user' && <UserDashboard />}
      {role === 'collector' && <CollectorDashboard />}
      {role === 'recycler' && <RecyclerDashboard />}
      {role === 'management' && <ManagementDashboard />}
    </AppShell>
  );
}
