import { LoginPage } from './pages/LoginPage';
import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { UserPanel } from './pages/UserPanel';
import { CollectorPanel } from './pages/CollectorPanel';
import { RecyclerPanel } from './pages/RecyclerPanel';
import { ManagementPanel } from './pages/ManagementPanel';

export function App() {
  const { role, user } = useAuth();

  if (!user || !role) return <LoginPage />;

  return (
    <Layout>
      {role === 'user' && <UserPanel />}
      {role === 'collector' && <CollectorPanel />}
      {role === 'recycler' && <RecyclerPanel />}
      {role === 'management' && <ManagementPanel />}
    </Layout>
  );
}
